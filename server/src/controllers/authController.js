import { userRepository } from '../repositories/userRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { generateToken } from '../utils/token.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const login = async (req, res, next) => {
  try {
    const { credential, password } = req.body;
    const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';

    // 1. Locate user by username or email
    const user = await userRepository.findByCredential(credential);
    if (!user) {
      await auditRepository.logEvent({
        action: 'USER_LOGIN',
        entityType: 'AUTH',
        entityId: credential,
        actor: { username: credential, ipAddress: clientIp },
        details: { message: 'Failed login attempt: User identifier not found' },
        status: 'FAILED'
      });
      return sendError(res, 'Invalid credentials. User not found.', 401);
    }

    // 2. Check if user is active
    if (!user.isActive) {
      await auditRepository.logEvent({
        action: 'USER_LOGIN',
        entityType: 'AUTH',
        entityId: user.username,
        actor: { userId: user._id, username: user.username, role: user.role, ipAddress: clientIp },
        details: { message: 'Failed login attempt: Account deactivated' },
        status: 'FAILED'
      });
      return sendError(res, 'Account is deactivated. Contact system administrator.', 403);
    }

    // 3. Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await auditRepository.logEvent({
        action: 'USER_LOGIN',
        entityType: 'AUTH',
        entityId: user.username,
        actor: { userId: user._id, username: user.username, role: user.role, ipAddress: clientIp },
        details: { message: 'Failed login attempt: Incorrect password' },
        status: 'FAILED'
      });
      return sendError(res, 'Invalid credentials. Password incorrect.', 401);
    }

    // 4. Update last login
    await userRepository.updateLastLogin(user._id);

    // 5. Generate JWT token
    const token = generateToken(user);

    // 6. Log successful authentication
    await auditRepository.logEvent({
      action: 'USER_LOGIN',
      entityType: 'AUTH',
      entityId: user.username,
      actor: {
        userId: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        ipAddress: clientIp
      },
      details: {
        message: 'Successful user authentication',
        role: user.role,
        department: user.department
      },
      status: 'SUCCESS'
    });

    return sendSuccess(res, {
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        designation: user.designation,
        department: user.department
      }
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res) => {
  return sendSuccess(res, {
    user: req.user
  }, 'User profile retrieved');
};

export const register = async (req, res, next) => {
  try {
    const { username, email } = req.body;

    // Check collision
    const existingUser = await userRepository.findByCredential(username);
    if (existingUser) {
      return sendError(res, `Username '${username}' is already in use.`, 409);
    }

    const existingEmail = await userRepository.findByCredential(email);
    if (existingEmail) {
      return sendError(res, `Email '${email}' is already registered.`, 409);
    }

    const newUser = await userRepository.create(req.body);
    const token = generateToken(newUser);

    return sendSuccess(res, {
      token,
      user: newUser.toJSON()
    }, 'User account created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  return sendSuccess(res, null, 'Logged out successfully');
};
