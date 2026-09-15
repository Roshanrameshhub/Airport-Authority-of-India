import mongoose from 'mongoose';
import ExcelFieldConfig from '../models/ExcelFieldConfig.js';
import Asset from '../models/Asset.js';
import { assetRepository } from '../repositories/assetRepository.js';
import { logger } from '../utils/logger.js';

/**
 * 13 Confirmed Core AAI Business Fields (Strictly Locked / System Required)
 */
export const CORE_LOCKED_FIELDS = [
  {
    fieldId: 'userName',
    fieldName: 'userName',
    displayName: 'User Name',
    dataType: 'TEXT',
    options: [],
    isLocked: true,
    required: false,
    enabled: true,
    importEnabled: true,
    exportEnabled: true,
    sortOrder: 1,
    description: 'Current custodian or user of the hardware asset',
    aliases: ['user name', 'username', 'custodian', 'employee name', 'staff name', 'holder', 'assigned to']
  },
  {
    fieldId: 'designation',
    fieldName: 'designation',
    displayName: 'Designation',
    dataType: 'TEXT',
    options: [],
    isLocked: true,
    required: false,
    enabled: true,
    importEnabled: true,
    exportEnabled: true,
    sortOrder: 2,
    description: 'Official job designation or title of custodian',
    aliases: ['designation', 'role', 'title', 'post', 'position', 'official designation', 'job title']
  },
  {
    fieldId: 'department',
    fieldName: 'department',
    displayName: 'Department',
    dataType: 'TEXT',
    options: [],
    isLocked: true,
    required: true,
    enabled: true,
    importEnabled: true,
    exportEnabled: true,
    sortOrder: 3,
    description: 'Airport department or operational section',
    aliases: ['department', 'dept', 'division', 'section', 'branch', 'directorate', 'cost center']
  },
  {
    fieldId: 'floor',
    fieldName: 'floor',
    displayName: 'Floor',
    dataType: 'TEXT',
    options: [],
    isLocked: true,
    required: true,
    enabled: true,
    importEnabled: true,
    exportEnabled: true,
    sortOrder: 4,
    description: 'Physical building, floor or room location',
    aliases: ['floor', 'location', 'floor / location', 'wing', 'room', 'block', 'cabin', 'physical location']
  },
  {
    fieldId: 'employeeId',
    fieldName: 'employeeId',
    displayName: 'Employee ID',
    dataType: 'TEXT',
    options: [],
    isLocked: true,
    required: false,
    enabled: true,
    importEnabled: true,
    exportEnabled: true,
    sortOrder: 5,
    description: 'Unique AAI staff identifier or employee code',
    aliases: ['employee id', 'employeeid', 'emp id', 'empid', 'staff id', 'emp no', 'employee no', 'employee code']
  },
  {
    fieldId: 'assetName',
    fieldName: 'assetName',
    displayName: 'Asset Name',
    dataType: 'TEXT',
    options: [],
    isLocked: true,
    required: true,
    enabled: true,
    importEnabled: true,
    exportEnabled: true,
    sortOrder: 6,
    description: 'Hardware equipment descriptor or device name',
    aliases: ['asset name', 'asset', 'equipment', 'equipment name', 'item name', 'device name', 'hardware name']
  },
  {
    fieldId: 'make',
    fieldName: 'make',
    displayName: 'Make / Company',
    dataType: 'TEXT',
    options: [],
    isLocked: true,
    required: true,
    enabled: true,
    importEnabled: true,
    exportEnabled: true,
    sortOrder: 7,
    description: 'Hardware manufacturer OEM or brand',
    aliases: ['make', 'company', 'make / company', 'manufacturer', 'brand', 'vendor', 'oem', 'mfr']
  },
  {
    fieldId: 'model',
    fieldName: 'model',
    displayName: 'Model',
    dataType: 'TEXT',
    options: [],
    isLocked: true,
    required: true,
    enabled: true,
    importEnabled: true,
    exportEnabled: true,
    sortOrder: 8,
    description: 'Specific hardware model designation',
    aliases: ['model', 'model no', 'model number', 'equipment model', 'hardware model']
  },
  {
    fieldId: 'serialNumber',
    fieldName: 'serialNumber',
    displayName: 'Serial Number',
    dataType: 'TEXT',
    options: [],
    isLocked: true,
    required: true,
    enabled: true,
    importEnabled: true,
    exportEnabled: true,
    sortOrder: 9,
    description: 'Unique hardware chassis serial number or service tag',
    aliases: ['serial number', 'serial no', 'serial', 'sn', 's/n', 'service tag', 'serial_number', 'sr no']
  },
  {
    fieldId: 'installDate',
    fieldName: 'installDate',
    displayName: 'Install Date',
    dataType: 'DATE',
    options: [],
    isLocked: true,
    required: false,
    enabled: true,
    importEnabled: true,
    exportEnabled: true,
    sortOrder: 10,
    description: 'Hardware installation or commissioning date',
    aliases: ['install date', 'installation date', 'date of installation', 'installed on', 'purchase date', 'd.o.i.']
  },
  {
    fieldId: 'warrantyEndDate',
    fieldName: 'warrantyEndDate',
    displayName: 'Warranty End',
    dataType: 'DATE',
    options: [],
    isLocked: true,
    required: false,
    enabled: true,
    importEnabled: true,
    exportEnabled: true,
    sortOrder: 11,
    description: 'OEM or AMC warranty expiration date',
    aliases: ['warranty end', 'warranty end date', 'warranty expiry', 'warranty valid till', 'warranty date', 'warranty']
  },
  {
    fieldId: 'operatingSystem',
    fieldName: 'operatingSystem',
    displayName: 'Type of OS + Version',
    dataType: 'TEXT',
    options: [],
    isLocked: true,
    required: false,
    enabled: true,
    importEnabled: true,
    exportEnabled: true,
    sortOrder: 12,
    description: 'Installed operating system platform and release/build version',
    aliases: ['type of os + version', 'type of os', 'operating system', 'os', 'os type', 'system os']
  },
  {
    fieldId: 'remarks',
    fieldName: 'remarks',
    displayName: 'Remarks',
    dataType: 'LONG_TEXT',
    options: [],
    isLocked: true,
    required: false,
    enabled: true,
    importEnabled: true,
    exportEnabled: true,
    sortOrder: 13,
    description: 'Operational notes, condition observations, or handover comments',
    aliases: ['remarks', 'remark', 'notes', 'comments', 'handover remarks', 'handover notes', 'description']
  }
];

// Fallback in-memory cache for test suites or offline environments
let memoryFieldCache = [...CORE_LOCKED_FIELDS];

/**
 * Seed 13 core business fields idempotently in database
 */
export const seedCoreFields = async () => {
  if (mongoose.connection.readyState !== 1) {
    return memoryFieldCache;
  }

  try {
    for (const field of CORE_LOCKED_FIELDS) {
      await ExcelFieldConfig.findOneAndUpdate(
        { fieldId: field.fieldId },
        {
          $set: {
            ...field,
            isLocked: true,
            enabled: true,
            importEnabled: true,
            exportEnabled: true
          }
        },
        { upsert: true, new: true }
      );
    }
    logger.info('[ExcelFieldService] Verified 13 Core Locked Business Fields.');
  } catch (err) {
    logger.warn(`[ExcelFieldService] Seeding core fields warning: ${err.message}`);
  }
};

/**
 * Convert display name to camelCase fieldName
 */
export const toCamelCase = (str) => {
  return str
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .map((word, idx) => {
      if (idx === 0) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
};

export const excelFieldService = {
  /**
   * Get all fields (Core + Custom) sorted by sortOrder
   */
  getAllFields: async () => {
    if (mongoose.connection.readyState === 1) {
      try {
        const fields = await ExcelFieldConfig.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
        if (fields && fields.length > 0) {
          return fields;
        }
      } catch (err) {
        logger.warn(`[ExcelFieldService] DB fetch failed, falling back to cache: ${err.message}`);
      }
    }
    return [...memoryFieldCache].sort((a, b) => a.sortOrder - b.sortOrder);
  },

  /**
   * Get all active fields enabled for Excel Import template & ingestion
   */
  getImportFields: async () => {
    const all = await excelFieldService.getAllFields();
    return all.filter(f => f.enabled && f.importEnabled);
  },

  /**
   * Get all active fields enabled for Excel Export
   */
  getExportFields: async () => {
    const all = await excelFieldService.getAllFields();
    return all.filter(f => f.enabled && f.exportEnabled);
  },

  /**
   * Get single field by fieldId
   */
  getFieldById: async (fieldId) => {
    if (mongoose.connection.readyState === 1) {
      return await ExcelFieldConfig.findOne({ fieldId }).lean();
    }
    return memoryFieldCache.find(f => f.fieldId === fieldId) || null;
  },

  /**
   * Create new Admin-configurable custom field
   */
  createField: async ({
    displayName,
    fieldName,
    dataType = 'TEXT',
    options = [],
    required = false,
    enabled = true,
    importEnabled = true,
    exportEnabled = true,
    description = '',
    aliases = [],
    user = 'ADMIN'
  }) => {
    if (!displayName || !displayName.trim()) {
      const err = new Error('Display Name is required');
      err.statusCode = 400;
      throw err;
    }

    const generatedKey = fieldName ? fieldName.trim() : toCamelCase(displayName);

    if (!generatedKey || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(generatedKey)) {
      const err = new Error('Field name must start with a letter and contain only alphanumeric characters or underscores');
      err.statusCode = 400;
      throw err;
    }

    // Check if field already exists
    const all = await excelFieldService.getAllFields();
    const exists = all.some(f => f.fieldName.toLowerCase() === generatedKey.toLowerCase() || f.displayName.toLowerCase() === displayName.trim().toLowerCase());
    if (exists) {
      const err = new Error(`Field with name '${generatedKey}' or display name '${displayName}' already exists`);
      err.statusCode = 409;
      throw err;
    }

    // Determine next sort order (Custom fields begin at 14+)
    const maxSort = all.reduce((max, f) => Math.max(max, f.sortOrder || 0), 13);
    const sortOrder = maxSort + 1;

    // Normalise options if SELECT
    const cleanOptions = dataType === 'SELECT'
      ? (Array.isArray(options) ? options : String(options).split(',')).map(o => String(o).trim()).filter(Boolean)
      : [];

    // Normalise aliases for intelligent header matching
    const cleanAliases = Array.isArray(aliases)
      ? aliases.map(a => String(a).toLowerCase().trim()).filter(Boolean)
      : String(aliases).split(',').map(a => a.toLowerCase().trim()).filter(Boolean);

    // Auto-include display name and key as aliases
    if (!cleanAliases.includes(displayName.toLowerCase().trim())) {
      cleanAliases.push(displayName.toLowerCase().trim());
    }

    const newFieldData = {
      fieldId: generatedKey,
      fieldName: generatedKey,
      displayName: displayName.trim(),
      dataType,
      options: cleanOptions,
      isLocked: false,
      required: Boolean(required),
      enabled: Boolean(enabled),
      importEnabled: Boolean(importEnabled),
      exportEnabled: Boolean(exportEnabled),
      sortOrder,
      description: description.trim(),
      aliases: cleanAliases,
      createdBy: user,
      updatedBy: user
    };

    if (mongoose.connection.readyState === 1) {
      const doc = await ExcelFieldConfig.create(newFieldData);
      return doc.toObject();
    } else {
      memoryFieldCache.push(newFieldData);
      return newFieldData;
    }
  },

  /**
   * Update configurable field
   */
  updateField: async (fieldId, updates, user = 'ADMIN') => {
    const existing = await excelFieldService.getFieldById(fieldId);
    if (!existing) {
      const err = new Error(`Field '${fieldId}' not found`);
      err.statusCode = 404;
      throw err;
    }

    if (existing.isLocked) {
      const err = new Error('System-required core business fields are locked and cannot be edited or redefined');
      err.statusCode = 403;
      throw err;
    }

    const allowedUpdates = {};
    if (updates.displayName !== undefined) allowedUpdates.displayName = updates.displayName.trim();
    if (updates.dataType !== undefined) allowedUpdates.dataType = updates.dataType;
    if (updates.options !== undefined) {
      allowedUpdates.options = Array.isArray(updates.options)
        ? updates.options.map(o => String(o).trim()).filter(Boolean)
        : String(updates.options).split(',').map(o => o.trim()).filter(Boolean);
    }
    if (updates.required !== undefined) allowedUpdates.required = Boolean(updates.required);
    if (updates.enabled !== undefined) allowedUpdates.enabled = Boolean(updates.enabled);
    if (updates.importEnabled !== undefined) allowedUpdates.importEnabled = Boolean(updates.importEnabled);
    if (updates.exportEnabled !== undefined) allowedUpdates.exportEnabled = Boolean(updates.exportEnabled);
    if (updates.description !== undefined) allowedUpdates.description = updates.description.trim();
    if (updates.aliases !== undefined) {
      allowedUpdates.aliases = Array.isArray(updates.aliases)
        ? updates.aliases.map(a => String(a).toLowerCase().trim()).filter(Boolean)
        : String(updates.aliases).split(',').map(a => a.toLowerCase().trim()).filter(Boolean);
    }
    allowedUpdates.updatedBy = user;

    if (mongoose.connection.readyState === 1) {
      const updated = await ExcelFieldConfig.findOneAndUpdate(
        { fieldId },
        { $set: allowedUpdates },
        { new: true }
      ).lean();
      return updated;
    } else {
      Object.assign(existing, allowedUpdates);
      return existing;
    }
  },

  /**
   * Toggle boolean properties: enabled, importEnabled, exportEnabled, required
   */
  toggleFieldProperty: async (fieldId, property, value, user = 'ADMIN') => {
    const existing = await excelFieldService.getFieldById(fieldId);
    if (!existing) {
      const err = new Error(`Field '${fieldId}' not found`);
      err.statusCode = 404;
      throw err;
    }

    if (existing.isLocked) {
      const err = new Error('System-required core business fields cannot be modified or disabled');
      err.statusCode = 403;
      throw err;
    }

    const validProps = ['enabled', 'importEnabled', 'exportEnabled', 'required'];
    if (!validProps.includes(property)) {
      const err = new Error(`Invalid toggle property '${property}'`);
      err.statusCode = 400;
      throw err;
    }

    const updates = { [property]: Boolean(value), updatedBy: user };

    if (mongoose.connection.readyState === 1) {
      return await ExcelFieldConfig.findOneAndUpdate({ fieldId }, { $set: updates }, { new: true }).lean();
    } else {
      existing[property] = Boolean(value);
      existing.updatedBy = user;
      return existing;
    }
  },

  /**
   * Reorder configurable fields
   */
  reorderFields: async (orderedFieldIds = []) => {
    const all = await excelFieldService.getAllFields();
    let customOrder = 14;

    for (const id of orderedFieldIds) {
      const field = all.find(f => f.fieldId === id);
      if (field && !field.isLocked) {
        if (mongoose.connection.readyState === 1) {
          await ExcelFieldConfig.updateOne({ fieldId: id }, { $set: { sortOrder: customOrder } });
        } else {
          field.sortOrder = customOrder;
        }
        customOrder++;
      }
    }

    return await excelFieldService.getAllFields();
  },

  /**
   * Check historical usage of a field in existing assets
   */
  checkFieldUsage: async (fieldId) => {
    const field = await excelFieldService.getFieldById(fieldId);
    if (!field) {
      const err = new Error(`Field '${fieldId}' not found`);
      err.statusCode = 404;
      throw err;
    }

    if (field.isLocked) {
      return {
        fieldId,
        isLocked: true,
        usageCount: -1,
        canDelete: false,
        message: 'System core fields are locked and permanent'
      };
    }

    let usageCount = 0;
    if (mongoose.connection.readyState === 1) {
      try {
        const query = {};
        query[`customFields.${field.fieldName}`] = { $exists: true, $ne: '', $ne: null };
        usageCount = await Asset.countDocuments(query);
      } catch (err) {
        usageCount = 0;
      }
    } else {
      try {
        const { items } = await assetRepository.findPaginated({ page: 1, limit: 10000 });
        usageCount = items.filter(a => a.customFields?.[field.fieldName] !== undefined && a.customFields?.[field.fieldName] !== '' && a.customFields?.[field.fieldName] !== null).length;
      } catch (e) {
        usageCount = 0;
      }
    }

    return {
      fieldId,
      fieldName: field.fieldName,
      displayName: field.displayName,
      isLocked: false,
      usageCount,
      canDirectDelete: usageCount === 0,
      recommendation: usageCount > 0 ? 'DISABLE' : 'SAFE_TO_DELETE'
    };
  },

  /**
   * Delete or Disable field with safeguard against accidental data loss
   */
  deleteField: async (fieldId, force = false) => {
    const field = await excelFieldService.getFieldById(fieldId);
    if (!field) {
      const err = new Error(`Field '${fieldId}' not found`);
      err.statusCode = 404;
      throw err;
    }

    if (field.isLocked) {
      const err = new Error('CRITICAL: System-required core business fields cannot be deleted or removed');
      err.statusCode = 403;
      throw err;
    }

    // Check usage
    const usage = await excelFieldService.checkFieldUsage(fieldId);

    if (usage.usageCount > 0 && !force) {
      return {
        deleted: false,
        requiresConfirmation: true,
        usageCount: usage.usageCount,
        message: `Field '${field.displayName}' is currently populated in ${usage.usageCount} asset records. We strongly recommend DISABLING the field instead of permanent deletion. To proceed with permanent deletion, please confirm.`
      };
    }

    if (mongoose.connection.readyState === 1) {
      await ExcelFieldConfig.deleteOne({ fieldId });
    } else {
      memoryFieldCache = memoryFieldCache.filter(f => f.fieldId !== fieldId);
    }

    return {
      deleted: true,
      requiresConfirmation: false,
      usageCount: usage.usageCount,
      message: `Field '${field.displayName}' was successfully deleted.`
    };
  }
};

export default excelFieldService;
