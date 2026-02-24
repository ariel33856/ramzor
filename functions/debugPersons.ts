import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetId = '6989a20fb34aa49db98bf46d';

    // Approach 1: service role get
    let srGet = null;
    try {
      srGet = await base44.asServiceRole.entities.Person.get(targetId);
    } catch(e) {
      srGet = 'ERROR: ' + e.message;
    }

    // Approach 2: service role filter by id
    let srFilter = null;
    try {
      srFilter = await base44.asServiceRole.entities.Person.filter({ id: targetId });
    } catch(e) {
      srFilter = 'ERROR: ' + e.message;
    }

    // Approach 3: user-level filter by id  
    let userFilter = null;
    try {
      userFilter = await base44.entities.Person.filter({ id: targetId });
    } catch(e) {
      userFilter = 'ERROR: ' + e.message;
    }

    // Approach 4: user-level list
    let userList = null;
    try {
      userList = await base44.entities.Person.list('-created_date', 2);
    } catch(e) {
      userList = 'ERROR: ' + e.message;
    }

    // Approach 5: service role list 
    let srList = null;
    try {
      srList = await base44.asServiceRole.entities.Person.list('-created_date', 2);
    } catch(e) {
      srList = 'ERROR: ' + e.message;
    }

    return Response.json({
      user_email: user.email,
      sr_get: srGet ? (typeof srGet === 'string' ? srGet : { id: srGet.id, name: srGet.first_name }) : null,
      sr_filter: typeof srFilter === 'string' ? srFilter : (srFilter || []).length,
      user_filter: typeof userFilter === 'string' ? userFilter : (userFilter || []).length,
      user_list: typeof userList === 'string' ? userList : (userList || []).length,
      sr_list: typeof srList === 'string' ? srList : (srList || []).length,
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});