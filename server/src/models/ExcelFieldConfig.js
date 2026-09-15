import mongoose from 'mongoose';

const excelFieldConfigSchema = new mongoose.Schema({
  fieldId: {
    type: String,
    required: [true, 'Field ID is required'],
    unique: true,
    trim: true
  },
  fieldName: {
    type: String,
    required: [true, 'Field Name is required'],
    unique: true,
    trim: true
  },
  displayName: {
    type: String,
    required: [true, 'Display Name is required'],
    trim: true
  },
  dataType: {
    type: String,
    enum: ['TEXT', 'LONG_TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT'],
    default: 'TEXT'
  },
  options: {
    type: [String],
    default: []
  },
  isLocked: {
    type: Boolean,
    default: false,
    immutable: false // Locked core fields cannot be deleted or reconfigured
  },
  required: {
    type: Boolean,
    default: false
  },
  enabled: {
    type: Boolean,
    default: true
  },
  importEnabled: {
    type: Boolean,
    default: true
  },
  exportEnabled: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 100
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  aliases: {
    type: [String],
    default: []
  },
  createdBy: {
    type: String,
    default: 'SYSTEM'
  },
  updatedBy: {
    type: String,
    default: 'SYSTEM'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

excelFieldConfigSchema.index({ sortOrder: 1 });
excelFieldConfigSchema.index({ enabled: 1, importEnabled: 1 });
excelFieldConfigSchema.index({ enabled: 1, exportEnabled: 1 });

const ExcelFieldConfig = mongoose.model('ExcelFieldConfig', excelFieldConfigSchema);

export default ExcelFieldConfig;
