import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import Asset from '../models/Asset.js';
import AssetAssignment from '../models/AssetAssignment.js';
import Department from '../models/Department.js';
import Category from '../models/Category.js';
import Complaint from '../models/Complaint.js';
import Make from '../models/Make.js';
import Model from '../models/Model.js';
import Technology from '../models/Technology.js';
import { seedCoreFields } from './excelFieldService.js';
import { logger } from '../utils/logger.js';

// ─── DEMO CREDENTIALS ────────────────────────────────────────────────────────
// ADMIN    : Username = Admin      | Password = Admin@123
// EMPLOYEE : Username = Employee01 | Password = Employee@123
//
// IMPORTANT — User model schema note:
//   The `username` field has { lowercase: true } in the Mongoose schema, so
//   "Admin" is stored as "admin" and "Employee01" is stored as "employee01".
//   findByCredential() also lowercases the input before querying, so login
//   works with any casing: "Admin", "ADMIN", "admin" all succeed.
// ─────────────────────────────────────────────────────────────────────────────

export const seedDemoAccounts = async () => {
  try {
    logger.info('[Demo Seeder] Starting AAI-AMS development/demo account seeding...');

    // ─── 0. Seed Core 13 Locked Excel Fields ─────────────────────────────────
    await seedCoreFields();

    // ─── 1. Core Master Departments ──────────────────────────────────────────
    const departments = [
      { name: 'Communication, Navigation & Surveillance', code: 'CNS', floor: '2nd Floor, Technical Block', description: 'Radar, VHF communications, navigational aids' },
      { name: 'Airport Systems & Information Technology', code: 'IT', floor: '1st Floor, Technical Block', description: 'Central enterprise IT infrastructure & servers' },
      { name: 'Air Traffic Management', code: 'ATM', floor: 'ATC Tower, Top Cab', description: 'En-route, approach, and aerodrome control operations' },
      { name: 'Terminal Management & Operations', code: 'TMO', floor: '1st Floor, Terminal Building', description: 'Passenger facilitation, FIDS, and aerobridge systems' },
      { name: 'Finance & Accounts', code: 'FIN', floor: 'Ground Floor, Admin Wing', description: 'Regional budgeting, payroll, and auditing' },
      { name: 'Human Resources & Administration', code: 'HRA', floor: 'Ground Floor, Admin Wing', description: 'Personnel, welfare, and general administration' }
    ];
    for (const dept of departments) {
      await Department.findOneAndUpdate({ code: dept.code }, { $set: dept }, { upsert: true, new: true });
    }

    // ─── 2. Core Master Categories ───────────────────────────────────────────
    const categories = [
      { name: 'Desktop PC', code: 'PC', description: 'High-performance workstations and office client PCs' },
      { name: 'Laptop', code: 'LAP', description: 'Executive and mobile operational laptops' },
      { name: 'Printer', code: 'PRN', description: 'Heavy-duty network laser and multi-function printers' },
      { name: 'Scanner', code: 'SCN', description: 'Sheet-fed scanners for voucher and invoice digitisation' },
      { name: 'Online UPS', code: 'UPS', description: 'Uninterruptible power supplies for ATC, radar, and servers' },
      { name: 'Network Switch', code: 'NET', description: 'Managed switches, Cisco routers, and airport LAN hardware' }
    ];
    for (const cat of categories) {
      await Category.findOneAndUpdate({ code: cat.code }, { $set: cat }, { upsert: true, new: true });
    }

    // ─── 2a. Core Master Makes (Brands) ──────────────────────────────────────
    const makes = [
      { name: 'Dell', code: 'DELL', categories: ['IT Equipment'], assetTypes: ['DESKTOP', 'LAPTOP', 'WORKSTATION', 'SERVER', 'MONITOR'], description: 'Dell Technologies Inc. - Enterprise computing and displays', website: 'https://www.dell.com' },
      { name: 'HP', code: 'HP', categories: ['IT Equipment', 'Printing'], assetTypes: ['DESKTOP', 'LAPTOP', 'WORKSTATION', 'SERVER', 'PRINTER', 'SCANNER', 'MULTIFUNCTION_PRINTER'], description: 'HP Inc. - PCs, workstations, and enterprise printers', website: 'https://www.hp.com' },
      { name: 'Lenovo', code: 'LENOVO', categories: ['IT Equipment'], assetTypes: ['DESKTOP', 'LAPTOP', 'WORKSTATION', 'SERVER', 'MONITOR'], description: 'Lenovo Group Ltd. - ThinkPad laptops, ThinkCentre desktops, servers', website: 'https://www.lenovo.com' },
      { name: 'Apple', code: 'APPLE', categories: ['IT Equipment'], assetTypes: ['LAPTOP', 'DESKTOP'], description: 'Apple Inc. - MacBook Pro, MacBook Air, iMac workstations', website: 'https://www.apple.com' },
      { name: 'APC', code: 'APC', categories: ['Power'], assetTypes: ['UPS', 'STABILIZER', 'PDU'], description: 'Schneider Electric APC - Smart-UPS, Back-UPS power protection', website: 'https://www.apc.com' },
      { name: 'Microtek', code: 'MICROTEK', categories: ['Power'], assetTypes: ['UPS', 'STABILIZER', 'BATTERY_BANK'], description: 'Microtek International - Power backup systems', website: 'https://www.microtek.com' },
      { name: 'LG', code: 'LG', categories: ['IT Equipment'], assetTypes: ['MONITOR'], description: 'LG Electronics - Commercial and desktop displays', website: 'https://www.lg.com' },
      { name: 'Samsung', code: 'SAMSUNG', categories: ['IT Equipment'], assetTypes: ['MONITOR', 'STORAGE'], description: 'Samsung Electronics - Monitors, displays, and NVMe SSDs', website: 'https://www.samsung.com' },
      { name: 'Logitech', code: 'LOGITECH', categories: ['Office Equipment', 'IT Equipment'], assetTypes: ['PERIPHERAL'], description: 'Logitech - Keyboards, mice, webcams, presentation remotes', website: 'https://www.logitech.com' },
      { name: 'Canon', code: 'CANON', categories: ['Printing'], assetTypes: ['PRINTER', 'SCANNER', 'MULTIFUNCTION_PRINTER'], description: 'Canon India - Enterprise document printers and flatbed scanners', website: 'https://www.canon.co.in' },
      { name: 'Epson', code: 'EPSON', categories: ['Printing', 'Office Equipment'], assetTypes: ['PRINTER', 'SCANNER', 'PROJECTOR'], description: 'Epson India - InkTank printers, high-speed document scanners, projectors', website: 'https://www.epson.co.in' },
      { name: 'Cisco', code: 'CISCO', categories: ['Networking', 'Communication'], assetTypes: ['NETWORK', 'SWITCH', 'ROUTER', 'FIREWALL', 'ACCESS_POINT', 'TELEPHONE'], description: 'Cisco Systems - Enterprise network switches, routers, and VoIP phones', website: 'https://www.cisco.com' },
      { name: 'D-Link', code: 'DLINK', categories: ['Networking'], assetTypes: ['NETWORK', 'SWITCH', 'ROUTER', 'ACCESS_POINT', 'MODEM'], description: 'D-Link - Unmanaged and smart-managed networking switches', website: 'https://www.dlink.co.in' },
      { name: 'Seagate', code: 'SEAGATE', categories: ['IT Equipment'], assetTypes: ['STORAGE'], description: 'Seagate Technology - Enterprise hard drives and storage arrays', website: 'https://www.seagate.com' },
      { name: 'Western Digital', code: 'WD', categories: ['IT Equipment'], assetTypes: ['STORAGE'], description: 'Western Digital / SanDisk - Internal and external storage drives', website: 'https://www.westerndigital.com' }
    ];
    for (const make of makes) {
      await Make.findOneAndUpdate({ name: make.name }, { $set: make }, { upsert: true, new: true });
    }

    // ─── 2b. Core Master Technologies ────────────────────────────────────────
    const technologies = [
      { name: 'IPS', category: 'IT Equipment', assetTypes: ['MONITOR'], description: 'In-Plane Switching display panel technology' },
      { name: 'LED', category: 'IT Equipment', assetTypes: ['MONITOR'], description: 'Light Emitting Diode backlit display' },
      { name: 'OLED', category: 'IT Equipment', assetTypes: ['MONITOR'], description: 'Organic Light Emitting Diode display' },
      { name: 'VA', category: 'IT Equipment', assetTypes: ['MONITOR'], description: 'Vertical Alignment display panel technology' },
      { name: 'Liquid Retina XDR', category: 'IT Equipment', assetTypes: ['LAPTOP', 'MONITOR'], description: 'High dynamic range mini-LED display' },
      { name: 'Laser', category: 'Printing', assetTypes: ['PRINTER', 'MULTIFUNCTION_PRINTER'], description: 'Electrophotographic laser beam printing' },
      { name: 'Inkjet', category: 'Printing', assetTypes: ['PRINTER', 'MULTIFUNCTION_PRINTER', 'PLOTTER'], description: 'Piezoelectric or thermal ink droplet printing' },
      { name: 'Dot Matrix', category: 'Printing', assetTypes: ['PRINTER'], description: 'Impact serial matrix printing for continuous stationery' },
      { name: 'Thermal', category: 'Printing', assetTypes: ['PRINTER'], description: 'Direct thermal or thermal transfer sticker/receipt printing' },
      { name: 'Sheetfed', category: 'Printing', assetTypes: ['SCANNER'], description: 'Automatic document feeder scanner' },
      { name: 'Line-Interactive', category: 'Power', assetTypes: ['UPS', 'STABILIZER'], description: 'Voltage regulating transformer line-interactive backup' },
      { name: 'Online Double-Conversion', category: 'Power', assetTypes: ['UPS'], description: 'Zero transfer time true online double-conversion power system' },
      { name: 'Offline / Standby', category: 'Power', assetTypes: ['UPS'], description: 'Standard passive standby power backup' },
      { name: 'NVMe SSD', category: 'IT Equipment', assetTypes: ['STORAGE', 'DESKTOP', 'LAPTOP', 'SERVER'], description: 'Non-Volatile Memory Express PCIe solid state storage' },
      { name: 'SATA SSD', category: 'IT Equipment', assetTypes: ['STORAGE', 'DESKTOP', 'LAPTOP', 'SERVER'], description: 'Serial ATA solid state storage drive' },
      { name: 'HDD', category: 'IT Equipment', assetTypes: ['STORAGE', 'DESKTOP', 'LAPTOP', 'SERVER'], description: 'Mechanical magnetic hard disk drive (7200/5400 RPM)' },
      { name: 'Managed L2', category: 'Networking', assetTypes: ['NETWORK', 'SWITCH'], description: 'Layer 2 Managed Ethernet Switch with VLAN support' },
      { name: 'Managed L3', category: 'Networking', assetTypes: ['NETWORK', 'SWITCH', 'ROUTER'], description: 'Layer 3 Routing Ethernet Switch' },
      { name: 'Unmanaged', category: 'Networking', assetTypes: ['NETWORK', 'SWITCH'], description: 'Plug-and-play unmanaged network switch' },
      { name: 'PoE+', category: 'Networking', assetTypes: ['NETWORK', 'SWITCH'], description: 'Power over Ethernet Plus (802.3at) switch' }
    ];
    for (const tech of technologies) {
      await Technology.findOneAndUpdate({ name: tech.name, category: tech.category }, { $set: tech }, { upsert: true, new: true });
    }

    // ─── 2c. Core Master Models ──────────────────────────────────────────────
    const models = [
      { name: 'OptiPlex 7090 MT', make: 'Dell', category: 'IT Equipment', assetType: 'DESKTOP', description: 'Mid-Tower Commercial Workstation' },
      { name: 'OptiPlex 7000', make: 'Dell', category: 'IT Equipment', assetType: 'DESKTOP', description: 'Small Form Factor Desktop' },
      { name: 'Latitude 5420', make: 'Dell', category: 'IT Equipment', assetType: 'LAPTOP', description: '14-inch Business Laptop' },
      { name: 'Latitude 5430', make: 'Dell', category: 'IT Equipment', assetType: 'LAPTOP', description: '14-inch Operational Ruggedized Laptop' },
      { name: 'PowerEdge R750', make: 'Dell', category: 'IT Equipment', assetType: 'SERVER', description: '2U Dual-Socket Rack Server' },
      { name: 'UltraSharp U2422H', make: 'Dell', category: 'IT Equipment', assetType: 'MONITOR', technology: 'IPS', description: '24-inch FHD IPS Display' },
      { name: 'ProDesk 600', make: 'HP', category: 'IT Equipment', assetType: 'DESKTOP', description: 'Microtower Commercial Desktop' },
      { name: 'EliteDesk 805', make: 'HP', category: 'IT Equipment', assetType: 'DESKTOP', description: 'High-Performance Workstation Tower' },
      { name: 'ProBook 450', make: 'HP', category: 'IT Equipment', assetType: 'LAPTOP', description: '15.6-inch Business Notebook' },
      { name: 'LaserJet Pro MFP 4104', make: 'HP', category: 'Printing', assetType: 'MULTIFUNCTION_PRINTER', technology: 'Laser', description: 'Network Monochrome All-in-One Laser Printer' },
      { name: 'ScanJet Pro 3000', make: 'HP', category: 'Printing', assetType: 'SCANNER', technology: 'Sheetfed', description: 'High-Speed Sheetfed Scanner' },
      { name: 'ThinkPad T14', make: 'Lenovo', category: 'IT Equipment', assetType: 'LAPTOP', description: 'Enterprise 14-inch Executive Laptop' },
      { name: 'ThinkPad T14s', make: 'Lenovo', category: 'IT Equipment', assetType: 'LAPTOP', description: 'Ultrabook Slim Operational Laptop' },
      { name: 'ThinkCentre M70q', make: 'Lenovo', category: 'IT Equipment', assetType: 'DESKTOP', description: 'Tiny 1L Form Factor Workstation' },
      { name: 'MacBook Pro 16', make: 'Apple', category: 'IT Equipment', assetType: 'LAPTOP', technology: 'Liquid Retina XDR', description: 'Apple Silicon High-Performance Laptop' },
      { name: 'MacBook Air M2', make: 'Apple', category: 'IT Equipment', assetType: 'LAPTOP', description: 'Portable Executive Laptop' },
      { name: 'Back-UPS 600VA', make: 'APC', category: 'Power', assetType: 'UPS', technology: 'Line-Interactive', description: '600VA Line-Interactive Desktop UPS' },
      { name: 'Smart-UPS 1500VA', make: 'APC', category: 'Power', assetType: 'UPS', technology: 'Line-Interactive', description: '1500VA Server-Grade Line-Interactive UPS' },
      { name: 'Smart-UPS 2200VA', make: 'APC', category: 'Power', assetType: 'UPS', technology: 'Online Double-Conversion', description: '2200VA Rackmount Online Power Backup' },
      { name: '24MP400', make: 'LG', category: 'IT Equipment', assetType: 'MONITOR', technology: 'IPS', description: '24-inch Full HD IPS Display' },
      { name: 'K120', make: 'Logitech', category: 'Office Equipment', assetType: 'PERIPHERAL', description: 'USB Standard Wired Keyboard' },
      { name: 'B100', make: 'Logitech', category: 'Office Equipment', assetType: 'PERIPHERAL', description: 'USB Optical Wired Mouse' },
      { name: 'Catalyst 2960', make: 'Cisco', category: 'Networking', assetType: 'SWITCH', technology: 'Managed L2', description: '24-Port 10/100/1000 Managed Switch' },
      { name: 'Catalyst 9200', make: 'Cisco', category: 'Networking', assetType: 'SWITCH', technology: 'Managed L3', description: 'Enterprise L3 Gigabit Switch with PoE+' }
    ];
    for (const model of models) {
      await Model.findOneAndUpdate(
        { make: model.make, name: model.name, assetType: model.assetType },
        { $set: model },
        { upsert: true, new: true }
      );
    }
    logger.info(`[Demo Seeder] Master data seeded: ${makes.length} Makes, ${technologies.length} Technologies, ${models.length} Models`);

    // ─── 3. Employee Master Record: AAI-EMP-01 (for Employee01 user) ─────────
    const demoEmployee01Data = {
      employeeId: 'AAI-EMP-01',
      name: 'Demo Employee',
      designation: 'Junior Executive (IT)',
      department: 'Airport Systems & Information Technology',
      floor: '1st Floor, Technical Block',
      email: 'employee01@aai.local',
      phone: '+91 98765 00001',
      isActive: true,
      assignedAssetsCount: 0
    };
    const seededEmployee01Master = await Employee.findOneAndUpdate(
      { employeeId: 'AAI-EMP-01' },
      { $set: demoEmployee01Data },
      { upsert: true, new: true }
    );
    logger.info(`[Demo Seeder] Employee master record AAI-EMP-01 ensured: ${seededEmployee01Master.name}`);

    // ─── 4. Legacy Employee Master: AAI-10842 (backward compatibility) ───────
    const legacyEmployeeData = {
      employeeId: 'AAI-10842',
      name: 'Staff Employee',
      designation: 'Assistant Manager (CNS)',
      department: 'Communication, Navigation & Surveillance',
      floor: '2nd Floor, Technical Block',
      email: 'employee@aai.local',
      phone: '+91 98765 43210',
      isActive: true,
      assignedAssetsCount: 1
    };
    await Employee.findOneAndUpdate(
      { employeeId: 'AAI-10842' },
      { $set: legacyEmployeeData },
      { upsert: true, new: true }
    );

    // ─── 5. ADMIN USER ACCOUNT ────────────────────────────────────────────────
    //   Requested username : Admin      (stored as "admin" by Mongoose lowercase)
    //   Requested password : Admin@123  (bcrypt-hashed, never stored plaintext)
    //   Role               : ADMIN
    const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
    const adminUserData = {
      username: 'admin',               // Mongoose lowercase: stored as "admin"
      name: 'System Administrator',
      email: 'admin@aai.local',
      password: adminPasswordHash,     // bcrypt hash of "Admin@123"
      role: 'ADMIN',
      employeeId: 'AAI-ADMIN-001',
      designation: 'Joint General Manager (IT)',
      department: 'Airport Systems & Information Technology',
      isActive: true
    };
    const seededAdmin = await User.findOneAndUpdate(
      { $or: [{ username: 'admin' }, { email: 'admin@aai.local' }] },
      { $set: adminUserData },
      { upsert: true, new: true }
    );
    logger.info(`[Demo Seeder] ADMIN account seeded: username='${seededAdmin.username}' | role='${seededAdmin.role}' | isActive=${seededAdmin.isActive}`);

    // ─── 6. EMPLOYEE USER ACCOUNT ─────────────────────────────────────────────
    //   Requested username : Employee01   (stored as "employee01" by Mongoose lowercase)
    //   Requested password : Employee@123 (bcrypt-hashed, never stored plaintext)
    //   Role               : EMPLOYEE
    //   Employee ID        : AAI-EMP-01   (linked to Employee master created above)
    const employeePasswordHash = await bcrypt.hash('Employee@123', 10);
    const employee01UserData = {
      username: 'employee01',          // Mongoose lowercase: stored as "employee01"
      name: 'Demo Employee',
      email: 'employee01@aai.local',
      password: employeePasswordHash,  // bcrypt hash of "Employee@123"
      role: 'EMPLOYEE',
      employeeId: 'AAI-EMP-01',
      designation: 'Junior Executive (IT)',
      department: 'Airport Systems & Information Technology',
      isActive: true
    };
    const seededEmployee01User = await User.findOneAndUpdate(
      { $or: [{ username: 'employee01' }, { email: 'employee01@aai.local' }] },
      { $set: employee01UserData },
      { upsert: true, new: true }
    );
    logger.info(`[Demo Seeder] EMPLOYEE account seeded: username='${seededEmployee01User.username}' | role='${seededEmployee01User.role}' | employeeId='${seededEmployee01User.employeeId}' | isActive=${seededEmployee01User.isActive}`);

    // ─── 7. Demo Asset (assigned to legacy AAI-10842) ────────────────────────
    const demoAssetData = {
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
      remarks: 'Primary operational workstation assigned to CNS staff for radar telemetry',
      status: 'ASSIGNED',
      condition: 'EXCELLENT',
      currentEmployeeId: 'AAI-10842',
      currentEmployeeName: 'Staff Employee',
      currentDesignation: 'Assistant Manager (CNS)',
      currentAssignmentDate: new Date('2024-01-16'),
      isArchived: false
    };
    const seededAsset = await Asset.findOneAndUpdate(
      { assetId: 'AAI-REG-PC-2024-0001' },
      { $set: demoAssetData },
      { upsert: true, new: true }
    );
    logger.info(`[Demo Seeder] Demo asset ensured: ${seededAsset.assetName} (${seededAsset.assetId})`);

    // ─── 8. Demo Assignment History ──────────────────────────────────────────
    await AssetAssignment.findOneAndUpdate(
      { assignmentId: 'ASN-2024-0001' },
      {
        $set: {
          assignmentId: 'ASN-2024-0001',
          assetId: 'AAI-REG-PC-2024-0001',
          assetName: 'Dell OptiPlex 7090 MT Workstation',
          employeeId: 'AAI-10842',
          employeeName: 'Staff Employee',
          department: 'Communication, Navigation & Surveillance',
          floor: '2nd Floor, Technical Block',
          designation: 'Assistant Manager (CNS)',
          assignedDate: new Date('2024-01-16'),
          status: 'ACTIVE',
          remarks: 'Initial official allocation for CNS radar monitoring duties'
        }
      },
      { upsert: true, new: true }
    );

    // ─── 9. Sample Complaint Ticket ──────────────────────────────────────────
    await Complaint.findOneAndUpdate(
      { ticketId: 'TKT-2024-0001' },
      {
        $set: {
          ticketId: 'TKT-2024-0001',
          assetId: 'AAI-REG-PC-2024-0001',
          assetName: 'Dell OptiPlex 7090 MT Workstation',
          category: 'HARDWARE_FAULT',
          title: 'Display port flickering on dual monitor setup',
          description: 'Secondary display flickers intermittently during radar monitoring session.',
          severity: 'LOW',
          priority: 'P4_LOW',
          status: 'OPEN',
          reportedBy: { employeeId: 'AAI-10842', name: 'Staff Employee', email: 'employee@aai.local' },
          department: 'Communication, Navigation & Surveillance',
          floor: '2nd Floor, Technical Block',
          createdAt: new Date('2024-06-10')
        }
      },
      { upsert: true, new: true }
    );

    logger.info('================================================================================');
    logger.info('✔ AAI-AMS DEMO SEED COMPLETE');
    logger.info('  ADMIN account verified/seeded (Role: ADMIN)');
    logger.info('  EMPLOYEE account verified/seeded (Role: EMPLOYEE, EmpID: AAI-EMP-01)');
    logger.info('  Usernames stored lowercase in DB: admin / employee01');
    logger.info('================================================================================');

    return { admin: seededAdmin, employee: seededEmployee01User, asset: seededAsset };
  } catch (err) {
    logger.error(`[Demo Seeder] Error: ${err.message}`, err);
    throw err;
  }
};
