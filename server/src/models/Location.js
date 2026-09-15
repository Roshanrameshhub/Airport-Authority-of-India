import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Location name is required'],
    unique: true,
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Location / Airport code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  region: {
    type: String,
    enum: ['SR', 'WR', 'NR', 'ER', 'NER', 'CHQ'],
    default: 'SR',
    uppercase: true
  },
  facilityType: {
    type: String,
    enum: ['AIRPORT', 'RADAR_STATION', 'REGIONAL_HQ', 'COMMUNICATION_CENTRE', 'TRAINING_ESTABLISHMENT'],
    default: 'AIRPORT'
  },
  city: {
    type: String,
    trim: true,
    default: ''
  },
  state: {
    type: String,
    trim: true,
    default: 'Tamil Nadu'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Location = mongoose.model('Location', locationSchema);

export default Location;
