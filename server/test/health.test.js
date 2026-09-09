import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

import test from 'node:test';
import assert from 'node:assert';
import dotenv from 'dotenv';
dotenv.config();
process.env.NODE_ENV = 'test';
process.env.USE_MEMORY_DB = 'true';

import mongoose from 'mongoose';
import connectDB, { disconnectDB } from '../src/config/db.js';

test('Database Connection Verification', async (t) => {
  await t.test('Should connect successfully to MongoDB', async () => {
    const conn = await connectDB();
    assert.ok(conn, 'Mongoose connection instance should exist');
    assert.strictEqual(mongoose.connection.readyState, 1, 'Mongoose readyState should be 1 (connected)');
    await disconnectDB();
  });
});
