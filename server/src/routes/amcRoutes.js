import { Router } from 'express';
import {
  getAMCs,
  getAMCById,
  createAMC,
  getAMCAlerts
} from '../controllers/amcController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/', getAMCs);
router.get('/alerts', getAMCAlerts);
router.get('/:id', getAMCById);
router.post('/', authorize('ADMIN'), createAMC);

export default router;
