import QRCode from 'qrcode';

/**
 * QR Code Generation Utilities for Physical Equipment Identification
 */

export const qrGenerator = {
  /**
   * Generate base64 PNG Data URL for an asset
   */
  generateDataUrl: async (payload, options = {}) => {
    const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: options.width || 250,
      color: {
        dark: '#00205B', // AAI Navy Blue
        light: '#FFFFFF'
      },
      ...options
    });
  },

  /**
   * Generate scalable SVG string for web tags and sharp rendering
   */
  generateSvg: async (payload, options = {}) => {
    const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return QRCode.toString(text, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      width: options.width || 250,
      color: {
        dark: '#00205B',
        light: '#FFFFFF'
      },
      ...options
    });
  },

  /**
   * Generate raw PNG image Buffer for embedding in PDFKit documents
   */
  generateBuffer: async (payload, options = {}) => {
    const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return QRCode.toBuffer(text, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 1,
      width: options.width || 200,
      color: {
        dark: '#00205B',
        light: '#FFFFFF'
      },
      ...options
    });
  },

  /**
   * Build official verification payload
   */
  createAssetVerificationPayload: (asset, clientHost = 'http://localhost:5173') => {
    return {
      org: 'Airports Authority of India',
      assetId: asset.assetId,
      serialNumber: asset.serialNumber,
      category: asset.category,
      make: asset.make,
      model: asset.model,
      department: asset.department,
      floor: asset.floor,
      status: asset.status,
      warrantyStatus: asset.warrantyStatus,
      verifyUrl: `${clientHost}/assets?search=${encodeURIComponent(asset.assetId)}`
    };
  }
};
