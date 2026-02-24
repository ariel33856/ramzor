import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to bypass RLS and fetch all permissions, then filter by shared_email
    const allPermissions = await base44.asServiceRole.entities.CasePermission.list('-created_date', 1000);
    const myPermissions = allPermissions.filter(
      p => p.shared_email === user.email && p.is_active === true
    );

    console.log('[getMyPermissions] user:', user.email, 'total permissions in DB:', allPermissions.length, 'mine:', myPermissions.length);

    return Response.json({ permissions: myPermissions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});