/**
 * Calculate dynamic warranty status from dates
 * @param {Date | string} endDate 
 * @returns {'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'UNKNOWN'}
 */
export const calculateWarrantyStatus = (endDate) => {
  if (!endDate) return 'UNKNOWN';

  const end = new Date(endDate);
  if (isNaN(end.getTime())) return 'UNKNOWN';

  const now = new Date();
  // Today's date with time reset to midnight
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiry = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  if (today > expiry) {
    return 'EXPIRED';
  }

  // 30 days window in milliseconds
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  if (expiry.getTime() - today.getTime() <= thirtyDaysMs) {
    return 'EXPIRING_SOON';
  }

  return 'ACTIVE';
};
