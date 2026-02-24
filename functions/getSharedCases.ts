import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // CasePermission RLS allows: read where owner_email==user OR shared_email==user
    // So efrat can read permissions where shared_email == efrat.email
    const permissions = await base44.entities.CasePermission.list('-created_date', 1000);
    const myPermissions = permissions.filter(
      p => p.shared_email === user.email && p.is_active === true
    );

    console.log('[getSharedCases] user:', user.email);
    console.log('[getSharedCases] all visible permissions:', permissions.length);
    console.log('[getSharedCases] my shared permissions:', myPermissions.length);
    console.log('[getSharedCases] permissions detail:', JSON.stringify(permissions));

    if (!myPermissions.length) {
      return Response.json({ cases: [] });
    }

    const caseIds = myPermissions.map(p => p.case_id);
    console.log('[getSharedCases] case_ids to fetch:', caseIds);

    // Fetch each case using service role (bypasses MortgageCase RLS since cases belong to another user)
    const results = await Promise.all(
      caseIds.map(id =>
        base44.asServiceRole.entities.MortgageCase.filter({ id })
          .then(r => { console.log('[getSharedCases] case', id, 'result:', r?.length); return r[0]; })
          .catch(e => { console.error('[getSharedCases] case fetch error', id, e.message); return null; })
      )
    );

    const cases = results.filter(c => c && !c.is_archived && !c.module_id);
    console.log('[getSharedCases] final cases:', cases.length);

    return Response.json({ cases });
  } catch (error) {
    console.error('[getSharedCases] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});