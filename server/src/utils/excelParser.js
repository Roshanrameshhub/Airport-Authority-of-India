import * as XLSX from 'xlsx';
import officecrypto from 'officecrypto-tool';
import XlsxPopulate from 'xlsx-populate';
import { CANONICAL_FIELDS, cleanHeaderText, matchHeader } from '../services/columnMappingService.js';

/**
 * Deduce equipment category if not explicitly specified
 */
export const deduceCategory = (name = '', make = '', model = '') => {
  const combined = `${name} ${make} ${model}`.toLowerCase();
  if (combined.includes('laptop') || combined.includes('thinkpad') || combined.includes('latitude') || combined.includes('elitebook') || combined.includes('macbook')) {
    return 'Laptop';
  }
  if (combined.includes('printer') || combined.includes('laserjet') || combined.includes('inkjet') || combined.includes('mfp')) {
    return 'Printer';
  }
  if (combined.includes('monitor') || combined.includes('ultrasharp') || combined.includes('display') || combined.includes('screen')) {
    return 'Monitor';
  }
  if (combined.includes('ups') || combined.includes('apc') || combined.includes('battery') || combined.includes('power')) {
    return 'UPS';
  }
  if (combined.includes('scanner') || combined.includes('scanjet')) {
    return 'Scanner';
  }
  if (combined.includes('server') || combined.includes('switch') || combined.includes('router') || combined.includes('cisco') || combined.includes('firewall')) {
    return 'Server / Network';
  }
  return 'Desktop PC';
};

/**
 * Normalize Excel dates (handles serial numbers, ISO strings, DD/MM/YYYY, DD-MM-YYYY, etc.)
 */
export const normalizeExcelDate = (val) => {
  if (!val && val !== 0) return null;

  if (val instanceof Date && !isNaN(val.getTime())) {
    return val;
  }

  // Handle Excel numeric date serials (e.g. 45123)
  if (typeof val === 'number') {
    // Excel epoch offset
    const dateObj = new Date((val - (25567 + 2)) * 86400 * 1000);
    if (!isNaN(dateObj.getTime())) {
      return dateObj;
    }
  }

  const str = String(val).trim();
  if (!str || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'null') return null;

  // Try direct ISO parse
  let parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && str.includes('-') && str.length >= 10 && !isNaN(Date.parse(str))) {
    // If it is in YYYY-MM-DD or full ISO
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      return parsed;
    }
  }

  // Try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);

    // YYYY/MM/DD
    if (p0 > 1000) {
      parsed = new Date(p0, p1 - 1, p2);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    // DD/MM/YYYY
    const year = p2 > 1000 ? p2 : 2000 + p2;
    parsed = new Date(year, p1 - 1, p0);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
};

/**
 * Detect the probable header row in a 2D array of sheet rows.
 * Instead of assuming row 0 is the header, scans the first 15 rows and scores
 * them against known canonical aliases and keywords.
 */
export const detectHeaderRowIndex = (rawRows = []) => {
  if (!rawRows || rawRows.length === 0) return 0;

  const maxRowsToScan = Math.min(rawRows.length, 15);
  let bestRowIndex = 0;
  let bestScore = -1;

  for (let r = 0; r < maxRowsToScan; r++) {
    const row = rawRows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    let score = 0;
    let validCellCount = 0;

    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (cell === undefined || cell === null || String(cell).trim() === '') continue;
      validCellCount++;

      const match = matchHeader(cell);
      if (match.confidence === 'HIGH_CONFIDENCE') {
        score += 3;
      } else if (match.confidence === 'MEDIUM_CONFIDENCE') {
        score += 2;
      } else if (match.confidence === 'AMBIGUOUS') {
        score += 1;
      }
    }

    // Normalize score considering number of matching header cells
    if (score > bestScore && score >= 2) {
      bestScore = score;
      bestRowIndex = r;
    }
  }

  return bestRowIndex;
};

/**
 * Detect sheet purpose, suggested asset type, employee vs hardware sheet, and default use
 */
export const detectSheetMetadata = (sheetName = '', rawHeaders = [], dataRowCount = 0) => {
  const norm = String(sheetName || '').toUpperCase().replace(/[^A-Z0-9&]/g, ' ').trim().replace(/\s+/g, ' ');

  // Empty sheet check
  if (dataRowCount === 0) {
    return {
      detectedPurpose: 'Empty Worksheet',
      suggestedAssetName: '',
      isEmployeeSheet: false,
      isComplementarySheet: false,
      defaultUse: false
    };
  }

  // 1. Employee sheets (USER DETAIL, etc.) - must NOT have hardware columns
  const headerTexts = rawHeaders.map(h => cleanHeaderText(h));
  const hasHardwareCols = headerTexts.some(h =>
    h.includes('serial') || h.includes('tag') || h.includes('make') || h.includes('model') || h.includes('chassis')
  );

  const isExplicitEmpName = (
    norm.includes('USER DETAIL') ||
    norm.includes('USER DETAILS') ||
    norm === 'USER' ||
    norm === 'USERS' ||
    norm === 'STAFF' ||
    norm === 'STAFF DIRECTORY' ||
    norm === 'EMPLOYEE MASTER' ||
    norm.includes('EMP DETAIL')
  );

  if (isExplicitEmpName && !hasHardwareCols) {
    return {
      detectedPurpose: 'Employee information',
      suggestedAssetName: '',
      isEmployeeSheet: true,
      isComplementarySheet: false,
      defaultUse: true
    };
  }

  // 2. Network / IP & MAC sheets
  if (
    norm.includes('IP & MAC') ||
    norm.includes('IP MAC') ||
    norm.includes('NW PTR IP') ||
    norm === 'IP' ||
    norm.includes('NETWORK')
  ) {
    return {
      detectedPurpose: 'Network & IP details',
      suggestedAssetName: '',
      isEmployeeSheet: false,
      isComplementarySheet: true,
      defaultUse: true
    };
  }

  // 3. Old / Backup / Irrelevant sheets (Default Ignore)
  if (
    norm.includes('OLD') ||
    norm.includes('BACKUP') ||
    norm.includes('DRAFT') ||
    norm.includes('TEMP') ||
    norm.includes('SUMMARY') ||
    norm.includes('INDEX')
  ) {
    return {
      detectedPurpose: 'Legacy / Unknown',
      suggestedAssetName: '',
      isEmployeeSheet: false,
      isComplementarySheet: false,
      defaultUse: false
    };
  }

  // 4. Specific Equipment Sheets with suggested asset types
  if (norm === 'CPU' || norm.includes('DESKTOP') || norm.includes('PC')) {
    return {
      detectedPurpose: 'CPU assets',
      suggestedAssetName: 'CPU',
      isEmployeeSheet: false,
      isComplementarySheet: false,
      defaultUse: true
    };
  }

  if (norm === 'MON' || norm.includes('MONITOR')) {
    return {
      detectedPurpose: 'Monitor assets',
      suggestedAssetName: 'Monitor',
      isEmployeeSheet: false,
      isComplementarySheet: false,
      defaultUse: true
    };
  }

  if (norm === 'KBD' || norm.includes('KEYBOARD')) {
    return {
      detectedPurpose: 'Keyboard assets',
      suggestedAssetName: 'Keyboard',
      isEmployeeSheet: false,
      isComplementarySheet: false,
      defaultUse: true
    };
  }

  if (norm === 'MSE' || norm.includes('MOUSE') || norm.includes('LAP MSE')) {
    return {
      detectedPurpose: 'Mouse assets',
      suggestedAssetName: 'Mouse',
      isEmployeeSheet: false,
      isComplementarySheet: false,
      defaultUse: true
    };
  }

  if (norm === 'UPS' || norm.includes('SWITCH UPS') || norm.includes('POWER')) {
    return {
      detectedPurpose: 'UPS assets',
      suggestedAssetName: 'UPS',
      isEmployeeSheet: false,
      isComplementarySheet: false,
      defaultUse: true
    };
  }

  if (norm.includes('CAMERA') || norm.includes('CCTV') || norm === 'CAM') {
    return {
      detectedPurpose: 'Camera assets',
      suggestedAssetName: 'Camera',
      isEmployeeSheet: false,
      isComplementarySheet: false,
      defaultUse: true
    };
  }

  if (norm === 'PTR' || norm.includes('PRINTER')) {
    return {
      detectedPurpose: 'Printer assets',
      suggestedAssetName: 'Printer',
      isEmployeeSheet: false,
      isComplementarySheet: false,
      defaultUse: true
    };
  }

  if (norm === 'SCR' || norm.includes('SCREEN')) {
    return {
      detectedPurpose: 'Screen assets',
      suggestedAssetName: 'Screen',
      isEmployeeSheet: false,
      isComplementarySheet: false,
      defaultUse: true
    };
  }

  if (norm.includes('LAPTOP') || norm.includes('NOTEBOOK')) {
    return {
      detectedPurpose: 'Laptop assets',
      suggestedAssetName: 'Laptop',
      isEmployeeSheet: false,
      isComplementarySheet: false,
      defaultUse: true
    };
  }

  if (norm.includes('HDD') || norm.includes('HARD DISK') || norm.includes('SSD') || norm.includes('STORAGE')) {
    return {
      detectedPurpose: 'Hard Disk assets',
      suggestedAssetName: 'Hard Disk',
      isEmployeeSheet: false,
      isComplementarySheet: false,
      defaultUse: true
    };
  }

  if (norm.includes('TV & SERVER') || norm.includes('SERVER')) {
    return {
      detectedPurpose: 'Server assets',
      suggestedAssetName: 'Server',
      isEmployeeSheet: false,
      isComplementarySheet: false,
      defaultUse: true
    };
  }

  if (norm.includes('IT ACCESS') || norm.includes('ACCESSORIES') || norm.includes('ACCESSORY')) {
    return {
      detectedPurpose: 'IT Accessories',
      suggestedAssetName: 'IT Accessory',
      isEmployeeSheet: false,
      isComplementarySheet: false,
      defaultUse: true
    };
  }

  // Fallback: inspect raw headers for employee vs hardware clues
  const hasEmpCode = headerTexts.some(h => h.includes('emp') || h.includes('staff') || h.includes('user'));
  const hasSerial = headerTexts.some(h => h.includes('serial') || h.includes('tag') || h.includes('make') || h.includes('model'));

  if (hasEmpCode && !hasSerial) {
    return {
      detectedPurpose: 'Employee information',
      suggestedAssetName: '',
      isEmployeeSheet: true,
      isComplementarySheet: false,
      defaultUse: true
    };
  }

  // 5. Complementary sheets (Specifications, Warranty, Register, etc.)
  if (
    norm.includes('SPEC') ||
    norm.includes('WARRANTY') ||
    norm.includes('REGISTER') ||
    norm.includes('INFO')
  ) {
    return {
      detectedPurpose: `${sheetName} details`,
      suggestedAssetName: '',
      isEmployeeSheet: false,
      isComplementarySheet: true,
      defaultUse: true
    };
  }

  return {
    detectedPurpose: `${sheetName} assets`,
    suggestedAssetName: '',
    isEmployeeSheet: false,
    isComplementarySheet: false,
    defaultUse: true
  };
};

/**
 * Detect if an Excel workbook buffer is encrypted / password-protected
 */
export const isWorkbookEncrypted = (buffer) => {
  if (!buffer || !Buffer.isBuffer(buffer)) return false;
  try {
    return Boolean(officecrypto.isEncrypted(buffer));
  } catch (err) {
    return false;
  }
};

/**
 * Decrypt a password-protected Excel workbook buffer using supplied password.
 * Uses officecrypto-tool with xlsx-populate fallback.
 * Strictly avoids guessing or logging passwords.
 */
export const decryptWorkbookBuffer = async (buffer, password = '') => {
  if (!password || typeof password !== 'string' || !password.trim()) {
    const err = new Error('Password required to open this workbook');
    err.code = 'PASSWORD_REQUIRED';
    throw err;
  }

  // 1. Primary decryptor: officecrypto-tool
  try {
    const decrypted = await officecrypto.decrypt(buffer, { password });
    return decrypted;
  } catch (cryptoErr) {
    const cryptoMsg = (cryptoErr.message || '').toLowerCase();
    if (
      cryptoMsg.includes('password') ||
      cryptoMsg.includes('incorrect') ||
      cryptoMsg.includes('verifier') ||
      cryptoMsg.includes('mac')
    ) {
      const err = new Error('Incorrect password. Please try again.');
      err.code = 'INCORRECT_PASSWORD';
      throw err;
    }

    // 2. Secondary decryptor fallback: xlsx-populate
    try {
      const wb = await XlsxPopulate.fromDataAsync(buffer, { password });
      const decrypted = await wb.outputAsync();
      return decrypted;
    } catch (popErr) {
      const popMsg = (popErr.message || '').toLowerCase();
      if (
        popMsg.includes('password') ||
        popMsg.includes('central directory') ||
        popMsg.includes('corrupt')
      ) {
        const err = new Error('Incorrect password. Please try again.');
        err.code = 'INCORRECT_PASSWORD';
        throw err;
      }

      const err = new Error('Unable to open this workbook. Please check the password and file.');
      err.code = 'DECRYPT_FAILED';
      throw err;
    }
  }
};

/**
 * Inspect a workbook buffer and extract metadata for all sheets:
 * sheet name, detected purpose, suggested asset type, detected header row index,
 * detected raw headers, row count, and initial suggested mappings.
 */
export const inspectWorkbook = (buffer, fileName = 'uploaded_file.xlsx', customFields = []) => {
  if (isWorkbookEncrypted(buffer)) {
    const err = new Error(`Workbook '${fileName}' is password protected.`);
    err.code = 'PASSWORD_REQUIRED';
    throw err;
  }

  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetNames = workbook.SheetNames || [];

  if (sheetNames.length === 0) {
    throw new Error(`Workbook '${fileName}' contains no worksheets`);
  }

  const sheetsMetadata = [];

  sheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;

    // Convert sheet to 2D array of rows
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', header: 1 });
    const totalRows = rawRows.length;

    if (totalRows === 0) {
      const meta = detectSheetMetadata(sheetName, [], 0);
      sheetsMetadata.push({
        sheetName,
        detectedPurpose: meta.detectedPurpose,
        suggestedAssetName: meta.suggestedAssetName,
        isEmployeeSheet: meta.isEmployeeSheet,
        isComplementarySheet: meta.isComplementarySheet,
        defaultUse: meta.defaultUse,
        isSelected: meta.defaultUse,
        headerRowIndex: 0,
        rawHeaders: [],
        rowCount: 0,
        dataRowCount: 0,
        mappings: {},
        confidence: {},
        candidates: {}
      });
      return;
    }

    const headerRowIndex = detectHeaderRowIndex(rawRows);
    const rawHeaderRow = rawRows[headerRowIndex] || [];
    const rawHeaders = rawHeaderRow.map(cell => String(cell || '').trim());
    const dataRowCount = Math.max(0, totalRows - (headerRowIndex + 1));

    const meta = detectSheetMetadata(sheetName, rawHeaders, dataRowCount);

    // Generate initial mappings for this sheet
    const mappings = {};
    const confidence = {};
    const candidates = {};

    rawHeaders.forEach((headerText, colIndex) => {
      if (!headerText) return;
      const match = matchHeader(headerText, customFields);
      if (match.canonicalKey) {
        mappings[colIndex] = match.canonicalKey;
      }
      confidence[colIndex] = match.confidence;
      candidates[colIndex] = match.candidates;
    });

    sheetsMetadata.push({
      sheetName,
      detectedPurpose: meta.detectedPurpose,
      suggestedAssetName: meta.suggestedAssetName,
      isEmployeeSheet: meta.isEmployeeSheet,
      isComplementarySheet: meta.isComplementarySheet,
      defaultUse: meta.defaultUse,
      isSelected: meta.defaultUse,
      headerRowIndex,
      rawHeaders,
      rowCount: totalRows,
      dataRowCount,
      mappings,
      confidence,
      candidates
    });
  });

  return {
    fileName,
    sheetNames,
    sheets: sheetsMetadata
  };
};

/**
 * Parse a worksheet buffer given confirmed column mappings, headerRowIndex, and metadata,
 * extracting rows with complete source provenance.
 */
export const extractSheetRows = (sheet, {
  fileName = 'file.xlsx',
  sheetName = 'Sheet1',
  headerRowIndex = 0,
  mappings = {},
  suggestedAssetName = '',
  isEmployeeSheet = false,
  isComplementarySheet = false
}) => {
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', header: 1 });
  if (rawRows.length <= headerRowIndex + 1) {
    return [];
  }

  const parsedRows = [];

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || !Array.isArray(row)) continue;

    // Skip empty rows
    const hasData = row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '');
    if (!hasData) continue;

    const rowObj = {
      _source: {
        fileName,
        sheetName,
        sourceRowNumber: r + 1 // 1-based matching Excel row number
      },
      _sheetMeta: {
        isEmployeeSheet: Boolean(isEmployeeSheet),
        isComplementarySheet: Boolean(isComplementarySheet),
        suggestedAssetName: suggestedAssetName || ''
      },
      userName: '',
      designation: '',
      department: '',
      floor: '',
      employeeId: '',
      assetName: suggestedAssetName || '',
      make: '',
      model: '',
      serialNumber: '',
      installDate: null,
      warrantyEndDate: null,
      operatingSystem: '',
      osVersion: '',
      remarks: '',
      category: '',
      assetId: '',
      supportingDetails: [],
      customFields: {}
    };

    // Populate fields according to confirmed mappings
    row.forEach((cellValue, colIndex) => {
      const canonicalKey = mappings[colIndex] || mappings[String(colIndex)];
      if (!canonicalKey) return;

      if (canonicalKey === 'supportingInfo') {
        const valStr = String(cellValue !== undefined && cellValue !== null ? cellValue : '').trim();
        if (valStr) {
          const headerName = rawRows[headerRowIndex]?.[colIndex] || 'Info';
          rowObj.supportingDetails.push(`${headerName}: ${valStr}`);
        }
      } else if (rowObj.hasOwnProperty(canonicalKey) && canonicalKey !== 'customFields' && canonicalKey !== '_source' && canonicalKey !== '_sheetMeta' && canonicalKey !== 'supportingDetails') {
        if (canonicalKey === 'installDate' || canonicalKey === 'warrantyEndDate') {
          rowObj[canonicalKey] = normalizeExcelDate(cellValue);
        } else {
          const valStr = String(cellValue !== undefined && cellValue !== null ? cellValue : '').trim();
          rowObj[canonicalKey] = valStr;
        }
      } else {
        // Custom configurable field
        const valStr = String(cellValue !== undefined && cellValue !== null ? cellValue : '').trim();
        if (valStr !== '') {
          rowObj.customFields[canonicalKey] = valStr;
        }
      }
    });

    // If row did not have explicit assetName column value, preserve suggestedAssetName
    if (!rowObj.assetName && suggestedAssetName) {
      rowObj.assetName = suggestedAssetName;
    }

    // Deduce category if missing and hardware info is present
    if (!rowObj.category && (rowObj.assetName || rowObj.make || rowObj.model)) {
      rowObj.category = deduceCategory(rowObj.assetName, rowObj.make, rowObj.model);
    }

    parsedRows.push(rowObj);
  }

  return parsedRows;
};

/**
 * Backward-compatible: Parse a single Excel Buffer into structured array of row objects
 * using automatic header detection and canonical aliases.
 */
export const parseExcelBuffer = (buffer, fileName = 'uploaded_spreadsheet.xlsx') => {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Excel workbook contains no sheets');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', header: 1 });

  if (rawRows.length < 2) {
    throw new Error('Spreadsheet must contain a header row and at least one data row');
  }

  const headerRowIndex = detectHeaderRowIndex(rawRows);
  const headerRow = rawRows[headerRowIndex];

  const mappings = {};
  headerRow.forEach((colName, idx) => {
    const match = matchHeader(colName);
    if (match.canonicalKey) {
      mappings[idx] = match.canonicalKey;
    }
  });

  return extractSheetRows(sheet, {
    fileName,
    sheetName: firstSheetName,
    headerRowIndex,
    mappings
  });
};

/**
 * Generate downloadable Excel Template buffer dynamically from configured fields (Preserves 13 fields)
 */
export const generateSampleTemplate = (configuredFields = null) => {
  if (!configuredFields || configuredFields.length === 0) {
    const headers = [
      'User Name',
      'Designation',
      'Department',
      'Floor',
      'Employee ID',
      'Asset Name',
      'Make / Company',
      'Model',
      'Serial Number',
      'Install Date',
      'Warranty End Date',
      'Type of OS + Version',
      'Remarks'
    ];

    const templateGuidanceRow = [
      'e.g. Employee Full Name (or leave blank if unassigned)',
      'e.g. Staff Official Designation',
      'e.g. Department / Division Name',
      'e.g. Floor / Office Room Location',
      'e.g. Staff ID (e.g. AAI-10842)',
      'e.g. Equipment Name (e.g. Desktop PC)',
      'e.g. Dell / HP / Lenovo / Apple',
      'e.g. Hardware Model Name',
      'e.g. Unique Hardware Serial Number',
      'YYYY-MM-DD (e.g. 2024-01-15)',
      'YYYY-MM-DD (e.g. 2027-01-15)',
      'e.g. Windows 11 Enterprise (23H2) / Linux / N/A',
      'e.g. Handover notes or operational remarks'
    ];

    const wsData = [headers, templateGuidanceRow];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 18 }, { wch: 26 }, { wch: 36 }, { wch: 25 }, { wch: 14 },
      { wch: 32 }, { wch: 16 }, { wch: 22 }, { wch: 20 }, { wch: 14 },
      { wch: 18 }, { wch: 28 }, { wch: 40 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Asset_Import_Template');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  // Dynamic template based on active import fields
  const sorted = [...configuredFields].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const headers = sorted.map(f => f.displayName);

  const guidanceRow = sorted.map(f => {
    if (f.fieldId === 'userName') return 'e.g. Employee Full Name (or leave blank if unassigned)';
    if (f.fieldId === 'designation') return 'e.g. Staff Official Designation';
    if (f.fieldId === 'department') return 'e.g. Department / Division Name';
    if (f.fieldId === 'floor') return 'e.g. Floor / Office Room Location';
    if (f.fieldId === 'employeeId') return 'e.g. Staff ID (e.g. AAI-10842)';
    if (f.fieldId === 'assetName') return 'e.g. Equipment Name (e.g. Desktop PC)';
    if (f.fieldId === 'make') return 'e.g. Dell / HP / Lenovo / Apple';
    if (f.fieldId === 'model') return 'e.g. Hardware Model Name';
    if (f.fieldId === 'serialNumber') return 'e.g. Unique Hardware Serial Number';
    if (f.fieldId === 'installDate') return 'YYYY-MM-DD (e.g. 2024-01-15)';
    if (f.fieldId === 'warrantyEndDate') return 'YYYY-MM-DD (e.g. 2027-01-15)';
    if (f.fieldId === 'operatingSystem') return 'e.g. Windows 11 Enterprise (23H2) / Linux / N/A';
    if (f.fieldId === 'remarks') return 'e.g. Handover notes or operational remarks';

    if (f.dataType === 'DATE') return 'YYYY-MM-DD';
    if (f.dataType === 'NUMBER') return 'e.g. 125000';
    if (f.dataType === 'BOOLEAN') return 'TRUE / FALSE';
    if (f.dataType === 'SELECT' && f.options?.length) return `e.g. ${f.options.join(' / ')}`;
    return `e.g. ${f.description || f.displayName}`;
  });

  const wsData = [headers, guidanceRow];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = sorted.map(f => {
    const len = Math.max(f.displayName.length, 14);
    return { wch: Math.min(len + 8, 45) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Asset_Import_Template');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

export default {
  deduceCategory,
  normalizeExcelDate,
  detectHeaderRowIndex,
  inspectWorkbook,
  extractSheetRows,
  parseExcelBuffer,
  generateSampleTemplate
};
