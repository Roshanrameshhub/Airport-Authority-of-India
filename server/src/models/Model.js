import mongoose from 'mongoose';

const modelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Model name is required'],
    trim: true
  },
  make: {
    type: String,
    required: [true, 'Make / Brand is required'],
    trim: true
  },
  makeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Make',
    default: null
  },
  category: {
    type: String,
    trim: true,
    default: ''
  },
  assetType: {
    type: String,
    trim: true,
    uppercase: true,
    default: ''
  },
  technology: {
    type: String,
    trim: true,
    default: ''
  },
  specifications: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for fast lookup & filtering
modelSchema.index({ make: 1, name: 1, assetType: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
modelSchema.index({ make: 1, isActive: 1 });
modelSchema.index({ assetType: 1, isActive: 1 });
modelSchema.index({ category: 1, isActive: 1 });

const Model = mongoose.model('Model', modelSchema);

export default Model;
