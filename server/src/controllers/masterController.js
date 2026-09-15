import { departmentRepository } from '../repositories/departmentRepository.js';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { locationRepository } from '../repositories/locationRepository.js';
import { vendorRepository } from '../repositories/vendorRepository.js';
import { sendSuccess } from '../utils/apiResponse.js';

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

export const getAssetTypes = async (req, res, next) => {
  try {
    const types = [
      { key: 'DESKTOP', label: 'Desktop Workstation / PC', hasConfig: 'computerConfig' },
      { key: 'LAPTOP', label: 'Laptop / Notebook', hasConfig: 'computerConfig' },
      { key: 'PRINTER', label: 'Printer (MFP / Laser / Dot Matrix)', hasConfig: 'peripheralConfig' },
      { key: 'SCANNER', label: 'Scanner (Sheetfed / Flatbed)', hasConfig: 'peripheralConfig' },
      { key: 'UPS', label: 'Uninterruptible Power Supply (UPS)', hasConfig: 'powerConfig' },
      { key: 'MONITOR', label: 'Display Screen / Monitor', hasConfig: 'displayConfig' },
      { key: 'SERVER', label: 'Enterprise Server', hasConfig: 'computerConfig' },
      { key: 'NETWORK', label: 'Network Equipment (Switch / Router / AP)', hasConfig: 'networkConfig' },
      { key: 'STORAGE', label: 'Storage Subsystem (NAS / SAN / DAS)', hasConfig: 'computerConfig' },
      { key: 'PERIPHERAL', label: 'Peripheral Device', hasConfig: 'peripheralConfig' },
      { key: 'OTHER', label: 'Other Operational Equipment', hasConfig: 'specifications' }
    ];
    return sendSuccess(res, types, 'Asset type definitions retrieved successfully');
  } catch (error) {
    next(error);
  }
};
