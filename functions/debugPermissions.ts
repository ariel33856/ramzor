import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const all = await base44.asServiceRole.entities.CasePermission.list();
    console.log('[debugPermissions] Total records:', all.length);
    console.log('[debugPermissions] Records:', JSON.stringify(all));

    return Response.json({ count: all.length, records: all });
  } catch (error) {
    console.error('[debugPermissions] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});