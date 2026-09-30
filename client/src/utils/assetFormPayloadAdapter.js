/**
 * assetFormPayloadAdapter.js — AAI Asset Management System
 * 
 * Category-Specific Dynamic Form Payload Adapter.
 * Pure transformation utility that converts flat category-specific form state
 * into the structured Asset JSON payload expected by POST /api/v1/assets.
 *
 * Rules:
 * 1. Uses assetCategoryFormConfigs.js as the single source of truth.
 * 2. Never mutates the original formData object.
 * 3. Never makes API calls, database queries, or external mutations.
 * 4. Maps category-specific ID aliases (Mon ID, PTR ID, etc.) to 'assetId'.
 * 5. Maps serial aliases (SL No, Mon SL No, etc.) to 'serialNumber'.
 * 6. Structures computerConfig, softwareConfig, networkConfig, powerConfig.
 * 7. Places non-schema properties into 'specifications' (chipset, toner, material, etc.).
 * 8. Transforms Warranty/AMC cleanly (Warranty -> warrantyEndDate, AMC -> amcEndDate, None -> no fake date).
 * 9. Does NOT inject warranty fields into categories where not specified (e.g. Projector).
 * 10. Does NOT inject fake business defaults (e.g. "IT Pool", fake floor, fake warranty date).
 * 11. Rejects unknown or disabled categories (including Category #2).
 */

import {
  getCategoryConfigByKey,
  getCategoryConfigById
} from '../config/assetCategoryFormConfigs.js';

/**
 * Resolves a category configuration object from either a key or a numeric ID.
 * @param {string|number} categoryKeyOrId
 * @returns {object|null}
 */
const resolveCategoryConfig = (categoryKeyOrId) => {
  if (categoryKeyOrId === undefined || categoryKeyOrId === null) {
    return null;
  }
  if (typeof categoryKeyOrId === 'number' || !isNaN(Number(categoryKeyOrId))) {
    return getCategoryConfigById(Number(categoryKeyOrId));
  }
  return getCategoryConfigByKey(String(categoryKeyOrId));
};

/**
 * Safely parses a value based on the field configuration type.
 * @param {*} value - Input value
 * @param {string} type - Field type ('text', 'number', 'date', 'select', 'textarea')
 * @returns {*} Parsed value
 */
const parseFieldValue = (value, type) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (type === 'number') {
    if (typeof value === 'number') return isNaN(value) ? undefined : value;
    const trimmed = String(value).trim();
    if (trimmed === '') return undefined;
    const num = Number(trimmed);
    return isNaN(num) ? undefined : num;
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  return value;
};

/**
 * Builds the canonical Asset API payload from a flat category form state.
 * 
 * @param {string|number} categoryKeyOrId - The category key (e.g. 'MONITOR') or numeric ID (e.g. 3)
 * @param {object} formData - Flat key-value inputs from user form
 * @returns {object} Structured Asset payload ready for POST /api/v1/assets
 * @throws {Error} If category is invalid, unknown, or undefined (e.g. Category #2)
 */
export const buildAssetPayload = (categoryKeyOrId, formData = {}) => {
  // 1. Resolve category configuration
  const config = resolveCategoryConfig(categoryKeyOrId);

  if (!config) {
    throw new Error(`Invalid or unknown asset category: '${categoryKeyOrId}'`);
  }

  if (!config.isDefined || !config.enabled || config.id === 2 || config.key === 'UNDEFINED_2') {
    throw new Error('Asset category #2 is currently undefined and cannot be registered.');
  }

  // 2. Clone input data to guarantee immutability of original formData
  const source = { ...formData };

  // 3. Initialize structured payload with category metadata
  const payload = {
    category: config.category,
    assetType: config.assetType
  };

  // Intermediate subdocument containers (populated only if fields exist)
  let computerConfig = null;
  let softwareConfig = null;
  let networkConfig = null;
  let powerConfig = null;
  let specifications = null;
  let relationship = null;

  const ensureComputerConfig = () => {
    if (!computerConfig) computerConfig = {};
    return computerConfig;
  };
  const ensureSoftwareConfig = () => {
    if (!softwareConfig) softwareConfig = {};
    return softwareConfig;
  };
  const ensureNetworkConfig = () => {
    if (!networkConfig) networkConfig = {};
    return networkConfig;
  };
  const ensurePowerConfig = () => {
    if (!powerConfig) powerConfig = {};
    return powerConfig;
  };
  const ensureSpecifications = () => {
    if (!specifications) specifications = {};
    return specifications;
  };

  // 4. Map each registered field for this category
  for (const field of config.fields) {
    const rawVal = source[field.key];
    const val = parseFieldValue(rawVal, field.type);

    // Skip empty optional values or unprovided inputs
    if (val === undefined || val === '') {
      continue;
    }

    // A. Root Universal Fields
    if (field.target === 'assetId') {
      payload.assetId = String(val).toUpperCase();
    } else if (field.target === 'serialNumber') {
      payload.serialNumber = String(val).toUpperCase();
    } else if (field.target === 'make') {
      payload.make = val;
    } else if (field.target === 'model') {
      payload.model = val;
    } else if (field.target === 'technology') {
      payload.technology = val;
      // For UPS / SWITCH UPS, technology is also stored in powerConfig.topology
      if (config.assetType === 'UPS') {
        ensurePowerConfig().topology = val;
      }
    } else if (field.target === 'installDate') {
      payload.installDate = val;
    } else if (field.target === 'supplier') {
      payload.supplier = val;
      payload.vendor = val; // Mirror vendor according to repository convention
    } else if (field.target === 'supplyOrderNumber') {
      payload.supplyOrderNumber = val;
    } else if (field.target === 'purchaseDate') {
      payload.purchaseDate = val;
    } else if (field.target === 'department') {
      payload.department = val;
    } else if (field.target === 'location') {
      payload.location = val;
    } else if (field.target === 'remarks') {
      payload.remarks = val;
    } else if (field.target === 'assetName') {
      // e.g. Switch Description
      payload.assetName = val;
    } else if (field.target === 'currentEmployeeName') {
      // e.g. User in Laptop MSE
      payload.currentEmployeeName = val;

    // B. Subdocuments: computerConfig
    } else if (field.target.startsWith('computerConfig.')) {
      const prop = field.target.split('.')[1];
      ensureComputerConfig()[prop] = val;

    // C. Subdocuments: softwareConfig
    } else if (field.target.startsWith('softwareConfig.')) {
      const prop = field.target.split('.')[1];
      ensureSoftwareConfig()[prop] = val;

    // D. Subdocuments: networkConfig
    } else if (field.target.startsWith('networkConfig.')) {
      const prop = field.target.split('.')[1];
      ensureNetworkConfig()[prop] = val;

    // E. Subdocuments: powerConfig
    } else if (field.target.startsWith('powerConfig.')) {
      const prop = field.target.split('.')[1];
      ensurePowerConfig()[prop] = val;

    // F. Subdocuments: specifications (unsupported/dynamic custom properties)
    } else if (field.target.startsWith('specifications.')) {
      const prop = field.target.split('.')[1];
      ensureSpecifications()[prop] = val;

    // G. Relational Parent Reference (e.g. LAP ID in LAPTOP MSE)
    } else if (field.target === 'relationship.parentAssetId') {
      const parentId = String(val).toUpperCase();
      relationship = {
        parentAssetId: parentId,
        relationshipType: 'PERIPHERAL_OF',
        componentRole: 'MOUSE'
      };
      // Also snapshot into specifications for instant indexing/querying without join
      ensureSpecifications().parentLaptopId = parentId;
    }
  }

  // 5. Warranty & AMC Transformation (Strictly Category-Aware)
  // Check if this category explicitly defines warranty fields
  const hasWarrantyFields = config.fields.some((f) => f.key === 'warrantyAmcType');

  if (hasWarrantyFields) {
    const rawWarrantyType = source.warrantyAmcType;
    const warrantyType = typeof rawWarrantyType === 'string' ? rawWarrantyType.trim() : rawWarrantyType;
    const warrantyDate = source.warrantyAmcDate ? String(source.warrantyAmcDate).trim() : null;

    if (warrantyType === 'Warranty') {
      payload.amcApplicable = false;
      if (warrantyDate) {
        payload.warrantyEndDate = warrantyDate;
      }
    } else if (warrantyType === 'AMC') {
      payload.amcApplicable = true;
      if (warrantyDate) {
        payload.amcEndDate = warrantyDate;
      }
    } else if (warrantyType === 'None') {
      payload.amcApplicable = false;
      // Do NOT invent any fake warranty dates!
    }
  }

  // 6. Attach subdocuments if populated
  if (computerConfig) payload.computerConfig = computerConfig;
  if (softwareConfig) payload.softwareConfig = softwareConfig;
  if (networkConfig) payload.networkConfig = networkConfig;
  if (powerConfig) payload.powerConfig = powerConfig;
  if (specifications) payload.specifications = specifications;
  if (relationship) payload._relationship = relationship;

  return payload;
};

export default buildAssetPayload;
