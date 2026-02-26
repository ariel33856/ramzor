import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User email:', user.email);

    // Get ALL contacts via service role (bypass RLS)
    const allContacts = await base44.asServiceRole.entities.Person.list('-created_date', 1000);
    console.log('Total contacts from service role:', allContacts.length);

    // Filter: own contacts OR shared with this user
    const myContacts = allContacts.filter(contact =>
      contact.created_by === user.email ||
      (Array.isArray(contact.shared_with) && contact.shared_with.includes(user.email))
    );

    console.log('My contacts count:', myContacts.length);

    return Response.json({ contacts: myContacts });
  } catch (error) {
    console.log('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});