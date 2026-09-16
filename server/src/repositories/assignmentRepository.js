import mongoose from 'mongoose';
import AssetAssignment from '../models/AssetAssignment.js';
import { assetRepository } from './assetRepository.js';
import { employeeRepository } from './employeeRepository.js';
import { relationshipRepository } from './relationshipRepository.js';
import { generateAssignmentId, generateAssignmentIdAsync } from '../utils/idGenerator.js';
import { escapeRegex } from '../utils/regexHelper.js';
import { logger } from '../utils/logger.js';

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
        remarks: 'Field laptop assignment'
      },
      {
        _id: '66d500000000000000000004',
        assignmentId: 'AAI-ASG-2024-00004',
        assetId: 'AAI-REG-PC-2024-0003',
        assetName: 'HP ProDesk 600 G6 Tower Workstation',
        employeeId: 'AAI-10950',
        employeeName: 'Amit Sharma',
        department: 'Air Traffic Management',
        floor: '3rd Floor, ATC Tower',
        designation: 'Junior Executive (ATC)',
        assignedDate: new Date('2024-01-20T09:00:00Z'),
        returnedDate: null,
        status: 'ACTIVE',
        conditionAtAssignment: 'GOOD',
        conditionAtReturn: null,
        transferReason: 'Tower replacement terminal allocation',
        assignedBy: 'admin',
        returnedBy: null,
        remarks: 'Replacement allocation for ATC workstation'
      },
      {
        _id: '66d500000000000000000005',
        assignmentId: 'AAI-ASG-2023-00005',
        assetId: 'AAI-REG-PRT-2023-0004',
        assetName: 'HP LaserJet Pro MFP M428fdw',
        employeeId: 'AAI-10842',
        employeeName: 'Roshan R',
        department: 'Communication, Navigation & Surveillance',
        floor: '2nd Floor, Technical Block',
        designation: 'Assistant Manager (CNS)',
        assignedDate: new Date('2023-05-10T10:00:00Z'),
        returnedDate: null,
        status: 'ACTIVE',
        conditionAtAssignment: 'GOOD',
        conditionAtReturn: null,
        transferReason: 'Network printer assignment for CNS Technical Section',
        assignedBy: 'admin',
        returnedBy: null,
        remarks: 'Shared department network multifunction printer'
      },
      {
        _id: '66d500000000000000000006',
        assignmentId: 'AAI-ASG-2024-00006',
        assetId: 'AAI-REG-UPS-2024-0009',
        assetName: 'APC Smart-UPS 1500VA LCD',
        employeeId: 'AAI-10950',
        employeeName: 'Amit Sharma',
        department: 'Air Traffic Management',
        floor: '3rd Floor, ATC Tower',
        designation: 'Junior Executive (ATC)',
        assignedDate: new Date('2024-02-01T09:00:00Z'),
        returnedDate: null,
        status: 'ACTIVE',
        conditionAtAssignment: 'GOOD',
        conditionAtReturn: null,
        transferReason: 'Dedicated power backup for ATC tower workstation',
        assignedBy: 'admin',
        returnedBy: null,
        remarks: 'Dedicated UPS attached to tower workstation'
      }
    ];

    list.forEach(item => memoryAssignments.set(item.assignmentId, item));
  }
};

seedAssignments();

/**
 * Executes a callback within a MongoDB multi-document transaction with graceful fallback
 */
const withTransaction = async (operation) => {
  if (mongoose.connection.readyState !== 1) {
    return operation(null);
  }

  const session = await mongoose.startSession();
  try {
    let result;
    try {
      await session.withTransaction(async () => {
        result = await operation(session);
      });
      return result;
    } catch (txnError) {
      if (txnError.message && (
        txnError.message.includes('replica set') ||
        txnError.message.includes('Transaction numbers') ||
        txnError.message.includes('standalone')
      )) {
        logger.warn(`Transactions not supported on current MongoDB topology: ${txnError.message}. Executing directly.`);
        return operation(null);
      }
      throw txnError;
    }
  } finally {
    await session.endSession();
  }
};

export const assignmentRepository = {
  findPaginated: async (options = {}) => {
    seedAssignments();
    const {
      page = 1,
      limit = 10,
      status,
      assetId,
      employeeId,
      search
    } = options;

    const skip = (Number(page) - 1) * Number(limit);

    if (mongoose.connection.readyState === 1) {
      const query = {};
      if (status) query.status = status;
      if (assetId) query.assetId = assetId.trim().toUpperCase();
      if (employeeId) query.employeeId = employeeId.trim().toUpperCase();
      if (search) {
        const regex = new RegExp(escapeRegex(search), 'i');
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

  findCurrentAssignment: async (assetId, session = null) => {
    if (mongoose.connection.readyState === 1) {
      const q = AssetAssignment.findOne({
        assetId: assetId.trim().toUpperCase(),
        status: 'ACTIVE'
      }).sort({ assignedDate: -1 });
      if (session) q.session(session);
      return q;
    }

    for (const a of memoryAssignments.values()) {
      if (a.assetId.toUpperCase() === assetId.trim().toUpperCase() && a.status === 'ACTIVE') {
        return a;
      }
    }
    return null;
  },

  findByAssetId: async (assetId) => {
    if (mongoose.connection.readyState === 1) {
      return AssetAssignment.find({
        assetId: assetId.trim().toUpperCase()
      }).sort({ assignedDate: -1 });
    }

    const matches = [];
    for (const a of memoryAssignments.values()) {
      if (a.assetId.toUpperCase() === assetId.trim().toUpperCase()) {
        matches.push(a);
      }
    }
    matches.sort((a, b) => new Date(b.assignedDate) - new Date(a.assignedDate));
    return matches;
  },

  findByEmployeeId: async (employeeId) => {
    if (mongoose.connection.readyState === 1) {
      return AssetAssignment.find({
        employeeId: employeeId.trim().toUpperCase()
      }).sort({ assignedDate: -1 });
    }

    const matches = [];
    for (const a of memoryAssignments.values()) {
      if (a.employeeId.toUpperCase() === employeeId.trim().toUpperCase()) {
        matches.push(a);
      }
    }
    matches.sort((a, b) => new Date(b.assignedDate) - new Date(a.assignedDate));
    return matches;
  },

  /**
   * Internal assign logic supporting external Mongoose session
   */
  assignAssetInternal: async ({
    assetId,
    employeeId,
    condition = 'GOOD',
    transferReason = 'Initial Staff Assignment',
    remarks = '',
    assignedBy = 'admin',
    cascadeComponents = false,
    session = null
  }) => {
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

    // 4. Generate collision-free assignment ID
    const assignmentId = await generateAssignmentIdAsync(session);

    const assignmentData = {
      assignmentId,
      assetId: asset.assetId,
      assetName: asset.assetName,
      employeeId: employee.employeeId,
      employeeName: employee.name,
      department: employee.department,
      floor: employee.floor,
      designation: employee.designation,
      // Capture employee classification snapshot at time of custody event
      employeeType: employee.employeeType || 'AAI',
      employmentCategory: employee.employmentCategory || '',
      contractorName: employee.contractorName || '',
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
      savedAssignment = await doc.save(session ? { session } : undefined);
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
    // GUARD: Only Asset fields are mutated. Employee collection is NEVER touched.
    await assetRepository.update(asset.assetId, {
      status: 'ASSIGNED',
      condition,
      currentEmployeeId: employee.employeeId,
      currentEmployeeName: employee.name,
      currentDesignation: employee.designation,
      currentAssignmentDate: new Date(),
      currentEmployeeType: employee.employeeType || 'AAI',
      currentEmploymentCategory: employee.employmentCategory || '',
      currentContractorName: employee.contractorName || '',
      department: employee.department,
      floor: employee.floor
    }, { session });

    // 6. Optional cascading assignment for linked components
    if (cascadeComponents) {
      const components = await relationshipRepository.findComponents(asset.assetId);
      for (const comp of components) {
        if (comp.relationshipType !== 'COMPONENT_OF') continue;
        if (comp.asset && comp.asset.status === 'AVAILABLE') {
          try {
            await assignmentRepository.assignAssetInternal({
              assetId: comp.asset.assetId,
              employeeId: employee.employeeId,
              assignedBy,
              remarks: `Cascaded assignment from parent workstation ${asset.assetId}`,
              cascadeComponents: false,
              session
            });
          } catch (e) {
            // Component could already be assigned
          }
        }
      }
    }

    return savedAssignment;
  },

  /**
   * Assign an AVAILABLE asset to an employee (Atomic Transaction)
   */
  assignAsset: async (params) => {
    return withTransaction(async (session) => {
      return assignmentRepository.assignAssetInternal({ ...params, session });
    });
  },

  /**
   * Internal transfer logic supporting external session
   */
  transferAssetInternal: async ({
    assetId,
    toEmployeeId,
    transferReason,
    conditionAtReturn = 'GOOD',
    conditionAtNewAssignment = 'GOOD',
    remarks = '',
    processedBy = 'admin',
    cascadeComponents = true,
    session = null
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

    const previousCustodianId = asset.currentEmployeeId;
    const now = new Date();

    // 4. Close current active assignment
    const currentAssignment = await assignmentRepository.findCurrentAssignment(asset.assetId, session);
    if (currentAssignment) {
      if (mongoose.connection.readyState === 1) {
        const updateOpts = { new: true };
        if (session) updateOpts.session = session;
        await AssetAssignment.findByIdAndUpdate(currentAssignment._id, {
          status: 'TRANSFERRED',
          returnedDate: now,
          conditionAtReturn,
          returnedBy: processedBy,
          remarks: remarks ? `${currentAssignment.remarks} | Transfer: ${remarks}` : currentAssignment.remarks
        }, updateOpts);
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
    const newAssignmentId = await generateAssignmentIdAsync(session);

    const newAssignmentData = {
      assignmentId: newAssignmentId,
      assetId: asset.assetId,
      assetName: asset.assetName,
      employeeId: targetEmployee.employeeId,
      employeeName: targetEmployee.name,
      department: targetEmployee.department,
      floor: targetEmployee.floor,
      designation: targetEmployee.designation,
      // Capture classification snapshot at time of transfer
      employeeType: targetEmployee.employeeType || 'AAI',
      employmentCategory: targetEmployee.employmentCategory || '',
      contractorName: targetEmployee.contractorName || '',
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
      savedNewAssignment = await doc.save(session ? { session } : undefined);
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
    // GUARD: Only Asset fields are mutated. Employee collection is NEVER touched.
    await assetRepository.update(asset.assetId, {
      status: 'ASSIGNED',
      condition: conditionAtNewAssignment,
      currentEmployeeId: targetEmployee.employeeId,
      currentEmployeeName: targetEmployee.name,
      currentDesignation: targetEmployee.designation,
      currentAssignmentDate: now,
      currentEmployeeType: targetEmployee.employeeType || 'AAI',
      currentEmploymentCategory: targetEmployee.employmentCategory || '',
      currentContractorName: targetEmployee.contractorName || '',
      department: targetEmployee.department,
      floor: targetEmployee.floor
    }, { session });

    // 7. Symmetrical Cascading Transfer for attached components
    if (cascadeComponents) {
      const components = await relationshipRepository.findComponents(asset.assetId);
      for (const comp of components) {
        if (comp.relationshipType !== 'COMPONENT_OF') continue;
        if (comp.asset && comp.asset.currentEmployeeId === previousCustodianId) {
          try {
            await assignmentRepository.transferAssetInternal({
              assetId: comp.asset.assetId,
              toEmployeeId,
              transferReason: `Cascaded transfer with parent workstation ${asset.assetId}`,
              conditionAtReturn,
              conditionAtNewAssignment,
              processedBy,
              cascadeComponents: false,
              session
            });
          } catch (e) {
            // Attached component transfer notice
          }
        }
      }
    }

    return {
      previousAssignment: currentAssignment,
      newAssignment: savedNewAssignment
    };
  },

  /**
   * Transfer an ASSIGNED asset from current custodian to a new employee (Atomic Transaction)
   */
  transferAsset: async (params) => {
    return withTransaction(async (session) => {
      return assignmentRepository.transferAssetInternal({ ...params, session });
    });
  },

  /**
   * Internal return logic supporting external session
   */
  returnAssetInternal: async ({
    assetId,
    returnReason = 'Returned to IT Store / Inventory Pool',
    conditionAtReturn = 'GOOD',
    remarks = '',
    processedBy = 'admin',
    cascadeComponents = true,
    session = null
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

    const previousCustodianId = asset.currentEmployeeId;
    const now = new Date();

    // 2. Close current active assignment
    const currentAssignment = await assignmentRepository.findCurrentAssignment(asset.assetId, session);
    if (currentAssignment) {
      if (mongoose.connection.readyState === 1) {
        const updateOpts = { new: true };
        if (session) updateOpts.session = session;
        await AssetAssignment.findByIdAndUpdate(currentAssignment._id, {
          status: 'RETURNED',
          returnedDate: now,
          conditionAtReturn,
          returnedBy: processedBy,
          remarks: remarks ? `${currentAssignment.remarks} | Return: ${remarks}` : currentAssignment.remarks
        }, updateOpts);
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
    }, { session });

    // 4. Symmetrical Cascading Return for attached components
    if (cascadeComponents) {
      const components = await relationshipRepository.findComponents(asset.assetId);
      for (const comp of components) {
        if (comp.relationshipType !== 'COMPONENT_OF') continue;
        if (comp.asset && comp.asset.currentEmployeeId === previousCustodianId) {
          try {
            await assignmentRepository.returnAssetInternal({
              assetId: comp.asset.assetId,
              returnReason: `Cascaded return with parent workstation ${asset.assetId}`,
              conditionAtReturn,
              processedBy,
              cascadeComponents: false,
              session
            });
          } catch (e) {
            // Attached component return notice
          }
        }
      }
    }

    return {
      closedAssignment: currentAssignment,
      assetId: asset.assetId,
      status: 'AVAILABLE'
    };
  },

  /**
   * Return an ASSIGNED asset back to IT inventory pool (unassign) (Atomic Transaction)
   */
  returnAsset: async (params) => {
    return withTransaction(async (session) => {
      return assignmentRepository.returnAssetInternal({ ...params, session });
    });
  }
};

assignmentRepository.find = assignmentRepository.findPaginated;
assignmentRepository.findHistoryByAsset = assignmentRepository.findByAssetId;
assignmentRepository.findByAsset = assignmentRepository.findByAssetId;
assignmentRepository.findByEmployee = assignmentRepository.findByEmployeeId;

export default assignmentRepository;
