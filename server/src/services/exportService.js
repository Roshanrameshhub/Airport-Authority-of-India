import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import { assetRepository } from '../repositories/assetRepository.js';
import { assignmentRepository } from '../repositories/assignmentRepository.js';
import { complaintRepository } from '../repositories/complaintRepository.js';
import { verificationRepository } from '../repositories/verificationRepository.js';
import { amcRepository } from '../repositories/amcRepository.js';

// Shared enterprise document styling tokens
const docColors = {
  primary: '#002B49', // AAI Navy Blue
  accent: '#006699',  // AAI Accent Blue
  text: '#1F2937',    // Body Text
  muted: '#6B7280',   // Subtext / Labels
  boxBg: '#F3F4F6',   // Card Surface
  border: '#E5E7EB',  // Subtle Borders
  alertBg: '#EFF6FF', // Declaration Background
  alertBorder: '#BFDBFE',
  alertText: '#1E40AF'
};

/**
 * Standardized Document Shell Generator
 */
const createDoc = (title, subject) => {
  return new PDFDocument({
    size: 'A4',
    margin: 40,
    info: {
      Title: title,
      Author: 'Airports Authority of India (Regional Office)',
      Subject: subject || title
    }
  });
};

/**
 * Common Header Banner for all AAI Documents
 */
const renderHeaderBanner = (doc, documentTitle) => {
  doc.rect(40, 40, 515, 65).fill(docColors.primary);

  doc.fillColor('#FFFFFF')
    .font('Helvetica-Bold')
    .fontSize(15)
    .text('AIRPORTS AUTHORITY OF INDIA', 40, 50, { align: 'center', width: 515 });

  doc.fontSize(9.5)
    .font('Helvetica')
    .text('Regional Office • Information Technology & Communications Division', 40, 68, { align: 'center', width: 515 });

  doc.font('Helvetica-Bold')
    .fontSize(10.5)
    .text(documentTitle, 40, 83, { align: 'center', width: 515 });
};

/**
 * Common Reference Bar
 */
const renderReferenceBar = (doc, y, refLabel, refValue, dateValue, statusLabel, statusValue, statusColor = '#059669') => {
  doc.rect(40, y, 515, 28).fill(docColors.boxBg).stroke(docColors.border);

  doc.fillColor(docColors.text)
    .font('Helvetica-Bold')
    .fontSize(8.5)
    .text(`${refLabel}:`, 50, y + 8);
  doc.font('Helvetica')
    .text(refValue, 100, y + 8);

  doc.font('Helvetica-Bold')
    .text('Date of Issue:', 240, y + 8);
  doc.font('Helvetica')
    .text(dateValue, 310, y + 8);

  doc.font('Helvetica-Bold')
    .text(`${statusLabel}:`, 405, y + 8);
  doc.font('Helvetica-Bold')
    .fillColor(statusColor)
    .text(statusValue, 480, y + 8);
};

/**
 * Common Section Header with Accent Bar
 */
const renderSectionTitle = (doc, y, title) => {
  doc.fillColor(docColors.primary)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(title, 40, y);

  doc.moveTo(40, y + 14).lineTo(555, y + 14).strokeColor(docColors.accent).stroke();
};

/**
 * Common Footer
 */
const renderFooter = (doc, docId, pageNum = 1, totalPages = 1) => {
  doc.fontSize(7)
    .fillColor('#9CA3AF')
    .font('Helvetica')
    .text(
      `Official Institutional Record • Airports Authority of India • Document ID: ${docId} • Generated on ${new Date().toLocaleString()} ${totalPages > 1 ? `• Page ${pageNum} of ${totalPages}` : ''}`,
      40,
      785,
      { align: 'center', width: 515 }
    );
};

export const exportService = {
  /**
   * Export Filtered Asset Inventory to Excel Buffer
   */
  generateAssetExcel: async (filters = {}) => {
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

    ws['!cols'] = [
      { wch: 22 }, { wch: 32 }, { wch: 18 }, { wch: 16 }, { wch: 22 },
      { wch: 20 }, { wch: 22 }, { wch: 24 }, { wch: 34 }, { wch: 25 },
      { wch: 15 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 16 },
      { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 40 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'AAI_Asset_Inventory');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  },

  /**
   * 1. ASSIGNMENT DOCUMENT: Official Equipment Handover & Assignment Slip
   */
  generateAssignmentPdf: async (assignmentId) => {
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment) {
      const err = new Error(`Assignment record '${assignmentId}' not found`);
      err.statusCode = 404;
      throw err;
    }

    const asset = await assetRepository.findById(assignment.assetId);

    return new Promise((resolve, reject) => {
      const doc = createDoc(
        `AAI Handover Slip - ${assignment.assignmentId}`,
        'Official IT Equipment Handover & Custody Acknowledgement Slip'
      );

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      renderHeaderBanner(doc, 'EQUIPMENT HANDOVER & CUSTODY ACKNOWLEDGEMENT SLIP');
      renderReferenceBar(doc, 115, 'Slip ID', assignment.assignmentId, new Date(assignment.assignedDate).toLocaleDateString(), 'Custody', assignment.status, '#059669');

      let y = 155;
      renderSectionTitle(doc, y, '1. RECIPIENT CUSTODIAN DETAILS');
      y += 20;

      const c1 = 50, c2 = 180, c3 = 320, c4 = 440;
      doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Staff Name:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(assignment.employeeName, c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Staff / Emp ID:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(assignment.employeeId, c4, y);

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Designation:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica').text(assignment.designation || 'Staff Officer', c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Department:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica').text(assignment.department, c4, y);

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Floor / Room:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica').text(assignment.floor, c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Issuing Officer:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica').text(assignment.assignedBy, c4, y);

      y += 30;
      renderSectionTitle(doc, y, '2. HARDWARE & TECHNICAL SPECIFICATIONS (CONFIRMED ATTRIBUTES)');
      y += 20;

      doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Asset Tag ID:', c1, y);
      doc.fillColor(docColors.primary).font('Helvetica-Bold').text(assignment.assetId, c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Equipment Category:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica').text(asset?.category || 'IT Hardware', c4, y);

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Asset Name:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(assignment.assetName || asset?.assetName || 'Hardware Unit', c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Physical Condition:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(assignment.conditionAtAssignment || 'GOOD', c4, y);

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Make / Manufacturer:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica').text(asset?.make || '—', c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Model Number:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica').text(asset?.model || '—', c4, y);

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Serial Number (OEM):', c1, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').fontSize(9).text(asset?.serialNumber || '—', c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Operating System:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica').text(`${asset?.operatingSystem || 'N/A'} ${asset?.osVersion || ''}`, c4, y);

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Installation Date:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica').text(asset?.installDate ? new Date(asset.installDate).toLocaleDateString() : '—', c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Warranty Valid Till:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica').text(asset?.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString() : '—', c4, y);

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Handover Reason:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(assignment.transferReason || 'Official Assignment', c2, y, { width: 360 });

      if (assignment.remarks) {
        y += 16;
        doc.fillColor(docColors.muted).font('Helvetica').text('Remarks / Notes:', c1, y);
        doc.fillColor(docColors.text).font('Helvetica').text(assignment.remarks, c2, y, { width: 360 });
      }

      // 3. Official Undertaking Box
      y += 32;
      doc.rect(40, y, 515, 60).fill(docColors.alertBg).stroke(docColors.alertBorder);
      doc.fillColor(docColors.alertText)
        .font('Helvetica-Bold')
        .fontSize(8)
        .text('CUSTODY ACKNOWLEDGEMENT & COMPLIANCE UNDERTAKING:', 50, y + 8);
      doc.font('Helvetica')
        .fontSize(7.5)
        .text(
          'I hereby acknowledge receipt of the IT equipment detailed above in working order. I undertake to safeguard and operate the equipment in accordance with the IT Security and Asset Governance Policies of Airports Authority of India. The hardware shall not be relocated or transferred without formal sanction from the Regional IT Division, and shall be surrendered upon transfer, leave, or superannuation.',
          50,
          y + 20,
          { width: 495, lineGap: 1.5 }
        );

      // 4. Dual Sign-off Blocks
      y += 85;
      doc.moveTo(50, y + 40).lineTo(230, y + 40).strokeColor('#9CA3AF').stroke();
      doc.fillColor(docColors.text).font('Helvetica-Bold').fontSize(8.5).text('ISSUED BY (IT Division / Officer)', 50, y + 46);
      doc.font('Helvetica').fontSize(7.5).fillColor(docColors.muted)
        .text(`Officer: ${assignment.assignedBy}`, 50, y + 57)
        .text('Signature & Official Stamp: _________________', 50, y + 68);

      doc.moveTo(360, y + 40).lineTo(540, y + 40).strokeColor('#9CA3AF').stroke();
      doc.fillColor(docColors.text).font('Helvetica-Bold').fontSize(8.5).text('RECEIVED BY (Staff Custodian)', 360, y + 46);
      doc.font('Helvetica').fontSize(7.5).fillColor(docColors.muted)
        .text(`Staff: ${assignment.employeeName} (${assignment.employeeId})`, 360, y + 57)
        .text('Signature & Date: ________________________', 360, y + 68);

      renderFooter(doc, assignment.assignmentId);
      doc.end();
    });
  },

  /**
   * 2. TRANSFER DOCUMENT: Official Asset Custody Transfer Slip (Explicit FROM -> TO)
   */
  generateTransferPdf: async (assignmentId) => {
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment) {
      const err = new Error(`Transfer record '${assignmentId}' not found`);
      err.statusCode = 404;
      throw err;
    }

    const asset = await assetRepository.findById(assignment.assetId);

    // Locate previous custodian from assignment history
    let prevCustodian = null;
    try {
      const history = await assignmentRepository.findHistoryByAsset(assignment.assetId);
      const sorted = [...history].sort((a, b) => new Date(b.assignedDate) - new Date(a.assignedDate));
      const currentIdx = sorted.findIndex(h => h.assignmentId === assignment.assignmentId);
      if (currentIdx >= 0 && currentIdx < sorted.length - 1) {
        prevCustodian = sorted[currentIdx + 1];
      } else if (sorted.length > 1) {
        prevCustodian = sorted.find(h => h.assignmentId !== assignment.assignmentId);
      }
    } catch {}

    return new Promise((resolve, reject) => {
      const doc = createDoc(
        `AAI Custody Transfer - ${assignment.assignmentId}`,
        'Official IT Asset Inter-Custodian Transfer Slip'
      );

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      renderHeaderBanner(doc, 'INTER-CUSTODIAN ASSET TRANSFER SLIP');
      renderReferenceBar(doc, 115, 'Transfer ID', assignment.assignmentId, new Date(assignment.assignedDate).toLocaleDateString(), 'Status', 'TRANSFERRED', '#0284C7');

      let y = 155;
      renderSectionTitle(doc, y, '1. CUSTODY CHAIN OF CUSTODY (RELINQUISHING → RECIPIENT)');
      y += 20;

      // Two-column side-by-side comparison box for FROM and TO
      doc.rect(40, y, 250, 75).fill('#F8FAFC').stroke(docColors.border);
      doc.rect(305, y, 250, 75).fill('#EFF6FF').stroke('#BFDBFE');

      // Left Box: FROM
      doc.fillColor('#64748B').font('Helvetica-Bold').fontSize(8).text('FROM: RELINQUISHING CUSTODIAN', 50, y + 8);
      doc.fillColor(docColors.text).font('Helvetica-Bold').fontSize(9).text(prevCustodian ? prevCustodian.employeeName : 'Previous Custodian (Recorded in Store)', 50, y + 22);
      doc.font('Helvetica').fontSize(8).fillColor(docColors.muted)
        .text(`Staff ID: ${prevCustodian?.employeeId || 'N/A'}`, 50, y + 36)
        .text(`Dept: ${prevCustodian?.department || 'Regional Section'}`, 50, y + 48)
        .text(`Floor/Room: ${prevCustodian?.floor || 'N/A'}`, 50, y + 60);

      // Right Box: TO
      doc.fillColor('#1D4ED8').font('Helvetica-Bold').fontSize(8).text('TO: NEW RECIPIENT CUSTODIAN', 315, y + 8);
      doc.fillColor(docColors.text).font('Helvetica-Bold').fontSize(9).text(assignment.employeeName, 315, y + 22);
      doc.font('Helvetica').fontSize(8).fillColor(docColors.muted)
        .text(`Staff ID: ${assignment.employeeId}`, 315, y + 36)
        .text(`Dept: ${assignment.department}`, 315, y + 48)
        .text(`Floor/Room: ${assignment.floor}`, 315, y + 60);

      y += 90;
      renderSectionTitle(doc, y, '2. TRANSFERRED HARDWARE & SPECIFICATIONS');
      y += 18;

      const c1 = 50, c2 = 180, c3 = 320, c4 = 440;
      doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Asset Tag ID:', c1, y);
      doc.fillColor(docColors.primary).font('Helvetica-Bold').text(assignment.assetId, c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Equipment Category:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica').text(asset?.category || 'IT Equipment', c4, y);

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Asset Description:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(assignment.assetName || asset?.assetName || 'Hardware Unit', c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Serial Number (OEM):', c3, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(asset?.serialNumber || '—', c4, y);

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Make / Model:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica').text(`${asset?.make || '—'} ${asset?.model || ''}`, c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Operating System:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica').text(`${asset?.operatingSystem || 'N/A'} ${asset?.osVersion || ''}`, c4, y);

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Transfer Date:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(new Date(assignment.assignedDate).toLocaleDateString(), c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Sanctioning Officer:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica').text(assignment.assignedBy, c4, y);

      y += 24;
      renderSectionTitle(doc, y, '3. TRANSFER JUSTIFICATION & PHYSICAL CONDITION');
      y += 18;

      doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Reason for Transfer:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(assignment.transferReason, c2, y, { width: 360 });

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Condition at Transfer:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(assignment.conditionAtAssignment || 'GOOD', c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Warranty Status:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica').text(asset?.warrantyStatus || 'ACTIVE', c4, y);

      if (assignment.remarks) {
        y += 16;
        doc.fillColor(docColors.muted).font('Helvetica').text('Transfer Remarks:', c1, y);
        doc.fillColor(docColors.text).font('Helvetica').text(assignment.remarks, c2, y, { width: 360 });
      }

      // 4. Triple Sign-off Block (Relinquishing / IT Authority / Recipient)
      y += 45;
      const w = 155;
      // Col 1: Relinquishing
      doc.moveTo(40, y + 40).lineTo(40 + w, y + 40).strokeColor('#9CA3AF').stroke();
      doc.fillColor(docColors.text).font('Helvetica-Bold').fontSize(8).text('RELINQUISHING OFFICER', 40, y + 46);
      doc.font('Helvetica').fontSize(7).fillColor(docColors.muted)
        .text(prevCustodian ? `${prevCustodian.employeeName}` : 'Staff Member', 40, y + 56)
        .text('Sign: ___________________', 40, y + 66);

      // Col 2: Sanctioning IT Admin
      doc.moveTo(220, y + 40).lineTo(220 + w, y + 40).strokeColor('#9CA3AF').stroke();
      doc.fillColor(docColors.text).font('Helvetica-Bold').fontSize(8).text('SANCTIONING IT AUTHORITY', 220, y + 46);
      doc.font('Helvetica').fontSize(7).fillColor(docColors.muted)
        .text(`Officer: ${assignment.assignedBy}`, 220, y + 56)
        .text('Stamp & Date: ___________', 220, y + 66);

      // Col 3: Recipient
      doc.moveTo(400, y + 40).lineTo(400 + w, y + 40).strokeColor('#9CA3AF').stroke();
      doc.fillColor(docColors.text).font('Helvetica-Bold').fontSize(8).text('RECEIVING CUSTODIAN', 400, y + 46);
      doc.font('Helvetica').fontSize(7).fillColor(docColors.muted)
        .text(`${assignment.employeeName}`, 400, y + 56)
        .text('Signature: ______________', 400, y + 66);

      renderFooter(doc, assignment.assignmentId);
      doc.end();
    });
  },

  /**
   * 3. RETURN DOCUMENT: Official Asset Return & Store Receipt
   */
  generateReturnPdf: async (assignmentId) => {
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment) {
      const err = new Error(`Return record '${assignmentId}' not found`);
      err.statusCode = 404;
      throw err;
    }

    const asset = await assetRepository.findById(assignment.assetId);

    return new Promise((resolve, reject) => {
      const doc = createDoc(
        `AAI Store Return - ${assignment.assignmentId}`,
        'Official IT Asset Return & Store Receipt'
      );

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      renderHeaderBanner(doc, 'ASSET RETURN & STORE INVENTORY RECEIPT');
      renderReferenceBar(
        doc,
        115,
        'Return Receipt ID',
        assignment.assignmentId,
        assignment.returnedDate ? new Date(assignment.returnedDate).toLocaleDateString() : new Date().toLocaleDateString(),
        'Custody State',
        'RETURNED TO STORE',
        '#475569'
      );

      let y = 155;
      renderSectionTitle(doc, y, '1. CUSTODY TRANSITION: EMPLOYEE → REGIONAL IT STORE POOL');
      y += 20;

      const c1 = 50, c2 = 180, c3 = 320, c4 = 440;
      doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Returned By (Staff):', c1, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(assignment.employeeName, c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Staff / Emp ID:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(assignment.employeeId, c4, y);

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Origin Department:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica').text(assignment.department, c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Receiving Facility:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text('AAI Regional IT Store / Pool', c4, y);

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Date of Initial Handover:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica').text(new Date(assignment.assignedDate).toLocaleDateString(), c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Date of Surrender:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(assignment.returnedDate ? new Date(assignment.returnedDate).toLocaleDateString() : 'Today', c4, y);

      y += 30;
      renderSectionTitle(doc, y, '2. SURRENDERED HARDWARE EQUIPMENT DETAILS');
      y += 20;

      doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Asset Tag ID:', c1, y);
      doc.fillColor(docColors.primary).font('Helvetica-Bold').text(assignment.assetId, c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Category:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica').text(asset?.category || 'IT Hardware', c4, y);

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Equipment Name:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(assignment.assetName || asset?.assetName || 'Hardware Unit', c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Serial Number (OEM):', c3, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(asset?.serialNumber || '—', c4, y);

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Make / Model:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica').text(`${asset?.make || ''} ${asset?.model || ''}`, c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Operating System:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica').text(`${asset?.operatingSystem || 'N/A'} ${asset?.osVersion || ''}`, c4, y);

      y += 28;
      renderSectionTitle(doc, y, '3. STORE VERIFICATION & PHYSICAL INSPECTION AT RECEIPT');
      y += 20;

      doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Condition at Handover:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica').text(assignment.conditionAtAssignment || 'GOOD', c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Observed at Return:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').fillColor('#047857').text(assignment.conditionAtReturn || 'GOOD', c4, y);

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Reason for Return:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(assignment.remarks || assignment.transferReason || 'Returned to IT Store Inventory Pool', c2, y, { width: 360 });

      y += 24;
      doc.rect(40, y, 515, 52).fill('#F8FAFC').stroke(docColors.border);
      doc.fillColor('#334155').font('Helvetica-Bold').fontSize(8).text('STORE CLEARANCE & INVENTORY REINTEGRATION:', 50, y + 8);
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748B').text(
        'The above equipment has been physically verified by the Regional IT Store Officer. Internal components and serial tags have been verified against the master register. The employee is formally absolved of individual custody liability for this item.',
        50,
        y + 20,
        { width: 495, lineGap: 1.5 }
      );

      // Sign-offs
      y += 85;
      doc.moveTo(50, y + 40).lineTo(230, y + 40).strokeColor('#9CA3AF').stroke();
      doc.fillColor(docColors.text).font('Helvetica-Bold').fontSize(8.5).text('SURRENDERED BY (Staff Member)', 50, y + 46);
      doc.font('Helvetica').fontSize(7.5).fillColor(docColors.muted)
        .text(`Name: ${assignment.employeeName}`, 50, y + 57)
        .text('Signature: ______________________', 50, y + 68);

      doc.moveTo(360, y + 40).lineTo(540, y + 40).strokeColor('#9CA3AF').stroke();
      doc.fillColor(docColors.text).font('Helvetica-Bold').fontSize(8.5).text('RECEIVED & CLEARED BY (Store Officer)', 360, y + 46);
      doc.font('Helvetica').fontSize(7.5).fillColor(docColors.muted)
        .text(`Officer: ${assignment.returnedBy || assignment.assignedBy || 'IT Store Officer'}`, 360, y + 57)
        .text('Official Seal & Date: ______________', 360, y + 68);

      renderFooter(doc, assignment.assignmentId);
      doc.end();
    });
  },

  /**
   * 4. VERIFICATION DOCUMENT: Annual Physical Verification & Discrepancy Audit Report
   */
  generateVerificationReportPdf: async (campaignId) => {
    const campaign = await verificationRepository.getCampaignById(campaignId);
    if (!campaign) {
      const err = new Error(`Verification Campaign '${campaignId}' not found`);
      err.statusCode = 404;
      throw err;
    }

    return new Promise((resolve, reject) => {
      const doc = createDoc(
        `AAI Physical Verification - ${campaign.campaignId}`,
        'Official Annual Physical Asset Verification & Discrepancy Audit Report'
      );

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      renderHeaderBanner(doc, 'ANNUAL PHYSICAL VERIFICATION & DISCREPANCY AUDIT REPORT');
      renderReferenceBar(
        doc,
        115,
        'Campaign ID',
        campaign.campaignId,
        new Date(campaign.startDate).toLocaleDateString(),
        'Campaign Status',
        campaign.status,
        campaign.status === 'FINALIZED' ? '#059669' : '#0284C7'
      );

      let y = 155;
      renderSectionTitle(doc, y, '1. AUDIT CAMPAIGN EXECUTIVE METRICS');
      y += 20;

      const records = campaign.records || [];
      const totalVerified = records.length;
      const discrepancyList = records.filter(r => r.result !== 'VERIFIED');
      const verifiedOk = totalVerified - discrepancyList.length;

      // 4 Metric Chips
      const chipW = 120;
      const drawChip = (x, label, val, color) => {
        doc.rect(x, y, chipW, 36).fill(docColors.boxBg).stroke(docColors.border);
        doc.fillColor(docColors.muted).font('Helvetica-Bold').fontSize(7).text(label, x + 8, y + 6);
        doc.fillColor(color).font('Helvetica-Bold').fontSize(13).text(String(val), x + 8, y + 17);
      };

      drawChip(40, 'TOTAL EVALUATED', totalVerified, docColors.primary);
      drawChip(170, 'VERIFIED CORRECT', verifiedOk, '#059669');
      drawChip(300, 'DISCREPANCIES DETECTED', discrepancyList.length, discrepancyList.length > 0 ? '#DC2626' : '#059669');
      drawChip(430, 'FINANCIAL YEAR', campaign.financialYear || '2025-26', docColors.primary);

      y += 50;
      renderSectionTitle(doc, y, '2. PHYSICAL AUDIT REGISTER & DISCREPANCY LOG');
      y += 18;

      // Table Headers
      doc.rect(40, y, 515, 18).fill(docColors.primary);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7.5);
      doc.text('Asset ID', 45, y + 5, { width: 90 });
      doc.text('Make / Model', 140, y + 5, { width: 110 });
      doc.text('Serial Number', 255, y + 5, { width: 85 });
      doc.text('Observed Location', 345, y + 5, { width: 95 });
      doc.text('Result', 445, y + 5, { width: 70 });
      doc.text('Cond.', 520, y + 5, { width: 30 });
      y += 18;

      if (records.length === 0) {
        doc.rect(40, y, 515, 25).fill('#FFFFFF').stroke(docColors.border);
        doc.fillColor(docColors.muted).font('Helvetica').fontSize(8).text('No physical verification records captured under this campaign.', 50, y + 8);
        y += 30;
      } else {
        records.slice(0, 15).forEach((rec, idx) => {
          const isAlt = idx % 2 === 1;
          const rowBg = isAlt ? '#F8FAFC' : '#FFFFFF';
          const isDisc = rec.result !== 'VERIFIED';

          doc.rect(40, y, 515, 18).fill(isDisc ? '#FEF2F2' : rowBg).stroke(docColors.border);
          doc.fillColor(isDisc ? '#B91C1C' : docColors.text).font('Helvetica-Bold').fontSize(7.5);
          doc.text(rec.assetId, 45, y + 5, { width: 90, ellipsis: true });

          doc.font('Helvetica').fillColor(docColors.text);
          doc.text(`${rec.assetName || ''}`, 140, y + 5, { width: 110, ellipsis: true });
          doc.text(rec.serialNumber || '—', 255, y + 5, { width: 85, ellipsis: true });
          doc.text(rec.observedLocation || rec.expectedDepartment || '—', 345, y + 5, { width: 95, ellipsis: true });

          doc.font('Helvetica-Bold').fillColor(isDisc ? '#DC2626' : '#059669');
          doc.text(rec.result, 445, y + 5, { width: 70 });

          doc.font('Helvetica').fillColor(docColors.muted);
          doc.text(rec.observedCondition || 'GOOD', 520, y + 5, { width: 30 });
          y += 18;
        });
      }

      // 3. Discrepancy Note
      y += 20;
      if (discrepancyList.length > 0) {
        doc.rect(40, y, 515, 34).fill('#FEF2F2').stroke('#FECACA');
        doc.fillColor('#991B1B').font('Helvetica-Bold').fontSize(8).text('DISCREPANCY INVESTIGATION NOTICE:', 50, y + 6);
        doc.font('Helvetica').fontSize(7.5).fillColor('#B91C1C').text(
          `${discrepancyList.length} asset(s) flagged with variance (missing, damaged, or unapproved location). Physical inquiry recommended per AAI store guidelines.`,
          50,
          y + 18,
          { width: 495 }
        );
        y += 44;
      }

      // Sign-offs
      y += 40;
      doc.moveTo(50, y + 35).lineTo(230, y + 35).strokeColor('#9CA3AF').stroke();
      doc.fillColor(docColors.text).font('Helvetica-Bold').fontSize(8).text('INSPECTING AUDIT OFFICER', 50, y + 42);
      doc.font('Helvetica').fontSize(7.5).fillColor(docColors.muted)
        .text(`Auditor: ${campaign.createdBy || 'Authorized Verifier'}`, 50, y + 52)
        .text('Signature & Date: ___________________', 50, y + 62);

      doc.moveTo(360, y + 35).lineTo(540, y + 35).strokeColor('#9CA3AF').stroke();
      doc.fillColor(docColors.text).font('Helvetica-Bold').fontSize(8).text('GENERAL MANAGER (IT / STORES)', 360, y + 42);
      doc.font('Helvetica').fontSize(7.5).fillColor(docColors.muted)
        .text('Regional Headquarters Review', 360, y + 52)
        .text('Approved Seal: ____________________', 360, y + 62);

      renderFooter(doc, campaign.campaignId);
      doc.end();
    });
  },

  /**
   * 5. COMPLAINT DOCUMENT: IT Service & Fault Complaint Report
   */
  generateComplaintReportPdf: async (ticketId) => {
    const complaint = await complaintRepository.findById(ticketId);
    if (!complaint) {
      const err = new Error(`Complaint ticket '${ticketId}' not found`);
      err.statusCode = 404;
      throw err;
    }

    const asset = await assetRepository.findById(complaint.assetId);

    return new Promise((resolve, reject) => {
      const doc = createDoc(
        `AAI Service Report - ${complaint.ticketId}`,
        'Official IT Fault & Maintenance Incident Report'
      );

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      renderHeaderBanner(doc, 'IT HARDWARE & SERVICE DESK COMPLAINT REPORT');
      renderReferenceBar(
        doc,
        115,
        'Ticket ID',
        complaint.ticketId,
        new Date(complaint.createdAt).toLocaleDateString(),
        'Resolution Status',
        complaint.status,
        complaint.status === 'RESOLVED' || complaint.status === 'CLOSED' ? '#059669' : '#D97706'
      );

      let y = 155;
      renderSectionTitle(doc, y, '1. SERVICE COMPLAINANT & LOCATION');
      y += 20;

      const c1 = 50, c2 = 180, c3 = 320, c4 = 440;
      doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Reported By:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(complaint.reportedBy?.employeeName || 'Staff Member', c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Staff / Emp ID:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(complaint.reportedBy?.employeeId || 'N/A', c4, y);

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Department:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica').text(complaint.reportedBy?.department || 'General Section', c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Station / Floor:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica').text(complaint.reportedBy?.floor || 'Technical Wing', c4, y);

      y += 26;
      renderSectionTitle(doc, y, '2. AFFECTED ASSET & HARDWARE SPECIFICATIONS');
      y += 20;

      doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Asset Tag ID:', c1, y);
      doc.fillColor(docColors.primary).font('Helvetica-Bold').text(complaint.assetId, c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Serial Number (OEM):', c3, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(asset?.serialNumber || '—', c4, y);

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Equipment Name:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(complaint.assetName || asset?.assetName || 'Hardware Unit', c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Warranty Status:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica').text(asset?.warrantyStatus || 'ACTIVE', c4, y);

      y += 26;
      renderSectionTitle(doc, y, '3. FAULT ASSESSMENT & TECHNICAL RESOLUTION');
      y += 20;

      doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Fault Category:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(complaint.category, c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Priority / Severity:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').fillColor(complaint.severity === 'CRITICAL' ? '#DC2626' : '#2563EB').text(`${complaint.severity} (${complaint.priority || 'P3'})`, c4, y);

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Issue Summary:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(complaint.title, c2, y, { width: 360 });

      y += 18;
      doc.fillColor(docColors.muted).font('Helvetica').text('Fault Description:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica').text(complaint.description, c2, y, { width: 360 });

      y += 26;
      doc.fillColor(docColors.muted).font('Helvetica').text('Assigned Technician:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(complaint.assignedTechnician?.name || 'Unassigned / Queue', c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Resolved Date:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica').text(complaint.resolution?.resolvedAt ? new Date(complaint.resolution.resolvedAt).toLocaleDateString() : 'In Progress', c4, y);

      if (complaint.resolution?.resolutionNotes) {
        y += 16;
        doc.fillColor(docColors.muted).font('Helvetica').text('Resolution Notes:', c1, y);
        doc.fillColor(docColors.text).font('Helvetica').text(complaint.resolution.resolutionNotes, c2, y, { width: 360 });
      }

      if (complaint.resolution?.partsReplaced) {
        y += 16;
        doc.fillColor(docColors.muted).font('Helvetica').text('Parts Replaced:', c1, y);
        doc.fillColor(docColors.text).font('Helvetica').text(complaint.resolution.partsReplaced, c2, y, { width: 360 });
      }

      // Sign-offs
      y += 65;
      doc.moveTo(50, y + 35).lineTo(230, y + 35).strokeColor('#9CA3AF').stroke();
      doc.fillColor(docColors.text).font('Helvetica-Bold').fontSize(8).text('ATTENDING SERVICE TECHNICIAN', 50, y + 42);
      doc.font('Helvetica').fontSize(7.5).fillColor(docColors.muted)
        .text(`Technician: ${complaint.assignedTechnician?.name || 'Hardware Specialist'}`, 50, y + 52)
        .text('Signature & Date: ___________________', 50, y + 62);

      doc.moveTo(360, y + 35).lineTo(540, y + 35).strokeColor('#9CA3AF').stroke();
      doc.fillColor(docColors.text).font('Helvetica-Bold').fontSize(8).text('USER FUNCTIONAL CLEARANCE', 360, y + 42);
      doc.font('Helvetica').fontSize(7.5).fillColor(docColors.muted)
        .text(`Staff: ${complaint.reportedBy?.employeeName}`, 360, y + 52)
        .text('Confirmed Operational: ______________', 360, y + 62);

      renderFooter(doc, complaint.ticketId);
      doc.end();
    });
  },

  /**
   * 6. RETIREMENT DOCUMENT: Asset Retirement & Decommissioning Record
   */
  generateRetirementPdf: async (assetId) => {
    const asset = await assetRepository.findById(assetId);
    if (!asset) {
      const err = new Error(`Asset '${assetId}' not found for retirement slip`);
      err.statusCode = 404;
      throw err;
    }

    return new Promise((resolve, reject) => {
      const doc = createDoc(
        `AAI Asset Retirement - ${asset.assetId}`,
        'Official IT Asset Decommissioning & Condemnation Record'
      );

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      renderHeaderBanner(doc, 'ASSET RETIREMENT & DECOMMISSIONING RECORD');
      renderReferenceBar(
        doc,
        115,
        'Decommissioning ID',
        `RET-${asset.assetId}`,
        new Date().toLocaleDateString(),
        'Asset Lifecycle',
        asset.status || 'RETIRED',
        '#DC2626'
      );

      let y = 155;
      renderSectionTitle(doc, y, '1. DECOMMISSIONED HARDWARE IDENTIFICATION');
      y += 20;

      const c1 = 50, c2 = 180, c3 = 320, c4 = 440;
      doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Asset Tag ID:', c1, y);
      doc.fillColor(docColors.primary).font('Helvetica-Bold').text(asset.assetId, c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Category:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica').text(asset.category, c4, y);

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Asset Description:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(asset.assetName, c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Serial Number (OEM):', c3, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(asset.serialNumber, c4, y);

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Make / Model:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica').text(`${asset.make} ${asset.model}`, c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Operating System:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica').text(`${asset.operatingSystem || 'N/A'} ${asset.osVersion || ''}`, c4, y);

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Installation Date:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica').text(asset.installDate ? new Date(asset.installDate).toLocaleDateString() : '—', c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Warranty Status:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica').text(asset.warrantyStatus || 'EXPIRED', c4, y);

      y += 28;
      renderSectionTitle(doc, y, '2. CONDEMNATION JUSTIFICATION & LAST CUSTODY');
      y += 20;

      doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Last Recorded Custodian:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica').text(asset.currentEmployeeName || 'Central IT Reserve', c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Department / Floor:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica').text(`${asset.department} (${asset.floor})`, c4, y);

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Observed Condition:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(asset.condition || 'UNUSABLE', c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Disposal Action:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(asset.status === 'DISPOSED' ? 'DISPOSED / SCRAPPED' : 'RETIRED (SURVEY STAGE)', c4, y);

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Condemnation Reason:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(asset.remarks || 'Lifespan expired; hardware beyond economic repair.', c2, y, { width: 360 });

      y += 35;
      doc.rect(40, y, 515, 50).fill('#F8FAFC').stroke(docColors.border);
      doc.fillColor('#334155').font('Helvetica-Bold').fontSize(8).text('SURVEY BOARD CONDEMNATION NOTICE (Institutional Recommendation):', 50, y + 8);
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748B').text(
        'The technical committee confirms that this equipment has completed its serviceable operational lifecycle. Hard drives have been demagnetized and erased per AAI cybersecurity norms. Stored for final institutional disposal / e-waste auction.',
        50,
        y + 20,
        { width: 495, lineGap: 1.5 }
      );

      // Sign-offs
      y += 85;
      doc.moveTo(50, y + 35).lineTo(230, y + 35).strokeColor('#9CA3AF').stroke();
      doc.fillColor(docColors.text).font('Helvetica-Bold').fontSize(8).text('TECHNICAL EVALUATING OFFICER', 50, y + 42);
      doc.font('Helvetica').fontSize(7.5).fillColor(docColors.muted)
        .text('IT Division Technical Evaluation', 50, y + 52)
        .text('Signature & Date: ___________________', 50, y + 62);

      doc.moveTo(360, y + 35).lineTo(540, y + 35).strokeColor('#9CA3AF').stroke();
      doc.fillColor(docColors.text).font('Helvetica-Bold').fontSize(8).text('COMPETENT DISPOSAL AUTHORITY', 360, y + 42);
      doc.font('Helvetica').fontSize(7.5).fillColor(docColors.muted)
        .text('Regional Store Condemnation Board', 360, y + 52)
        .text('Sanction Seal & Date: _______________', 360, y + 62);

      renderFooter(doc, `RET-${asset.assetId}`);
      doc.end();
    });
  },

  /**
   * 7. AMC DOCUMENT: Annual Maintenance Contract (AMC) SLA Report
   */
  generateAmcReportPdf: async (contractNumber) => {
    const contract = await amcRepository.findById(contractNumber);
    if (!contract) {
      const err = new Error(`AMC agreement '${contractNumber}' not found`);
      err.statusCode = 404;
      throw err;
    }

    return new Promise((resolve, reject) => {
      const doc = createDoc(
        `AAI AMC Agreement - ${contract.contractNumber}`,
        'Official Annual Maintenance Contract (AMC) SLA Summary'
      );

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      renderHeaderBanner(doc, 'ANNUAL MAINTENANCE CONTRACT (AMC) SLA REPORT');
      renderReferenceBar(
        doc,
        115,
        'Agreement No',
        contract.contractNumber,
        new Date(contract.startDate).toLocaleDateString(),
        'Contract Status',
        contract.status || 'ACTIVE',
        contract.status === 'ACTIVE' ? '#059669' : '#D97706'
      );

      let y = 155;
      renderSectionTitle(doc, y, '1. VENDOR & CONTRACTUAL SLA COMMITMENTS');
      y += 20;

      const c1 = 50, c2 = 180, c3 = 320, c4 = 440;
      doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Contractor / Vendor:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(contract.vendorName, c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Support SLA Tier:', c3, y);
      doc.fillColor(docColors.primary).font('Helvetica-Bold').text(contract.supportTier, c4, y);

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Service Domain:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica').text(contract.serviceType, c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Annual Value (INR):', c3, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(`Rs. ${Number(contract.annualCostINR || 0).toLocaleString('en-IN')}`, c4, y);

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Commencement Date:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica').text(new Date(contract.startDate).toLocaleDateString(), c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Expiry Date:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(new Date(contract.endDate).toLocaleDateString(), c4, y);

      y += 28;
      renderSectionTitle(doc, y, '2. COVERED EQUIPMENT CATEGORIES & SCOPE');
      y += 20;

      const cats = (contract.coveredCategories || []).join(', ') || 'All Regional IT Hardware Units';
      doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Covered Equipment:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(cats, c2, y, { width: 360 });

      y += 24;
      doc.fillColor(docColors.muted).font('Helvetica').text('Contract Notes / Remarks:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica').text(contract.remarks || 'Standard comprehensive maintenance with quarterly preventive servicing.', c2, y, { width: 360 });

      y += 30;
      renderSectionTitle(doc, y, '3. VENDOR CONTACT & EMERGENCY RESPONSE HOTLINE');
      y += 20;

      doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Key Account Manager:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(contract.contactPerson || 'Vendor Dispatch Desk', c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Emergency Phone:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(contract.contactPhone || '1800-425-0088', c4, y);

      y += 16;
      doc.fillColor(docColors.muted).font('Helvetica').text('Service Portal / Email:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica').text(contract.contactEmail || 'support@vendor.in', c2, y);

      // Sign-offs
      y += 85;
      doc.moveTo(50, y + 35).lineTo(230, y + 35).strokeColor('#9CA3AF').stroke();
      doc.fillColor(docColors.text).font('Helvetica-Bold').fontSize(8).text('VENDOR AUTHORIZED SIGNATORY', 50, y + 42);
      doc.font('Helvetica').fontSize(7.5).fillColor(docColors.muted)
        .text(`Authorized: ${contract.contactPerson || 'Vendor Lead'}`, 50, y + 52)
        .text('Seal & Date: ____________________', 50, y + 62);

      doc.moveTo(360, y + 35).lineTo(540, y + 35).strokeColor('#9CA3AF').stroke();
      doc.fillColor(docColors.text).font('Helvetica-Bold').fontSize(8).text('AAI REGIONAL IT NODAL OFFICER', 360, y + 42);
      doc.font('Helvetica').fontSize(7.5).fillColor(docColors.muted)
        .text('Contract Monitoring & Compliance', 360, y + 52)
        .text('Signature: _______________________', 360, y + 62);

      renderFooter(doc, contract.contractNumber);
      doc.end();
    });
  },

  /**
   * Auto-routing Backwards-Compatible Handover PDF Generator
   * Routes dynamically to Assignment, Transfer, or Return based on assignment lifecycle
   */
  generateHandoverPdf: async (assignmentId) => {
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment) {
      const err = new Error(`Assignment record '${assignmentId}' not found`);
      err.statusCode = 404;
      throw err;
    }

    if (assignment.status === 'TRANSFERRED') {
      return exportService.generateTransferPdf(assignmentId);
    }
    if (assignment.status === 'RETURNED' || assignment.returnedDate) {
      return exportService.generateReturnPdf(assignmentId);
    }
    return exportService.generateAssignmentPdf(assignmentId);
  },

  /**
   * 8. ASSET HANDOVER CERTIFICATE: Standalone professional handover certificate for a given asset.
   * Called from GET /api/v1/export/handover/asset/:assetId/pdf
   * Generates a full A4 document with asset details, custodian info, QR code, and dual sign-off.
   */
  generateAssetHandoverPdf: async (assetId) => {
    const asset = await assetRepository.findById(assetId);
    if (!asset) {
      const err = new Error(`Asset '${assetId}' not found`);
      err.statusCode = 404;
      throw err;
    }

    // Attempt to get current active assignment for custodian details
    let assignment = await assignmentRepository.findCurrentAssignment(assetId);
    if (!assignment) {
      // Fall back to most-recent historical assignment
      const history = await assignmentRepository.findHistoryByAsset(assetId);
      if (history && history.length > 0) {
        assignment = history[0];
      }
    }

    // Generate QR code as a base64 PNG buffer
    let qrBuffer = null;
    try {
      const QRCode = (await import('qrcode')).default;
      const qrText = [
        `AssetID: ${asset.assetId}`,
        `Name: ${asset.assetName}`,
        `Serial: ${asset.serialNumber || 'N/A'}`,
        `Custodian: ${asset.currentEmployeeName || 'Unassigned'}`,
        `Dept: ${asset.department || 'N/A'}`,
        `Status: ${asset.status}`,
        `Generated: ${new Date().toISOString()}`
      ].join('\n');
      qrBuffer = await QRCode.toBuffer(qrText, { type: 'png', width: 100, margin: 1 });
    } catch {
      // QR generation is non-fatal — proceed without it
    }

    return new Promise((resolve, reject) => {
      const doc = createDoc(
        `AAI Asset Handover Certificate - ${asset.assetId}`,
        'Official IT Equipment Handover & Custody Certificate'
      );

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // ─── HEADER BANNER ───────────────────────────────────────────────
      renderHeaderBanner(doc, 'IT EQUIPMENT HANDOVER & CUSTODY CERTIFICATE');

      // ─── REFERENCE / STATUS BAR ──────────────────────────────────────
      const issueDate = assignment?.assignedDate
        ? new Date(assignment.assignedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      const statusColor =
        asset.status === 'ASSIGNED'    ? '#059669' :
        asset.status === 'AVAILABLE'   ? '#0284C7' :
        asset.status === 'RETIRED'     ? '#DC2626' :
        asset.status === 'DISPOSED'    ? '#B91C1C' : '#D97706';

      renderReferenceBar(doc, 115, 'Asset Tag ID', asset.assetId, issueDate, 'Status', asset.status, statusColor);

      // ─── QR CODE (top-right floating) ────────────────────────────────
      if (qrBuffer) {
        try {
          doc.image(qrBuffer, 455, 130, { width: 80, height: 80 });
          doc.fillColor(docColors.muted).font('Helvetica').fontSize(6.5)
            .text('Scan to verify asset', 455, 212, { width: 80, align: 'center' });
        } catch { /* non-fatal */ }
      }

      let y = 155;
      const c1 = 50, c2 = 190, c3 = 320, c4 = 440;

      // ─── SECTION 1: ASSET IDENTIFICATION ────────────────────────────
      renderSectionTitle(doc, y, '1. ASSET IDENTIFICATION & TECHNICAL SPECIFICATIONS');
      y += 22;

      doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Asset Tag ID:', c1, y);
      doc.fillColor(docColors.primary).font('Helvetica-Bold').fontSize(9).text(asset.assetId, c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Category:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica').text(asset.category || '—', c4, y);

      y += 17;
      doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Asset Name / Description:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').text(asset.assetName || '—', c2, y, { width: 250 });

      y += 17;
      doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Make / Brand:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica').text(asset.make || '—', c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').text('Model Number:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica').text(asset.model || '—', c4, y);

      y += 17;
      doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Serial Number (OEM):', c1, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').fontSize(9).text(asset.serialNumber || '—', c2, y);
      doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Physical Condition:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica-Bold').fillColor(
        asset.condition === 'EXCELLENT' ? '#059669' :
        asset.condition === 'GOOD'      ? '#0284C7' :
        asset.condition === 'FAIR'      ? '#D97706' : '#DC2626'
      ).text(asset.condition || 'GOOD', c4, y);

      y += 17;
      doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Operating System:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica').text(
        [asset.operatingSystem, asset.osVersion].filter(Boolean).join(' ') || 'N/A', c2, y
      );
      doc.fillColor(docColors.muted).font('Helvetica').text('Installation Date:', c3, y);
      doc.fillColor(docColors.text).font('Helvetica').text(
        asset.installDate ? new Date(asset.installDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—', c4, y
      );

      y += 17;
      doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Warranty Valid Till:', c1, y);
      doc.fillColor(docColors.text).font('Helvetica').text(
        asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—', c2, y
      );
      doc.fillColor(docColors.muted).font('Helvetica').text('Warranty Status:', c3, y);
      doc.fillColor(asset.warrantyStatus === 'ACTIVE' ? '#059669' : '#DC2626').font('Helvetica-Bold')
        .text(asset.warrantyStatus || 'ACTIVE', c4, y);

      // ─── SECTION 2: CUSTODIAN DETAILS ───────────────────────────────
      y += 28;
      renderSectionTitle(doc, y, '2. ASSIGNED CUSTODIAN & DEPARTMENT DETAILS');
      y += 22;

      if (assignment) {
        doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Custodian Name:', c1, y);
        doc.fillColor(docColors.text).font('Helvetica-Bold').text(assignment.employeeName || asset.currentEmployeeName || '—', c2, y);
        doc.fillColor(docColors.muted).font('Helvetica').text('Employee ID:', c3, y);
        doc.fillColor(docColors.primary).font('Helvetica-Bold').text(assignment.employeeId || asset.currentEmployeeId || '—', c4, y);

        y += 17;
        doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Designation:', c1, y);
        doc.fillColor(docColors.text).font('Helvetica').text(assignment.designation || asset.currentDesignation || '—', c2, y);
        doc.fillColor(docColors.muted).font('Helvetica').text('Department:', c3, y);
        doc.fillColor(docColors.text).font('Helvetica').text(assignment.department || asset.department || '—', c4, y);

        y += 17;
        doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Floor / Location:', c1, y);
        doc.fillColor(docColors.text).font('Helvetica').text(assignment.floor || asset.floor || '—', c2, y);
        doc.fillColor(docColors.muted).font('Helvetica').text('Handover Date:', c3, y);
        doc.fillColor(docColors.text).font('Helvetica-Bold').text(issueDate, c4, y);

        y += 17;
        doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Issued / Sanctioned By:', c1, y);
        doc.fillColor(docColors.text).font('Helvetica').text(assignment.assignedBy || 'Regional IT Admin', c2, y);
        doc.fillColor(docColors.muted).font('Helvetica').text('Assignment Status:', c3, y);
        doc.fillColor(assignment.status === 'ACTIVE' ? '#059669' : '#D97706').font('Helvetica-Bold')
          .text(assignment.status || 'ACTIVE', c4, y);
      } else {
        // Asset not yet assigned
        doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Custodian Name:', c1, y);
        doc.fillColor(docColors.text).font('Helvetica-Bold').text(asset.currentEmployeeName || 'Unassigned — In IT Store Pool', c2, y);

        y += 17;
        doc.fillColor(docColors.muted).font('Helvetica').fontSize(8.5).text('Department:', c1, y);
        doc.fillColor(docColors.text).font('Helvetica').text(asset.department || 'IT Store / Reserve Pool', c2, y);
      }

      // ─── SECTION 3: REMARKS ─────────────────────────────────────────
      if (asset.remarks || (assignment && assignment.remarks)) {
        y += 28;
        renderSectionTitle(doc, y, '3. OFFICIAL REMARKS & OPERATIONAL NOTES');
        y += 20;
        const remarksText = [asset.remarks, assignment?.remarks].filter(Boolean).join(' | ') || '—';
        doc.rect(c1 - 10, y, 515, Math.max(30, 12 + Math.ceil(remarksText.length / 80) * 12))
          .fill(docColors.boxBg).stroke(docColors.border);
        doc.fillColor(docColors.text).font('Helvetica').fontSize(8)
          .text(remarksText, c1, y + 8, { width: 490, lineGap: 2 });
        y += Math.max(30, 12 + Math.ceil(remarksText.length / 80) * 12) + 5;
      }

      // ─── CUSTODY UNDERTAKING BOX ────────────────────────────────────
      y += 18;
      doc.rect(40, y, 515, 62).fill(docColors.alertBg).stroke(docColors.alertBorder);
      doc.fillColor(docColors.alertText).font('Helvetica-Bold').fontSize(8)
        .text('CUSTODY ACKNOWLEDGEMENT & COMPLIANCE UNDERTAKING:', 52, y + 8);
      doc.font('Helvetica').fontSize(7.5).text(
        'I hereby acknowledge the receipt of the IT equipment specified above in good working order. ' +
        'I undertake to safeguard and use it exclusively for official purposes in accordance with the ' +
        'IT Security and Asset Governance Policies of Airports Authority of India (AAI). ' +
        'The asset shall not be relocated, modified, or transferred without formal sanction from the Regional IT Division.',
        52, y + 22, { width: 497, lineGap: 1.8 }
      );
      y += 78;

      // ─── DUAL SIGNATURE BLOCKS ───────────────────────────────────────
      doc.moveTo(50, y + 38).lineTo(235, y + 38).strokeColor('#9CA3AF').lineWidth(0.5).stroke();
      doc.fillColor(docColors.text).font('Helvetica-Bold').fontSize(8.5)
        .text('ISSUED BY — IT Division / Sanctioning Officer', 50, y + 44);
      doc.font('Helvetica').fontSize(7.5).fillColor(docColors.muted)
        .text(`Officer: ${assignment?.assignedBy || 'Regional IT Admin'}`, 50, y + 55)
        .text('Designation: IT Division Officer / Nodal Officer', 50, y + 65)
        .text('Signature & Official Stamp: ___________________', 50, y + 75);

      doc.moveTo(355, y + 38).lineTo(545, y + 38).strokeColor('#9CA3AF').lineWidth(0.5).stroke();
      doc.fillColor(docColors.text).font('Helvetica-Bold').fontSize(8.5)
        .text('RECEIVED BY — Staff Custodian', 355, y + 44);
      doc.font('Helvetica').fontSize(7.5).fillColor(docColors.muted)
        .text(`Name: ${assignment?.employeeName || asset.currentEmployeeName || '________________'}`, 355, y + 55)
        .text(`Emp ID: ${assignment?.employeeId || asset.currentEmployeeId || '________________'}`, 355, y + 65)
        .text('Signature & Date: ______________________________', 355, y + 75);

      // ─── FOOTER ──────────────────────────────────────────────────────
      renderFooter(doc, asset.assetId);
      doc.end();
    });
  }
};

