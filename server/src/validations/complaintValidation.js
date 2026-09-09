import { z } from 'zod';

export const createComplaintSchema = z.object({
  assetId: z.string({ required_error: 'Asset ID is required' }).min(1, 'Asset ID is required'),
  category: z.enum([
    'HARDWARE_FAULT',
    'SOFTWARE_ISSUE',
    'NETWORK_CONNECTIVITY',
    'PRINTER_PERIPHERAL',
    'OPERATING_SYSTEM',
    'SECURITY_ANTIVIRUS',
    'POWER_UPS',
    'OTHER'
  ], { required_error: 'Issue category is required' }),
  title: z.string({ required_error: 'Problem title is required' }).min(5, 'Problem title must be at least 5 characters'),
  description: z.string({ required_error: 'Detailed description is required' }).min(10, 'Description must be at least 10 characters'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('MEDIUM'),
  phone: z.string().optional().default('')
});

export const updateComplaintStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'PENDING_PARTS', 'RESOLVED', 'CLOSED', 'REJECTED'], {
    required_error: 'Status is required'
  }),
  resolutionNotes: z.string().optional().default(''),
  partsReplaced: z.string().optional().default(''),
  assignedTechnician: z.string().optional().default(''),
  remarks: z.string().optional().default('')
});

export const assignTechnicianSchema = z.object({
  technicianName: z.string({ required_error: 'Technician name is required' }).min(2, 'Technician name must be at least 2 characters')
});
