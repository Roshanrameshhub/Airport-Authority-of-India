import { employeeRepository } from '../repositories/employeeRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/apiResponse.js';

/**
 * Generate a strong, readable temporary password
 * e.g., Aai#7kH3qR (10 characters: uppercase, lowercase, numbers, special char)
 */
const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let random = '';
  for (let i = 0; i < 6; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `Aai#${random}`;
};

export const getEmployees = async (req, res, next) => {
  try {
    const { search = '', department = '', floor = '', employeeType = '', employmentCategory = '', page = 1, limit = 10 } = req.query;
    const { items, total } = await employeeRepository.find({
      search,
      department,
      floor,
      employeeType,
      employmentCategory,
      page: Number(page),
      limit: Number(limit)
    });

    return sendPaginated(res, items, { page, limit, total }, 'Employees retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employee = await employeeRepository.findById(id);

    if (!employee) {
      return sendError(res, `Employee not found with identifier: ${id}`, 404);
    }

    return sendSuccess(res, employee, 'Employee details retrieved');
  } catch (error) {
    next(error);
  }
};

export const createEmployee = async (req, res, next) => {
  try {
    const { employeeId, createLoginAccount = true } = req.body;
    const cleanEmpId = employeeId.trim().toUpperCase();

    // Check collision in employee registry
    const existing = await employeeRepository.findByEmployeeId(cleanEmpId);
    if (existing) {
      return sendError(res, `Employee ID '${cleanEmpId}' is already registered in the system.`, 409);
    }

    // Check collision in user accounts if login creation requested
    if (createLoginAccount) {
      const existingUserByUsername = await userRepository.findByCredential(cleanEmpId);
      const existingUserByEmpId = await userRepository.findByEmployeeId(cleanEmpId);
      if (existingUserByUsername || existingUserByEmpId) {
        return sendError(res, `A User login account with Username/Employee ID '${cleanEmpId}' already exists.`, 409);
      }

      if (req.body.email && req.body.email.trim()) {
        const existingUserByEmail = await userRepository.findByCredential(req.body.email.trim());
        if (existingUserByEmail) {
          return sendError(res, `A User login account with email '${req.body.email.trim()}' already exists.`, 409);
        }
      }
    }

    // Create Employee master record
    const newEmp = await employeeRepository.create({
      ...req.body,
      employeeId: cleanEmpId
    });

    // Audit Logging: Employee Created
    await auditRepository.logEvent({
      action: 'EMPLOYEE_CREATED',
      entityType: 'EMPLOYEE',
      entityId: newEmp.employeeId,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        employeeId: newEmp.employeeId,
        name: newEmp.name,
        department: newEmp.department,
        designation: newEmp.designation,
        floor: newEmp.floor
      },
      status: 'SUCCESS'
    });

    let accountDetails = null;

    // Automatically create User account if requested
    if (createLoginAccount) {
      const tempPassword = generateTempPassword();
      const rawUsername = cleanEmpId;
      const userEmail = newEmp.email && newEmp.email.trim()
        ? newEmp.email.trim().toLowerCase()
        : `${cleanEmpId.toLowerCase().replace(/[^a-z0-9]/g, '')}@aai.local`;

      const newUser = await userRepository.create({
        username: rawUsername.toLowerCase(),
        name: newEmp.name,
        email: userEmail,
        password: tempPassword,
        role: 'EMPLOYEE',
        employeeId: newEmp.employeeId,
        designation: newEmp.designation || '',
        department: newEmp.department || '',
        isActive: true
      });

      // Audit Logging: Login Account Created (Never log plaintext password!)
      await auditRepository.logEvent({
        action: 'LOGIN_ACCOUNT_CREATED',
        entityType: 'AUTH',
        entityId: newUser.username,
        actor: {
          userId: req.user?._id || req.user?.id,
          username: req.user?.username || 'admin',
          name: req.user?.name || 'Administrator',
          role: req.user?.role || 'ADMIN',
          ipAddress: req.ip || '127.0.0.1'
        },
        details: {
          employeeId: newEmp.employeeId,
          username: newUser.username,
          name: newEmp.name,
          role: 'EMPLOYEE',
          autoGenerated: true
        },
        status: 'SUCCESS'
      });

      accountDetails = {
        employeeId: newEmp.employeeId,
        name: newEmp.name,
        username: rawUsername,
        tempPassword: tempPassword
      };
    }

    const responsePayload = {
      ...(newEmp.toObject ? newEmp.toObject() : newEmp),
      accountCreated: !!accountDetails,
      accountDetails: accountDetails
    };

    return sendSuccess(res, responsePayload, accountDetails ? 'Employee and login account created successfully' : 'Employee registered successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentEmp = await employeeRepository.findById(id);

    if (!currentEmp) {
      return sendError(res, `Employee not found to update: ${id}`, 404);
    }

    const updated = await employeeRepository.update(id, req.body);

    if (!updated) {
      return sendError(res, `Employee not found to update: ${id}`, 404);
    }

    // Determine field-level diffs for accountability
    const changes = {};
    const oldValues = {};
    const newValues = {};
    const trackedFields = ['name', 'designation', 'department', 'floor', 'email', 'phone'];
    for (const field of trackedFields) {
      if (req.body[field] !== undefined && String(req.body[field]) !== String(currentEmp[field])) {
        changes[field] = { from: currentEmp[field], to: req.body[field] };
        oldValues[field] = currentEmp[field];
        newValues[field] = req.body[field];
      }
    }

    // Audit Logging
    await auditRepository.logEvent({
      action: 'EMPLOYEE_UPDATED',
      entityType: 'EMPLOYEE',
      entityId: updated.employeeId || id,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        employeeId: updated.employeeId,
        name: updated.name,
        changes,
        oldValues,
        newValues
      },
      status: 'SUCCESS'
    });

    return sendSuccess(res, updated, 'Employee profile updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentEmp = await employeeRepository.findById(id);

    const deleted = await employeeRepository.delete(id);

    if (!deleted) {
      return sendError(res, `Employee not found to deactivate: ${id}`, 404);
    }

    // Audit Logging
    await auditRepository.logEvent({
      action: 'EMPLOYEE_DEACTIVATED',
      entityType: 'EMPLOYEE',
      entityId: currentEmp?.employeeId || id,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        employeeId: currentEmp?.employeeId || id,
        name: currentEmp?.name,
        department: currentEmp?.department,
        message: 'Employee deactivated and archived from active operational roster'
      },
      status: 'SUCCESS'
    });

    return sendSuccess(res, null, 'Employee deactivated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get account login status for an employee
 */
export const getEmployeeAccountStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employee = await employeeRepository.findById(id);
    if (!employee) {
      return sendError(res, `Employee not found with identifier: ${id}`, 404);
    }

    const user = await userRepository.findByEmployeeId(employee.employeeId) || await userRepository.findByCredential(employee.employeeId);
    if (!user) {
      return sendSuccess(res, {
        hasAccount: false,
        employeeId: employee.employeeId
      }, 'No login account found for this employee');
    }

    return sendSuccess(res, {
      hasAccount: true,
      employeeId: employee.employeeId,
      username: employee.employeeId,
      userUsername: user.username,
      isActive: user.isActive,
      role: user.role,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    }, 'Account status retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Reset employee login password with an automatically generated strong temporary password
 */
export const resetEmployeePassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employee = await employeeRepository.findById(id);
    if (!employee) {
      return sendError(res, `Employee not found with identifier: ${id}`, 404);
    }

    const user = await userRepository.findByEmployeeId(employee.employeeId) || await userRepository.findByCredential(employee.employeeId);
    if (!user) {
      return sendError(res, `No login account exists for employee '${employee.employeeId}'.`, 404);
    }

    const tempPassword = generateTempPassword();
    await userRepository.updatePassword(user._id, tempPassword);

    // Audit Logging: Password Reset (Never log plaintext password!)
    await auditRepository.logEvent({
      action: 'PASSWORD_RESET',
      entityType: 'AUTH',
      entityId: user.username,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        employeeId: employee.employeeId,
        username: user.username,
        name: employee.name,
        message: 'Temporary password generated by Administrator'
      },
      status: 'SUCCESS'
    });

    return sendSuccess(res, {
      employeeId: employee.employeeId,
      name: employee.name,
      username: employee.employeeId,
      tempPassword: tempPassword
    }, 'Temporary password generated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Enable or disable an employee's login account
 */
export const toggleEmployeeLogin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employee = await employeeRepository.findById(id);
    if (!employee) {
      return sendError(res, `Employee not found with identifier: ${id}`, 404);
    }

    const user = await userRepository.findByEmployeeId(employee.employeeId) || await userRepository.findByCredential(employee.employeeId);
    if (!user) {
      return sendError(res, `No login account exists for employee '${employee.employeeId}'.`, 404);
    }

    const targetStatus = req.body.isActive !== undefined ? Boolean(req.body.isActive) : !user.isActive;
    await userRepository.setUserStatus(user._id, targetStatus);

    // Audit Logging: Login Enabled / Disabled
    await auditRepository.logEvent({
      action: targetStatus ? 'LOGIN_ENABLED' : 'LOGIN_DISABLED',
      entityType: 'AUTH',
      entityId: user.username,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        employeeId: employee.employeeId,
        username: user.username,
        name: employee.name,
        isActive: targetStatus
      },
      status: 'SUCCESS'
    });

    return sendSuccess(res, {
      employeeId: employee.employeeId,
      username: employee.employeeId,
      isActive: targetStatus
    }, targetStatus ? 'Login account enabled successfully' : 'Login account disabled successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create login account for an existing employee who does not have one
 */
export const createEmployeeLogin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employee = await employeeRepository.findById(id);
    if (!employee) {
      return sendError(res, `Employee not found with identifier: ${id}`, 404);
    }

    const cleanEmpId = employee.employeeId.trim().toUpperCase();
    const existingUser = await userRepository.findByEmployeeId(cleanEmpId) || await userRepository.findByCredential(cleanEmpId);
    if (existingUser) {
      return sendError(res, `A login account already exists for employee '${cleanEmpId}'.`, 409);
    }

    const tempPassword = generateTempPassword();
    const userEmail = employee.email && employee.email.trim()
      ? employee.email.trim().toLowerCase()
      : `${cleanEmpId.toLowerCase().replace(/[^a-z0-9]/g, '')}@aai.local`;

    const newUser = await userRepository.create({
      username: cleanEmpId.toLowerCase(),
      name: employee.name,
      email: userEmail,
      password: tempPassword,
      role: 'EMPLOYEE',
      employeeId: cleanEmpId,
      designation: employee.designation || '',
      department: employee.department || '',
      isActive: true
    });

    await auditRepository.logEvent({
      action: 'LOGIN_ACCOUNT_CREATED',
      entityType: 'AUTH',
      entityId: newUser.username,
      actor: {
        userId: req.user?._id || req.user?.id,
        username: req.user?.username || 'admin',
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'ADMIN',
        ipAddress: req.ip || '127.0.0.1'
      },
      details: {
        employeeId: cleanEmpId,
        username: newUser.username,
        name: employee.name,
        role: 'EMPLOYEE',
        autoGenerated: true
      },
      status: 'SUCCESS'
    });

    return sendSuccess(res, {
      employeeId: cleanEmpId,
      name: employee.name,
      username: cleanEmpId,
      tempPassword: tempPassword
    }, 'Login account created successfully', 201);
  } catch (error) {
    next(error);
  }
};

