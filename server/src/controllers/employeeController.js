import { employeeRepository } from '../repositories/employeeRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/apiResponse.js';

export const getEmployees = async (req, res, next) => {
  try {
    const { search = '', department = '', floor = '', page = 1, limit = 10 } = req.query;
    const { items, total } = await employeeRepository.find({
      search,
      department,
      floor,
      page: Number(page),
      limit: Number(limit)
    });

    return sendPaginated(res, items, { page, limit, total }, 'Employees retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employee = await employeeRepository.findById(id);

    if (!employee) {
      return sendError(res, `Employee not found with identifier: ${id}`, 404);
    }

    return sendSuccess(res, employee, 'Employee details retrieved');
  } catch (error) {
    next(error);
  }
};

export const createEmployee = async (req, res, next) => {
  try {
    const { employeeId } = req.body;

    // Check collision
    const existing = await employeeRepository.findByEmployeeId(employeeId);
    if (existing) {
      return sendError(res, `Employee ID '${employeeId}' is already registered in the system.`, 409);
    }

    const newEmp = await employeeRepository.create(req.body);

    // Audit Logging
    await auditRepository.logEvent({
      action: 'EMPLOYEE_CREATED',
      entityType: 'EMPLOYEE',
      entityId: newEmp.employeeId,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        employeeId: newEmp.employeeId,
        name: newEmp.name,
        department: newEmp.department,
        designation: newEmp.designation,
        floor: newEmp.floor
      },
      status: 'SUCCESS'
    });

    return sendSuccess(res, newEmp, 'Employee registered successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentEmp = await employeeRepository.findById(id);

    if (!currentEmp) {
      return sendError(res, `Employee not found to update: ${id}`, 404);
    }

    const updated = await employeeRepository.update(id, req.body);

    if (!updated) {
      return sendError(res, `Employee not found to update: ${id}`, 404);
    }

    // Determine field-level diffs for accountability
    const changes = {};
    const oldValues = {};
    const newValues = {};
    const trackedFields = ['name', 'designation', 'department', 'floor', 'email', 'phone'];
    for (const field of trackedFields) {
      if (req.body[field] !== undefined && String(req.body[field]) !== String(currentEmp[field])) {
        changes[field] = { from: currentEmp[field], to: req.body[field] };
        oldValues[field] = currentEmp[field];
        newValues[field] = req.body[field];
      }
    }

    // Audit Logging
    await auditRepository.logEvent({
      action: 'EMPLOYEE_UPDATED',
      entityType: 'EMPLOYEE',
      entityId: updated.employeeId || id,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        employeeId: updated.employeeId,
        name: updated.name,
        changes,
        oldValues,
        newValues
      },
      status: 'SUCCESS'
    });

    return sendSuccess(res, updated, 'Employee profile updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentEmp = await employeeRepository.findById(id);

    const deleted = await employeeRepository.delete(id);

    if (!deleted) {
      return sendError(res, `Employee not found to deactivate: ${id}`, 404);
    }

    // Audit Logging
    await auditRepository.logEvent({
      action: 'EMPLOYEE_DEACTIVATED',
      entityType: 'EMPLOYEE',
      entityId: currentEmp?.employeeId || id,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        employeeId: currentEmp?.employeeId || id,
        name: currentEmp?.name,
        department: currentEmp?.department,
        message: 'Employee deactivated and archived from active operational roster'
      },
      status: 'SUCCESS'
    });

    return sendSuccess(res, null, 'Employee deactivated successfully');
  } catch (error) {
    next(error);
  }
};

