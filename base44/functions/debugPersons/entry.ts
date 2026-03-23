import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // List all persons with service role - no filter
    let srListAll = null;
    try {
      srListAll = await base44.asServiceRole.entities.Person.list('-created_date', 50);
      console.log('SR list all count:', srListAll?.length);
      if (srListAll?.length > 0) {
        console.log('First person:', JSON.stringify(srListAll[0]));
      }
    } catch(e) {
      srListAll = 'ERROR: ' + e.message;
      console.log('SR list error:', e.message);
    }

    // User-level list
    let userListAll = null;
    try {
      userListAll = await base44.entities.Person.list('-created_date', 50);
      console.log('User list all count:', userListAll?.length);
    } catch(e) {
      userListAll = 'ERROR: ' + e.message;
    }

    // Service role filter with no constraints
    let srFilterAll = null;
    try {
      srFilterAll = await base44.asServiceRole.entities.Person.filter({}, '-created_date', 50);
      console.log('SR filter all count:', srFilterAll?.length);
    } catch(e) {
      srFilterAll = 'ERROR: ' + e.message;
    }

    return Response.json({
      user_email: user.email,
      user_role: user.role,
      sr_list_count: typeof srListAll === 'string' ? srListAll : (srListAll || []).length,
      sr_filter_count: typeof srFilterAll === 'string' ? srFilterAll : (srFilterAll || []).length,
      user_list_count: typeof userListAll === 'string' ? userListAll : (userListAll || []).length,
      sr_sample: typeof srListAll !== 'string' && srListAll?.length > 0 
        ? srListAll.slice(0, 3).map(p => ({ id: p.id, name: `${p.first_name} ${p.last_name}`, type: p.type, created_by: p.created_by, is_archived: p.is_archived })) 
        : null,
      user_sample: typeof userListAll !== 'string' && userListAll?.length > 0
        ? userListAll.slice(0, 3).map(p => ({ id: p.id, name: `${p.first_name} ${p.last_name}`, type: p.type, created_by: p.created_by, is_archived: p.is_archived }))
        : null,
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});