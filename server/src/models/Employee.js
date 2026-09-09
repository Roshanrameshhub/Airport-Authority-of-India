import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Staff / Employee name is required'],
    trim: true
  },
  designation: {
    type: String,
    required: [true, 'Designation is required'],
    trim: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  floor: {
    type: String,
    required: [true, 'Floor / Location is required'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid official email address'],
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  assignedAssetsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

employeeSchema.index({ name: 'text', employeeId: 'text', designation: 'text', department: 'text' });

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;
