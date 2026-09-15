import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, '../sample_data');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 1. Employee_Master.xlsx
const empMasterData = [
  ['Staff ID', 'Custodian Full Name', 'Official Designation', 'Division / Section', 'Workplace Location', 'Email Address'],
  ['AAI-10842', 'Roshan R', 'Assistant Manager (CNS)', 'Communication, Navigation & Surveillance', '2nd Floor, Technical Block', 'roshan.r@aai.aero'],
  ['AAI-10950', 'Amit Sharma', 'Junior Executive (ATC)', 'Air Traffic Management', '3rd Floor, ATC Tower', 'amit.sharma@aai.aero'],
  ['AAI-10512', 'Priya Nair', 'Senior Superintendent (Finance)', 'Finance & Accounts', 'Ground Floor, Admin Wing', 'priya.nair@aai.aero'],
  ['AAI-10334', 'Suresh Kumar', 'Assistant General Manager (Engg)', 'Engineering - Civil', '1st Floor, Operational Wing', 'suresh.k@aai.aero'],
  ['AAI-20101', 'Kavitha S', 'Senior Technical Officer', 'Information Technology', '2nd Floor, IT Wing', 'kavitha.s@aai.aero']
];

// 2. Asset_Register.xlsx (Primary hardware register)
const assetRegisterData = [
  ['Tag / Serial', 'Brand', 'Machine Model', 'Item Name', 'Department', 'Physical Location', 'User Code'],
  ['DL-REG-2024-001', 'Dell', 'OptiPlex 7000', 'Desktop PC', 'Communication, Navigation & Surveillance', '2nd Floor, Technical Block', 'AAI-10842'],
  ['HP-REG-2024-002', 'HP', 'EliteDesk 805', 'Desktop Workstation', 'Air Traffic Management', '3rd Floor, ATC Tower', 'AAI-10950'],
  ['LN-REG-2024-003', 'Lenovo', 'ThinkPad T14s', 'Executive Laptop', 'Finance & Accounts', 'Ground Floor, Admin Wing', 'AAI-10512'],
  ['AP-REG-2024-004', 'APC', 'Smart-UPS 2200VA', 'Network Rack UPS', 'Information Technology', 'Server Room, Ground Floor', ''], // Unassigned
  ['DL-REG-2024-005', 'Dell', 'Latitude 5430', 'Maintenance Laptop', 'Engineering - Civil', '1st Floor, Operational Wing', 'AAI-10334']
];

// 3. Computer_Inventory.xlsx (Complementary OS & Warranty register)
const compInventoryData = [
  ['Service Tag', 'OEM', 'Commission Date', 'Warranty Valid Till', 'OS Installed', 'OS Release', 'Handover Remarks'],
  ['DL-REG-2024-001', 'Dell', '2024-01-15', '2027-01-15', 'WIN 11 ENT', '23H2', 'Primary radar monitoring workstation'],
  ['HP-REG-2024-002', 'HP', '2024-02-10', '2027-02-10', 'Windows 11 Pro', '23H2', 'Tower console dual display setup'],
  ['LN-REG-2024-003', 'Lenovo', '2024-03-05', '2027-03-05', 'Windows 11 Enterprise', '22H2', 'Direct handover to finance head'],
  ['AP-REG-2024-004', 'APC', '2023-11-20', '2025-11-20', 'N/A', '', 'Hot-standby UPS for server rack B'],
  ['DL-REG-2024-005', 'Dell', '2024-04-01', '2027-04-01', 'Ubuntu Linux', '22.04 LTS', 'Field survey CAD laptop']
];

// 4. Old_Asset_Register.xlsx (Legacy format with conflicts, alternate dates, and duplicate rows)
const oldAssetRegisterData = [
  ['Asset Serial', 'Manufacturer', 'Equipment Model', 'Asset Description', 'Cost Center', 'Room No', 'Installed On', 'Warranty Upto', 'Custodian'],
  // Complementary unit with DD/MM/YYYY dates
  ['AP-REG-2024-006', 'Apple', 'MacBook Pro 16', 'Laptop', 'Information Technology', 'Room 204, IT Wing', '10/05/2024', '10/05/2027', 'Kavitha S'],
  // Conflicting record for DL-REG-2024-005 (Model listed as Latitude 5420 instead of 5430)
  ['DL-REG-2024-005', 'Dell', 'Latitude 5420', 'Laptop', 'Engineering - Civil', '1st Floor, Operational Wing', '01/04/2024', '01/04/2027', 'Suresh Kumar'],
  // Duplicate identical record within this file
  ['AP-REG-2024-006', 'Apple', 'MacBook Pro 16', 'Laptop', 'Information Technology', 'Room 204, IT Wing', '10/05/2024', '10/05/2027', 'Kavitha S'],
  // Unassigned printer
  ['HP-PRN-2024-007', 'HP', 'LaserJet Pro MFP 4104', 'Laser Multifunction Printer', 'Air Traffic Management', 'Briefing Room, 2nd Floor', '15/06/2024', '15/06/2027', '']
];

// Helper to write workbook
const writeWorkbook = (data, filename, sheetName = 'Sheet1') => {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const filePath = path.join(outputDir, filename);
  XLSX.writeFile(wb, filePath);
  console.log(`Generated: ${filePath}`);
};

writeWorkbook(empMasterData, 'Employee_Master.xlsx', 'Employees');
writeWorkbook(assetRegisterData, 'Asset_Register.xlsx', 'Hardware_Assets');
writeWorkbook(compInventoryData, 'Computer_Inventory.xlsx', 'OS_Warranty');
writeWorkbook(oldAssetRegisterData, 'Old_Asset_Register.xlsx', 'Legacy_Register');

console.log('Sample test workbooks successfully generated in server/sample_data/');
