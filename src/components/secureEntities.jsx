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
  // Clear cache after 60 seconds so role changes are picked up
  setTimeout(() => { cachedUser = null; }, 60000);
  return user;
}

export function clearSecureUserCache() {
  cachedUser = null;
}

function createSecureEntity(entityName) {
  const entity = base44.entities[entityName];

  return {
    // list(sortBy?, limit?) — matches the SDK signature
    async list(sortBy, limit) {
      const user = await getCurrentUser();
      if (user.role === 'admin') {
        return entity.list(sortBy, limit);
      }
      return entity.filter({ created_by: user.email }, sortBy, limit);
    },

    // filter(filters, sortBy?, limit?) — matches the SDK signature
    async filter(filters = {}, sortBy, limit) {
      const user = await getCurrentUser();
      const secureFilters = user.role === 'admin'
        ? filters
        : { ...filters, created_by: user.email };
      return entity.filter(secureFilters, sortBy, limit);
    },

    // get by id — verifies ownership
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
      await getCurrentUser();
      return entity.create(data);
    },

    async bulkCreate(dataArray) {
      await getCurrentUser();
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

    // Pass-through for schema
    schema() {
      return entity.schema();
    },

    // Pass-through for subscribe
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