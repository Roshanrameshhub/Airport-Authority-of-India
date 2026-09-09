import { exportService } from '../services/exportService.js';
import { assignmentRepository } from '../repositories/assignmentRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { sendError } from '../utils/apiResponse.js';

/**
 * Export filtered asset inventory to Excel (.xlsx)
 */
export const exportAssetsExcel = async (req, res, next) => {
  try {
    const {
      search,
      category,
      department,
      status,
      warrantyStatus
    } = req.query;

    const buffer = await exportService.generateAssetExcel({
      search,
      category,
      department,
      status,
      warrantyStatus
    });

    // Audit Logging
    await auditRepository.logEvent({
      action: 'EXCEL_EXPORT',
      entityType: 'EXPORT',
      entityId: 'ALL_ASSETS',
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        documentType: 'ASSET_REGISTER_XLSX',
        filters: { search, category, department, status, warrantyStatus }
      },
      status: 'SUCCESS'
    });

    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="AAI_Asset_Inventory_${dateStr}.xlsx"`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Generate PDF handover slip by assignmentId
 */
export const exportHandoverPdf = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;

    // RBAC: Verify access rights
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment) {
      return sendError(res, `Custody assignment '${assignmentId}' not found`, 404);
    }

    if (req.user?.role === 'EMPLOYEE' && req.user.employeeId !== assignment.employeeId) {
      return sendError(res, 'Unauthorized: Staff employees can only download their own official handover slips', 403);
    }

    const buffer = await exportService.generateHandoverPdf(assignmentId);

    // Audit Logging
    await auditRepository.logEvent({
      action: 'PDF_GENERATED',
      entityType: 'EXPORT',
      entityId: assignmentId,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'SYSTEM',
        name: req.user?.name || 'Authorized User',
        role: req.user?.role || 'SYSTEM',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        documentType: 'HANDOVER_SLIP_PDF',
        assignmentId,
        assetId: assignment.assetId,
        employeeId: assignment.employeeId
      },
      status: 'SUCCESS'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="AAI_Handover_${assignmentId}.pdf"`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Generate PDF handover slip for an asset's current active custody
 */
export const exportAssetHandoverPdf = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    let targetAssignment = await assignmentRepository.findCurrentAssignment(assetId);

    if (!targetAssignment) {
      // Check if there is any historical assignment
      const history = await assignmentRepository.findHistoryByAsset(assetId);
      if (!history || history.length === 0) {
        return sendError(res, `No assignment or custody records exist for asset '${assetId}'`, 404);
      }
      // Use latest historical assignment
      targetAssignment = history[0];
    }

    if (req.user?.role === 'EMPLOYEE' && req.user.employeeId !== targetAssignment.employeeId) {
      return sendError(res, 'Unauthorized: Staff employees can only download their own official handover slips', 403);
    }

    const buffer = await exportService.generateHandoverPdf(targetAssignment.assignmentId);

    // Audit Logging
    await auditRepository.logEvent({
      action: 'PDF_GENERATED',
      entityType: 'EXPORT',
      entityId: targetAssignment.assignmentId,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'SYSTEM',
        name: req.user?.name || 'Authorized User',
        role: req.user?.role || 'SYSTEM',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        documentType: 'HANDOVER_SLIP_PDF',
        assignmentId: targetAssignment.assignmentId,
        assetId: targetAssignment.assetId,
        employeeId: targetAssignment.employeeId
      },
      status: 'SUCCESS'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="AAI_Handover_${targetAssignment.assignmentId}.pdf"`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

