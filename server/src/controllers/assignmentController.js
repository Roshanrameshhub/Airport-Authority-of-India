import { assignmentRepository } from '../repositories/assignmentRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { sendSuccess, sendPaginated, sendError } from '../utils/apiResponse.js';

export const getAssignments = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      assetId,
      employeeId
    } = req.query;

    const { items, total } = await assignmentRepository.findPaginated({
      page: Number(page),
      limit: Number(limit),
      status,
      search,
      assetId,
      employeeId
    });

    return sendPaginated(
      res,
      items,
      {
        page: Number(page),
        limit: Number(limit),
        total
      },
      'Asset assignments retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const getAssetHistory = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const history = await assignmentRepository.findHistoryByAsset(assetId);
    return sendSuccess(
      res,
      history,
      `Custody history for asset '${assetId}' retrieved successfully`,
      200
    );
  } catch (error) {
    next(error);
  }
};

export const getEmployeeAssignments = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const { status } = req.query;

    // Authorization: Employees can only view their own custody assignments
    if (req.user?.role === 'EMPLOYEE') {
      const userEmpId = req.user.employeeId || req.user.username || '';
      if (userEmpId.toUpperCase() !== employeeId.trim().toUpperCase()) {
        return sendError(
          res,
          'Unauthorized: You are not permitted to inspect custody records of other employees',
          403
        );
      }
    }

    const assignments = await assignmentRepository.findByEmployee(employeeId, { status });
    return sendSuccess(
      res,
      assignments,
      `Assignments for employee '${employeeId}' retrieved successfully`,
      200
    );
  } catch (error) {
    next(error);
  }
};

export const getAssignmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const assignment = await assignmentRepository.findById(id);
    if (!assignment) {
      return sendError(res, `Assignment record '${id}' not found`, 404);
    }
    return sendSuccess(res, assignment, 'Assignment record retrieved', 200);
  } catch (error) {
    next(error);
  }
};

export const assignAsset = async (req, res, next) => {
  try {
    const { assetId, employeeId, condition, transferReason, remarks } = req.body;
    const assignedBy = req.user?.username || 'admin';

    const assignment = await assignmentRepository.assignAsset({
      assetId,
      employeeId,
      condition,
      transferReason,
      remarks,
      assignedBy
    });

    // Audit Logging
    await auditRepository.logEvent({
      action: 'CUSTODY_ASSIGNED',
      entityType: 'ASSIGNMENT',
      entityId: assetId,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        assetId,
        employeeId,
        condition,
        transferReason,
        assignmentId: assignment.assignmentId
      },
      status: 'SUCCESS'
    });

    return sendSuccess(
      res,
      assignment,
      `Asset '${assetId}' successfully assigned to '${employeeId}'`,
      201
    );
  } catch (error) {
    next(error);
  }
};

export const transferAsset = async (req, res, next) => {
  try {
    const {
      assetId,
      toEmployeeId,
      transferReason,
      conditionAtReturn,
      conditionAtNewAssignment,
      remarks
    } = req.body;
    const processedBy = req.user?.username || 'admin';

    const result = await assignmentRepository.transferAsset({
      assetId,
      toEmployeeId,
      transferReason,
      conditionAtReturn,
      conditionAtNewAssignment,
      remarks,
      processedBy
    });

    // Audit Logging
    await auditRepository.logEvent({
      action: 'CUSTODY_TRANSFERRED',
      entityType: 'ASSIGNMENT',
      entityId: assetId,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        assetId,
        fromEmployeeId: result.previousAssignment?.employeeId,
        toEmployeeId,
        transferReason,
        newAssignmentId: result.newAssignment?.assignmentId
      },
      status: 'SUCCESS'
    });

    return sendSuccess(
      res,
      result,
      `Asset '${assetId}' successfully transferred to '${toEmployeeId}'`,
      200
    );
  } catch (error) {
    next(error);
  }
};

export const returnAsset = async (req, res, next) => {
  try {
    const { assetId, returnReason, conditionAtReturn, remarks } = req.body;
    const processedBy = req.user?.username || 'admin';

    const result = await assignmentRepository.returnAsset({
      assetId,
      returnReason,
      conditionAtReturn,
      remarks,
      processedBy
    });

    // Audit Logging
    await auditRepository.logEvent({
      action: 'CUSTODY_RETURNED',
      entityType: 'ASSIGNMENT',
      entityId: assetId,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        assetId,
        returnReason,
        conditionAtReturn,
        returnedDate: result.returnedDate
      },
      status: 'SUCCESS'
    });

    return sendSuccess(
      res,
      result,
      `Asset '${assetId}' successfully returned to IT inventory pool`,
      200
    );
  } catch (error) {
    next(error);
  }
};
