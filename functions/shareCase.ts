import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_id, case_title, shared_email } = await req.json();

    if (!case_id || !shared_email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (shared_email === user.email) {
      return Response.json({ error: 'לא ניתן לשתף עם עצמך' }, { status: 400 });
    }

    // Fetch the case using service role (owner's case)
    const cases = await base44.asServiceRole.entities.MortgageCase.filter({ id: case_id });
    const mortgageCase = cases[0];

    if (!mortgageCase) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    // Check if already shared
    const currentSharedWith = mortgageCase.shared_with || [];
    if (currentSharedWith.includes(shared_email)) {
      return Response.json({ error: 'המשתמש כבר משותף לתיק זה' }, { status: 400 });
    }

    // Add email to shared_with array on the case itself
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