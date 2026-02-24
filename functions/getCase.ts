import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { caseId } = await req.json();
    if (!caseId) {
      return Response.json({ error: 'Missing caseId' }, { status: 400 });
    }

    // Use service role to bypass RLS and get the case
    const cases = await base44.asServiceRole.entities.MortgageCase.filter({ id: caseId });
    if (cases.length === 0) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    const caseData = cases[0];

    // Check access: owner OR shared_with
    const isOwner = caseData.created_by === user.email;
    const isShared = caseData.shared_with && 
                     Array.isArray(caseData.shared_with) && 
                     caseData.shared_with.includes(user.email);

    if (!isOwner && !isShared) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    return Response.json({ case_data: caseData, is_owner: isOwner, is_shared: isShared });
  } catch (error) {
    console.error('Error in getCase:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});