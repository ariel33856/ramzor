import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { case_id, entity_name, filters } = body;

    console.log('[getCaseRelatedData] Request from:', user.email, 'case_id:', case_id, 'entity:', entity_name);

    if (!case_id) {
      return Response.json({ error: 'Missing case_id' }, { status: 400 });
    }

    // Verify the user has access to this case (owner or shared)
    const cases = await base44.asServiceRole.entities.MortgageCase.filter({ id: case_id });
    const mortgageCase = cases[0];

    if (!mortgageCase) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    const isOwner = mortgageCase.created_by === user.email;
    const isShared = (mortgageCase.shared_with || []).includes(user.email);
    const isAdmin = user.role === 'admin';

    console.log('[getCaseRelatedData] Access check - isOwner:', isOwner, 'isShared:', isShared, 'isAdmin:', isAdmin);

    if (!isOwner && !isShared && !isAdmin) {
      return Response.json({ error: 'No access to this case' }, { status: 403 });
    }

    const caseOwner = mortgageCase.created_by;

    // If requesting specific entity data related to the case
    if (entity_name) {
      if (entity_name === 'Person') {
        // Fetch ALL persons using service role (bypasses RLS completely)
        const allPersons = await base44.asServiceRole.entities.Person.list('-created_date', 500);
        
        console.log('[getCaseRelatedData] Total persons from service role:', allPersons.length);
        
        // Filter to only persons linked to this case
        const matched = [];
        
        for (const person of allPersons) {
          // Check direct person_id link
          if (mortgageCase.person_id && person.id === mortgageCase.person_id) {
            matched.push(person);
            continue;
          }
          // Check linked_accounts
          if (person.linked_accounts && Array.isArray(person.linked_accounts)) {
            const isLinked = person.linked_accounts.some(acc =>
              typeof acc === 'string' ? acc === case_id : (acc && acc.case_id === case_id)
            );
            if (isLinked) {
              console.log('[getCaseRelatedData] Matched person:', person.id, person.first_name, person.last_name);
              matched.push(person);
            }
          }
        }
        
        console.log('[getCaseRelatedData] Total matched persons:', matched.length);
        return Response.json({ data: matched });
      }
      
      const entityApi = base44.asServiceRole.entities[entity_name];
      if (!entityApi) {
        return Response.json({ error: `Unknown entity: ${entity_name}` }, { status: 400 });
      }

      let results;
      if (entity_name === 'MortgageCase') {
        if (filters && filters.id) {
          results = await entityApi.filter(filters);
        } else {
          results = [mortgageCase];
        }
      } else if (filters) {
        results = await entityApi.filter(filters);
      } else {
        // For entities with case_id field, fetch by case_id and owner
        results = await entityApi.filter({ case_id, created_by: caseOwner });
      }

      return Response.json({ data: results });
    }

    // Return the case itself
    return Response.json({ data: mortgageCase });
  } catch (error) {
    console.error('[getCaseRelatedData] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});