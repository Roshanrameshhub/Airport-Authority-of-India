import mongoose from 'mongoose';
import AssetAssignment from '../models/AssetAssignment.js';
import { assetRepository } from './assetRepository.js';
import { employeeRepository } from './employeeRepository.js';
import { generateAssignmentId } from '../utils/idGenerator.js';

const memoryAssignments = new Map();

const seedAssignments = () => {
  if (memoryAssignments.size === 0) {
    const list = [
      {
        _id: '66d500000000000000000001',
        assignmentId: 'AAI-ASG-2023-00001',
        assetId: 'AAI-REG-PC-2024-0001',
        assetName: 'Dell OptiPlex 7090 MT Workstation',
        employeeId: 'AAI-10950',
        employeeName: 'Amit Sharma',
        department: 'Air Traffic Management',
        floor: '3rd Floor, ATC Tower',
        designation: 'Junior Executive (ATC)',
        assignedDate: new Date('2023-08-01T09:00:00Z'),
        returnedDate: new Date('2024-01-15T10:00:00Z'),
        status: 'TRANSFERRED',
        conditionAtAssignment: 'EXCELLENT',
        conditionAtReturn: 'GOOD',
        transferReason: 'Inter-departmental transfer to CNS Radar Processing Unit',
        assignedBy: 'admin',
        returnedBy: 'admin',
        remarks: 'Original allocation for ATC tower monitoring'
      },
      {
        _id: '66d500000000000000000002',
        assignmentId: 'AAI-ASG-2024-00002',
        assetId: 'AAI-REG-PC-2024-0001',
        assetName: 'Dell OptiPlex 7090 MT Workstation',
        employeeId: 'AAI-10842',
        employeeName: 'Roshan R',
        department: 'Communication, Navigation & Surveillance',
        floor: '2nd Floor, Technical Block',
        designation: 'Assistant Manager (CNS)',
        assignedDate: new Date('2024-01-16T10:00:00Z'),
        returnedDate: null,
        status: 'ACTIVE',
        conditionAtAssignment: 'GOOD',
        conditionAtReturn: null,
        transferReason: 'Reassigned for CNS Radar Data Processing unit',
        assignedBy: 'admin',
        returnedBy: null,
        remarks: 'Permanent station assignment'
      },
      {
        _id: '66d500000000000000000003',
        assignmentId: 'AAI-ASG-2024-00003',
        assetId: 'AAI-REG-LPT-2024-0002',
        assetName: 'Dell Latitude 5420 Laptop',
        employeeId: 'AAI-10842',
        employeeName: 'Roshan R',
        department: 'Communication, Navigation & Surveillance',
        floor: '2nd Floor, Technical Block',
        designation: 'Assistant Manager (CNS)',
        assignedDate: new Date('2024-03-11T11:00:00Z'),
        returnedDate: null,
        status: 'ACTIVE',
        conditionAtAssignment: 'EXCELLENT',
        conditionAtReturn: null,
        transferReason: 'Official mobility equipment for CNS technical monitoring',
        assignedBy: 'admin',
        returnedBy: null,
        remarks: 'Pre-loaded with CNS monitoring tools'
      },
      {
        _id: '66d500000000000000000004',
        assignmentId: 'AAI-ASG-2024-00004',
        assetId: 'AAI-REG-LPT-2024-0003',
        assetName: 'HP EliteBook 840 G8',
        employeeId: 'AAI-10999',
        employeeName: 'Kavitha K',
        department: 'Finance & Accounts',
        floor: '1st Floor, Main Admin Wing',
        designation: 'Senior Accountant',
        assignedDate: new Date('2024-02-05T09:30:00Z'),
        returnedDate: null,
        status: 'ACTIVE',
        conditionAtAssignment: 'EXCELLENT',
        conditionAtReturn: null,
        transferReason: 'ERP billing & accounts workstation',
        assignedBy: 'admin',
        returnedBy: null,
        remarks: 'SAP ERP client installed'
      }
    ];

    list.forEach(item => {
      memoryAssignments.set(item.assignmentId, item);
    });
  }
};

seedAssignments();

export const assignmentRepository = {
  findCurrentAssignment: async (assetId) => {
    const aid = assetId.trim().toUpperCase();
    if (mongoose.connection.readyState === 1) {
      return AssetAssignment.findOne({ assetId: aid, status: 'ACTIVE' });
    }
    for (const a of memoryAssignments.values()) {
      if (a.assetId.toUpperCase() === aid && a.status === 'ACTIVE') {
        return a;
      }
    }
    return null;
  },

  findHistoryByAsset: async (assetId) => {
    const aid = assetId.trim().toUpperCase();
    if (mongoose.connection.readyState === 1) {
      return AssetAssignment.find({ assetId: aid }).sort({ assignedDate: -1 });
    }
    const history = [];
    for (const a of memoryAssignments.values()) {
      if (a.assetId.toUpperCase() === aid) {
        history.push(a);
      }
    }
    return history.sort((a, b) => new Date(b.assignedDate) - new Date(a.assignedDate));
  },

  findByEmployee: async (employeeId, options = {}) => {
    const eid = employeeId.trim().toUpperCase();
    const { status } = options;

    if (mongoose.connection.readyState === 1) {
      const query = { employeeId: eid };
      if (status) query.status = status;
      return AssetAssignment.find(query).sort({ assignedDate: -1 });
    }

    const results = [];
    for (const a of memoryAssignments.values()) {
      if (a.employeeId.toUpperCase() === eid) {
        if (!status || a.status === status) {
          results.push(a);
        }
      }
    }
    return results.sort((a, b) => new Date(b.assignedDate) - new Date(a.assignedDate));
  },

  findPaginated: async (options = {}) => {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      assetId,
      employeeId
    } = options;

    const skip = (Number(page) - 1) * Number(limit);

    if (mongoose.connection.readyState === 1) {
      const query = {};
      if (status) query.status = status;
      if (assetId) query.assetId = assetId.trim().toUpperCase();
      if (employeeId) query.employeeId = employeeId.trim().toUpperCase();
      if (search) {
        const regex = new RegExp(search, 'i');
        query.$or = [
          { assignmentId: regex },
          { assetId: regex },
          { assetName: regex },
          { employeeName: regex },
          { employeeId: regex },
          { department: regex }
        ];
      }

      const total = await AssetAssignment.countDocuments(query);
      const items = await AssetAssignment.find(query)
        .sort({ assignedDate: -1 })
        .skip(skip)
        .limit(Number(limit));

      return { items, total };
    }

    // In-memory fallback
    let list = Array.from(memoryAssignments.values());

    if (status) list = list.filter(a => a.status === status);
    if (assetId) list = list.filter(a => a.assetId.toUpperCase() === assetId.trim().toUpperCase());
    if (employeeId) list = list.filter(a => a.employeeId.toUpperCase() === employeeId.trim().toUpperCase());

    if (search) {
      const s = search.toLowerCase();
      list = list.filter(a =>
        a.assignmentId.toLowerCase().includes(s) ||
        a.assetId.toLowerCase().includes(s) ||
        (a.assetName && a.assetName.toLowerCase().includes(s)) ||
        a.employeeName.toLowerCase().includes(s) ||
        a.employeeId.toLowerCase().includes(s) ||
        a.department.toLowerCase().includes(s)
      );
    }

    list.sort((a, b) => new Date(b.assignedDate) - new Date(a.assignedDate));
    const total = list.length;
    const items = list.slice(skip, skip + Number(limit));

    return { items, total };
  },

  findById: async (id) => {
    if (mongoose.connection.readyState === 1) {
      if (mongoose.isValidObjectId(id)) {
        return AssetAssignment.findById(id);
      }
      return AssetAssignment.findOne({ assignmentId: id.toUpperCase() });
    }

    for (const a of memoryAssignments.values()) {
      if (a._id === id || a.assignmentId.toUpperCase() === id.toUpperCase()) {
        return a;
      }
    }
    return null;
  },

  /**
   * Assign an AVAILABLE asset to an employee
   */
  assignAsset: async ({ assetId, employeeId, condition = 'GOOD', transferReason = 'Initial Staff Assignment', remarks = '', assignedBy = 'admin' }) => {
    // 1. Fetch asset
    const asset = await assetRepository.findById(assetId);
    if (!asset) {
      const err = new Error(`Asset with ID '${assetId}' not found`);
      err.statusCode = 404;
      throw err;
    }

    // 2. Lifecycle status check: must be AVAILABLE
    if (asset.status === 'ASSIGNED') {
      const err = new Error(`Asset '${asset.assetId}' is already assigned to ${asset.currentEmployeeName} (${asset.currentEmployeeId}). Use the Transfer action instead.`);
      err.statusCode = 400;
      throw err;
    }

    if (asset.status === 'RETIRED' || asset.status === 'DISPOSED') {
      const err = new Error(`Cannot assign retired or disposed asset '${asset.assetId}'`);
      err.statusCode = 400;
      throw err;
    }

    if (asset.status === 'UNDER_MAINTENANCE' || asset.status === 'DAMAGED') {
      const err = new Error(`Cannot assign asset '${asset.assetId}' because its status is ${asset.status}`);
      err.statusCode = 400;
      throw err;
    }

    // 3. Fetch employee
    const employee = await employeeRepository.findByEmployeeId(employeeId);
    if (!employee) {
      const err = new Error(`Employee with ID '${employeeId}' not found`);
      err.statusCode = 404;
      throw err;
    }

    if (!employee.isActive) {
      const err = new Error(`Cannot assign asset to inactive employee '${employee.name}' (${employee.employeeId})`);
      err.statusCode = 400;
      throw err;
    }

    // 4. Generate assignment ID
    const assignmentSeq = memoryAssignments.size + 1;
    const assignmentId = generateAssignmentId(assignmentSeq);

    const assignmentData = {
      assignmentId,
      assetId: asset.assetId,
      assetName: asset.assetName,
      employeeId: employee.employeeId,
      employeeName: employee.name,
      department: employee.department,
      floor: employee.floor,
      designation: employee.designation,
      assignedDate: new Date(),
      returnedDate: null,
      status: 'ACTIVE',
      conditionAtAssignment: condition,
      conditionAtReturn: null,
      transferReason,
      assignedBy,
      returnedBy: null,
      remarks
    };

    let savedAssignment;
    if (mongoose.connection.readyState === 1) {
      const doc = new AssetAssignment(assignmentData);
      savedAssignment = await doc.save();
    } else {
      const id = new mongoose.Types.ObjectId().toString();
      savedAssignment = {
        _id: id,
        ...assignmentData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryAssignments.set(assignmentId, savedAssignment);
    }

    // 5. Update Asset to ASSIGNED status and record current custodian
    await assetRepository.update(asset.assetId, {
      status: 'ASSIGNED',
      condition,
      currentEmployeeId: employee.employeeId,
      currentEmployeeName: employee.name,
      currentDesignation: employee.designation,
      currentAssignmentDate: new Date(),
      department: employee.department,
      floor: employee.floor
    });

    return savedAssignment;
  },

  /**
   * Transfer an ASSIGNED asset from current custodian to a new employee
   * Immutably closes previous assignment and creates a new one
   */
  transferAsset: async ({
    assetId,
    toEmployeeId,
    transferReason,
    conditionAtReturn = 'GOOD',
    conditionAtNewAssignment = 'GOOD',
    remarks = '',
    processedBy = 'admin'
  }) => {
    // 1. Fetch asset
    const asset = await assetRepository.findById(assetId);
    if (!asset) {
      const err = new Error(`Asset with ID '${assetId}' not found`);
      err.statusCode = 404;
      throw err;
    }

    if (asset.status !== 'ASSIGNED') {
      const err = new Error(`Asset '${asset.assetId}' cannot be transferred because its status is ${asset.status}. Only ASSIGNED assets can be transferred.`);
      err.statusCode = 400;
      throw err;
    }

    // 2. Guardrail: Cannot transfer to same employee
    if (asset.currentEmployeeId && asset.currentEmployeeId.toUpperCase() === toEmployeeId.trim().toUpperCase()) {
      const err = new Error(`Asset '${asset.assetId}' is already assigned to employee '${toEmployeeId}'. Cannot transfer an asset to its current custodian.`);
      err.statusCode = 400;
      throw err;
    }

    // 3. Fetch target employee
    const targetEmployee = await employeeRepository.findByEmployeeId(toEmployeeId);
    if (!targetEmployee) {
      const err = new Error(`Target employee with ID '${toEmployeeId}' not found`);
      err.statusCode = 404;
      throw err;
    }

    if (!targetEmployee.isActive) {
      const err = new Error(`Cannot transfer asset to inactive employee '${targetEmployee.name}' (${targetEmployee.employeeId})`);
      err.statusCode = 400;
      throw err;
    }

    const now = new Date();

    // 4. Close current active assignment
    const currentAssignment = await assignmentRepository.findCurrentAssignment(asset.assetId);
    if (currentAssignment) {
      if (mongoose.connection.readyState === 1) {
        await AssetAssignment.findByIdAndUpdate(currentAssignment._id, {
          status: 'TRANSFERRED',
          returnedDate: now,
          conditionAtReturn,
          returnedBy: processedBy,
          remarks: remarks ? `${currentAssignment.remarks} | Transfer: ${remarks}` : currentAssignment.remarks
        });
      } else {
        currentAssignment.status = 'TRANSFERRED';
        currentAssignment.returnedDate = now;
        currentAssignment.conditionAtReturn = conditionAtReturn;
        currentAssignment.returnedBy = processedBy;
        if (remarks) {
          currentAssignment.remarks = currentAssignment.remarks
            ? `${currentAssignment.remarks} | Transfer: ${remarks}`
            : remarks;
        }
        currentAssignment.updatedAt = now;
      }
    }

    // 5. Create new active assignment for target employee
    const newSeq = memoryAssignments.size + 1;
    const newAssignmentId = generateAssignmentId(newSeq);

    const newAssignmentData = {
      assignmentId: newAssignmentId,
      assetId: asset.assetId,
      assetName: asset.assetName,
      employeeId: targetEmployee.employeeId,
      employeeName: targetEmployee.name,
      department: targetEmployee.department,
      floor: targetEmployee.floor,
      designation: targetEmployee.designation,
      assignedDate: now,
      returnedDate: null,
      status: 'ACTIVE',
      conditionAtAssignment: conditionAtNewAssignment,
      conditionAtReturn: null,
      transferReason,
      assignedBy: processedBy,
      returnedBy: null,
      remarks
    };

    let savedNewAssignment;
    if (mongoose.connection.readyState === 1) {
      const doc = new AssetAssignment(newAssignmentData);
      savedNewAssignment = await doc.save();
    } else {
      const id = new mongoose.Types.ObjectId().toString();
      savedNewAssignment = {
        _id: id,
        ...newAssignmentData,
        createdAt: now,
        updatedAt: now
      };
      memoryAssignments.set(newAssignmentId, savedNewAssignment);
    }

    // 6. Update Asset record with new custodian details
    await assetRepository.update(asset.assetId, {
      status: 'ASSIGNED',
      condition: conditionAtNewAssignment,
      currentEmployeeId: targetEmployee.employeeId,
      currentEmployeeName: targetEmployee.name,
      currentDesignation: targetEmployee.designation,
      currentAssignmentDate: now,
      department: targetEmployee.department,
      floor: targetEmployee.floor
    });

    return {
      previousAssignment: currentAssignment,
      newAssignment: savedNewAssignment
    };
  },

  /**
   * Return an ASSIGNED asset back to IT inventory pool (unassign)
   */
  returnAsset: async ({
    assetId,
    returnReason = 'Returned to IT Store / Inventory Pool',
    conditionAtReturn = 'GOOD',
    remarks = '',
    processedBy = 'admin'
  }) => {
    // 1. Fetch asset
    const asset = await assetRepository.findById(assetId);
    if (!asset) {
      const err = new Error(`Asset with ID '${assetId}' not found`);
      err.statusCode = 404;
      throw err;
    }

    if (asset.status !== 'ASSIGNED') {
      const err = new Error(`Asset '${asset.assetId}' is not currently assigned (status: ${asset.status})`);
      err.statusCode = 400;
      throw err;
    }

    const now = new Date();

    // 2. Close current active assignment
    const currentAssignment = await assignmentRepository.findCurrentAssignment(asset.assetId);
    if (currentAssignment) {
      if (mongoose.connection.readyState === 1) {
        await AssetAssignment.findByIdAndUpdate(currentAssignment._id, {
          status: 'RETURNED',
          returnedDate: now,
          conditionAtReturn,
          returnedBy: processedBy,
          remarks: remarks ? `${currentAssignment.remarks} | Return: ${remarks}` : currentAssignment.remarks
        });
      } else {
        currentAssignment.status = 'RETURNED';
        currentAssignment.returnedDate = now;
        currentAssignment.conditionAtReturn = conditionAtReturn;
        currentAssignment.returnedBy = processedBy;
        if (remarks) {
          currentAssignment.remarks = currentAssignment.remarks
            ? `${currentAssignment.remarks} | Return: ${remarks}`
            : remarks;
        }
        currentAssignment.updatedAt = now;
      }
    }

    // 3. Update Asset record to AVAILABLE pool
    await assetRepository.update(asset.assetId, {
      status: 'AVAILABLE',
      condition: conditionAtReturn,
      currentEmployeeId: null,
      currentEmployeeName: '',
      currentDesignation: '',
      currentAssignmentDate: null,
      floor: 'IT Store / Pool',
      remarks: `${asset.remarks || ''} [Returned on ${now.toISOString().split('T')[0]}: ${returnReason}]`.trim()
    });

    return {
      closedAssignment: currentAssignment,
      assetId: asset.assetId,
      status: 'AVAILABLE'
    };
  }
};

assignmentRepository.find = assignmentRepository.findPaginated;
