import { base44 } from '@/api/base44Client';

let cachedUser = null;

async function getCurrentUser() {
  if (cachedUser) return cachedUser;
  const user = await base44.auth.me();
  if (!user) {
    base44.auth.redirectToLogin(window.location.href);
    throw new Error("Not authenticated");
  }
  cachedUser = user;
  setTimeout(() => { cachedUser = null; }, 60000);
  return user;
}

export function clearSecureUserCache() {
  cachedUser = null;
}

// Returns the active filter user for admin (from localStorage), or null
function getAdminFilterUser() {
  try {
    const val = localStorage.getItem('globalFilterUser');
    return val && val !== 'all' ? val : null;
  } catch {
    return null;
  }
}

// Helper: Get list of case IDs shared with the user
async function getSharedCaseIds(userEmail) {
  const permissions = await base44.entities.CasePermission.filter({
    shared_email: userEmail,
    is_active: true
  });
  return permissions.map(p => p.case_id);
}

// Helper: Check if user has permission on a specific case
async function hasPermissionOnCase(caseId, userEmail) {
  const permissions = await base44.entities.CasePermission.filter({
    case_id: caseId,
    shared_email: userEmail,
    is_active: true
  });
  return permissions.length > 0 ? permissions[0] : null;
}

function createSecureEntity(entityName, options = {}) {
  const { isCase = false, hasCaseId = false } = options;
  const entity = base44.entities[entityName];

  return {
    async list(sortBy, limit) {
      const user = await getCurrentUser();
      
      // Admin Logic
      if (user.role === 'admin') {
        const filterUser = getAdminFilterUser();
        if (filterUser) {
          // Admin impersonating a user: show owned + shared
          const sharedIds = await getSharedCaseIds(filterUser);
          
          if (isCase && sharedIds.length > 0) {
            return entity.filter({
              $or: [
                { created_by: filterUser },
                { id: { $in: sharedIds } }
              ]
            }, sortBy, limit);
          }
          
          if (hasCaseId && sharedIds.length > 0) {
            return entity.filter({
              $or: [
                { created_by: filterUser },
                { case_id: { $in: sharedIds } }
              ]
            }, sortBy, limit);
          }

          return entity.filter({ created_by: filterUser }, sortBy, limit);
        }
        // Admin seeing all (no impersonation)
        return entity.list(sortBy, limit);
      }

      // Regular User Logic: show owned + shared
      const sharedIds = await getSharedCaseIds(user.email);

      if (isCase && sharedIds.length > 0) {
        return entity.filter({
          $or: [
            { created_by: user.email },
            { id: { $in: sharedIds } }
          ]
        }, sortBy, limit);
      }

      if (hasCaseId && sharedIds.length > 0) {
        return entity.filter({
          $or: [
            { created_by: user.email },
            { case_id: { $in: sharedIds } }
          ]
        }, sortBy, limit);
      }

      return entity.filter({ created_by: user.email }, sortBy, limit);
    },

    async filter(filters = {}, sortBy, limit) {
      const user = await getCurrentUser();

      // Admin Logic
      if (user.role === 'admin') {
        const filterUser = getAdminFilterUser();
        if (filterUser) {
          // Admin impersonating a user
          const sharedIds = await getSharedCaseIds(filterUser);
          let query = { ...filters };

          if (isCase && sharedIds.length > 0) {
            query.$or = [
              { created_by: filterUser },
              { id: { $in: sharedIds } }
            ];
          } else if (hasCaseId && sharedIds.length > 0) {
            query.$or = [
              { created_by: filterUser },
              { case_id: { $in: sharedIds } }
            ];
          } else {
            query.created_by = filterUser;
          }
          
          return entity.filter(query, sortBy, limit);
        }
        // Admin seeing all
        return entity.filter(filters, sortBy, limit);
      }

      // Regular User Logic
      const sharedIds = await getSharedCaseIds(user.email);
      let query = { ...filters };

      if (isCase && sharedIds.length > 0) {
        query.$or = [
          { created_by: user.email },
          { id: { $in: sharedIds } }
        ];
      } else if (hasCaseId && sharedIds.length > 0) {
        query.$or = [
          { created_by: user.email },
          { case_id: { $in: sharedIds } }
        ];
      } else {
        query.created_by = user.email;
      }

      return entity.filter(query, sortBy, limit);
    },

    async get(id) {
      const user = await getCurrentUser();
      const results = await entity.filter({ id });
      const record = results[0];
      if (!record) throw new Error(`Record not found: ${entityName}/${id}`);

      // Admin always has access
      if (user.role === 'admin') return record;

      // Check ownership
      const isOwner = record.created_by === user.email;
      if (isOwner) return record;

      // Check sharing
      if (isCase) {
        const permission = await hasPermissionOnCase(record.id, user.email);
        if (permission) return record;
      } else if (hasCaseId && record.case_id) {
        const permission = await hasPermissionOnCase(record.case_id, user.email);
        if (permission) return record;
      }

      throw new Error("Access denied: this record does not belong to you.");
    },

    async create(data) {
      const user = await getCurrentUser();
      if (user.role === 'admin') {
        const filterUser = getAdminFilterUser();
        if (filterUser) {
          return entity.create({ ...data, created_by: filterUser });
        }
      }
      return entity.create(data);
    },

    async bulkCreate(dataArray) {
      const user = await getCurrentUser();
      if (user.role === 'admin') {
        const filterUser = getAdminFilterUser();
        if (filterUser) {
          return entity.bulkCreate(dataArray.map(d => ({ ...d, created_by: filterUser })));
        }
      }
      return entity.bulkCreate(dataArray);
    },

    async update(id, data) {
      const user = await getCurrentUser();
      if (user.role === 'admin') return entity.update(id, data);

      const results = await entity.filter({ id });
      const record = results[0];
      if (!record) throw new Error(`Record not found: ${entityName}/${id}`);

      const isOwner = record.created_by === user.email;
      if (isOwner) return entity.update(id, data);

      // Shared Update Logic
      if (isCase) {
        const permission = await hasPermissionOnCase(record.id, user.email);
        if (permission && permission.permission === 'edit') {
          return entity.update(id, data);
        }
      } else if (hasCaseId && record.case_id) {
        const permission = await hasPermissionOnCase(record.case_id, user.email);
        if (permission && permission.permission === 'edit') {
          return entity.update(id, data);
        }
      }

      throw new Error(isCase || hasCaseId ? "You have read-only access to this case." : "Access denied: you cannot edit this record.");
    },

    async delete(id) {
      const user = await getCurrentUser();
      if (user.role === 'admin') return entity.delete(id);

      const results = await entity.filter({ id });
      const record = results[0];
      if (!record) throw new Error(`Record not found: ${entityName}/${id}`);

      const isOwner = record.created_by === user.email;
      if (!isOwner) {
        // Shared users can NEVER delete
        throw new Error(isCase || hasCaseId ? "Only the case owner can delete records." : "Access denied: you cannot delete this record.");
      }

      return entity.delete(id);
    },

    schema() {
      return entity.schema();
    },

    subscribe(callback) {
      return entity.subscribe(callback);
    }
  };
}

export const SecureEntities = {
  MortgageCase: createSecureEntity("MortgageCase", { isCase: true }),
  Submission: createSecureEntity("Submission", { hasCaseId: true }),
  Person: createSecureEntity("Person"), // Not strictly a child with case_id in schema
  Interaction: createSecureEntity("Interaction", { hasCaseId: true }),
  Request: createSecureEntity("Request", { hasCaseId: true }),
  Transaction: createSecureEntity("Transaction"), // Not strictly a child with case_id in schema
  Module: createSecureEntity("Module"),
  PropertyAsset: createSecureEntity("PropertyAsset", { hasCaseId: true }),
  Insurance: createSecureEntity("Insurance"),
  Property: createSecureEntity("Property"),
  Document: createSecureEntity("Document", { hasCaseId: true }),
  AuditLog: createSecureEntity("AuditLog", { hasCaseId: true }),
  Appointment: createSecureEntity("Appointment", { hasCaseId: true }),
  Milestone: createSecureEntity("Milestone", { hasCaseId: true }),
  CustomField: createSecureEntity("CustomField"),
  CasePermission: createSecureEntity("CasePermission"),
};