import { auditRepository } from '../repositories/auditRepository.js';
import { sendSuccess, sendPaginated } from '../utils/apiResponse.js';

/**
 * Retrieve paginated audit logs with multi-parameter filtering
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      action,
      entityType,
      entityId,
      status,
      search,
      startDate,
      endDate,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    const { items, total } = await auditRepository.find({
      page: Number(page),
      limit: Number(limit),
      action,
      entityType,
      entityId,
      status,
      search,
      startDate,
      endDate,
      sortBy,
      sortOrder
    });

    return sendPaginated(
      res,
      items,
      { page: Number(page), limit: Number(limit), total },
      'Audit log trail retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve summary statistics of audit trail events
 */
export const getAuditSummary = async (req, res, next) => {
  try {
    const summary = await auditRepository.getSummary();
    return sendSuccess(res, summary, 'Audit log summary metrics retrieved');
  } catch (error) {
    next(error);
  }
};
