import { dashboardRepository } from '../repositories/dashboardRepository.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * GET /api/v1/dashboard/stats
 * Aggregate key system and inventory KPIs
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await dashboardRepository.getStats();
    return sendSuccess(res, stats, 'Dashboard metrics calculated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/dashboard/category-distribution
 * Breakdown of equipment across categories
 */
export const getCategoryDistribution = async (req, res, next) => {
  try {
    const distribution = await dashboardRepository.getCategoryDistribution();
    return sendSuccess(res, distribution, 'Category distribution retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/dashboard/department-distribution
 * Breakdown of equipment across regional departments
 */
export const getDepartmentDistribution = async (req, res, next) => {
  try {
    const distribution = await dashboardRepository.getDepartmentDistribution();
    return sendSuccess(res, distribution, 'Department distribution retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/dashboard/warranty-alerts
 * Retrieve assets requiring warranty renewal or attention
 */
export const getWarrantyAlerts = async (req, res, next) => {
  try {
    const alerts = await dashboardRepository.getWarrantyAlerts();
    return sendSuccess(res, alerts, 'Warranty alerts retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/dashboard/recent-activity
 * Retrieve chronological unified activity feed
 */
export const getRecentActivity = async (req, res, next) => {
  try {
    const limit = req.query.limit || 10;
    const activities = await dashboardRepository.getRecentActivity(limit);
    return sendSuccess(res, activities, 'Recent activity retrieved successfully');
  } catch (error) {
    next(error);
  }
};
