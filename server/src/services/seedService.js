import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import Asset from '../models/Asset.js';
import AssetAssignment from '../models/AssetAssignment.js';
import Department from '../models/Department.js';
import Category from '../models/Category.js';
import Complaint from '../models/Complaint.js';
import { logger } from '../utils/logger.js';

export const seedDemoAccounts = async () => {
  try {
    logger.info('[Atlas Database Seeder] Initializing development/demo data in MongoDB Atlas...');

    // 1. Seed Core Master Departments
    const departments = [
      { name: 'Communication, Navigation & Surveillance', code: 'CNS', floor: '2nd Floor, Technical Block', description: 'Radar, VHF communications, navigational aids' },
      { name: 'Airport Systems & Information Technology', code: 'IT', floor: '1st Floor, Technical Block', description: 'Central enterprise IT infrastructure & servers' },
      { name: 'Air Traffic Management', code: 'ATM', floor: 'ATC Tower, Top Cab', description: 'En-route, approach, and aerodrome control operations' },
      { name: 'Terminal Management & Operations', code: 'TMO', floor: '1st Floor, Terminal Building', description: 'Passenger facilitation, FIDS, and aerobridge systems' },
      { name: 'Finance & Accounts', code: 'FIN', floor: 'Ground Floor, Admin Wing', description: 'Regional budgeting, payroll, and auditing' },
      { name: 'Human Resources & Administration', code: 'HRA', floor: 'Ground Floor, Admin Wing', description: 'Personnel, welfare, and general administration' }
    ];

    for (const dept of departments) {
      await Department.findOneAndUpdate(
        { code: dept.code },
        { $set: dept },
        { upsert: true, new: true }
      );
    }

    // 2. Seed Core Master Categories
    const categories = [
      { name: 'Desktop PC', code: 'PC', description: 'High-performance workstations and office client PCs' },
      { name: 'Laptop', code: 'LAP', description: 'Executive and mobile operational laptops' },
      { name: 'Printer', code: 'PRN', description: 'Heavy-duty network laser and multi-function printers' },
      { name: 'Scanner', code: 'SCN', description: 'Sheet-fed scanners for voucher and invoice digitisation' },
      { name: 'Online UPS', code: 'UPS', description: 'Uninterruptible power supplies for ATC, radar, and servers' },
      { name: 'Network Switch', code: 'NET', description: 'Managed switches, Cisco routers, and airport LAN hardware' }
    ];

    for (const cat of categories) {
      await Category.findOneAndUpdate(
        { code: cat.code },
        { $set: cat },
        { upsert: true, new: true }
      );
    }

    // 3. Seed Employee Record
    const demoEmployeeData = {
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

    const seededEmployee = await Employee.findOneAndUpdate(
      { employeeId: demoEmployeeData.employeeId },
      { $set: demoEmployeeData },
      { upsert: true, new: true }
    );
    logger.info(`[Atlas Database Seeder] Staff Employee master record ensured: ${seededEmployee.name} (${seededEmployee.employeeId})`);

    // 4. Seed / Update ADMIN Account
    // Credentials: Username: admin | Email: admin@aai.local | Password: AAIAdmin@2026!
    const adminPasswordHash = await bcrypt.hash('AAIAdmin@2026!', 10);
    const adminUserData = {
      username: 'admin',
      name: 'System Administrator',
      email: 'admin@aai.local',
      password: adminPasswordHash,
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
    logger.info(`[Atlas Database Seeder] Admin account ensured in MongoDB Atlas: ${seededAdmin.username} (${seededAdmin.email}) [Role: ${seededAdmin.role}]`);

    // 5. Seed / Update EMPLOYEE Account
    // Credentials: Username: employee | Email: employee@aai.local | Password: AAIEmployee@2026!
    const employeePasswordHash = await bcrypt.hash('AAIEmployee@2026!', 10);
    const employeeUserData = {
      username: 'employee',
      name: 'Staff Employee',
      email: 'employee@aai.local',
      password: employeePasswordHash,
      role: 'EMPLOYEE',
      employeeId: 'AAI-10842',
      designation: 'Assistant Manager (CNS)',
      department: 'Communication, Navigation & Surveillance',
      isActive: true
    };

    const seededEmployeeUser = await User.findOneAndUpdate(
      { $or: [{ username: 'employee' }, { email: 'employee@aai.local' }] },
      { $set: employeeUserData },
      { upsert: true, new: true }
    );
    logger.info(`[Atlas Database Seeder] Employee account ensured in MongoDB Atlas: ${seededEmployeeUser.username} (${seededEmployeeUser.email}) [Role: ${seededEmployeeUser.role}]`);

    // 6. Seed Realistic Assigned Asset for the Employee
    // Asset ID: AAI-REG-PC-2024-0001
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
      { assetId: demoAssetData.assetId },
      { $set: demoAssetData },
      { upsert: true, new: true }
    );
    logger.info(`[Atlas Database Seeder] Assigned Asset ensured: ${seededAsset.assetName} (${seededAsset.assetId}) -> Custodian: ${seededAsset.currentEmployeeName}`);

    // 7. Seed Corresponding Active Assignment History
    const demoAssignmentData = {
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
    };

    await AssetAssignment.findOneAndUpdate(
      { assignmentId: demoAssignmentData.assignmentId },
      { $set: demoAssignmentData },
      { upsert: true, new: true }
    );

    // 8. Seed a Sample Complaint Ticket for this Employee
    const demoComplaintData = {
      ticketId: 'TKT-2024-0001',
      assetId: 'AAI-REG-PC-2024-0001',
      assetName: 'Dell OptiPlex 7090 MT Workstation',
      category: 'HARDWARE_FAULT',
      title: 'Display port flickering on dual monitor setup',
      description: 'Secondary display flickers intermittently during radar monitoring session. Cable and adapter inspected.',
      severity: 'LOW',
      priority: 'P4_LOW',
      status: 'OPEN',
      reportedBy: {
        employeeId: 'AAI-10842',
        name: 'Staff Employee',
        email: 'employee@aai.local'
      },
      department: 'Communication, Navigation & Surveillance',
      floor: '2nd Floor, Technical Block',
      createdAt: new Date('2024-06-10')
    };

    await Complaint.findOneAndUpdate(
      { ticketId: demoComplaintData.ticketId },
      { $set: demoComplaintData },
      { upsert: true, new: true }
    );

    logger.info('================================================================================');
    logger.info('✔ MongoDB Atlas Seed Successful: TWO Development/Demo Accounts Created & Verified');
    logger.info('  1. ADMIN:    admin    | admin@aai.local    | Role: ADMIN');
    logger.info('  2. EMPLOYEE: employee | employee@aai.local | Role: EMPLOYEE (ID: AAI-10842)');
    logger.info('================================================================================');

    return {
      admin: seededAdmin,
      employee: seededEmployeeUser,
      asset: seededAsset
    };
  } catch (err) {
    logger.error(`[Atlas Database Seeder] Error seeding demo accounts: ${err.message}`, err);
    throw err;
  }
};
