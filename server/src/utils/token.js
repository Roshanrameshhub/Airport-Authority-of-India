import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim() === '') {
    throw new Error('FATAL SECURITY CONFIGURATION ERROR: JWT_SECRET environment variable is missing or empty. Application cannot operate without a cryptographically secure secret.');
  }
  return secret;
};

const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || '7d';

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
    getJwtSecret(),
    { expiresIn: getJwtExpiresIn() }
  );
};

/**
 * Verifies and decodes a JWT token
 * @param {string} token 
 * @returns {Object} Decoded payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, getJwtSecret());
};
