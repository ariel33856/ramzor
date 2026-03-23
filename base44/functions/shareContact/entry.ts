import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { person_id, shared_email, action } = await req.json();

    if (!person_id || !shared_email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the person using service role
    const persons = await base44.asServiceRole.entities.Person.filter({ id: person_id });
    const person = persons[0];

    if (!person) {
      return Response.json({ error: 'Person not found' }, { status: 404 });
    }

    // Allow any authenticated user to share (Person RLS is open for read/update)

    const currentSharedWith = person.shared_with || [];

    if (action === 'revoke') {
      const updatedSharedWith = currentSharedWith.filter(e => e !== shared_email);
      await base44.asServiceRole.entities.Person.update(person_id, {
        shared_with: updatedSharedWith
      });
      return Response.json({ success: true, shared_with: updatedSharedWith });
    }

    // Default: share action - skip if sharing with self
    if (shared_email === user.email) {
      return Response.json({ success: true, shared_with: currentSharedWith, skipped: true });
    }

    if (currentSharedWith.includes(shared_email)) {
      return Response.json({ success: true, shared_with: currentSharedWith });
    }

    const updatedSharedWith = [...currentSharedWith, shared_email];
    await base44.asServiceRole.entities.Person.update(person_id, {
      shared_with: updatedSharedWith
    });

    return Response.json({ success: true, shared_with: updatedSharedWith });
  } catch (error) {
    console.error('[shareContact] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});