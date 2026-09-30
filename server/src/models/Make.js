import mongoose from 'mongoose';

const makeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Make / Brand name is required'],
    trim: true
  },
  code: {
    type: String,
    trim: true,
    uppercase: true,
    default: ''
  },
  categories: [{
    type: String,
    trim: true
  }],
  assetTypes: [{
    type: String,
    trim: true,
    uppercase: true
  }],
  description: {
    type: String,
    trim: true,
    default: ''
  },
  website: {
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
makeSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
makeSchema.index({ categories: 1, isActive: 1 });
makeSchema.index({ assetTypes: 1, isActive: 1 });

const Make = mongoose.model('Make', makeSchema);

export default Make;
