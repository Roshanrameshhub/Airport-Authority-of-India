import { Router } from 'express';
import { 
  getAssets, 
  getAssetById, 
  getAssetTimeline,
  createAsset, 
  updateAsset, 
  transitionLifecycle,
  retireAsset, 
  deleteAsset 
} from '../controllers/assetController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createAssetSchema, updateAssetSchema } from '../validations/assetValidation.js';

const router = Router();

// Asset Inventory & Management Routes
router.get('/', protect, getAssets);
router.get('/:id/timeline', protect, getAssetTimeline);
router.get('/:id', protect, getAssetById);
router.post('/', protect, authorize('ADMIN'), validate(createAssetSchema), createAsset);
router.put('/:id', protect, authorize('ADMIN'), validate(updateAssetSchema), updateAsset);
router.patch('/:id/lifecycle', protect, authorize('ADMIN'), transitionLifecycle);
router.patch('/:id/retire', protect, authorize('ADMIN'), retireAsset);
router.delete('/:id', protect, authorize('ADMIN'), deleteAsset);

export default router;
