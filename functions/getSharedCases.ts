import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User email:', user.email);
    
    // Step 1: Get all cases using service role
    const allCases = await base44.asServiceRole.entities.MortgageCase.list();
    console.log('Total cases from service role:', allCases.length);
    
    // Debug: log first case
    if (allCases.length > 0) {
      console.log('First case keys:', Object.keys(allCases[0]).join(', '));
      console.log('First case shared_with:', JSON.stringify(allCases[0].shared_with));
      console.log('First case created_by:', allCases[0].created_by);
    }
    
    // Step 2: Find cases with shared_with containing this user's email
    const sharedCases = [];
    for (const c of allCases) {
      if (c.shared_with && Array.isArray(c.shared_with) && c.shared_with.includes(user.email) && c.created_by !== user.email) {
        sharedCases.push(c);
      }
    }
    
    console.log('Shared cases found:', sharedCases.length);

    return Response.json({ shared_cases: sharedCases, debug: { total: allCases.length, user_email: user.email } });
  } catch (error) {
    console.error('Error getting shared cases:', error.message, error.stack);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});