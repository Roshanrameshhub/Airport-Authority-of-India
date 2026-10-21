import mongoose from 'mongoose';

const technologySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Technology name is required'],
    trim: true
  },
  category: {
    type: String,
    trim: true,
    default: ''
  },
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
technologySchema.index({ name: 1, category: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
technologySchema.index({ assetTypes: 1, isActive: 1 });
technologySchema.index({ category: 1, isActive: 1 });

const Technology = mongoose.model('Technology', technologySchema);

export default Technology;
