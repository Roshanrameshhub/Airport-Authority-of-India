/**
 * Intelligent Column Mapping Service
 * Handles canonical field matching, confidence scoring, ambiguity detection,
 * and mapping overrides for multi-excel ingestion.
 */

export const CANONICAL_FIELDS = {
  userName: {
    key: 'userName',
    label: 'User Name',
    description: 'Current user / custodian of the hardware',
    required: false,
    aliases: [
      'user name', 'username', 'user', 'custodian', 'employee name',
      'staff name', 'holder', 'assigned to', 'current user', 'officer name',
      'person name', 'user / custodian'
    ],
    ambiguousTerms: ['name', 'user']
  },
  designation: {
    key: 'designation',
    label: 'Designation',
    description: 'Official designation or job title of custodian',
    required: false,
    aliases: [
      'designation', 'role', 'title', 'post', 'position',
      'official designation', 'job title', 'rank', 'desig', 'emp desig'
    ],
    ambiguousTerms: []
  },
  department: {
    key: 'department',
    label: 'Department',
    description: 'Airport department or operational section',
    required: true,
    aliases: [
      'department', 'dept', 'division', 'section', 'branch',
      'directorate', 'cost center', 'unit', 'operating unit'
    ],
    ambiguousTerms: []
  },
  floor: {
    key: 'floor',
    label: 'Floor / Level',
    description: 'Physical building level or floor location',
    required: true,
    aliases: [
      'floor', 'floor / location', 'office location',
      'wing', 'block', 'physical location',
      'building / floor', 'level', 'floor level'
    ],
    ambiguousTerms: ['place']
  },
  employeeId: {
    key: 'employeeId',
    label: 'Employee ID',
    description: 'Unique AAI staff identifier or employee code',
    required: false,
    aliases: [
      'employee id', 'employeeid', 'emp id', 'empid', 'staff id',
      'emp no', 'employee no', 'employee code', 'staff no',
      'employee number', 'user code', 'staff code', 'sap id', 'badge id',
      'emp code', 'empcode', 'staff code'
    ],
    ambiguousTerms: ['id', 'code', 'number', 'no']
  },
  assetName: {
    key: 'assetName',
    label: 'Asset Name',
    description: 'Equipment descriptor or device name',
    required: true,
    aliases: [
      'asset name', 'asset', 'equipment', 'equipment name',
      'item name', 'device name', 'item description', 'hardware name',
      'asset description', 'machine name', 'asset type', 'equipment type'
    ],
    ambiguousTerms: ['item', 'device', 'name']
  },
  make: {
    key: 'make',
    label: 'Make / Company',
    description: 'Hardware brand or manufacturer OEM',
    required: true,
    aliases: [
      'make', 'company', 'make / company', 'manufacturer',
      'brand', 'vendor', 'oem', 'mfr', 'mfg'
    ],
    ambiguousTerms: []
  },
  model: {
    key: 'model',
    label: 'Model',
    description: 'Specific hardware model designation',
    required: true,
    aliases: [
      'model', 'model no', 'model number', 'equipment model',
      'machine model', 'hardware model', 'type/model'
    ],
    ambiguousTerms: []
  },
  serialNumber: {
    key: 'serialNumber',
    label: 'Serial Number',
    description: 'Unique hardware chassis serial number or service tag',
    required: true,
    aliases: [
      'serial number', 'serial no', 'serial', 'sn', 's/n',
      'service tag', 'serial_number', 'asset serial', 'hw serial',
      'hardware serial', 'machine serial', 'tag / serial',
      'cpu code', 'pc code', 'machine code', 'chassis no'
    ],
    ambiguousTerms: ['no', 'serial']
  },
  installDate: {
    key: 'installDate',
    label: 'Install Date',
    description: 'Commissioning, deployment, or procurement date',
    required: false,
    aliases: [
      'install date', 'installation date', 'date of installation',
      'installed on', 'purchase date', 'procurement date',
      'commission date', 'commissioning date', 'purchase/install date',
      'deployment date', 'invoice date', 'd.o.i.'
    ],
    ambiguousTerms: ['date', 'dt']
  },
  warrantyEndDate: {
    key: 'warrantyEndDate',
    label: 'Warranty End',
    description: 'OEM or AMC warranty expiration date',
    required: false,
    aliases: [
      'warranty', 'warranty end', 'warranty end date', 'warranty expiry',
      'warranty valid till', 'warranty date', 'warranty_end_date',
      'warranty till', 'warranty expiration', 'amc expiry', 'amc valid till',
      'warranty upto'
    ],
    ambiguousTerms: ['expiry', 'valid till']
  },
  operatingSystem: {
    key: 'operatingSystem',
    label: 'Type of OS',
    description: 'Installed operating system platform',
    required: false,
    aliases: [
      'type of os', 'operating system', 'os', 'os type',
      'system os', 'operating system type', 'os installed',
      'type of os + version'
    ],
    ambiguousTerms: []
  },
  osVersion: {
    key: 'osVersion',
    label: 'OS Version',
    description: 'OS release, build, or architecture version',
    required: false,
    aliases: [
      'os version', 'version', 'build', 'os build',
      'operating system version', 'os release', 'release'
    ],
    ambiguousTerms: ['version']
  },
  remarks: {
    key: 'remarks',
    label: 'Remarks',
    description: 'Handover remarks, operational notes, or comments',
    required: false,
    aliases: [
      'remarks', 'remark', 'notes', 'comments', 'handover remarks',
      'handover notes', 'description', 'additional info', 'status remarks'
    ],
    ambiguousTerms: ['comment', 'note']
  },
  oldAssetId: {
    key: 'oldAssetId',
    label: 'Old / Legacy Tag',
    description: 'Previous AAI fixed asset register number or legacy tag',
    required: false,
    aliases: [
      'old asset id', 'old asset tag', 'previous asset id', 'old tag',
      'legacy asset id', 'legacy tag', 'old tag no', 'old code', 'old asset no'
    ],
    ambiguousTerms: []
  },
  assetType: {
    key: 'assetType',
    label: 'Asset Type',
    description: 'Standardized operational equipment type (DESKTOP, LAPTOP, etc.)',
    required: false,
    aliases: [
      'asset type', 'equipment type', 'type of asset', 'hardware type', 'item type'
    ],
    ambiguousTerms: ['type']
  },
  supplier: {
    key: 'supplier',
    label: 'Supplier / Vendor',
    description: 'Contracted vendor or procurement agency',
    required: false,
    aliases: [
      'supplier', 'supplier name', 'vendor name', 'party name',
      'dealer', 'purchased from', 'source vendor', 'source supplier'
    ],
    ambiguousTerms: []
  },
  supplyOrderNumber: {
    key: 'supplyOrderNumber',
    label: 'Supply Order / PO No',
    description: 'Purchase order, GeM contract or supply agreement reference',
    required: false,
    aliases: [
      'supply order number', 'supply order no', 'so no', 'po number',
      'po no', 'purchase order', 'order no', 'purchase order no',
      'gem order no', 'gem contract no', 'so number'
    ],
    ambiguousTerms: []
  },
  purchaseDate: {
    key: 'purchaseDate',
    label: 'Purchase Date',
    description: 'Official invoice or purchase agreement date',
    required: false,
    aliases: [
      'purchase date', 'po date', 'order date', 'procurement date', 'date of purchase'
    ],
    ambiguousTerms: []
  },
  purchaseCost: {
    key: 'purchaseCost',
    label: 'Purchase Cost (INR)',
    description: 'Procurement acquisition price in Indian Rupees',
    required: false,
    aliases: [
      'purchase cost', 'cost', 'basic cost', 'rate', 'price',
      'purchase price', 'value', 'amount', 'unit price', 'procurement cost'
    ],
    ambiguousTerms: ['cost', 'price', 'amount']
  },
  location: {
    key: 'location',
    label: 'Airport / Location',
    description: 'Airport facility or institutional campus',
    required: false,
    aliases: [
      'facility', 'airport', 'airport location', 'station', 'airport name', 'campus'
    ],
    ambiguousTerms: []
  },
  room: {
    key: 'room',
    label: 'Room / Office',
    description: 'Specific room, office, cubicle or bay',
    required: false,
    aliases: [
      'room', 'room no', 'room number', 'cubicle', 'bay', 'cabin', 'chamber', 'office room', 'room / bay'
    ],
    ambiguousTerms: []
  },
  intercom: {
    key: 'intercom',
    label: 'Intercom / Ext',
    description: 'AAI internal intercom or extension number',
    required: false,
    aliases: [
      'intercom', 'intercom no', 'intercom number', 'ext', 'extension', 'ext no', 'extension no', 'phone ext'
    ],
    ambiguousTerms: ['ext']
  },
  ipAddress: {
    key: 'ipAddress',
    label: 'IP Address',
    description: 'Assigned IPv4/IPv6 network host address',
    required: false,
    aliases: [
      'ip address', 'ip', 'ip addr', 'host ip', 'static ip',
      'network ip', 'ipv4', 'terminal ip', 'device ip'
    ],
    ambiguousTerms: []
  },
  macAddress: {
    key: 'macAddress',
    label: 'MAC Address',
    description: 'Hardware NIC physical address',
    required: false,
    aliases: [
      'mac address', 'mac', 'mac addr', 'physical address',
      'ethernet address', 'lan mac', 'ethernet mac'
    ],
    ambiguousTerms: []
  },
  amcApplicable: {
    key: 'amcApplicable',
    label: 'AMC Applicable',
    description: 'Whether asset is covered under maintenance contract',
    required: false,
    aliases: [
      'amc applicable', 'under amc', 'amc status', 'amc covered', 'amc warranty'
    ],
    ambiguousTerms: []
  },
  amcContractId: {
    key: 'amcContractId',
    label: 'AMC Contract ID',
    description: 'Contract SLA reference or agreement identifier',
    required: false,
    aliases: [
      'amc contract id', 'amc contract no', 'amc agreement no',
      'amc ref', 'amc reference', 'sla id'
    ],
    ambiguousTerms: []
  },
  processor: {
    key: 'processor',
    label: 'Processor / CPU',
    description: 'CPU specification (e.g. Intel Core i7-12700)',
    required: false,
    aliases: [
      'processor', 'cpu', 'cpu details', 'chip', 'processor model', 'processor speed'
    ],
    ambiguousTerms: []
  },
  ramSizeGb: {
    key: 'ramSizeGb',
    label: 'RAM (GB)',
    description: 'System memory capacity in Gigabytes',
    required: false,
    aliases: [
      'ram', 'ram size', 'ram gb', 'memory', 'ram (gb)', 'ram capacity', 'memory gb', 'installed ram'
    ],
    ambiguousTerms: []
  },
  storageCapacityGb: {
    key: 'storageCapacityGb',
    label: 'Storage (GB)',
    description: 'Storage capacity in Gigabytes',
    required: false,
    aliases: [
      'storage', 'storage capacity', 'hdd capacity', 'ssd capacity',
      'hard disk', 'storage gb', 'disk size', 'hdd size', 'ssd size', 'storage (gb)'
    ],
    ambiguousTerms: []
  },
  storageType: {
    key: 'storageType',
    label: 'Storage Type',
    description: 'Drive type (SSD, NVMe, HDD, Hybrid)',
    required: false,
    aliases: [
      'storage type', 'disk type', 'drive type', 'ssd/hdd', 'hdd/ssd'
    ],
    ambiguousTerms: []
  },
  hostname: {
    key: 'hostname',
    label: 'Hostname',
    description: 'System NetBIOS or hostname identifier',
    required: false,
    aliases: [
      'hostname', 'host name', 'computer name', 'machine name', 'netbios name'
    ],
    ambiguousTerms: []
  },
  screenSizeInches: {
    key: 'screenSizeInches',
    label: 'Screen Size (Inches)',
    description: 'Monitor display diagonal dimension',
    required: false,
    aliases: [
      'screen size', 'display size', 'monitor size', 'screen size (inches)', 'size in inches'
    ],
    ambiguousTerms: []
  },
  capacityVa: {
    key: 'capacityVa',
    label: 'UPS Capacity (VA)',
    description: 'UPS power rating in Volt-Amperes',
    required: false,
    aliases: [
      'capacity va', 'va rating', 'ups capacity', 'capacity (va)', 'kva', 'va'
    ],
    ambiguousTerms: []
  },
  supportingInfo: {
    key: 'supportingInfo',
    label: 'Supporting Info (Append to Remarks)',
    description: 'General auxiliary specifications or notes to append to Remarks',
    required: false,
    aliases: [
      'specs', 'specifications', 'hardware details', 'config', 'hardware specs'
    ],
    ambiguousTerms: []
  },
  category: {
    key: 'category',
    label: 'Category',
    description: 'Hardware classification (Laptop, Desktop, etc.)',
    required: false,
    aliases: [
      'category', 'asset category', 'equipment type', 'type',
      'device type', 'classification', 'hardware category'
    ],
    ambiguousTerms: ['type']
  },
  assetId: {
    key: 'assetId',
    label: 'Asset ID',
    description: 'AAI official fixed asset register ID / barcode tag',
    required: false,
    aliases: [
      'asset id', 'assetid', 'asset tag', 'tag no', 'aai tag',
      'fixed asset id', 'barcode', 'tag id', 'aai asset id'
    ],
    ambiguousTerms: ['id', 'tag']
  },
  employeeType: {
    key: 'employeeType',
    label: 'Employee Type',
    description: 'AAI permanent staff or Contract / Outsourced personnel',
    required: false,
    aliases: ['employee type', 'emp type', 'staff type', 'employment type', 'type of employee', 'emp. type'],
    ambiguousTerms: []
  },
  employmentCategory: {
    key: 'employmentCategory',
    label: 'Employment Category',
    description: 'Employment category (Regular, Contractual, Outsourced, Deputation, Casual, Intern)',
    required: false,
    aliases: ['employment category', 'emp category', 'staff category', 'category of employment', 'employment class', 'emp. category'],
    ambiguousTerms: []
  },
  contractorName: {
    key: 'contractorName',
    label: 'Contractor / Agency',
    description: 'Outsourced staffing agency or contractor company name',
    required: false,
    aliases: ['contractor', 'contractor name', 'agency', 'contractor / agency', 'vendor name agency', 'contractor / vendor', 'staffing agency', 'outsourced vendor', 'contractor name'],
    ambiguousTerms: []
  },
  status: {
    key: 'status',
    label: 'Asset Status',
    description: 'Operational status (AVAILABLE, ASSIGNED, GODOWN, UNDER_MAINTENANCE, FAULTY, DAMAGED, RETIRED, etc.)',
    required: false,
    aliases: ['status', 'asset status', 'equipment status', 'current status', 'lifecycle status', 'hardware status'],
    ambiguousTerms: []
  },
  condition: {
    key: 'condition',
    label: 'Physical Condition',
    description: 'Hardware condition (EXCELLENT, GOOD, FAIR, POOR, UNUSABLE)',
    required: false,
    aliases: ['condition', 'physical condition', 'asset condition', 'hardware condition', 'working condition'],
    ambiguousTerms: []
  },
  transferReason: {
    key: 'transferReason',
    label: 'Assignment Reason',
    description: 'Assignment justification or handover purpose',
    required: false,
    aliases: ['assignment reason', 'transfer reason', 'allocation reason', 'reason', 'purpose', 'justification'],
    ambiguousTerms: []
  },
  warrantyStartDate: {
    key: 'warrantyStartDate',
    label: 'Warranty Start',
    description: 'OEM or vendor warranty coverage start date',
    required: false,
    aliases: ['warranty start', 'warranty start date', 'warranty begins', 'warranty from', 'warranty commencement'],
    ambiguousTerms: []
  },
  warrantyStatus: {
    key: 'warrantyStatus',
    label: 'Warranty Status',
    description: 'Current warranty state (ACTIVE, EXPIRING, EXPIRED, AMC)',
    required: false,
    aliases: ['warranty status', 'warranty state', 'warranty coverage'],
    ambiguousTerms: []
  },
  amcEndDate: {
    key: 'amcEndDate',
    label: 'AMC End Date',
    description: 'Maintenance agreement contract termination date',
    required: false,
    aliases: ['amc end', 'amc end date', 'amc expiry', 'amc valid till', 'amc expiration', 'amc termination date'],
    ambiguousTerms: []
  }
};

/**
 * Clean a header string into normalized alphanumeric tokens
 */
export const cleanHeaderText = (text) => {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
};

/**
 * Match a raw header text against canonical fields and compute confidence
 */
export const matchHeader = (rawHeader, customFields = []) => {
  if (!rawHeader) {
    return {
      canonicalKey: null,
      confidence: 'UNMAPPED',
      matchedAlias: null,
      candidates: []
    };
  }

  const clean = cleanHeaderText(rawHeader);

  // Explicitly ignore row sequence numbers (S.NO, SL NO, S NO, etc.) so they map to [ Ignore ]
  const sequenceNumberHeaders = ['s no', 'sno', 'sl no', 'sr no', 's n', 'serial no row', 'index'];
  if (sequenceNumberHeaders.includes(clean)) {
    return {
      canonicalKey: null,
      confidence: 'UNMAPPED',
      matchedAlias: null,
      candidates: []
    };
  }

  // Check for ambiguous generic single-word headers first (e.g., 'date', 'id', 'code', 'name', 'type')
  const genericAmbiguous = [
    { word: 'id', candidates: ['employeeId', 'assetId'] },
    { word: 'date', candidates: ['installDate', 'warrantyEndDate'] },
    { word: 'dt', candidates: ['installDate', 'warrantyEndDate'] },
    { word: 'name', candidates: ['userName', 'assetName'] },
    { word: 'code', candidates: ['employeeId', 'assetId'] },
    { word: 'type', candidates: ['category', 'operatingSystem'] }
  ];

  for (const amb of genericAmbiguous) {
    if (clean === amb.word) {
      return {
        canonicalKey: amb.candidates[0], // default to primary
        confidence: 'AMBIGUOUS',
        matchedAlias: clean,
        candidates: amb.candidates
      };
    }
  }

  // 1. Exact Match against canonical key or aliases of core fields (HIGH CONFIDENCE)
  for (const [canonicalKey, def] of Object.entries(CANONICAL_FIELDS)) {
    if (clean === canonicalKey.toLowerCase() || clean === def.label.toLowerCase()) {
      return {
        canonicalKey,
        confidence: 'HIGH_CONFIDENCE',
        matchedAlias: def.label,
        candidates: [canonicalKey]
      };
    }

    for (const alias of def.aliases) {
      if (clean === alias) {
        return {
          canonicalKey,
          confidence: 'HIGH_CONFIDENCE',
          matchedAlias: alias,
          candidates: [canonicalKey]
        };
      }
    }
  }

  // 1b. Exact Match against configurable custom fields (HIGH CONFIDENCE)
  for (const cf of customFields) {
    const cfKey = cf.fieldName || cf.fieldId;
    const cfDisplay = cf.displayName || cfKey;
    const cfCleanName = cleanHeaderText(cfKey);
    const cfCleanDisplay = cleanHeaderText(cfDisplay);

    if (clean === cfCleanName || clean === cfCleanDisplay) {
      return {
        canonicalKey: cfKey,
        confidence: 'HIGH_CONFIDENCE',
        matchedAlias: cfDisplay,
        candidates: [cfKey]
      };
    }

    const aliases = (cf.aliases || []).map(a => cleanHeaderText(a));
    for (const alias of aliases) {
      if (clean === alias) {
        return {
          canonicalKey: cfKey,
          confidence: 'HIGH_CONFIDENCE',
          matchedAlias: alias,
          candidates: [cfKey]
        };
      }
    }
  }

  // 2. Substring / Boundary matching (MEDIUM CONFIDENCE)
  const matches = [];
  for (const [canonicalKey, def] of Object.entries(CANONICAL_FIELDS)) {
    for (const alias of def.aliases) {
      // If alias is longer than 3 chars and contained within clean text or vice versa
      if (alias.length >= 4) {
        const regex = new RegExp(`\\b${alias}\\b`, 'i');
        if (regex.test(clean) || clean.includes(alias)) {
          matches.push({ canonicalKey, alias, length: alias.length });
          break;
        }
      }
    }
  }

  for (const cf of customFields) {
    const cfKey = cf.fieldName || cf.fieldId;
    const aliases = [cf.displayName, ...(cf.aliases || [])];
    for (const rawAlias of aliases) {
      const alias = cleanHeaderText(rawAlias);
      if (alias.length >= 4) {
        const regex = new RegExp(`\\b${alias}\\b`, 'i');
        if (regex.test(clean) || clean.includes(alias)) {
          matches.push({ canonicalKey: cfKey, alias, length: alias.length });
          break;
        }
      }
    }
  }

  if (matches.length === 1) {
    return {
      canonicalKey: matches[0].canonicalKey,
      confidence: 'MEDIUM_CONFIDENCE',
      matchedAlias: matches[0].alias,
      candidates: [matches[0].canonicalKey]
    };
  }

  if (matches.length > 1) {
    // Pick the one with longest matching alias, but mark as AMBIGUOUS
    matches.sort((a, b) => b.length - a.length);
    return {
      canonicalKey: matches[0].canonicalKey,
      confidence: 'AMBIGUOUS',
      matchedAlias: matches[0].alias,
      candidates: matches.map(m => m.canonicalKey)
    };
  }

  return {
    canonicalKey: null,
    confidence: 'UNMAPPED',
    matchedAlias: null,
    candidates: []
  };
};

/**
 * Generate full header mapping object for a list of raw column headers in a sheet
 */
export const generateSheetColumnMappings = (rawHeaders = [], customFields = []) => {
  const mappings = {};
  const confidence = {};
  const candidates = {};

  rawHeaders.forEach((rawCol, colIndex) => {
    if (!rawCol || String(rawCol).trim() === '') return;
    const match = matchHeader(rawCol, customFields);
    mappings[colIndex] = match.canonicalKey || '';
    confidence[colIndex] = match.confidence;
    candidates[colIndex] = match.candidates;
  });

  return {
    mappings,
    confidence,
    candidates
  };
};

export default {
  CANONICAL_FIELDS,
  cleanHeaderText,
  matchHeader,
  generateSheetColumnMappings
};
