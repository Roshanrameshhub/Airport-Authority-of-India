/**
 * migrate_phase11.js — AAI AMS Database Migration Script (Phase 11)
 *
 * Idempotent, safe migration that evolves legacy asset documents into the rich common model:
 * 1. Derives & backfills 'assetType' from category / assetName.
 * 2. Normalizes legacy 'vendor' into canonical 'supplier'.
 * 3. Populates default institutional location ('Chennai Airport') if missing.
 * 4. Normalizes operational status & physical condition ratings.
 * 5. Ensures boolean flag for 'amcApplicable'.
 * 6. Initializes type-specific subdocuments (computerConfig, displayConfig, powerConfig) when applicable.
 *
 * Supports:
 *   - Standalone CLI execution with --dry-run and --verbose flags.
 *   - Programmatic execution via exported migrateAssets() function.
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Asset from '../src/models/Asset.js';
import { assetRepository } from '../src/repositories/assetRepository.js';

export const deriveAssetType = (category = '', assetName = '') => {
  const combined = `${category} ${assetName}`.toLowerCase();
  if (combined.includes('ups') || combined.includes('power supply') || combined.includes('inverter')) return 'UPS';
  if (combined.includes('printer') || combined.includes('laserjet') || combined.includes('mfd') || combined.includes('deskjet')) return 'PRINTER';
  if (combined.includes('scanner')) return 'SCANNER';
  if (combined.includes('monitor') || combined.includes('display') || combined.includes('screen') || combined.includes('tft')) return 'MONITOR';
  if (combined.includes('server')) return 'SERVER';
  if (combined.includes('laptop') || combined.includes('notebook')) return 'LAPTOP';
  if (combined.includes('desktop') || combined.includes('workstation') || combined.includes('tower') || /\bpc\b/.test(combined)) return 'DESKTOP';
  if (combined.includes('switch') || combined.includes('router') || combined.includes('network') || combined.includes('firewall') || combined.includes('access point')) return 'NETWORK';
  if (combined.includes('storage') || combined.includes('nas') || combined.includes('san')) return 'STORAGE';
  if (combined.includes('keyboard') || combined.includes('mouse') || combined.includes('peripheral')) return 'PERIPHERAL';
  return 'OTHER';
};

export async function migrateAssets(options = {}) {
  const { dryRun = false, verbose = false } = options;
  const startTime = Date.now();

  const isMongoose = mongoose.connection.readyState === 1;
  let assets;
  if (isMongoose) {
    assets = await Asset.find({});
  } else {
    const listResult = await assetRepository.find({ limit: 10000 });
    assets = Array.isArray(listResult) ? listResult : (listResult.items || []);
  }

  let totalScanned = assets.length;
  let updatedCount = 0;
  let unchangedCount = 0;
  const details = [];

  for (const doc of assets) {
    const changes = {};

    // 1. Asset Type derivation
    if (!doc.assetType || doc.assetType === 'OTHER') {
      const derived = deriveAssetType(doc.category, doc.assetName);
      if (derived && derived !== doc.assetType) {
        changes.assetType = { from: doc.assetType, to: derived };
      }
    }

    // 2. Normalize vendor -> supplier
    if (!doc.supplier && doc.vendor) {
      changes.supplier = { from: doc.supplier, to: doc.vendor };
    }

    // 3. Normalize default location
    if (!doc.location) {
      changes.location = { from: doc.location, to: 'Chennai Airport' };
    }

    // 4. Normalize status
    if (!doc.status) {
      const derivedStatus = doc.currentEmployeeId ? 'ASSIGNED' : 'AVAILABLE';
      changes.status = { from: doc.status, to: derivedStatus };
    }

    // 5. Normalize condition
    if (!doc.condition) {
      changes.condition = { from: doc.condition, to: 'GOOD' };
    }

    // 6. Ensure boolean for amcApplicable
    if (doc.amcApplicable === undefined || doc.amcApplicable === null) {
      changes.amcApplicable = { from: doc.amcApplicable, to: false };
    }

    // 7. Subsystem configs initialization if applicable
    const targetType = changes.assetType ? changes.assetType.to : doc.assetType;

    if (['DESKTOP', 'LAPTOP', 'SERVER', 'WORKSTATION'].includes(targetType)) {
      if (!doc.computerConfig) {
        changes.computerConfig = {
          from: null,
          to: {
            processor: '',
            ramSizeGb: targetType === 'SERVER' ? 32 : 16,
            storageCapacityGb: targetType === 'SERVER' ? 1024 : 512,
            storageType: 'SSD',
            hostname: ''
          }
        };
      }
    } else if (['MONITOR', 'DISPLAY'].includes(targetType)) {
      if (!doc.displayConfig) {
        changes.displayConfig = {
          from: null,
          to: {
            screenSizeInches: 24,
            resolution: '1920x1080',
            displayType: 'IPS'
          }
        };
      }
    } else if (['UPS', 'POWER'].includes(targetType)) {
      if (!doc.powerConfig) {
        changes.powerConfig = {
          from: null,
          to: {
            capacityVa: 1000,
            backupTimeMinutes: 15,
            topology: 'Line-Interactive'
          }
        };
      }
    }

    const hasChanges = Object.keys(changes).length > 0;

    if (hasChanges) {
      updatedCount++;
      if (verbose) {
        details.push({ assetId: doc.assetId, changes });
      }

      if (!dryRun) {
        if (isMongoose) {
          for (const [key, change] of Object.entries(changes)) {
            doc[key] = change.to;
          }
          await doc.save();
        } else {
          const updatePayload = {};
          for (const [key, change] of Object.entries(changes)) {
            updatePayload[key] = change.to;
          }
          await assetRepository.update(doc.assetId, updatePayload);
        }
      }
    } else {
      unchangedCount++;
    }
  }

  const durationMs = Date.now() - startTime;

  return {
    totalScanned,
    updatedCount,
    unchangedCount,
    dryRun,
    durationMs,
    details
  };
}

// CLI Execution Handler
if (process.argv[1] && process.argv[1].endsWith('migrate_phase11.js')) {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isVerbose = args.includes('--verbose');

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI environment variable is required.');
    process.exit(1);
  }

  (async () => {
    console.log('====================================================');
    console.log('  AAI-AMS PHASE 11 DATA MIGRATION');
    console.log(`  Mode: ${isDryRun ? 'DRY-RUN (Simulated)' : 'LIVE EXECUTION'}`);
    console.log('====================================================');

    try {
      console.log('Connecting to database...');
      await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
      console.log('Connected successfully.');

      const result = await migrateAssets({ dryRun: isDryRun, verbose: isVerbose });

      console.log('----------------------------------------------------');
      console.log(`  Total Assets Scanned : ${result.totalScanned}`);
      console.log(`  Assets Requiring Fix : ${result.updatedCount}`);
      console.log(`  Already Normalized   : ${result.unchangedCount}`);
      console.log(`  Execution Duration   : ${result.durationMs}ms`);
      console.log('----------------------------------------------------');

      if (isVerbose && result.details.length > 0) {
        console.log('Detailed Changes:');
        console.log(JSON.stringify(result.details, null, 2));
      }

      await mongoose.disconnect();
      console.log('Migration process completed successfully.');
      process.exit(0);
    } catch (err) {
      console.error('Migration failed with error:', err);
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      process.exit(1);
    }
  })();
}
