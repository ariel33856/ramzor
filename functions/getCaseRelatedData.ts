import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const case_id = body.case_id;
    const entity_name = body.entity_name;
    const filters = body.filters;

    if (!case_id) {
      return Response.json({ error: 'Missing case_id' }, { status: 400 });
    }

    // Verify access
    const cases = await base44.asServiceRole.entities.MortgageCase.filter({ id: case_id });
    const mortgageCase = cases[0];
    if (!mortgageCase) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    const isOwner = mortgageCase.created_by === user.email;
    const isShared = (mortgageCase.shared_with || []).includes(user.email);
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isShared && !isAdmin) {
      return Response.json({ error: 'No access' }, { status: 403 });
    }

    const caseOwner = mortgageCase.created_by;

    if (!entity_name) {
      return Response.json({ data: mortgageCase });
    }

    if (entity_name === 'Person') {
      // Fetch all persons using service role
      let allPersons = [];
      try {
        allPersons = await base44.asServiceRole.entities.Person.list('-created_date', 5000);
        console.log('[getCaseRelatedData] Fetched persons count:', allPersons.length);
      } catch (e) {
        console.error('Failed to fetch persons:', e.message, e.stack);
        allPersons = [];
      }
      
      const matched = [];
      const matchedIds = new Set();

      for (const person of allPersons) {
        if (mortgageCase.person_id && person.id === mortgageCase.person_id) {
          if (!matchedIds.has(person.id)) {
            matchedIds.add(person.id);
            matched.push(person);
          }
          continue;
        }
        if (person.linked_accounts && Array.isArray(person.linked_accounts)) {
          const isLinked = person.linked_accounts.some(function(acc) {
            if (typeof acc === 'string') return acc === case_id;
            return acc && acc.case_id === case_id;
          });
          if (isLinked && !matchedIds.has(person.id)) {
            matchedIds.add(person.id);
            matched.push(person);
          }
        }
      }

      return Response.json({ data: matched, debug: { total_persons: allPersons.length, matched: matched.length, caseOwner: caseOwner } });
    }

    // Other entities
    const entityApi = base44.asServiceRole.entities[entity_name];
    if (!entityApi) {
      return Response.json({ error: 'Unknown entity: ' + entity_name }, { status: 400 });
    }

    let results;
    if (entity_name === 'MortgageCase') {
      results = (filters && filters.id) ? await entityApi.filter(filters) : [mortgageCase];
    } else if (filters) {
      results = await entityApi.filter(filters);
    } else {
      results = await entityApi.filter({ case_id: case_id, created_by: caseOwner });
    }

    return Response.json({ data: results });
  } catch (error) {
    console.error('[getCaseRelatedData] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});