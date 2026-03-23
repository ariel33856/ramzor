import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use user scope — RLS on CasePermission allows:
    // read where owner_email == user.email OR shared_email == user.email
    const allPermissions = await base44.entities.CasePermission.list('-created_date', 1000);
    const myPermissions = allPermissions.filter(
      p => p.shared_email === user.email && p.is_active === true
    );

    console.log('[getMyPermissions] user:', user.email, 'total visible:', allPermissions.length, 'as shared recipient:', myPermissions.length);

    return Response.json({ permissions: myPermissions });
  } catch (error) {
    console.error('[getMyPermissions] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});