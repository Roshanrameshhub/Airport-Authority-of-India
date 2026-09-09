import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: [true, 'Audit action is required'],
    trim: true,
    uppercase: true
  },
  entityType: {
    type: String,
    required: [true, 'Entity type is required'],
    enum: ['AUTH', 'ASSET', 'ASSIGNMENT', 'COMPLAINT', 'IMPORT', 'EXPORT', 'EMPLOYEE', 'SYSTEM'],
    default: 'SYSTEM'
  },
  entityId: {
    type: String,
    trim: true,
    default: null
  },
  actor: {
    userId: { type: String, default: null },
    username: { type: String, default: 'SYSTEM' },
    name: { type: String, default: 'System Process' },
    role: { type: String, default: 'SYSTEM' },
    ipAddress: { type: String, default: '127.0.0.1' }
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED'],
    default: 'SUCCESS'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ 'actor.username': 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
