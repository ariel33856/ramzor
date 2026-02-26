import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use user-scoped call to get own contacts (RLS will handle this)
    const ownContacts = await base44.entities.Person.list('-created_date', 2000);
    
    return Response.json({ contacts: ownContacts });
  } catch (error) {
    console.error('Error in getMyContacts:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});