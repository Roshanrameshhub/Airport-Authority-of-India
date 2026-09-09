import { Router } from 'express';
import { getDepartments, createDepartment } from '../controllers/departmentController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createDepartmentSchema } from '../validations/masterValidation.js';

const router = Router();

// Department Routes
router.get('/', protect, getDepartments);
router.post('/', protect, authorize('ADMIN'), validate(createDepartmentSchema), createDepartment);

export default router;
