import { Router } from 'express';
import {
  getComplaints,
  getComplaintById,
  getAssetComplaints,
  createComplaint,
  updateComplaintStatus,
  assignTechnician
} from '../controllers/complaintController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createComplaintSchema,
  updateComplaintStatusSchema,
  assignTechnicianSchema
} from '../validations/complaintValidation.js';

const router = Router();

// Protect all ticket routes
router.use(protect);

// Read endpoints
router.get('/', authorize('ADMIN', 'EMPLOYEE'), getComplaints);
router.get('/asset/:assetId', authorize('ADMIN', 'EMPLOYEE'), getAssetComplaints);
router.get('/:id', authorize('ADMIN', 'EMPLOYEE'), getComplaintById);

// Staff and Admin can raise tickets
router.post('/', authorize('ADMIN', 'EMPLOYEE'), validate(createComplaintSchema), createComplaint);

// Admin only: lifecycle status and technician updates
router.patch('/:id/status', authorize('ADMIN'), validate(updateComplaintStatusSchema), updateComplaintStatus);
router.patch('/:id/assign', authorize('ADMIN'), validate(assignTechnicianSchema), assignTechnician);

export default router;
