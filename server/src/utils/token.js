import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'aai_regional_office_ams_jwt_secret_key_2026_production_grade';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generates a signed JWT for an authenticated user
 * @param {Object} user 
 * @returns {string} Signed JWT
 */
export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id || user.id,
      username: user.username,
      role: user.role,
      employeeId: user.employeeId || null,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Verifies and decodes a JWT token
 * @param {string} token 
 * @returns {Object} Decoded payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};
