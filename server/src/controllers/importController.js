import { importService } from '../services/importService.js';
import { generateSampleTemplate } from '../utils/excelParser.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * Download sample spreadsheet template
 */
export const downloadTemplate = async (req, res, next) => {
  try {
    const buffer = generateSampleTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="AAI_Asset_Import_Template.xlsx"');
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Phase 1: Upload and Validate Spreadsheet
 */
export const validateImport = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendError(res, 'Please upload an Excel (.xlsx, .xls) or CSV file', 400);
    }

    const result = await importService.validateSpreadsheet(req.file.buffer);

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

/**
 * Phase 2: Confirm and Ingest Staged Assets
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

    // Audit Logging
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
      `Bulk import completed: ${result.importedCount} assets registered successfully`,
      200
    );
  } catch (error) {
    next(error);
  }
};
