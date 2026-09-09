/**
 * Standardized API Response Utilities
 * Enforces consistent JSON envelope across all endpoints
 */

export const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

export const sendPaginated = (res, items = [], pagination = {}, message = 'Data retrieved successfully', statusCode = 200) => {
  const { page = 1, limit = 10, total = 0 } = pagination;
  const totalPages = Math.ceil(total / limit) || 1;

  return res.status(statusCode).json({
    success: true,
    message,
    data: items,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: Number(total),
      totalPages,
      hasNext: Number(page) < totalPages,
      hasPrev: Number(page) > 1
    },
    timestamp: new Date().toISOString()
  });
};

export const sendError = (res, message = 'Internal Server Error', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};
