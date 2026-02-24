import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User email:', user.email);
    
    // Get all cases using service role
    const allCases = await base44.asServiceRole.entities.MortgageCase.list('-created_date');
    console.log('Total cases found:', allCases.length);
    
    // Log cases with shared_with
    const casesWithSharing = allCases.filter(c => c.shared_with && c.shared_with.length > 0);
    console.log('Cases with shared_with:', casesWithSharing.length);
    casesWithSharing.forEach(c => {
      console.log(`Case ${c.id}: shared_with=${JSON.stringify(c.shared_with)}, created_by=${c.created_by}`);
    });
    
    // Filter for cases shared with this user
    const sharedCases = allCases.filter(c => {
      const hasSharedWith = c.shared_with && Array.isArray(c.shared_with) && c.shared_with.length > 0;
      if (!hasSharedWith) return false;
      const isSharedWithMe = c.shared_with.includes(user.email);
      const isNotOwner = c.created_by !== user.email;
      console.log(`Case ${c.id}: shared_with includes me=${isSharedWithMe}, not owner=${isNotOwner}`);
      return isSharedWithMe && isNotOwner;
    });

    console.log('Shared cases for user:', sharedCases.length);

    return Response.json({ shared_cases: sharedCases });
  } catch (error) {
    console.error('Error getting shared cases:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});