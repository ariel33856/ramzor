import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      // no body
    }

    // Admin can query shared cases for a specific user
    const targetEmail = (user.role === 'admin' && body.target_email) ? body.target_email : user.email;

    console.log('Looking for shared cases for:', targetEmail);
    
    // Use service role to get ALL cases (bypasses RLS)
    let allCases = [];
    try {
      allCases = await base44.asServiceRole.entities.MortgageCase.list('-created_date');
    } catch (e) {
      console.error('Failed to list cases with service role:', e.message);
      return Response.json({ shared_cases: [], debug: { error: e.message } });
    }
    
    console.log('Total cases from service role:', allCases.length);
    
    // Find shared cases for target user
    const sharedCases = allCases.filter(c => 
      c.shared_with && 
      Array.isArray(c.shared_with) && 
      c.shared_with.includes(targetEmail) && 
      c.created_by !== targetEmail
    );
    
    console.log('Shared cases found:', sharedCases.length);

    return Response.json({ 
      shared_cases: sharedCases, 
      debug: { 
        total: allCases.length, 
        target_email: targetEmail,
        shared_count: sharedCases.length
      } 
    });
  } catch (error) {
    console.error('Error getting shared cases:', error.message, error.stack);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});