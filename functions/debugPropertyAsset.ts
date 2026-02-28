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
      userList = await base44.entities.PropertyAsset.list('-created_date', 10);
      console.log('[Test1] User list:', userList.length);
    } catch (e) {
      console.error('[Test1] FAILED:', e.message);
    }

    // Test 2: Service role list
    let serviceList = [];
    try {
      serviceList = await base44.asServiceRole.entities.PropertyAsset.list('-created_date', 10);
      console.log('[Test2] Service list:', serviceList.length);
    } catch (e) {
      console.error('[Test2] FAILED:', e.message);
    }

    // Test 3: Service role filter by case_id
    let caseFilter = [];
    try {
      caseFilter = await base44.asServiceRole.entities.PropertyAsset.filter({ case_id: '69a35b4f12bf776869cb24b8' });
      console.log('[Test3] Case filter:', caseFilter.length);
    } catch (e) {
      console.error('[Test3] FAILED:', e.message);
    }

    // Test 4: Service role filter empty
    let emptyFilter = [];
    try {
      emptyFilter = await base44.asServiceRole.entities.PropertyAsset.filter({});
      console.log('[Test4] Empty filter:', emptyFilter.length);
    } catch (e) {
      console.error('[Test4] FAILED:', e.message);
    }

    return Response.json({
      user_email: user.email,
      test1_user_list: userList.length,
      test2_service_list: serviceList.length,
      test3_case_filter: caseFilter.length,
      test4_empty_filter: emptyFilter.length,
      sample_user: userList[0] ? { id: userList[0].id, case_id: userList[0].case_id, address: userList[0].address, created_by: userList[0].created_by } : null,
      sample_service: serviceList[0] ? { id: serviceList[0].id, case_id: serviceList[0].case_id, address: serviceList[0].address, created_by: serviceList[0].created_by } : null,
      sample_case: caseFilter[0] ? { id: caseFilter[0].id, case_id: caseFilter[0].case_id, address: caseFilter[0].address, created_by: caseFilter[0].created_by } : null
    });
  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});