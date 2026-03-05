import { base44 } from '@/api/base44Client';

let cachedUser = null;
// Cache for individual case sharing checks
const sharedCaseCheckCache = new Map(); // caseId -> { isShared, time }
const SHARED_CACHE_TTL = 120000; // 2 minutes

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

// Check if a specific case is shared with the user (direct check, no bulk load)
async function isCaseSharedWithUser(caseId) {
  if (!caseId) return false;
  
  const now = Date.now();
  const cached = sharedCaseCheckCache.get(caseId);
  if (cached && (now - cached.time) < SHARED_CACHE_TTL) {
    return cached.isShared;
  }
  
  try {
    // Direct check - fetch the specific case via backend
    const response = await base44.functions.invoke('getCaseRelatedData', {
      case_id: caseId
    });
    // If we get data back without error, we have access (owner, shared, or admin)
    const caseData = response?.data?.data || response?.data;
    const user = await getCurrentUser();
    const isShared = caseData && user && caseData.created_by !== user.email;
    
    sharedCaseCheckCache.set(caseId, { isShared: !!isShared, time: now });
    return !!isShared;
  } catch (e) {
    console.warn('Failed to check case sharing:', e);
    // Don't cache failures
    return false;
  }
}

// Fetch entity data for a shared case via backend (bypasses RLS)
async function fetchSharedCaseEntityData(caseId, entityName, filters) {
  try {
    console.log(`[SecureEntities] fetchSharedCaseEntityData entity=${entityName} caseId=${caseId} filters=`, JSON.stringify(filters));
    const response = await base44.functions.invoke('getCaseRelatedData', {
      case_id: caseId,
      entity_name: entityName,
      filters: filters || undefined
    });
    console.log(`[SecureEntities] fetchSharedCaseEntityData response:`, JSON.stringify(response.data));
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
      console.log(`[SecureEntities] listForCase entity=${entityName} caseId=${caseId} isShared=${isShared} user=${user.email}`);
      if (isShared) {
        const filters = hasCaseId ? { case_id: caseId, ...additionalFilters } : additionalFilters;
        const result = await fetchSharedCaseEntityData(caseId, entityName, filters);
        console.log(`[SecureEntities] Shared ${entityName} results:`, result.length);
        return result;
      }

      // Own case - for PropertyAsset, get properties linked to this case
      if (entityName === 'PropertyAsset') {
        // Get the case to check property_id
        let casePropertyId = null;
        try {
          const caseResults = await base44.entities.MortgageCase.filter({ id: caseId });
          casePropertyId = caseResults[0]?.property_id;
        } catch (e) {
          console.warn('Failed to get case property_id:', e);
        }

        // Get properties with matching case_id
        const byCase = await entity.filter({ case_id: caseId, ...additionalFilters, created_by: user.email }, sortBy, limit);
        const propMap = new Map();
        for (const p of byCase) propMap.set(p.id, p);

        // Also get the directly linked property if exists
        if (casePropertyId && !propMap.has(casePropertyId)) {
          try {
            const linked = await entity.filter({ id: casePropertyId });
            if (linked[0]) propMap.set(linked[0].id, linked[0]);
          } catch (e) {
            console.warn('Failed to get linked property:', e);
          }
        }

        return Array.from(propMap.values());
      }

      // Own case - use regular filter with case_id
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