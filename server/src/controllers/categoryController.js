import { categoryRepository } from '../repositories/categoryRepository.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const getCategories = async (req, res, next) => {
  try {
    const categories = await categoryRepository.findAll();
    return sendSuccess(res, categories, 'Categories retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const { name, code } = req.body;
    const existing = await categoryRepository.findByNameOrCode(name, code);
    if (existing) {
      return sendError(res, `Category with name '${name}' or code '${code}' already exists.`, 409);
    }
    const newCat = await categoryRepository.create(req.body);
    return sendSuccess(res, newCat, 'Category created successfully', 201);
  } catch (error) {
    next(error);
  }
};
