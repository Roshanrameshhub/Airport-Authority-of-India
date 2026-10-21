import { z } from 'zod';

export const createEmployeeSchema = z.object({
  employeeId: z.string().trim().optional().or(z.literal('')),
  name: z.string({
    required_error: 'User Name is required'
  }).min(1, 'Name cannot be empty').trim(),
  designation: z.string().trim().optional().default('Staff'),
  department: z.string().trim().optional().default('Operations'),
  floor: z.string().trim().optional().default('Main Terminal'),
  intercom: z.string().trim().optional().default(''),
  ipAddress: z.string().trim().optional().default(''),
  employeeType: z.enum(['AAI', 'Contract']).optional().default('AAI'),
  employmentCategory: z.string().optional().default('Regular'),
  contractorName: z.string().optional().default(''),
  email: z.string().email('Invalid email address format').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  createLoginAccount: z.boolean().optional().default(true),
  // Fields 8-15 asset references
  assetId: z.string().trim().optional().default(''),
  monitorId: z.string().trim().optional().default(''),
  keyboardId: z.string().trim().optional().default(''),
  mouseId: z.string().trim().optional().default(''),
  upsId: z.string().trim().optional().default(''),
  ptrId: z.string().trim().optional().default(''),
  scannerId: z.string().trim().optional().default(''),
  laptopId: z.string().trim().optional().default(''),
  assignedAssetIds: z.array(z.string().trim()).optional().default([])
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const createDepartmentSchema = z.object({
  name: z.string({
    required_error: 'Department name is required'
  }).min(2, 'Department name must be at least 2 characters').trim(),
  code: z.string({
    required_error: 'Department code is required'
  }).min(2, 'Code must be at least 2 characters').trim(),
  floor: z.string({
    required_error: 'Floor is required'
  }).min(1, 'Floor must be specified').trim(),
  description: z.string().optional()
});

export const createCategorySchema = z.object({
  name: z.string({
    required_error: 'Category name is required'
  }).min(2, 'Category name must be at least 2 characters').trim(),
  code: z.string({
    required_error: 'Category code is required'
  }).min(2, 'Category code must be at least 2 characters').trim(),
  requiresOS: z.boolean().optional().default(false),
  description: z.string().optional()
});

export const createMakeSchema = z.object({
  name: z.string({
    required_error: 'Make / Brand name is required'
  }).min(1, 'Make / Brand name cannot be empty').trim(),
  code: z.string().trim().optional().default(''),
  categories: z.array(z.string().trim()).optional().default([]),
  assetTypes: z.array(z.string().trim()).optional().default([]),
  description: z.string().trim().optional().default(''),
  website: z.string().trim().optional().default(''),
  isActive: z.boolean().optional().default(true)
});

export const updateMakeSchema = createMakeSchema.partial();

export const createModelSchema = z.object({
  name: z.string({
    required_error: 'Model name is required'
  }).min(1, 'Model name cannot be empty').trim(),
  make: z.string({
    required_error: 'Make / Brand is required'
  }).min(1, 'Make / Brand cannot be empty').trim(),
  makeId: z.string().trim().optional().nullable(),
  category: z.string().trim().optional().default(''),
  assetType: z.string().trim().optional().default(''),
  technology: z.string().trim().optional().default(''),
  specifications: z.record(z.any()).optional().default({}),
  description: z.string().trim().optional().default(''),
  isActive: z.boolean().optional().default(true)
});

export const updateModelSchema = createModelSchema.partial();

export const createTechnologySchema = z.object({
  name: z.string({
    required_error: 'Technology name is required'
  }).min(1, 'Technology name cannot be empty').trim(),
  category: z.string().trim().optional().default(''),
  assetTypes: z.array(z.string().trim()).optional().default([]),
  description: z.string().trim().optional().default(''),
  isActive: z.boolean().optional().default(true)
});

export const updateTechnologySchema = createTechnologySchema.partial();

