import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  getDepartments,
  getCategories,
  getLocations,
  getVendors,
  getStatuses,
  getConditions,
  getAssetTypes,
  getCategoryAssetTypeMap,
  getMakes,
  createMake,
  updateMake,
  deleteMake,
  getModels,
  createModel,
  updateModel,
  deleteModel,
  getTechnologies,
  createTechnology,
  updateTechnology,
  deleteTechnology
} from '../controllers/masterController.js';
import {
  createMakeSchema,
  updateMakeSchema,
  createModelSchema,
  updateModelSchema,
  createTechnologySchema,
  updateTechnologySchema
} from '../validations/masterValidation.js';

const router = express.Router();

// Master Data APIs are accessible to authenticated users (both ADMIN and EMPLOYEE for reading)
router.use(protect);

router.get('/departments', getDepartments);
router.get('/categories', getCategories);
router.get('/locations', getLocations);
router.get('/vendors', getVendors);
router.get('/statuses', getStatuses);
router.get('/conditions', getConditions);
router.get('/asset-types', getAssetTypes);
router.get('/category-asset-type-map', getCategoryAssetTypeMap);

// Makes (Brands)
router.get('/makes', getMakes);
router.post('/makes', authorize('ADMIN'), validate(createMakeSchema), createMake);
router.put('/makes/:id', authorize('ADMIN'), validate(updateMakeSchema), updateMake);
router.delete('/makes/:id', authorize('ADMIN'), deleteMake);

// Models
router.get('/models', getModels);
router.post('/models', authorize('ADMIN'), validate(createModelSchema), createModel);
router.put('/models/:id', authorize('ADMIN'), validate(updateModelSchema), updateModel);
router.delete('/models/:id', authorize('ADMIN'), deleteModel);

// Technologies
router.get('/technologies', getTechnologies);
router.post('/technologies', authorize('ADMIN'), validate(createTechnologySchema), createTechnology);
router.put('/technologies/:id', authorize('ADMIN'), validate(updateTechnologySchema), updateTechnology);
router.delete('/technologies/:id', authorize('ADMIN'), deleteTechnology);

export default router;
