import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = user.email;

    // 1. Get contacts created by the user (via RLS)
    let ownContacts = [];
    try {
      ownContacts = await base44.entities.Person.list('-created_date', 2000);
    } catch (e) {
      console.log('User-scoped Person list failed:', e.message);
    }

    // 2. Get all cases shared with this user
    const allCases = await base44.asServiceRole.entities.MortgageCase.list('-created_date', 5000);
    const sharedCases = allCases.filter(c =>
      c.shared_with &&
      Array.isArray(c.shared_with) &&
      c.shared_with.includes(userEmail) &&
      c.created_by !== userEmail
    );

    if (sharedCases.length === 0) {
      return Response.json({ contacts: ownContacts });
    }

    // 3. For shared cases, find all linked persons
    const sharedCaseIds = new Set(sharedCases.map(c => c.id));
    const sharedPersonIds = new Set();

    // Collect person_id from shared cases
    for (const sc of sharedCases) {
      if (sc.person_id) sharedPersonIds.add(sc.person_id);
      if (sc.linked_borrowers && Array.isArray(sc.linked_borrowers)) {
        // linked_borrowers are IDs of other MortgageCase records that act as borrowers
        // We need to find persons linked to those too
        for (const borrowerId of sc.linked_borrowers) {
          const borrowerCase = allCases.find(c => c.id === borrowerId);
          if (borrowerCase && borrowerCase.person_id) {
            sharedPersonIds.add(borrowerCase.person_id);
          }
        }
      }
    }

    // 4. Get all persons via service role to find linked_accounts matches
    const allPersons = await base44.asServiceRole.entities.Person.list('-created_date', 5000);

    // Build a map of own contacts by ID for dedup
    const contactMap = new Map();
    for (const c of ownContacts) {
      contactMap.set(c.id, c);
    }

    // Add persons directly linked via person_id
    for (const p of allPersons) {
      if (contactMap.has(p.id)) continue;

      // Check if person is directly referenced by a shared case
      if (sharedPersonIds.has(p.id)) {
        contactMap.set(p.id, p);
        continue;
      }

      // Check if person has linked_accounts pointing to a shared case
      if (p.linked_accounts && Array.isArray(p.linked_accounts)) {
        const isLinked = p.linked_accounts.some(acc => {
          const caseId = typeof acc === 'string' ? acc : acc?.case_id;
          return caseId && sharedCaseIds.has(caseId);
        });
        if (isLinked) {
          contactMap.set(p.id, p);
          continue;
        }
      }

      // Check if person is shared directly with the user (via shared_with field)
      if (p.shared_with && Array.isArray(p.shared_with) && p.shared_with.includes(userEmail)) {
        contactMap.set(p.id, p);
      }
    }

    const contacts = Array.from(contactMap.values());
    // Sort by created_date descending
    contacts.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

    return Response.json({ contacts });
  } catch (error) {
    console.error('Error in getMyContacts:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});