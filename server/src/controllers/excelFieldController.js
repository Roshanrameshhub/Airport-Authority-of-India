import { excelFieldService } from '../services/excelFieldService.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

/**
 * Controller for Admin-managed Excel Field Configuration
 */

// GET /api/v1/excel-fields - List all fields with summary metrics
export const getAllFields = async (req, res, next) => {
  try {
    const fields = await excelFieldService.getAllFields();

    const metrics = {
      totalFields: fields.length,
      coreLockedFields: fields.filter(f => f.isLocked).length,
      customFields: fields.filter(f => !f.isLocked).length,
      importEnabledCount: fields.filter(f => f.enabled && f.importEnabled).length,
      exportEnabledCount: fields.filter(f => f.enabled && f.exportEnabled).length
    };

    return sendSuccess(res, { fields, metrics }, 'Excel field configurations retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/excel-fields/import-template-fields - Active fields for import template
export const getImportFields = async (req, res, next) => {
  try {
    const fields = await excelFieldService.getImportFields();
    return sendSuccess(res, fields, 'Import-enabled fields retrieved');
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/excel-fields/export-fields - Active fields for export
export const getExportFields = async (req, res, next) => {
  try {
    const fields = await excelFieldService.getExportFields();
    return sendSuccess(res, fields, 'Export-enabled fields retrieved');
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/excel-fields - Create custom field
export const createField = async (req, res, next) => {
  try {
    const { displayName, fieldName, dataType, options, required, enabled, importEnabled, exportEnabled, description, aliases } = req.body;
    const user = req.user?.username || 'ADMIN';

    const created = await excelFieldService.createField({
      displayName,
      fieldName,
      dataType,
      options,
      required,
      enabled,
      importEnabled,
      exportEnabled,
      description,
      aliases,
      user
    });

    return sendSuccess(res, created, 'Custom field created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/excel-fields/:fieldId - Update custom field
export const updateField = async (req, res, next) => {
  try {
    const { fieldId } = req.params;
    const user = req.user?.username || 'ADMIN';

    const updated = await excelFieldService.updateField(fieldId, req.body, user);
    return sendSuccess(res, updated, 'Custom field updated successfully');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/excel-fields/:fieldId/toggle - Quick toggle
export const toggleField = async (req, res, next) => {
  try {
    const { fieldId } = req.params;
    const { property, value } = req.body;
    const user = req.user?.username || 'ADMIN';

    const toggled = await excelFieldService.toggleFieldProperty(fieldId, property, value, user);
    return sendSuccess(res, toggled, `Field property '${property}' updated`);
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/excel-fields/reorder - Reorder fields
export const reorderFields = async (req, res, next) => {
  try {
    const { orderedFieldIds } = req.body;
    if (!Array.isArray(orderedFieldIds)) {
      return sendError(res, 'orderedFieldIds must be an array of field IDs', 400);
    }

    const reordered = await excelFieldService.reorderFields(orderedFieldIds);
    return sendSuccess(res, reordered, 'Fields reordered successfully');
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/excel-fields/:fieldId/usage - Check historical usage
export const checkUsage = async (req, res, next) => {
  try {
    const { fieldId } = req.params;
    const usage = await excelFieldService.checkFieldUsage(fieldId);
    return sendSuccess(res, usage, 'Field usage checked');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/excel-fields/:fieldId - Safe delete or warning
export const deleteField = async (req, res, next) => {
  try {
    const { fieldId } = req.params;
    const force = req.query.force === 'true';

    const result = await excelFieldService.deleteField(fieldId, force);

    if (result.requiresConfirmation) {
      return res.status(200).json({
        success: false,
        requiresConfirmation: true,
        usageCount: result.usageCount,
        message: result.message
      });
    }

    return sendSuccess(res, result, result.message);
  } catch (error) {
    next(error);
  }
};
