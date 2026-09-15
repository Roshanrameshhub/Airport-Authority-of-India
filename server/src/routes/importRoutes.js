import { Router } from 'express';
import multer from 'multer';
import {
  downloadTemplate,
  analyzeFiles,
  unlockWorkbook,
  updateMappings,
  reconcileData,
  resolveConflicts,
  commitImport,
  validateImport
} from '../controllers/importController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// Configure multer memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB total limit for multi-file uploads
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/csv'
    ];
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed'));
    }
  }
});

// All bulk import operations require ADMIN privileges
router.use(protect);
router.use(authorize('ADMIN'));

// Endpoints
router.get('/template', downloadTemplate);

// Multi-File Pipeline
router.post('/analyze', upload.any(), analyzeFiles);
router.post('/unlock/:importToken', unlockWorkbook);
router.put('/mappings/:importToken', updateMappings);
router.post('/reconcile/:importToken', reconcileData);
router.post('/resolve/:importToken', resolveConflicts);
router.post('/commit', commitImport);

// Legacy Single-File Endpoint (Backward Compatibility)
router.post('/validate', upload.single('file'), validateImport);

export default router;
