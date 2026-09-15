import { Router } from 'express';
import {
  getDashboardStats,
  getCategoryDistribution,
  getDepartmentDistribution,
  getWarrantyAlerts,
  getRecentActivity,
  getStatusDistribution,
  getVendorDistribution,
  getAssetTypeDistribution
} from '../controllers/dashboardController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// Protect all dashboard routes
router.use(protect);

// Allow both ADMIN and EMPLOYEE roles to access real-time statistics and alerts
router.get('/stats', authorize('ADMIN', 'EMPLOYEE'), getDashboardStats);
router.get('/category-distribution', authorize('ADMIN', 'EMPLOYEE'), getCategoryDistribution);
router.get('/department-distribution', authorize('ADMIN', 'EMPLOYEE'), getDepartmentDistribution);
router.get('/status-distribution', authorize('ADMIN', 'EMPLOYEE'), getStatusDistribution);
router.get('/vendor-distribution', authorize('ADMIN', 'EMPLOYEE'), getVendorDistribution);
router.get('/type-distribution', authorize('ADMIN', 'EMPLOYEE'), getAssetTypeDistribution);
router.get('/warranty-alerts', authorize('ADMIN', 'EMPLOYEE'), getWarrantyAlerts);
router.get('/recent-activity', authorize('ADMIN', 'EMPLOYEE'), getRecentActivity);

export default router;
