import { Router } from 'express';
import { getAuditLogs, getAuditSummary } from '../controllers/auditController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// Protect all audit trail endpoints (Admin only)
router.use(protect);
router.use(authorize('ADMIN'));

router.get('/', getAuditLogs);
router.get('/summary', getAuditSummary);

export default router;
