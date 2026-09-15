import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getDepartments,
  getCategories,
  getLocations,
  getVendors,
  getStatuses,
  getConditions,
  getAssetTypes,
  getCategoryAssetTypeMap
} from '../controllers/masterController.js';

const router = express.Router();

// Master Data APIs are accessible to authenticated users (both ADMIN and EMPLOYEE)
router.use(protect);

router.get('/departments', getDepartments);
router.get('/categories', getCategories);
router.get('/locations', getLocations);
router.get('/vendors', getVendors);
router.get('/statuses', getStatuses);
router.get('/conditions', getConditions);
router.get('/asset-types', getAssetTypes);
router.get('/category-asset-type-map', getCategoryAssetTypeMap);

export default router;
