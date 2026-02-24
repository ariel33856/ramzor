import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try different approaches
    const api = base44.asServiceRole.entities.Person;
    
    // Approach 1: list
    let listResult = [];
    try {
      listResult = await api.list('-created_date', 5);
    } catch(e) {
      console.log('list failed:', e.message);
    }

    // Approach 2: filter by created_by
    let filterResult = [];
    try {
      filterResult = await api.filter({ created_by: 'ariel33856@gmail.com' }, '-created_date', 5);
    } catch(e) {
      console.log('filter failed:', e.message);
    }

    // Approach 3: filter empty
    let filterEmptyResult = [];
    try {
      filterEmptyResult = await api.filter({}, '-created_date', 5);
    } catch(e) {
      console.log('filter empty failed:', e.message);
    }

    // Approach 4: filter by id
    let filterIdResult = [];
    try {
      filterIdResult = await api.filter({ id: '6989a20fb34aa49db98bf46d' });
    } catch(e) {
      console.log('filter by id failed:', e.message);
    }

    return Response.json({
      list_count: listResult.length,
      list_ids: listResult.map(p => p.id),
      filter_count: filterResult.length,
      filter_ids: filterResult.map(p => p.id),
      filter_empty_count: filterEmptyResult.length,
      filter_id_count: filterIdResult.length,
      filter_id_data: filterIdResult.map(p => ({ id: p.id, name: p.first_name, linked: p.linked_accounts }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});