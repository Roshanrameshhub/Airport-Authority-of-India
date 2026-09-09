import { z } from 'zod';

export const createAssetSchema = z.object({
  assetId: z.string().optional().or(z.literal('')),
  assetName: z.string({
    required_error: 'Asset Name is required'
  }).min(2, 'Asset Name must be at least 2 characters').trim(),
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
  operatingSystem: z.string().optional().default('N/A'),
  osVersion: z.string().optional().default(''),
  department: z.string({
    required_error: 'Department is required'
  }).min(2, 'Department is required').trim(),
  floor: z.string({
    required_error: 'Floor is required'
  }).min(1, 'Floor is required').trim(),
  remarks: z.string().optional().default(''),
  status: z.enum(['AVAILABLE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'DAMAGED', 'LOST', 'RETIRED', 'DISPOSED']).optional().default('AVAILABLE'),
  condition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'UNUSABLE']).optional().default('GOOD'),
  currentEmployeeId: z.string().optional().or(z.literal('')),
  currentEmployeeName: z.string().optional().or(z.literal('')),
  currentDesignation: z.string().optional().or(z.literal(''))
});

export const updateAssetSchema = createAssetSchema.partial();
