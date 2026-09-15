import { employeeRepository } from '../repositories/employeeRepository.js';
import { assetRepository } from '../repositories/assetRepository.js';
import { deduceCategory } from '../utils/excelParser.js';

/**
 * Normalize Operating System strings into canonical display representations
 */
export const normalizeOperatingSystem = (rawOs = '', rawVersion = '') => {
  let combined = `${rawOs || ''} ${rawVersion || ''}`.trim();
  if (!combined) {
    return { operatingSystem: '', osVersion: '' };
  }
  if (combined.toLowerCase() === 'n/a' || combined.toLowerCase() === 'none') {
    return { operatingSystem: 'N/A', osVersion: '' };
  }

  const upper = combined.toUpperCase();

  // Windows 11 variations
  if (upper.includes('WIN 11') || upper.includes('WINDOWS 11')) {
    if (upper.includes('ENT') || upper.includes('ENTERPRISE')) {
      return { operatingSystem: 'Windows 11 Enterprise', osVersion: rawVersion || '23H2' };
    }
    if (upper.includes('HOME')) {
      return { operatingSystem: 'Windows 11 Home', osVersion: rawVersion || '' };
    }
    return { operatingSystem: 'Windows 11 Pro', osVersion: rawVersion || '23H2' };
  }

  // Windows 10 variations
  if (upper.includes('WIN 10') || upper.includes('WINDOWS 10')) {
    if (upper.includes('ENT') || upper.includes('ENTERPRISE')) {
      return { operatingSystem: 'Windows 10 Enterprise', osVersion: rawVersion || '22H2' };
    }
    if (upper.includes('HOME')) {
      return { operatingSystem: 'Windows 10 Home', osVersion: rawVersion || '' };
    }
    return { operatingSystem: 'Windows 10 Pro', osVersion: rawVersion || '22H2' };
  }

  // Linux variations
  if (upper.includes('UBUNTU')) {
    const verMatch = combined.match(/\d+(\.\d+)*/);
    return { operatingSystem: 'Ubuntu Linux', osVersion: verMatch ? verMatch[0] : (rawVersion || '22.04 LTS') };
  }
  if (upper.includes('RHEL') || upper.includes('RED HAT')) {
    return { operatingSystem: 'Red Hat Enterprise Linux', osVersion: rawVersion || '9.0' };
  }
  if (upper.includes('LINUX')) {
    return { operatingSystem: 'Linux (Generic)', osVersion: rawVersion || '' };
  }

  // macOS
  if (upper.includes('MAC') || upper.includes('OSX') || upper.includes('MACOS')) {
    return { operatingSystem: 'macOS', osVersion: rawVersion || '' };
  }

  return {
    operatingSystem: (rawOs || '').trim(),
    osVersion: (rawVersion || '').trim()
  };
};

/**
 * Normalize hardware Make/Brand
 */
export const normalizeMake = (make = '') => {
  const clean = String(make || '').trim();
  if (!clean) return '';
  const lower = clean.toLowerCase();
  if (lower === 'dell') return 'Dell';
  if (lower === 'hp' || lower === 'hewlett-packard') return 'HP';
  if (lower === 'lenovo') return 'Lenovo';
  if (lower === 'apple') return 'Apple';
  if (lower === 'acer') return 'Acer';
  if (lower === 'asus') return 'Asus';
  if (lower === 'cisco') return 'Cisco';
  if (lower === 'apc') return 'APC';
  if (lower === 'canon') return 'Canon';
  if (lower === 'epson') return 'Epson';
  if (lower === 'samsung') return 'Samsung';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};

/**
 * Standardize Serial Number without removing meaningful hyphens, slashes, or symbols
 */
export const normalizeSerialNumber = (sn = '') => {
  if (!sn) return '';
  return String(sn).trim().toUpperCase();
};

/**
 * Standardize Employee ID
 */
export const normalizeEmployeeId = (empId = '') => {
  if (!empId) return '';
  return String(empId).trim().toUpperCase();
};

/**
 * Compute primary matching key for an asset row
 */
export const getRecordMatchingKey = (row, commonKey = 'SERIAL') => {
  const cleanSerial = normalizeSerialNumber(row.serialNumber);
  const cleanAssetId = (row.assetId || '').trim().toUpperCase();
  const empId = normalizeEmployeeId(row.employeeId);
  const assetName = (row.assetName || '').trim().toUpperCase();
  const make = normalizeMake(row.make);
  const model = (row.model || '').trim().toUpperCase();

  // 1. If Serial Number is available and valid, it is the primary unique hardware key
  if (cleanSerial && cleanSerial !== 'N/A' && cleanSerial !== 'NONE') {
    return `SERIAL:${cleanSerial}`;
  }

  // 2. If Asset ID is available
  if (cleanAssetId) {
    return `ASSET_ID:${cleanAssetId}`;
  }

  // 3. If connecting by Employee ID, distinguish assets by equipment type for that employee
  if (empId && assetName) {
    // If complementary network sheet (e.g. IP & MAC) for an employee's computer
    if (row._sheetMeta?.isComplementarySheet) {
      return `EMP_ASSET:${empId}:CPU`;
    }
    return `EMP_ASSET:${empId}:${assetName}`;
  }

  if (empId && make && model) {
    return `EMP_MAKE_MODEL:${empId}:${make}:${model}`;
  }

  if (empId) {
    return `EMPLOYEE_ID:${empId}:${row._source?.sheetName || 'ASSET'}`;
  }

  // Fallback to row specific location
  return `ROW_SOURCE:${row._source?.fileName}:${row._source?.sheetName}:${row._source?.sourceRowNumber}`;
};

/**
 * Check if two values are meaningfully different (conflict)
 */
export const areValuesConflicting = (valA, valB, field) => {
  if (valA === undefined || valA === null || valA === '' || String(valA).trim().toUpperCase() === 'N/A') return false;
  if (valB === undefined || valB === null || valB === '' || String(valB).trim().toUpperCase() === 'N/A') return false;

  if (field === 'installDate' || field === 'warrantyEndDate') {
    const timeA = valA instanceof Date ? valA.getTime() : new Date(valA).getTime();
    const timeB = valB instanceof Date ? valB.getTime() : new Date(valB).getTime();
    if (isNaN(timeA) || isNaN(timeB)) return false;
    // Difference greater than 24 hours
    return Math.abs(timeA - timeB) > 86400000;
  }

  const strA = String(valA).trim().toLowerCase();
  const strB = String(valB).trim().toLowerCase();

  return strA !== strB;
};

/**
 * Reconcile, clean, deduplicate, merge complementary data, and detect conflicts
 * across all raw rows extracted from all files and sheets.
 */
export const reconcileAndCleanRows = async (rawRows = [], options = {}) => {
  const commonKey = typeof options === 'string' ? options : (options.commonKey || 'SERIAL');
  const mergedRecordsMap = new Map();
  const conflictsList = [];
  let duplicatesCount = 0;
  const invalidRows = [];

  // Pass 0: Build reference lookup for staff details across files (e.g. USER DETAIL, Employee_Master.xlsx)
  const employeeLookupMap = new Map();
  for (const r of rawRows) {
    const isEmpSource = Boolean(r._sheetMeta?.isEmployeeSheet) ||
      (r._sheetMeta?.sheetName && /user|staff|employee/i.test(r._sheetMeta.sheetName) && !r.serialNumber) ||
      ((!r.serialNumber || r.serialNumber === 'N/A') && !r.model && !r.make);

    if (isEmpSource) {
      const empId = normalizeEmployeeId(r.employeeId);
      if (empId && empId !== 'N/A' && empId !== 'NONE') {
        const existing = employeeLookupMap.get(empId) || {};
        employeeLookupMap.set(empId, {
          employeeId: empId,
          name: (r.userName || existing.name || '').trim(),
          designation: (r.designation || existing.designation || '').trim(),
          department: (r.department || existing.department || '').trim(),
          floor: (r.floor || existing.floor || '').trim()
        });
      }
    }
  }

  // Group and merge rows by matching key
  for (const row of rawRows) {
    // 1. Initial row cleaning
    const normalizedSerial = normalizeSerialNumber(row.serialNumber);
    const normalizedEmpId = normalizeEmployeeId(row.employeeId);
    const normalizedMakeVal = normalizeMake(row.make);
    const osNorm = normalizeOperatingSystem(row.operatingSystem, row.osVersion);

    // If row is a pure employee/staff record (e.g. from USER DETAIL sheet) with no hardware specs, skip creating a separate asset
    const isPureEmployeeRow = Boolean(row._sheetMeta?.isEmployeeSheet) ||
      ((!normalizedSerial || normalizedSerial === 'N/A') &&
       !row.assetName &&
       !row.model &&
       !row.make);

    if (isPureEmployeeRow) {
      continue;
    }

    // Combine any supporting specs (Processor, RAM, Storage, IP, MAC, etc.) into remarks
    let remarksText = (row.remarks || '').trim();
    if (row.supportingDetails && Array.isArray(row.supportingDetails) && row.supportingDetails.length > 0) {
      const specsStr = row.supportingDetails.join('; ');
      if (remarksText) {
        if (!remarksText.includes(specsStr)) {
          remarksText = `${remarksText} [${specsStr}]`;
        }
      } else {
        remarksText = specsStr;
      }
    }

    let resolvedDept = (row.department || '').trim();
    let resolvedFloor = (row.floor || '').trim();
    let resolvedUserName = (row.userName || '').trim();
    let resolvedDesignation = (row.designation || '').trim();

    // Enrich from Employee Master if employeeId is provided
    if (normalizedEmpId && employeeLookupMap.has(normalizedEmpId)) {
      const empInfo = employeeLookupMap.get(normalizedEmpId);
      if (!resolvedUserName && empInfo.name) resolvedUserName = empInfo.name;
      if (!resolvedDesignation && empInfo.designation) resolvedDesignation = empInfo.designation;
      if (!resolvedDept && empInfo.department) resolvedDept = empInfo.department;
      if (!resolvedFloor && empInfo.floor) resolvedFloor = empInfo.floor;
    }

    // Default assetName from suggestedAssetName if missing
    let finalAssetName = (row.assetName || '').trim();
    if (!finalAssetName && row._sheetMeta?.suggestedAssetName) {
      finalAssetName = row._sheetMeta.suggestedAssetName;
    }

    const cleanedRow = {
      ...row,
      serialNumber: normalizedSerial,
      employeeId: normalizedEmpId,
      make: normalizedMakeVal,
      operatingSystem: osNorm.operatingSystem,
      osVersion: osNorm.osVersion,
      assetName: finalAssetName,
      model: (row.model || '').trim(),
      department: resolvedDept,
      floor: resolvedFloor,
      userName: resolvedUserName,
      designation: resolvedDesignation,
      remarks: remarksText,
      category: (row.category || '').trim(),
      assetId: (row.assetId || '').trim().toUpperCase(),
      customFields: { ...(row.customFields || {}) }
    };

    const matchKey = getRecordMatchingKey(cleanedRow, commonKey);

    if (!mergedRecordsMap.has(matchKey)) {
      // First time seeing this asset
      mergedRecordsMap.set(matchKey, {
        matchKey,
        data: { ...cleanedRow },
        fieldProvenance: {
          assetName: cleanedRow._source,
          make: cleanedRow._source,
          model: cleanedRow._source,
          serialNumber: cleanedRow._source,
          installDate: cleanedRow._source,
          warrantyEndDate: cleanedRow._source,
          operatingSystem: cleanedRow._source,
          osVersion: cleanedRow._source,
          department: cleanedRow._source,
          floor: cleanedRow._source,
          employeeId: cleanedRow._source,
          userName: cleanedRow._source,
          designation: cleanedRow._source,
          remarks: cleanedRow._source
        },
        sources: [cleanedRow._source],
        mergeType: 'ORIGINAL', // 'ORIGINAL' | 'COMPLEMENTARY_MERGED'
        hasConflict: false
      });
    } else {
      // Asset seen before! Merge complementary fields or detect conflicts
      const existing = mergedRecordsMap.get(matchKey);
      existing.sources.push(cleanedRow._source);

      let isDuplicate = true;
      let hasNewData = false;

      const fieldsToCheck = [
        'assetName', 'make', 'model', 'department', 'floor',
        'installDate', 'warrantyEndDate', 'operatingSystem', 'osVersion',
        'employeeId', 'userName', 'designation', 'remarks', 'category', 'assetId'
      ];

      for (const field of fieldsToCheck) {
        const existingVal = existing.data[field];
        const incomingVal = cleanedRow[field];

        if (incomingVal !== undefined && incomingVal !== null && incomingVal !== '') {
          const isExistingEmpty = existingVal === undefined || existingVal === null || existingVal === '' || String(existingVal).trim().toUpperCase() === 'N/A';
          const isIncomingReal = String(incomingVal).trim().toUpperCase() !== 'N/A';

          if (isExistingEmpty && isIncomingReal) {
            // Complementary data: populate missing or N/A field
            existing.data[field] = incomingVal;
            existing.fieldProvenance[field] = cleanedRow._source;
            existing.mergeType = 'COMPLEMENTARY_MERGED';
            hasNewData = true;
            isDuplicate = false;
          } else if (existingVal === undefined || existingVal === null || existingVal === '') {
            existing.data[field] = incomingVal;
            existing.fieldProvenance[field] = cleanedRow._source;
            hasNewData = true;
          } else if (areValuesConflicting(existingVal, incomingVal, field)) {
            // Conflict detected!
            isDuplicate = false;
            existing.hasConflict = true;

            const conflictId = `CONF-${matchKey}-${field}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            conflictsList.push({
              conflictId,
              serialNumber: cleanedRow.serialNumber || existing.data.serialNumber,
              assetIdentifier: matchKey,
              field,
              valueA: existingVal,
              sourceA: existing.fieldProvenance[field] || existing.sources[0],
              valueB: incomingVal,
              sourceB: cleanedRow._source,
              resolvedValue: null,
              resolutionChoice: 'PENDING',
              isResolved: false
            });
          }
        }
      }

      // Merge complementary customFields
      existing.data.customFields = existing.data.customFields || {};
      const incomingCustom = cleanedRow.customFields || {};
      for (const [cfKey, cfVal] of Object.entries(incomingCustom)) {
        if (cfVal !== undefined && cfVal !== null && String(cfVal).trim() !== '') {
          if (!existing.data.customFields[cfKey]) {
            existing.data.customFields[cfKey] = cfVal;
            hasNewData = true;
            isDuplicate = false;
            existing.mergeType = 'COMPLEMENTARY_MERGED';
          }
        }
      }

      // Merge complementary supportingDetails into remarks
      if (cleanedRow.supportingDetails && Array.isArray(cleanedRow.supportingDetails) && cleanedRow.supportingDetails.length > 0) {
        const specsStr = cleanedRow.supportingDetails.join('; ');
        if (existing.data.remarks) {
          if (!existing.data.remarks.includes(specsStr)) {
            existing.data.remarks = `${existing.data.remarks}; ${specsStr}`;
            existing.mergeType = 'COMPLEMENTARY_MERGED';
            hasNewData = true;
            isDuplicate = false;
          }
        } else {
          existing.data.remarks = specsStr;
          existing.mergeType = 'COMPLEMENTARY_MERGED';
          hasNewData = true;
          isDuplicate = false;
        }
      }

      if (isDuplicate && !hasNewData) {
        duplicatesCount++;
      }
    }
  }

  // 2. Validate merged records and reconcile employees
  const validatedStagedAssets = [];
  const unresolvedEmployeesMap = new Map();

  for (const [matchKey, record] of mergedRecordsMap.entries()) {
    const item = record.data;
    const errors = [];

    // Deduce category on merged record if missing
    if (!item.category) {
      item.category = deduceCategory(item.assetName, item.make, item.model);
    }

    // Core hardware specifications validation
    if (!item.assetName || item.assetName.length < 2) {
      errors.push('Asset Name is required (minimum 2 characters)');
    }
    if (!item.make) {
      errors.push('Make / Company is required');
    }
    if (!item.model) {
      errors.push('Model is required');
    }
    if (!item.department) {
      item.department = 'General';
    }
    if (!item.floor) {
      item.floor = '1st Floor';
    }

    if (!item.serialNumber) {
      errors.push('Serial Number is required');
    } else {
      // Check if serial already exists in database (for Step 5 skip/update strategy)
      const existingInDb = await assetRepository.findBySerialNumber(item.serialNumber);
      if (existingInDb) {
        item.isExistingInDb = true;
        item.existingAssetId = existingInDb.assetId;
      }
    }

    // Date validation & defaults
    let installDate = item.installDate;
    if (!installDate || isNaN(new Date(installDate).getTime())) {
      installDate = new Date();
    } else {
      installDate = new Date(installDate);
    }

    let warrantyEndDate = item.warrantyEndDate;
    if (!warrantyEndDate || isNaN(new Date(warrantyEndDate).getTime())) {
      warrantyEndDate = new Date(installDate.getTime() + 3 * 365 * 24 * 60 * 60 * 1000);
    } else {
      warrantyEndDate = new Date(warrantyEndDate);
    }

    // Employee reconciliation
    let custodian = null;
    let employeeStatus = 'UNASSIGNED';

    const cleanEmpId = normalizeEmployeeId(item.employeeId);
    const cleanUserName = (item.userName || '').trim();

    const isBlankStaff = (!cleanEmpId || cleanEmpId === 'N/A' || cleanEmpId === 'NONE') &&
      (!cleanUserName || cleanUserName.toUpperCase() === 'N/A' || cleanUserName.toUpperCase() === 'NONE');

    if (isBlankStaff) {
      // Unassigned asset -> must remain AVAILABLE with NO custodian
      custodian = null;
      employeeStatus = 'UNASSIGNED';
      item.employeeId = '';
      item.userName = '';
      item.designation = '';
    } else {
      // Attempt matching against employeeLookupMap (e.g. from USER DETAIL sheet) or DB
      let matchedEmp = null;
      if (cleanEmpId && employeeLookupMap.has(cleanEmpId)) {
        matchedEmp = employeeLookupMap.get(cleanEmpId);
      } else if (cleanEmpId) {
        matchedEmp = await employeeRepository.findByEmployeeId(cleanEmpId);
      }
      if (!matchedEmp && cleanUserName) {
        matchedEmp = await employeeRepository.findByName(cleanUserName);
      }

      if (matchedEmp) {
        custodian = {
          employeeId: matchedEmp.employeeId || cleanEmpId,
          name: matchedEmp.name || cleanUserName,
          designation: matchedEmp.designation || item.designation || '',
          department: matchedEmp.department || item.department || 'General',
          floor: matchedEmp.floor || item.floor || 'Ground Floor'
        };
        employeeStatus = 'MATCHED';
        item.employeeId = custodian.employeeId;
        item.userName = custodian.name;
        item.designation = custodian.designation;
        item.department = custodian.department;
        item.floor = custodian.floor;
      } else {
        // Staff mentioned in Excel but not in Employee collection
        const empKey = cleanEmpId || cleanUserName;
        if (!unresolvedEmployeesMap.has(empKey)) {
          unresolvedEmployeesMap.set(empKey, {
            employeeKey: empKey,
            employeeId: cleanEmpId || '',
            userName: cleanUserName || '',
            designation: item.designation || '',
            department: item.department || 'General',
            floor: item.floor || 'Ground Floor',
            source: record.sources[0],
            resolution: 'PENDING',
            mappedEmployeeId: null
          });
        }

        custodian = {
          employeeId: cleanEmpId || `EMP-${Date.now().toString().slice(-4)}`,
          name: cleanUserName || cleanEmpId,
          designation: item.designation || '',
          department: item.department || 'General',
          floor: item.floor || 'Ground Floor'
        };
        employeeStatus = 'UNRESOLVED';
        item.employeeId = custodian.employeeId;
        item.userName = custodian.name;
      }
    }

    const finalStatus = custodian ? 'ASSIGNED' : 'AVAILABLE';

    if (errors.length > 0) {
      invalidRows.push({
        matchKey,
        data: item,
        sources: record.sources,
        errors
      });
    } else {
      validatedStagedAssets.push({
        matchKey,
        ...item,
        installDate,
        warrantyEndDate,
        custodian,
        status: finalStatus,
        sources: record.sources,
        mergeType: record.mergeType,
        hasConflict: record.hasConflict,
        employeeStatus
      });
    }
  }

  const uniqueEmployeeIds = new Set(Array.from(employeeLookupMap.keys()));
  for (const a of validatedStagedAssets) {
    if (a.custodian?.employeeId && a.custodian.employeeId !== 'N/A') {
      uniqueEmployeeIds.add(a.custodian.employeeId);
    }
  }
  const employeesFound = uniqueEmployeeIds.size;
  const assetsFound = validatedStagedAssets.length;
  const assetsWithEmployee = validatedStagedAssets.filter(a => a.status === 'ASSIGNED').length;
  const availableCount = validatedStagedAssets.filter(a => a.status === 'AVAILABLE').length;
  const needsReviewCount = conflictsList.filter(c => c.resolutionChoice === 'PENDING').length;

  return {
    stagedAssets: validatedStagedAssets,
    conflicts: conflictsList,
    unresolvedEmployees: Array.from(unresolvedEmployeesMap.values()),
    employeeLookupMap: Array.from(employeeLookupMap.values()),
    duplicatesCount,
    invalidRows,
    metrics: {
      employeesFound,
      assetsFound,
      assetsWithEmployee,
      availableCount,
      needsReviewCount,
      uniqueAssets: assetsFound,
      conflictCount: needsReviewCount
    }
  };
};

export default {
  normalizeOperatingSystem,
  normalizeMake,
  normalizeSerialNumber,
  normalizeEmployeeId,
  getRecordMatchingKey,
  areValuesConflicting,
  reconcileAndCleanRows
};
