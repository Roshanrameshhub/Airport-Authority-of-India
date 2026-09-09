import { assetRepository } from './assetRepository.js';
import { complaintRepository } from './complaintRepository.js';
import { employeeRepository } from './employeeRepository.js';
import { assignmentRepository } from './assignmentRepository.js';
import { calculateWarrantyStatus } from '../utils/warranty.js';

export const dashboardRepository = {
  /**
   * Aggregate executive KPI metrics across the regional inventory
   */
  getStats: async () => {
    const assetsRes = await assetRepository.find({ limit: 10000 });
    const assets = assetsRes.items || [];

    const complaintsRes = await complaintRepository.findPaginated({ limit: 10000 });
    const complaints = complaintsRes.items || [];

    const employeesRes = await employeeRepository.find({ limit: 10000 });
    const employees = employeesRes.items || [];

    let totalAssets = assets.length;
    let assignedAssets = 0;
    let availableAssets = 0;
    let maintenanceAssets = 0;
    let retiredAssets = 0;

    let activeWarranties = 0;
    let expiringSoonWarranties = 0;
    let expiredWarranties = 0;

    const now = new Date();

    for (const asset of assets) {
      const status = (asset.status || '').toUpperCase();
      if (status === 'ASSIGNED') assignedAssets++;
      else if (status === 'AVAILABLE') availableAssets++;
      else if (status === 'UNDER_MAINTENANCE') maintenanceAssets++;
      else if (status === 'RETIRED' || status === 'DISPOSED') retiredAssets++;

      const wStatus = calculateWarrantyStatus(asset.warrantyEndDate);
      if (wStatus === 'ACTIVE') activeWarranties++;
      else if (wStatus === 'EXPIRING_SOON') expiringSoonWarranties++;
      else if (wStatus === 'EXPIRED') expiredWarranties++;
    }

    const serviceableAssets = assignedAssets + availableAssets;
    const utilizationRate = serviceableAssets > 0 
      ? Number(((assignedAssets / serviceableAssets) * 100).toFixed(1)) 
      : 0;

    let openComplaints = 0;
    let inProgressComplaints = 0;
    let resolvedComplaints = 0;
    let closedComplaints = 0;
    let criticalComplaints = 0;

    for (const comp of complaints) {
      const st = (comp.status || '').toUpperCase();
      if (st === 'OPEN') openComplaints++;
      else if (st === 'IN_PROGRESS') inProgressComplaints++;
      else if (st === 'RESOLVED') resolvedComplaints++;
      else if (st === 'CLOSED') closedComplaints++;

      const prio = (comp.priority || comp.severity || '').toUpperCase();
      if ((prio.includes('CRITICAL') || prio === 'P1_CRITICAL') && st !== 'CLOSED') {
        criticalComplaints++;
      }
    }

    return {
      assets: {
        total: totalAssets,
        assigned: assignedAssets,
        available: availableAssets,
        maintenance: maintenanceAssets,
        retired: retiredAssets,
        utilizationRate
      },
      warranties: {
        active: activeWarranties,
        expiringSoon: expiringSoonWarranties,
        expired: expiredWarranties,
        actionRequired: expiringSoonWarranties + expiredWarranties
      },
      complaints: {
        total: complaints.length,
        open: openComplaints,
        inProgress: inProgressComplaints,
        resolved: resolvedComplaints,
        closed: closedComplaints,
        active: openComplaints + inProgressComplaints,
        critical: criticalComplaints
      },
      employees: {
        total: employees.length
      },
      generatedAt: now.toISOString()
    };
  },

  /**
   * Aggregate distribution of equipment across hardware categories
   */
  getCategoryDistribution: async () => {
    const assetsRes = await assetRepository.find({ limit: 10000 });
    const assets = assetsRes.items || [];
    const total = assets.length;

    const catMap = new Map();

    for (const a of assets) {
      const cat = a.category || 'Other / Uncategorized';
      if (!catMap.has(cat)) {
        catMap.set(cat, {
          category: cat,
          count: 0,
          assigned: 0,
          available: 0,
          maintenance: 0,
          percentage: 0
        });
      }
      const entry = catMap.get(cat);
      entry.count++;
      const st = (a.status || '').toUpperCase();
      if (st === 'ASSIGNED') entry.assigned++;
      else if (st === 'AVAILABLE') entry.available++;
      else if (st === 'UNDER_MAINTENANCE') entry.maintenance++;
    }

    const result = Array.from(catMap.values())
      .map(item => ({
        ...item,
        percentage: total > 0 ? Number(((item.count / total) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.count - a.count);

    return result;
  },

  /**
   * Aggregate distribution and equipment utilization by regional department
   */
  getDepartmentDistribution: async () => {
    const assetsRes = await assetRepository.find({ limit: 10000 });
    const assets = assetsRes.items || [];

    const employeesRes = await employeeRepository.find({ limit: 10000 });
    const employees = employeesRes.items || [];

    const deptMap = new Map();

    // Map department employees
    for (const emp of employees) {
      const dept = emp.department || 'Unassigned';
      if (!deptMap.has(dept)) {
        deptMap.set(dept, {
          department: dept,
          assetCount: 0,
          assignedCount: 0,
          availableCount: 0,
          maintenanceCount: 0,
          employeeCount: 0
        });
      }
      deptMap.get(dept).employeeCount++;
    }

    // Map department assets
    for (const a of assets) {
      const dept = a.department || 'General Pool';
      if (!deptMap.has(dept)) {
        deptMap.set(dept, {
          department: dept,
          assetCount: 0,
          assignedCount: 0,
          availableCount: 0,
          maintenanceCount: 0,
          employeeCount: 0
        });
      }
      const entry = deptMap.get(dept);
      entry.assetCount++;
      const st = (a.status || '').toUpperCase();
      if (st === 'ASSIGNED') entry.assignedCount++;
      else if (st === 'AVAILABLE') entry.availableCount++;
      else if (st === 'UNDER_MAINTENANCE') entry.maintenanceCount++;
    }

    return Array.from(deptMap.values())
      .sort((a, b) => b.assetCount - a.assetCount);
  },

  /**
   * Warranty alert engine: retrieves assets needing immediate contract renewal or attention
   */
  getWarrantyAlerts: async () => {
    const assetsRes = await assetRepository.find({ limit: 10000 });
    const assets = assetsRes.items || [];
    const now = new Date();

    const alerts = [];

    for (const a of assets) {
      const wStatus = calculateWarrantyStatus(a.warrantyEndDate);
      if (wStatus === 'EXPIRING_SOON' || wStatus === 'EXPIRED') {
        const endDate = new Date(a.warrantyEndDate);
        const diffMs = endDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        alerts.push({
          _id: a._id,
          assetId: a.assetId,
          assetName: a.assetName,
          category: a.category,
          serialNumber: a.serialNumber,
          make: a.make,
          model: a.model,
          department: a.department,
          floor: a.floor,
          currentEmployeeName: a.currentEmployeeName || 'Unassigned',
          currentEmployeeId: a.currentEmployeeId || null,
          warrantyStartDate: a.warrantyStartDate,
          warrantyEndDate: a.warrantyEndDate,
          warrantyStatus: wStatus,
          daysRemaining,
          urgency: daysRemaining <= 0 ? 'CRITICAL_EXPIRED' : (daysRemaining <= 15 ? 'HIGH_WARNING' : 'MODERATE_WARNING')
        });
      }
    }

    // Sort most urgent (expired or closest to expiring) first
    alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return alerts;
  },

  /**
   * Consolidated activity feed across custody assignments, complaints, and asset lifecycle events
   */
  getRecentActivity: async (limit = 10) => {
    const assignmentsRes = await assignmentRepository.findPaginated({ limit: 20 });
    const assignments = assignmentsRes.items || [];

    const complaintsRes = await complaintRepository.findPaginated({ limit: 20 });
    const complaints = complaintsRes.items || [];

    const assetsRes = await assetRepository.find({ limit: 20, sortBy: 'createdAt', sortOrder: 'desc' });
    const assets = assetsRes.items || [];

    const events = [];

    for (const asg of assignments) {
      const isTransfer = asg.status === 'TRANSFERRED' || (asg.transferReason && asg.transferReason.toLowerCase().includes('transfer'));
      const isReturn = asg.status === 'RETURNED' || asg.returnedDate;

      let eventType = 'ASSIGNMENT';
      let title = `Asset Assigned to ${asg.employeeName}`;
      if (isTransfer) {
        eventType = 'TRANSFER';
        title = `Custody Transfer: ${asg.assetName}`;
      } else if (isReturn) {
        eventType = 'RETURN';
        title = `Asset Returned: ${asg.assetName}`;
      }

      events.push({
        id: asg._id || asg.assignmentId,
        type: eventType,
        title,
        description: asg.transferReason || asg.remarks || `Custody assigned in ${asg.department}`,
        entityId: asg.assetId,
        timestamp: asg.assignedDate || asg.createdAt || new Date(),
        badge: eventType
      });
    }

    for (const cmp of complaints) {
      events.push({
        id: cmp._id || cmp.ticketId,
        type: 'COMPLAINT',
        title: `Service Ticket ${cmp.ticketId}: ${cmp.title}`,
        description: `Status: ${cmp.status} | Priority: ${cmp.priority} | Asset: ${cmp.assetId}`,
        entityId: cmp.ticketId,
        timestamp: cmp.createdAt || new Date(),
        badge: cmp.status
      });
    }

    for (const ast of assets) {
      if (ast.createdAt) {
        events.push({
          id: ast._id || ast.assetId,
          type: 'ASSET_CREATED',
          title: `New Asset Registered: ${ast.assetName}`,
          description: `${ast.category} (${ast.serialNumber}) stationed at ${ast.department}`,
          entityId: ast.assetId,
          timestamp: ast.createdAt,
          badge: 'NEW_ASSET'
        });
      }
    }

    // Sort descending by timestamp
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return events.slice(0, Number(limit));
  }
};
