import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to fetch using user-scoped call first
    let contacts = [];
    try {
      contacts = await base44.entities.Person.list('-created_date', 2000);
    } catch (e) {
      console.log('User-scoped call failed, using service role:', e.message);
      // Fallback to service role if RLS is too restrictive
      const allContacts = await base44.asServiceRole.entities.Person.list('-created_date', 2000);
      contacts = allContacts.filter(contact => {
        if (contact.created_by === user.email) return true;
        if (contact.shared_with && contact.shared_with.includes(user.email)) return true;
        return false;
      });
    }
    
    return Response.json({ contacts });
  } catch (error) {
    console.error('Error in getMyContacts:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});