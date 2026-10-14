import mongoose from 'mongoose';
import Employee from '../models/Employee.js';
import AssetAssignment from '../models/AssetAssignment.js';
import { generateEmployeeIdAsync } from '../utils/idGenerator.js';
import { escapeRegex } from '../utils/regexHelper.js';

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
        employeeType: 'AAI',
        employmentCategory: 'Regular',
        contractorName: '',
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
        employeeType: 'AAI',
        employmentCategory: 'Regular',
        contractorName: '',
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
        employeeType: 'AAI',
        employmentCategory: 'Regular',
        contractorName: '',
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
        employeeType: 'AAI',
        employmentCategory: 'Regular',
        contractorName: '',
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
        employeeType: 'AAI',
        employmentCategory: 'Regular',
        contractorName: '',
        isActive: true,
        assignedAssetsCount: 1
      },
      {
        _id: '66d300000000000000000006',
        employeeId: 'AAI-CNT-8801',
        name: 'Rajesh Verma',
        designation: 'Hardware Support Technician',
        department: 'Information Technology',
        floor: '1st Floor, IT Operations',
        email: 'rajesh.contractor@aai.aero',
        phone: '+91 98401 99887',
        employeeType: 'Contract',
        employmentCategory: 'Outsourced',
        contractorName: 'Skyline IT Services Pvt Ltd',
        isActive: true,
        assignedAssetsCount: 0
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

const getActiveAssignmentCount = async (employeeId) => {
  if (!employeeId) return 0;
  if (mongoose.connection.readyState === 1) {
    try {
      return await AssetAssignment.countDocuments({
        employeeId: employeeId.trim().toUpperCase(),
        status: 'ACTIVE'
      });
    } catch {
      return 0;
    }
  }
  try {
    const { assignmentRepository } = await import('./assignmentRepository.js');
    const assignments = await assignmentRepository.findByEmployeeId(employeeId);
    return (assignments || []).filter(a => a.status === 'ACTIVE').length;
  } catch {
    return 0;
  }
};

export const employeeRepository = {
  find: async ({ search = '', department = '', floor = '', employeeType = '', employmentCategory = '', page = 1, limit = 10, isActive = true }) => {
    const skip = (Number(page) - 1) * Number(limit);

    if (mongoose.connection.readyState === 1) {
      const query = { isActive };

      if (department) {
        query.department = department;
      }
      if (floor) {
        query.floor = floor;
      }
      if (employeeType) {
        query.employeeType = employeeType;
      }
      if (employmentCategory) {
        query.employmentCategory = employmentCategory;
      }
      if (search) {
        const regex = new RegExp(escapeRegex(search), 'i');
        query.$or = [
          { name: regex },
          { employeeId: regex },
          { designation: regex },
          { contractorName: regex },
          { employmentCategory: regex }
        ];
      }

      const total = await Employee.countDocuments(query);
      const items = await Employee.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(Number(limit));

      // Authoritative dynamic active assignment count calculation
      const empIds = items.map(e => e.employeeId);
      const countMap = new Map();
      if (empIds.length > 0) {
        try {
          const counts = await AssetAssignment.aggregate([
            { $match: { employeeId: { $in: empIds }, status: 'ACTIVE' } },
            { $group: { _id: '$employeeId', count: { $sum: 1 } } }
          ]);
          counts.forEach(c => countMap.set(c._id, c.count));
        } catch (aggErr) {
          // If aggregation fails, fallback smoothly
        }
      }

      const enhancedItems = items.map(emp => {
        const obj = emp.toObject ? emp.toObject() : { ...emp };
        obj.assignedAssetsCount = countMap.get(emp.employeeId) ?? emp.assignedAssetsCount ?? 0;
        return obj;
      });

      return { items: enhancedItems, total };
    }

    // In-memory fallback
    let list = Array.from(memoryEmployees.values()).filter(e => e.isActive === isActive);

    if (department) {
      list = list.filter(e => e.department === department);
    }
    if (floor) {
      list = list.filter(e => e.floor === floor);
    }
    if (employeeType) {
      list = list.filter(e => (e.employeeType || 'AAI') === employeeType);
    }
    if (employmentCategory) {
      list = list.filter(e => (e.employmentCategory || 'Regular') === employmentCategory);
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(e =>
        (e.name || '').toLowerCase().includes(s) ||
        (e.employeeId || '').toLowerCase().includes(s) ||
        (e.designation || '').toLowerCase().includes(s) ||
        (e.contractorName || '').toLowerCase().includes(s) ||
        (e.employmentCategory || '').toLowerCase().includes(s)
      );
    }

    list.sort((a, b) => a.name.localeCompare(b.name));
    const total = list.length;
    const items = list.slice(skip, skip + Number(limit));
    const enhancedItems = await Promise.all(items.map(async (emp) => {
      const activeCount = await getActiveAssignmentCount(emp.employeeId);
      return { ...emp, assignedAssetsCount: activeCount };
    }));

    return { items: enhancedItems, total };
  },

  findById: async (id) => {
    if (mongoose.connection.readyState === 1) {
      let emp;
      if (mongoose.isValidObjectId(id)) {
        emp = await Employee.findById(id);
      } else {
        emp = await Employee.findOne({ employeeId: id.toUpperCase() });
      }
      if (!emp) return null;
      try {
        const activeCount = await getActiveAssignmentCount(emp.employeeId);
        const obj = emp.toObject ? emp.toObject() : { ...emp };
        obj.assignedAssetsCount = activeCount;
        return obj;
      } catch (err) {
        return emp;
      }
    }

    for (const emp of memoryEmployees.values()) {
      if (emp._id === id || emp.employeeId.toUpperCase() === id.toUpperCase()) {
        const activeCount = await getActiveAssignmentCount(emp.employeeId);
        return { ...emp, assignedAssetsCount: activeCount };
      }
    }
    return null;
  },

  findByEmployeeId: async (employeeId) => {
    const cleanId = employeeId.trim().toUpperCase();
    if (mongoose.connection.readyState === 1) {
      const emp = await Employee.findOne({ employeeId: cleanId });
      if (!emp) return null;
      try {
        const activeCount = await getActiveAssignmentCount(emp.employeeId);
        const obj = emp.toObject ? emp.toObject() : { ...emp };
        obj.assignedAssetsCount = activeCount;
        return obj;
      } catch (err) {
        return emp;
      }
    }
    const memEmp = memoryEmployees.get(cleanId);
    if (memEmp) {
      const activeCount = await getActiveAssignmentCount(memEmp.employeeId);
      return { ...memEmp, assignedAssetsCount: activeCount };
    }
    return null;
  },

  findByName: async (name) => {
    if (!name) return null;
    const cleanName = name.trim();
    if (mongoose.connection.readyState === 1) {
      return Employee.findOne({ name: new RegExp(`^${escapeRegex(cleanName)}$`, 'i') });
    }
    for (const emp of memoryEmployees.values()) {
      if (emp.name.toLowerCase() === cleanName.toLowerCase()) {
        return emp;
      }
    }
    return null;
  },

  create: async (data) => {
    let cleanId = data.employeeId ? data.employeeId.trim().toUpperCase() : '';
    if (!cleanId) {
      cleanId = await generateEmployeeIdAsync();
    }

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
      if (mongoose.isValidObjectId(id)) {
        return Employee.findByIdAndUpdate(id, data, { new: true, runValidators: true });
      }
      return Employee.findOneAndUpdate({ employeeId: id.toUpperCase() }, data, { new: true, runValidators: true });
    }

    for (const [key, emp] of memoryEmployees.entries()) {
      if (emp._id === id || emp.employeeId.toUpperCase() === id.toUpperCase()) {
        Object.assign(emp, data, { updatedAt: new Date() });
        if (data.employeeId && data.employeeId.toUpperCase() !== emp.employeeId) {
          memoryEmployees.delete(key);
          emp.employeeId = data.employeeId.toUpperCase();
          memoryEmployees.set(emp.employeeId, emp);
        } else {
          memoryEmployees.set(key, emp);
        }
        return emp;
      }
    }
    return null;
  },

  delete: async (id) => {
    if (mongoose.connection.readyState === 1) {
      if (mongoose.isValidObjectId(id)) {
        return Employee.findByIdAndUpdate(id, { isActive: false }, { new: true });
      }
      return Employee.findOneAndUpdate({ employeeId: id.toUpperCase() }, { isActive: false }, { new: true });
    }
    for (const [key, emp] of memoryEmployees.entries()) {
      if (emp._id === id || emp.employeeId.toUpperCase() === id.toUpperCase()) {
        emp.isActive = false;
        emp.updatedAt = new Date();
        memoryEmployees.set(key, emp);
        return emp;
      }
    }
    return null;
  }
};
