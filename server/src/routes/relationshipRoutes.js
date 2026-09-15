import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  linkAssets,
  unlinkAssets,
  getComponents,
  getParent
} from '../controllers/relationshipController.js';

const router = express.Router();

router.use(protect);

router.post('/link', authorize('ADMIN'), linkAssets);
router.post('/unlink', authorize('ADMIN'), unlinkAssets);
router.get('/components/:assetId', getComponents);
router.get('/parent/:assetId', getParent);

export default router;
