import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use asServiceRole to read ALL permissions (created by service role in shareCase)
    // then filter to only ones shared with this user
    const allPermissions = await base44.asServiceRole.entities.CasePermission.filter({
      shared_email: user.email,
      is_active: true
    });

    console.log('[getSharedCases] user:', user.email);
    console.log('[getSharedCases] permissions found:', allPermissions.length);

    if (!allPermissions.length) {
      return Response.json({ cases: [] });
    }

    const caseIds = allPermissions.map(p => p.case_id);
    console.log('[getSharedCases] case_ids:', caseIds);

    // Fetch each case using service role
    const results = await Promise.all(
      caseIds.map(id =>
        base44.asServiceRole.entities.MortgageCase.filter({ id })
          .then(r => r[0] || null)
          .catch(() => null)
      )
    );

    const cases = results.filter(c => c && !c.is_archived && !c.module_id);
    console.log('[getSharedCases] final cases:', cases.length);

    return Response.json({ cases, permissions: allPermissions });
  } catch (error) {
    console.error('[getSharedCases] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});