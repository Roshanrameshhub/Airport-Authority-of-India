import { z } from 'zod';

export const assignAssetSchema = z.object({
  assetId: z.string({ required_error: 'Asset ID is required' }).min(1, 'Asset ID is required'),
  employeeId: z.string({ required_error: 'Employee ID is required' }).min(1, 'Employee ID is required'),
  condition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'UNUSABLE']).default('GOOD'),
  transferReason: z.string().optional().default('Initial Staff Assignment'),
  remarks: z.string().optional().default('')
});

export const transferAssetSchema = z.object({
  assetId: z.string({ required_error: 'Asset ID is required' }).min(1, 'Asset ID is required'),
  toEmployeeId: z.string({ required_error: 'Target Employee ID is required' }).min(1, 'Target Employee ID is required'),
  transferReason: z.string({ required_error: 'Transfer reason is required' }).min(3, 'Transfer reason is required (min 3 characters)'),
  conditionAtReturn: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'UNUSABLE']).default('GOOD'),
  conditionAtNewAssignment: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'UNUSABLE']).default('GOOD'),
  remarks: z.string().optional().default('')
});

export const returnAssetSchema = z.object({
  assetId: z.string({ required_error: 'Asset ID is required' }).min(1, 'Asset ID is required'),
  returnReason: z.string({ required_error: 'Return reason is required' }).min(3, 'Return reason is required (min 3 characters)'),
  conditionAtReturn: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'UNUSABLE']).default('GOOD'),
  remarks: z.string().optional().default('')
});
