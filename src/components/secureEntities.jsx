import { base44 } from '@/api/base44Client';

let cachedUser = null;
// Cache for shared case IDs the current user has access to
let sharedCaseIdsCache = null;
let sharedCaseIdsCacheTime = 0;
const SHARED_CACHE_TTL = 60000; // 1 minute

async function getCurrentUser() {
  if (cachedUser) return cachedUser;
  try {
    const user = await base44.auth.me();
    if (!user) {
      console.warn('SecureEntities: user not authenticated');
      return null;
    }
    cachedUser = user;
    setTimeout(() => { cachedUser = null; }, 60000);
    return user;
  } catch (e) {
    console.warn('SecureEntities: auth check failed', e);
    return null;
  }
}

export function clearSecureUserCache() {
  cachedUser = null;
  sharedCaseIdsCache = null;
  sharedCaseIdsCacheTime = 0;
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

// Get shared case IDs for this user
async function getSharedCaseIds() {
  const now = Date.now();
  if (sharedCaseIdsCache && (now - sharedCaseIdsCacheTime) < SHARED_CACHE_TTL) {
    return sharedCaseIdsCache;
  }
  try {
    const response = await base44.functions.invoke('getSharedCases', {});
    const sharedCases = response?.data?.shared_cases || [];
    sharedCaseIdsCache = Array.isArray(sharedCases) ? sharedCases.map(c => c.id) : [];
    sharedCaseIdsCacheTime = now;
    return sharedCaseIdsCache;
  } catch (e) {
    console.warn('Failed to get shared cases:', e);
    sharedCaseIdsCache = [];
    sharedCaseIdsCacheTime = now;
    return [];
  }
}

// Check if a specific case is shared with the user
async function isCaseSharedWithUser(caseId) {
  const sharedIds = await getSharedCaseIds();
  return sharedIds.includes(caseId);
}

// Fetch entity data for a shared case via backend (bypasses RLS)
async function fetchSharedCaseEntityData(caseId, entityName, filters) {
  try {
    const response = await base44.functions.invoke('getCaseRelatedData', {
      case_id: caseId,
      entity_name: entityName,
      filters: filters || undefined
    });
    return response.data?.data || [];
  } catch (e) {
    console.error(`Failed to fetch shared ${entityName} for case ${caseId}:`, e);
    return [];
  }
}

function createSecureEntity(entityName, options = {}) {
  const { hasCaseId = false } = options;
  const entity = base44.entities[entityName];

  return {
    async list(sortBy, limit) {
      const user = await getCurrentUser();
      if (!user) return [];
      return entity.filter({ created_by: user.email }, sortBy, limit);
    },

    async filter(filters = {}, sortBy, limit) {
      const user = await getCurrentUser();
      if (!user) return [];

      // For entities with case_id filter - check if it's a shared case
      const caseIdInFilter = filters.case_id;
      if (caseIdInFilter && hasCaseId) {
        const isShared = await isCaseSharedWithUser(caseIdInFilter);
        if (isShared) {
          return fetchSharedCaseEntityData(caseIdInFilter, entityName, filters);
        }
      }

      // For MortgageCase filtered by id - check if shared
      if (entityName === 'MortgageCase' && filters.id) {
        const isShared = await isCaseSharedWithUser(filters.id);
        if (isShared) {
          return fetchSharedCaseEntityData(filters.id, entityName, filters);
        }
      }

      // Add created_by filter unless already filtering by id
      if (!filters.created_by && !filters.id) {
        return entity.filter({ ...filters, created_by: user.email }, sortBy, limit);
      }
      return entity.filter(filters, sortBy, limit);
    },

    // Special method to list entities for a specific case (handles shared cases)
    async listForCase(caseId, additionalFilters = {}, sortBy, limit) {
      const user = await getCurrentUser();
      if (!user) return [];

      // Check if this is a shared case
      const isShared = await isCaseSharedWithUser(caseId);
      if (isShared) {
        const filters = hasCaseId ? { case_id: caseId, ...additionalFilters } : additionalFilters;
        return fetchSharedCaseEntityData(caseId, entityName, filters);
      }

      // Own case - use regular filter
      if (hasCaseId) {
        return entity.filter({ case_id: caseId, ...additionalFilters, created_by: user.email }, sortBy, limit);
      }
      return entity.filter({ ...additionalFilters, created_by: user.email }, sortBy, limit);
    },

    // List persons linked to a case (handles shared cases)
    async listForCasePersons(caseId) {
      const user = await getCurrentUser();
      if (!user) return [];

      // Check if this is a shared case
      const isShared = await isCaseSharedWithUser(caseId);
      if (isShared) {
        return fetchSharedCaseEntityData(caseId, 'Person', null);
      }

      // Own case
      return entity.filter({ created_by: user.email });
    },

    async get(id) {
      const results = await entity.filter({ id });
      const record = results[0];
      if (!record) return null;
      return record;
    },

    async create(data) {
      return entity.create(data);
    },

    async bulkCreate(dataArray) {
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