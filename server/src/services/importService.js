import crypto from 'crypto';
import { parseExcelBuffer } from '../utils/excelParser.js';
import { assetRepository } from '../repositories/assetRepository.js';
import { employeeRepository } from '../repositories/employeeRepository.js';
import { assignmentRepository } from '../repositories/assignmentRepository.js';
import { generateAssetId } from '../utils/idGenerator.js';

// Temporary staging cache for two-phase imports (keyed by importToken)
const stagedImports = new Map();

// Periodic cleanup of expired staging sessions (older than 30 mins)
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [token, data] of stagedImports.entries()) {
    if (data.expiresAt < now) {
      stagedImports.delete(token);
    }
  }
}, 5 * 60 * 1000);
cleanupTimer.unref();

export const importService = {
  /**
   * Phase 1: Parse and Validate Spreadsheet Buffer
   * No data is written to the database. Rows are evaluated and staged.
   */
  validateSpreadsheet: async (buffer) => {
    const rawRows = parseExcelBuffer(buffer);

    const validRows = [];
    const invalidRows = [];
    const seenSerialsInBatch = new Set();

    for (const row of rawRows) {
      const errors = [];

      // 1. Mandatory Core Specifications
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

      // 2. Hardware Serial Number Validation
      const cleanSerial = (row.serialNumber || '').trim().toUpperCase();
      if (!cleanSerial) {
        errors.push('Serial Number is required');
      } else {
        // Check duplicate within uploaded file
        if (seenSerialsInBatch.has(cleanSerial)) {
          errors.push(`Duplicate Serial Number '${cleanSerial}' appears multiple times in uploaded file`);
        } else {
          seenSerialsInBatch.add(cleanSerial);

          // Check duplicate against existing inventory database
          const existingAsset = await assetRepository.findBySerialNumber(cleanSerial);
          if (existingAsset) {
            errors.push(`Serial Number '${cleanSerial}' already exists in database (Asset ID: ${existingAsset.assetId})`);
          }
        }
      }

      // 3. Date Normalization & Validation
      let installDate = row.installDate;
      if (!installDate || isNaN(new Date(installDate).getTime())) {
        // Default to today if missing
        installDate = new Date();
      }

      let warrantyEndDate = row.warrantyEndDate;
      if (!warrantyEndDate || isNaN(new Date(warrantyEndDate).getTime())) {
        // Default to 3 years from install date if omitted
        warrantyEndDate = new Date(new Date(installDate).getTime() + 3 * 365 * 24 * 60 * 60 * 1000);
      }

      // 4. Custodian Validation (If employee specified)
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
          // Employee not found in registry but user name provided in spreadsheet
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
          rowIndex: row._rowIndex,
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

    // Generate staging token
    const importToken = crypto.randomBytes(16).toString('hex');
    stagedImports.set(importToken, {
      validRows,
      expiresAt: Date.now() + 30 * 60 * 1000 // 30 minutes
    });

    return {
      importToken,
      totalRows: rawRows.length,
      validCount: validRows.length,
      invalidCount: invalidRows.length,
      validRows,
      invalidRows
    };
  },

  /**
   * Phase 2: Commit Staged Valid Assets to Database
   */
  commitImport: async (importToken, { conflictStrategy = 'SKIP_EXISTING', processedBy = 'admin' }) => {
    const staged = stagedImports.get(importToken);
    if (!staged) {
      const err = new Error('Invalid or expired import token. Please re-upload and validate the spreadsheet.');
      err.statusCode = 400;
      throw err;
    }

    if (staged.expiresAt < Date.now()) {
      stagedImports.delete(importToken);
      const err = new Error('Import session has expired. Please re-upload the spreadsheet.');
      err.statusCode = 400;
      throw err;
    }

    const { validRows } = staged;
    const importedAssets = [];
    const skippedAssets = [];
    const errors = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];

      try {
        // Final duplicate check
        const existing = await assetRepository.findBySerialNumber(row.serialNumber);
        if (existing) {
          if (conflictStrategy === 'SKIP_EXISTING') {
            skippedAssets.push({ serialNumber: row.serialNumber, reason: 'Already exists in database' });
            continue;
          }
        }

        // Generate asset ID if missing
        const assetId = row.assetId || generateAssetId(row.category, 9000 + i + 1);

        const assetData = {
          assetId,
          assetName: row.assetName,
          category: row.category,
          make: row.make,
          model: row.model,
          serialNumber: row.serialNumber,
          installDate: row.installDate,
          warrantyStartDate: row.installDate,
          warrantyEndDate: row.warrantyEndDate,
          operatingSystem: row.operatingSystem || 'Windows 11 Pro',
          osVersion: row.osVersion || '',
          department: row.department,
          floor: row.floor,
          remarks: row.remarks ? `${row.remarks} [Imported via Bulk Excel]` : 'Imported via Bulk Excel',
          status: row.custodian ? 'ASSIGNED' : 'AVAILABLE',
          condition: 'GOOD',
          currentEmployeeId: row.custodian ? row.custodian.employeeId : null,
          currentEmployeeName: row.custodian ? row.custodian.name : '',
          currentDesignation: row.custodian ? row.custodian.designation : '',
          currentAssignmentDate: row.custodian ? new Date() : null
        };

        const createdAsset = await assetRepository.create(assetData);
        importedAssets.push(createdAsset);

        // If custodian assigned, also generate immutable assignment ledger record
        if (row.custodian) {
          try {
            await assignmentRepository.assignAsset({
              assetId: createdAsset.assetId,
              employeeId: row.custodian.employeeId,
              condition: 'GOOD',
              transferReason: 'Legacy Bulk Data Migration / Ingestion',
              remarks: 'Imported from initial department equipment register',
              assignedBy: processedBy
            });
          } catch (asgErr) {
            // Non-fatal if employee wasn't pre-registered in employee collection
            console.warn(`Initial assignment ledger notice for ${createdAsset.assetId}:`, asgErr.message);
          }
        }
      } catch (rowErr) {
        errors.push({
          serialNumber: row.serialNumber,
          error: rowErr.message
        });
      }
    }

    // Invalidate staging token after commit to prevent re-execution
    stagedImports.delete(importToken);

    return {
      totalStaged: validRows.length,
      importedCount: importedAssets.length,
      skippedCount: skippedAssets.length,
      errorCount: errors.length,
      importedAssets,
      skippedAssets,
      errors
    };
  }
};
