/**
 * seed_demo.js
 * Reseed and verify the standard demo accounts (Admin & Employee) in MongoDB Atlas.
 * Run directly via: node scripts/seed_demo.js or npm run seed:demo
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { seedDemoAccounts } from '../src/services/seedService.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI is not set in server/.env');
  process.exit(1);
}

async function run() {
  console.log('Connecting to MongoDB Atlas...');
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB Atlas successfully.');

    await seedDemoAccounts();
    console.log('✔ Demo accounts (Admin & Employee) successfully seeded and verified.');

    await mongoose.disconnect();
    console.log('Disconnected cleanly.');
    process.exit(0);
  } catch (err) {
    console.error('Error reseeding demo accounts:', err.message);
    process.exit(1);
  }
}

run();
