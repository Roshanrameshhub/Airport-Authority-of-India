import { amcRepository } from '../repositories/amcRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const getAMCs = async (req, res, next) => {
  try {
    const { search, status, serviceType } = req.query;
    const contracts = await amcRepository.find({ search, status, serviceType });
    return sendSuccess(res, contracts, 'Vendor AMC contracts retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getAMCById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const contract = await amcRepository.findById(id);
    if (!contract) {
      return sendError(res, `AMC contract '${id}' not found`, 404);
    }
    return sendSuccess(res, contract, 'AMC contract details retrieved');
  } catch (error) {
    next(error);
  }
};

export const createAMC = async (req, res, next) => {
  try {
    const {
      contractNumber,
      vendorName,
      serviceType = 'HARDWARE_SUPPORT',
      startDate,
      endDate,
      supportTier,
      contactPerson,
      contactPhone,
      contactEmail,
      coveredCategories = [],
      annualCostINR = 0,
      remarks = ''
    } = req.body;

    if (!contractNumber || !vendorName || !startDate || !endDate) {
      return sendError(res, 'contractNumber, vendorName, startDate, and endDate are required', 400);
    }

    const existing = await amcRepository.findById(contractNumber);
    if (existing) {
      return sendError(res, `Contract Number '${contractNumber}' already exists`, 409);
    }

    const contract = await amcRepository.create({
      contractNumber,
      vendorName,
      serviceType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      supportTier,
      contactPerson,
      contactPhone,
      contactEmail,
      coveredCategories,
      annualCostINR,
      remarks
    });

    // Audit Event
    await auditRepository.logEvent({
      action: 'AMC_CONTRACT_CREATED',
      entityType: 'SYSTEM',
      entityId: contract.contractNumber,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        contractNumber: contract.contractNumber,
        vendorName: contract.vendorName,
        supportTier: contract.supportTier,
        endDate: contract.endDate
      },
      status: 'SUCCESS'
    });

    return sendSuccess(res, contract, 'Vendor AMC contract registered successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getAMCAlerts = async (req, res, next) => {
  try {
    const alerts = await amcRepository.getAlerts();
    return sendSuccess(res, alerts, 'Active AMC renewal alerts retrieved');
  } catch (error) {
    next(error);
  }
};
