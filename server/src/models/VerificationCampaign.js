import mongoose from 'mongoose';

const verificationRecordSchema = new mongoose.Schema({
  assetId: { type: String, required: true },
  assetName: { type: String, default: '' },
  category: { type: String, default: '' },
  serialNumber: { type: String, default: '' },
  expectedDepartment: { type: String, default: '' },
  expectedFloor: { type: String, default: '' },
  expectedCustodian: { type: String, default: '' },
  observedLocation: { type: String, default: '' },
  observedCondition: { type: String, default: 'GOOD' },
  result: {
    type: String,
    enum: ['VERIFIED', 'NOT_FOUND', 'DAMAGED', 'MOVED', 'UNAUTHORIZED_LOCATION'],
    default: 'VERIFIED'
  },
  verifier: { type: String, default: 'Admin' },
  verifiedAt: { type: Date, default: Date.now },
  remarks: { type: String, default: '' }
}, { _id: false });

const verificationCampaignSchema = new mongoose.Schema({
  campaignId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Campaign name is required'],
    trim: true
  },
  financialYear: {
    type: String,
    default: '2025-26'
  },
  department: {
    type: String,
    default: 'ALL'
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'FINALIZED'],
    default: 'ACTIVE'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  finalizedDate: {
    type: Date,
    default: null
  },
  createdBy: {
    type: String,
    default: 'admin'
  },
  records: [verificationRecordSchema],
  notes: {
    type: String,
    default: 'Technically Recommended — Business Confirmation Required for final institutional protocol'
  }
}, {
  timestamps: true
});

const VerificationCampaign = mongoose.model('VerificationCampaign', verificationCampaignSchema);

export default VerificationCampaign;
