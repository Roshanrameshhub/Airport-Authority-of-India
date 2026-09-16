import mongoose from 'mongoose';
import Asset from '../models/Asset.js';
import { calculateWarrantyStatus } from '../utils/warranty.js';
import { generateAssetId, generateAssetIdAsync } from '../utils/idGenerator.js';
import { escapeRegex } from '../utils/regexHelper.js';

const memoryAssets = new Map();

const seedAssets = () => {
  if (memoryAssets.size === 0) {
    const list = [
      {
        _id: '66d400000000000000000001',
        assetId: 'AAI-REG-PC-2024-0001',
        assetName: 'Dell OptiPlex 7090 MT Workstation',
        assetType: 'DESKTOP',
        category: 'Desktop PC',
        make: 'Dell',
        model: 'OptiPlex 7090 MT',
        serialNumber: 'DL-7090-99481',
        oldAssetId: 'AAI-SR-IT-CPU-651',
        qrCode: 'AAI-REG-PC-2024-0001',
        barcode: 'DL-7090-99481',
        supplier: 'Sky Star Technology Pvt Ltd',
        vendor: 'Sky Star Technology Pvt Ltd',
        supplyOrderNumber: 'GEMC-511687720233481',
        purchaseDate: new Date('2024-01-05'),
        purchaseCost: 68500,
        installDate: new Date('2024-01-15'),
        warrantyStartDate: new Date('2024-01-15'),
        warrantyEndDate: new Date('2027-01-15'),
        amcApplicable: false,
        department: 'Communication, Navigation & Surveillance',
        departmentId: 'CNS',
        location: 'Chennai Airport',
        locationId: 'MAA',
        floor: '2nd Floor, Technical Block',
        room: 'CNS Radar Equipment Room 204',
        intercom: '2415',
        remarks: 'Assigned for Radar Data Processing unit',
        status: 'ASSIGNED',
        condition: 'EXCELLENT',
        currentEmployeeId: 'AAI-10842',
        currentEmployeeName: 'Roshan R',
        currentDesignation: 'Assistant Manager (CNS)',
        currentAssignmentDate: new Date('2024-01-16'),
        isArchived: false,
        computerConfig: {
          processor: 'Intel Core i7-10700',
          processorSpeed: '2.90 GHz',
          ramSizeGb: 16,
          ramType: 'DDR4',
          ramSlots: 4,
          storageType: 'NVMe SSD',
          storageCapacityGb: 512,
          storageModel: 'Kioxia 512GB NVMe PCIe',
          graphicsCard: 'Intel UHD Graphics 630',
          formFactor: 'Tower',
          operatingSystem: 'Windows 11 Enterprise',
          osVersion: '23H2 (Build 22631)',
          osArchitecture: '64-bit',
          hostname: 'AAI-CNS-PC-01'
        },
        networkConfig: {
          ipAddress: '10.20.14.101',
          macAddress: 'F8:75:A4:44:98:A1'
        }
      },
      {
        _id: '66d400000000000000000002',
        assetId: 'AAI-REG-LPT-2024-0002',
        assetName: 'Dell Latitude 5420 Laptop',
        assetType: 'LAPTOP',
        category: 'Laptop',
        make: 'Dell',
        model: 'Latitude 5420',
        serialNumber: 'DL-5420-99482',
        oldAssetId: 'AAI-SR-IT-LAP-089',
        qrCode: 'AAI-REG-LPT-2024-0002',
        barcode: 'DL-5420-99482',
        supplier: 'Usam Technology Solutions',
        vendor: 'Usam Technology Solutions',
        supplyOrderNumber: 'GEMC-511687720241092',
        purchaseDate: new Date('2024-03-01'),
        purchaseCost: 82000,
        installDate: new Date('2024-03-10'),
        warrantyStartDate: new Date('2024-03-10'),
        warrantyEndDate: new Date('2027-03-10'),
        amcApplicable: false,
        operatingSystem: 'Windows 11 Enterprise',
        osVersion: '23H2 (Build 22631)',
        ipAddress: '10.20.14.102',
        department: 'Communication, Navigation & Surveillance',
        departmentId: 'CNS',
        location: 'Chennai Airport',
        locationId: 'MAA',
        floor: '2nd Floor, Technical Block',
        room: 'CNS Office 201',
        intercom: '2418',
        remarks: 'Official laptop for CNS technical monitoring',
        status: 'ASSIGNED',
        condition: 'EXCELLENT',
        currentEmployeeId: 'AAI-10842',
        currentEmployeeName: 'Roshan R',
        currentDesignation: 'Assistant Manager (CNS)',
        currentAssignmentDate: new Date('2024-03-11'),
        isArchived: false,
        computerConfig: {
          processor: 'Intel Core i5-1145G7',
          processorSpeed: '2.60 GHz',
          ramSizeGb: 16,
          ramType: 'DDR4',
          ramSlots: 2,
          storageType: 'NVMe SSD',
          storageCapacityGb: 512,
          storageModel: 'SK Hynix 512GB NVMe',
          graphicsCard: 'Intel Iris Xe Graphics',
          formFactor: 'Laptop',
          operatingSystem: 'Windows 11 Enterprise',
          osVersion: '23H2 (Build 22631)',
          osArchitecture: '64-bit',
          hostname: 'AAI-CNS-LPT-02'
        },
        networkConfig: {
          ipAddress: '10.20.14.102',
          macAddress: 'F8:75:A4:44:98:B2'
        }
      },
      {
        _id: '66d400000000000000000003',
        assetId: 'AAI-REG-PRT-2023-0003',
        assetName: 'HP LaserJet Pro MFP M428fdn',
        assetType: 'PRINTER',
        category: 'Printer',
        make: 'HP',
        model: 'MFP M428fdn',
        serialNumber: 'VNC3K99214',
        oldAssetId: 'AAI-SR-IT-PTR-412',
        qrCode: 'AAI-REG-PRT-2023-0003',
        barcode: 'VNC3K99214',
        supplier: 'Broadline Computers',
        vendor: 'Broadline Computers',
        supplyOrderNumber: 'GEMC-511687720238120',
        purchaseDate: new Date('2023-08-01'),
        purchaseCost: 42500,
        installDate: new Date('2023-08-10'),
        warrantyStartDate: new Date('2023-08-10'),
        warrantyEndDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        amcApplicable: true,
        amcContractId: 'AMC-2024-HP-001',
        operatingSystem: 'N/A',
        osVersion: 'Firmware v2.1',
        ipAddress: '10.20.14.50',
        department: 'Communication, Navigation & Surveillance',
        departmentId: 'CNS',
        location: 'Chennai Airport',
        locationId: 'MAA',
        floor: '2nd Floor, Technical Block',
        room: 'CNS Shared Print Bay',
        intercom: '2420',
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
        assetType: 'DESKTOP',
        category: 'Desktop PC',
        make: 'HP',
        model: 'EliteDesk 800 G6',
        serialNumber: 'HP-800-44912',
        oldAssetId: 'AAI-SR-IT-CPU-510',
        qrCode: 'AAI-REG-PC-2023-0004',
        barcode: 'HP-800-44912',
        supplier: 'Sky Star Technology Pvt Ltd',
        vendor: 'Sky Star Technology Pvt Ltd',
        supplyOrderNumber: 'GEMC-511687720231908',
        purchaseDate: new Date('2023-03-25'),
        purchaseCost: 71000,
        installDate: new Date('2023-04-05'),
        warrantyStartDate: new Date('2023-04-05'),
        warrantyEndDate: new Date('2026-04-05'),
        amcApplicable: false,
        operatingSystem: 'Windows 10 Pro',
        osVersion: '22H2',
        ipAddress: '10.20.10.15',
        department: 'Information Technology',
        departmentId: 'IT',
        location: 'Chennai Airport',
        locationId: 'MAA',
        floor: '2nd Floor, Admin Block',
        room: 'IT Server Admin Cabin',
        intercom: '2100',
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
        assetType: 'MONITOR',
        category: 'Monitor',
        make: 'Dell',
        model: 'U2723QE',
        serialNumber: 'CN-0K791X-74261',
        oldAssetId: 'AAI-SR-IT-MON-510',
        qrCode: 'AAI-REG-MON-2024-0005',
        barcode: 'CN-0K791X-74261',
        supplier: 'Usam Technology Solutions',
        vendor: 'Usam Technology Solutions',
        supplyOrderNumber: 'GEMC-511687720242201',
        purchaseDate: new Date('2024-02-10'),
        purchaseCost: 38000,
        installDate: new Date('2024-02-20'),
        warrantyStartDate: new Date('2024-02-20'),
        warrantyEndDate: new Date('2027-02-20'),
        amcApplicable: false,
        operatingSystem: 'N/A',
        osVersion: '',
        department: 'Information Technology',
        departmentId: 'IT',
        location: 'Chennai Airport',
        locationId: 'MAA',
        floor: '2nd Floor, Admin Block',
        room: 'IT Server Admin Cabin',
        intercom: '2100',
        remarks: 'Dual monitor setup for IT operations',
        status: 'ASSIGNED',
        condition: 'EXCELLENT',
        currentEmployeeId: 'AAI-ADM-001',
        currentEmployeeName: 'AAI Regional Admin',
        currentDesignation: 'Senior IT Manager',
        currentAssignmentDate: new Date('2024-02-20'),
        isArchived: false,
        displayConfig: {
          screenSizeInches: 27,
          resolution: '3840x2160 (4K UHD)',
          panelType: 'IPS Black',
          ports: ['DisplayPort 1.4', 'HDMI 2.0', 'USB-C'],
          aspectRatio: '16:9'
        }
      },
      {
        _id: '66d400000000000000000006',
        assetId: 'AAI-REG-PC-2022-0006',
        assetName: 'Lenovo ThinkCentre M70s',
        assetType: 'DESKTOP',
        category: 'Desktop PC',
        make: 'Lenovo',
        model: 'ThinkCentre M70s Gen 3',
        serialNumber: 'LN-M70S-11029',
        oldAssetId: 'AAI-SR-IT-CPU-330',
        qrCode: 'AAI-REG-PC-2022-0006',
        barcode: 'LN-M70S-11029',
        supplier: 'Sky Star Technology Pvt Ltd',
        vendor: 'Sky Star Technology Pvt Ltd',
        supplyOrderNumber: 'GEMC-511687720220811',
        purchaseDate: new Date('2022-05-01'),
        purchaseCost: 62000,
        installDate: new Date('2022-05-15'),
        warrantyStartDate: new Date('2022-05-15'),
        warrantyEndDate: new Date('2025-05-15'),
        amcApplicable: true,
        amcContractId: 'AMC-2025-LNV-002',
        operatingSystem: 'Windows 10 Pro',
        osVersion: '21H2',
        ipAddress: '10.20.12.44',
        department: 'Air Traffic Management',
        departmentId: 'ATM',
        location: 'Chennai Airport',
        locationId: 'MAA',
        floor: '3rd Floor, ATC Tower',
        room: 'ATC Tower Watch Room',
        intercom: '3310',
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
        assetType: 'LAPTOP',
        category: 'Laptop',
        make: 'Lenovo',
        model: 'ThinkPad T14 Gen 4',
        serialNumber: 'LN-T14-55821',
        oldAssetId: 'AAI-SR-IT-LAP-102',
        qrCode: 'AAI-REG-LPT-2024-0007',
        barcode: 'LN-T14-55821',
        supplier: 'Usam Technology Solutions',
        vendor: 'Usam Technology Solutions',
        supplyOrderNumber: 'GEMC-511687720243109',
        purchaseDate: new Date('2024-05-20'),
        purchaseCost: 94000,
        installDate: new Date('2024-06-01'),
        warrantyStartDate: new Date('2024-06-01'),
        warrantyEndDate: new Date('2027-06-01'),
        amcApplicable: false,
        operatingSystem: 'Windows 11 Pro',
        osVersion: '23H2',
        ipAddress: '10.20.18.22',
        department: 'Finance & Accounts',
        departmentId: 'FIN',
        location: 'Chennai Airport',
        locationId: 'MAA',
        floor: 'Ground Floor, Admin Wing',
        room: 'Accounts & Finance Room 12',
        intercom: '1120',
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
        assetType: 'PRINTER',
        category: 'Printer',
        make: 'Canon',
        model: 'LBP2900B',
        serialNumber: 'CN-2900-77182',
        oldAssetId: 'AAI-SR-IT-PTR-118',
        qrCode: 'AAI-REG-PRT-2022-0008',
        barcode: 'CN-2900-77182',
        supplier: 'Broadline Computers',
        vendor: 'Broadline Computers',
        supplyOrderNumber: 'GEMC-511687720220199',
        purchaseDate: new Date('2022-01-02'),
        purchaseCost: 14500,
        installDate: new Date('2022-01-10'),
        warrantyStartDate: new Date('2022-01-10'),
        warrantyEndDate: new Date('2024-01-10'),
        amcApplicable: true,
        amcContractId: 'AMC-2024-CAN-003',
        operatingSystem: 'N/A',
        osVersion: '',
        department: 'Finance & Accounts',
        departmentId: 'FIN',
        location: 'Chennai Airport',
        locationId: 'MAA',
        floor: 'Ground Floor, Admin Wing',
        room: 'Accounts & Finance Room 12',
        intercom: '1120',
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
        assetType: 'UPS',
        category: 'UPS',
        make: 'APC',
        model: 'SMT1500I',
        serialNumber: 'AS-1500-33219',
        oldAssetId: 'AAI-SR-IT-UPS-651',
        qrCode: 'AAI-REG-UPS-2024-0009',
        barcode: 'AS-1500-33219',
        supplier: 'Sky Star Technology Pvt Ltd',
        vendor: 'Sky Star Technology Pvt Ltd',
        supplyOrderNumber: 'GEMC-511687720240901',
        purchaseDate: new Date('2024-04-01'),
        purchaseCost: 29000,
        installDate: new Date('2024-04-12'),
        warrantyStartDate: new Date('2024-04-12'),
        warrantyEndDate: new Date('2026-04-12'),
        amcApplicable: false,
        operatingSystem: 'N/A',
        osVersion: '',
        department: 'Information Technology',
        departmentId: 'IT',
        location: 'Chennai Airport',
        locationId: 'MAA',
        floor: '2nd Floor, Admin Block',
        room: 'IT Store Godown',
        intercom: '2105',
        remarks: 'In IT Store pool ready for issuance',
        status: 'AVAILABLE',
        condition: 'EXCELLENT',
        currentEmployeeId: null,
        currentEmployeeName: '',
        currentDesignation: '',
        currentAssignmentDate: null,
        isArchived: false,
        powerConfig: {
          capacityVa: 1500,
          capacityWatts: 1000,
          topology: 'Line-Interactive',
          batteryType: 'VRLA / SMF',
          batteryQuantity: 2,
          estimatedBackupMinutes: 25,
          lastBatteryReplacementDate: new Date('2024-04-12')
        }
      },
      {
        _id: '66d400000000000000000010',
        assetId: 'AAI-REG-SCN-2023-0010',
        assetName: 'HP ScanJet Pro 3000 s4 Sheet-feed',
        assetType: 'SCANNER',
        category: 'Scanner',
        make: 'HP',
        model: 'ScanJet Pro 3000 s4',
        serialNumber: 'HP-SCN-99120',
        oldAssetId: 'AAI-SR-IT-SCR-055',
        qrCode: 'AAI-REG-SCN-2023-0010',
        barcode: 'HP-SCN-99120',
        supplier: 'Broadline Computers',
        vendor: 'Broadline Computers',
        supplyOrderNumber: 'GEMC-511687720237701',
        purchaseDate: new Date('2023-11-01'),
        purchaseCost: 31000,
        installDate: new Date('2023-11-15'),
        warrantyStartDate: new Date('2023-11-15'),
        warrantyEndDate: new Date('2025-11-15'),
        amcApplicable: true,
        amcContractId: 'AMC-2024-HP-001',
        operatingSystem: 'N/A',
        osVersion: '',
        department: 'Human Resources & Admin',
        departmentId: 'HR',
        location: 'Chennai Airport',
        locationId: 'MAA',
        floor: 'Ground Floor, Admin Wing',
        room: 'HR Records Room 05',
        intercom: '1050',
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

export const mapCategoryToAssetType = (category = '') => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('desktop') || cat.includes('pc') || cat.includes('workstation')) return 'DESKTOP';
  if (cat.includes('laptop') || cat.includes('notebook')) return 'LAPTOP';
  if (cat.includes('printer')) return 'PRINTER';
  if (cat.includes('scanner')) return 'SCANNER';
  if (cat.includes('ups') || cat.includes('power')) return 'UPS';
  if (cat.includes('monitor') || cat.includes('display')) return 'MONITOR';
  if (cat.includes('server')) return 'SERVER';
  if (cat.includes('switch') || cat.includes('router') || cat.includes('firewall') || cat.includes('network')) return 'NETWORK';
  if (cat.includes('projector')) return 'PROJECTOR';
  if (cat.includes('storage') || cat.includes('nas') || cat.includes('san') || cat.includes('hdd')) return 'STORAGE';
  if (cat.includes('keyboard') || cat.includes('mouse') || cat.includes('peripheral')) return 'PERIPHERAL';
  return 'OTHER';
};

export const assetRepository = {
  findPaginated: async (options = {}) => assetRepository.find(options),

  find: async ({
    search = '',
    category = '',
    assetType = '',
    status = '',
    condition = '',
    department = '',
    floor = '',
    room = '',
    supplier = '',
    operatingSystem = '',
    ipAddress = '',
    amcApplicable = '',
    amcContractId = '',
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
      if (assetType) query.assetType = assetType.toUpperCase();
      if (status) query.status = status;
      if (condition) query.condition = condition;
      if (department) query.department = department;
      if (floor) query.floor = floor;
      if (room) query.room = room;
      if (supplier) query.supplier = supplier;
      if (operatingSystem) {
        query['computerConfig.operatingSystem'] = new RegExp(escapeRegex(operatingSystem), 'i');
      }
      if (ipAddress) {
        query.$or = query.$or || [];
        const ipRegex = new RegExp(escapeRegex(ipAddress), 'i');
        query.$or.push(
          { 'computerConfig.ipAddress': ipRegex },
          { 'networkConfig.ipAddress': ipRegex }
        );
      }
      if (typeof amcApplicable === 'boolean' || amcApplicable === 'true' || amcApplicable === 'false') {
        query.amcApplicable = amcApplicable === true || amcApplicable === 'true';
      }
      if (amcContractId) query.amcContractId = amcContractId.trim();
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
        const regex = new RegExp(escapeRegex(search), 'i');
        query.$or = [
          { assetId: regex },
          { assetName: regex },
          { serialNumber: regex },
          { make: regex },
          { model: regex },
          { oldAssetId: regex },
          { supplier: regex },
          { supplyOrderNumber: regex },
          { room: regex },
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
    if (assetType) {
      const at = assetType.toUpperCase();
      list = list.filter(a => (a.assetType || mapCategoryToAssetType(a.category)) === at);
    }
    if (status) list = list.filter(a => a.status === status);
    if (condition) list = list.filter(a => a.condition === condition);
    if (department) list = list.filter(a => a.department === department);
    if (floor) list = list.filter(a => a.floor === floor);
    if (room) list = list.filter(a => (a.room || '').toLowerCase().includes(room.toLowerCase()));
    if (supplier) list = list.filter(a => (a.supplier || '').toLowerCase().includes(supplier.toLowerCase()));
    if (operatingSystem) {
      const os = operatingSystem.toLowerCase();
      list = list.filter(a => (a.computerConfig?.operatingSystem || '').toLowerCase().includes(os));
    }
    if (ipAddress) {
      const ip = ipAddress.toLowerCase();
      list = list.filter(a => 
        (a.computerConfig?.ipAddress || '').toLowerCase().includes(ip) || 
        (a.networkConfig?.ipAddress || '').toLowerCase().includes(ip)
      );
    }
    if (typeof amcApplicable === 'boolean' || amcApplicable === 'true' || amcApplicable === 'false') {
      const boolVal = amcApplicable === true || amcApplicable === 'true';
      list = list.filter(a => a.amcApplicable === boolVal);
    }
    if (amcContractId) {
      list = list.filter(a => (a.amcContractId || '').toUpperCase() === amcContractId.trim().toUpperCase());
    }
    if (employeeId) {
      const eid = employeeId.trim().toUpperCase();
      list = list.filter(a => (a.currentEmployeeId || '').toUpperCase() === eid);
    }

    if (search) {
      const s = search.toLowerCase();
      list = list.filter(a =>
        (a.assetId && a.assetId.toLowerCase().includes(s)) ||
        (a.assetName && a.assetName.toLowerCase().includes(s)) ||
        (a.serialNumber && a.serialNumber.toLowerCase().includes(s)) ||
        (a.make && a.make.toLowerCase().includes(s)) ||
        (a.model && a.model.toLowerCase().includes(s)) ||
        (a.oldAssetId && a.oldAssetId.toLowerCase().includes(s)) ||
        (a.supplier && a.supplier.toLowerCase().includes(s)) ||
        (a.supplyOrderNumber && a.supplyOrderNumber.toLowerCase().includes(s)) ||
        (a.room && a.room.toLowerCase().includes(s)) ||
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
      assetType: item.assetType || mapCategoryToAssetType(item.category),
      warrantyStatus: calculateWarrantyStatus(item.warrantyEndDate),
      assignedTo: item.currentEmployeeId ? {
        employeeId: item.currentEmployeeId,
        name: item.currentEmployeeName,
        designation: item.currentDesignation,
        assignedDate: item.currentAssignmentDate
      } : null
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
          assetType: a.assetType || mapCategoryToAssetType(a.category),
          warrantyStatus: calculateWarrantyStatus(a.warrantyEndDate),
          assignedTo: a.currentEmployeeId ? {
            employeeId: a.currentEmployeeId,
            name: a.currentEmployeeName,
            designation: a.currentDesignation,
            assignedDate: a.currentAssignmentDate
          } : null
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
        return {
          ...a,
          assetType: a.assetType || mapCategoryToAssetType(a.category),
          warrantyStatus: calculateWarrantyStatus(a.warrantyEndDate)
        };
      }
    }
    return null;
  },

  create: async (data) => {
    const assetId = data.assetId ? data.assetId.trim().toUpperCase() : await generateAssetIdAsync(data.category);
    const sn = data.serialNumber.trim().toUpperCase();
    const assetType = data.assetType ? data.assetType.toUpperCase() : mapCategoryToAssetType(data.category);

    const preparedData = {
      ...data,
      assetId,
      assetType,
      serialNumber: sn,
      installDate: new Date(data.installDate),
      warrantyStartDate: data.warrantyStartDate ? new Date(data.warrantyStartDate) : new Date(data.installDate),
      warrantyEndDate: new Date(data.warrantyEndDate),
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      amcEndDate: data.amcEndDate ? new Date(data.amcEndDate) : null,
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
      warrantyStatus: calculateWarrantyStatus(preparedData.warrantyEndDate),
      assignedTo: preparedData.currentEmployeeId ? {
        employeeId: preparedData.currentEmployeeId,
        name: preparedData.currentEmployeeName || '',
        designation: preparedData.currentDesignation || '',
        assignedDate: preparedData.currentAssignmentDate || null
      } : null
    };

    memoryAssets.set(assetId, newAsset);
    return newAsset;
  },

  update: async (id, data, options = {}) => {
    if (mongoose.connection.readyState === 1) {
      const updateOpts = { new: true, runValidators: true };
      if (options && options.session) updateOpts.session = options.session;
      if (mongoose.isValidObjectId(id)) {
        return Asset.findByIdAndUpdate(id, data, updateOpts);
      }
      return Asset.findOneAndUpdate({ assetId: id.toUpperCase() }, data, updateOpts);
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
