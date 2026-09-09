import { exportService } from '../services/exportService.js';
import { assignmentRepository } from '../repositories/assignmentRepository.js';
import { assetRepository } from '../repositories/assetRepository.js';
import { complaintRepository } from '../repositories/complaintRepository.js';
import { verificationRepository } from '../repositories/verificationRepository.js';
import { amcRepository } from '../repositories/amcRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { sendError } from '../utils/apiResponse.js';

/**
 * Helper to build actor object for audit logging
 */
const getAuditActor = (req) => ({
  userId: req.user?._id || req.user?.id,
  username: req.user?.username || 'admin',
  name: req.user?.name || 'Administrator',
  role: req.user?.role || 'ADMIN',
  ipAddress: req.ip || '127.0.0.1'
});

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

    await auditRepository.logEvent({
      action: 'EXCEL_EXPORT',
      entityType: 'EXPORT',
      entityId: 'ALL_ASSETS',
      actor: getAuditActor(req),
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
 * Generate PDF Assignment Slip
 */
export const exportAssignmentPdf = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment) {
      return sendError(res, `Assignment record '${assignmentId}' not found`, 404);
    }

    if (req.user?.role === 'EMPLOYEE' && req.user.employeeId !== assignment.employeeId) {
      return sendError(res, 'Unauthorized: Staff employees can only download their own assignment slips', 403);
    }

    const buffer = await exportService.generateAssignmentPdf(assignmentId);

    await auditRepository.logEvent({
      action: 'ASSIGNMENT_SLIP_GENERATED',
      entityType: 'EXPORT',
      entityId: assignmentId,
      actor: getAuditActor(req),
      details: {
        documentType: 'ASSIGNMENT_SLIP_PDF',
        assignmentId,
        assetId: assignment.assetId,
        employeeId: assignment.employeeId
      },
      status: 'SUCCESS'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="AAI_Assignment_${assignmentId}.pdf"`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Generate PDF Custody Transfer Slip
 */
export const exportTransferPdf = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment) {
      return sendError(res, `Transfer record '${assignmentId}' not found`, 404);
    }

    if (
      req.user?.role === 'EMPLOYEE' &&
      req.user.employeeId !== assignment.employeeId &&
      req.user.employeeId !== assignment.previousEmployeeId
    ) {
      return sendError(res, 'Unauthorized: Staff employees can only download transfer slips they are party to', 403);
    }

    const buffer = await exportService.generateTransferPdf(assignmentId);

    await auditRepository.logEvent({
      action: 'TRANSFER_SLIP_GENERATED',
      entityType: 'EXPORT',
      entityId: assignmentId,
      actor: getAuditActor(req),
      details: {
        documentType: 'TRANSFER_SLIP_PDF',
        assignmentId,
        assetId: assignment.assetId,
        fromEmployeeId: assignment.previousEmployeeId,
        toEmployeeId: assignment.employeeId
      },
      status: 'SUCCESS'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="AAI_Transfer_${assignmentId}.pdf"`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Generate PDF Store Return Receipt
 */
export const exportReturnPdf = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment) {
      return sendError(res, `Return record '${assignmentId}' not found`, 404);
    }

    if (req.user?.role === 'EMPLOYEE' && req.user.employeeId !== assignment.employeeId) {
      return sendError(res, 'Unauthorized: Staff employees can only download their own return receipts', 403);
    }

    const buffer = await exportService.generateReturnPdf(assignmentId);

    await auditRepository.logEvent({
      action: 'RETURN_RECEIPT_GENERATED',
      entityType: 'EXPORT',
      entityId: assignmentId,
      actor: getAuditActor(req),
      details: {
        documentType: 'RETURN_RECEIPT_PDF',
        assignmentId,
        assetId: assignment.assetId,
        employeeId: assignment.employeeId
      },
      status: 'SUCCESS'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="AAI_Return_${assignmentId}.pdf"`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Generate PDF Annual Physical Verification Report (Admin only)
 */
export const exportVerificationPdf = async (req, res, next) => {
  try {
    const { campaignId } = req.params;
    const campaign = await verificationRepository.getCampaignById(campaignId);
    if (!campaign) {
      return sendError(res, `Verification campaign '${campaignId}' not found`, 404);
    }

    const buffer = await exportService.generateVerificationReportPdf(campaignId);

    await auditRepository.logEvent({
      action: 'VERIFICATION_REPORT_GENERATED',
      entityType: 'EXPORT',
      entityId: campaignId,
      actor: getAuditActor(req),
      details: {
        documentType: 'VERIFICATION_REPORT_PDF',
        campaignId,
        campaignName: campaign.name,
        recordsCount: campaign.records?.length || 0
      },
      status: 'SUCCESS'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="AAI_Verification_${campaignId}.pdf"`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Generate PDF IT Complaint / Service Report
 */
export const exportComplaintPdf = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const complaint = await complaintRepository.findById(ticketId);
    if (!complaint) {
      return sendError(res, `Complaint ticket '${ticketId}' not found`, 404);
    }

    if (
      req.user?.role === 'EMPLOYEE' &&
      req.user.employeeId !== complaint.reportedBy?.employeeId
    ) {
      return sendError(res, 'Unauthorized: Staff employees can only download service reports for their own tickets', 403);
    }

    const buffer = await exportService.generateComplaintReportPdf(ticketId);

    await auditRepository.logEvent({
      action: 'COMPLAINT_REPORT_GENERATED',
      entityType: 'EXPORT',
      entityId: ticketId,
      actor: getAuditActor(req),
      details: {
        documentType: 'COMPLAINT_REPORT_PDF',
        ticketId,
        assetId: complaint.assetId,
        status: complaint.status
      },
      status: 'SUCCESS'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="AAI_ServiceReport_${ticketId}.pdf"`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Generate PDF Asset Retirement Record (Admin only)
 */
export const exportRetirementPdf = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const asset = await assetRepository.findById(assetId);
    if (!asset) {
      return sendError(res, `Asset '${assetId}' not found`, 404);
    }

    const buffer = await exportService.generateRetirementPdf(assetId);

    await auditRepository.logEvent({
      action: 'RETIREMENT_RECORD_GENERATED',
      entityType: 'EXPORT',
      entityId: assetId,
      actor: getAuditActor(req),
      details: {
        documentType: 'RETIREMENT_RECORD_PDF',
        assetId,
        assetName: asset.assetName,
        status: asset.status
      },
      status: 'SUCCESS'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="AAI_Retirement_${assetId}.pdf"`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Generate PDF Vendor AMC SLA Agreement Report (Admin only)
 */
export const exportAmcPdf = async (req, res, next) => {
  try {
    const { contractNumber } = req.params;
    const amc = await amcRepository.findById(contractNumber);
    if (!amc) {
      return sendError(res, `AMC Agreement '${contractNumber}' not found`, 404);
    }

    const buffer = await exportService.generateAmcReportPdf(contractNumber);

    await auditRepository.logEvent({
      action: 'AMC_REPORT_GENERATED',
      entityType: 'EXPORT',
      entityId: contractNumber,
      actor: getAuditActor(req),
      details: {
        documentType: 'AMC_REPORT_PDF',
        contractNumber,
        vendorName: amc.vendorName
      },
      status: 'SUCCESS'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="AAI_AMC_${contractNumber}.pdf"`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Legacy Handover slip generator (auto-routes to Assignment, Transfer, or Return)
 */
export const exportHandoverPdf = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment) {
      return sendError(res, `Custody assignment '${assignmentId}' not found`, 404);
    }

    if (req.user?.role === 'EMPLOYEE' && req.user.employeeId !== assignment.employeeId) {
      return sendError(res, 'Unauthorized: Staff employees can only download their own official handover slips', 403);
    }

    const buffer = await exportService.generateHandoverPdf(assignmentId);

    await auditRepository.logEvent({
      action: 'PDF_GENERATED',
      entityType: 'EXPORT',
      entityId: assignmentId,
      actor: getAuditActor(req),
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
 * Legacy Asset Handover slip generator
 */
export const exportAssetHandoverPdf = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    let targetAssignment = await assignmentRepository.findCurrentAssignment(assetId);

    if (!targetAssignment) {
      const history = await assignmentRepository.findHistoryByAsset(assetId);
      if (!history || history.length === 0) {
        return sendError(res, `No assignment or custody records exist for asset '${assetId}'`, 404);
      }
      targetAssignment = history[0];
    }

    if (req.user?.role === 'EMPLOYEE' && req.user.employeeId !== targetAssignment.employeeId) {
      return sendError(res, 'Unauthorized: Staff employees can only download their own official handover slips', 403);
    }

    const buffer = await exportService.generateHandoverPdf(targetAssignment.assignmentId);

    await auditRepository.logEvent({
      action: 'PDF_GENERATED',
      entityType: 'EXPORT',
      entityId: targetAssignment.assignmentId,
      actor: getAuditActor(req),
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
