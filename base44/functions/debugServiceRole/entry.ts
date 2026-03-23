import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Test 1: list all persons with service role
    const persons1 = await base44.asServiceRole.entities.Person.list('-created_date', 5);
    
    // Test 2: filter by specific email
    const persons2 = await base44.asServiceRole.entities.Person.filter({ created_by: 'ariel33856@gmail.com' });
    
    // Test 3: list with user role
    let persons3 = [];
    try {
      persons3 = await base44.entities.Person.list('-created_date', 5);
    } catch(e) {
      persons3 = [{ error: e.message }];
    }

    return Response.json({ 
      test1_serviceRole_list: { count: persons1.length, sample: persons1.slice(0, 2).map(p => ({ id: p.id, name: p.first_name + ' ' + p.last_name, created_by: p.created_by })) },
      test2_serviceRole_filter: { count: persons2.length, sample: persons2.slice(0, 2).map(p => ({ id: p.id, name: p.first_name + ' ' + p.last_name, created_by: p.created_by })) },
      test3_userRole_list: { count: persons3.length, sample: persons3.slice(0, 2).map(p => ({ id: p.id, name: p.first_name + ' ' + p.last_name, created_by: p.created_by })) },
      user: user.email
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});