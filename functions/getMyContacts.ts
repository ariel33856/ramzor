import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get own contacts (via created_by filter with service role)
    const ownContacts = await base44.asServiceRole.entities.Person.filter(
      { created_by: user.email },
      '-created_date',
      1000
    );

    // Get contacts shared with this user
    const sharedContacts = await base44.asServiceRole.entities.Person.filter(
      { shared_with: user.email },
      '-created_date',
      1000
    );

    // Merge and deduplicate
    const ownIds = new Set(ownContacts.map(c => c.id));
    const uniqueShared = sharedContacts.filter(c => !ownIds.has(c.id));
    const combined = [...ownContacts, ...uniqueShared];

    return Response.json({ contacts: combined });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});