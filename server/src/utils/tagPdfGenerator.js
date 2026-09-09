import PDFDocument from 'pdfkit';
import { qrGenerator } from './qrGenerator.js';

/**
 * PDF Equipment Identification Tag Generator
 */

export const tagPdfGenerator = {
  /**
   * Generate a single 4" x 2" standard physical asset label PDF
   */
  generateSingleTagPdf: async (asset, host = 'http://localhost:5173') => {
    return new Promise(async (resolve, reject) => {
      try {
        const payload = qrGenerator.createAssetVerificationPayload(asset, host);
        const qrBuffer = await qrGenerator.generateBuffer(payload, { width: 140 });

        // 4 x 2 inches in points (72 points/inch) = 288 x 144
        const doc = new PDFDocument({
          size: [288, 144],
          margins: { top: 6, bottom: 6, left: 8, right: 8 }
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Styling tokens
        const primaryColor = '#00205B'; // AAI Blue
        const textColor = '#111827';
        const mutedColor = '#4B5563';

        // Outer Border
        doc.rect(4, 4, 280, 136).lineWidth(1.5).stroke(primaryColor);

        // Header Banner
        doc.rect(4, 4, 280, 24).fill(primaryColor);
        doc.fillColor('#FFFFFF')
          .font('Helvetica-Bold')
          .fontSize(9)
          .text('AIRPORTS AUTHORITY OF INDIA', 8, 8, { width: 272, align: 'center' });
        doc.font('Helvetica')
          .fontSize(6.5)
          .text('REGIONAL OFFICE • IT ASSET IDENTIFICATION TAG', 8, 18, { width: 272, align: 'center' });

        // Asset ID Pill
        doc.rect(8, 33, 175, 18).fill('#F3F4F6').stroke('#D1D5DB');
        doc.fillColor(primaryColor)
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .text(asset.assetId, 12, 38, { width: 167 });

        // Equipment Details (Left Column)
        let y = 56;
        const addLine = (label, val) => {
          doc.fillColor(mutedColor).font('Helvetica-Bold').fontSize(6.5).text(label, 8, y, { width: 48 });
          doc.fillColor(textColor).font('Helvetica').fontSize(6.5).text(val || 'N/A', 56, y, { width: 125, ellipsis: true });
          y += 10.5;
        };

        addLine('Category:', asset.category);
        addLine('Make/Model:', `${asset.make || ''} ${asset.model || ''}`);
        addLine('Serial No:', asset.serialNumber);
        addLine('Location:', `${asset.department || ''} (${asset.floor || 'N/A'})`);
        addLine('Warranty:', `${asset.warrantyStatus || 'N/A'} (Exp: ${asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toISOString().split('T')[0] : 'N/A'})`);

        // QR Code (Right Column)
        doc.image(qrBuffer, 192, 33, { width: 84, height: 84 });
        doc.fillColor(primaryColor)
          .font('Helvetica-Bold')
          .fontSize(5.5)
          .text('SCAN TO VERIFY', 192, 119, { width: 84, align: 'center' });

        // Footer Bar
        doc.rect(4, 128, 280, 12).fill(primaryColor);
        doc.fillColor('#FFFFFF')
          .font('Helvetica-Bold')
          .fontSize(5.5)
          .text('PROPERTY OF AAI • TAMPERING OR REMOVAL IS A STRICT VIOLATION', 8, 131, { width: 272, align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  },

  /**
   * Generate an A4 batch sheet (2 columns x 4 rows = 8 tags per page)
   */
  generateBatchTagPdf: async (assets, host = 'http://localhost:5173') => {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 25, bottom: 25, left: 25, right: 25 }
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const primaryColor = '#00205B';
        const textColor = '#111827';
        const mutedColor = '#4B5563';

        const tagWidth = 260;
        const tagHeight = 135;
        const xOffsets = [30, 305];
        const yOffsets = [30, 180, 330, 480];

        let index = 0;

        for (const asset of assets) {
          const pageIndex = index % 8;
          if (index > 0 && pageIndex === 0) {
            doc.addPage();
          }

          const col = pageIndex % 2;
          const row = Math.floor(pageIndex / 2);
          const x = xOffsets[col];
          const y = yOffsets[row];

          // Draw Tag Box
          doc.rect(x, y, tagWidth, tagHeight).lineWidth(1).stroke('#CBD5E1');

          // Header
          doc.rect(x, y, tagWidth, 22).fill(primaryColor);
          doc.fillColor('#FFFFFF')
            .font('Helvetica-Bold')
            .fontSize(8)
            .text('AIRPORTS AUTHORITY OF INDIA', x + 5, y + 4, { width: tagWidth - 10, align: 'center' });
          doc.font('Helvetica')
            .fontSize(6)
            .text('ASSET IDENTIFICATION TAG', x + 5, y + 13, { width: tagWidth - 10, align: 'center' });

          // Asset ID
          doc.rect(x + 5, y + 27, 165, 16).fill('#F3F4F6').stroke('#E5E7EB');
          doc.fillColor(primaryColor)
            .font('Helvetica-Bold')
            .fontSize(8.5)
            .text(asset.assetId, x + 8, y + 31, { width: 155 });

          // Info lines
          let textY = y + 48;
          const printLine = (l, v) => {
            doc.fillColor(mutedColor).font('Helvetica-Bold').fontSize(6).text(l, x + 6, textY, { width: 44 });
            doc.fillColor(textColor).font('Helvetica').fontSize(6).text(v || 'N/A', x + 50, textY, { width: 115, ellipsis: true });
            textY += 9.5;
          };

          printLine('Category:', asset.category);
          printLine('Make/Model:', `${asset.make || ''} ${asset.model || ''}`);
          printLine('Serial No:', asset.serialNumber);
          printLine('Location:', `${asset.department || ''} - ${asset.floor || ''}`);
          printLine('Warranty:', `${asset.warrantyStatus || 'N/A'}`);

          // QR Code
          const payload = qrGenerator.createAssetVerificationPayload(asset, host);
          const qrBuffer = await qrGenerator.generateBuffer(payload, { width: 120 });
          doc.image(qrBuffer, x + 175, y + 27, { width: 75, height: 75 });
          doc.fillColor(primaryColor)
            .font('Helvetica-Bold')
            .fontSize(5)
            .text('SCAN TO VERIFY', x + 175, y + 104, { width: 75, align: 'center' });

          // Footer
          doc.rect(x, y + tagHeight - 11, tagWidth, 11).fill(primaryColor);
          doc.fillColor('#FFFFFF')
            .font('Helvetica')
            .fontSize(5)
            .text('PROPERTY OF AAI • DO NOT REMOVE', x + 5, y + tagHeight - 9, { width: tagWidth - 10, align: 'center' });

          index++;
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
};
