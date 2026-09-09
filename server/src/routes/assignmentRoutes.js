import { Router } from 'express';
import {
  getAssignments,
  getAssetHistory,
  getEmployeeAssignments,
  getAssignmentById,
  assignAsset,
  transferAsset,
  returnAsset
} from '../controllers/assignmentController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  assignAssetSchema,
  transferAssetSchema,
  returnAssetSchema
} from '../validations/assignmentValidation.js';

const router = Router();

// Protect all assignment routes
router.use(protect);

// Read endpoints
router.get('/', authorize('ADMIN', 'EMPLOYEE'), getAssignments);
router.get('/asset/:assetId', authorize('ADMIN', 'EMPLOYEE'), getAssetHistory);
router.get('/employee/:employeeId', authorize('ADMIN', 'EMPLOYEE'), getEmployeeAssignments);
router.get('/:id', authorize('ADMIN', 'EMPLOYEE'), getAssignmentById);

// Custody lifecycle actions (Admin only)
router.post('/assign', authorize('ADMIN'), validate(assignAssetSchema), assignAsset);
router.post('/transfer', authorize('ADMIN'), validate(transferAssetSchema), transferAsset);
router.post('/return', authorize('ADMIN'), validate(returnAssetSchema), returnAsset);

export default router;
