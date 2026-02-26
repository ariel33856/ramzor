import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use the user-scoped call - RLS will ensure only their contacts come back
    const ownContacts = await base44.entities.Person.list('-created_date', 1000);

    // Get contacts shared with this user using service role
    // Try listing all and filtering client-side since filter may not work on created_by
    let allContacts = [];
    try {
      allContacts = await base44.asServiceRole.entities.Person.list('-created_date', 1000);
    } catch(e) {
      // fallback: just return own contacts
      return Response.json({ contacts: ownContacts });
    }

    const ownIds = new Set(ownContacts.map(c => c.id));
    
    // Keep own + shared with me (not already in own)
    const result = allContacts.filter(c =>
      ownIds.has(c.id) ||
      (Array.isArray(c.shared_with) && c.shared_with.includes(user.email))
    );

    return Response.json({ contacts: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});