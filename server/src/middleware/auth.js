import { verifyToken } from '../utils/token.js';
import { userRepository } from '../repositories/userRepository.js';
import { sendError } from '../utils/apiResponse.js';

/**
 * Protect middleware: Validates JWT Bearer token and attaches user
 */
export const protect = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return sendError(res, 'Authentication required. No token provided.', 401);
    }

    // Verify JWT
    const decoded = verifyToken(token);
    const user = await userRepository.findById(decoded.id);

    if (!user) {
      return sendError(res, 'The user associated with this token no longer exists.', 401);
    }

    if (!user.isActive) {
      return sendError(res, 'Account has been deactivated. Please contact IT Administrator.', 403);
    }

    // Attach user object to request
    req.user = {
      _id: user._id,
      id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      department: user.department,
      designation: user.designation
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return sendError(res, 'Invalid authentication token.', 401);
    }
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Authentication token has expired. Please log in again.', 401);
    }
    return sendError(res, `Authentication error: ${error.message}`, 401);
  }
};

/**
 * Role-Based Access Control (RBAC) middleware
 * @param  {...string} roles Allowed roles (e.g. 'ADMIN', 'EMPLOYEE')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'User identity not established', 401);
    }

    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied: [${req.user.role}] role is not authorized to access this resource. Requires: [${roles.join(', ')}]`,
        403
      );
    }

    next();
  };
};
