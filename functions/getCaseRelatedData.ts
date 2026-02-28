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

    // Verify access - fetch the case
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
      // Fetch persons created by the case owner using service role filter
      let ownerPersons = [];
      try {
        ownerPersons = await base44.asServiceRole.entities.Person.filter({ created_by: caseOwner });
        console.log('[getCaseRelatedData] Owner persons:', ownerPersons.length);
      } catch (e) {
        console.error('[getCaseRelatedData] Failed to filter persons by owner:', e.message);
      }

      // Also get persons created by requesting user if different
      let userPersons = [];
      if (user.email !== caseOwner) {
        try {
          userPersons = await base44.asServiceRole.entities.Person.filter({ created_by: user.email });
          console.log('[getCaseRelatedData] User persons:', userPersons.length);
        } catch (e) {
          console.error('[getCaseRelatedData] Failed to filter persons by user:', e.message);
        }
      }

      // Merge all persons
      const allPersonsMap = new Map();
      for (const p of ownerPersons) allPersonsMap.set(p.id, p);
      for (const p of userPersons) {
        if (!allPersonsMap.has(p.id)) allPersonsMap.set(p.id, p);
      }
      const allPersons = Array.from(allPersonsMap.values());
      console.log('[getCaseRelatedData] Total merged persons:', allPersons.length);

      // Filter to only those linked to this case
      const matched = [];
      const matchedIds = new Set();

      for (const person of allPersons) {
        // Check if directly referenced by the case
        if (mortgageCase.person_id && person.id === mortgageCase.person_id) {
          if (!matchedIds.has(person.id)) {
            matchedIds.add(person.id);
            matched.push(person);
          }
          continue;
        }
        // Check linked_accounts
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
    } else if (entity_name === 'PropertyAsset') {
      // PropertyAsset: fetch by case_id AND also by property_id referenced in the case
      let byCase = [];
      try {
        byCase = await entityApi.filter({ case_id: case_id });
      } catch (e) {
        console.log('[getCaseRelatedData] PropertyAsset filter by case_id failed:', e.message);
      }
      
      // Also check if the case has a property_id directly linked
      const propMap = new Map();
      for (const p of byCase) propMap.set(p.id, p);
      
      if (mortgageCase.property_id && !propMap.has(mortgageCase.property_id)) {
        try {
          const linked = await entityApi.filter({ id: mortgageCase.property_id });
          if (linked[0]) propMap.set(linked[0].id, linked[0]);
        } catch (e) {
          console.log('[getCaseRelatedData] PropertyAsset fetch by property_id failed:', e.message);
        }
      }
      
      // Also get all properties by the case owner that have no case_id (legacy/unlinked)
      try {
        const ownerProps = await entityApi.filter({ created_by: caseOwner });
        for (const p of ownerProps) {
          if (!p.case_id && !propMap.has(p.id)) {
            // Include owner's unlinked properties so they can be seen in shared context
          }
        }
      } catch (e) {
        console.log('[getCaseRelatedData] PropertyAsset fetch owner props failed:', e.message);
      }
      
      results = Array.from(propMap.values());
      console.log('[getCaseRelatedData] PropertyAsset results:', results.length);
    } else if (filters) {
      results = await entityApi.filter(filters);
    } else {
      // Get all records for this case_id regardless of who created them
      results = await entityApi.filter({ case_id: case_id });
    }

    return Response.json({ data: results });
  } catch (error) {
    console.error('[getCaseRelatedData] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});