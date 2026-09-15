import mongoose from 'mongoose';
import { calculateWarrantyStatus } from '../utils/warranty.js';

// Reusable Subdocument Schema for Computer Configuration (Phase 3 readiness)
const computerConfigurationSchema = new mongoose.Schema({
  processor: { type: String, trim: true, default: '' },
  processorSpeed: { type: String, trim: true, default: '' },
  ramSizeGb: { type: Number, default: null },
  ramType: { type: String, trim: true, default: '' }, // DDR3, DDR4, DDR5
  ramSlots: { type: Number, default: null },
  storageType: { type: String, trim: true, default: '' }, // HDD, SSD, NVMe
  storageCapacityGb: { type: Number, default: null },
  storageModel: { type: String, trim: true, default: '' },
  graphicsCard: { type: String, trim: true, default: '' },
  opticalDrive: { type: String, trim: true, default: '' },
  formFactor: { type: String, trim: true, default: '' }, // Tower, SFF, Micro, All-in-One, Laptop
  operatingSystem: { type: String, trim: true, default: '' },
  osVersion: { type: String, trim: true, default: '' },
  osArchitecture: { type: String, trim: true, default: '64-bit' },
  ipAddress: { type: String, trim: true, default: '' },
  macAddress: { type: String, trim: true, default: '' },
  hostname: { type: String, trim: true, default: '' }
}, { _id: false });

// Reusable Subdocument Schema for Display Configuration (Phase 3 readiness)
const displayConfigurationSchema = new mongoose.Schema({
  screenSizeInches: { type: Number, default: null },
  resolution: { type: String, trim: true, default: '' }, // e.g. 1920x1080, 4K
  panelType: { type: String, trim: true, default: '' }, // IPS, VA, TN, OLED
  ports: [{ type: String, trim: true }], // HDMI, DisplayPort, VGA
  aspectRatio: { type: String, trim: true, default: '16:9' }
}, { _id: false });

// Reusable Subdocument Schema for Power Backup (UPS) Configuration (Phase 3 readiness)
const powerBackupConfigurationSchema = new mongoose.Schema({
  capacityVa: { type: Number, default: null }, // e.g. 600, 1000, 1500, 2000
  capacityWatts: { type: Number, default: null },
  topology: { type: String, trim: true, default: 'Line-Interactive' }, // Line-Interactive, Online Double Conversion, Offline
  batteryType: { type: String, trim: true, default: 'VRLA / SMF' },
  batteryQuantity: { type: Number, default: null },
  estimatedBackupMinutes: { type: Number, default: null },
  lastBatteryReplacementDate: { type: Date, default: null }
}, { _id: false });

// Reusable Subdocument Schema for Peripheral Configuration (Phase 3 readiness)
const peripheralConfigurationSchema = new mongoose.Schema({
  peripheralType: { type: String, trim: true, default: '' }, // Keyboard, Mouse, Webcam, Barcode Scanner
  interfaceType: { type: String, trim: true, default: 'USB' }, // USB, PS/2, Bluetooth, Wireless 2.4G
  isWireless: { type: Boolean, default: false }
}, { _id: false });

// Reusable Subdocument Schema for Network Equipment Configuration (Phase 3 readiness)
const networkConfigurationSchema = new mongoose.Schema({
  deviceSubtype: { type: String, trim: true, default: '' }, // Switch, Router, Firewall, Access Point
  totalPorts: { type: Number, default: null },
  portSpeed: { type: String, trim: true, default: '1 Gbps' },
  managementIp: { type: String, trim: true, default: '' },
  firmwareVersion: { type: String, trim: true, default: '' },
  isManaged: { type: Boolean, default: true }
}, { _id: false });

const assetSchema = new mongoose.Schema({
  // 1. Primary Identification
  assetId: {
    type: String,
    required: [true, 'Asset ID is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  assetName: {
    type: String,
    required: [true, 'Asset Name is required'],
    trim: true
  },
  assetType: {
    type: String,
    enum: [
      'DESKTOP',
      'LAPTOP',
      'PRINTER',
      'SCANNER',
      'UPS',
      'MONITOR',
      'SERVER',
      'NETWORK',
      'PROJECTOR',
      'STORAGE',
      'PERIPHERAL',
      'OTHER'
    ],
    default: 'OTHER',
    uppercase: true,
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Asset Category is required'],
    trim: true
  },
  make: {
    type: String,
    required: [true, 'Make / Manufacturer is required'],
    trim: true
  },
  model: {
    type: String,
    required: [true, 'Model is required'],
    trim: true
  },
  serialNumber: {
    type: String,
    required: [true, 'Serial Number is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  oldAssetId: {
    type: String,
    trim: true,
    default: ''
  },
  qrCode: {
    type: String,
    trim: true,
    default: ''
  },
  barcode: {
    type: String,
    trim: true,
    default: ''
  },

  // 2. Location & Facility Information
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  departmentId: {
    type: String,
    trim: true,
    default: ''
  },
  location: {
    type: String,
    trim: true,
    default: 'AAI Operational Facility'
  },
  locationId: {
    type: String,
    trim: true,
    default: ''
  },
  floor: {
    type: String,
    required: [true, 'Floor / Location is required'],
    trim: true
  },
  room: {
    type: String,
    trim: true,
    default: ''
  },
  intercom: {
    type: String,
    trim: true,
    default: ''
  },

  // 3. Custodian Information (13 confirmed fields preserved 1:1)
  currentEmployeeId: {
    type: String,
    trim: true,
    uppercase: true,
    default: null
  },
  currentEmployeeName: {
    type: String,
    trim: true,
    default: ''
  },
  currentDesignation: {
    type: String,
    trim: true,
    default: ''
  },
  currentAssignmentDate: {
    type: Date,
    default: null
  },

  // 4. Procurement, Supply Order & Financial
  supplier: {
    type: String,
    trim: true,
    default: ''
  },
  vendor: {
    type: String,
    trim: true,
    default: ''
  },
  supplyOrderNumber: {
    type: String,
    trim: true,
    default: ''
  },
  purchaseDate: {
    type: Date,
    default: null
  },
  purchaseCost: {
    type: Number,
    min: [0, 'Purchase cost cannot be negative'],
    default: null
  },
  installDate: {
    type: Date,
    required: [true, 'Install Date is required']
  },

  // 5. Warranty & AMC Details
  warrantyStartDate: {
    type: Date,
    default: null
  },
  warrantyEndDate: {
    type: Date,
    required: [true, 'Warranty End Date is required']
  },
  amcApplicable: {
    type: Boolean,
    default: false
  },
  amcContractId: {
    type: String,
    trim: true,
    default: ''
  },
  amcEndDate: {
    type: Date,
    default: null
  },

  // 6. Common Network & OS
  operatingSystem: {
    type: String,
    trim: true,
    default: 'N/A'
  },
  osVersion: {
    type: String,
    trim: true,
    default: ''
  },
  ipAddress: {
    type: String,
    trim: true,
    default: ''
  },
  macAddress: {
    type: String,
    trim: true,
    default: ''
  },

  // 7. Lifecycle & Operational Status
  status: {
    type: String,
    enum: [
      'AVAILABLE',
      'ASSIGNED',
      'GODOWN',
      'UNDER_MAINTENANCE',
      'UNDER_REPAIR',
      'FAULTY',
      'DAMAGED',
      'LOST',
      'WRITE_OFF',
      'RETIRED',
      'DISPOSED'
    ],
    default: 'AVAILABLE'
  },
  condition: {
    type: String,
    enum: [
      'NEW',
      'EXCELLENT',
      'GOOD',
      'FAIR',
      'POOR',
      'DAMAGED',
      'UNSERVICEABLE',
      'UNUSABLE',
      'OBSOLETE'
    ],
    default: 'GOOD'
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  remarks: {
    type: String,
    trim: true,
    default: ''
  },

  // 8. Type-Specific Subdocuments (Phase 3)
  computerConfig: {
    type: computerConfigurationSchema,
    default: () => ({})
  },
  displayConfig: {
    type: displayConfigurationSchema,
    default: () => ({})
  },
  powerConfig: {
    type: powerBackupConfigurationSchema,
    default: () => ({})
  },
  peripheralConfig: {
    type: peripheralConfigurationSchema,
    default: () => ({})
  },
  networkConfig: {
    type: networkConfigurationSchema,
    default: () => ({})
  },

  // 9. Flexible Extensibility
  specifications: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  customFields: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual field for dynamically derived warranty status
assetSchema.virtual('warrantyStatus').get(function () {
  return calculateWarrantyStatus(this.warrantyEndDate);
});

// Virtual field for custodian summary (backward compatibility)
assetSchema.virtual('assignedTo').get(function () {
  if (!this.currentEmployeeId && !this.currentEmployeeName) return null;
  return {
    employeeId: this.currentEmployeeId,
    name: this.currentEmployeeName,
    designation: this.currentDesignation,
    assignedDate: this.currentAssignmentDate
  };
});

// Compound search index
assetSchema.index({
  assetId: 'text',
  assetName: 'text',
  serialNumber: 'text',
  make: 'text',
  model: 'text',
  oldAssetId: 'text',
  supplier: 'text',
  supplyOrderNumber: 'text',
  room: 'text',
  currentEmployeeName: 'text',
  currentEmployeeId: 'text'
});

// Performance indexes for filtering and relationship lookup
assetSchema.index({ warrantyEndDate: 1 });
assetSchema.index({ status: 1 });
assetSchema.index({ category: 1 });
assetSchema.index({ assetType: 1 });
assetSchema.index({ department: 1 });
assetSchema.index({ currentEmployeeId: 1 });
assetSchema.index({ isArchived: 1 });

const Asset = mongoose.model('Asset', assetSchema);

export default Asset;
