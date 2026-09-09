import mongoose from 'mongoose';
import Employee from '../models/Employee.js';

const memoryEmployees = new Map();

const seedEmployees = () => {
  if (memoryEmployees.size === 0) {
    const list = [
      {
        _id: '66d300000000000000000001',
        employeeId: 'AAI-10842',
        name: 'Roshan R',
        designation: 'Assistant Manager (CNS)',
        department: 'Communication, Navigation & Surveillance',
        floor: '2nd Floor, Technical Block',
        email: 'roshan.r@aai.aero',
        phone: '+91 98401 23456',
        isActive: true,
        assignedAssetsCount: 3
      },
      {
        _id: '66d300000000000000000002',
        employeeId: 'AAI-ADM-001',
        name: 'AAI Regional Admin',
        designation: 'Senior IT Manager',
        department: 'Information Technology',
        floor: '2nd Floor, Admin Block',
        email: 'admin@aai.aero',
        phone: '+91 98401 11111',
        isActive: true,
        assignedAssetsCount: 2
      },
      {
        _id: '66d300000000000000000003',
        employeeId: 'AAI-10950',
        name: 'Amit Sharma',
        designation: 'Junior Executive (ATC)',
        department: 'Air Traffic Management',
        floor: '3rd Floor, ATC Tower',
        email: 'amit.sharma@aai.aero',
        phone: '+91 98401 56789',
        isActive: true,
        assignedAssetsCount: 1
      },
      {
        _id: '66d300000000000000000004',
        employeeId: 'AAI-10512',
        name: 'Priya Nair',
        designation: 'Senior Superintendent (Finance)',
        department: 'Finance & Accounts',
        floor: 'Ground Floor, Admin Wing',
        email: 'priya.nair@aai.aero',
        phone: '+91 98401 88776',
        isActive: true,
        assignedAssetsCount: 2
      },
      {
        _id: '66d300000000000000000005',
        employeeId: 'AAI-10334',
        name: 'Suresh Kumar',
        designation: 'Assistant General Manager (Engg)',
        department: 'Engineering - Civil',
        floor: '1st Floor, Operational Wing',
        email: 'suresh.k@aai.aero',
        phone: '+91 98401 44332',
        isActive: true,
        assignedAssetsCount: 1
      }
    ];

    list.forEach(emp => {
      memoryEmployees.set(emp.employeeId, {
        ...emp,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
  }
};

seedEmployees();

export const employeeRepository = {
  find: async ({ search = '', department = '', floor = '', page = 1, limit = 10, isActive = true }) => {
    const skip = (Number(page) - 1) * Number(limit);

    if (mongoose.connection.readyState === 1) {
      const query = { isActive };

      if (department) {
        query.department = department;
      }
      if (floor) {
        query.floor = floor;
      }
      if (search) {
        const regex = new RegExp(search, 'i');
        query.$or = [
          { name: regex },
          { employeeId: regex },
          { designation: regex }
        ];
      }

      const total = await Employee.countDocuments(query);
      const items = await Employee.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(Number(limit));

      return { items, total };
    }

    // In-memory fallback
    let list = Array.from(memoryEmployees.values()).filter(e => e.isActive === isActive);

    if (department) {
      list = list.filter(e => e.department === department);
    }
    if (floor) {
      list = list.filter(e => e.floor === floor);
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(s) ||
        e.employeeId.toLowerCase().includes(s) ||
        e.designation.toLowerCase().includes(s)
      );
    }

    list.sort((a, b) => a.name.localeCompare(b.name));
    const total = list.length;
    const items = list.slice(skip, skip + Number(limit));

    return { items, total };
  },

  findById: async (id) => {
    if (mongoose.connection.readyState === 1) {
      if (mongoose.isValidObjectId(id)) {
        return Employee.findById(id);
      }
      return Employee.findOne({ employeeId: id.toUpperCase() });
    }

    for (const emp of memoryEmployees.values()) {
      if (emp._id === id || emp.employeeId.toUpperCase() === id.toUpperCase()) {
        return emp;
      }
    }
    return null;
  },

  findByEmployeeId: async (employeeId) => {
    const cleanId = employeeId.trim().toUpperCase();
    if (mongoose.connection.readyState === 1) {
      return Employee.findOne({ employeeId: cleanId });
    }
    return memoryEmployees.get(cleanId) || null;
  },

  create: async (data) => {
    const cleanId = data.employeeId.trim().toUpperCase();

    if (mongoose.connection.readyState === 1) {
      const emp = new Employee({
        ...data,
        employeeId: cleanId
      });
      return emp.save();
    }

    const id = new mongoose.Types.ObjectId().toString();
    const newEmp = {
      _id: id,
      ...data,
      employeeId: cleanId,
      assignedAssetsCount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryEmployees.set(cleanId, newEmp);
    return newEmp;
  },

  update: async (id, data) => {
    if (mongoose.connection.readyState === 1) {
      return Employee.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    }

    const emp = await employeeRepository.findById(id);
    if (!emp) return null;

    Object.assign(emp, data, { updatedAt: new Date() });
    if (data.employeeId && data.employeeId.toUpperCase() !== emp.employeeId) {
      memoryEmployees.delete(emp.employeeId);
      emp.employeeId = data.employeeId.toUpperCase();
      memoryEmployees.set(emp.employeeId, emp);
    }
    return emp;
  },

  delete: async (id) => {
    if (mongoose.connection.readyState === 1) {
      return Employee.findByIdAndUpdate(id, { isActive: false }, { new: true });
    }
    const emp = await employeeRepository.findById(id);
    if (emp) {
      emp.isActive = false;
      emp.updatedAt = new Date();
    }
    return emp;
  }
};
