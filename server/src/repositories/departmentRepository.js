import mongoose from 'mongoose';
import Department from '../models/Department.js';

const memoryDepartments = new Map();

const seedDepartments = () => {
  if (memoryDepartments.size === 0) {
    const list = [
      { _id: '66d100000000000000000001', name: 'Information Technology', code: 'IT', floor: '2nd Floor, Admin Block', description: 'Regional IT infrastructure and support' },
      { _id: '66d100000000000000000002', name: 'Air Traffic Management', code: 'ATM', floor: '3rd Floor, ATC Tower', description: 'Air traffic control and airspace operations' },
      { _id: '66d100000000000000000003', name: 'Communication, Navigation & Surveillance', code: 'CNS', floor: '2nd Floor, Technical Block', description: 'Aviation electronics, radar, and navigational aids' },
      { _id: '66d100000000000000000004', name: 'Engineering - Electrical', code: 'ENG-ELEC', floor: '1st Floor, Operational Wing', description: 'Airfield lighting, substations, and electrical systems' },
      { _id: '66d100000000000000000005', name: 'Engineering - Civil', code: 'ENG-CIVIL', floor: '1st Floor, Operational Wing', description: 'Runway maintenance and civil works' },
      { _id: '66d100000000000000000006', name: 'Finance & Accounts', code: 'FIN', floor: 'Ground Floor, Admin Wing', description: 'Regional budgeting, payroll, and auditing' },
      { _id: '66d100000000000000000007', name: 'Human Resources & Admin', code: 'HR', floor: 'Ground Floor, Admin Wing', description: 'Personnel and establishment management' },
      { _id: '66d100000000000000000008', name: 'Airport Operations', code: 'OPS', floor: 'Terminal Building, Level 2', description: 'Terminal operations and airside management' }
    ];

    list.forEach(item => {
      memoryDepartments.set(item._id, {
        ...item,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
  }
};

seedDepartments();

export const departmentRepository = {
  findAll: async () => {
    if (mongoose.connection.readyState === 1) {
      return Department.find({ isActive: true }).sort({ name: 1 });
    }
    return Array.from(memoryDepartments.values())
      .filter(d => d.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  findById: async (id) => {
    if (mongoose.connection.readyState === 1) {
      return Department.findById(id);
    }
    return memoryDepartments.get(id.toString()) || null;
  },

  findByNameOrCode: async (name, code) => {
    if (mongoose.connection.readyState === 1) {
      return Department.findOne({
        $or: [
          { name: { $regex: new RegExp(`^${name}$`, 'i') } },
          { code: code.toUpperCase() }
        ]
      });
    }
    for (const d of memoryDepartments.values()) {
      if (d.name.toLowerCase() === name.toLowerCase() || d.code.toUpperCase() === code.toUpperCase()) {
        return d;
      }
    }
    return null;
  },

  create: async (data) => {
    if (mongoose.connection.readyState === 1) {
      const dept = new Department(data);
      return dept.save();
    }
    const id = new mongoose.Types.ObjectId().toString();
    const newDept = {
      _id: id,
      ...data,
      code: data.code.toUpperCase().trim(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryDepartments.set(id, newDept);
    return newDept;
  }
};
