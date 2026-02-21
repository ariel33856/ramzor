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

function createSecureEntity(entityName) {
  const entity = base44.entities[entityName];

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
      return entity.filter({ ...filters, created_by: user.email }, sortBy, limit);
    },

    async get(id) {
      const user = await getCurrentUser();
      const results = await entity.filter({ id });
      const record = results[0];
      if (!record) throw new Error(`Record not found: ${entityName}/${id}`);
      if (user.role !== 'admin' && record.created_by !== user.email) {
        throw new Error("Access denied: this record does not belong to you.");
      }
      return record;
    },

    async create(data) {
      const user = await getCurrentUser();
      if (user.role === 'admin') {
        const filterUser = getAdminFilterUser();
        if (filterUser) {
          // Create on behalf of the selected user
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
  MortgageCase: createSecureEntity("MortgageCase"),
  Submission: createSecureEntity("Submission"),
  Person: createSecureEntity("Person"),
  Interaction: createSecureEntity("Interaction"),
  Request: createSecureEntity("Request"),
  Transaction: createSecureEntity("Transaction"),
  Module: createSecureEntity("Module"),
  PropertyAsset: createSecureEntity("PropertyAsset"),
  Insurance: createSecureEntity("Insurance"),
  Property: createSecureEntity("Property"),
  Document: createSecureEntity("Document"),
  AuditLog: createSecureEntity("AuditLog"),
  Appointment: createSecureEntity("Appointment"),
  Milestone: createSecureEntity("Milestone"),
  CustomField: createSecureEntity("CustomField"),
};