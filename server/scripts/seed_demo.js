/**
 * seed_demo.js — AAI-AMS Development Demo Account Seeder
 *
 * Idempotent: safe to run multiple times without creating duplicates.
 *
 * Creates/updates exactly TWO demo accounts:
 *   ADMIN    : Username=Admin      | Password=Admin@123    | Role=ADMIN
 *   EMPLOYEE : Username=Employee01 | Password=Employee@123 | Role=EMPLOYEE | EmpID=AAI-EMP-01
 *
 * Also seeds departments, categories, a demo asset, assignment, and complaint.
 *
 * Usage:
 *   npm run seed:demo      (from server/ directory)
 *   node scripts/seed_demo.js
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { seedDemoAccounts } from '../src/services/seedService.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('');
  console.error('  ERROR: MONGODB_URI is not set in server/.env');
  console.error('  Create server/.env and add: MONGODB_URI=<your-connection-string>');
  console.error('');
  process.exit(1);
}

async function run() {
  console.log('');
  console.log('================================================================');
  console.log('  AAI-AMS DEMO ACCOUNT SEEDER');
  console.log('================================================================');
  console.log('  Target credentials:');
  console.log('  ADMIN    : Username=Admin      | Password=Admin@123');
  console.log('  EMPLOYEE : Username=Employee01 | Password=Employee@123');
  console.log('================================================================');
  console.log('');

  try {
    console.log('[1/3] Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000, autoIndex: true });
    console.log(`[1/3] Connected: ${mongoose.connection.host} / ${mongoose.connection.name}`);

    console.log('[2/3] Running seed...');
    const result = await seedDemoAccounts();
    console.log(`[2/3] Seed complete.`);
    console.log(`      Admin   : username='${result.admin.username}' | role='${result.admin.role}'`);
    console.log(`      Employee: username='${result.employee.username}' | role='${result.employee.role}' | employeeId='${result.employee.employeeId}'`);

    console.log('[3/3] Disconnecting...');
    await mongoose.disconnect();
    console.log('[3/3] Disconnected cleanly.');

    console.log('');
    console.log('================================================================');
    console.log('  ✔ SEED COMPLETE — Both demo accounts are ready.');
    console.log('');
    console.log('  ADMIN    : Username=Admin      | Password=Admin@123');
    console.log('  EMPLOYEE : Username=Employee01 | Password=Employee@123');
    console.log('');
    console.log('  NOTE: Usernames are stored lowercase in MongoDB (admin /');
    console.log('  employee01). Login works with "Admin", "ADMIN", or "admin".');
    console.log('================================================================');
    console.log('');
    process.exit(0);
  } catch (err) {
    console.error('');
    console.error('  ✘ SEED FAILED:', err.message);
    console.error('');
    process.exit(1);
  }
}

run();
