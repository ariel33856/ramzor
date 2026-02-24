import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User email:', user.email);
    
    // Use service role to get ALL cases (bypasses RLS)
    const allCases = await base44.asServiceRole.entities.MortgageCase.list('-created_date');
    
    console.log('Total cases from service role:', allCases.length);
    
    // Log a sample of shared_with fields for debugging
    const casesWithSharing = allCases.filter(c => c.shared_with && c.shared_with.length > 0);
    console.log('Cases with shared_with:', casesWithSharing.length);
    casesWithSharing.forEach(c => {
      console.log(`Case ${c.id}: shared_with=${JSON.stringify(c.shared_with)}, created_by=${c.created_by}`);
    });
    
    // Find shared cases for this user
    const sharedCases = allCases.filter(c => 
      c.shared_with && 
      Array.isArray(c.shared_with) && 
      c.shared_with.includes(user.email) && 
      c.created_by !== user.email
    );
    
    console.log('Shared cases found:', sharedCases.length);

    return Response.json({ 
      shared_cases: sharedCases, 
      debug: { 
        total: allCases.length, 
        user_email: user.email,
        cases_with_sharing: casesWithSharing.length
      } 
    });
  } catch (error) {
    console.error('Error getting shared cases:', error.message, error.stack);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});