import { sendError } from '../utils/apiResponse.js';

/**
 * Validates request body, query, or params against a Zod schema
 * @param {import('zod').ZodSchema} schema 
 * @param {'body' | 'query' | 'params'} source 
 */
export const validate = (schema, source = 'body') => (req, res, next) => {
  try {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errorDetails = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      return sendError(res, 'Request validation failed', 400, errorDetails);
    }
    req[source] = result.data;
    next();
  } catch (error) {
    next(error);
  }
};
