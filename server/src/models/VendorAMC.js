import mongoose from 'mongoose';
import { calculateWarrantyStatus } from '../utils/warranty.js';

const vendorAMCSchema = new mongoose.Schema({
  contractNumber: {
    type: String,
    required: [true, 'Contract Number is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  vendorName: {
    type: String,
    required: [true, 'Vendor Name is required'],
    trim: true
  },
  serviceType: {
    type: String,
    enum: ['HARDWARE_SUPPORT', 'NETWORK_MAINTENANCE', 'UPS_POWER_SLA', 'PRINTER_PERIPHERAL_SLA', 'SOFTWARE_LICENSE'],
    default: 'HARDWARE_SUPPORT'
  },
  startDate: {
    type: Date,
    required: [true, 'Contract Start Date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'Contract End Date is required']
  },
  supportTier: {
    type: String,
    enum: ['24x7_CRITICAL_4HR', 'SAME_DAY_8HR', 'NEXT_BUSINESS_DAY', 'STANDARD_8x5'],
    default: '24x7_CRITICAL_4HR'
  },
  contactPerson: {
    type: String,
    trim: true,
    default: ''
  },
  contactPhone: {
    type: String,
    trim: true,
    default: ''
  },
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  coveredCategories: [{
    type: String,
    trim: true
  }],
  annualCostINR: {
    type: Number,
    default: 0
  },
  remarks: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

vendorAMCSchema.virtual('status').get(function() {
  return calculateWarrantyStatus(this.endDate);
});

const VendorAMC = mongoose.model('VendorAMC', vendorAMCSchema);

export default VendorAMC;
