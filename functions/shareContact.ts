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

    // Verify the user is the owner OR has shared access
    const isOwner = person.created_by === user.email;
    const isShared = (person.shared_with || []).includes(user.email);
    if (!isOwner && !isShared) {
      return Response.json({ error: 'Unauthorized: no access to this contact' }, { status: 403 });
    }

    const currentSharedWith = person.shared_with || [];

    if (action === 'revoke') {
      const updatedSharedWith = currentSharedWith.filter(e => e !== shared_email);
      await base44.asServiceRole.entities.Person.update(person_id, {
        shared_with: updatedSharedWith
      });
      return Response.json({ success: true, shared_with: updatedSharedWith });
    }

    // Default: share action
    if (shared_email === user.email) {
      return Response.json({ error: 'לא ניתן לשתף עם עצמך' }, { status: 400 });
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