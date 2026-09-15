import { departmentRepository } from '../repositories/departmentRepository.js';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { locationRepository } from '../repositories/locationRepository.js';
import { vendorRepository } from '../repositories/vendorRepository.js';
import { sendSuccess } from '../utils/apiResponse.js';

/**
 * Canonical Category → Asset Type mapping for AAI AMS.
 * Drives dynamic cascade dropdown in UI and backend validation.
 */
export const CATEGORY_ASSET_TYPE_MAP = {
  'IT Equipment': [
    { key: 'DESKTOP', label: 'Desktop Workstation / PC', hasConfig: 'computerConfig' },
    { key: 'LAPTOP', label: 'Laptop / Notebook', hasConfig: 'computerConfig' },
    { key: 'WORKSTATION', label: 'High-Performance Workstation', hasConfig: 'computerConfig' },
    { key: 'SERVER', label: 'Enterprise Server', hasConfig: 'computerConfig' },
    { key: 'MONITOR', label: 'Display Screen / Monitor', hasConfig: 'displayConfig' },
    { key: 'STORAGE', label: 'Storage Subsystem (NAS / SAN / DAS)', hasConfig: 'computerConfig' },
    { key: 'THIN_CLIENT', label: 'Thin Client Terminal', hasConfig: 'computerConfig' }
  ],
  'Networking': [
    { key: 'NETWORK', label: 'Network Equipment (Generic)', hasConfig: 'networkConfig' },
    { key: 'SWITCH', label: 'Network Switch', hasConfig: 'networkConfig' },
    { key: 'ROUTER', label: 'Router / Gateway', hasConfig: 'networkConfig' },
    { key: 'FIREWALL', label: 'Firewall / UTM Appliance', hasConfig: 'networkConfig' },
    { key: 'ACCESS_POINT', label: 'Wireless Access Point', hasConfig: 'networkConfig' },
    { key: 'MODEM', label: 'Modem / ADSL / Cable', hasConfig: 'networkConfig' }
  ],
  'Power': [
    { key: 'UPS', label: 'Uninterruptible Power Supply (UPS)', hasConfig: 'powerConfig' },
    { key: 'BATTERY_BANK', label: 'Battery Bank / Inverter', hasConfig: 'powerConfig' },
    { key: 'STABILIZER', label: 'Voltage Stabilizer / AVR', hasConfig: 'powerConfig' },
    { key: 'PDU', label: 'Power Distribution Unit (PDU)', hasConfig: 'powerConfig' }
  ],
  'Printing': [
    { key: 'PRINTER', label: 'Printer (Laser / Inkjet / Dot Matrix)', hasConfig: 'peripheralConfig' },
    { key: 'SCANNER', label: 'Scanner (Sheetfed / Flatbed)', hasConfig: 'peripheralConfig' },
    { key: 'MULTIFUNCTION_PRINTER', label: 'Multifunction / All-in-One Printer', hasConfig: 'peripheralConfig' },
    { key: 'PLOTTER', label: 'Plotter / Wide Format Printer', hasConfig: 'peripheralConfig' }
  ],
  'Communication': [
    { key: 'INTERCOM', label: 'Intercom System / EPABX Terminal', hasConfig: 'specifications' },
    { key: 'TELEPHONE', label: 'Telephone / IP Phone', hasConfig: 'specifications' },
    { key: 'COMMUNICATION_DEVICE', label: 'Communication Device (Generic)', hasConfig: 'specifications' },
    { key: 'RADIO', label: 'Radio / VHF Equipment', hasConfig: 'specifications' }
  ],
  'Surveillance': [
    { key: 'CCTV', label: 'CCTV Camera', hasConfig: 'specifications' },
    { key: 'DVR_NVR', label: 'DVR / NVR Recorder', hasConfig: 'specifications' },
    { key: 'ACCESS_CONTROL', label: 'Access Control System', hasConfig: 'specifications' },
    { key: 'BIOMETRIC', label: 'Biometric Attendance Terminal', hasConfig: 'specifications' }
  ],
  'Office Equipment': [
    { key: 'PROJECTOR', label: 'Projector / Display Presentation Unit', hasConfig: 'specifications' },
    { key: 'PERIPHERAL', label: 'Peripheral Device', hasConfig: 'peripheralConfig' },
    { key: 'SHREDDER', label: 'Document Shredder', hasConfig: 'specifications' },
    { key: 'LAMINATOR', label: 'Laminator', hasConfig: 'specifications' },
    { key: 'BINDING', label: 'Binding Machine', hasConfig: 'specifications' }
  ],
  'Furniture': [
    { key: 'OTHER', label: 'Furniture / Fixture Item', hasConfig: 'specifications' }
  ],
  'Other': [
    { key: 'OTHER', label: 'Other Operational Equipment', hasConfig: 'specifications' }
  ]
};

/**
 * All asset types flattened with deduplication (backward compatible full list)
 */
const ALL_ASSET_TYPES = (() => {
  const seen = new Set();
  const types = [];
  for (const typeList of Object.values(CATEGORY_ASSET_TYPE_MAP)) {
    for (const t of typeList) {
      if (!seen.has(t.key)) {
        seen.add(t.key);
        types.push(t);
      }
    }
  }
  return types;
})();

export const getDepartments = async (req, res, next) => {
  try {
    const departments = await departmentRepository.findAll();
    return sendSuccess(res, departments, 'Departments retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (req, res, next) => {
  try {
    const categories = await categoryRepository.findAll();
    return sendSuccess(res, categories, 'Categories retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getLocations = async (req, res, next) => {
  try {
    const locations = await locationRepository.findAll();
    return sendSuccess(res, locations, 'Locations retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getVendors = async (req, res, next) => {
  try {
    const vendors = await vendorRepository.findAll();
    return sendSuccess(res, vendors, 'Vendors retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getStatuses = async (req, res, next) => {
  try {
    const statuses = [
      { key: 'AVAILABLE', label: 'Available (In Store)', description: 'Ready for issuance in department inventory' },
      { key: 'ASSIGNED', label: 'Assigned (In Custody)', description: 'Issued to an active employee custodian' },
      { key: 'GODOWN', label: 'In Godown (Scrap/Holding)', description: 'Held in godown awaiting survey or disposal' },
      { key: 'UNDER_MAINTENANCE', label: 'Under Maintenance', description: 'Preventive check or routine maintenance' },
      { key: 'UNDER_REPAIR', label: 'Under Repair', description: 'Hardware or component repair with vendor/lab' },
      { key: 'FAULTY', label: 'Faulty', description: 'Equipment reported defective and unusable' },
      { key: 'DAMAGED', label: 'Damaged', description: 'Physically damaged equipment' },
      { key: 'LOST', label: 'Lost / Missing', description: 'Unaccounted for during physical verification' },
      { key: 'WRITE_OFF', label: 'Surveyed for Write-Off', description: 'Condemned by Survey Board' },
      { key: 'RETIRED', label: 'Retired', description: 'Decommissioned from operational service' },
      { key: 'DISPOSED', label: 'Disposed / Auctioned', description: 'Permanently removed from AAI records' }
    ];
    return sendSuccess(res, statuses, 'Asset operational statuses retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getConditions = async (req, res, next) => {
  try {
    const conditions = [
      { key: 'NEW', label: 'Brand New', rating: 5 },
      { key: 'EXCELLENT', label: 'Excellent Condition', rating: 5 },
      { key: 'GOOD', label: 'Good Working Condition', rating: 4 },
      { key: 'FAIR', label: 'Fair / Operational with Minor Issues', rating: 3 },
      { key: 'POOR', label: 'Poor / Frequent Glitches', rating: 2 },
      { key: 'DAMAGED', label: 'Damaged / Broken Parts', rating: 1 },
      { key: 'UNSERVICEABLE', label: 'Unserviceable / Beyond Economic Repair', rating: 0 },
      { key: 'OBSOLETE', label: 'Obsolete Technology', rating: 0 }
    ];
    return sendSuccess(res, conditions, 'Asset condition ratings retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/master/asset-types[?category=IT Equipment]
 * Returns full list or category-filtered list of asset types
 */
export const getAssetTypes = async (req, res, next) => {
  try {
    const { category } = req.query;

    if (category) {
      // Case-insensitive category lookup
      const normalizedKey = Object.keys(CATEGORY_ASSET_TYPE_MAP).find(
        k => k.toLowerCase() === category.toLowerCase()
      );

      if (normalizedKey) {
        return sendSuccess(
          res,
          CATEGORY_ASSET_TYPE_MAP[normalizedKey],
          `Asset types for category '${normalizedKey}' retrieved successfully`
        );
      }

      // Unknown category — return full list as graceful fallback
      return sendSuccess(res, ALL_ASSET_TYPES, 'Asset type definitions retrieved successfully (full list fallback)');
    }

    // No category filter — return full de-duplicated list (backward compatible)
    return sendSuccess(res, ALL_ASSET_TYPES, 'Asset type definitions retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/master/category-asset-type-map
 * Returns the complete canonical Category → Asset Type mapping object
 */
export const getCategoryAssetTypeMap = async (req, res, next) => {
  try {
    // Also expose the flat category list for UI dropdowns
    const categories = Object.keys(CATEGORY_ASSET_TYPE_MAP).map(name => ({
      name,
      count: CATEGORY_ASSET_TYPE_MAP[name].length
    }));
    return sendSuccess(res, { map: CATEGORY_ASSET_TYPE_MAP, categories }, 'Category to Asset Type mapping retrieved successfully');
  } catch (error) {
    next(error);
  }
};
