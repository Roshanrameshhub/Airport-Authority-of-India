/**
 * Auto-generate AAI standardized Asset ID if not provided
 * Format: AAI-REG-[CAT]-[YYYY]-[SEQ]
 * Example: AAI-REG-PC-2026-0001
 */

const categoryCodeMap = {
  'Desktop PC': 'PC',
  'Laptop': 'LPT',
  'Printer': 'PRT',
  'Monitor': 'MON',
  'UPS': 'UPS',
  'Scanner': 'SCN',
  'Server / Network': 'NET'
};

export const generateAssetId = (category = 'PC', sequenceNumber = 1) => {
  const catCode = categoryCodeMap[category] || category.substring(0, 3).toUpperCase();
  const year = new Date().getFullYear();
  const seq = String(sequenceNumber).padStart(4, '0');
  return `AAI-REG-${catCode}-${year}-${seq}`;
};

export const generateAssignmentId = (sequenceNumber) => {
  const year = new Date().getFullYear();
  const seq = sequenceNumber 
    ? String(sequenceNumber).padStart(5, '0') 
    : Math.floor(10000 + Math.random() * 90000);
  return `AAI-ASG-${year}-${seq}`;
};

export const generateTicketId = (sequenceNumber) => {
  const year = new Date().getFullYear();
  const seq = sequenceNumber 
    ? String(sequenceNumber).padStart(4, '0') 
    : Math.floor(1000 + Math.random() * 9000);
  return `AAI-TKT-${year}-${seq}`;
};


