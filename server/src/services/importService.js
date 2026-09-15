import crypto from 'crypto';
import mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import ImportJob from '../models/ImportJob.js';
import {
  inspectWorkbook,
  extractSheetRows,
  parseExcelBuffer,
  generateSampleTemplate,
  isWorkbookEncrypted,
  decryptWorkbookBuffer
} from '../utils/excelParser.js';
import {
  reconcileAndCleanRows,
  normalizeSerialNumber
} from './dataReconciliationService.js';
import { assetRepository } from '../repositories/assetRepository.js';
import { employeeRepository } from '../repositories/employeeRepository.js';
import { assignmentRepository } from '../repositories/assignmentRepository.js';
import { generateAssetId } from '../utils/idGenerator.js';
import { excelFieldService } from './excelFieldService.js';

// In-memory fast fallback cache for tests/offline runs if Mongo is not connected
const stagingCache = new Map();

export const importService = {
  /**
   * Phase 1A: Inspect and Analyze Multiple Workbooks
   * Discovers sheets, detects header rows, proposes canonical mappings with confidence.
   */
  analyzeWorkbooks: async (files = [], user = { username: 'admin', role: 'ADMIN' }, passwords = {}) => {
    if (!files || files.length === 0) {
      throw new Error('Please upload at least one Excel (.xlsx, .xls) or CSV file');
    }

    const importToken = crypto.randomBytes(16).toString('hex');
    const filesSummary = [];
    let totalSheets = 0;
    let totalRawRowsCount = 0;

    let importFields = [];
    try {
      importFields = await excelFieldService.getImportFields();
    } catch (e) {
      importFields = [];
    }

    // We keep the raw buffer objects in memory staging for re-extraction upon confirmed mapping
    const workbookBuffers = [];

    for (let fIndex = 0; fIndex < files.length; fIndex++) {
      const file = files[fIndex];
      const fileName = file.originalname || `Workbook_${fIndex + 1}.xlsx`;
      const isEncrypted = isWorkbookEncrypted(file.buffer);

      let effectiveBuffer = file.buffer;
      let isUnlocked = !isEncrypted;
      let passwordError = null;

      const filePassword = (passwords && (passwords[fileName] || passwords[fIndex] || passwords.default)) || '';
      if (isEncrypted && filePassword) {
        try {
          effectiveBuffer = await decryptWorkbookBuffer(file.buffer, filePassword);
          isUnlocked = true;
        } catch (err) {
          isUnlocked = false;
          passwordError = err.message || 'Incorrect password. Please try again.';
        }
      }

      if (isEncrypted && !isUnlocked) {
        filesSummary.push({
          fileIndex: fIndex,
          fileName,
          fileSize: file.size || file.buffer.length,
          mimeType: file.mimetype || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          isPasswordProtected: true,
          isUnlocked: false,
          status: passwordError ? 'INCORRECT_PASSWORD' : 'PASSWORD_REQUIRED',
          errorMessage: passwordError,
          sheets: []
        });

        workbookBuffers.push({
          fileIndex: fIndex,
          fileName,
          buffer: file.buffer,
          isPasswordProtected: true,
          isUnlocked: false,
          sheetsInspection: null
        });
        continue;
      }

      const inspection = inspectWorkbook(effectiveBuffer, fileName, importFields);

      const sheets = inspection.sheets.map(sh => {
        totalSheets++;
        totalRawRowsCount += sh.dataRowCount;
        return {
          sheetName: sh.sheetName,
          detectedPurpose: sh.detectedPurpose || 'Equipment assets',
          suggestedAssetName: sh.suggestedAssetName || '',
          isEmployeeSheet: Boolean(sh.isEmployeeSheet),
          isComplementarySheet: Boolean(sh.isComplementarySheet),
          defaultUse: sh.defaultUse !== false,
          isSelected: sh.isSelected !== false,
          headerRowIndex: sh.headerRowIndex,
          rawHeaders: sh.rawHeaders,
          mappings: sh.mappings,
          confidence: sh.confidence,
          candidates: sh.candidates,
          totalRows: sh.dataRowCount
        };
      });

      filesSummary.push({
        fileIndex: fIndex,
        fileName,
        fileSize: file.size || file.buffer.length,
        mimeType: file.mimetype || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        isPasswordProtected: isEncrypted,
        isUnlocked: true,
        status: isEncrypted ? 'UNLOCKED' : 'READY',
        sheets
      });

      workbookBuffers.push({
        fileIndex: fIndex,
        fileName,
        buffer: effectiveBuffer,
        isPasswordProtected: isEncrypted,
        isUnlocked: true,
        sheetsInspection: inspection
      });
    }

    const sessionData = {
      importToken,
      uploader: {
        userId: user._id || user.id || null,
        username: user.username || 'admin',
        name: user.name || 'Administrator',
        role: user.role || 'ADMIN'
      },
      status: 'ANALYZED',
      files: filesSummary,
      availableFields: importFields,
      workbookBuffers, // Retained in staging session
      rawRows: [],
      stagedAssets: [],
      conflicts: [],
      unresolvedEmployees: [],
      employeeLookupMap: [],
      metrics: {
        fileCount: files.length,
        sheetCount: totalSheets,
        totalSourceRows: totalRawRowsCount,
        uniqueAssets: 0,
        newAssets: 0,
        duplicatesCount: 0,
        conflictCount: 0,
        invalidRowsCount: 0,
        unresolvedEmployeesCount: 0,
        readyCount: 0,
        employeesFound: 0,
        assetsFound: 0,
        assetsWithEmployee: 0,
        availableCount: 0,
        needsReviewCount: 0
      },
      errors: [],
      expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000)
    };

    stagingCache.set(importToken, sessionData);

    // Also persist in Mongo if available
    if (mongoose.connection.readyState === 1) {
      try {
        await ImportJob.create({
          importToken,
          uploader: sessionData.uploader,
          status: 'ANALYZED',
          files: filesSummary,
          metrics: sessionData.metrics,
          expiresAt: sessionData.expiresAt
        });
      } catch (e) {
        // Memory fallback active
      }
    }

    return {
      importToken,
      files: filesSummary,
      availableFields: importFields,
      metrics: sessionData.metrics
    };
  },

  /**
   * Phase 1B: Update / Confirm Column Mappings & Selected Worksheets
   */
  updateColumnMappings: async (importToken, updatedData = {}) => {
    const session = stagingCache.get(importToken);
    if (!session) {
      throw new Error('Import session expired or invalid. Please re-upload your files.');
    }

    const updatedMappings = updatedData.mappings || updatedData;
    const selectedSheets = updatedData.selectedSheets || null;

    session.files.forEach(file => {
      const fIdx = String(file.fileIndex);
      const fileOverrides = updatedMappings[fIdx] || updatedMappings[file.fileIndex] || {};
      const fileSheetSelection = selectedSheets ? (selectedSheets[fIdx] || selectedSheets[file.fileIndex]) : null;

      file.sheets.forEach(sh => {
        // Update column mappings if provided
        const sheetOverrides = fileOverrides[sh.sheetName] || {};
        Object.keys(sheetOverrides).forEach(colIdx => {
          sh.mappings[colIdx] = sheetOverrides[colIdx];
          sh.confidence[colIdx] = 'HIGH_CONFIDENCE'; // Manually confirmed by Admin
        });

        // Update sheet selection if provided
        if (fileSheetSelection) {
          if (Array.isArray(fileSheetSelection)) {
            sh.isSelected = fileSheetSelection.includes(sh.sheetName);
          } else if (fileSheetSelection[sh.sheetName] !== undefined) {
            const val = fileSheetSelection[sh.sheetName];
            if (typeof val === 'boolean') {
              sh.isSelected = val;
            } else if (typeof val === 'object' && val !== null) {
              if (val.isSelected !== undefined) sh.isSelected = Boolean(val.isSelected);
              if (val.suggestedAssetName) sh.suggestedAssetName = val.suggestedAssetName;
            }
          }
        }
      });
    });

    session.status = 'MAPPED';
    stagingCache.set(importToken, session);

    return { success: true, message: 'Column mappings and worksheet selections updated successfully' };
  },

  /**
   * Unlock a password-protected workbook in memory staging
   */
  unlockWorkbook: async (importToken, { fileIndex, fileName, password }) => {
    let session = stagingCache.get(importToken);
    if (!session && mongoose.connection.readyState === 1) {
      try {
        session = await ImportJob.findOne({ importToken });
      } catch (e) {}
    }

    if (!session) {
      const err = new Error('Import session expired or invalid.');
      err.statusCode = 400;
      throw err;
    }

    const targetIndex = fileIndex !== undefined && fileIndex !== null ? Number(fileIndex) : -1;
    const targetBufferObj = session.workbookBuffers.find(
      b => (targetIndex >= 0 && b.fileIndex === targetIndex) || (fileName && b.fileName === fileName)
    );

    if (!targetBufferObj) {
      const err = new Error(`Workbook not found in current import session.`);
      err.statusCode = 404;
      throw err;
    }

    // Attempt decryption
    const decryptedBuffer = await decryptWorkbookBuffer(targetBufferObj.buffer, password);

    // Update in-memory buffer to decrypted buffer
    targetBufferObj.buffer = decryptedBuffer;
    targetBufferObj.isUnlocked = true;

    // Inspect sheets
    let importFields = session.availableFields || [];
    if (!importFields.length) {
      try {
        importFields = await excelFieldService.getImportFields();
      } catch (e) {}
    }

    const inspection = inspectWorkbook(decryptedBuffer, targetBufferObj.fileName, importFields);
    targetBufferObj.sheetsInspection = inspection;

    const sheets = inspection.sheets.map(sh => ({
      sheetName: sh.sheetName,
      detectedPurpose: sh.detectedPurpose || 'Equipment assets',
      suggestedAssetName: sh.suggestedAssetName || '',
      isEmployeeSheet: Boolean(sh.isEmployeeSheet),
      isComplementarySheet: Boolean(sh.isComplementarySheet),
      defaultUse: sh.defaultUse !== false,
      isSelected: sh.isSelected !== false,
      headerRowIndex: sh.headerRowIndex,
      rawHeaders: sh.rawHeaders,
      mappings: sh.mappings,
      confidence: sh.confidence,
      candidates: sh.candidates,
      totalRows: sh.dataRowCount
    }));

    const targetFile = session.files.find(
      f => (targetIndex >= 0 && f.fileIndex === targetIndex) || (fileName && f.fileName === fileName)
    );

    if (targetFile) {
      targetFile.sheets = sheets;
      targetFile.isUnlocked = true;
      targetFile.status = 'UNLOCKED';
      targetFile.errorMessage = null;
    }

    const totalSheets = session.files.reduce((acc, f) => acc + (f.sheets?.length || 0), 0);
    const totalRawRows = session.files.reduce((acc, f) => acc + (f.sheets?.reduce((sAcc, sh) => sAcc + (sh.totalRows || 0), 0) || 0), 0);
    session.metrics.sheetCount = totalSheets;
    session.metrics.totalSourceRows = totalRawRows;

    const allFilesUnlocked = session.files.every(f => !f.isPasswordProtected || f.isUnlocked);

    stagingCache.set(importToken, session);
    if (mongoose.connection.readyState === 1) {
      try {
        await ImportJob.findOneAndUpdate(
          { importToken },
          {
            files: session.files,
            metrics: session.metrics
          }
        );
      } catch (e) {}
    }

    return {
      success: true,
      message: 'Workbook unlocked',
      file: targetFile,
      allFilesUnlocked,
      metrics: session.metrics,
      importToken
    };
  },

  /**
   * Phase 1C: Reconcile, Clean, Match, Merge Complementary Data, Detect Conflicts
   */
  reconcileAndStage: async (importToken, options = {}) => {
    const commonKey = typeof options === 'string' ? options : (options.commonKey || 'SERIAL');
    const selectedSheets = options.selectedSheets || null;
    const session = stagingCache.get(importToken);
    if (!session) {
      throw new Error('Import session expired or invalid. Please re-upload your files.');
    }

    // Apply any late sheet selections if provided
    if (selectedSheets) {
      session.files.forEach(file => {
        const fIdx = String(file.fileIndex);
        const fileSel = selectedSheets[fIdx] || selectedSheets[file.fileIndex];
        if (fileSel) {
          file.sheets.forEach(sh => {
            if (Array.isArray(fileSel)) {
              sh.isSelected = fileSel.includes(sh.sheetName);
            } else if (fileSel[sh.sheetName] !== undefined) {
              const val = fileSel[sh.sheetName];
              if (typeof val === 'boolean') sh.isSelected = val;
              else if (typeof val === 'object' && val !== null) {
                if (val.isSelected !== undefined) sh.isSelected = Boolean(val.isSelected);
                if (val.suggestedAssetName) sh.suggestedAssetName = val.suggestedAssetName;
              }
            }
          });
        }
      });
    }

    // Extract all rows from all workbooks and sheets using confirmed mappings (skipping ignored sheets)
    const allRawRows = [];

    session.workbookBuffers.forEach(wbItem => {
      if (wbItem.isPasswordProtected && !wbItem.isUnlocked) {
        return; // Skip locked files
      }
      const wb = XLSX.read(wbItem.buffer, { type: 'buffer', cellDates: true });
      const fileMeta = session.files.find(f => f.fileIndex === wbItem.fileIndex);

      if (fileMeta) {
        fileMeta.sheets.forEach(shMeta => {
          // Skip if sheet was ignored by Admin
          if (shMeta.isSelected === false) {
            return;
          }

          const sheet = wb.Sheets[shMeta.sheetName];
          if (!sheet) return;

          const rows = extractSheetRows(sheet, {
            fileName: fileMeta.fileName,
            sheetName: shMeta.sheetName,
            headerRowIndex: shMeta.headerRowIndex,
            mappings: shMeta.mappings,
            suggestedAssetName: shMeta.suggestedAssetName,
            isEmployeeSheet: shMeta.isEmployeeSheet,
            isComplementarySheet: shMeta.isComplementarySheet
          });

          allRawRows.push(...rows);
        });
      }
    });

    session.rawRows = allRawRows;

    // Run reconciliation pipeline with chosen common key
    const reconciliation = await reconcileAndCleanRows(allRawRows, { commonKey });

    session.stagedAssets = reconciliation.stagedAssets;
    session.conflicts = reconciliation.conflicts;
    session.unresolvedEmployees = reconciliation.unresolvedEmployees;
    session.employeeLookupMap = reconciliation.employeeLookupMap || [];
    session.status = 'RECONCILED';

    const activeSheetsCount = session.files.reduce(
      (acc, f) => acc + f.sheets.filter(s => s.isSelected !== false).length,
      0
    );

    const metrics = {
      fileCount: session.files.length,
      sheetCount: activeSheetsCount,
      totalSourceRows: allRawRows.length,
      uniqueAssets: reconciliation.stagedAssets.length,
      newAssets: reconciliation.stagedAssets.length,
      duplicatesCount: reconciliation.duplicatesCount,
      conflictCount: reconciliation.conflicts.length,
      invalidRowsCount: reconciliation.invalidRows.length,
      unresolvedEmployeesCount: reconciliation.unresolvedEmployees.length,
      readyCount: reconciliation.stagedAssets.filter(a => !a.hasConflict).length,
      employeesFound: reconciliation.metrics?.employeesFound || 0,
      assetsFound: reconciliation.metrics?.assetsFound || reconciliation.stagedAssets.length,
      assetsWithEmployee: reconciliation.metrics?.assetsWithEmployee || 0,
      availableCount: reconciliation.metrics?.availableCount || 0,
      needsReviewCount: reconciliation.metrics?.needsReviewCount || reconciliation.conflicts.length
    };

    session.metrics = metrics;
    stagingCache.set(importToken, session);

    // Update Mongo ImportJob
    if (mongoose.connection.readyState === 1) {
      try {
        await ImportJob.findOneAndUpdate(
          { importToken },
          {
            status: 'RECONCILED',
            stagedAssets: session.stagedAssets,
            conflicts: session.conflicts,
            unresolvedEmployees: session.unresolvedEmployees,
            metrics,
            errors: reconciliation.invalidRows
          }
        );
      } catch (e) {
        // Memory fallback
      }
    }

    return {
      importToken,
      metrics,
      stagedAssets: session.stagedAssets,
      conflicts: session.conflicts,
      unresolvedEmployees: session.unresolvedEmployees,
      invalidRows: reconciliation.invalidRows
    };
  },

  /**
   * Phase 1D: Apply Admin Resolutions for Value Conflicts & Unmatched Employees
   */
  resolveConflicts: async (importToken, { conflictResolutions = [], employeeResolutions = [] }) => {
    const session = stagingCache.get(importToken);
    if (!session) {
      throw new Error('Import session expired or invalid.');
    }

    // 1. Process conflict resolutions
    // Item format: { conflictId, choice: 'USE_A' | 'USE_B' | 'MANUAL_VALUE' | 'SKIP_RECORD', manualValue }
    conflictResolutions.forEach(res => {
      const conflict = session.conflicts.find(c => c.conflictId === res.conflictId);
      if (!conflict) return;

      conflict.resolutionChoice = res.choice;

      // Find the staged asset
      const asset = session.stagedAssets.find(a => a.serialNumber === conflict.serialNumber || a.matchKey === conflict.assetIdentifier);
      if (!asset) return;

      if (res.choice === 'USE_A') {
        asset[conflict.field] = conflict.valueA;
        conflict.resolvedValue = conflict.valueA;
        conflict.isResolved = true;
      } else if (res.choice === 'USE_B') {
        asset[conflict.field] = conflict.valueB;
        conflict.resolvedValue = conflict.valueB;
        conflict.isResolved = true;
      } else if (res.choice === 'MANUAL_VALUE') {
        asset[conflict.field] = res.manualValue;
        conflict.resolvedValue = res.manualValue;
        conflict.isResolved = true;
      } else if (res.choice === 'SKIP_RECORD') {
        asset._skip = true;
        conflict.isResolved = true;
      }
    });

    // Check if any remaining unresolved conflicts exist
    session.stagedAssets.forEach(asset => {
      const pendingConflictsForAsset = session.conflicts.filter(
        c => (c.serialNumber === asset.serialNumber || c.assetIdentifier === asset.matchKey) && c.resolutionChoice === 'PENDING'
      );
      asset.hasConflict = pendingConflictsForAsset.length > 0;
    });

    // 2. Process employee resolutions
    // Item format: { employeeKey, choice: 'CREATE_EMPLOYEE' | 'MAP_TO_EXISTING' | 'KEEP_UNASSIGNED', targetEmployeeId }
    employeeResolutions.forEach(empRes => {
      const empItem = session.unresolvedEmployees.find(e => e.employeeKey === empRes.employeeKey);
      if (!empItem) return;

      empItem.resolution = empRes.choice;
      empItem.mappedEmployeeId = empRes.targetEmployeeId || null;

      session.stagedAssets.forEach(asset => {
        if (asset.custodian && (asset.custodian.employeeId === empRes.employeeKey || asset.custodian.name === empRes.employeeKey || asset.employeeId === empRes.employeeKey)) {
          if (empRes.choice === 'KEEP_UNASSIGNED') {
            asset.custodian = null;
            asset.status = 'AVAILABLE';
            asset.currentEmployeeId = null;
            asset.currentEmployeeName = '';
            asset.currentDesignation = '';
          } else if (empRes.choice === 'MAP_TO_EXISTING' && empRes.targetEmployeeId) {
            asset.custodian.employeeId = empRes.targetEmployeeId;
            asset.currentEmployeeId = empRes.targetEmployeeId;
            asset.status = 'ASSIGNED';
          } else if (empRes.choice === 'CREATE_EMPLOYEE') {
            asset.status = 'ASSIGNED';
            asset._createEmployee = true;
          }
        }
      });
    });

    // Update metrics
    const activeAssets = session.stagedAssets.filter(a => !a._skip);
    session.metrics.readyCount = activeAssets.filter(a => !a.hasConflict).length;
    session.metrics.conflictCount = session.conflicts.filter(c => c.resolutionChoice === 'PENDING').length;
    session.metrics.needsReviewCount = session.metrics.conflictCount;

    stagingCache.set(importToken, session);

    return {
      success: true,
      metrics: session.metrics,
      stagedAssets: session.stagedAssets,
      conflicts: session.conflicts,
      unresolvedEmployees: session.unresolvedEmployees
    };
  },

  /**
   * Phase 2: Commit Clean Staged Assets to MongoDB
   */
  commitImport: async (importToken, { conflictStrategy = 'SKIP_EXISTING', processedBy = 'admin' } = {}) => {
    let session = stagingCache.get(importToken);
    if (!session && mongoose.connection.readyState === 1) {
      try {
        session = await ImportJob.findOne({ importToken });
      } catch (e) {}
    }

    if (!session || session.status === 'COMMITTED') {
      const err = new Error('Invalid or expired import token. Please re-upload and validate the spreadsheet.');
      err.statusCode = 400;
      throw err;
    }

    const assetsToCommit = (session.stagedAssets || []).filter(a => !a._skip && !a.hasConflict);

    if (assetsToCommit.length === 0) {
      const err = new Error('No valid, conflict-free assets available to commit.');
      err.statusCode = 400;
      throw err;
    }

    // Persist all recognized employees (e.g. from USER DETAIL and custodian rows) without duplicating
    if (session.employeeLookupMap && Array.isArray(session.employeeLookupMap)) {
      for (const emp of session.employeeLookupMap) {
        if (emp.employeeId && emp.employeeId !== 'N/A' && emp.employeeId !== 'NONE') {
          try {
            const existingEmp = await employeeRepository.findByEmployeeId(emp.employeeId);
            if (!existingEmp) {
              await employeeRepository.create({
                employeeId: emp.employeeId,
                name: emp.name || 'AAI Staff Member',
                designation: emp.designation || 'Staff',
                department: emp.department || 'General',
                floor: emp.floor || 'Ground Floor'
              });
            }
          } catch (e) {
            // Ignore duplicate or non-blocking
          }
        }
      }
    }

    const importedAssets = [];
    const skippedAssets = [];
    const errors = [];

    for (let i = 0; i < assetsToCommit.length; i++) {
      const row = assetsToCommit[i];

      try {
        const cleanSerial = normalizeSerialNumber(row.serialNumber);
        const existing = await assetRepository.findBySerialNumber(cleanSerial);

        if (existing) {
          if (conflictStrategy === 'SKIP_EXISTING') {
            skippedAssets.push({ serialNumber: cleanSerial, reason: 'Already exists in database' });
            continue;
          } else {
            existing.customFields = { ...(existing.customFields || {}), ...(row.customFields || {}) };
            if (row.custodian && !existing.currentEmployeeId) {
              existing.currentEmployeeId = row.custodian.employeeId;
              existing.currentEmployeeName = row.custodian.name;
              existing.currentDesignation = row.custodian.designation || '';
              existing.status = 'ASSIGNED';
            }
            if (typeof existing.save === 'function') {
              await existing.save();
            }
            importedAssets.push(existing);
            continue;
          }
        }

        // Ensure custodian employee record exists in Employee repository
        if (row.custodian && row.custodian.employeeId) {
          try {
            const existingEmp = await employeeRepository.findByEmployeeId(row.custodian.employeeId);
            if (!existingEmp) {
              await employeeRepository.create({
                employeeId: row.custodian.employeeId,
                name: row.custodian.name || row.currentEmployeeName || 'Staff Member',
                designation: row.custodian.designation || row.currentDesignation || 'Staff',
                department: row.department || 'General',
                floor: row.floor || 'Ground Floor'
              });
            }
          } catch (e) {
            // Non-blocking
          }
        }

        const assetId = row.assetId || generateAssetId(row.category, 9000 + i + 1);

        const assetData = {
          assetId,
          assetName: row.assetName,
          category: row.category,
          make: row.make,
          model: row.model,
          serialNumber: cleanSerial,
          installDate: row.installDate,
          warrantyStartDate: row.installDate,
          warrantyEndDate: row.warrantyEndDate,
          operatingSystem: row.operatingSystem || 'Windows 11 Pro',
          osVersion: row.osVersion || '',
          department: row.department,
          floor: row.floor,
          remarks: row.remarks ? `${row.remarks} [Multi-Excel Ingested]` : 'Ingested via Clean Master Data Pipeline',
          status: 'AVAILABLE',
          condition: 'GOOD',
          currentEmployeeId: null,
          currentEmployeeName: '',
          currentDesignation: '',
          currentAssignmentDate: null,
          customFields: row.customFields || {}
        };

        const createdAsset = await assetRepository.create(assetData);
        importedAssets.push(createdAsset);

        // If custodian assigned, create immutable assignment ledger record
        if (row.custodian) {
          try {
            await assignmentRepository.assignAsset({
              assetId: createdAsset.assetId,
              employeeId: row.custodian.employeeId,
              condition: 'GOOD',
              transferReason: 'Multi-Excel Ingestion Migration',
              remarks: 'Ingested from department registers',
              assignedBy: processedBy
            });
          } catch (asgErr) {
            console.warn(`Assignment notice for ${createdAsset.assetId}:`, asgErr.message);
          }
        }
      } catch (rowErr) {
        errors.push({
          serialNumber: row.serialNumber,
          error: rowErr.message
        });
      }
    }

    stagingCache.delete(importToken);

    if (mongoose.connection.readyState === 1) {
      try {
        await ImportJob.findOneAndUpdate(
          { importToken },
          {
            status: 'COMMITTED',
            commitSummary: {
              importedCount: importedAssets.length,
              skippedCount: skippedAssets.length,
              errorCount: errors.length,
              conflictStrategy
            }
          }
        );
      } catch (e) {}
    }

    return {
      importToken,
      totalStaged: assetsToCommit.length,
      importedCount: importedAssets.length,
      skippedCount: skippedAssets.length,
      errorCount: errors.length,
      importedAssets,
      skippedAssets,
      errors
    };
  },

  /**
   * Backward-compatible: Phase 1 Single File Validate
   */
  validateSpreadsheet: async (buffer, user = { username: 'admin', role: 'ADMIN' }) => {
    const rawRows = parseExcelBuffer(buffer);

    const validRows = [];
    const invalidRows = [];
    const seenSerialsInBatch = new Set();

    for (const row of rawRows) {
      const errors = [];

      if (!row.assetName || row.assetName.length < 2) {
        errors.push('Asset Name is required (minimum 2 characters)');
      }
      if (!row.make) {
        errors.push('Make / Company is required');
      }
      if (!row.model) {
        errors.push('Model is required');
      }
      if (!row.department) {
        errors.push('Department is required');
      }
      if (!row.floor) {
        errors.push('Floor / Location is required');
      }

      const cleanSerial = normalizeSerialNumber(row.serialNumber);
      if (!cleanSerial) {
        errors.push('Serial Number is required');
      } else {
        if (seenSerialsInBatch.has(cleanSerial)) {
          errors.push(`Duplicate Serial Number '${cleanSerial}' appears multiple times in uploaded file`);
        } else {
          seenSerialsInBatch.add(cleanSerial);
          const existingAsset = await assetRepository.findBySerialNumber(cleanSerial);
          if (existingAsset) {
            errors.push(`Serial Number '${cleanSerial}' already exists in database (Asset ID: ${existingAsset.assetId})`);
          }
        }
      }

      let installDate = row.installDate;
      if (!installDate || isNaN(new Date(installDate).getTime())) {
        installDate = new Date();
      }

      let warrantyEndDate = row.warrantyEndDate;
      if (!warrantyEndDate || isNaN(new Date(warrantyEndDate).getTime())) {
        warrantyEndDate = new Date(new Date(installDate).getTime() + 3 * 365 * 24 * 60 * 60 * 1000);
      }

      let custodian = null;
      if (row.employeeId) {
        const emp = await employeeRepository.findByEmployeeId(row.employeeId);
        if (emp) {
          custodian = {
            employeeId: emp.employeeId,
            name: emp.name,
            designation: emp.designation,
            department: emp.department || row.department,
            floor: emp.floor || row.floor
          };
        } else if (row.userName) {
          custodian = {
            employeeId: row.employeeId.trim().toUpperCase(),
            name: row.userName.trim(),
            designation: row.designation || '',
            department: row.department,
            floor: row.floor
          };
        }
      } else if (row.userName) {
        custodian = {
          employeeId: `AAI-LEG-${Math.floor(1000 + Math.random() * 9000)}`,
          name: row.userName.trim(),
          designation: row.designation || '',
          department: row.department,
          floor: row.floor
        };
      }

      if (errors.length > 0) {
        invalidRows.push({
          rowIndex: row._source?.sourceRowNumber || validRows.length + invalidRows.length + 1,
          data: row,
          errors
        });
      } else {
        validRows.push({
          ...row,
          serialNumber: cleanSerial,
          installDate,
          warrantyEndDate,
          custodian,
          status: custodian ? 'ASSIGNED' : 'AVAILABLE'
        });
      }
    }

    const importToken = crypto.randomBytes(16).toString('hex');
    stagingCache.set(importToken, {
      importToken,
      status: 'RECONCILED',
      stagedAssets: validRows,
      conflicts: [],
      unresolvedEmployees: [],
      files: [{ fileIndex: 0, fileName: 'single_upload.xlsx', sheets: [] }],
      metrics: {
        fileCount: 1,
        sheetCount: 1,
        totalSourceRows: rawRows.length,
        uniqueAssets: validRows.length,
        readyCount: validRows.length
      },
      expiresAt: Date.now() + 30 * 60 * 1000
    });

    return {
      importToken,
      totalRows: rawRows.length,
      validCount: validRows.length,
      invalidCount: invalidRows.length,
      validRows,
      invalidRows
    };
  }
};

export default importService;
