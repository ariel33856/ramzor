import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to bypass RLS — get all permissions and filter by shared_email
    const allPermissions = await base44.asServiceRole.entities.CasePermission.list('-created_date', 1000);
    const myPermissions = allPermissions.filter(
      p => p.shared_email === user.email && p.is_active === true
    );

    console.log('[getSharedCases] user:', user.email, 'total in DB:', allPermissions.length, 'mine:', myPermissions.length);

    if (!myPermissions.length) {
      return Response.json({ cases: [] });
    }

    const caseIds = myPermissions.map(p => p.case_id);

    // Fetch each case using service role (bypasses MortgageCase RLS)
    const results = await Promise.all(
      caseIds.map(id =>
        base44.asServiceRole.entities.MortgageCase.filter({ id })
          .then(r => r[0])
          .catch(() => null)
      )
    );

    const cases = results.filter(c => c && !c.is_archived && !c.module_id);

    return Response.json({ cases });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});