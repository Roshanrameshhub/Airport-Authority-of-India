import { z } from 'zod';

export const loginSchema = z.object({
  credential: z.string({
    required_error: 'Username or Email is required'
  }).min(1, 'Username or Email cannot be empty'),
  password: z.string({
    required_error: 'Password is required'
  }).min(1, 'Password cannot be empty')
});

export const registerSchema = z.object({
  username: z.string({
    required_error: 'Username is required'
  }).min(3, 'Username must be at least 3 characters').max(30),
  name: z.string({
    required_error: 'Full name is required'
  }).min(2, 'Name must be at least 2 characters'),
  email: z.string({
    required_error: 'Email is required'
  }).email('Invalid email address format'),
  password: z.string({
    required_error: 'Password is required'
  }).min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'EMPLOYEE']).default('EMPLOYEE'),
  employeeId: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional()
});
