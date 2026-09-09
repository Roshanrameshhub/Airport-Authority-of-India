import { Router } from 'express';
import { login, getMe, register, logout } from '../controllers/authController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validations/authValidation.js';
import { sendSuccess } from '../utils/apiResponse.js';

const router = Router();

// Public Authentication Endpoints
router.post('/login', validate(loginSchema), login);
router.post('/register', validate(registerSchema), register);

// Protected Endpoints
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

// Role Verification Test Endpoints
router.get('/admin-only', protect, authorize('ADMIN'), (req, res) => {
  return sendSuccess(res, { accessGranted: true, role: req.user.role }, 'Welcome, Admin. Access granted.');
});

router.get('/employee-only', protect, authorize('EMPLOYEE'), (req, res) => {
  return sendSuccess(res, { accessGranted: true, role: req.user.role }, 'Welcome, Employee. Access granted.');
});

export default router;
