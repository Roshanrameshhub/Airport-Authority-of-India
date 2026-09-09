import mongoose from 'mongoose';
import Complaint from '../models/Complaint.js';
import { assetRepository } from './assetRepository.js';
import { generateTicketId } from '../utils/idGenerator.js';

const memoryComplaints = new Map();

const seedComplaints = () => {
  if (memoryComplaints.size === 0) {
    const list = [
      {
        _id: '66d600000000000000000001',
        ticketId: 'AAI-TKT-2024-0001',
        assetId: 'AAI-REG-SCN-2023-0010',
        assetName: 'HP ScanJet Pro 3000 s4 Sheet-feed',
        category: 'HARDWARE_FAULT',
        title: 'Automatic document feeder jam and roller misfeed',
        description: 'Scanner rollers are grabbing multiple voucher sheets simultaneously causing paper jams.',
        severity: 'HIGH',
        priority: 'P2_HIGH',
        status: 'IN_PROGRESS',
        reportedBy: {
          employeeId: 'AAI-10512',
          employeeName: 'Priya Nair',
          department: 'Human Resources & Admin',
          floor: 'Ground Floor, Admin Wing',
          phone: '+91 98401 77123'
        },
        assignedTechnician: {
          name: 'Suresh Kumar (Hardware Specialist)',
          assignedAt: new Date('2024-06-10T10:00:00Z')
        },
        resolution: {
          resolutionNotes: '',
          resolvedBy: '',
          resolvedAt: null,
          partsReplaced: 'Replacement roller kit ordered from HP OEM supplier'
        },
        remarks: 'Equipment tagged under maintenance in IT store',
        createdAt: new Date('2024-06-09T09:30:00Z'),
        updatedAt: new Date('2024-06-10T10:00:00Z')
      },
      {
        _id: '66d600000000000000000002',
        ticketId: 'AAI-TKT-2024-0002',
        assetId: 'AAI-REG-PC-2024-0001',
        assetName: 'Dell OptiPlex 7090 MT Workstation',
        category: 'SOFTWARE_ISSUE',
        title: 'Radar client connection reset on technical network',
        description: 'Client terminal loses connection to radar stream after system patching.',
        severity: 'MEDIUM',
        priority: 'P3_MEDIUM',
        status: 'RESOLVED',
        reportedBy: {
          employeeId: 'AAI-10842',
          employeeName: 'Roshan R',
          department: 'Communication, Navigation & Surveillance',
          floor: '2nd Floor, Technical Block',
          phone: '+91 98401 23456'
        },
        assignedTechnician: {
          name: 'AAI Regional Admin',
          assignedAt: new Date('2024-02-10T11:00:00Z')
        },
        resolution: {
          resolutionNotes: 'Reconfigured gateway subnet routes and updated local certificate authority trust.',
          resolvedBy: 'admin',
          resolvedAt: new Date('2024-02-11T16:30:00Z'),
          partsReplaced: 'None (Configuration adjustment)'
        },
        remarks: 'Verified radar data feeds functioning normally',
        createdAt: new Date('2024-02-10T10:15:00Z'),
        updatedAt: new Date('2024-02-11T16:30:00Z')
      }
    ];

    list.forEach(item => {
      memoryComplaints.set(item.ticketId, item);
    });
  }
};

seedComplaints();

const mapSeverityToPriority = (severity) => {
  switch (severity) {
    case 'CRITICAL': return 'P1_CRITICAL';
    case 'HIGH': return 'P2_HIGH';
    case 'MEDIUM': return 'P3_MEDIUM';
    case 'LOW': return 'P4_LOW';
    default: return 'P3_MEDIUM';
  }
};

export const complaintRepository = {
  findPaginated: async (options = {}) => {
    const {
      page = 1,
      limit = 20,
      status,
      severity,
      category,
      employeeId,
      assetId,
      search
    } = options;

    const skip = (Number(page) - 1) * Number(limit);

    if (mongoose.connection.readyState === 1) {
      const query = {};
      if (status) query.status = status;
      if (severity) query.severity = severity;
      if (category) query.category = category;
      if (assetId) query.assetId = assetId.trim().toUpperCase();
      if (employeeId) query['reportedBy.employeeId'] = employeeId.trim().toUpperCase();

      if (search) {
        const regex = new RegExp(search, 'i');
        query.$or = [
          { ticketId: regex },
          { assetId: regex },
          { assetName: regex },
          { title: regex },
          { 'reportedBy.employeeName': regex },
          { 'reportedBy.employeeId': regex },
          { 'reportedBy.department': regex }
        ];
      }

      const total = await Complaint.countDocuments(query);
      const items = await Complaint.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      return { items, total };
    }

    // In-memory fallback
    let list = Array.from(memoryComplaints.values());

    if (status) list = list.filter(c => c.status === status);
    if (severity) list = list.filter(c => c.severity === severity);
    if (category) list = list.filter(c => c.category === category);
    if (assetId) list = list.filter(c => c.assetId.toUpperCase() === assetId.trim().toUpperCase());
    if (employeeId) list = list.filter(c => c.reportedBy?.employeeId?.toUpperCase() === employeeId.trim().toUpperCase());

    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c =>
        c.ticketId.toLowerCase().includes(s) ||
        c.assetId.toLowerCase().includes(s) ||
        (c.assetName && c.assetName.toLowerCase().includes(s)) ||
        c.title.toLowerCase().includes(s) ||
        (c.reportedBy?.employeeName && c.reportedBy.employeeName.toLowerCase().includes(s)) ||
        (c.reportedBy?.employeeId && c.reportedBy.employeeId.toLowerCase().includes(s)) ||
        (c.reportedBy?.department && c.reportedBy.department.toLowerCase().includes(s))
      );
    }

    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = list.length;
    const items = list.slice(skip, skip + Number(limit));

    return { items, total };
  },

  findById: async (id) => {
    if (mongoose.connection.readyState === 1) {
      if (mongoose.isValidObjectId(id)) {
        return Complaint.findById(id);
      }
      return Complaint.findOne({ ticketId: id.toUpperCase() });
    }

    for (const c of memoryComplaints.values()) {
      if (c._id === id || c.ticketId.toUpperCase() === id.toUpperCase()) {
        return c;
      }
    }
    return null;
  },

  findByAssetId: async (assetId) => {
    const aid = assetId.trim().toUpperCase();
    if (mongoose.connection.readyState === 1) {
      return Complaint.find({ assetId: aid }).sort({ createdAt: -1 });
    }
    const results = [];
    for (const c of memoryComplaints.values()) {
      if (c.assetId.toUpperCase() === aid) {
        results.push(c);
      }
    }
    return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  /**
   * Create a new complaint ticket and manage asset lifecycle interlock
   */
  create: async (data) => {
    const asset = await assetRepository.findById(data.assetId);
    if (!asset) {
      const err = new Error(`Asset with ID '${data.assetId}' not found`);
      err.statusCode = 404;
      throw err;
    }

    const seq = memoryComplaints.size + 1;
    const ticketId = generateTicketId(seq);
    const priority = mapSeverityToPriority(data.severity || 'MEDIUM');

    const complaintData = {
      ticketId,
      assetId: asset.assetId,
      assetName: asset.assetName,
      category: data.category,
      title: data.title,
      description: data.description,
      severity: data.severity || 'MEDIUM',
      priority,
      status: 'OPEN',
      reportedBy: {
        employeeId: data.reportedBy.employeeId,
        employeeName: data.reportedBy.employeeName,
        department: data.reportedBy.department || asset.department,
        floor: data.reportedBy.floor || asset.floor,
        phone: data.reportedBy.phone || ''
      },
      assignedTechnician: {
        name: '',
        assignedAt: null
      },
      resolution: {
        resolutionNotes: '',
        resolvedBy: '',
        resolvedAt: null,
        partsReplaced: ''
      },
      remarks: data.remarks || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    let savedComplaint;
    if (mongoose.connection.readyState === 1) {
      const doc = new Complaint(complaintData);
      savedComplaint = await doc.save();
    } else {
      const id = new mongoose.Types.ObjectId().toString();
      savedComplaint = {
        _id: id,
        ...complaintData
      };
      memoryComplaints.set(ticketId, savedComplaint);
    }

    // Asset status interlock: if CRITICAL hardware fault, immediately tag asset UNDER_MAINTENANCE
    if (data.category === 'HARDWARE_FAULT' && (data.severity === 'CRITICAL' || data.severity === 'HIGH')) {
      await assetRepository.update(asset.assetId, {
        status: 'UNDER_MAINTENANCE',
        condition: 'POOR',
        remarks: `[Fault Reported: ${ticketId}] ${data.title}`
      });
    }

    return savedComplaint;
  },

  /**
   * Update Complaint Lifecycle Status, Resolution, and Technician
   */
  updateStatus: async (ticketId, updateData, adminUser = 'admin') => {
    const complaint = await complaintRepository.findById(ticketId);
    if (!complaint) {
      const err = new Error(`Complaint ticket '${ticketId}' not found`);
      err.statusCode = 404;
      throw err;
    }

    const {
      status,
      resolutionNotes,
      partsReplaced,
      assignedTechnician,
      remarks
    } = updateData;

    // State machine guardrail: CLOSED tickets cannot be altered
    if (complaint.status === 'CLOSED') {
      const err = new Error(`Cannot modify complaint ticket '${ticketId}' because it is already CLOSED`);
      err.statusCode = 400;
      throw err;
    }

    // Validation: Resolution notes are strictly mandatory when resolving or closing
    if (status === 'RESOLVED' || status === 'CLOSED') {
      const finalNotes = resolutionNotes || complaint.resolution?.resolutionNotes;
      if (!finalNotes || !String(finalNotes).trim()) {
        const err = new Error('Resolution notes are mandatory when resolving or closing a complaint ticket');
        err.statusCode = 400;
        throw err;
      }
    }

    const now = new Date();

    if (mongoose.connection.readyState === 1) {
      const updates = { updatedAt: now };
      if (status) updates.status = status;
      if (remarks) updates.remarks = remarks;

      if (assignedTechnician) {
        updates['assignedTechnician.name'] = assignedTechnician;
        updates['assignedTechnician.assignedAt'] = now;
      }

      if (status === 'RESOLVED' || status === 'CLOSED') {
        updates['resolution.resolvedAt'] = now;
        updates['resolution.resolvedBy'] = adminUser;
        if (resolutionNotes) updates['resolution.resolutionNotes'] = resolutionNotes;
        if (partsReplaced) updates['resolution.partsReplaced'] = partsReplaced;
      }

      const updated = await Complaint.findByIdAndUpdate(complaint._id, updates, { new: true });
      await complaintRepository.syncAssetStatus(complaint.assetId, status);
      return updated;
    }

    // In-memory update
    if (status) complaint.status = status;
    if (remarks) complaint.remarks = remarks;

    if (assignedTechnician) {
      complaint.assignedTechnician = {
        name: assignedTechnician,
        assignedAt: now
      };
    }

    if (status === 'RESOLVED' || status === 'CLOSED') {
      complaint.resolution = {
        resolvedAt: now,
        resolvedBy: adminUser,
        resolutionNotes: resolutionNotes || complaint.resolution?.resolutionNotes || '',
        partsReplaced: partsReplaced || complaint.resolution?.partsReplaced || ''
      };
    }

    complaint.updatedAt = now;
    await complaintRepository.syncAssetStatus(complaint.assetId, status);
    return complaint;
  },

  /**
   * Interlock asset status according to ticket resolution
   */
  syncAssetStatus: async (assetId, ticketStatus) => {
    const asset = await assetRepository.findById(assetId);
    if (!asset) return;

    if (ticketStatus === 'RESOLVED' || ticketStatus === 'CLOSED') {
      // If asset was under maintenance, restore it to operational status
      if (asset.status === 'UNDER_MAINTENANCE') {
        const restoredStatus = asset.currentEmployeeId ? 'ASSIGNED' : 'AVAILABLE';
        await assetRepository.update(asset.assetId, {
          status: restoredStatus,
          condition: 'GOOD'
        });
      }
    } else if (ticketStatus === 'IN_PROGRESS') {
      // If hardware repair is actively in progress, set to UNDER_MAINTENANCE
      if (asset.status !== 'UNDER_MAINTENANCE' && asset.status !== 'RETIRED') {
        await assetRepository.update(asset.assetId, {
          status: 'UNDER_MAINTENANCE'
        });
      }
    }
  }
};

complaintRepository.find = complaintRepository.findPaginated;
