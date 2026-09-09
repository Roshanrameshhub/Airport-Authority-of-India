import { Router } from 'express';
import {
  listCampaigns,
  getCampaignById,
  createCampaign,
  recordAssetVerification,
  finalizeCampaign
} from '../controllers/verificationController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// Protect all verification routes (Admin only for campaign operations)
router.use(protect);
router.use(authorize('ADMIN'));

router.get('/campaigns', listCampaigns);
router.post('/campaigns', createCampaign);
router.get('/campaigns/:campaignId', getCampaignById);
router.post('/campaigns/:campaignId/verify', recordAssetVerification);
router.post('/campaigns/:campaignId/record', recordAssetVerification);
router.post('/campaigns/:campaignId/finalize', finalizeCampaign);

export default router;
