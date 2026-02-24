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
    // Try fetching with filter to get a large batch
    let allCases = [];
    let page = 0;
    const pageSize = 50;
    
    while (true) {
      const batch = await base44.asServiceRole.entities.MortgageCase.filter({}, '-created_date', pageSize);
      console.log(`Batch ${page}: got ${batch.length} cases`);
      if (batch.length > 0) {
        console.log(`First case in batch: id=${batch[0].id}, keys=${Object.keys(batch[0]).join(',')}`);
      }
      allCases = batch;
      break; // Just get first batch for now
    }
    
    console.log('Total cases:', allCases.length);
    
    // Find shared cases
    const sharedCases = allCases.filter(c => 
      c.shared_with && 
      Array.isArray(c.shared_with) && 
      c.shared_with.includes(user.email) && 
      c.created_by !== user.email
    );
    
    console.log('Shared cases found:', sharedCases.length);

    return Response.json({ shared_cases: sharedCases, debug: { total: allCases.length, user_email: user.email } });
  } catch (error) {
    console.error('Error getting shared cases:', error.message, error.stack);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});