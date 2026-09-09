import mongoose from 'mongoose';
import Category from '../models/Category.js';

const memoryCategories = new Map();

const seedCategories = () => {
  if (memoryCategories.size === 0) {
    const list = [
      { _id: '66d200000000000000000001', name: 'Desktop PC', code: 'PC', requiresOS: true, description: 'Workstations and desktop computer units' },
      { _id: '66d200000000000000000002', name: 'Laptop', code: 'LAPTOP', requiresOS: true, description: 'Laptops and portable computing devices' },
      { _id: '66d200000000000000000003', name: 'Printer', code: 'PRINTER', requiresOS: false, description: 'Multifunction laser, inkjet, and network printers' },
      { _id: '66d200000000000000000004', name: 'Monitor', code: 'MONITOR', requiresOS: false, description: 'Display screens and panels' },
      { _id: '66d200000000000000000005', name: 'UPS', code: 'UPS', requiresOS: false, description: 'Uninterruptible power supplies' },
      { _id: '66d200000000000000000006', name: 'Scanner', code: 'SCANNER', requiresOS: false, description: 'Document and flatbed scanners' },
      { _id: '66d200000000000000000007', name: 'Server / Network', code: 'NETWORK', requiresOS: true, description: 'Rack servers, switches, routers, and firewalls' }
    ];

    list.forEach(item => {
      memoryCategories.set(item._id, {
        ...item,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
  }
};

seedCategories();

export const categoryRepository = {
  findAll: async () => {
    if (mongoose.connection.readyState === 1) {
      return Category.find({ isActive: true }).sort({ name: 1 });
    }
    return Array.from(memoryCategories.values())
      .filter(c => c.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  findById: async (id) => {
    if (mongoose.connection.readyState === 1) {
      return Category.findById(id);
    }
    return memoryCategories.get(id.toString()) || null;
  },

  findByNameOrCode: async (name, code) => {
    if (mongoose.connection.readyState === 1) {
      return Category.findOne({
        $or: [
          { name: { $regex: new RegExp(`^${name}$`, 'i') } },
          { code: code.toUpperCase() }
        ]
      });
    }
    for (const c of memoryCategories.values()) {
      if (c.name.toLowerCase() === name.toLowerCase() || c.code.toUpperCase() === code.toUpperCase()) {
        return c;
      }
    }
    return null;
  },

  create: async (data) => {
    if (mongoose.connection.readyState === 1) {
      const cat = new Category(data);
      return cat.save();
    }
    const id = new mongoose.Types.ObjectId().toString();
    const newCat = {
      _id: id,
      ...data,
      code: data.code.toUpperCase().trim(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryCategories.set(id, newCat);
    return newCat;
  }
};
