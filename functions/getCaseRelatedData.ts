import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_id, entity_name, filters } = await req.json();

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

    if (!isOwner && !isShared && !isAdmin) {
      return Response.json({ error: 'No access to this case' }, { status: 403 });
    }

    // If requesting specific entity data related to the case
    if (entity_name) {
      const entityApi = base44.asServiceRole.entities[entity_name];
      if (!entityApi) {
        return Response.json({ error: `Unknown entity: ${entity_name}` }, { status: 400 });
      }

      let results;
      if (entity_name === 'Person') {
        // Strategy: fetch persons by multiple approaches
        const personMap = new Map();
        
        // 1. If the case has a person_id, fetch that person directly
        if (mortgageCase.person_id) {
          try {
            const directPersons = await entityApi.filter({ id: mortgageCase.person_id });
            for (const p of directPersons) personMap.set(p.id, p);
          } catch (e) {
            console.log('Direct person fetch failed:', e.message);
          }
        }
        
        // 2. Fetch all persons created by the case owner
        try {
          const ownerPersons = await entityApi.filter({ created_by: mortgageCase.created_by });
          for (const person of ownerPersons) {
            if (personMap.has(person.id)) continue;
            if (person.linked_accounts && Array.isArray(person.linked_accounts)) {
              const isLinked = person.linked_accounts.some(acc =>
                typeof acc === 'string' ? acc === case_id : (acc && acc.case_id === case_id)
              );
              if (isLinked) personMap.set(person.id, person);
            }
          }
        } catch (e) {
          console.log('Owner persons fetch failed:', e.message);
        }
        
        // 3. If shared, also check persons created by the shared user (current user)
        if (isShared && !isOwner) {
          try {
            const myPersons = await entityApi.filter({ created_by: user.email });
            for (const person of myPersons) {
              if (personMap.has(person.id)) continue;
              if (person.linked_accounts && Array.isArray(person.linked_accounts)) {
                const isLinked = person.linked_accounts.some(acc =>
                  typeof acc === 'string' ? acc === case_id : (acc && acc.case_id === case_id)
                );
                if (isLinked) personMap.set(person.id, person);
              }
            }
          } catch (e) {
            console.log('Shared user persons fetch failed:', e.message);
          }
        }
        
        results = Array.from(personMap.values());
      } else if (entity_name === 'MortgageCase') {
        // Return the case itself (and linked borrowers)
        if (filters && filters.id) {
          results = await entityApi.filter(filters);
        } else {
          results = [mortgageCase];
        }
      } else if (filters) {
        // Use provided filters with service role (bypasses RLS)
        results = await entityApi.filter(filters);
      } else {
        // For entities with case_id field
        results = await entityApi.filter({ case_id });
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