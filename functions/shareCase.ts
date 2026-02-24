import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_id, case_title, shared_email } = await req.json();

    if (!case_id || !shared_email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (shared_email === user.email) {
      return Response.json({ error: 'לא ניתן לשתף עם עצמך' }, { status: 400 });
    }

    // Check existing permission using service role (so we see all records)
    const allPermissions = await base44.asServiceRole.entities.CasePermission.list('-created_date', 1000);
    const existing = allPermissions.find(
      p => p.case_id === case_id && p.shared_email === shared_email && p.is_active === true
    );

    if (existing) {
      return Response.json({ error: 'המשתמש כבר משותף לתיק זה' }, { status: 400 });
    }

    // Create permission using service role so it lands in the same tenant as getSharedCases reads from
    const result = await base44.asServiceRole.entities.CasePermission.create({
      case_id,
      case_title: case_title || 'Untitled Case',
      owner_email: user.email,
      shared_email,
      permission: 'edit',
      is_active: true
    });

    console.log('[shareCase] Created permission via serviceRole:', JSON.stringify(result));
    return Response.json({ success: true, permission: result });
  } catch (error) {
    console.error('[shareCase] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});