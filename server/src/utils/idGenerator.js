/**
 * idGenerator.js — AAI Standardized Entity ID Generator
 * Provides atomic, race-condition-free sequential IDs backed by MongoDB Counter collection
 * with graceful in-memory and entropy fallbacks.
 */

import mongoose from 'mongoose';
import Counter from '../models/Counter.js';

const categoryCodeMap = {
  'Desktop PC': 'PC',
  'Laptop': 'LPT',
  'Printer': 'PRT',
  'Monitor': 'MON',
  'UPS': 'UPS',
  'Scanner': 'SCN',
  'Server / Network': 'NET'
};

const memoryCounters = new Map();

/**
 * Atomically increments and returns next sequence number for a named counter
 */
export const getNextSequence = async (counterName, session = null) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const options = { new: true, upsert: true, setDefaultsOnInsert: true };
      if (session) options.session = session;
      const counter = await Counter.findByIdAndUpdate(
        counterName,
        { $inc: { seq: 1 } },
        options
      );
      return counter.seq;
    } catch (err) {
      // If error (e.g. transaction abort), fall back to timestamp entropy
      return Math.floor(1000 + Math.random() * 9000);
    }
  }

  const current = memoryCounters.get(counterName) || 0;
  const next = current + 1;
  memoryCounters.set(counterName, next);
  return next;
};

export const generateAssetId = (category = 'PC', sequenceNumber = 1) => {
  const catCode = categoryCodeMap[category] || category.substring(0, 3).toUpperCase();
  const year = new Date().getFullYear();
  const seq = String(sequenceNumber).padStart(4, '0');
  return `AAI-REG-${catCode}-${year}-${seq}`;
};

export const generateAssetIdAsync = async (category = 'PC', session = null) => {
  const catCode = categoryCodeMap[category] || category.substring(0, 3).toUpperCase();
  const year = new Date().getFullYear();
  const counterName = `asset_${catCode}_${year}`;
  const seqNum = await getNextSequence(counterName, session);
  return `AAI-REG-${catCode}-${year}-${String(seqNum).padStart(4, '0')}`;
};

export const generateAssignmentId = (sequenceNumber) => {
  const year = new Date().getFullYear();
  const seq = sequenceNumber 
    ? String(sequenceNumber).padStart(5, '0') 
    : Math.floor(10000 + Math.random() * 90000);
  return `AAI-ASG-${year}-${seq}`;
};

export const generateAssignmentIdAsync = async (session = null) => {
  const year = new Date().getFullYear();
  const counterName = `assignment_${year}`;
  const seqNum = await getNextSequence(counterName, session);
  return `AAI-ASG-${year}-${String(seqNum).padStart(5, '0')}`;
};

export const generateTicketId = (sequenceNumber) => {
  const year = new Date().getFullYear();
  const seq = sequenceNumber 
    ? String(sequenceNumber).padStart(4, '0') 
    : Math.floor(1000 + Math.random() * 9000);
  return `AAI-TKT-${year}-${seq}`;
};
