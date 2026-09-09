import mongoose from 'mongoose';
import VerificationCampaign from '../models/VerificationCampaign.js';
import { assetRepository } from './assetRepository.js';
import { logger } from '../utils/logger.js';

const memoryCampaigns = new Map();

const seedCampaigns = () => {
  if (memoryCampaigns.size === 0) {
    const defaultCampaign = {
      _id: '66d800000000000000000001',
      campaignId: 'VCP-2025-001',
      name: 'Annual Physical Asset Verification FY 2025-26',
      financialYear: '2025-26',
      department: 'ALL',
      status: 'ACTIVE',
      startDate: new Date('2025-04-01T00:00:00Z'),
      finalizedDate: null,
      createdBy: 'admin',
      notes: 'Institutional inventory reconciliation campaign (Technically Recommended — Business Confirmation Required)',
      records: [
        {
          assetId: 'AAI-REG-PC-2024-0001',
          assetName: 'Dell OptiPlex 7090 MT Workstation',
          category: 'Desktop PC',
          serialNumber: 'DL-7090-99481',
          expectedDepartment: 'Communication, Navigation & Surveillance',
          expectedFloor: '2nd Floor, Technical Block',
          expectedCustodian: 'Staff Employee (AAI-10842)',
          observedLocation: '2nd Floor, Technical Block, Cabin 204',
          observedCondition: 'EXCELLENT',
          result: 'VERIFIED',
          verifier: 'admin',
          verifiedAt: new Date(),
          remarks: 'Asset serial tag matched and verified physically operational.'
        }
      ]
    };
    memoryCampaigns.set(defaultCampaign.campaignId, defaultCampaign);
  }
};

seedCampaigns();

const isDbConnected = () => mongoose.connection.readyState === 1;

export const verificationRepository = {
  listCampaigns: async () => {
    seedCampaigns();
    if (isDbConnected()) {
      try {
        const list = await VerificationCampaign.find().sort({ startDate: -1 }).lean();
        if (list.length > 0) return list;
      } catch (err) {
        logger.warn(`Failed to list verification campaigns from MongoDB: ${err.message}`);
      }
    }
    return Array.from(memoryCampaigns.values()).sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  },

  getCampaignById: async (campaignId) => {
    seedCampaigns();
    const cid = String(campaignId).trim().toUpperCase();
    if (isDbConnected()) {
      try {
        const item = await VerificationCampaign.findOne({ campaignId: cid }).lean();
        if (item) return item;
      } catch (err) {
        logger.warn(`Failed to get campaign from MongoDB: ${err.message}`);
      }
    }
    return memoryCampaigns.get(cid) || null;
  },

  createCampaign: async ({ name, financialYear = '2025-26', department = 'ALL', createdBy = 'admin', notes = '' }) => {
    const count = (await verificationRepository.listCampaigns()).length;
    const campaignId = `VCP-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const campaignData = {
      campaignId,
      name,
      financialYear,
      department,
      status: 'ACTIVE',
      startDate: new Date(),
      finalizedDate: null,
      createdBy,
      notes: notes || 'Technically Recommended — Business Confirmation Required',
      records: []
    };

    if (isDbConnected()) {
      try {
        const created = await VerificationCampaign.create(campaignData);
        return created.toObject();
      } catch (err) {
        logger.warn(`Failed to persist verification campaign in MongoDB: ${err.message}`);
      }
    }

    memoryCampaigns.set(campaignId, campaignData);
    return campaignData;
  },

  recordVerification: async (campaignId, {
    assetId,
    observedLocation,
    observedCondition = 'GOOD',
    result = 'VERIFIED',
    verifier = 'admin',
    remarks = ''
  }) => {
    const aid = String(assetId).trim().toUpperCase();
    const asset = await assetRepository.findById(aid) || await assetRepository.findBySerialNumber(aid);

    const record = {
      assetId: asset ? asset.assetId : aid,
      assetName: asset ? asset.assetName : 'Unknown Asset',
      category: asset ? asset.category : 'General Equipment',
      serialNumber: asset ? asset.serialNumber : 'N/A',
      expectedDepartment: asset ? asset.department : 'N/A',
      expectedFloor: asset ? asset.floor : 'N/A',
      expectedCustodian: asset?.currentEmployeeName ? `${asset.currentEmployeeName} (${asset.currentEmployeeId || ''})` : 'Unassigned (In Store)',
      observedLocation: observedLocation || (asset ? asset.floor : 'Floor Location'),
      observedCondition: observedCondition || (asset ? asset.condition : 'GOOD'),
      result: ['VERIFIED', 'NOT_FOUND', 'DAMAGED', 'MOVED', 'UNAUTHORIZED_LOCATION'].includes(result) ? result : 'VERIFIED',
      verifier,
      verifiedAt: new Date(),
      remarks
    };

    const cid = String(campaignId).trim().toUpperCase();

    if (isDbConnected()) {
      try {
        // Remove prior record for same asset in this campaign if any, then push new record
        await VerificationCampaign.updateOne(
          { campaignId: cid },
          { $pull: { records: { assetId: record.assetId } } }
        );
        const updated = await VerificationCampaign.findOneAndUpdate(
          { campaignId: cid },
          { $push: { records: record } },
          { new: true }
        ).lean();
        if (updated) return { campaign: updated, record };
      } catch (err) {
        logger.warn(`Failed to update verification record in MongoDB: ${err.message}`);
      }
    }

    const campaign = memoryCampaigns.get(cid);
    if (!campaign) {
      throw new Error(`Campaign '${campaignId}' not found`);
    }

    campaign.records = (campaign.records || []).filter(r => r.assetId !== record.assetId);
    campaign.records.push(record);
    return { campaign, record };
  },

  finalizeCampaign: async (campaignId) => {
    const cid = String(campaignId).trim().toUpperCase();
    if (isDbConnected()) {
      try {
        const updated = await VerificationCampaign.findOneAndUpdate(
          { campaignId: cid },
          { $set: { status: 'FINALIZED', finalizedDate: new Date() } },
          { new: true }
        ).lean();
        if (updated) return updated;
      } catch (err) {
        logger.warn(`Failed to finalize campaign in MongoDB: ${err.message}`);
      }
    }

    const campaign = memoryCampaigns.get(cid);
    if (campaign) {
      campaign.status = 'FINALIZED';
      campaign.finalizedDate = new Date();
      return campaign;
    }
    return null;
  }
};
