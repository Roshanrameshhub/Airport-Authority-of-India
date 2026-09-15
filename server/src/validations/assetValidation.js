import { z } from 'zod';

export const createAssetSchema = z.object({
  assetId: z.string().optional().or(z.literal('')),
  assetName: z.string({
    required_error: 'Asset Name is required'
  }).min(2, 'Asset Name must be at least 2 characters').trim(),
  assetType: z.enum([
    'DESKTOP',
    'LAPTOP',
    'PRINTER',
    'SCANNER',
    'UPS',
    'MONITOR',
    'SERVER',
    'NETWORK',
    'PROJECTOR',
    'STORAGE',
    'PERIPHERAL',
    'OTHER'
  ]).optional().default('OTHER'),
  category: z.string({
    required_error: 'Category is required'
  }).min(2, 'Category must be specified').trim(),
  make: z.string({
    required_error: 'Make / Company is required'
  }).min(1, 'Make / Company is required').trim(),
  model: z.string({
    required_error: 'Model is required'
  }).min(1, 'Model is required').trim(),
  serialNumber: z.string({
    required_error: 'Serial Number is required'
  }).min(2, 'Serial Number must be at least 2 characters').trim(),
  oldAssetId: z.string().optional().default(''),
  qrCode: z.string().optional().default(''),
  barcode: z.string().optional().default(''),

  installDate: z.string({
    required_error: 'Install Date is required'
  }).refine((date) => !isNaN(Date.parse(date)), {
    message: 'Install Date must be a valid date'
  }),
  warrantyStartDate: z.string().optional().refine((date) => !date || !isNaN(Date.parse(date)), {
    message: 'Warranty Start Date must be a valid date'
  }),
  warrantyEndDate: z.string({
    required_error: 'Warranty End Date is required'
  }).refine((date) => !isNaN(Date.parse(date)), {
    message: 'Warranty End Date must be a valid date'
  }),

  // Procurement & AMC
  supplier: z.string().optional().default(''),
  vendor: z.string().optional().default(''),
  supplyOrderNumber: z.string().optional().default(''),
  purchaseDate: z.string().optional().refine((date) => !date || !isNaN(Date.parse(date)), {
    message: 'Purchase Date must be a valid date'
  }),
  purchaseCost: z.number().min(0, 'Purchase cost cannot be negative').optional().nullable(),
  amcApplicable: z.boolean().optional().default(false),
  amcContractId: z.string().optional().default(''),
  amcEndDate: z.string().optional().refine((date) => !date || !isNaN(Date.parse(date)), {
    message: 'AMC End Date must be a valid date'
  }),

  // Facility & Location
  department: z.string({
    required_error: 'Department is required'
  }).min(2, 'Department is required').trim(),
  departmentId: z.string().optional().default(''),
  location: z.string().optional().default('AAI Operational Facility'),
  locationId: z.string().optional().default(''),
  floor: z.string({
    required_error: 'Floor is required'
  }).min(1, 'Floor is required').trim(),
  room: z.string().optional().default(''),
  intercom: z.string().optional().default(''),

  // Operating System & Network
  operatingSystem: z.string().optional().default('N/A'),
  osVersion: z.string().optional().default(''),
  ipAddress: z.string().optional().default(''),
  macAddress: z.string().optional().default(''),

  // Lifecycle
  remarks: z.string().optional().default(''),
  status: z.enum([
    'AVAILABLE',
    'ASSIGNED',
    'GODOWN',
    'UNDER_MAINTENANCE',
    'UNDER_REPAIR',
    'FAULTY',
    'DAMAGED',
    'LOST',
    'WRITE_OFF',
    'RETIRED',
    'DISPOSED'
  ]).optional().default('AVAILABLE'),
  condition: z.enum([
    'NEW',
    'EXCELLENT',
    'GOOD',
    'FAIR',
    'POOR',
    'DAMAGED',
    'UNSERVICEABLE',
    'UNUSABLE',
    'OBSOLETE'
  ]).optional().default('GOOD'),

  // Custodian
  currentEmployeeId: z.string().optional().or(z.literal('')),
  currentEmployeeName: z.string().optional().or(z.literal('')),
  currentDesignation: z.string().optional().or(z.literal('')),

  // Configurations & Custom Fields
  computerConfig: z.object({
    processor: z.string().optional().default(''),
    processorSpeed: z.string().optional().default(''),
    ramSizeGb: z.number().optional().nullable(),
    ramType: z.string().optional().default(''),
    ramSlots: z.number().optional().nullable(),
    storageType: z.string().optional().default(''),
    storageCapacityGb: z.number().optional().nullable(),
    storageModel: z.string().optional().default(''),
    graphicsCard: z.string().optional().default(''),
    opticalDrive: z.string().optional().default(''),
    formFactor: z.string().optional().default(''),
    operatingSystem: z.string().optional().default(''),
    osVersion: z.string().optional().default(''),
    osArchitecture: z.string().optional().default('64-bit'),
    ipAddress: z.string().optional().default(''),
    macAddress: z.string().optional().default(''),
    hostname: z.string().optional().default('')
  }).partial().optional().default({}),
  displayConfig: z.object({
    screenSizeInches: z.number().optional().nullable(),
    resolution: z.string().optional().default(''),
    panelType: z.string().optional().default(''),
    ports: z.array(z.string()).optional().default([]),
    aspectRatio: z.string().optional().default('16:9')
  }).partial().optional().default({}),
  powerConfig: z.object({
    capacityVa: z.number().optional().nullable(),
    capacityWatts: z.number().optional().nullable(),
    topology: z.string().optional().default('Line-Interactive'),
    batteryType: z.string().optional().default('VRLA / SMF'),
    batteryQuantity: z.number().optional().nullable(),
    estimatedBackupMinutes: z.number().optional().nullable(),
    lastBatteryReplacementDate: z.string().optional().nullable()
  }).partial().optional().default({}),
  peripheralConfig: z.object({
    peripheralType: z.string().optional().default(''),
    interfaceType: z.string().optional().default('USB'),
    isWireless: z.boolean().optional().default(false)
  }).partial().optional().default({}),
  networkConfig: z.object({
    deviceSubtype: z.string().optional().default(''),
    totalPorts: z.number().optional().nullable(),
    portSpeed: z.string().optional().default('1 Gbps'),
    managementIp: z.string().optional().default(''),
    firmwareVersion: z.string().optional().default(''),
    isManaged: z.boolean().optional().default(true)
  }).partial().optional().default({}),
  specifications: z.record(z.any()).optional().default({}),
  customFields: z.record(z.any()).optional().default({})
});

export const updateAssetSchema = createAssetSchema.partial();
