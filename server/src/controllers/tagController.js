import { assetRepository } from '../repositories/assetRepository.js';
import { qrGenerator } from '../utils/qrGenerator.js';
import { tagPdfGenerator } from '../utils/tagPdfGenerator.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * Get QR code data URL and SVG for a specific asset
 */
export const getAssetQrCode = async (req, res, next) => {
  try {
    const { id } = req.params;
    const asset = await assetRepository.findById(id);

    if (!asset) {
      return sendError(res, `Asset not found with identifier: ${id}`, 404);
    }

    const host = req.get('origin') || `${req.protocol}://${req.get('host')}`;
    const payload = qrGenerator.createAssetVerificationPayload(asset, host);
    const dataUrl = await qrGenerator.generateDataUrl(payload);
    const svg = await qrGenerator.generateSvg(payload);

    return sendSuccess(res, {
      assetId: asset.assetId,
      serialNumber: asset.serialNumber,
      qrDataUrl: dataUrl,
      qrSvg: svg,
      payload
    }, 'Asset QR code generated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Generate printable single physical asset sticker PDF (4" x 2")
 */
export const getAssetTagPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const asset = await assetRepository.findById(id);

    if (!asset) {
      return sendError(res, `Asset not found with identifier: ${id}`, 404);
    }

    const host = req.get('origin') || `${req.protocol}://${req.get('host')}`;
    const pdfBuffer = await tagPdfGenerator.generateSingleTagPdf(asset, host);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="AAI_Tag_${asset.assetId}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Generate printable batch sticker sheet PDF
 */
export const getBatchTagsPdf = async (req, res, next) => {
  try {
    const { assetIds = [], category, department } = req.body;

    let assets = [];

    if (Array.isArray(assetIds) && assetIds.length > 0) {
      for (const id of assetIds) {
        const a = await assetRepository.findById(id);
        if (a) assets.push(a);
      }
    } else {
      const res = await assetRepository.findPaginated({
        category,
        department,
        page: 1,
        limit: 100
      });
      assets = res.items || [];
    }

    if (assets.length === 0) {
      return sendError(res, 'No assets found matching criteria for tag generation', 404);
    }

    const host = req.get('origin') || `${req.protocol}://${req.get('host')}`;
    const pdfBuffer = await tagPdfGenerator.generateBatchTagPdf(assets, host);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="AAI_Asset_Tags_Sheet.pdf"');
    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Rapid mobile/scanner asset verification endpoint
 */
export const verifyAsset = async (req, res, next) => {
  try {
    const { identifier } = req.params;

    let asset = await assetRepository.findById(identifier);
    if (!asset) {
      asset = await assetRepository.findBySerialNumber(identifier);
    }

    if (!asset) {
      return sendError(res, `No registered AAI asset found matching '${identifier}'`, 404);
    }

    return sendSuccess(res, {
      verified: true,
      verifiedAt: new Date().toISOString(),
      asset: {
        assetId: asset.assetId,
        assetName: asset.assetName,
        category: asset.category,
        make: asset.make,
        model: asset.model,
        serialNumber: asset.serialNumber,
        department: asset.department,
        floor: asset.floor,
        status: asset.status,
        condition: asset.condition,
        warrantyStatus: asset.warrantyStatus,
        warrantyEndDate: asset.warrantyEndDate,
        currentEmployeeName: asset.currentEmployeeName || 'Unassigned',
        currentEmployeeId: asset.currentEmployeeId || null
      }
    }, `AAI Asset ${asset.assetId} verified`);
  } catch (error) {
    next(error);
  }
};
