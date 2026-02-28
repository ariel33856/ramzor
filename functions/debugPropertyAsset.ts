import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all properties
    const allProps = await base44.asServiceRole.entities.PropertyAsset.list('-created_date', 20);
    
    // Check the case
    const cases = await base44.asServiceRole.entities.MortgageCase.filter({ id: '69a35b4f12bf776869cb24b8' });
    const mc = cases[0];

    return Response.json({
      total_properties: allProps.length,
      properties: allProps.map(p => ({ id: p.id, address: p.address, case_id: p.case_id, created_by: p.created_by })),
      case_property_id: mc?.property_id || null,
      case_id: mc?.id
    });
  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});