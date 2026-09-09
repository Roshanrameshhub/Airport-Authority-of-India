import { complaintRepository } from '../repositories/complaintRepository.js';
import { employeeRepository } from '../repositories/employeeRepository.js';
import { assetRepository } from '../repositories/assetRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { sendSuccess, sendPaginated, sendError } from '../utils/apiResponse.js';

/**
 * Get all complaints with filtering and pagination
 */
export const getComplaints = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      severity,
      category,
      employeeId,
      assetId,
      search
    } = req.query;

    const queryEmployeeId = (req.user?.role === 'EMPLOYEE' && !employeeId)
      ? (req.user.employeeId || req.user.username)
      : employeeId;

    const { items, total } = await complaintRepository.findPaginated({
      page: Number(page),
      limit: Number(limit),
      status,
      severity,
      category,
      employeeId: queryEmployeeId,
      assetId,
      search
    });

    return sendPaginated(
      res,
      items,
      {
        page: Number(page),
        limit: Number(limit),
        total
      },
      'Complaints retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get single complaint by ID or Ticket ID
 */
export const getComplaintById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const complaint = await complaintRepository.findById(id);
    if (!complaint) {
      return sendError(res, `Complaint ticket '${id}' not found`, 404);
    }
    return sendSuccess(res, complaint, 'Complaint details retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Get all tickets for a specific asset
 */
export const getAssetComplaints = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const tickets = await complaintRepository.findByAssetId(assetId);
    return sendSuccess(res, tickets, `Tickets for asset '${assetId}' retrieved`);
  } catch (error) {
    next(error);
  }
};

/**
 * Raise a new IT fault ticket
 */
export const createComplaint = async (req, res, next) => {
  try {
    const {
      assetId,
      category,
      title,
      description,
      severity = 'MEDIUM',
      phone = ''
    } = req.body;

    const empId = req.user?.employeeId || req.user?.username || 'AAI-STAFF';
    const employee = await employeeRepository.findByEmployeeId(empId);

    // Verify Asset existence
    const asset = await assetRepository.findById(assetId);
    if (!asset) {
      return sendError(res, `Asset with ID '${assetId}' not found`, 404);
    }

    // Authorization: If regular employee, verify they are the current custodian of this asset
    if (req.user?.role === 'EMPLOYEE') {
      const isCustodian = asset.currentEmployeeId &&
        asset.currentEmployeeId.toUpperCase() === empId.toUpperCase();
      if (!isCustodian) {
        return sendError(
          res,
          `Unauthorized: You cannot raise a complaint for an asset currently assigned to another custodian (${asset.currentEmployeeName || 'Staff'} - ${asset.currentEmployeeId || 'N/A'}).`,
          403
        );
      }
    }

    // Guard against duplicate active tickets for the same asset & category
    const existingTickets = await complaintRepository.findByAssetId(asset.assetId);
    const hasDuplicateActive = existingTickets.some(
      t => (t.status === 'OPEN' || t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED') &&
           t.category === category
    );
    if (hasDuplicateActive) {
      return sendError(
        res,
        `An active service ticket for category '${category}' already exists for asset '${asset.assetId}'. Duplicate submission prevented.`,
        400
      );
    }

    const reportedBy = {
      employeeId: employee ? employee.employeeId : empId,
      employeeName: employee ? employee.name : (req.user?.name || req.user?.username || 'Staff Member'),
      department: employee ? employee.department : 'General Administration',
      floor: employee ? employee.floor : 'Ground Floor',
      phone: phone || (employee ? employee.phone : '')
    };

    const complaint = await complaintRepository.create({
      assetId,
      category,
      title,
      description,
      severity,
      reportedBy,
      remarks: ''
    });

    // Audit Logging
    await auditRepository.logEvent({
      action: 'COMPLAINT_CREATED',
      entityType: 'COMPLAINT',
      entityId: complaint.ticketId,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'staff',
        name: req.user?.name || reportedBy.employeeName,
        role: req.user?.role || 'EMPLOYEE',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        ticketId: complaint.ticketId,
        assetId: complaint.assetId,
        category: complaint.category,
        severity: complaint.severity,
        title: complaint.title
      },
      status: 'SUCCESS'
    });

    return sendSuccess(
      res,
      complaint,
      `Service ticket '${complaint.ticketId}' raised successfully`,
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update complaint lifecycle status & resolution (Admin only)
 */
export const updateComplaintStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminUser = req.user?.username || 'admin';

    const updated = await complaintRepository.updateStatus(id, req.body, adminUser);

    // Audit Logging
    await auditRepository.logEvent({
      action: 'COMPLAINT_STATUS_UPDATED',
      entityType: 'COMPLAINT',
      entityId: updated.ticketId || id,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        ticketId: updated.ticketId,
        newStatus: updated.status,
        resolutionNotes: req.body.resolutionNotes || '',
        assignedTechnician: updated.assignedTechnician?.name || ''
      },
      status: 'SUCCESS'
    });

    return sendSuccess(
      res,
      updated,
      `Ticket '${id}' status updated to '${updated.status}'`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Assign technician to ticket (Admin only)
 */
export const assignTechnician = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { technicianName } = req.body;

    const updated = await complaintRepository.updateStatus(id, {
      assignedTechnician: technicianName,
      status: 'IN_PROGRESS'
    }, req.user?.username || 'admin');

    // Audit Logging
    await auditRepository.logEvent({
      action: 'COMPLAINT_STATUS_UPDATED',
      entityType: 'COMPLAINT',
      entityId: updated.ticketId || id,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        ticketId: updated.ticketId,
        status: 'IN_PROGRESS',
        technicianAssigned: technicianName
      },
      status: 'SUCCESS'
    });

    return sendSuccess(
      res,
      updated,
      `Technician '${technicianName}' assigned to ticket '${id}'`
    );
  } catch (error) {
    next(error);
  }
};
