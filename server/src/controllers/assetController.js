import { assetRepository } from '../repositories/assetRepository.js';
import { employeeRepository } from '../repositories/employeeRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/apiResponse.js';

export const getAssets = async (req, res, next) => {
  try {
    const {
      search = '',
      category = '',
      status = '',
      department = '',
      floor = '',
      warrantyStatus = '',
      employeeId = '',
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const { items, total } = await assetRepository.find({
      search,
      category,
      status,
      department,
      floor,
      warrantyStatus,
      employeeId,
      page: Number(page),
      limit: Number(limit),
      sortBy,
      sortOrder
    });

    return sendPaginated(res, items, { page, limit, total }, 'Assets retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getAssetById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const asset = await assetRepository.findById(id);

    if (!asset) {
      return sendError(res, `Asset not found with identifier: ${id}`, 404);
    }

    return sendSuccess(res, asset, 'Asset details retrieved');
  } catch (error) {
    next(error);
  }
};

export const createAsset = async (req, res, next) => {
  try {
    const { serialNumber, assetId, currentEmployeeId } = req.body;

    // 1. Verify Serial Number Uniqueness
    const existingSerial = await assetRepository.findBySerialNumber(serialNumber);
    if (existingSerial) {
      return sendError(res, `Asset with Serial Number '${serialNumber}' already exists (Asset ID: ${existingSerial.assetId}).`, 409);
    }

    // 2. Verify Asset ID Uniqueness if explicitly provided
    if (assetId) {
      const existingId = await assetRepository.findById(assetId);
      if (existingId) {
        return sendError(res, `Asset with ID '${assetId}' already exists.`, 409);
      }
    }

    // 3. Resolve initial employee if supplied
    let employeeData = {};
    if (currentEmployeeId) {
      const emp = await employeeRepository.findByEmployeeId(currentEmployeeId);
      if (!emp) {
        return sendError(res, `Assigned employee '${currentEmployeeId}' does not exist.`, 404);
      }
      employeeData = {
        currentEmployeeId: emp.employeeId,
        currentEmployeeName: emp.name,
        currentDesignation: emp.designation,
        currentAssignmentDate: new Date()
      };
    }

    const newAsset = await assetRepository.create({
      ...req.body,
      ...employeeData
    });

    // Audit Logging
    await auditRepository.logEvent({
      action: 'ASSET_CREATED',
      entityType: 'ASSET',
      entityId: newAsset.assetId,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        assetName: newAsset.assetName,
        category: newAsset.category,
        serialNumber: newAsset.serialNumber,
        department: newAsset.department,
        status: newAsset.status
      },
      status: 'SUCCESS'
    });

    return sendSuccess(res, newAsset, 'Asset registered successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateAsset = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await assetRepository.update(id, req.body);

    if (!updated) {
      return sendError(res, `Asset not found to update: ${id}`, 404);
    }

    // Audit Logging
    await auditRepository.logEvent({
      action: 'ASSET_UPDATED',
      entityType: 'ASSET',
      entityId: updated.assetId || id,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        updatedFields: Object.keys(req.body),
        assetName: updated.assetName,
        department: updated.department
      },
      status: 'SUCCESS'
    });

    return sendSuccess(res, updated, 'Asset updated successfully');
  } catch (error) {
    next(error);
  }
};

export const retireAsset = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'End of operational lifespan' } = req.body;

    const retired = await assetRepository.retire(id, reason);
    if (!retired) {
      return sendError(res, `Asset not found to retire: ${id}`, 404);
    }

    // Audit Logging
    await auditRepository.logEvent({
      action: 'ASSET_RETIRED',
      entityType: 'ASSET',
      entityId: retired.assetId || id,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        reason,
        assetName: retired.assetName,
        previousStatus: 'AVAILABLE'
      },
      status: 'SUCCESS'
    });

    return sendSuccess(res, retired, 'Asset has been successfully decommissioned and retired');
  } catch (error) {
    next(error);
  }
};

export const deleteAsset = async (req, res, next) => {
  try {
    const { id } = req.params;
    const archived = await assetRepository.delete(id);

    if (!archived) {
      return sendError(res, `Asset not found: ${id}`, 404);
    }

    // Audit Logging
    await auditRepository.logEvent({
      action: 'ASSET_DELETED',
      entityType: 'ASSET',
      entityId: id,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: { message: 'Asset archived from active inventory. Historical custody preserved.' },
      status: 'SUCCESS'
    });

    return sendSuccess(res, null, 'Asset successfully archived. Historical custody remains preserved.');
  } catch (error) {
    next(error);
  }
};
