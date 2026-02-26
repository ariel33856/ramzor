import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to fetch all contacts and filter on server side
    const allContacts = await base44.asServiceRole.entities.Person.list('-created_date', 2000);
    
    // Filter to show only contacts the user is authorized to see
    const authorizedContacts = allContacts.filter(contact => {
      // User created this contact
      if (contact.created_by === user.email) return true;
      
      // Contact is shared with the user
      if (contact.shared_with && contact.shared_with.includes(user.email)) return true;
      
      return false;
    });
    
    return Response.json({ contacts: authorizedContacts });
  } catch (error) {
    console.error('Error in getMyContacts:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});