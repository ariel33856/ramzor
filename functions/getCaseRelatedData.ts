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
        // For Person, find persons linked to this case
        // Get ALL persons (service role bypasses RLS) and filter by link
        let allPersons = [];
        try {
          allPersons = await entityApi.filter({}, '-created_date', 500);
        } catch (e) {
          // fallback
          allPersons = await entityApi.list('-created_date', 500);
        }
        results = allPersons.filter(person => {
          // Check if person is directly linked via person_id
          if (mortgageCase.person_id && person.id === mortgageCase.person_id) return true;
          // Check linked_accounts
          if (person.linked_accounts && person.linked_accounts.length > 0) {
            return person.linked_accounts.some(acc =>
              typeof acc === 'string' ? acc === case_id : acc.case_id === case_id
            );
          }
          return false;
        });
        // Debug info in response
        return Response.json({ 
          data: results, 
          debug: { 
            total_persons: allPersons.length, 
            case_person_id: mortgageCase.person_id,
            matched: results.length,
            case_owner: mortgageCase.created_by
          } 
        });
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