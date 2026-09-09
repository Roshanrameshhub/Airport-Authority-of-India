import { Router } from 'express';
import multer from 'multer';
import {
  downloadTemplate,
  validateImport,
  commitImport
} from '../controllers/importController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// Configure multer memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
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

router.get('/template', downloadTemplate);
router.post('/validate', upload.single('file'), validateImport);
router.post('/commit', commitImport);

export default router;
