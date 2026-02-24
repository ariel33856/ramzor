import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to get all users (bypasses User entity restrictions)
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    // Return only safe fields (no API keys etc.)
    const safeUsers = allUsers.map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role
    }));

    return Response.json({ users: safeUsers });
  } catch (error) {
    console.error('Error getting users:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});