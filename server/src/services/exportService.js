import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import { assetRepository } from '../repositories/assetRepository.js';
import { assignmentRepository } from '../repositories/assignmentRepository.js';

export const exportService = {
  /**
   * Export Filtered Asset Inventory to Excel Buffer
   */
  generateAssetExcel: async (filters = {}) => {
    // Fetch up to 10,000 matching records
    const { items } = await assetRepository.findPaginated({
      ...filters,
      page: 1,
      limit: 10000
    });

    const headers = [
      'Asset ID',
      'Asset Name',
      'Category',
      'Make / Company',
      'Model',
      'Serial Number',
      'User Name (Custodian)',
      'Designation',
      'Department',
      'Floor / Location',
      'Employee ID',
      'Install Date',
      'Warranty End Date',
      'Warranty Status',
      'Lifecycle Status',
      'Physical Condition',
      'Operating System',
      'OS Version',
      'Remarks'
    ];

    const dataRows = items.map(asset => {
      const installStr = asset.installDate ? new Date(asset.installDate).toISOString().split('T')[0] : '';
      const warrantyStr = asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toISOString().split('T')[0] : '';

      return [
        asset.assetId,
        asset.assetName,
        asset.category,
        asset.make,
        asset.model,
        asset.serialNumber,
        asset.currentEmployeeName || '—',
        asset.currentDesignation || '—',
        asset.department,
        asset.floor,
        asset.currentEmployeeId || '—',
        installStr,
        warrantyStr,
        asset.warrantyStatus || 'ACTIVE',
        asset.status,
        asset.condition,
        asset.operatingSystem || 'N/A',
        asset.osVersion || '',
        asset.remarks || ''
      ];
    });

    const wsData = [headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
      { wch: 22 }, // Asset ID
      { wch: 32 }, // Asset Name
      { wch: 18 }, // Category
      { wch: 16 }, // Make
      { wch: 22 }, // Model
      { wch: 20 }, // Serial Number
      { wch: 22 }, // User Name
      { wch: 24 }, // Designation
      { wch: 34 }, // Department
      { wch: 25 }, // Floor
      { wch: 15 }, // Employee ID
      { wch: 14 }, // Install Date
      { wch: 18 }, // Warranty End Date
      { wch: 16 }, // Warranty Status
      { wch: 16 }, // Lifecycle Status
      { wch: 16 }, // Condition
      { wch: 20 }, // OS
      { wch: 16 }, // OS Version
      { wch: 40 }  // Remarks
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'AAI_Asset_Inventory');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  },

  /**
   * Generate Official AAI Equipment Handover Slip (PDF Buffer)
   */
  generateHandoverPdf: async (assignmentId) => {
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment) {
      const err = new Error(`Assignment record '${assignmentId}' not found`);
      err.statusCode = 404;
      throw err;
    }

    const asset = await assetRepository.findById(assignment.assetId);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `AAI Handover Slip - ${assignment.assignmentId}`,
          Author: 'Airports Authority of India (Regional Office)',
          Subject: 'Official IT Equipment Handover & Custody Acknowledgement'
        }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Colors
      const primaryColor = '#002B49'; // AAI Navy Blue
      const accentColor = '#006699';
      const textColor = '#1F2937';
      const mutedColor = '#6B7280';
      const boxBg = '#F3F4F6';

      // 1. Header Banner
      doc.rect(40, 40, 515, 65).fill(primaryColor);

      doc.fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(16)
        .text('AIRPORTS AUTHORITY OF INDIA', 50, 50, { align: 'center', width: 495 });

      doc.fontSize(10)
        .font('Helvetica')
        .text('Regional Office • Information Technology & Electronic Division', 50, 70, { align: 'center', width: 495 });

      doc.font('Helvetica-Bold')
        .fontSize(11)
        .text('EQUIPMENT HANDOVER & CUSTODY ACKNOWLEDGEMENT SLIP', 50, 85, { align: 'center', width: 495 });

      // 2. Reference & Date Bar
      let y = 120;
      doc.rect(40, y, 515, 30).fill(boxBg).stroke('#E5E7EB');

      doc.fillColor(textColor)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('Slip ID:', 50, y + 9);
      doc.font('Helvetica')
        .text(assignment.assignmentId, 95, y + 9);

      doc.font('Helvetica-Bold')
        .text('Date of Issue:', 230, y + 9);
      doc.font('Helvetica')
        .text(new Date(assignment.assignedDate).toLocaleDateString(), 300, y + 9);

      doc.font('Helvetica-Bold')
        .text('Custody Status:', 400, y + 9);
      doc.font('Helvetica-Bold')
        .fillColor(assignment.status === 'ACTIVE' ? '#059669' : '#2563EB')
        .text(assignment.status, 475, y + 9);

      // 3. Section 1: Custodian Details
      y += 45;
      doc.fillColor(primaryColor)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('1. RECIPIENT CUSTODIAN INFORMATION', 40, y);

      doc.moveTo(40, y + 15).lineTo(555, y + 15).strokeColor(accentColor).stroke();

      y += 22;
      const col1 = 50;
      const col2 = 180;
      const col3 = 320;
      const col4 = 430;

      doc.fillColor(mutedColor).font('Helvetica').fontSize(9).text('Staff Name:', col1, y);
      doc.fillColor(textColor).font('Helvetica-Bold').text(assignment.employeeName, col2, y);

      doc.fillColor(mutedColor).font('Helvetica').text('Employee ID:', col3, y);
      doc.fillColor(textColor).font('Helvetica-Bold').text(assignment.employeeId, col4, y);

      y += 18;
      doc.fillColor(mutedColor).font('Helvetica').text('Designation:', col1, y);
      doc.fillColor(textColor).font('Helvetica').text(assignment.designation || 'Staff Member', col2, y);

      doc.fillColor(mutedColor).font('Helvetica').text('Department:', col3, y);
      doc.fillColor(textColor).font('Helvetica').text(assignment.department, col4, y);

      y += 18;
      doc.fillColor(mutedColor).font('Helvetica').text('Station / Floor:', col1, y);
      doc.fillColor(textColor).font('Helvetica').text(assignment.floor, col2, y);

      doc.fillColor(mutedColor).font('Helvetica').text('Allocation Authority:', col3, y);
      doc.fillColor(textColor).font('Helvetica').text(assignment.assignedBy, col4, y);

      // 4. Section 2: Equipment Specifications (The 13 Fields)
      y += 35;
      doc.fillColor(primaryColor)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('2. HARDWARE & TECHNICAL SPECIFICATIONS', 40, y);

      doc.moveTo(40, y + 15).lineTo(555, y + 15).strokeColor(accentColor).stroke();

      y += 22;
      doc.fillColor(mutedColor).font('Helvetica').fontSize(9).text('Asset Tag ID:', col1, y);
      doc.fillColor(primaryColor).font('Helvetica-Bold').text(assignment.assetId, col2, y);

      doc.fillColor(mutedColor).font('Helvetica').text('Equipment Category:', col3, y);
      doc.fillColor(textColor).font('Helvetica').text(asset?.category || 'IT Equipment', col4, y);

      y += 18;
      doc.fillColor(mutedColor).font('Helvetica').text('Asset Name:', col1, y);
      doc.fillColor(textColor).font('Helvetica-Bold').text(assignment.assetName || asset?.assetName || 'Hardware Unit', col2, y);

      doc.fillColor(mutedColor).font('Helvetica').text('Physical Condition:', col3, y);
      doc.fillColor(textColor).font('Helvetica-Bold').text(assignment.conditionAtAssignment, col4, y);

      y += 18;
      doc.fillColor(mutedColor).font('Helvetica').text('Make / Company:', col1, y);
      doc.fillColor(textColor).font('Helvetica').text(asset?.make || '—', col2, y);

      doc.fillColor(mutedColor).font('Helvetica').text('Equipment Model:', col3, y);
      doc.fillColor(textColor).font('Helvetica').text(asset?.model || '—', col4, y);

      y += 18;
      doc.fillColor(mutedColor).font('Helvetica').text('Hardware Serial No:', col1, y);
      doc.fillColor(textColor).font('Helvetica-Bold').fontSize(10).text(asset?.serialNumber || '—', col2, y);

      doc.fillColor(mutedColor).font('Helvetica').fontSize(9).text('Operating System:', col3, y);
      doc.fillColor(textColor).font('Helvetica').text(`${asset?.operatingSystem || 'N/A'} ${asset?.osVersion || ''}`, col4, y);

      y += 18;
      doc.fillColor(mutedColor).font('Helvetica').text('Installation Date:', col1, y);
      doc.fillColor(textColor).font('Helvetica').text(asset?.installDate ? new Date(asset.installDate).toLocaleDateString() : '—', col2, y);

      doc.fillColor(mutedColor).font('Helvetica').text('Warranty Valid Till:', col3, y);
      doc.fillColor(textColor).font('Helvetica').text(asset?.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString() : '—', col4, y);

      y += 18;
      doc.fillColor(mutedColor).font('Helvetica').text('Handover Reason:', col1, y);
      doc.fillColor(textColor).font('Helvetica-Bold').text(assignment.transferReason, col2, y, { width: 360 });

      if (assignment.remarks) {
        y += 18;
        doc.fillColor(mutedColor).font('Helvetica').text('Handover Remarks:', col1, y);
        doc.fillColor(textColor).font('Helvetica').text(assignment.remarks, col2, y, { width: 360 });
      }

      // 5. Section 3: Official Undertaking & Declaration
      y += 40;
      doc.rect(40, y, 515, 60).fill('#EFF6FF').stroke('#BFDBFE');

      doc.fillColor('#1E3A8A')
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text('ACKNOWLEDGEMENT & ACCEPTANCE DECLARATION:', 50, y + 8);

      doc.fillColor('#1E40AF')
        .font('Helvetica')
        .fontSize(8)
        .text(
          'I hereby acknowledge the physical receipt of the aforementioned IT hardware equipment in functional condition. I agree to operate the equipment in accordance with the IT & Cybersecurity Guidelines of the Airports Authority of India. I undertake not to transfer or relocate this equipment without formal approval from the Regional IT Department, and agree to return the asset upon reassignment, transfer, or superannuation.',
          50,
          y + 20,
          { width: 495, lineGap: 2 }
        );

      // 6. Section 4: Dual Sign-off Blocks
      y += 85;

      // Issuing Sign-off
      doc.moveTo(50, y + 45).lineTo(230, y + 45).strokeColor('#9CA3AF').stroke();
      doc.fillColor(textColor)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('ISSUED BY (IT Admin / Officer)', 50, y + 52);
      doc.font('Helvetica')
        .fontSize(8)
        .fillColor(mutedColor)
        .text(`Name: ${assignment.assignedBy}`, 50, y + 64)
        .text('Sign & Official Stamp:', 50, y + 74);

      // Recipient Sign-off
      doc.moveTo(360, y + 45).lineTo(540, y + 45).strokeColor('#9CA3AF').stroke();
      doc.fillColor(textColor)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('RECEIVED BY (Staff Custodian)', 360, y + 52);
      doc.font('Helvetica')
        .fontSize(8)
        .fillColor(mutedColor)
        .text(`Name: ${assignment.employeeName}`, 360, y + 64)
        .text(`Date & Signature: __________________`, 360, y + 74);

      // 7. Footer
      doc.fontSize(7)
        .fillColor('#9CA3AF')
        .text(
          `Official Record generated by AAI Regional Office Asset Management System on ${new Date().toLocaleString()}. Document ID: ${assignment.assignmentId}`,
          40,
          780,
          { align: 'center', width: 515 }
        );

      doc.end();
    });
  }
};
