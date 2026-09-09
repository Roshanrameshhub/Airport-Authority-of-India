import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: [true, 'Ticket ID is required'],
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
  category: {
    type: String,
    enum: [
      'HARDWARE_FAULT',
      'SOFTWARE_ISSUE',
      'NETWORK_CONNECTIVITY',
      'PRINTER_PERIPHERAL',
      'OPERATING_SYSTEM',
      'SECURITY_ANTIVIRUS',
      'POWER_UPS',
      'OTHER'
    ],
    required: [true, 'Issue category is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Problem title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters']
  },
  description: {
    type: String,
    required: [true, 'Detailed description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters']
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM',
    index: true
  },
  priority: {
    type: String,
    enum: ['P1_CRITICAL', 'P2_HIGH', 'P3_MEDIUM', 'P4_LOW'],
    default: 'P3_MEDIUM'
  },
  status: {
    type: String,
    enum: ['OPEN', 'IN_PROGRESS', 'PENDING_PARTS', 'RESOLVED', 'CLOSED', 'REJECTED'],
    default: 'OPEN',
    index: true
  },
  reportedBy: {
    employeeId: {
      type: String,
      required: [true, 'Reporter Employee ID is required'],
      trim: true,
      uppercase: true,
      index: true
    },
    employeeName: {
      type: String,
      required: [true, 'Reporter Name is required'],
      trim: true
    },
    department: {
      type: String,
      required: [true, 'Reporter Department is required'],
      trim: true
    },
    floor: {
      type: String,
      required: [true, 'Reporter Floor is required'],
      trim: true
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    }
  },
  assignedTechnician: {
    name: {
      type: String,
      trim: true,
      default: ''
    },
    assignedAt: {
      type: Date,
      default: null
    }
  },
  resolution: {
    resolutionNotes: {
      type: String,
      trim: true,
      default: ''
    },
    resolvedBy: {
      type: String,
      trim: true,
      default: ''
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    partsReplaced: {
      type: String,
      trim: true,
      default: ''
    }
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

// Indexes for fast lookup
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ 'reportedBy.employeeId': 1, status: 1 });

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;
