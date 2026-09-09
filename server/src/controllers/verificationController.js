import { verificationRepository } from '../repositories/verificationRepository.js';
import { assetRepository } from '../repositories/assetRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const listCampaigns = async (req, res, next) => {
  try {
    const campaigns = await verificationRepository.listCampaigns();
    return sendSuccess(res, campaigns, 'Verification campaigns retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getCampaignById = async (req, res, next) => {
  try {
    const { campaignId } = req.params;
    const campaign = await verificationRepository.getCampaignById(campaignId);
    if (!campaign) {
      return sendError(res, `Verification campaign '${campaignId}' not found`, 404);
    }

    // Get total asset count to calculate progress
    const { total: totalAssets } = await assetRepository.find({ limit: 1 });
    const verifiedCount = campaign.records ? campaign.records.length : 0;
    const discrepancyCount = (campaign.records || []).filter(r => r.result !== 'VERIFIED').length;

    return sendSuccess(res, {
      ...campaign,
      totalExpectedAssets: totalAssets,
      verifiedCount,
      discrepancyCount,
      progressPercentage: totalAssets > 0 ? Math.round((verifiedCount / totalAssets) * 100) : 0
    }, 'Campaign details retrieved');
  } catch (error) {
    next(error);
  }
};

export const createCampaign = async (req, res, next) => {
  try {
    const { name, financialYear, department, notes } = req.body;
    if (!name) {
      return sendError(res, 'Campaign title / name is required', 400);
    }

    const created = await verificationRepository.createCampaign({
      name,
      financialYear: financialYear || '2025-26',
      department: department || 'ALL',
      createdBy: req.user?.username || 'admin',
      notes
    });

    await auditRepository.logEvent({
      action: 'PHYSICAL_VERIFICATION_CAMPAIGN_STARTED',
      entityType: 'ASSET',
      entityId: created.campaignId,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        campaignId: created.campaignId,
        name: created.name,
        financialYear: created.financialYear
      },
      status: 'SUCCESS'
    });

    return sendSuccess(res, created, 'Annual Physical Verification Campaign launched successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const recordAssetVerification = async (req, res, next) => {
  try {
    const { campaignId } = req.params;
    const { assetId, observedLocation, observedCondition, result, remarks } = req.body;

    if (!assetId) {
      return sendError(res, 'Asset ID or Serial Number is required for verification', 400);
    }

    const { campaign, record } = await verificationRepository.recordVerification(campaignId, {
      assetId,
      observedLocation,
      observedCondition,
      result,
      verifier: req.user?.name || req.user?.username || 'admin',
      remarks
    });

    // Audit Logging
    await auditRepository.logEvent({
      action: 'QR_VERIFICATION',
      entityType: 'ASSET',
      entityId: record.assetId,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        campaignId,
        result: record.result,
        observedCondition: record.observedCondition,
        observedLocation: record.observedLocation,
        remarks: record.remarks
      },
      status: 'SUCCESS'
    });

    return sendSuccess(res, { campaign, record }, `Asset '${record.assetId}' verification recorded: ${record.result}`);
  } catch (error) {
    next(error);
  }
};

export const finalizeCampaign = async (req, res, next) => {
  try {
    const { campaignId } = req.params;
    const finalized = await verificationRepository.finalizeCampaign(campaignId);
    if (!finalized) {
      return sendError(res, `Verification campaign '${campaignId}' not found`, 404);
    }

    await auditRepository.logEvent({
      action: 'PHYSICAL_VERIFICATION_CAMPAIGN_FINALIZED',
      entityType: 'ASSET',
      entityId: campaignId,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        campaignId,
        totalVerified: (finalized.records || []).length,
        discrepancies: (finalized.records || []).filter(r => r.result !== 'VERIFIED').length
      },
      status: 'SUCCESS'
    });

    return sendSuccess(res, finalized, 'Verification campaign finalized. Formal inventory discrepancy report generated.');
  } catch (error) {
    next(error);
  }
};
