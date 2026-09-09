import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { seedDemoAccounts } from '../src/services/seedService.js';
import { logger } from '../src/utils/logger.js';

const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    logger.error('MONGODB_URI is not set in server/.env');
    process.exit(1);
  }

  try {
    logger.info('Connecting directly to MongoDB Atlas...');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000, autoIndex: true });
    logger.info(`Connected to MongoDB Atlas: ${mongoose.connection.host}/${mongoose.connection.name}`);

    await seedDemoAccounts();

    logger.info('Seed completed successfully. Disconnecting...');
    await mongoose.disconnect();
    logger.info('Clean shutdown.');
    process.exit(0);
  } catch (err) {
    logger.error(`Seed failed: ${err.message}`, err);
    process.exit(1);
  }
};

run();
