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
      // PropertyAsset: fetch only by case_id and property_id link
      const propMap = new Map();

      console.log('[getCaseRelatedData] === PropertyAsset Debug ===');
      console.log('[getCaseRelatedData] case_id:', case_id);
      console.log('[getCaseRelatedData] mortgageCase.property_id:', mortgageCase.property_id);
      console.log('[getCaseRelatedData] caseOwner:', caseOwner);
      console.log('[getCaseRelatedData] requesting user:', user.email);
      console.log('[getCaseRelatedData] isOwner:', isOwner, 'isShared:', isShared, 'isAdmin:', isAdmin);

      // 1. Get properties with this case_id
      try {
        const byCase = await entityApi.filter({ case_id: case_id });
        console.log('[getCaseRelatedData] Step 1 - Properties by case_id:', byCase.length);
        for (const p of byCase) {
          console.log('[getCaseRelatedData]   -> prop id:', p.id, 'address:', p.address, 'city:', p.city, 'created_by:', p.created_by, 'case_id:', p.case_id);
          propMap.set(p.id, p);
        }
      } catch (e) {
        console.log('[getCaseRelatedData] Step 1 FAILED - PropertyAsset filter by case_id error:', e.message);
      }
      
      // 2. Get property directly linked via case.property_id
      if (mortgageCase.property_id) {
        console.log('[getCaseRelatedData] Step 2 - Checking property_id link:', mortgageCase.property_id, 'already in map:', propMap.has(mortgageCase.property_id));
        if (!propMap.has(mortgageCase.property_id)) {
          try {
            const linked = await entityApi.filter({ id: mortgageCase.property_id });
            console.log('[getCaseRelatedData] Step 2 - Linked property found:', linked.length);
            if (linked[0]) {
              console.log('[getCaseRelatedData]   -> prop id:', linked[0].id, 'address:', linked[0].address, 'created_by:', linked[0].created_by);
              propMap.set(linked[0].id, linked[0]);
            }
          } catch (e) {
            console.log('[getCaseRelatedData] Step 2 FAILED - PropertyAsset fetch by property_id error:', e.message);
          }
        }
      } else {
        console.log('[getCaseRelatedData] Step 2 - No property_id on case, skipping');
      }

      // 3. Also try to get all properties created by the case owner that might be associated
      try {
        const ownerProps = await entityApi.filter({ created_by: caseOwner });
        console.log('[getCaseRelatedData] Step 3 - All properties by case owner:', ownerProps.length);
        for (const p of ownerProps) {
          console.log('[getCaseRelatedData]   -> prop id:', p.id, 'address:', p.address, 'case_id:', p.case_id, 'created_by:', p.created_by);
          if (p.case_id === case_id && !propMap.has(p.id)) {
            propMap.set(p.id, p);
          }
        }
      } catch (e) {
        console.log('[getCaseRelatedData] Step 3 FAILED - owner properties error:', e.message);
      }

      // 4. Check linked persons for linked_properties
      try {
        const persons = await base44.asServiceRole.entities.Person.filter({ created_by: caseOwner });
        const linkedPersons = persons.filter(p => 
          p.linked_accounts && p.linked_accounts.some(acc => 
            (typeof acc === 'string' ? acc === case_id : acc.case_id === case_id)
          )
        );
        console.log('[getCaseRelatedData] Step 4 - Linked persons with properties:', linkedPersons.length);
        for (const person of linkedPersons) {
          if (person.linked_properties && person.linked_properties.length > 0) {
            console.log('[getCaseRelatedData] Step 4 - Person', person.id, 'has linked_properties:', person.linked_properties);
            for (const propId of person.linked_properties) {
              if (!propMap.has(propId)) {
                try {
                  const props = await entityApi.filter({ id: propId });
                  if (props[0]) {
                    console.log('[getCaseRelatedData] Step 4 - Found property via person link:', props[0].id, props[0].address);
                    propMap.set(props[0].id, props[0]);
                  }
                } catch (e) {
                  console.log('[getCaseRelatedData] Step 4 - Failed to fetch property', propId, ':', e.message);
                }
              }
            }
          }
        }
      } catch (e) {
        console.log('[getCaseRelatedData] Step 4 FAILED:', e.message);
      }
      
      results = Array.from(propMap.values());
      console.log('[getCaseRelatedData] === PropertyAsset Final results:', results.length, '===');
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