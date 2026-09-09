import { Router } from 'express';
import {
  exportAssetsExcel,
  exportHandoverPdf,
  exportAssetHandoverPdf
} from '../controllers/exportController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// Protect all export routes
router.use(protect);

// Excel export (Admin only)
router.get('/assets/excel', authorize('ADMIN'), exportAssetsExcel);

// Printable PDF handover slips
router.get('/handover/:assignmentId/pdf', authorize('ADMIN', 'EMPLOYEE'), exportHandoverPdf);
router.get('/handover/asset/:assetId/pdf', authorize('ADMIN', 'EMPLOYEE'), exportAssetHandoverPdf);

export default router;
