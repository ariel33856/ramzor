import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get own contacts via RLS (user token)
    const ownContacts = await base44.entities.Person.list('-created_date', 1000);

    // Get all contacts to find shared ones (service role, no RLS)
    let sharedContacts = [];
    try {
      const allContacts = await base44.asServiceRole.entities.Person.filter({ is_archived: false }, '-created_date', 1000);
      const ownIds = new Set(ownContacts.map(c => c.id));
      sharedContacts = allContacts.filter(contact =>
        !ownIds.has(contact.id) &&
        contact.shared_with && contact.shared_with.includes(user.email)
      );
    } catch (e) {
      console.log('service role error:', e.message);
    }

    const combined = [...ownContacts, ...sharedContacts];
    return Response.json({ contacts: combined });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});