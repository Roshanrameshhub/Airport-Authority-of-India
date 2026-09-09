import { exportService } from '../services/exportService.js';
import { assignmentRepository } from '../repositories/assignmentRepository.js';
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
    const buffer = await exportService.generateHandoverPdf(assignmentId);

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
    const current = await assignmentRepository.findCurrentAssignment(assetId);

    if (!current) {
      // Check if there is any historical assignment
      const history = await assignmentRepository.findHistoryByAsset(assetId);
      if (!history || history.length === 0) {
        return sendError(res, `No assignment or custody records exist for asset '${assetId}'`, 404);
      }
      // Use latest historical assignment
      const latest = history[0];
      const buffer = await exportService.generateHandoverPdf(latest.assignmentId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="AAI_Handover_${latest.assignmentId}.pdf"`);
      return res.send(buffer);
    }

    const buffer = await exportService.generateHandoverPdf(current.assignmentId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="AAI_Handover_${current.assignmentId}.pdf"`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};
