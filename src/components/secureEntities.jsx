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

// ─── MortgageCase (with sharing support) ───────────────────────────────────

function createMortgageCaseEntity() {
  const entity = base44.entities.MortgageCase;

  return {
    async list(sortBy, limit) {
      const user = await getCurrentUser();
      if (user.role === 'admin') {
        const filterUser = getAdminFilterUser();
        if (filterUser) {
          return entity.filter({ created_by: filterUser }, sortBy, limit);
        }
        return entity.list(sortBy, limit);
      }
      // Return cases owned by user OR shared with user
      const [owned, shared] = await Promise.all([
        entity.filter({ created_by: user.email }, sortBy, limit),
        entity.filter({ shared_with: user.email }, sortBy, limit)
      ]);
      const seen = new Set();
      return [...owned, ...shared].filter(r => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
    },

    async filter(filters = {}, sortBy, limit) {
      const user = await getCurrentUser();
      if (user.role === 'admin') {
        const filterUser = getAdminFilterUser();
        if (filterUser) {
          return entity.filter({ ...filters, created_by: filterUser }, sortBy, limit);
        }
        return entity.filter(filters, sortBy, limit);
      }
      // Return cases matching filters AND (owned or shared)
      const [owned, shared] = await Promise.all([
        entity.filter({ ...filters, created_by: user.email }, sortBy, limit),
        entity.filter({ ...filters, shared_with: user.email }, sortBy, limit)
      ]);
      const seen = new Set();
      return [...owned, ...shared].filter(r => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
    },

    async get(id) {
      const user = await getCurrentUser();
      const results = await entity.filter({ id });
      const record = results[0];
      if (!record) throw new Error(`Record not found: MortgageCase/${id}`);
      if (user.role === 'admin') return record;
      const isOwner = record.created_by === user.email;
      const isShared = record.shared_with?.includes(user.email);
      if (!isOwner && !isShared) throw new Error("Access denied");
      return record;
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
      if (user.role !== 'admin') {
        const results = await entity.filter({ id });
        const record = results[0];
        if (!record) throw new Error(`Record not found: MortgageCase/${id}`);
        if (record.created_by !== user.email) {
          throw new Error("Only the case owner can make changes.");
        }
      }
      return entity.update(id, data);
    },

    async delete(id) {
      const user = await getCurrentUser();
      if (user.role !== 'admin') {
        const results = await entity.filter({ id });
        const record = results[0];
        if (!record) throw new Error(`Record not found: MortgageCase/${id}`);
        if (record.created_by !== user.email) {
          throw new Error("Only the case owner can delete this case.");
        }
      }
      return entity.delete(id);
    },

    // Share / unshare helpers
    async shareWith(caseId, email) {
      const user = await getCurrentUser();
      const results = await entity.filter({ id: caseId });
      const record = results[0];
      if (!record) throw new Error('Case not found');
      if (record.created_by !== user.email && user.role !== 'admin') {
        throw new Error("Only the case owner can share this case.");
      }
      const current = record.shared_with || [];
      if (current.includes(email)) return record;
      return entity.update(caseId, { shared_with: [...current, email] });
    },

    async unshareWith(caseId, email) {
      const user = await getCurrentUser();
      const results = await entity.filter({ id: caseId });
      const record = results[0];
      if (!record) throw new Error('Case not found');
      if (record.created_by !== user.email && user.role !== 'admin') {
        throw new Error("Only the case owner can remove shared access.");
      }
      const current = record.shared_with || [];
      return entity.update(caseId, { shared_with: current.filter(e => e !== email) });
    },

    schema() {
      return entity.schema();
    },

    subscribe(callback) {
      return entity.subscribe(callback);
    }
  };
}

// ─── Generic secure entity (child entities with sharing-aware access) ───────

function createSecureEntity(entityName, parentCaseIdField = null) {
  const entity = base44.entities[entityName];

  // Helper: get all case IDs accessible to current user (owned + shared)
  async function getAccessibleCaseIds(user) {
    if (user.role === 'admin') return null; // null = no restriction
    const [owned, shared] = await Promise.all([
      base44.entities.MortgageCase.filter({ created_by: user.email }),
      base44.entities.MortgageCase.filter({ shared_with: user.email })
    ]);
    const seen = new Set();
    return [...owned, ...shared]
      .filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; })
      .map(r => r.id);
  }

  return {
    async list(sortBy, limit) {
      const user = await getCurrentUser();
      if (user.role === 'admin') {
        const filterUser = getAdminFilterUser();
        if (filterUser) {
          return entity.filter({ created_by: filterUser }, sortBy, limit);
        }
        return entity.list(sortBy, limit);
      }
      return entity.filter({ created_by: user.email }, sortBy, limit);
    },

    async filter(filters = {}, sortBy, limit) {
      const user = await getCurrentUser();
      if (user.role === 'admin') {
        const filterUser = getAdminFilterUser();
        if (filterUser) {
          return entity.filter({ ...filters, created_by: filterUser }, sortBy, limit);
        }
        return entity.filter(filters, sortBy, limit);
      }
      // If filtering by case_id, check if user has access to that case
      if (parentCaseIdField && filters[parentCaseIdField]) {
        const caseIds = await getAccessibleCaseIds(user);
        if (caseIds && !caseIds.includes(filters[parentCaseIdField])) {
          return []; // no access
        }
        return entity.filter(filters, sortBy, limit);
      }
      return entity.filter({ ...filters, created_by: user.email }, sortBy, limit);
    },

    async get(id) {
      const user = await getCurrentUser();
      const results = await entity.filter({ id });
      const record = results[0];
      if (!record) throw new Error(`Record not found: ${entityName}/${id}`);
      if (user.role === 'admin') return record;

      // Check direct ownership
      if (record.created_by === user.email) return record;

      // Check via parent case sharing
      if (parentCaseIdField && record[parentCaseIdField]) {
        const caseResults = await base44.entities.MortgageCase.filter({ id: record[parentCaseIdField] });
        const parentCase = caseResults[0];
        if (parentCase?.shared_with?.includes(user.email)) return record;
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
      // Shared users cannot create child records
      if (parentCaseIdField && data[parentCaseIdField]) {
        const caseResults = await base44.entities.MortgageCase.filter({ id: data[parentCaseIdField] });
        const parentCase = caseResults[0];
        if (parentCase && parentCase.created_by !== user.email && parentCase.shared_with?.includes(user.email)) {
          throw new Error("Shared users cannot create records in this case.");
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
      if (user.role !== 'admin') {
        const results = await entity.filter({ id });
        const record = results[0];
        if (!record) throw new Error(`Record not found: ${entityName}/${id}`);
        if (record.created_by !== user.email) {
          throw new Error("Access denied: you cannot edit this record.");
        }
      }
      return entity.update(id, data);
    },

    async delete(id) {
      const user = await getCurrentUser();
      if (user.role !== 'admin') {
        const results = await entity.filter({ id });
        const record = results[0];
        if (!record) throw new Error(`Record not found: ${entityName}/${id}`);
        if (record.created_by !== user.email) {
          throw new Error("Access denied: you cannot delete this record.");
        }
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
  MortgageCase: createMortgageCaseEntity(),
  Submission: createSecureEntity("Submission", "case_id"),
  Person: createSecureEntity("Person"),
  Interaction: createSecureEntity("Interaction", "case_id"),
  Request: createSecureEntity("Request", "case_id"),
  Transaction: createSecureEntity("Transaction"),
  Module: createSecureEntity("Module"),
  PropertyAsset: createSecureEntity("PropertyAsset", "case_id"),
  Insurance: createSecureEntity("Insurance"),
  Property: createSecureEntity("Property"),
  Document: createSecureEntity("Document", "case_id"),
  AuditLog: createSecureEntity("AuditLog", "case_id"),
  Appointment: createSecureEntity("Appointment", "case_id"),
  Milestone: createSecureEntity("Milestone", "case_id"),
  CustomField: createSecureEntity("CustomField"),
};