import { z } from 'zod';

export const createEmployeeSchema = z.object({
  employeeId: z.string({
    required_error: 'Employee ID is required'
  }).min(2, 'Employee ID must be at least 2 characters').trim(),
  name: z.string({
    required_error: 'Staff / User Name is required'
  }).min(2, 'Name must be at least 2 characters').trim(),
  designation: z.string({
    required_error: 'Designation is required'
  }).min(2, 'Designation must be at least 2 characters').trim(),
  department: z.string({
    required_error: 'Department is required'
  }).min(2, 'Department must be specified').trim(),
  floor: z.string({
    required_error: 'Floor / Location is required'
  }).min(1, 'Floor must be specified').trim(),
  email: z.string().email('Invalid email address format').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal(''))
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
