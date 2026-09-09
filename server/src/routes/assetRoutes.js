import { Router } from 'express';
import { 
  getAssets, 
  getAssetById, 
  createAsset, 
  updateAsset, 
  retireAsset, 
  deleteAsset 
} from '../controllers/assetController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createAssetSchema, updateAssetSchema } from '../validations/assetValidation.js';

const router = Router();

// Asset Inventory & Management Routes
router.get('/', protect, getAssets);
router.get('/:id', protect, getAssetById);
router.post('/', protect, authorize('ADMIN'), validate(createAssetSchema), createAsset);
router.put('/:id', protect, authorize('ADMIN'), validate(updateAssetSchema), updateAsset);
router.patch('/:id/retire', protect, authorize('ADMIN'), retireAsset);
router.delete('/:id', protect, authorize('ADMIN'), deleteAsset);

export default router;
