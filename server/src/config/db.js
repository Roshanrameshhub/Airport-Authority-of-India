import dns from 'node:dns';
// Ensure reliable DNS resolution for Atlas and internal binaries on Windows
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

let mongod = null;

const connectDB = async () => {
  const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.USE_MEMORY_DB === 'true';

  // 1. Automated Test Architecture ONLY: Use MongoMemoryServer when explicitly running tests
  if (isTestEnvironment) {
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      logger.info('[Test Architecture] Initializing MongoMemoryServer for automated test suite...');
      if (!mongod) {
        mongod = await MongoMemoryServer.create({
          instance: {
            dbName: 'aai_ams_test'
          }
        });
      }
      const memoryUri = mongod.getUri();
      const conn = await mongoose.connect(memoryUri, {
        autoIndex: true
      });
      logger.info(`[Test Architecture] Connected to in-memory test database at ${memoryUri}`);
      return conn;
    } catch (testDbError) {
      logger.error(`[Test Architecture] MongoMemoryServer initialization failed: ${testDbError.message}`);
      throw testDbError;
    }
  }

  // 2. Development and Production: MongoDB Atlas is the ONLY database
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    const errorMsg = 'CRITICAL: MONGODB_URI is not defined in environment variables! A valid MongoDB Atlas connection string is required for development and production.';
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  const maskedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');

  try {
    logger.info('Connecting to MongoDB Atlas cluster...');
    logger.info(`Target Cluster: ${maskedUri}`);

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });

    logger.info(`[MongoDB Atlas] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    const isIpWhitelistError = 
      error.message.includes('whitelist') || 
      error.message.includes('Could not connect to any servers') ||
      error.name === 'MongooseServerSelectionError';

    const detailedErrorBanner = [
      '',
      '================================================================================',
      '[CRITICAL DATABASE ERROR] Failed to connect to MongoDB Atlas!',
      `Error Message: ${error.message}`,
      '--------------------------------------------------------------------------------',
      'TROUBLESHOOTING GUIDE FOR MONGODB ATLAS:',
      ...(isIpWhitelistError ? [
        '1. IP WHITELIST (Most Common Cause):',
        '   Your current machine\'s public IP address is not whitelisted on MongoDB Atlas.',
        '   - Go to: https://cloud.mongodb.com/',
        '   - Navigate to: Project -> Network Access -> IP Access List',
        '   - Click "Add IP Address" -> Click "Add Current IP Address" (or "0.0.0.0/0" for dev access)',
        '   - Confirm and allow 1-2 minutes for the firewall changes to apply.'
      ] : []),
      '2. CLUSTER CREDENTIALS / CONNECTION STRING:',
      `   Verify the username, password, and cluster host in server/.env:`,
      `   Configured URI: ${maskedUri}`,
      '3. NETWORK FIREWALL / DNS:',
      '   Ensure outbound connections on TCP port 27017 and DNS SRV lookups are allowed.',
      '================================================================================',
      ''
    ].join('\n');

    logger.error(detailedErrorBanner);

    // Fail clearly with descriptive error — DO NOT fall back to MongoMemoryServer
    throw new Error(`[MongoDB Atlas Connection Failed] ${error.message}`);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
      mongod = null;
    }
  } catch (error) {
    logger.error('Error during database disconnection:', error);
  }
};

export default connectDB;

