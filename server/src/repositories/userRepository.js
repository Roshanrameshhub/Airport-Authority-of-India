import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';

// Autonomous in-memory registry for development / test fallback
const memoryUsers = new Map();

/**
 * Seed initial administrative and employee accounts.
 * Credentials:
 *   ADMIN    : username=admin      (login as "Admin")      | password=Admin@123
 *   EMPLOYEE : username=employee01 (login as "Employee01") | password=Employee@123
 *
 * These are also stored in MongoDB via seedService.js (npm run seed:demo).
 * This in-memory registry is the offline/fallback path when MongoDB is down.
 */
const seedMemoryUsers = () => {
  if (memoryUsers.size === 0) {
    const adminPasswordHash = bcrypt.hashSync('Admin@123', 10);
    const employeePasswordHash = bcrypt.hashSync('Employee@123', 10);
    const legacyAdminHash = bcrypt.hashSync('AAIAdmin@2026!', 10);
    const legacyEmpHash = bcrypt.hashSync('AAIEmployee@2026!', 10);

    const adminUser = {
      _id: '66d000000000000000000001',
      username: 'admin',
      name: 'System Administrator',
      email: 'admin@aai.local',
      password: adminPasswordHash,
      role: 'ADMIN',
      employeeId: 'AAI-ADMIN-001',
      designation: 'Joint General Manager (IT)',
      department: 'Airport Systems & Information Technology',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      comparePassword: async function (candidatePassword) {
        return (await bcrypt.compare(candidatePassword, this.password)) || (await bcrypt.compare(candidatePassword, legacyAdminHash));
      },
      toJSON: function () {
        const copy = { ...this };
        delete copy.password;
        return copy;
      }
    };

    const employee01User = {
      _id: '66d000000000000000000002',
      username: 'employee01',
      name: 'Demo Employee',
      email: 'employee01@aai.local',
      password: employeePasswordHash,
      role: 'EMPLOYEE',
      employeeId: 'AAI-EMP-01',
      designation: 'Junior Executive (IT)',
      department: 'Airport Systems & Information Technology',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      comparePassword: async function (candidatePassword) {
        return (await bcrypt.compare(candidatePassword, this.password)) || (await bcrypt.compare(candidatePassword, legacyEmpHash));
      },
      toJSON: function () {
        const copy = { ...this };
        delete copy.password;
        return copy;
      }
    };

    // Legacy employee accounts for backward compatibility with existing tests
    const legacyEmployeeUser = {
      _id: '66d000000000000000000003',
      username: 'employee',
      name: 'Staff Employee',
      email: 'employee@aai.local',
      password: employeePasswordHash,
      role: 'EMPLOYEE',
      employeeId: 'AAI-10842',
      designation: 'Assistant Manager (CNS)',
      department: 'Communication, Navigation & Surveillance',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      comparePassword: async function (candidatePassword) {
        return (await bcrypt.compare(candidatePassword, this.password)) || (await bcrypt.compare(candidatePassword, legacyEmpHash));
      },
      toJSON: function () {
        const copy = { ...this };
        delete copy.password;
        return copy;
      }
    };

    const legacyRoshanUser = {
      ...legacyEmployeeUser,
      _id: '66d000000000000000000004',
      username: 'roshan.r',
      email: 'roshan.r@aai.aero'
    };

    memoryUsers.set('admin', adminUser);
    memoryUsers.set('employee01', employee01User);
    memoryUsers.set('employee', legacyEmployeeUser);
    memoryUsers.set('roshan.r', legacyRoshanUser);
    logger.info('[Memory Registry] Seeded: admin (Admin@123 / ADMIN), employee01 (Employee@123 / EMPLOYEE), plus legacy test accounts');
  }
};


// Initialize seed
seedMemoryUsers();

export const userRepository = {
  /**
   * Find user by username or email
   */
  findByCredential: async (credential) => {
    const term = credential.trim().toLowerCase();

    if (mongoose.connection.readyState === 1) {
      return User.findOne({
        $or: [{ username: term }, { email: term }]
      });
    }

    // Fallback to memory registry
    for (const user of memoryUsers.values()) {
      if (user.username.toLowerCase() === term || user.email.toLowerCase() === term) {
        return user;
      }
    }
    return null;
  },

  /**
   * Find user by unique ID
   */
  findById: async (id) => {
    if (mongoose.connection.readyState === 1) {
      return User.findById(id);
    }

    for (const user of memoryUsers.values()) {
      if (user._id.toString() === id.toString()) {
        return user;
      }
    }
    return null;
  },

  /**
   * Create new user
   */
  create: async (userData) => {
    if (mongoose.connection.readyState === 1) {
      const user = new User(userData);
      return user.save();
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const id = new mongoose.Types.ObjectId().toString();
    const newUser = {
      _id: id,
      ...userData,
      username: userData.username.toLowerCase().trim(),
      email: userData.email.toLowerCase().trim(),
      password: hashedPassword,
      isActive: userData.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
      comparePassword: async function (candidatePassword) {
        return bcrypt.compare(candidatePassword, this.password);
      },
      toJSON: function () {
        const copy = { ...this };
        delete copy.password;
        return copy;
      }
    };

    memoryUsers.set(newUser.username, newUser);
    return newUser;
  },

  /**
   * Update last login timestamp
   */
  updateLastLogin: async (id) => {
    const now = new Date();
    if (mongoose.connection.readyState === 1) {
      return User.findByIdAndUpdate(id, { lastLogin: now });
    }
    const user = await userRepository.findById(id);
    if (user) {
      user.lastLogin = now;
    }
  }
};
