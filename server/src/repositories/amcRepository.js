import mongoose from 'mongoose';
import VendorAMC from '../models/VendorAMC.js';
import { calculateWarrantyStatus } from '../utils/warranty.js';
import { logger } from '../utils/logger.js';

const memoryAMCs = new Map();

const seedAMCs = () => {
  if (memoryAMCs.size === 0) {
    const now = new Date();
    const list = [
      {
        _id: '66d800000000000000000001',
        contractNumber: 'AAI-AMC-DELL-2024',
        vendorName: 'Dell Technologies India Pvt Ltd',
        serviceType: 'HARDWARE_SUPPORT',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2026-12-31'),
        supportTier: '24x7_CRITICAL_4HR',
        contactPerson: 'Arunav Sengupta (Technical Account Manager)',
        contactPhone: '+91 1800 425 0088',
        contactEmail: 'aai.support@dell.com',
        coveredCategories: ['Desktop PC / Workstation', 'Laptop / Notebook'],
        annualCostINR: 485000,
        remarks: 'Covers regional ATC tower and CNS technical workstations'
      },
      {
        _id: '66d800000000000000000002',
        vendorName: 'HP Enterprise Services India',
        contractNumber: 'AAI-AMC-HP-2024',
        serviceType: 'PRINTER_PERIPHERAL_SLA',
        startDate: new Date('2024-04-01'),
        endDate: new Date('2027-03-31'),
        supportTier: 'SAME_DAY_8HR',
        contactPerson: 'Meera Deshmukh (Regional Service Lead)',
        contactPhone: '+91 1800 258 7170',
        contactEmail: 'support.gov@hp.com',
        coveredCategories: ['Network Multi-Function Printer', 'High-Speed Document Scanner'],
        annualCostINR: 195000,
        remarks: 'Includes replacement rollers, drums, and scanner feed kits'
      },
      {
        _id: '66d800000000000000000003',
        contractNumber: 'AAI-AMC-APC-2024',
        vendorName: 'Schneider Electric IT Business India',
        serviceType: 'UPS_POWER_SLA',
        startDate: new Date('2023-09-01'),
        // Expiring in 18 days
        endDate: new Date(now.getTime() + 18 * 24 * 3600 * 1000),
        supportTier: '24x7_CRITICAL_4HR',
        contactPerson: 'Karthik Raman (Power Support Engineer)',
        contactPhone: '+91 1800 103 0011',
        contactEmail: 'apc.aai@se.com',
        coveredCategories: ['Online UPS System', 'Power Distribution Unit'],
        annualCostINR: 320000,
        remarks: 'Quarterly battery impedance testing and emergency capacitor overhaul'
      },
      {
        _id: '66d800000000000000000004',
        contractNumber: 'AAI-AMC-CISCO-2023',
        vendorName: 'Cisco Systems India Pvt Ltd',
        serviceType: 'NETWORK_MAINTENANCE',
        startDate: new Date('2022-01-01'),
        // Expired 60 days ago
        endDate: new Date(now.getTime() - 60 * 24 * 3600 * 1000),
        supportTier: 'NEXT_BUSINESS_DAY',
        contactPerson: 'Rajeev Menon',
        contactPhone: '+91 1800 553 6387',
        contactEmail: 'cisco.tac@cisco.com',
        coveredCategories: ['Core Network Switch', 'Airport VLAN Router'],
        annualCostINR: 540000,
        remarks: 'Renewal pending commercial tender approval from Regional Finance'
      }
    ];

    for (const item of list) {
      memoryAMCs.set(item.contractNumber, {
        ...item,
        status: calculateWarrantyStatus(item.endDate)
      });
    }
  }
};

seedAMCs();

const isDbConnected = () => mongoose.connection.readyState === 1;

export const amcRepository = {
  find: async ({ search, status, serviceType } = {}) => {
    seedAMCs();

    if (isDbConnected()) {
      try {
        const filter = {};
        if (serviceType) filter.serviceType = serviceType;
        if (search) {
          const regex = new RegExp(search, 'i');
          filter.$or = [
            { contractNumber: regex },
            { vendorName: regex },
            { contactPerson: regex }
          ];
        }

        const items = await VendorAMC.find(filter).sort({ endDate: 1 }).lean();
        const enriched = items.map(item => ({
          ...item,
          status: calculateWarrantyStatus(item.endDate)
        }));

        if (status) {
          return enriched.filter(i => i.status === status.toUpperCase());
        }

        return enriched;
      } catch (err) {
        logger.warn(`MongoDB AMC find failed: ${err.message}. Using memory store.`);
      }
    }

    let list = Array.from(memoryAMCs.values());

    if (serviceType) {
      list = list.filter(c => c.serviceType === serviceType);
    }

    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c =>
        c.contractNumber.toLowerCase().includes(s) ||
        c.vendorName.toLowerCase().includes(s) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(s))
      );
    }

    list = list.map(c => ({
      ...c,
      status: calculateWarrantyStatus(c.endDate)
    }));

    if (status) {
      list = list.filter(c => c.status === status.toUpperCase());
    }

    list.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
    return list;
  },

  findById: async (idOrNumber) => {
    seedAMCs();

    if (isDbConnected()) {
      try {
        const doc = await VendorAMC.findOne({
          $or: [
            { contractNumber: idOrNumber.toUpperCase() },
            mongoose.isValidObjectId(idOrNumber) ? { _id: idOrNumber } : null
          ].filter(Boolean)
        }).lean();

        if (doc) {
          return {
            ...doc,
            status: calculateWarrantyStatus(doc.endDate)
          };
        }
      } catch (err) {
        logger.warn(`MongoDB AMC findById failed: ${err.message}`);
      }
    }

    const found = memoryAMCs.get(idOrNumber.toUpperCase()) ||
      Array.from(memoryAMCs.values()).find(c => c._id === idOrNumber);

    if (found) {
      return {
        ...found,
        status: calculateWarrantyStatus(found.endDate)
      };
    }

    return null;
  },

  create: async (data) => {
    const amcRecord = {
      _id: `mem_amc_${Date.now()}`,
      ...data,
      contractNumber: data.contractNumber.toUpperCase(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (isDbConnected()) {
      try {
        const created = await VendorAMC.create(amcRecord);
        const obj = created.toObject();
        return {
          ...obj,
          status: calculateWarrantyStatus(obj.endDate)
        };
      } catch (err) {
        logger.warn(`Failed to create AMC in MongoDB: ${err.message}`);
      }
    }

    const saved = {
      ...amcRecord,
      status: calculateWarrantyStatus(amcRecord.endDate)
    };
    memoryAMCs.set(amcRecord.contractNumber, saved);
    return saved;
  },

  getAlerts: async () => {
    seedAMCs();
    const all = await amcRepository.find();
    return all.filter(c => c.status === 'EXPIRING_SOON' || c.status === 'EXPIRED');
  }
};
