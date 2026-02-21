import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ENTITY_NAMES = [
  "MortgageCase",
  "Submission",
  "Person",
  "Interaction",
  "Request",
  "Transaction",
  "Module",
  "PropertyAsset",
  "Insurance",
  "Property",
  "Document",
  "AuditLog",
  "Appointment",
  "Milestone",
  "CustomField",
];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  // Find the admin user email (the one running this)
  const adminEmail = user.email;

  const results = {};
  let totalUpdated = 0;

  for (const entityName of ENTITY_NAMES) {
    const entity = base44.asServiceRole.entities[entityName];
    const allRecords = await entity.list();
    const missing = allRecords.filter(r => !r.created_by);

    let updated = 0;
    for (const record of missing) {
      await entity.update(record.id, { created_by: adminEmail });
      updated++;
    }

    results[entityName] = { total: allRecords.length, updated };
    totalUpdated += updated;
  }

  return Response.json({
    success: true,
    adminEmail,
    totalUpdated,
    details: results
  });
});