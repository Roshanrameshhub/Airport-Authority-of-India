import mongoose from 'mongoose';

const assetRelationshipSchema = new mongoose.Schema({
  parentAssetId: {
    type: String,
    required: [true, 'Parent Asset ID is required'],
    trim: true,
    uppercase: true
  },
  childAssetId: {
    type: String,
    required: [true, 'Child Asset ID is required'],
    trim: true,
    uppercase: true
  },
  relationshipType: {
    type: String,
    enum: ['COMPONENT_OF', 'CONNECTED_TO', 'PERIPHERAL_OF', 'BACKUP_FOR'],
    default: 'COMPONENT_OF'
  },
  componentRole: {
    type: String,
    enum: [
      'PRIMARY_DISPLAY',
      'SECONDARY_DISPLAY',
      'POWER_BACKUP',
      'KEYBOARD',
      'MOUSE',
      'SCANNER',
      'PRINTER',
      'NETWORK_UPLINK',
      'ATTACHED_STORAGE',
      'OTHER'
    ],
    default: 'OTHER'
  },
  linkedDate: {
    type: Date,
    default: Date.now
  },
  unlinkedDate: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

assetRelationshipSchema.index({ parentAssetId: 1, isActive: 1 });
assetRelationshipSchema.index({ childAssetId: 1, isActive: 1 });
assetRelationshipSchema.index({ parentAssetId: 1, childAssetId: 1, isActive: 1 });

const AssetRelationship = mongoose.model('AssetRelationship', assetRelationshipSchema);

export default AssetRelationship;
