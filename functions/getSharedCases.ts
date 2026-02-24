import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all cases using service role
    const allCases = await base44.asServiceRole.entities.MortgageCase.list('-created_date');
    
    // Filter for cases shared with this user
    const sharedCases = allCases.filter(c => 
      c.shared_with && 
      Array.isArray(c.shared_with) && 
      c.shared_with.includes(user.email) &&
      c.created_by !== user.email // Don't include own cases
    );

    return Response.json({ shared_cases: sharedCases });
  } catch (error) {
    console.error('Error getting shared cases:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});