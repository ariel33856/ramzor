import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const targetCaseId = body.case_id || '69a35b4f12bf776869cb24b8';

    // Get ALL properties
    const allProps = await base44.asServiceRole.entities.PropertyAsset.list('-created_date', 100);
    
    // Filter client-side for this case_id
    const propsForCase = allProps.filter(p => p.case_id === targetCaseId);
    
    // Also check properties owned by the case owner
    const cases = await base44.asServiceRole.entities.MortgageCase.filter({ id: targetCaseId });
    const mc = cases[0];
    const ownerProps = mc ? allProps.filter(p => p.created_by === mc.created_by) : [];

    return Response.json({
      target_case_id: targetCaseId,
      case_owner: mc?.created_by,
      case_shared_with: mc?.shared_with,
      total_properties: allProps.length,
      props_with_this_case_id: propsForCase.length,
      props_by_owner: ownerProps.length,
      all_case_ids: allProps.map(p => ({ id: p.id, address: p.address, case_id: p.case_id, created_by: p.created_by }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});