import { employeeRepository } from '../repositories/employeeRepository.js';
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
    return sendSuccess(res, newEmp, 'Employee registered successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await employeeRepository.update(id, req.body);

    if (!updated) {
      return sendError(res, `Employee not found to update: ${id}`, 404);
    }

    return sendSuccess(res, updated, 'Employee profile updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await employeeRepository.delete(id);

    if (!deleted) {
      return sendError(res, `Employee not found to deactivate: ${id}`, 404);
    }

    return sendSuccess(res, null, 'Employee deactivated successfully');
  } catch (error) {
    next(error);
  }
};
