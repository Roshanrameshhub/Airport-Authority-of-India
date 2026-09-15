import mongoose from 'mongoose';

const sheetSummarySchema = new mongoose.Schema({
  sheetName: { type: String, required: true },
  detectedPurpose: { type: String, default: '' },
  suggestedAssetName: { type: String, default: '' },
  isEmployeeSheet: { type: Boolean, default: false },
  isComplementarySheet: { type: Boolean, default: false },
  isSelected: { type: Boolean, default: true },
  headerRowIndex: { type: Number, default: 0 },
  rawHeaders: [{ type: String }],
  mappings: { type: Map, of: String, default: {} },
  confidence: { type: Map, of: String, default: {} },
  totalRows: { type: Number, default: 0 }
}, { _id: false });

const fileSummarySchema = new mongoose.Schema({
  fileIndex: { type: Number, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, default: 0 },
  mimeType: { type: String, default: '' },
  isPasswordProtected: { type: Boolean, default: false },
  isUnlocked: { type: Boolean, default: true },
  status: { type: String, default: 'READY' },
  errorMessage: { type: String, default: null },
  sheets: [sheetSummarySchema]
}, { _id: false });

const conflictItemSchema = new mongoose.Schema({
  conflictId: { type: String, required: true },
  serialNumber: { type: String, default: '' },
  assetIdentifier: { type: String, default: '' },
  field: { type: String, required: true },
  valueA: { type: mongoose.Schema.Types.Mixed },
  sourceA: {
    fileName: String,
    sheetName: String,
    rowIndex: Number
  },
  valueB: { type: mongoose.Schema.Types.Mixed },
  sourceB: {
    fileName: String,
    sheetName: String,
    rowIndex: Number
  },
  resolvedValue: { type: mongoose.Schema.Types.Mixed, default: null },
  resolutionChoice: {
    type: String,
    enum: ['PENDING', 'USE_A', 'USE_B', 'MANUAL_VALUE', 'SKIP_RECORD'],
    default: 'PENDING'
  }
}, { _id: false });

const unresolvedEmployeeSchema = new mongoose.Schema({
  employeeKey: { type: String, required: true },
  employeeId: { type: String, default: '' },
  userName: { type: String, default: '' },
  designation: { type: String, default: '' },
  department: { type: String, default: '' },
  floor: { type: String, default: '' },
  source: {
    fileName: String,
    sheetName: String,
    rowIndex: Number
  },
  resolution: {
    type: String,
    enum: ['PENDING', 'CREATE_EMPLOYEE', 'MAP_TO_EXISTING', 'KEEP_UNASSIGNED'],
    default: 'PENDING'
  },
  mappedEmployeeId: { type: String, default: null }
}, { _id: false });

const importJobSchema = new mongoose.Schema({
  importToken: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  uploader: {
    userId: { type: String, default: null },
    username: { type: String, default: 'admin' },
    name: { type: String, default: 'Administrator' },
    role: { type: String, default: 'ADMIN' }
  },
  status: {
    type: String,
    enum: ['ANALYZED', 'MAPPED', 'RECONCILED', 'COMMITTED', 'CANCELLED'],
    default: 'ANALYZED'
  },
  files: [fileSummarySchema],
  // Serialized raw rows with provenance for staging
  rawRows: [{ type: mongoose.Schema.Types.Mixed }],
  // Master staged asset records after cleaning & cross-file merging
  stagedAssets: [{ type: mongoose.Schema.Types.Mixed }],
  conflicts: [conflictItemSchema],
  unresolvedEmployees: [unresolvedEmployeeSchema],
  metrics: {
    fileCount: { type: Number, default: 0 },
    sheetCount: { type: Number, default: 0 },
    totalSourceRows: { type: Number, default: 0 },
    uniqueAssets: { type: Number, default: 0 },
    newAssets: { type: Number, default: 0 },
    duplicatesCount: { type: Number, default: 0 },
    conflictCount: { type: Number, default: 0 },
    invalidRowsCount: { type: Number, default: 0 },
    unresolvedEmployeesCount: { type: Number, default: 0 },
    readyCount: { type: Number, default: 0 },
    employeesFound: { type: Number, default: 0 },
    assetsFound: { type: Number, default: 0 },
    assetsWithEmployee: { type: Number, default: 0 },
    availableCount: { type: Number, default: 0 },
    needsReviewCount: { type: Number, default: 0 }
  },
  errors: [{ type: mongoose.Schema.Types.Mixed }],
  commitSummary: {
    importedCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    conflictStrategy: { type: String, default: 'SKIP_EXISTING' }
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 3 * 60 * 60 * 1000), // 3-hour TTL
    index: { expires: 0 }
  }
}, {
  timestamps: true,
  suppressReservedKeysWarning: true
});

const ImportJob = mongoose.model('ImportJob', importJobSchema);

export default ImportJob;
