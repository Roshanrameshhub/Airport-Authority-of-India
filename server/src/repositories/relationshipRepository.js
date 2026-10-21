import mongoose from 'mongoose';
import AssetRelationship from '../models/AssetRelationship.js';
import { assetRepository } from './assetRepository.js';
import { auditRepository } from './auditRepository.js';

const memoryRelationships = new Map();

const seedRelationships = () => {
  if (memoryRelationships.size === 0) {
    const list = [
      {
        _id: '66d600000000000000000001',
        parentAssetId: 'AAI-REG-PC-2024-0001',
        childAssetId: 'AAI-REG-MON-2024-0005',
        relationshipType: 'COMPONENT_OF',
        componentRole: 'PRIMARY_DISPLAY',
        linkedDate: new Date('2024-02-20'),
        unlinkedDate: null,
        isActive: true,
        notes: 'Primary Dell 27" 4K Monitor paired with Radar workstation'
      },
      {
        _id: '66d600000000000000000002',
        parentAssetId: 'AAI-REG-PC-2024-0001',
        childAssetId: 'AAI-REG-PRT-2023-0003',
        relationshipType: 'PERIPHERAL_OF',
        componentRole: 'PRINTER',
        linkedDate: new Date('2024-02-20'),
        unlinkedDate: null,
        isActive: true,
        notes: 'Dedicated network laser printer attached for radar strip logs'
      }
    ];

    list.forEach(item => {
      memoryRelationships.set(item._id, {
        ...item,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
  }
};

seedRelationships();

export const relationshipRepository = {
  link: async ({ parentAssetId, childAssetId, relationshipType = 'COMPONENT_OF', componentRole = 'OTHER', notes = '' }) => {
    const pId = parentAssetId.trim().toUpperCase();
    const cId = childAssetId.trim().toUpperCase();

    if (pId === cId) {
      throw new Error('An asset cannot be linked to itself');
    }

    // Verify both assets exist
    const parent = await assetRepository.findById(pId);
    if (!parent) throw new Error(`Parent asset '${pId}' not found`);

    const child = await assetRepository.findById(cId);
    if (!child) throw new Error(`Child component asset '${cId}' not found`);

    // A1: Prevent relationships to archived or retired/decommissioned assets
    if (parent.isArchived) {
      throw new Error(`Cannot link relationship: Parent asset '${pId}' is archived`);
    }
    if (['RETIRED', 'DISPOSED', 'WRITE_OFF'].includes(parent.status)) {
      throw new Error(`Cannot link relationship: Parent asset '${pId}' is retired or decommissioned (status: ${parent.status})`);
    }

    if (child.isArchived) {
      throw new Error(`Cannot link relationship: Child asset '${cId}' is archived`);
    }
    if (['RETIRED', 'DISPOSED', 'WRITE_OFF'].includes(child.status)) {
      throw new Error(`Cannot link relationship: Child asset '${cId}' is retired or decommissioned (status: ${child.status})`);
    }

    // B: Cycle detection across active relationships
    const isCycle = await relationshipRepository.hasCycle(pId, cId);
    if (isCycle) {
      throw new Error(`Circular relationship detected: Linking '${pId}' to '${cId}' would create a relationship cycle`);
    }

    if (mongoose.connection.readyState === 1) {
      // Check if child is already linked to an active parent
      const existing = await AssetRelationship.findOne({ childAssetId: cId, isActive: true });
      if (existing) {
        throw new Error(`Child asset '${cId}' is already linked to parent '${existing.parentAssetId}'`);
      }

      const rel = new AssetRelationship({
        parentAssetId: pId,
        childAssetId: cId,
        relationshipType,
        componentRole,
        notes,
        linkedDate: new Date(),
        isActive: true
      });
      return rel.save();
    }

    // Memory fallback
    for (const r of memoryRelationships.values()) {
      if (r.childAssetId === cId && r.isActive) {
        throw new Error(`Child asset '${cId}' is already linked to parent '${r.parentAssetId}'`);
      }
    }

    const id = new mongoose.Types.ObjectId().toString();
    const newRel = {
      _id: id,
      parentAssetId: pId,
      childAssetId: cId,
      relationshipType,
      componentRole,
      notes,
      linkedDate: new Date(),
      unlinkedDate: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryRelationships.set(id, newRel);
    return newRel;
  },

  unlink: async ({ parentAssetId, childAssetId, reason = 'Component unlinked' }) => {
    const pId = parentAssetId.trim().toUpperCase();
    const cId = childAssetId.trim().toUpperCase();

    if (mongoose.connection.readyState === 1) {
      const rel = await AssetRelationship.findOneAndUpdate(
        { parentAssetId: pId, childAssetId: cId, isActive: true },
        { isActive: false, unlinkedDate: new Date(), notes: reason },
        { new: true }
      );
      if (!rel) throw new Error(`Active relationship not found between '${pId}' and '${cId}'`);
      return rel;
    }

    for (const r of memoryRelationships.values()) {
      if (r.parentAssetId === pId && r.childAssetId === cId && r.isActive) {
        r.isActive = false;
        r.unlinkedDate = new Date();
        r.notes = `${r.notes ? r.notes + ' | ' : ''}${reason}`;
        r.updatedAt = new Date();
        return r;
      }
    }
    throw new Error(`Active relationship not found between '${pId}' and '${cId}'`);
  },

  findComponents: async (parentAssetId) => {
    const pId = parentAssetId.trim().toUpperCase();

    let rels = [];
    if (mongoose.connection.readyState === 1) {
      rels = await AssetRelationship.find({ parentAssetId: pId, isActive: true });
    } else {
      rels = Array.from(memoryRelationships.values()).filter(r => r.parentAssetId === pId && r.isActive);
    }

    const components = [];
    for (const r of rels) {
      const childAsset = await assetRepository.findById(r.childAssetId);
      components.push({
        relationshipId: r._id,
        relationshipType: r.relationshipType,
        componentRole: r.componentRole,
        linkedDate: r.linkedDate,
        notes: r.notes,
        asset: childAsset
      });
    }
    return components;
  },

  findParent: async (childAssetId) => {
    const cId = childAssetId.trim().toUpperCase();

    let rel = null;
    if (mongoose.connection.readyState === 1) {
      rel = await AssetRelationship.findOne({ childAssetId: cId, isActive: true });
    } else {
      rel = Array.from(memoryRelationships.values()).find(r => r.childAssetId === cId && r.isActive) || null;
    }

    if (!rel) return null;

    const parentAsset = await assetRepository.findById(rel.parentAssetId);
    return {
      relationshipId: rel._id,
      relationshipType: rel.relationshipType,
      componentRole: rel.componentRole,
      linkedDate: rel.linkedDate,
      notes: rel.notes,
      asset: parentAsset
    };
  },

  /**
   * Safe graph traversal (BFS) to detect circular relationship paths.
   * Returns true if adding directed edge parentAssetId -> childAssetId would form a cycle
   * (i.e. if there is already an active path from childAssetId to parentAssetId).
   */
  hasCycle: async (parentAssetId, childAssetId) => {
    const pId = parentAssetId.trim().toUpperCase();
    const cId = childAssetId.trim().toUpperCase();

    if (pId === cId) return true;

    const visited = new Set();
    const queue = [cId];
    visited.add(cId);

    while (queue.length > 0) {
      const current = queue.shift();

      let activeChildren = [];
      if (mongoose.connection.readyState === 1) {
        const docs = await AssetRelationship.find({
          parentAssetId: current,
          isActive: true
        }).select('childAssetId').lean();
        activeChildren = docs.map(d => d.childAssetId);
      } else {
        activeChildren = Array.from(memoryRelationships.values())
          .filter(r => r.parentAssetId === current && r.isActive)
          .map(r => r.childAssetId);
      }

      for (const nextChild of activeChildren) {
        if (nextChild === pId) {
          return true;
        }
        if (!visited.has(nextChild)) {
          visited.add(nextChild);
          queue.push(nextChild);
        }
      }
    }

    return false;
  },

  /**
   * Deactivates all active relationships involving the specified asset as either parent or child.
   * Preserves historical relationship documents (isActive: false, unlinkedDate populated).
   * Logs an audit event for each invalidated relationship.
   */
  invalidateRelationshipsForAsset: async ({ assetId, reason = 'Asset archived or retired', actor = {} }) => {
    const targetId = assetId.trim().toUpperCase();
    const now = new Date();
    const invalidated = [];

    if (mongoose.connection.readyState === 1) {
      const activeRels = await AssetRelationship.find({
        $or: [
          { parentAssetId: targetId },
          { childAssetId: targetId }
        ],
        isActive: true
      });

      for (const rel of activeRels) {
        rel.isActive = false;
        rel.unlinkedDate = now;
        rel.notes = rel.notes ? `${rel.notes} | ${reason}` : reason;
        await rel.save();
        invalidated.push(rel);

        await auditRepository.logEvent({
          action: 'RELATIONSHIP_UNLINKED',
          entityType: 'ASSET',
          entityId: rel.childAssetId,
          actor: {
            userId: actor.userId ? String(actor.userId) : null,
            username: actor.username || 'admin',
            name: actor.name || 'System / Administrator',
            role: actor.role || 'ADMIN',
            ipAddress: actor.ipAddress || actor.ip || '127.0.0.1'
          },
          details: {
            parentAssetId: rel.parentAssetId,
            childAssetId: rel.childAssetId,
            relationshipType: rel.relationshipType,
            reason,
            affectedAssetId: targetId,
            source: 'LIFECYCLE_INVALIDATION'
          },
          status: 'SUCCESS'
        });
      }
    } else {
      for (const r of memoryRelationships.values()) {
        if ((r.parentAssetId === targetId || r.childAssetId === targetId) && r.isActive) {
          r.isActive = false;
          r.unlinkedDate = now;
          r.notes = r.notes ? `${r.notes} | ${reason}` : reason;
          r.updatedAt = now;
          invalidated.push(r);

          await auditRepository.logEvent({
            action: 'RELATIONSHIP_UNLINKED',
            entityType: 'ASSET',
            entityId: r.childAssetId,
            actor: {
              userId: actor.userId ? String(actor.userId) : null,
              username: actor.username || 'admin',
              name: actor.name || 'System / Administrator',
              role: actor.role || 'ADMIN',
              ipAddress: actor.ipAddress || actor.ip || '127.0.0.1'
            },
            details: {
              parentAssetId: r.parentAssetId,
              childAssetId: r.childAssetId,
              relationshipType: r.relationshipType,
              reason,
              affectedAssetId: targetId,
              source: 'LIFECYCLE_INVALIDATION'
            },
            status: 'SUCCESS'
          });
        }
      }
    }

    return invalidated;
  }
};
