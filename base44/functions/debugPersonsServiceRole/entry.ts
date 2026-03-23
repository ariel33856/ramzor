import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Test 1: User-scoped list
    let userList = [];
    try {
      userList = await base44.entities.Person.list('-created_date', 5);
      console.log('[Test1] User-scoped list:', userList.length, 'persons');
    } catch (e) {
      console.error('[Test1] User-scoped list FAILED:', e.message);
    }

    // Test 2: Service role list
    let serviceList = [];
    try {
      serviceList = await base44.asServiceRole.entities.Person.list('-created_date', 5);
      console.log('[Test2] Service role list:', serviceList.length, 'persons');
    } catch (e) {
      console.error('[Test2] Service role list FAILED:', e.message);
    }

    // Test 3: Service role filter by created_by
    let filterList = [];
    try {
      filterList = await base44.asServiceRole.entities.Person.filter({ created_by: 'ariel33856@gmail.com' });
      console.log('[Test3] Service role filter by owner:', filterList.length, 'persons');
    } catch (e) {
      console.error('[Test3] Service role filter FAILED:', e.message);
    }

    // Test 4: Service role filter empty
    let filterEmpty = [];
    try {
      filterEmpty = await base44.asServiceRole.entities.Person.filter({});
      console.log('[Test4] Service role filter empty:', filterEmpty.length, 'persons');
    } catch (e) {
      console.error('[Test4] Service role filter empty FAILED:', e.message);
    }

    return Response.json({
      user_email: user.email,
      test1_user_list: userList.length,
      test2_service_list: serviceList.length,
      test3_service_filter_owner: filterList.length,
      test4_service_filter_empty: filterEmpty.length,
      sample_user: userList[0] ? { id: userList[0].id, first_name: userList[0].first_name, created_by: userList[0].created_by } : null,
      sample_service: serviceList[0] ? { id: serviceList[0].id, first_name: serviceList[0].first_name, created_by: serviceList[0].created_by } : null,
      sample_filter: filterList[0] ? { id: filterList[0].id, first_name: filterList[0].first_name, created_by: filterList[0].created_by } : null
    });
  } catch (error) {
    console.error('Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});