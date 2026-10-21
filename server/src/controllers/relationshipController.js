import { relationshipRepository } from '../repositories/relationshipRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const linkAssets = async (req, res, next) => {
  try {
    const { parentAssetId, childAssetId, relationshipType, componentRole, notes } = req.body;

    if (!parentAssetId || !childAssetId) {
      return sendError(res, 'Both parentAssetId and childAssetId are required', 400);
    }

    const linked = await relationshipRepository.link({
      parentAssetId,
      childAssetId,
      relationshipType,
      componentRole,
      notes
    });

    // Audit Logging
    await auditRepository.logEvent({
      action: 'RELATIONSHIP_LINKED',
      entityType: 'ASSET',
      entityId: childAssetId,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        parentAssetId,
        childAssetId,
        relationshipType: linked.relationshipType,
        componentRole: linked.componentRole,
        notes: linked.notes || ''
      },
      status: 'SUCCESS'
    });

    return sendSuccess(res, linked, `Successfully linked component ${childAssetId} to parent ${parentAssetId}`, 201);
  } catch (error) {
    if (
      error.message.includes('already linked') ||
      error.message.includes('cannot be linked to itself') ||
      error.message.includes('Circular relationship') ||
      error.message.includes('relationship cycle')
    ) {
      return sendError(res, error.message, 409);
    }
    if (error.message.includes('archived') || error.message.includes('retired') || error.message.includes('decommissioned')) {
      return sendError(res, error.message, 400);
    }
    if (error.message.includes('not found')) {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const unlinkAssets = async (req, res, next) => {
  try {
    const { parentAssetId, childAssetId, reason } = req.body;

    if (!parentAssetId || !childAssetId) {
      return sendError(res, 'Both parentAssetId and childAssetId are required', 400);
    }

    const unlinked = await relationshipRepository.unlink({
      parentAssetId,
      childAssetId,
      reason
    });

    // Audit Logging
    await auditRepository.logEvent({
      action: 'RELATIONSHIP_UNLINKED',
      entityType: 'ASSET',
      entityId: childAssetId,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        parentAssetId,
        childAssetId,
        reason: reason || ''
      },
      status: 'SUCCESS'
    });

    return sendSuccess(res, unlinked, `Successfully unlinked component ${childAssetId} from parent ${parentAssetId}`);
  } catch (error) {
    if (error.message.includes('not found')) {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const getComponents = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const components = await relationshipRepository.findComponents(assetId);
    return sendSuccess(res, components, `Components for asset ${assetId} retrieved successfully`);
  } catch (error) {
    next(error);
  }
};

export const getParent = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const parent = await relationshipRepository.findParent(assetId);
    if (!parent) {
      return sendSuccess(res, null, `Asset ${assetId} has no parent (Standalone equipment)`);
    }
    return sendSuccess(res, parent, `Parent for asset ${assetId} retrieved successfully`);
  } catch (error) {
    next(error);
  }
};
