import { Router } from 'express';
import {
  getAssetQrCode,
  getAssetTagPdf,
  getBatchTagsPdf,
  verifyAsset
} from '../controllers/tagController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/asset/:id/qr', getAssetQrCode);
router.get('/asset/:id/pdf', getAssetTagPdf);
router.post('/batch/pdf', authorize('ADMIN'), getBatchTagsPdf);
router.get('/verify/:identifier', verifyAsset);

export default router;
