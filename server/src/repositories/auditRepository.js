import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';
import { logger } from '../utils/logger.js';

const memoryAuditLogs = [];

const seedAuditLogs = () => {
  if (memoryAuditLogs.length === 0) {
    const list = [
      {
        _id: '66d700000000000000000001',
        action: 'USER_LOGIN',
        entityType: 'AUTH',
        entityId: 'admin',
        actor: {
          userId: '66d000000000000000000001',
          username: 'admin',
          name: 'Regional IT Administrator',
          role: 'ADMIN',
          ipAddress: '127.0.0.1'
        },
        details: { message: 'Successful administrator credential authentication' },
        status: 'SUCCESS',
        timestamp: new Date(Date.now() - 3600000 * 4)
      },
      {
        _id: '66d700000000000000000002',
        action: 'ASSET_CREATED',
        entityType: 'ASSET',
        entityId: 'AAI-REG-PC-2024-0001',
        actor: {
          userId: '66d000000000000000000001',
          username: 'admin',
          name: 'Regional IT Administrator',
          role: 'ADMIN',
          ipAddress: '127.0.0.1'
        },
        details: {
          assetName: 'Dell OptiPlex 7090 MT Workstation',
          category: 'Desktop PC / Workstation',
          serialNumber: 'DEL-OPT-7090-001',
          department: 'Communication, Navigation & Surveillance'
        },
        status: 'SUCCESS',
        timestamp: new Date(Date.now() - 3600000 * 3)
      },
      {
        _id: '66d700000000000000000003',
        action: 'CUSTODY_ASSIGNED',
        entityType: 'ASSIGNMENT',
        entityId: 'AAI-REG-PC-2024-0001',
        actor: {
          userId: '66d000000000000000000001',
          username: 'admin',
          name: 'Regional IT Administrator',
          role: 'ADMIN',
          ipAddress: '127.0.0.1'
        },
        details: {
          employeeId: 'AAI-10842',
          employeeName: 'Roshan R',
          department: 'Communication, Navigation & Surveillance'
        },
        status: 'SUCCESS',
        timestamp: new Date(Date.now() - 3600000 * 2)
      },
      {
        _id: '66d700000000000000000004',
        action: 'COMPLAINT_CREATED',
        entityType: 'COMPLAINT',
        entityId: 'AAI-TKT-2024-0001',
        actor: {
          userId: '66d000000000000000000002',
          username: 'priya.nair',
          name: 'Priya Nair',
          role: 'EMPLOYEE',
          ipAddress: '127.0.0.1'
        },
        details: {
          assetId: 'AAI-REG-SCN-2023-0010',
          severity: 'HIGH',
          title: 'Automatic document feeder jam'
        },
        status: 'SUCCESS',
        timestamp: new Date(Date.now() - 3600000)
      }
    ];

    for (const item of list) {
      memoryAuditLogs.push(item);
    }
  }
};

seedAuditLogs();

const isDbConnected = () => mongoose.connection.readyState === 1;

export const auditRepository = {
  /**
   * Log an immutable audit event
   */
  logEvent: async ({
    action,
    entityType = 'SYSTEM',
    entityId = null,
    actor = {},
    details = {},
    status = 'SUCCESS'
  }) => {
    const auditRecord = {
      action: (action || 'UNKNOWN_ACTION').toUpperCase(),
      entityType: (entityType || 'SYSTEM').toUpperCase(),
      entityId: entityId ? String(entityId) : null,
      actor: {
        userId: actor.userId ? String(actor.userId) : null,
        username: actor.username || 'SYSTEM',
        name: actor.name || 'System Process',
        role: actor.role || 'SYSTEM',
        ipAddress: actor.ipAddress || actor.ip || '127.0.0.1'
      },
      details: details || {},
      status: status || 'SUCCESS',
      timestamp: new Date()
    };

    if (isDbConnected()) {
      try {
        const created = await AuditLog.create(auditRecord);
        return created.toObject();
      } catch (err) {
        logger.warn(`Failed to persist audit log in MongoDB, falling back to memory: ${err.message}`);
      }
    }

    const memoryItem = {
      _id: `mem_audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...auditRecord
    };
    memoryAuditLogs.unshift(memoryItem);
    return memoryItem;
  },

  /**
   * Find audit logs with search, filter, and pagination
   */
  find: async ({
    page = 1,
    limit = 20,
    action,
    entityType,
    entityId,
    search,
    startDate,
    endDate,
    sortBy = 'timestamp',
    sortOrder = 'desc'
  } = {}) => {
    seedAuditLogs();

    if (isDbConnected()) {
      try {
        const filter = {};
        if (action) filter.action = action.toUpperCase();
        if (entityType) filter.entityType = entityType.toUpperCase();
        if (entityId) filter.entityId = entityId;

        if (startDate || endDate) {
          filter.timestamp = {};
          if (startDate) filter.timestamp.$gte = new Date(startDate);
          if (endDate) filter.timestamp.$lte = new Date(endDate);
        }

        if (search) {
          const regex = new RegExp(search, 'i');
          filter.$or = [
            { action: regex },
            { entityId: regex },
            { 'actor.username': regex },
            { 'actor.name': regex }
          ];
        }

        const skip = (page - 1) * limit;
        const total = await AuditLog.countDocuments(filter);
        const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

        const items = await AuditLog.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean();

        return { items, total, page, limit };
      } catch (err) {
        logger.warn(`MongoDB audit find query failed: ${err.message}. Using memory store.`);
      }
    }

    // In-memory querying
    let filtered = [...memoryAuditLogs];

    if (action) {
      filtered = filtered.filter(l => (l.action || '').toUpperCase() === action.toUpperCase());
    }

    if (entityType) {
      filtered = filtered.filter(l => (l.entityType || '').toUpperCase() === entityType.toUpperCase());
    }

    if (entityId) {
      filtered = filtered.filter(l => l.entityId === entityId);
    }

    if (startDate) {
      const s = new Date(startDate).getTime();
      filtered = filtered.filter(l => new Date(l.timestamp).getTime() >= s);
    }

    if (endDate) {
      const e = new Date(endDate).getTime();
      filtered = filtered.filter(l => new Date(l.timestamp).getTime() <= e);
    }

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(l =>
        (l.action && l.action.toLowerCase().includes(s)) ||
        (l.entityId && l.entityId.toLowerCase().includes(s)) ||
        (l.actor?.username && l.actor.username.toLowerCase().includes(s)) ||
        (l.actor?.name && l.actor.name.toLowerCase().includes(s)) ||
        (l.details && JSON.stringify(l.details).toLowerCase().includes(s))
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

    const total = filtered.length;
    const skip = (page - 1) * limit;
    const items = filtered.slice(skip, skip + limit);

    return { items, total, page, limit };
  },

  findPaginated: async function(options) {
    return this.find(options);
  },

  /**
   * Aggregate audit event summary counts
   */
  getSummary: async () => {
    seedAuditLogs();
    const { items: allLogs } = await auditRepository.find({ limit: 10000 });

    const byAction = {};
    const byEntityType = {};
    let totalSuccess = 0;
    let totalFailed = 0;

    for (const log of allLogs) {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      byEntityType[log.entityType] = (byEntityType[log.entityType] || 0) + 1;
      if (log.status === 'FAILED') totalFailed++;
      else totalSuccess++;
    }

    return {
      total: allLogs.length,
      totalSuccess,
      totalFailed,
      byAction,
      byEntityType
    };
  },

  /**
   * Reset logs for testing isolation
   */
  clear: () => {
    memoryAuditLogs.length = 0;
  }
};
