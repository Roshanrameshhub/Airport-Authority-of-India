import mongoose from 'mongoose';
import { calculateWarrantyStatus } from '../utils/warranty.js';

const assetSchema = new mongoose.Schema({
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
  installDate: {
    type: Date,
    required: [true, 'Install Date is required']
  },
  warrantyStartDate: {
    type: Date,
    default: null
  },
  warrantyEndDate: {
    type: Date,
    required: [true, 'Warranty End Date is required']
  },
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
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  floor: {
    type: String,
    required: [true, 'Floor / Location is required'],
    trim: true
  },
  remarks: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'DAMAGED', 'LOST', 'RETIRED', 'DISPOSED'],
    default: 'AVAILABLE'
  },
  condition: {
    type: String,
    enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'UNUSABLE'],
    default: 'GOOD'
  },
  // Current Custodian Information (Preserving 1:1 view for the 13 confirmed fields)
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
  isArchived: {
    type: Boolean,
    default: false
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

// Compound search index
assetSchema.index({
  assetId: 'text',
  assetName: 'text',
  serialNumber: 'text',
  make: 'text',
  model: 'text',
  currentEmployeeName: 'text',
  currentEmployeeId: 'text'
});

// Performance indexes for filtering and relationship lookup
assetSchema.index({ warrantyEndDate: 1 });
assetSchema.index({ status: 1 });
assetSchema.index({ currentEmployeeId: 1 });

const Asset = mongoose.model('Asset', assetSchema);

export default Asset;
