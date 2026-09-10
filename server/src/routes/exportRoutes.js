import { Router } from 'express';
import {
  exportAssetsExcel,
  exportAssignmentPdf,
  exportTransferPdf,
  exportReturnPdf,
  exportVerificationPdf,
  exportComplaintPdf,
  exportRetirementPdf,
  exportAmcPdf,
  exportHandoverPdf,
  exportAssetHandoverPdf
} from '../controllers/exportController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// Protect all export routes
router.use(protect);

// Excel export (Admin only)
router.get('/assets/excel', authorize('ADMIN'), exportAssetsExcel);

// Dedicated PDF Document Generation Endpoints
router.get('/assignment/:assignmentId/pdf', authorize('ADMIN', 'EMPLOYEE'), exportAssignmentPdf);
router.get('/transfer/:assignmentId/pdf', authorize('ADMIN', 'EMPLOYEE'), exportTransferPdf);
router.get('/return/:assignmentId/pdf', authorize('ADMIN', 'EMPLOYEE'), exportReturnPdf);
router.get('/verification/:campaignId/pdf', authorize('ADMIN'), exportVerificationPdf);
router.get('/complaint/:ticketId/pdf', authorize('ADMIN', 'EMPLOYEE'), exportComplaintPdf);
router.get('/retirement/:assetId/pdf', authorize('ADMIN'), exportRetirementPdf);
router.get('/amc/:contractNumber/pdf', authorize('ADMIN'), exportAmcPdf);

// More-specific asset-based handover route MUST come before the generic :assignmentId route.
// Express matches routes in order — if /handover/:assignmentId/pdf is first, the literal
// segment "asset" gets captured as assignmentId, routing to the wrong controller.
router.get('/handover/asset/:assetId/pdf', authorize('ADMIN', 'EMPLOYEE'), exportAssetHandoverPdf);
router.get('/handover/:assignmentId/pdf', authorize('ADMIN', 'EMPLOYEE'), exportHandoverPdf);

export default router;
