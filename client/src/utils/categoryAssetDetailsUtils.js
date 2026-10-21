/**
 * categoryAssetDetailsUtils.js — AAI Asset Management System
 * 
 * Category-aware utility functions for resolving category configuration,
 * extracting field values, and formatting display values.
 */

import {
  ASSET_CATEGORY_FORM_CONFIGS,
  getActiveCategoryConfigs
} from '../config/assetCategoryFormConfigs.js';

/**
 * Resolves the matching category configuration from an asset's stored properties.
 * Handles:
 * 1. Exact match on category key (e.g. 'MONITOR', 'LAPTOP')
 * 2. Exact match on category name (e.g. 'Monitor', 'All In One PC', 'Laptop MSE')
 * 3. Matching by assetType and category name combination
 * 4. Case-insensitive normalization
 */
export const resolveAssetCategoryConfig = (asset) => {
  if (!asset) return null;

  // 1. Direct match by category key
  if (asset.categoryKey && ASSET_CATEGORY_FORM_CONFIGS[asset.categoryKey]) {
    return ASSET_CATEGORY_FORM_CONFIGS[asset.categoryKey];
  }

  // 2. Direct match by category name or key in the configs dictionary
  for (const cfg of Object.values(ASSET_CATEGORY_FORM_CONFIGS)) {
    if (cfg.key === asset.category || cfg.name === asset.category) {
      return cfg;
    }
  }

  // 3. Normalized / case-insensitive search
  const catLower = (asset.category || '').toLowerCase().trim();
  for (const cfg of Object.values(ASSET_CATEGORY_FORM_CONFIGS)) {
    if (cfg.name.toLowerCase() === catLower || cfg.key.toLowerCase() === catLower) {
      return cfg;
    }
  }

  // 4. Match by assetType if category is generic (e.g. 'IT Equipment', 'Surveillance')
  if (asset.assetType) {
    const typeMatches = Object.values(ASSET_CATEGORY_FORM_CONFIGS).filter(
      (c) => c.enabled && c.assetType === asset.assetType
    );
    if (typeMatches.length === 1) {
      return typeMatches[0];
    }
    // If multiple (e.g. DESKTOP matches ALL_IN_ONE_PC and CPU), try name hint
    for (const match of typeMatches) {
      if (
        (asset.assetName && asset.assetName.toLowerCase().includes(match.name.toLowerCase())) ||
        (asset.model && asset.model.toLowerCase().includes(match.name.toLowerCase()))
      ) {
        return match;
      }
    }
    if (typeMatches.length > 0) {
      return typeMatches[0];
    }
  }

  return null;
};

/**
 * Extracts the value of a target path from an asset object.
 * e.g., 'computerConfig.processor' -> asset.computerConfig?.processor
 * e.g., 'specifications.toner' -> asset.specifications?.toner
 */
export const getAssetFieldValue = (asset, targetPath) => {
  if (!asset || !targetPath) return undefined;
  const parts = targetPath.split('.');
  let curr = asset;
  for (const part of parts) {
    if (curr === undefined || curr === null) return undefined;
    curr = curr[part];
  }
  return curr;
};

/**
 * Formats values cleanly for display (handles empty strings, arrays, booleans, dates).
 */
export const formatDisplayValue = (val) => {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : null;
  return String(val);
};

export default {
  resolveAssetCategoryConfig,
  getAssetFieldValue,
  formatDisplayValue
};
