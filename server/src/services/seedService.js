import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import Asset from '../models/Asset.js';
import AssetAssignment from '../models/AssetAssignment.js';
import Department from '../models/Department.js';
import Category from '../models/Category.js';
import Complaint from '../models/Complaint.js';
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
    logger.info('  ADMIN    : Username=Admin      | Password=Admin@123    | Role=ADMIN');
    logger.info('  EMPLOYEE : Username=Employee01 | Password=Employee@123 | Role=EMPLOYEE | EmpID=AAI-EMP-01');
    logger.info('  Usernames stored lowercase in DB: admin / employee01');
    logger.info('  Login with any casing works (Admin, ADMIN, admin all match).');
    logger.info('================================================================================');

    return { admin: seededAdmin, employee: seededEmployee01User, asset: seededAsset };
  } catch (err) {
    logger.error(`[Demo Seeder] Error: ${err.message}`, err);
    throw err;
  }
};
