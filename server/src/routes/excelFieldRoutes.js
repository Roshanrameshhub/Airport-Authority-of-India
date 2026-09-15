import { Router } from 'express';
import {
  getAllFields,
  getImportFields,
  getExportFields,
  createField,
  updateField,
  toggleField,
  reorderFields,
  checkUsage,
  deleteField
} from '../controllers/excelFieldController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// Protect all routes with Admin role
router.use(protect);
router.use(authorize('ADMIN'));

router.get('/', getAllFields);
router.post('/', createField);
router.get('/import-template-fields', getImportFields);
router.get('/export-fields', getExportFields);
router.put('/reorder', reorderFields);
router.get('/:fieldId/usage', checkUsage);
router.put('/:fieldId', updateField);
router.patch('/:fieldId/toggle', toggleField);
router.delete('/:fieldId', deleteField);

export default router;
