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

function createSecureEntity(entityName, options = {}) {
  const { hasCaseId = false } = options;
  const entity = base44.entities[entityName];

  return {
    async list(sortBy, limit) {
      const user = await getCurrentUser();

      // Admin Logic
      if (user.role === 'admin') {
        const filterUser = getAdminFilterUser();
        if (filterUser) {
          return entity.filter({ created_by: filterUser }, sortBy, limit);
        }
        return entity.list(sortBy, limit);
      }

      // Regular User - RLS handles shared_with automatically
      return entity.list(sortBy, limit);
    },

    async filter(filters = {}, sortBy, limit) {
      const user = await getCurrentUser();

      // Admin Logic
      if (user.role === 'admin') {
        const filterUser = getAdminFilterUser();
        if (filterUser) {
          return entity.filter({ ...filters, created_by: filterUser }, sortBy, limit);
        }
        return entity.filter(filters, sortBy, limit);
      }

      // Regular User - RLS handles ownership and shared_with automatically
      return entity.filter(filters, sortBy, limit);
    },

    async get(id) {
      const results = await entity.filter({ id });
      const record = results[0];
      if (!record) throw new Error(`Record not found: ${entityName}/${id}`);
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
      return entity.update(id, data);
    },

    async delete(id) {
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
  MortgageCase: createSecureEntity("MortgageCase"),
  Submission: createSecureEntity("Submission", { hasCaseId: true }),
  Person: createSecureEntity("Person"),
  Interaction: createSecureEntity("Interaction", { hasCaseId: true }),
  Request: createSecureEntity("Request", { hasCaseId: true }),
  Transaction: createSecureEntity("Transaction"),
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