import { assetRepository } from '../repositories/assetRepository.js';
import { employeeRepository } from '../repositories/employeeRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { assignmentRepository } from '../repositories/assignmentRepository.js';
import { complaintRepository } from '../repositories/complaintRepository.js';
import { relationshipRepository } from '../repositories/relationshipRepository.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/apiResponse.js';

const MAX_PAGE_SIZE = 100;

export const getAssets = async (req, res, next) => {
  try {
    const {
      search = '',
      category = '',
      assetType = '',
      status = '',
      condition = '',
      department = '',
      floor = '',
      room = '',
      supplier = '',
      vendor = '',
      make = '',
      model = '',
      technology = '',
      location = '',
      operatingSystem = '',
      ipAddress = '',
      amcApplicable = '',
      amcContractId = '',
      warrantyStatus = '',
      employeeId = '',
      employeeType = '',
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isArchived
    } = req.query;

    // Hardened pagination: default 10, capped at MAX_PAGE_SIZE (100), handles NaN / negative safely
    let parsedLimit = Number(limit);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      parsedLimit = 10;
    } else if (parsedLimit > MAX_PAGE_SIZE) {
      parsedLimit = MAX_PAGE_SIZE;
    }

    let parsedPage = Number(page);
    if (isNaN(parsedPage) || parsedPage <= 0) {
      parsedPage = 1;
    }

    // Role-governed archive visibility: ADMIN can request isArchived=true/false; EMPLOYEE always false
    let resolvedIsArchived = false;
    if (req.user?.role === 'ADMIN' && isArchived !== undefined) {
      resolvedIsArchived = isArchived === 'true' || isArchived === true;
    }

    const { items, total } = await assetRepository.find({
      search,
      category,
      assetType,
      status,
      condition,
      department,
      floor,
      room,
      supplier: supplier || vendor,
      make,
      model,
      technology,
      location,
      operatingSystem,
      ipAddress,
      amcApplicable,
      amcContractId,
      warrantyStatus,
      employeeId,
      employeeType,
      page: parsedPage,
      limit: parsedLimit,
      sortBy,
      sortOrder,
      isArchived: resolvedIsArchived
    });

    return sendPaginated(res, items, { page: parsedPage, limit: parsedLimit, total }, 'Assets retrieved successfully');
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

    // 1. Verify Serial Number Uniqueness if provided
    if (serialNumber && String(serialNumber).trim()) {
      const existingSerial = await assetRepository.findBySerialNumber(serialNumber);
      if (existingSerial) {
        return sendError(res, `Asset with Serial Number '${serialNumber}' already exists (Asset ID: ${existingSerial.assetId}).`, 409);
      }
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

    // Auto-link relationship if metadata provided (e.g. Laptop MSE peripheral relationship)
    let parentAssetId = null;
    let relationshipType = 'PERIPHERAL_OF';
    let componentRole = 'MOUSE';

    if (req.body._relationship && req.body._relationship.parentAssetId) {
      parentAssetId = String(req.body._relationship.parentAssetId).trim().toUpperCase();
      if (req.body.category === 'Laptop MSE' || req.body.category === 'LAPTOP MSE' || req.body._relationship.componentRole === 'MOUSE') {
        relationshipType = 'PERIPHERAL_OF';
        componentRole = 'MOUSE';
      } else {
        relationshipType = req.body._relationship.relationshipType || 'COMPONENT_OF';
        componentRole = req.body._relationship.componentRole || 'OTHER';
      }
    } else if ((req.body.category === 'Laptop MSE' || req.body.category === 'LAPTOP MSE' || req.body.assetType === 'PERIPHERAL') && req.body.specifications?.parentLaptopId) {
      parentAssetId = String(req.body.specifications.parentLaptopId).trim().toUpperCase();
      relationshipType = 'PERIPHERAL_OF';
      componentRole = 'MOUSE';
    }

    if (parentAssetId) {
      try {
        const linked = await relationshipRepository.link({
          parentAssetId,
          childAssetId: newAsset.assetId,
          relationshipType,
          componentRole,
          notes: req.body._relationship?.notes || `Auto-linked peripheral to ${parentAssetId}`
        });

        await auditRepository.logEvent({
          action: 'RELATIONSHIP_LINKED',
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
            parentAssetId,
            childAssetId: newAsset.assetId,
            relationshipType,
            componentRole,
            relationshipId: linked._id
          },
          status: 'SUCCESS'
        });
      } catch (relError) {
        let statusCode = 400;
        if (relError.message.includes('not found')) statusCode = 404;
        if (
          relError.message.includes('already linked') ||
          relError.message.includes('cannot be linked to itself') ||
          relError.message.includes('Circular relationship') ||
          relError.message.includes('cycle')
        ) statusCode = 409;
        return sendError(res, `Asset '${newAsset.assetId}' was created, but failed to link relationship: ${relError.message}`, statusCode);
      }
    }

    return sendSuccess(res, newAsset, 'Asset registered successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const VALID_LIFECYCLE_TRANSITIONS = {
  AVAILABLE: ['ASSIGNED', 'UNDER_MAINTENANCE', 'UNDER_REPAIR', 'GODOWN', 'FAULTY', 'DAMAGED', 'LOST', 'RETIRED'],
  ASSIGNED: ['AVAILABLE', 'UNDER_MAINTENANCE', 'UNDER_REPAIR', 'FAULTY', 'DAMAGED', 'LOST'],
  GODOWN: ['AVAILABLE', 'UNDER_MAINTENANCE', 'UNDER_REPAIR', 'WRITE_OFF', 'RETIRED', 'DISPOSED'],
  UNDER_MAINTENANCE: ['AVAILABLE', 'GODOWN', 'FAULTY', 'DAMAGED', 'WRITE_OFF', 'RETIRED'],
  UNDER_REPAIR: ['AVAILABLE', 'GODOWN', 'FAULTY', 'DAMAGED', 'WRITE_OFF', 'RETIRED'],
  FAULTY: ['UNDER_MAINTENANCE', 'UNDER_REPAIR', 'GODOWN', 'WRITE_OFF', 'RETIRED'],
  DAMAGED: ['UNDER_MAINTENANCE', 'UNDER_REPAIR', 'GODOWN', 'WRITE_OFF', 'RETIRED'],
  LOST: ['AVAILABLE', 'WRITE_OFF', 'RETIRED'],
  WRITE_OFF: ['DISPOSED', 'GODOWN'],
  RETIRED: ['DISPOSED', 'GODOWN'],
  DISPOSED: [] // Terminal state
};

export const updateAsset = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Fetch current asset
    const currentAsset = await assetRepository.findById(id);
    if (!currentAsset) {
      return sendError(res, `Asset not found to update: ${id}`, 404);
    }

    // 2. Lifecycle Governance: Prevent direct status overwrite via generic update
    if (req.body.status !== undefined && req.body.status !== currentAsset.status) {
      return sendError(
        res,
        `Direct status overwrite from '${currentAsset.status}' to '${req.body.status}' via generic update is forbidden. Status must be transitioned through dedicated lifecycle operations (Assign, Transfer, Return, Retire, or PATCH /assets/:id/lifecycle).`,
        400
      );
    }

    // 3. Immutability Governance: Asset ID and DB ID are immutable and cannot be updated
    const updateData = { ...req.body };
    delete updateData.assetId;
    delete updateData._id;

    const updated = await assetRepository.update(id, updateData);

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

    // 4. Relationship Lifecycle Governance (e.g. Laptop MSE parentLaptopId relink/unlink)
    const isMseOrHasParentLaptop = 
      currentAsset.category === 'Laptop MSE' || 
      currentAsset.category === 'LAPTOP MSE' || 
      currentAsset.assetType === 'PERIPHERAL' ||
      req.body._relationship !== undefined ||
      (req.body.specifications && 'parentLaptopId' in req.body.specifications);

    if (isMseOrHasParentLaptop) {
      let requestedParentId = undefined;
      if (req.body._relationship !== undefined) {
        requestedParentId = req.body._relationship?.parentAssetId || null;
      } else if (req.body.specifications && 'parentLaptopId' in req.body.specifications) {
        requestedParentId = req.body.specifications.parentLaptopId || null;
      }

      if (requestedParentId !== undefined) {
        const normNewParent = requestedParentId ? String(requestedParentId).trim().toUpperCase() : null;
        
        // Find current active parent relationship
        const existingParentRel = await relationshipRepository.findParent(currentAsset.assetId);
        const normOldParent = existingParentRel?.asset?.assetId ? String(existingParentRel.asset.assetId).trim().toUpperCase() : null;

        try {
          // Case B: Unchanged -> do nothing
          if (normOldParent && normNewParent && normOldParent === normNewParent) {
            // Already active, do nothing
          } 
          // Case C: Parent changed -> unlink old, link new
          else if (normOldParent && normNewParent && normOldParent !== normNewParent) {
            await relationshipRepository.unlink({
              parentAssetId: normOldParent,
              childAssetId: currentAsset.assetId,
              reason: `Reassigned parent from ${normOldParent} to ${normNewParent}`
            });
            await auditRepository.logEvent({
              action: 'RELATIONSHIP_UNLINKED',
              entityType: 'ASSET',
              entityId: currentAsset.assetId,
              actor: {
                userId: req.user?._id || req.user?.id,
                username: req.user?.username || 'admin',
                name: req.user?.name || 'Administrator',
                role: req.user?.role || 'ADMIN',
                ipAddress: req.ip || '127.0.0.1'
              },
              details: {
                previousParentAssetId: normOldParent,
                newParentAssetId: normNewParent,
                childAssetId: currentAsset.assetId,
                reason: 'Parent reassigned during asset update'
              },
              status: 'SUCCESS'
            });

            const newRel = await relationshipRepository.link({
              parentAssetId: normNewParent,
              childAssetId: currentAsset.assetId,
              relationshipType: 'PERIPHERAL_OF',
              componentRole: 'MOUSE',
              notes: `Auto-linked peripheral to ${normNewParent}`
            });
            await auditRepository.logEvent({
              action: 'RELATIONSHIP_LINKED',
              entityType: 'ASSET',
              entityId: currentAsset.assetId,
              actor: {
                userId: req.user?._id || req.user?.id,
                username: req.user?.username || 'admin',
                name: req.user?.name || 'Administrator',
                role: req.user?.role || 'ADMIN',
                ipAddress: req.ip || '127.0.0.1'
              },
              details: {
                parentAssetId: normNewParent,
                childAssetId: currentAsset.assetId,
                relationshipType: 'PERIPHERAL_OF',
                componentRole: 'MOUSE',
                relationshipId: newRel._id
              },
              status: 'SUCCESS'
            });
          } 
          // Case A: No existing relationship, new parent specified
          else if (!normOldParent && normNewParent) {
            const newRel = await relationshipRepository.link({
              parentAssetId: normNewParent,
              childAssetId: currentAsset.assetId,
              relationshipType: 'PERIPHERAL_OF',
              componentRole: 'MOUSE',
              notes: `Auto-linked peripheral to ${normNewParent}`
            });
            await auditRepository.logEvent({
              action: 'RELATIONSHIP_LINKED',
              entityType: 'ASSET',
              entityId: currentAsset.assetId,
              actor: {
                userId: req.user?._id || req.user?.id,
                username: req.user?.username || 'admin',
                name: req.user?.name || 'Administrator',
                role: req.user?.role || 'ADMIN',
                ipAddress: req.ip || '127.0.0.1'
              },
              details: {
                parentAssetId: normNewParent,
                childAssetId: currentAsset.assetId,
                relationshipType: 'PERIPHERAL_OF',
                componentRole: 'MOUSE',
                relationshipId: newRel._id
              },
              status: 'SUCCESS'
            });
          } 
          // Case D: Relationship removed (parent cleared/null)
          else if (normOldParent && !normNewParent) {
            await relationshipRepository.unlink({
              parentAssetId: normOldParent,
              childAssetId: currentAsset.assetId,
              reason: 'Parent relationship cleared'
            });
            await auditRepository.logEvent({
              action: 'RELATIONSHIP_UNLINKED',
              entityType: 'ASSET',
              entityId: currentAsset.assetId,
              actor: {
                userId: req.user?._id || req.user?.id,
                username: req.user?.username || 'admin',
                name: req.user?.name || 'Administrator',
                role: req.user?.role || 'ADMIN',
                ipAddress: req.ip || '127.0.0.1'
              },
              details: {
                previousParentAssetId: normOldParent,
                childAssetId: currentAsset.assetId,
                reason: 'Parent cleared during asset update'
              },
              status: 'SUCCESS'
            });
          }
        } catch (relError) {
          let statusCode = 400;
          if (relError.message.includes('not found')) statusCode = 404;
          if (
            relError.message.includes('already linked') ||
            relError.message.includes('cannot be linked to itself') ||
            relError.message.includes('Circular relationship') ||
            relError.message.includes('cycle')
          ) statusCode = 409;
          return sendError(res, `Asset updated, but failed to update relationship: ${relError.message}`, statusCode);
        }
      }
    }

    if (updateData.isArchived === true) {
      await relationshipRepository.invalidateRelationshipsForAsset({
        assetId: updated.assetId || id,
        reason: 'Asset archived via update',
        actor: {
          userId: req.user?._id || req.user?.id,
          username: req.user?.username || 'admin',
          name: req.user?.name || 'Administrator',
          role: req.user?.role || 'ADMIN',
          ipAddress: req.ip || '127.0.0.1'
        }
      });
    }

    return sendSuccess(res, updated, 'Asset updated successfully');
  } catch (error) {
    next(error);
  }
};

export const transitionLifecycle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { targetStatus, reason = 'Lifecycle State Transition', remarks = '' } = req.body;

    if (!targetStatus) {
      return sendError(res, 'targetStatus is required for lifecycle transition.', 400);
    }

    const currentAsset = await assetRepository.findById(id);
    if (!currentAsset) {
      return sendError(res, `Asset not found: ${id}`, 404);
    }

    const currentStatus = currentAsset.status;
    const allowed = VALID_LIFECYCLE_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      return sendError(
        res,
        `Invalid lifecycle transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions: ${allowed.length ? allowed.join(', ') : 'None (Terminal state)'}`,
        400
      );
    }

    const updatePayload = {
      status: targetStatus,
      remarks: remarks ? `${currentAsset.remarks || ''} | [${targetStatus}]: ${reason} - ${remarks}`.trim() : currentAsset.remarks
    };

    if (['UNDER_MAINTENANCE', 'UNDER_REPAIR', 'GODOWN', 'FAULTY', 'DAMAGED', 'LOST', 'WRITE_OFF', 'RETIRED', 'DISPOSED', 'AVAILABLE'].includes(targetStatus)) {
      updatePayload.currentEmployeeId = null;
      updatePayload.currentEmployeeName = '';
      updatePayload.currentDesignation = '';
      updatePayload.currentAssignmentDate = null;
    }

    const updated = await assetRepository.update(id, updatePayload);

    if (['RETIRED', 'DISPOSED', 'WRITE_OFF'].includes(targetStatus)) {
      await relationshipRepository.invalidateRelationshipsForAsset({
        assetId: updated.assetId || id,
        reason: `Lifecycle transition to ${targetStatus}: ${reason}`,
        actor: {
          userId: req.user?._id || req.user?.id,
          username: req.user?.username || 'admin',
          name: req.user?.name || 'Administrator',
          role: req.user?.role || 'ADMIN',
          ipAddress: req.ip || '127.0.0.1'
        }
      });
    }

    await auditRepository.logEvent({
      action: 'LIFECYCLE_TRANSITION',
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
        fromStatus: currentStatus,
        toStatus: targetStatus,
        reason,
        remarks
      },
      status: 'SUCCESS'
    });

    return sendSuccess(res, updated, `Asset lifecycle transitioned from '${currentStatus}' to '${targetStatus}' successfully.`);
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

    await relationshipRepository.invalidateRelationshipsForAsset({
      assetId: retired.assetId || id,
      reason: `Asset retired: ${reason}`,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      }
    });

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

    await relationshipRepository.invalidateRelationshipsForAsset({
      assetId: archived.assetId || id,
      reason: 'Asset archived from active inventory',
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      }
    });

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

export const getAssetTimeline = async (req, res, next) => {
  try {
    const { id } = req.params;
    const asset = await assetRepository.findById(id);
    if (!asset) {
      return sendError(res, `Asset not found: ${id}`, 404);
    }

    const assetId = asset.assetId;

    // 1. Fetch custody history
    const custodyRecords = await assignmentRepository.findHistoryByAsset(assetId);

    // 2. Fetch complaint / maintenance history
    const complaintRecords = await complaintRepository.findByAssetId(assetId);

    // 3. Fetch component relationships
    const components = await relationshipRepository.findComponents(assetId);
    const parent = await relationshipRepository.findParent(assetId);

    // 4. Fetch audit events
    const auditResult = await auditRepository.find({ entityId: assetId, limit: 50 });
    const auditLogs = auditResult.items || [];

    // Aggregate into unified chronological events
    const events = [];

    // Initial Registration
    events.push({
      type: 'REGISTRATION',
      category: 'LIFECYCLE',
      title: `Asset Registered: ${asset.assetName}`,
      timestamp: asset.createdAt || asset.installDate,
      details: {
        assetId: asset.assetId,
        make: asset.make,
        model: asset.model,
        category: asset.category,
        serialNumber: asset.serialNumber,
        department: asset.department,
        floor: asset.floor,
        status: asset.status,
        condition: asset.condition
      }
    });

    // Custody events
    for (const c of custodyRecords) {
      events.push({
        type: 'CUSTODY_ASSIGNED',
        category: 'CUSTODY',
        title: `Assigned to ${c.employeeName} (${c.employeeId})`,
        timestamp: c.assignedDate,
        actor: c.assignedBy || 'admin',
        details: {
          assignmentId: c.assignmentId,
          employeeId: c.employeeId,
          employeeName: c.employeeName,
          designation: c.designation,
          department: c.department,
          reason: c.transferReason,
          condition: c.conditionAtAssignment
        }
      });
      if (c.returnedDate) {
        events.push({
          type: 'CUSTODY_RETURNED',
          category: 'CUSTODY',
          title: `Returned by ${c.employeeName} (${c.employeeId})`,
          timestamp: c.returnedDate,
          actor: c.returnedBy || 'admin',
          details: {
            assignmentId: c.assignmentId,
            employeeId: c.employeeId,
            employeeName: c.employeeName,
            condition: c.conditionAtReturn
          }
        });
      }
    }

    // Complaint / Maintenance events
    for (const cmp of complaintRecords) {
      events.push({
        type: 'MAINTENANCE_LOGGED',
        category: 'MAINTENANCE',
        title: `Service Ticket ${cmp.ticketId}: ${cmp.title}`,
        timestamp: cmp.createdAt,
        actor: cmp.reportedBy?.employeeName || cmp.reportedBy?.employeeId,
        details: {
          ticketId: cmp.ticketId,
          category: cmp.category,
          severity: cmp.severity,
          priority: cmp.priority,
          status: cmp.status,
          description: cmp.description
        }
      });
      if (cmp.resolution?.resolvedAt || cmp.status === 'RESOLVED') {
        events.push({
          type: 'MAINTENANCE_RESOLVED',
          category: 'MAINTENANCE',
          title: `Ticket ${cmp.ticketId} Resolved`,
          timestamp: cmp.resolution?.resolvedAt || cmp.updatedAt,
          actor: cmp.resolution?.resolvedBy || 'Technician',
          details: {
            ticketId: cmp.ticketId,
            resolutionNotes: cmp.resolution?.resolutionNotes || '',
            partsReplaced: cmp.resolution?.partsReplaced || ''
          }
        });
      }
    }

    // Component relationships
    for (const comp of components) {
      events.push({
        type: 'COMPONENT_LINKED',
        category: 'ASSEMBLY',
        title: `Linked Component: ${comp.componentRole} (${comp.asset?.assetName || comp.asset?.assetId})`,
        timestamp: comp.linkedDate,
        details: {
          role: comp.componentRole,
          relationshipType: comp.relationshipType,
          childAssetId: comp.asset?.assetId,
          childAssetName: comp.asset?.assetName,
          notes: comp.notes
        }
      });
    }

    if (parent) {
      events.push({
        type: 'PARENT_CONNECTED',
        category: 'ASSEMBLY',
        title: `Connected to Parent Host: ${parent.asset?.assetName || parent.asset?.assetId}`,
        timestamp: parent.linkedDate,
        details: {
          role: parent.componentRole,
          parentAssetId: parent.asset?.assetId,
          parentAssetName: parent.asset?.assetName
        }
      });
    }

    // Audit logs
    for (const log of auditLogs) {
      if (!events.some(e => Math.abs(new Date(e.timestamp).getTime() - new Date(log.timestamp).getTime()) < 1000 && e.type === log.action)) {
        events.push({
          type: log.action,
          category: 'AUDIT',
          title: log.action.replace(/_/g, ' '),
          timestamp: log.timestamp || log.createdAt,
          actor: log.actor?.name || log.actor?.username,
          details: log.details
        });
      }
    }

    // Sort descending by timestamp
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return sendSuccess(res, {
      assetId: asset.assetId,
      assetName: asset.assetName,
      status: asset.status,
      currentCustodian: asset.currentEmployeeId ? {
        employeeId: asset.currentEmployeeId,
        name: asset.currentEmployeeName,
        designation: asset.currentDesignation
      } : null,
      timeline: events,
      totalEvents: events.length
    }, 'Complete custody and transaction history retrieved successfully');
  } catch (error) {
    next(error);
  }
};
