import mongoose from 'mongoose';
import Vendor from '../models/Vendor.js';

const memoryVendors = new Map();

const seedVendors = () => {
  if (memoryVendors.size === 0) {
    const list = [
      {
        _id: '66d500000000000000000001',
        name: 'Sky Star Technology Pvt Ltd',
        vendorCode: 'VND-SKYSTAR',
        contactPerson: 'K. Rajasekaran',
        email: 'support@skystartechnology.com',
        phone: '+91 44 2834 1920',
        gemSellerId: 'GEM-SKYS-TN-8812',
        address: 'Mount Road, Anna Salai, Chennai, Tamil Nadu - 600002',
        servicesProvided: ['HARDWARE_SUPPLY', 'AMC_SUPPORT', 'NETWORKING']
      },
      {
        _id: '66d500000000000000000002',
        name: 'Usam Technology Solutions',
        vendorCode: 'VND-USAM',
        contactPerson: 'S. Venkatraghavan',
        email: 'sales@usam.in',
        phone: '+91 44 4296 0000',
        gemSellerId: 'GEM-USAM-TN-4190',
        address: 'TTK Road, Alwarpet, Chennai, Tamil Nadu - 600018',
        servicesProvided: ['HARDWARE_SUPPLY', 'SYSTEM_INTEGRATION']
      },
      {
        _id: '66d500000000000000000003',
        name: 'Broadline Computers Pvt Ltd',
        vendorCode: 'VND-BROADLINE',
        contactPerson: 'M. Arunachalam',
        email: 'info@broadlinecomputers.com',
        phone: '+91 44 2827 7192',
        gemSellerId: 'GEM-BRDL-TN-0912',
        address: 'Nungambakkam High Road, Chennai, Tamil Nadu - 600034',
        servicesProvided: ['HARDWARE_SUPPLY', 'AMC_SUPPORT', 'POWER_BACKUP']
      },
      {
        _id: '66d500000000000000000004',
        name: 'Dell International Services India Pvt Ltd',
        vendorCode: 'VND-DELL',
        contactPerson: 'Enterprise Support Desk',
        email: 'india_government_sales@dell.com',
        phone: '1800 425 4026',
        gemSellerId: 'GEM-DELL-IND-OEM',
        address: 'Divyasree Greens, Koramangala, Bengaluru, Karnataka - 560071',
        servicesProvided: ['OEM_HARDWARE', 'WARRANTY_SUPPORT']
      },
      {
        _id: '66d500000000000000000005',
        name: 'HP India Sales Pvt Ltd',
        vendorCode: 'VND-HP',
        contactPerson: 'Public Sector Account Team',
        email: 'ps_sales_india@hp.com',
        phone: '1800 258 7170',
        gemSellerId: 'GEM-HP-IND-OEM',
        address: 'Cyber City, DLF Phase 2, Gurugram, Haryana - 122002',
        servicesProvided: ['OEM_HARDWARE', 'WARRANTY_SUPPORT']
      }
    ];

    list.forEach(item => {
      memoryVendors.set(item._id, {
        ...item,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
  }
};

seedVendors();

export const vendorRepository = {
  findAll: async () => {
    if (mongoose.connection.readyState === 1) {
      return Vendor.find({ isActive: true }).sort({ name: 1 });
    }
    return Array.from(memoryVendors.values())
      .filter(v => v.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  findById: async (id) => {
    if (mongoose.connection.readyState === 1) {
      return Vendor.findById(id);
    }
    return memoryVendors.get(id.toString()) || null;
  },

  findByCode: async (code) => {
    const c = code.trim().toUpperCase();
    if (mongoose.connection.readyState === 1) {
      return Vendor.findOne({ vendorCode: c });
    }
    for (const v of memoryVendors.values()) {
      if (v.vendorCode.toUpperCase() === c) {
        return v;
      }
    }
    return null;
  },

  create: async (data) => {
    if (mongoose.connection.readyState === 1) {
      const v = new Vendor(data);
      return v.save();
    }
    const id = new mongoose.Types.ObjectId().toString();
    const newVendor = {
      _id: id,
      ...data,
      vendorCode: data.vendorCode.toUpperCase().trim(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryVendors.set(id, newVendor);
    return newVendor;
  }
};
