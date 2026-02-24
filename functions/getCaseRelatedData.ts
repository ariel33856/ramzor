import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_id, entity_name, filters } = await req.json();

    console.log('[getCaseRelatedData] Received request - case_id:', case_id, 'entity_name:', entity_name);

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

    console.log('[getCaseRelatedData] user:', user.email, 'isOwner:', isOwner, 'isShared:', isShared, 'isAdmin:', isAdmin);

    if (!isOwner && !isShared && !isAdmin) {
      return Response.json({ error: 'No access to this case' }, { status: 403 });
    }

    const caseOwner = mortgageCase.created_by;

    // If requesting specific entity data related to the case
    if (entity_name) {
      const entityApi = base44.asServiceRole.entities[entity_name];
      if (!entityApi) {
        return Response.json({ error: `Unknown entity: ${entity_name}` }, { status: 400 });
      }

      let results;
      if (entity_name === 'Person') {
        // Fetch all persons using service role (no created_by filter - shared users need access)
        const personApi = base44.asServiceRole.entities.Person;
        const allPersons = await personApi.list('-created_date', 500);
        
        console.log('[getCaseRelatedData] Total persons fetched:', allPersons.length);
        console.log('[getCaseRelatedData] Case person_id:', mortgageCase.person_id);
        console.log('[getCaseRelatedData] Case owner:', caseOwner);
        
        // Filter to only persons linked to this case
        const personMap = new Map();
        
        for (const person of allPersons) {
          // Check direct person_id link
          if (mortgageCase.person_id && person.id === mortgageCase.person_id) {
            personMap.set(person.id, person);
            continue;
          }
          // Check linked_accounts
          if (person.linked_accounts && Array.isArray(person.linked_accounts)) {
            const isLinked = person.linked_accounts.some(acc =>
              typeof acc === 'string' ? acc === case_id : (acc && acc.case_id === case_id)
            );
            if (isLinked) {
              console.log('[getCaseRelatedData] Found linked person:', person.id, person.first_name, person.last_name);
              personMap.set(person.id, person);
            }
          }
        }
        
        console.log('[getCaseRelatedData] Matched persons count:', personMap.size);
        results = Array.from(personMap.values());
      } else if (entity_name === 'MortgageCase') {
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