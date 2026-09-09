import { departmentRepository } from '../repositories/departmentRepository.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const getDepartments = async (req, res, next) => {
  try {
    const departments = await departmentRepository.findAll();
    return sendSuccess(res, departments, 'Departments retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const createDepartment = async (req, res, next) => {
  try {
    const { name, code } = req.body;
    const existing = await departmentRepository.findByNameOrCode(name, code);
    if (existing) {
      return sendError(res, `Department with name '${name}' or code '${code}' already exists.`, 409);
    }
    const newDept = await departmentRepository.create(req.body);
    return sendSuccess(res, newDept, 'Department created successfully', 201);
  } catch (error) {
    next(error);
  }
};
