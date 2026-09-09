import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import app from './app.js';
import connectDB from './config/db.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 5000;

// Catch synchronous exceptions before startup
process.on('uncaughtException', (err) => {
  logger.error('CRITICAL: Uncaught Exception detected! Shutting down...', err);
  process.exit(1);
});

const startServer = async () => {
  try {
    // 1. Establish Database Connection (MongoDB Atlas is the ONLY database for dev & prod)
    logger.info('Initializing connection to MongoDB Atlas database...');
    await connectDB();

    // 2. In development mode, guarantee that the two demo accounts are seeded idempotently in MongoDB Atlas
    if (process.env.NODE_ENV !== 'test') {
      try {
        const { seedDemoAccounts } = await import('./services/seedService.js');
        await seedDemoAccounts();
      } catch (seedErr) {
        logger.warn(`Notice: Demo accounts verification had a notice: ${seedErr.message}`);
      }
    }

    // 3. Start HTTP Listener only after database connects successfully
    const server = app.listen(PORT, () => {
      logger.info(`AAI Asset Management API running in [${process.env.NODE_ENV || 'development'}] mode on port ${PORT}`);
      logger.info(`Health check available at http://localhost:${PORT}/api/v1/health`);
    });

    // Graceful Shutdown
    const handleShutdown = async (signal) => {
      logger.info(`Received ${signal}. Gracefully closing HTTP server & database connections...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        try {
          if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            logger.info('Database connection cleanly terminated.');
          }
        } catch (dbErr) {
          logger.warn(`Error during database disconnect: ${dbErr.message}`);
        }
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Promise Rejection detected:', reason);
      // In production, initiate graceful shutdown
      if (process.env.NODE_ENV === 'production') {
        handleShutdown('unhandledRejection');
      }
    });

  } catch (error) {
    logger.error('================================================================================');
    logger.error('CRITICAL: Server startup aborted because MongoDB Atlas could not be reached.');
    logger.error(`Error: ${error.message}`);
    logger.error('================================================================================');
    process.exit(1);
  }
};

startServer();
