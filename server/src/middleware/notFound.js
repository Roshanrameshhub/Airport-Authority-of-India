import { sendError } from '../utils/apiResponse.js';

export const notFound = (req, res, next) => {
  return sendError(res, `API route not found: [${req.method}] ${req.originalUrl}`, 404);
};
