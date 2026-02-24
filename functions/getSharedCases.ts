import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use user-scoped query — RLS on CasePermission allows reading where shared_email = user.email
    const userScopedAll = await base44.entities.CasePermission.list('-created_date', 500);
    const permissions = userScopedAll.filter(p => p.shared_email === user.email && p.is_active === true);
    console.log('[getSharedCases] user:', user.email, 'user-scoped total:', userScopedAll.length, 'matched:', permissions.length);

    if (!permissions.length) {
      return Response.json({ cases: [] });
    }

    const caseIds = permissions.map(p => p.case_id);

    // Fetch each case using service role (bypasses RLS)
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