import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vendor / Supplier name is required'],
    unique: true,
    trim: true
  },
  vendorCode: {
    type: String,
    required: [true, 'Vendor code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  contactPerson: {
    type: String,
    trim: true,
    default: ''
  },
  email: {
    type: String,
    trim: true,
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  gemSellerId: {
    type: String,
    trim: true,
    default: ''
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  servicesProvided: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Vendor = mongoose.model('Vendor', vendorSchema);

export default Vendor;
