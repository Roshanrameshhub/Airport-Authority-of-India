import { Router } from 'express';
import { 
  getEmployees, 
  getEmployeeById, 
  createEmployee, 
  updateEmployee, 
  deleteEmployee,
  getEmployeeAccountStatus,
  resetEmployeePassword,
  toggleEmployeeLogin,
  createEmployeeLogin
} from '../controllers/employeeController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createEmployeeSchema, updateEmployeeSchema } from '../validations/masterValidation.js';

const router = Router();

// Employee Management Endpoints
router.get('/', protect, getEmployees);
router.get('/:id/account-status', protect, getEmployeeAccountStatus);
router.post('/:id/reset-password', protect, authorize('ADMIN'), resetEmployeePassword);
router.post('/:id/toggle-login', protect, authorize('ADMIN'), toggleEmployeeLogin);
router.post('/:id/create-login', protect, authorize('ADMIN'), createEmployeeLogin);
router.get('/:id', protect, getEmployeeById);
router.post('/', protect, authorize('ADMIN'), validate(createEmployeeSchema), createEmployee);
router.put('/:id', protect, authorize('ADMIN'), validate(updateEmployeeSchema), updateEmployee);
router.delete('/:id', protect, authorize('ADMIN'), deleteEmployee);

export default router;
