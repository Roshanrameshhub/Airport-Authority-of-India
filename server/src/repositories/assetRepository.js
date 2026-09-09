import mongoose from 'mongoose';
import Asset from '../models/Asset.js';
import { calculateWarrantyStatus } from '../utils/warranty.js';
import { generateAssetId } from '../utils/idGenerator.js';

const memoryAssets = new Map();

const seedAssets = () => {
  if (memoryAssets.size === 0) {
    const list = [
      {
        _id: '66d400000000000000000001',
        assetId: 'AAI-REG-PC-2024-0001',
        assetName: 'Dell OptiPlex 7090 MT Workstation',
        category: 'Desktop PC',
        make: 'Dell',
        model: 'OptiPlex 7090 MT',
        serialNumber: 'DL-7090-99481',
        installDate: new Date('2024-01-15'),
        warrantyStartDate: new Date('2024-01-15'),
        warrantyEndDate: new Date('2027-01-15'),
        operatingSystem: 'Windows 11 Enterprise',
        osVersion: '23H2 (Build 22631)',
        department: 'Communication, Navigation & Surveillance',
        floor: '2nd Floor, Technical Block',
        remarks: 'Assigned for Radar Data Processing unit',
        status: 'ASSIGNED',
        condition: 'EXCELLENT',
        currentEmployeeId: 'AAI-10842',
        currentEmployeeName: 'Roshan R',
        currentDesignation: 'Assistant Manager (CNS)',
        currentAssignmentDate: new Date('2024-01-16'),
        isArchived: false
      },
      {
        _id: '66d400000000000000000002',
        assetId: 'AAI-REG-LPT-2024-0002',
        assetName: 'Dell Latitude 5420 Laptop',
        category: 'Laptop',
        make: 'Dell',
        model: 'Latitude 5420',
        serialNumber: 'DL-5420-99482',
        installDate: new Date('2024-03-10'),
        warrantyStartDate: new Date('2024-03-10'),
        warrantyEndDate: new Date('2027-03-10'),
        operatingSystem: 'Windows 11 Enterprise',
        osVersion: '23H2 (Build 22631)',
        department: 'Communication, Navigation & Surveillance',
        floor: '2nd Floor, Technical Block',
        remarks: 'Official laptop for CNS technical monitoring',
        status: 'ASSIGNED',
        condition: 'EXCELLENT',
        currentEmployeeId: 'AAI-10842',
        currentEmployeeName: 'Roshan R',
        currentDesignation: 'Assistant Manager (CNS)',
        currentAssignmentDate: new Date('2024-03-11'),
        isArchived: false
      },
      {
        _id: '66d400000000000000000003',
        assetId: 'AAI-REG-PRT-2023-0003',
        assetName: 'HP LaserJet Pro MFP M428fdn',
        category: 'Printer',
        make: 'HP',
        model: 'MFP M428fdn',
        serialNumber: 'VNC3K99214',
        installDate: new Date('2023-08-10'),
        warrantyStartDate: new Date('2023-08-10'),
        // Setting warranty to expire in 15 days for EXPIRING_SOON demonstration
        warrantyEndDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        operatingSystem: 'N/A',
        osVersion: 'Firmware v2.1',
        department: 'Communication, Navigation & Surveillance',
        floor: '2nd Floor, Technical Block',
        remarks: 'Shared network MFP on technical floor',
        status: 'ASSIGNED',
        condition: 'GOOD',
        currentEmployeeId: 'AAI-10842',
        currentEmployeeName: 'Roshan R',
        currentDesignation: 'Assistant Manager (CNS)',
        currentAssignmentDate: new Date('2023-08-12'),
        isArchived: false
      },
      {
        _id: '66d400000000000000000004',
        assetId: 'AAI-REG-PC-2023-0004',
        assetName: 'HP EliteDesk 800 G6 Tower',
        category: 'Desktop PC',
        make: 'HP',
        model: 'EliteDesk 800 G6',
        serialNumber: 'HP-800-44912',
        installDate: new Date('2023-04-05'),
        warrantyStartDate: new Date('2023-04-05'),
        warrantyEndDate: new Date('2026-04-05'),
        operatingSystem: 'Windows 10 Pro',
        osVersion: '22H2',
        department: 'Information Technology',
        floor: '2nd Floor, Admin Block',
        remarks: 'Admin workstation for regional server configuration',
        status: 'ASSIGNED',
        condition: 'GOOD',
        currentEmployeeId: 'AAI-ADM-001',
        currentEmployeeName: 'AAI Regional Admin',
        currentDesignation: 'Senior IT Manager',
        currentAssignmentDate: new Date('2023-04-06'),
        isArchived: false
      },
      {
        _id: '66d400000000000000000005',
        assetId: 'AAI-REG-MON-2024-0005',
        assetName: 'Dell UltraSharp 27" 4K Monitor',
        category: 'Monitor',
        make: 'Dell',
        model: 'U2723QE',
        serialNumber: 'CN-0K791X-74261',
        installDate: new Date('2024-02-20'),
        warrantyStartDate: new Date('2024-02-20'),
        warrantyEndDate: new Date('2027-02-20'),
        operatingSystem: 'N/A',
        osVersion: '',
        department: 'Information Technology',
        floor: '2nd Floor, Admin Block',
        remarks: 'Dual monitor setup for IT operations',
        status: 'ASSIGNED',
        condition: 'EXCELLENT',
        currentEmployeeId: 'AAI-ADM-001',
        currentEmployeeName: 'AAI Regional Admin',
        currentDesignation: 'Senior IT Manager',
        currentAssignmentDate: new Date('2024-02-20'),
        isArchived: false
      },
      {
        _id: '66d400000000000000000006',
        assetId: 'AAI-REG-PC-2022-0006',
        assetName: 'Lenovo ThinkCentre M70s',
        category: 'Desktop PC',
        make: 'Lenovo',
        model: 'ThinkCentre M70s Gen 3',
        serialNumber: 'LN-M70S-11029',
        installDate: new Date('2022-05-15'),
        warrantyStartDate: new Date('2022-05-15'),
        // Expired warranty
        warrantyEndDate: new Date('2025-05-15'),
        operatingSystem: 'Windows 10 Pro',
        osVersion: '21H2',
        department: 'Air Traffic Management',
        floor: '3rd Floor, ATC Tower',
        remarks: 'Flight progress strip logging station',
        status: 'ASSIGNED',
        condition: 'FAIR',
        currentEmployeeId: 'AAI-10950',
        currentEmployeeName: 'Amit Sharma',
        currentDesignation: 'Junior Executive (ATC)',
        currentAssignmentDate: new Date('2022-05-16'),
        isArchived: false
      },
      {
        _id: '66d400000000000000000007',
        assetId: 'AAI-REG-LPT-2024-0007',
        assetName: 'Lenovo ThinkPad T14 Gen 4',
        category: 'Laptop',
        make: 'Lenovo',
        model: 'ThinkPad T14 Gen 4',
        serialNumber: 'LN-T14-55821',
        installDate: new Date('2024-06-01'),
        warrantyStartDate: new Date('2024-06-01'),
        warrantyEndDate: new Date('2027-06-01'),
        operatingSystem: 'Windows 11 Pro',
        osVersion: '23H2',
        department: 'Finance & Accounts',
        floor: 'Ground Floor, Admin Wing',
        remarks: 'Budget preparation and SAP terminal',
        status: 'ASSIGNED',
        condition: 'EXCELLENT',
        currentEmployeeId: 'AAI-10512',
        currentEmployeeName: 'Priya Nair',
        currentDesignation: 'Senior Superintendent (Finance)',
        currentAssignmentDate: new Date('2024-06-02'),
        isArchived: false
      },
      {
        _id: '66d400000000000000000008',
        assetId: 'AAI-REG-PRT-2022-0008',
        assetName: 'Canon imageCLASS LBP2900B',
        category: 'Printer',
        make: 'Canon',
        model: 'LBP2900B',
        serialNumber: 'CN-2900-77182',
        installDate: new Date('2022-01-10'),
        warrantyStartDate: new Date('2022-01-10'),
        warrantyEndDate: new Date('2024-01-10'), // Expired
        operatingSystem: 'N/A',
        osVersion: '',
        department: 'Finance & Accounts',
        floor: 'Ground Floor, Admin Wing',
        remarks: 'Dedicated voucher printer',
        status: 'ASSIGNED',
        condition: 'GOOD',
        currentEmployeeId: 'AAI-10512',
        currentEmployeeName: 'Priya Nair',
        currentDesignation: 'Senior Superintendent (Finance)',
        currentAssignmentDate: new Date('2022-01-11'),
        isArchived: false
      },
      {
        _id: '66d400000000000000000009',
        assetId: 'AAI-REG-UPS-2024-0009',
        assetName: 'APC Smart-UPS 1500VA LCD',
        category: 'UPS',
        make: 'APC',
        model: 'SMT1500I',
        serialNumber: 'AS-1500-33219',
        installDate: new Date('2024-04-12'),
        warrantyStartDate: new Date('2024-04-12'),
        warrantyEndDate: new Date('2026-04-12'),
        operatingSystem: 'N/A',
        osVersion: '',
        department: 'Information Technology',
        floor: '2nd Floor, Admin Block',
        remarks: 'In IT Store pool ready for issuance',
        status: 'AVAILABLE',
        condition: 'EXCELLENT',
        currentEmployeeId: null,
        currentEmployeeName: '',
        currentDesignation: '',
        currentAssignmentDate: null,
        isArchived: false
      },
      {
        _id: '66d400000000000000000010',
        assetId: 'AAI-REG-SCN-2023-0010',
        assetName: 'HP ScanJet Pro 3000 s4 Sheet-feed',
        category: 'Scanner',
        make: 'HP',
        model: 'ScanJet Pro 3000 s4',
        serialNumber: 'HP-SCN-99120',
        installDate: new Date('2023-11-15'),
        warrantyStartDate: new Date('2023-11-15'),
        warrantyEndDate: new Date('2025-11-15'),
        operatingSystem: 'N/A',
        osVersion: '',
        department: 'Human Resources & Admin',
        floor: 'Ground Floor, Admin Wing',
        remarks: 'Under service: Paper roller feed mechanism jam',
        status: 'UNDER_MAINTENANCE',
        condition: 'FAIR',
        currentEmployeeId: null,
        currentEmployeeName: '',
        currentDesignation: '',
        currentAssignmentDate: null,
        isArchived: false
      }
    ];

    list.forEach(item => {
      memoryAssets.set(item.assetId, {
        ...item,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
  }
};

seedAssets();

export const assetRepository = {
  findPaginated: async (options = {}) => assetRepository.find(options),

  find: async ({
    search = '',
    category = '',
    status = '',
    department = '',
    floor = '',
    warrantyStatus = '',
    employeeId = '',
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    isArchived = false
  }) => {
    const skip = (Number(page) - 1) * Number(limit);

    if (mongoose.connection.readyState === 1) {
      const query = { isArchived };

      if (category) query.category = category;
      if (status) query.status = status;
      if (department) query.department = department;
      if (floor) query.floor = floor;
      if (employeeId) query.currentEmployeeId = employeeId.trim().toUpperCase();

      if (warrantyStatus) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

        if (warrantyStatus === 'EXPIRED') {
          query.warrantyEndDate = { $lt: today };
        } else if (warrantyStatus === 'EXPIRING_SOON') {
          query.warrantyEndDate = { $gte: today, $lte: thirtyDaysLater };
        } else if (warrantyStatus === 'ACTIVE') {
          query.warrantyEndDate = { $gt: thirtyDaysLater };
        }
      }

      if (search) {
        const regex = new RegExp(search, 'i');
        query.$or = [
          { assetId: regex },
          { assetName: regex },
          { serialNumber: regex },
          { make: regex },
          { model: regex },
          { currentEmployeeName: regex },
          { currentEmployeeId: regex }
        ];
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const items = await Asset.find(query).sort(sortOptions).skip(skip).limit(Number(limit));
      const total = await Asset.countDocuments(query);

      return { items, total };
    }

    // In-memory fallback
    let list = Array.from(memoryAssets.values()).filter(a => a.isArchived === isArchived);

    if (category) list = list.filter(a => a.category === category);
    if (status) list = list.filter(a => a.status === status);
    if (department) list = list.filter(a => a.department === department);
    if (floor) list = list.filter(a => a.floor === floor);
    if (employeeId) {
      const eid = employeeId.trim().toUpperCase();
      list = list.filter(a => (a.currentEmployeeId || '').toUpperCase() === eid);
    }

    if (search) {
      const s = search.toLowerCase();
      list = list.filter(a =>
        a.assetId.toLowerCase().includes(s) ||
        a.assetName.toLowerCase().includes(s) ||
        a.serialNumber.toLowerCase().includes(s) ||
        a.make.toLowerCase().includes(s) ||
        a.model.toLowerCase().includes(s) ||
        (a.currentEmployeeName && a.currentEmployeeName.toLowerCase().includes(s)) ||
        (a.currentEmployeeId && a.currentEmployeeId.toLowerCase().includes(s))
      );
    }

    if (warrantyStatus) {
      list = list.filter(a => calculateWarrantyStatus(a.warrantyEndDate) === warrantyStatus);
    }

    // Sorting
    list.sort((a, b) => {
      const valA = a[sortBy] || '';
      const valB = b[sortBy] || '';
      if (sortOrder === 'asc') {
        return valA > valB ? 1 : -1;
      }
      return valA < valB ? 1 : -1;
    });

    const total = list.length;
    const items = list.slice(skip, skip + Number(limit)).map(item => ({
      ...item,
      warrantyStatus: calculateWarrantyStatus(item.warrantyEndDate)
    }));

    return { items, total };
  },

  findById: async (id) => {
    if (mongoose.connection.readyState === 1) {
      if (mongoose.isValidObjectId(id)) {
        return Asset.findById(id);
      }
      return Asset.findOne({ assetId: id.toUpperCase() });
    }

    for (const a of memoryAssets.values()) {
      if (a._id === id || a.assetId.toUpperCase() === id.toUpperCase()) {
        return {
          ...a,
          warrantyStatus: calculateWarrantyStatus(a.warrantyEndDate)
        };
      }
    }
    return null;
  },

  findBySerialNumber: async (serialNumber) => {
    const sn = serialNumber.trim().toUpperCase();
    if (mongoose.connection.readyState === 1) {
      return Asset.findOne({ serialNumber: sn });
    }
    for (const a of memoryAssets.values()) {
      if (a.serialNumber.toUpperCase() === sn) {
        return a;
      }
    }
    return null;
  },

  create: async (data) => {
    const seq = memoryAssets.size + 1;
    const assetId = data.assetId ? data.assetId.trim().toUpperCase() : generateAssetId(data.category, seq);
    const sn = data.serialNumber.trim().toUpperCase();

    const preparedData = {
      ...data,
      assetId,
      serialNumber: sn,
      installDate: new Date(data.installDate),
      warrantyStartDate: data.warrantyStartDate ? new Date(data.warrantyStartDate) : new Date(data.installDate),
      warrantyEndDate: new Date(data.warrantyEndDate),
      isArchived: false,
      status: data.currentEmployeeId ? 'ASSIGNED' : (data.status || 'AVAILABLE')
    };

    if (mongoose.connection.readyState === 1) {
      const asset = new Asset(preparedData);
      return asset.save();
    }

    const id = new mongoose.Types.ObjectId().toString();
    const newAsset = {
      _id: id,
      ...preparedData,
      createdAt: new Date(),
      updatedAt: new Date(),
      warrantyStatus: calculateWarrantyStatus(preparedData.warrantyEndDate)
    };

    memoryAssets.set(assetId, newAsset);
    return newAsset;
  },

  update: async (id, data) => {
    if (mongoose.connection.readyState === 1) {
      if (mongoose.isValidObjectId(id)) {
        return Asset.findByIdAndUpdate(id, data, { new: true, runValidators: true });
      }
      return Asset.findOneAndUpdate({ assetId: id.toUpperCase() }, data, { new: true, runValidators: true });
    }

    let targetAsset = null;
    for (const a of memoryAssets.values()) {
      if (a._id === id || a.assetId.toUpperCase() === id.toUpperCase()) {
        targetAsset = a;
        break;
      }
    }
    if (!targetAsset) return null;

    Object.assign(targetAsset, data, { updatedAt: new Date() });
    targetAsset.warrantyStatus = calculateWarrantyStatus(targetAsset.warrantyEndDate);
    return targetAsset;
  },

  retire: async (id, reason = 'End of useful lifecycle') => {
    const updateData = {
      status: 'RETIRED',
      remarks: `${reason} (Retired on ${new Date().toISOString().split('T')[0]})`,
      currentEmployeeId: null,
      currentEmployeeName: '',
      currentDesignation: '',
      currentAssignmentDate: null
    };
    return assetRepository.update(id, updateData);
  },

  delete: async (id) => {
    // Soft archive rather than hard delete to safeguard history
    return assetRepository.update(id, { isArchived: true });
  }
};
