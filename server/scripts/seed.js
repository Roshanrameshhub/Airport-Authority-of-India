import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/User.js';
import Department from '../src/models/Department.js';
import Category from '../src/models/Category.js';
import Employee from '../src/models/Employee.js';
import Asset from '../src/models/Asset.js';
import AssetAssignment from '../src/models/AssetAssignment.js';
import Complaint from '../src/models/Complaint.js';
import AuditLog from '../src/models/AuditLog.js';
import VendorAMC from '../src/models/VendorAMC.js';
import { seedDemoAccounts } from '../src/services/seedService.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aai-asset-management';

const seedDatabase = async () => {
  console.log('====================================================');
  console.log(' AIRPORTS AUTHORITY OF INDIA (AAI) REGIONAL OFFICE  ');
  console.log('      ENTERPRISE ASSET MANAGEMENT DATABASE SEEDER   ');
  console.log('====================================================');

  try {
    console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI);
    console.log('✔ MongoDB connected successfully.\n');

    // 1. Seed Departments
    console.log('Seeding Department Master Directory...');
    await Department.deleteMany({});
    const departments = await Department.insertMany([
      { name: 'Communication, Navigation & Surveillance', code: 'CNS', floor: '2nd Floor, Technical Block', description: 'Radar, VHF communications, navigational aids' },
      { name: 'Air Traffic Management', code: 'ATM', floor: 'ATC Tower, Top Cab', description: 'En-route, approach, and aerodrome control operations' },
      { name: 'Terminal Management & Operations', code: 'TMO', floor: '1st Floor, Terminal Building', description: 'Passenger facilitation, FIDS, and aerobridge systems' },
      { name: 'Human Resources & Administration', code: 'HRA', floor: 'Ground Floor, Admin Wing', description: 'Personnel, welfare, and general administration' },
      { name: 'Finance & Accounts', code: 'FIN', floor: 'Ground Floor, Admin Wing', description: 'Regional budgeting, payroll, and auditing' },
      { name: 'Airport Systems & Information Technology', code: 'IT', floor: '1st Floor, Technical Block', description: 'Central enterprise IT infrastructure & servers' },
      { name: 'Civil & Electrical Engineering', code: 'ENG', floor: 'Ground Floor, Maintenance Block', description: 'Substations, airfield lighting, and HVAC systems' },
      { name: 'Airport Director Office', code: 'APD', floor: '2nd Floor, Executive Block', description: 'Executive leadership and regulatory coordination' }
    ]);
    console.log(`✔ Seeded ${departments.length} departments.`);

    // 2. Seed Categories
    console.log('Seeding Equipment Categories...');
    await Category.deleteMany({});
    const categories = await Category.insertMany([
      { name: 'Desktop PC / Workstation', code: 'PC', description: 'High-performance workstations and office client PCs' },
      { name: 'Laptop / Notebook', code: 'LAP', description: 'Executive and mobile operational laptops' },
      { name: 'Network Multi-Function Printer', code: 'PRN', description: 'Heavy-duty network laser and multi-function printers' },
      { name: 'High-Speed Document Scanner', code: 'SCN', description: 'Sheet-fed scanners for voucher and invoice digitisation' },
      { name: 'Online UPS System', code: 'UPS', description: 'Uninterruptible power supplies for ATC, radar, and servers' },
      { name: 'Core Network Switch / Router', code: 'NET', description: 'Managed switches, Cisco routers, and airport LAN hardware' },
      { name: 'Flight Information Display (FIDS)', code: 'DSP', description: 'Commercial grade 4K visual display units' }
    ]);
    console.log(`✔ Seeded ${categories.length} equipment categories.`);

    // 3. Seed Users
    console.log('Seeding System Accounts & Credentials...');
    await User.deleteMany({});
    const adminPassword = await bcrypt.hash('Admin@123', 10);
    const empPassword = await bcrypt.hash('Employee@123', 10);

    const users = await User.insertMany([
      {
        username: 'admin',
        name: 'Regional IT Administrator',
        email: 'admin.regional@aai.aero',
        password: adminPassword,
        role: 'ADMIN',
        department: 'Airport Systems & Information Technology',
        designation: 'Senior Manager (IT)',
        employeeId: 'AAI-ADM-001'
      },
      {
        username: 'roshan.r',
        name: 'Roshan R',
        email: 'roshan.r@aai.aero',
        password: empPassword,
        role: 'EMPLOYEE',
        department: 'Communication, Navigation & Surveillance',
        designation: 'Assistant General Manager (CNS)',
        employeeId: 'AAI-10842'
      },
      {
        username: 'priya.nair',
        name: 'Priya Nair',
        email: 'priya.nair@aai.aero',
        password: empPassword,
        role: 'EMPLOYEE',
        department: 'Human Resources & Administration',
        designation: 'Manager (HR)',
        employeeId: 'AAI-10512'
      },
      {
        username: 'amit.sharma',
        name: 'Amit Sharma',
        email: 'amit.sharma@aai.aero',
        password: empPassword,
        role: 'EMPLOYEE',
        department: 'Air Traffic Management',
        designation: 'Junior Executive (ATC)',
        employeeId: 'AAI-10950'
      }
    ]);
    console.log(`✔ Seeded ${users.length} authenticated users.`);

    // 4. Seed Employees Master Directory
    console.log('Seeding Regional Employee Master Directory...');
    await Employee.deleteMany({});
    const employees = await Employee.insertMany([
      {
        employeeId: 'AAI-10842',
        name: 'Roshan R',
        designation: 'Assistant General Manager (CNS)',
        department: 'Communication, Navigation & Surveillance',
        floor: '2nd Floor, Technical Block',
        email: 'roshan.r@aai.aero',
        phone: '+91 98401 23456',
        employmentStatus: 'ACTIVE',
        joiningDate: new Date('2015-06-01')
      },
      {
        employeeId: 'AAI-10512',
        name: 'Priya Nair',
        designation: 'Manager (HR)',
        department: 'Human Resources & Administration',
        floor: 'Ground Floor, Admin Wing',
        email: 'priya.nair@aai.aero',
        phone: '+91 98401 77123',
        employmentStatus: 'ACTIVE',
        joiningDate: new Date('2018-02-15')
      },
      {
        employeeId: 'AAI-10950',
        name: 'Amit Sharma',
        designation: 'Junior Executive (ATC)',
        department: 'Air Traffic Management',
        floor: 'ATC Tower, Top Cab',
        email: 'amit.sharma@aai.aero',
        phone: '+91 98401 88456',
        employmentStatus: 'ACTIVE',
        joiningDate: new Date('2021-08-10')
      },
      {
        employeeId: 'AAI-10204',
        name: 'V. Sundaram',
        designation: 'Joint General Manager (Finance)',
        department: 'Finance & Accounts',
        floor: 'Ground Floor, Admin Wing',
        email: 'sundaram.v@aai.aero',
        phone: '+91 98401 99011',
        employmentStatus: 'ACTIVE',
        joiningDate: new Date('2010-03-20')
      },
      {
        employeeId: 'AAI-11022',
        name: 'Ananya Roy',
        designation: 'Assistant Manager (Terminal Ops)',
        department: 'Terminal Management & Operations',
        floor: '1st Floor, Terminal Building',
        email: 'ananya.roy@aai.aero',
        phone: '+91 98401 44521',
        employmentStatus: 'ACTIVE',
        joiningDate: new Date('2022-11-01')
      }
    ]);
    console.log(`✔ Seeded ${employees.length} employee records.`);

    // 5. Seed Assets (With confirmed 13 handwritten specification fields)
    console.log('Seeding Regional Asset Inventory (13 Confirmed Handwritten Fields)...');
    await Asset.deleteMany({});
    const now = new Date();

    const assets = await Asset.insertMany([
      {
        assetId: 'AAI-REG-PC-2024-0001',
        assetName: 'Dell OptiPlex 7090 MT Workstation',
        category: 'Desktop PC / Workstation',
        make: 'Dell Technologies',
        model: 'OptiPlex 7090 MT',
        serialNumber: 'DEL-OPT-7090-001',
        installDate: new Date('2024-01-10'),
        warrantyStartDate: new Date('2024-01-10'),
        warrantyEndDate: new Date('2027-01-09'),
        operatingSystem: 'Windows 11 Pro for Workstations',
        osVersion: '23H2 (Build 22631.3880)',
        department: 'Communication, Navigation & Surveillance',
        floor: '2nd Floor, Technical Block',
        status: 'ASSIGNED',
        condition: 'EXCELLENT',
        remarks: 'Surveillance radar client workstation stationed in CNS server room',
        currentEmployeeId: 'AAI-10842',
        currentEmployeeName: 'Roshan R',
        currentDesignation: 'Assistant General Manager (CNS)',
        currentAssignmentDate: new Date('2024-01-15')
      },
      {
        assetId: 'AAI-REG-LAP-2024-0002',
        assetName: 'HP EliteBook 840 G10 Notebook',
        category: 'Laptop / Notebook',
        make: 'HP Inc.',
        model: 'EliteBook 840 G10',
        serialNumber: 'HP-EB-840-002',
        installDate: new Date('2024-02-01'),
        warrantyStartDate: new Date('2024-02-01'),
        warrantyEndDate: new Date('2027-01-31'),
        operatingSystem: 'Windows 11 Pro',
        osVersion: '23H2',
        department: 'Human Resources & Administration',
        floor: 'Ground Floor, Admin Wing',
        status: 'ASSIGNED',
        condition: 'GOOD',
        remarks: 'Issued for personnel recruitment & airport establishment roster',
        currentEmployeeId: 'AAI-10512',
        currentEmployeeName: 'Priya Nair',
        currentDesignation: 'Manager (HR)',
        currentAssignmentDate: new Date('2024-02-05')
      },
      {
        assetId: 'AAI-REG-PRN-2023-0003',
        assetName: 'Canon imageRUNNER 2625i Multi-Function Network Printer',
        category: 'Network Multi-Function Printer',
        make: 'Canon India',
        model: 'iR 2625i MFP',
        serialNumber: 'CAN-IR-2625-003',
        installDate: new Date('2023-05-12'),
        warrantyStartDate: new Date('2023-05-12'),
        warrantyEndDate: new Date('2026-05-11'),
        operatingSystem: 'N/A',
        osVersion: 'Firmware v3.12',
        department: 'Finance & Accounts',
        floor: 'Ground Floor, Admin Wing',
        status: 'AVAILABLE',
        condition: 'GOOD',
        remarks: 'Network pooled printer for quarterly budgeting and vendor invoice settlement'
      },
      {
        assetId: 'AAI-REG-UPS-2024-0004',
        assetName: 'APC Smart-UPS On-Line 3kVA RT',
        category: 'Online UPS System',
        make: 'Schneider Electric / APC',
        model: 'SRT3000XLI',
        serialNumber: 'APC-SRT-3000-004',
        installDate: new Date('2024-03-01'),
        warrantyStartDate: new Date('2024-03-01'),
        warrantyEndDate: new Date('2026-02-28'),
        operatingSystem: 'N/A',
        department: 'Air Traffic Management',
        floor: 'ATC Tower, Top Cab',
        status: 'ASSIGNED',
        condition: 'EXCELLENT',
        remarks: 'Dedicated backup for Flight Progress Strip (FPS) client terminals',
        currentEmployeeId: 'AAI-10950',
        currentEmployeeName: 'Amit Sharma',
        currentDesignation: 'Junior Executive (ATC)',
        currentAssignmentDate: new Date('2024-03-05')
      },
      {
        assetId: 'AAI-REG-SCN-2023-0005',
        assetName: 'HP ScanJet Pro 3000 s4 Sheet-feed Scanner',
        category: 'High-Speed Document Scanner',
        make: 'HP Inc.',
        model: 'ScanJet Pro 3000 s4',
        serialNumber: 'HP-SJ-3000-005',
        installDate: new Date('2023-06-15'),
        warrantyStartDate: new Date('2023-06-15'),
        // Expiring in 20 days
        warrantyEndDate: new Date(now.getTime() + 20 * 24 * 3600 * 1000),
        operatingSystem: 'N/A',
        department: 'Human Resources & Administration',
        floor: 'Ground Floor, Admin Wing',
        status: 'UNDER_MAINTENANCE',
        condition: 'FAIR',
        remarks: 'Undergoing document feeder roller replacement'
      }
    ]);
    console.log(`✔ Seeded ${assets.length} core assets.`);

    // 6. Seed Vendor AMC Contracts
    console.log('Seeding Vendor Annual Maintenance Contracts (AMC)...');
    await VendorAMC.deleteMany({});
    const amcs = await VendorAMC.insertMany([
      {
        contractNumber: 'AAI-AMC-DELL-2024',
        vendorName: 'Dell Technologies India Pvt Ltd',
        serviceType: 'HARDWARE_SUPPORT',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2026-12-31'),
        supportTier: '24x7_CRITICAL_4HR',
        contactPerson: 'Arunav Sengupta (Technical Account Manager)',
        contactPhone: '+91 1800 425 0088',
        contactEmail: 'aai.support@dell.com',
        coveredCategories: ['Desktop PC / Workstation', 'Laptop / Notebook'],
        annualCostINR: 485000,
        remarks: 'Covers regional ATC tower and CNS technical workstations'
      },
      {
        contractNumber: 'AAI-AMC-HP-2024',
        vendorName: 'HP Enterprise Services India',
        serviceType: 'PRINTER_PERIPHERAL_SLA',
        startDate: new Date('2024-04-01'),
        endDate: new Date('2027-03-31'),
        supportTier: 'SAME_DAY_8HR',
        contactPerson: 'Meera Deshmukh (Regional Service Lead)',
        contactPhone: '+91 1800 258 7170',
        contactEmail: 'support.gov@hp.com',
        coveredCategories: ['Network Multi-Function Printer', 'High-Speed Document Scanner'],
        annualCostINR: 195000,
        remarks: 'Includes replacement rollers, drums, and scanner feed kits'
      },
      {
        contractNumber: 'AAI-AMC-APC-2024',
        vendorName: 'Schneider Electric IT Business India',
        serviceType: 'UPS_POWER_SLA',
        startDate: new Date('2023-09-01'),
        endDate: new Date(now.getTime() + 18 * 24 * 3600 * 1000),
        supportTier: '24x7_CRITICAL_4HR',
        contactPerson: 'Karthik Raman (Power Support Engineer)',
        contactPhone: '+91 1800 103 0011',
        contactEmail: 'apc.aai@se.com',
        coveredCategories: ['Online UPS System', 'Power Distribution Unit'],
        annualCostINR: 320000,
        remarks: 'Quarterly battery impedance testing and emergency capacitor overhaul'
      }
    ]);
    console.log(`✔ Seeded ${amcs.length} vendor AMC contracts.`);

    // 7. Seed Initial Audit Logs
    console.log('Seeding Regulatory Audit Event Baseline...');
    await AuditLog.deleteMany({});
    const auditEvents = await AuditLog.insertMany([
      {
        action: 'SYSTEM_INITIALIZATION',
        entityType: 'SYSTEM',
        entityId: 'AAI-REGIONAL-OFFICE',
        actor: { username: 'SYSTEM', name: 'AAI Master Seeder', role: 'SYSTEM' },
        details: { message: 'Database initialization and baseline master data seeding' },
        status: 'SUCCESS',
        timestamp: new Date(Date.now() - 3600000 * 24)
      },
      {
        action: 'USER_LOGIN',
        entityType: 'AUTH',
        entityId: 'admin',
        actor: { username: 'admin', name: 'Regional IT Administrator', role: 'ADMIN' },
        details: { message: 'Administrator baseline configuration login' },
        status: 'SUCCESS',
        timestamp: new Date(Date.now() - 3600000 * 12)
      }
    ]);
    console.log(`✔ Seeded ${auditEvents.length} audit baseline events.\n`);

    console.log('Ensuring standard demo accounts in database...');
    await seedDemoAccounts();
    console.log('✔ Standard demo accounts ensured.\n');

    console.log('====================================================');
    console.log('✔ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('  Admin User:     admin / AAIAdmin@2026!');
    console.log('  Employee User:  employee / AAIEmployee@2026!');
    console.log('====================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
