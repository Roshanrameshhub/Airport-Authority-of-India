import * as XLSX from 'xlsx';

/**
 * Standard column headers for AAI Asset Management Bulk Import
 * Maps various common variations/aliases in Excel sheets to canonical field names
 */
const columnAliases = {
  // 1. User Name
  userName: ['user name', 'username', 'user', 'custodian', 'employee name', 'staff name', 'holder'],
  // 2. Designation
  designation: ['designation', 'role', 'title', 'post', 'position'],
  // 3. Department
  department: ['department', 'dept', 'division', 'section'],
  // 4. Floor
  floor: ['floor', 'location', 'floor / location', 'office location', 'wing', 'room'],
  // 5. Employee ID
  employeeId: ['employee id', 'employeeid', 'emp id', 'empid', 'staff id', 'emp no', 'employee no'],
  // 6. Asset Name
  assetName: ['asset name', 'asset', 'equipment', 'equipment name', 'item name', 'device name'],
  // 7. Make
  make: ['make', 'company', 'make / company', 'manufacturer', 'brand', 'vendor'],
  // 8. Model
  model: ['model', 'model no', 'model number', 'equipment model'],
  // 9. Serial Number
  serialNumber: ['serial number', 'serial no', 'serial', 'sn', 's/n', 'service tag', 'serial_number'],
  // 10. Install Date
  installDate: ['install date', 'installation date', 'date of installation', 'purchase date', 'procurement date', 'commission date'],
  // 11. Warranty
  warrantyEndDate: ['warranty', 'warranty end date', 'warranty expiry', 'warranty valid till', 'warranty date', 'warranty_end_date'],
  // 12. OS & Version
  operatingSystem: ['type of os', 'operating system', 'os', 'os type', 'system os', 'os version', 'type of os + version'],
  // 13. Remarks
  remarks: ['remarks', 'remark', 'notes', 'comments', 'handover remarks'],
  // Optional Category & Asset ID
  category: ['category', 'asset category', 'equipment type', 'type'],
  assetId: ['asset id', 'assetid', 'asset tag', 'tag no', 'aai tag']
};

/**
 * Normalize Excel dates (handles serial numbers, ISO strings, DD/MM/YYYY, etc.)
 */
export const normalizeExcelDate = (val) => {
  if (!val) return null;

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
  if (!str) return null;

  // Try direct parse
  let parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  // Try DD/MM/YYYY or DD-MM-YYYY
  const parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);

    // If p0 > 12, it's definitely DD/MM/YYYY
    if (p0 > 12 && p2 > 1000) {
      parsed = new Date(p2, p1 - 1, p0);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    // If p2 is 4 digits, try YYYY/MM/DD
    if (p0 > 1000) {
      parsed = new Date(p0, p1 - 1, p2);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    // Otherwise standard fallback
    parsed = new Date(p2 > 1000 ? p2 : 2000 + p2, p1 - 1, p0);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
};

/**
 * Map raw header string to canonical key
 */
const findCanonicalKey = (headerText) => {
  if (!headerText) return null;
  const clean = headerText.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim().replace(/\s+/g, ' ');

  for (const [canonical, aliases] of Object.entries(columnAliases)) {
    if (clean === canonical.toLowerCase()) return canonical;
    for (const alias of aliases) {
      if (clean === alias || clean.includes(alias)) {
        return canonical;
      }
    }
  }
  return null;
};

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
 * Parse Excel Buffer into structured array of row objects
 */
export const parseExcelBuffer = (buffer) => {
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

  const headerRow = rawRows[0];
  const headerMap = {};

  headerRow.forEach((colName, idx) => {
    const canonical = findCanonicalKey(String(colName));
    if (canonical) {
      headerMap[idx] = canonical;
    }
  });

  const parsedRows = [];

  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    // Skip completely empty rows
    const hasData = row.some(cell => String(cell).trim() !== '');
    if (!hasData) continue;

    const rowObj = {
      _rowIndex: r + 1, // 1-based index matching Excel row number
      userName: '',
      designation: '',
      department: '',
      floor: '',
      employeeId: '',
      assetName: '',
      make: '',
      model: '',
      serialNumber: '',
      installDate: null,
      warrantyEndDate: null,
      operatingSystem: 'Windows 11 Pro',
      osVersion: '',
      remarks: '',
      category: '',
      assetId: ''
    };

    row.forEach((cellValue, colIdx) => {
      const canonicalKey = headerMap[colIdx];
      if (canonicalKey) {
        if (canonicalKey === 'installDate' || canonicalKey === 'warrantyEndDate') {
          rowObj[canonicalKey] = normalizeExcelDate(cellValue);
        } else {
          rowObj[canonicalKey] = String(cellValue).trim();
        }
      }
    });

    // Deduce category if missing
    if (!rowObj.category) {
      rowObj.category = deduceCategory(rowObj.assetName, rowObj.make, rowObj.model);
    }

    parsedRows.push(rowObj);
  }

  return parsedRows;
};

/**
 * Generate standard downloadable Excel Template buffer
 */
export const generateSampleTemplate = () => {
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

  // Set column widths for readability
  ws['!cols'] = [
    { wch: 18 }, // User Name
    { wch: 26 }, // Designation
    { wch: 36 }, // Department
    { wch: 25 }, // Floor
    { wch: 14 }, // Employee ID
    { wch: 32 }, // Asset Name
    { wch: 16 }, // Make
    { wch: 22 }, // Model
    { wch: 20 }, // Serial Number
    { wch: 14 }, // Install Date
    { wch: 18 }, // Warranty End Date
    { wch: 28 }, // OS
    { wch: 40 }  // Remarks
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Asset_Import_Template');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};
