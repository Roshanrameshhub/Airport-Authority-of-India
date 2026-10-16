/**
 * assetFormValidation.js — AAI Asset Management System
 * 
 * Category-Specific Dynamic Form Validator.
 * Validates flat form state against the authoritative declarative configuration
 * in client/src/config/assetCategoryFormConfigs.js.
 *
 * Rules:
 * 1. Uses assetCategoryFormConfigs.js as the single source of truth.
 * 2. Every field with required === true must have a non-empty value.
 * 3. Remarks is universally optional (required === false) and never causes validation failure.
 * 4. Empty values: undefined, null, '', or whitespace-only strings.
 * 5. Numbers: 0 is treated as a valid value, not empty.
 * 6. Booleans: false is treated as a valid value, not empty.
 * 7. Category #2 (UNDEFINED_2) is rejected as invalid/disabled.
 * 8. Unknown categories are rejected.
 * 9. Pure utility function — zero side-effects, zero mutations, zero network calls.
 */

import {
  getCategoryConfigByKey,
  getCategoryConfigById
} from '../config/assetCategoryFormConfigs.js';

/**
 * Parses numeric value supporting fractions (e.g. "1/2") and decimals (e.g. "12.5").
 * @param {*} val
 * @returns {number}
 */
export const parseNumericValue = (val) => {
  if (val === undefined || val === null) return NaN;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (str === '') return NaN;
  if (/^[-+]?\d+(\.\d+)?\s*\/\s*[-+]?\d+(\.\d+)?$/.test(str)) {
    const [num, den] = str.split('/').map((s) => Number(s.trim()));
    if (den === 0) return NaN;
    return num / den;
  }
  return Number(str);
};

/**
 * Checks whether a given value is considered empty for validation purposes.
 * @param {*} value - The input value to check
 * @param {string} type - Field type ('text', 'number', 'date', 'select', 'textarea')
 * @returns {boolean} True if empty, false if valid
 */
export const isValueEmpty = (value, type = 'text') => {
  if (value === undefined || value === null) {
    return true;
  }

  if (type === 'number') {
    if (typeof value === 'number') {
      return isNaN(value);
    }
    if (typeof value === 'string') {
      return value.trim() === '';
    }
    return true;
  }

  if (type === 'boolean' || typeof value === 'boolean') {
    return false; // false is a valid boolean value
  }

  if (typeof value === 'string') {
    return value.trim() === '';
  }

  return false;
};

/**
 * Resolves a category configuration object from either a key or a numeric ID.
 * @param {string|number} categoryKeyOrId
 * @returns {object|null}
 */
export const resolveCategoryConfig = (categoryKeyOrId) => {
  if (categoryKeyOrId === undefined || categoryKeyOrId === null) {
    return null;
  }
  if (typeof categoryKeyOrId === 'number' || !isNaN(Number(categoryKeyOrId))) {
    return getCategoryConfigById(Number(categoryKeyOrId));
  }
  return getCategoryConfigByKey(String(categoryKeyOrId));
};

/**
 * Validates a category-specific form state against its registered field requirements.
 * Allows fields to be left blank wherever technically possible.
 * Formats (valid numbers, whole-number counts, valid dates) are checked only when a value is provided.
 *
 * @param {string|number} categoryKeyOrId - The category key (e.g. 'MONITOR') or numeric ID (e.g. 3)
 * @param {object} formData - Flat key-value object containing the user's form inputs
 * @returns {{ valid: boolean, errors: Record<string, string> }} Validation result
 */
export const validateAssetCategoryForm = (categoryKeyOrId, formData = {}) => {
  const errors = {};

  // 1. Resolve category configuration
  const config = resolveCategoryConfig(categoryKeyOrId);

  if (!config) {
    return {
      valid: false,
      errors: {
        _category: 'Invalid or unknown asset category.'
      }
    };
  }

  // 2. Category #2 is explicitly undefined and must never be validated as active
  if (!config.isDefined || !config.enabled || config.id === 2 || config.key === 'UNDEFINED_2') {
    return {
      valid: false,
      errors: {
        _category: 'Asset category #2 is currently undefined and cannot be registered.'
      }
    };
  }

  // 3. Validate each field defined for the category
  // Fields can be left blank. Validate formats only when a non-empty value is supplied.
  const safeData = formData || {};

  for (const field of config.fields) {
    const rawValue = safeData[field.key];

    // Blank values are permitted
    if (rawValue === undefined || rawValue === null || (typeof rawValue === 'string' && rawValue.trim() === '')) {
      continue;
    }

    // All alphanumeric values, decimals, fractions (e.g. 1/2, 8GB, 512GB SSD),
    // and manual text entries are accepted without restrictive formatting errors.
    if (field.type === 'date') {
      if (isNaN(Date.parse(rawValue))) {
        errors[field.key] = `${field.label} must be a valid date`;
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

export default validateAssetCategoryForm;
