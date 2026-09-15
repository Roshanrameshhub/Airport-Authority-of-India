import mongoose from 'mongoose';
import AssetRelationship from '../models/AssetRelationship.js';
import { assetRepository } from './assetRepository.js';

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
  }
};
