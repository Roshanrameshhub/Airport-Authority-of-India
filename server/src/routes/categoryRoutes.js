import { Router } from 'express';
import { getCategories, createCategory } from '../controllers/categoryController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createCategorySchema } from '../validations/masterValidation.js';

const router = Router();

// Category Routes
router.get('/', protect, getCategories);
router.post('/', protect, authorize('ADMIN'), validate(createCategorySchema), createCategory);

export default router;
