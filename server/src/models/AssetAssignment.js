import mongoose from 'mongoose';

const assetAssignmentSchema = new mongoose.Schema({
  assignmentId: {
    type: String,
    required: [true, 'Assignment ID is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  assetId: {
    type: String,
    required: [true, 'Asset ID is required'],
    trim: true,
    uppercase: true,
    index: true
  },
  assetName: {
    type: String,
    trim: true,
    default: ''
  },
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    trim: true,
    uppercase: true,
    index: true
  },
  employeeName: {
    type: String,
    required: [true, 'Employee Name is required'],
    trim: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  floor: {
    type: String,
    required: [true, 'Floor is required'],
    trim: true
  },
  designation: {
    type: String,
    trim: true,
    default: ''
  },
  assignedDate: {
    type: Date,
    required: [true, 'Assigned date is required'],
    default: Date.now
  },
  returnedDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'TRANSFERRED', 'RETURNED'],
    default: 'ACTIVE',
    index: true
  },
  conditionAtAssignment: {
    type: String,
    enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'UNUSABLE'],
    default: 'GOOD'
  },
  conditionAtReturn: {
    type: String,
    enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'UNUSABLE'],
    default: null
  },
  transferReason: {
    type: String,
    required: [true, 'Transfer or assignment reason is required'],
    trim: true
  },
  assignedBy: {
    type: String,
    required: [true, 'Assigning authority username is required'],
    trim: true
  },
  returnedBy: {
    type: String,
    trim: true,
    default: null
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

// Indexes for historical tracking and query speed
assetAssignmentSchema.index({ assetId: 1, assignedDate: -1 });
assetAssignmentSchema.index({ employeeId: 1, status: 1 });

const AssetAssignment = mongoose.model('AssetAssignment', assetAssignmentSchema);

export default AssetAssignment;
