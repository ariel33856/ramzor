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
        // Person entity: service role doesn't work reliably with Person RLS.
        // Use the case owner's created_by to impersonate via user-level API.
        // The user-level API respects RLS (created_by = user.email),
        // so we use the authenticated user's token for their own persons,
        // and for shared cases we fetch using the owner's persons via a direct approach.
        
        const personMap = new Map();
        
        // Use user-level API (works with RLS) to get current user's persons
        try {
          const userPersons = await base44.entities.Person.list('-created_date', 500);
          for (const person of userPersons) {
            if (person.linked_accounts && Array.isArray(person.linked_accounts)) {
              const isLinked = person.linked_accounts.some(acc =>
                typeof acc === 'string' ? acc === case_id : (acc && acc.case_id === case_id)
              );
              if (isLinked) personMap.set(person.id, person);
            }
            // Also check direct person_id link
            if (mortgageCase.person_id && person.id === mortgageCase.person_id) {
              personMap.set(person.id, person);
            }
          }
        } catch (e) {
          console.log('User persons fetch failed:', e.message);
        }
        
        // If this is a shared case and we're not the owner,
        // we need the owner's persons too - try fetching them via service role
        // using a workaround: fetch ALL persons and filter manually
        if ((isShared || isAdmin) && !isOwner && personMap.size === 0) {
          try {
            // Fetch all Person records owned by the case owner using the REST approach
            const caseOwner = mortgageCase.created_by;
            // Use MortgageCase's linked data to find person IDs, then fetch them
            
            // Try getting person by direct ID if available
            if (mortgageCase.person_id) {
              try {
                const directPerson = await base44.entities.Person.filter({ id: mortgageCase.person_id });
                for (const p of directPerson) personMap.set(p.id, p);
              } catch(e) {
                // Person not accessible via current user's RLS
              }
            }
            
            // For shared cases - the owner's persons aren't accessible via RLS
            // We need to signal that the caller should use a different approach
            if (personMap.size === 0) {
              // Return a special flag indicating persons need to be fetched differently
              return Response.json({ 
                data: [], 
                _needsOwnerPersons: true,
                _caseOwner: caseOwner,
                _caseId: case_id,
                _personId: mortgageCase.person_id
              });
            }
          } catch (e) {
            console.log('Shared person fetch failed:', e.message);
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