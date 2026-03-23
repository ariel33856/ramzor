import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_id, case_title, shared_email, action } = await req.json();

    if (!case_id || !shared_email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the case using service role
    const cases = await base44.asServiceRole.entities.MortgageCase.filter({ id: case_id });
    const mortgageCase = cases[0];

    if (!mortgageCase) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    // Verify the user is the owner OR has shared access
    const isOwner = mortgageCase.created_by === user.email;
    const isShared = (mortgageCase.shared_with || []).includes(user.email);
    if (!isOwner && !isShared) {
      return Response.json({ error: 'Unauthorized: no access to this case' }, { status: 403 });
    }

    const currentSharedWith = mortgageCase.shared_with || [];

    if (action === 'revoke') {
      // Remove email from shared_with
      const updatedSharedWith = currentSharedWith.filter(e => e !== shared_email);
      await base44.asServiceRole.entities.MortgageCase.update(case_id, {
        shared_with: updatedSharedWith
      });
      console.log('[shareCase] Revoked access for', shared_email, 'on case', case_id);
      return Response.json({ success: true, shared_with: updatedSharedWith });
    }

    // Default: share action
    if (shared_email === user.email) {
      return Response.json({ error: 'לא ניתן לשתף עם עצמך' }, { status: 400 });
    }

    if (currentSharedWith.includes(shared_email)) {
      return Response.json({ error: 'המשתמש כבר משותף לתיק זה' }, { status: 400 });
    }

    const updatedSharedWith = [...currentSharedWith, shared_email];
    await base44.asServiceRole.entities.MortgageCase.update(case_id, {
      shared_with: updatedSharedWith
    });

    console.log('[shareCase] Updated case', case_id, 'shared_with:', updatedSharedWith);
    return Response.json({ success: true, shared_with: updatedSharedWith });
  } catch (error) {
    console.error('[shareCase] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});