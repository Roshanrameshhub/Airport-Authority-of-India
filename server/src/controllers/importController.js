import { importService } from '../services/importService.js';
import { generateSampleTemplate } from '../utils/excelParser.js';
import { excelFieldService } from '../services/excelFieldService.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * Download sample spreadsheet template
 */
export const downloadTemplate = async (req, res, next) => {
  try {
    const importFields = await excelFieldService.getImportFields();
    const buffer = generateSampleTemplate(importFields);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="AAI_Asset_Import_Template.xlsx"');
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Step 1 & 2: Analyze Multiple Uploaded Workbooks & Worksheets
 */
export const analyzeFiles = async (req, res, next) => {
  try {
    let files = [];
    if (req.files && req.files.length > 0) {
      files = req.files;
    } else if (req.file) {
      files = [req.file];
    }

    if (files.length === 0) {
      return sendError(res, 'Please upload at least one Excel (.xlsx, .xls) or CSV file', 400);
    }

    let passwords = {};
    if (req.body?.passwords) {
      try {
        passwords = typeof req.body.passwords === 'string' ? JSON.parse(req.body.passwords) : req.body.passwords;
      } catch (e) {
        passwords = {};
      }
    }

    const result = await importService.analyzeWorkbooks(files, req.user, passwords);

    return sendSuccess(
      res,
      result,
      `Analyzed ${result.metrics.fileCount} file(s) and ${result.metrics.sheetCount} worksheet(s)`,
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Unlock a password-protected Excel workbook
 */
export const unlockWorkbook = async (req, res, next) => {
  try {
    const { importToken } = req.params;
    const { fileIndex, fileName, password } = req.body || {};

    if (!importToken) {
      return sendError(res, 'Import token is required', 400);
    }

    if (!password || typeof password !== 'string' || !password.trim()) {
      return sendError(res, 'Password is required to unlock this workbook', 400);
    }

    const result = await importService.unlockWorkbook(importToken, {
      fileIndex,
      fileName,
      password
    });

    return sendSuccess(res, result, 'Workbook unlocked successfully', 200);
  } catch (error) {
    if (error.code === 'INCORRECT_PASSWORD' || /incorrect password/i.test(error.message)) {
      return sendError(res, 'Incorrect password. Please try again.', 400);
    }
    if (error.code === 'DECRYPT_FAILED' || /unable to open/i.test(error.message)) {
      return sendError(res, 'Unable to open this workbook. Please check the password and file.', 400);
    }
    next(error);
  }
};

/**
 * Step 3: Update and Confirm Column Mappings
 */
export const updateMappings = async (req, res, next) => {
  try {
    const { importToken } = req.params;
    const { mappings, selectedSheets } = req.body;

    if (!importToken) {
      return sendError(res, 'Import token is required', 400);
    }

    const result = await importService.updateColumnMappings(importToken, { mappings, selectedSheets });
    return sendSuccess(res, result, 'Column mappings confirmed', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Step 4: Reconcile, Clean, Match, Merge Complementary Data, Detect Conflicts
 */
export const reconcileData = async (req, res, next) => {
  try {
    const { importToken } = req.params;

    if (!importToken) {
      return sendError(res, 'Import token is required', 400);
    }

    const commonKey = req.body?.commonKey || req.query?.commonKey || 'EMPLOYEE_ID';
    const selectedSheets = req.body?.selectedSheets || null;
    const result = await importService.reconcileAndStage(importToken, { commonKey, selectedSheets });

    return sendSuccess(
      res,
      result,
      `Reconciliation complete: ${result.metrics.assetsFound || result.metrics.uniqueAssets} assets identified, ${result.metrics.conflictCount || 0} conflicts, ${result.metrics.duplicatesCount || 0} duplicates`,
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Step 5: Resolve Conflicts & Employee Mappings
 */
export const resolveConflicts = async (req, res, next) => {
  try {
    const { importToken } = req.params;
    const { conflictResolutions = [], employeeResolutions = [] } = req.body;

    if (!importToken) {
      return sendError(res, 'Import token is required', 400);
    }

    const result = await importService.resolveConflicts(importToken, {
      conflictResolutions,
      employeeResolutions
    });

    return sendSuccess(res, result, 'Conflicts and employee mappings updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Step 7: Confirm & Commit Clean Staged Master Data to MongoDB
 */
export const commitImport = async (req, res, next) => {
  try {
    const { importToken, conflictStrategy = 'SKIP_EXISTING' } = req.body;

    if (!importToken) {
      return sendError(res, 'Import token is required for commit', 400);
    }

    const processedBy = req.user?.username || 'admin';

    const result = await importService.commitImport(importToken, {
      conflictStrategy,
      processedBy
    });

    // Audit Logging with MULTI_EXCEL_IMPORT_COMPLETED
    await auditRepository.logEvent({
      action: 'MULTI_EXCEL_IMPORT_COMPLETED',
      entityType: 'IMPORT',
      entityId: importToken,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        importId: importToken,
        importedCount: result.importedCount,
        skippedCount: result.skippedCount,
        errorCount: result.errorCount,
        conflictStrategy
      },
      status: 'SUCCESS'
    });

    // Also log EXCEL_IMPORTED for backward compatibility with existing tests and audit queries
    await auditRepository.logEvent({
      action: 'EXCEL_IMPORTED',
      entityType: 'IMPORT',
      entityId: importToken,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        importedCount: result.importedCount,
        skippedCount: result.skippedCount,
        conflictStrategy
      },
      status: 'SUCCESS'
    });

    return sendSuccess(
      res,
      result,
      `Multi-Excel import completed: ${result.importedCount} clean assets registered successfully`,
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Legacy Phase 1: Upload and Validate Single Spreadsheet (Backward Compatibility)
 */
export const validateImport = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendError(res, 'Please upload an Excel (.xlsx, .xls) or CSV file', 400);
    }

    const result = await importService.validateSpreadsheet(req.file.buffer, req.user);

    return sendSuccess(
      res,
      result,
      `Spreadsheet parsed: ${result.validCount} valid rows, ${result.invalidCount} rows with issues`,
      200
    );
  } catch (error) {
    next(error);
  }
};

export default {
  downloadTemplate,
  analyzeFiles,
  updateMappings,
  reconcileData,
  resolveConflicts,
  commitImport,
  validateImport
};
