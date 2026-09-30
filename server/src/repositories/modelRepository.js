import mongoose from 'mongoose';
import Model from '../models/Model.js';
import { escapeRegex } from '../utils/regexHelper.js';

const memoryModels = new Map();

export const seedModels = () => {
  if (memoryModels.size === 0) {
    const list = [
      // Dell Models
      {
        _id: '66d700000000000000000001',
        name: 'OptiPlex 7090 MT',
        make: 'Dell',
        category: 'IT Equipment',
        assetType: 'DESKTOP',
        description: 'Mid-Tower Commercial Workstation'
      },
      {
        _id: '66d700000000000000000002',
        name: 'OptiPlex 7000',
        make: 'Dell',
        category: 'IT Equipment',
        assetType: 'DESKTOP',
        description: 'Small Form Factor Desktop'
      },
      {
        _id: '66d700000000000000000003',
        name: 'Latitude 5420',
        make: 'Dell',
        category: 'IT Equipment',
        assetType: 'LAPTOP',
        description: '14-inch Business Laptop'
      },
      {
        _id: '66d700000000000000000004',
        name: 'Latitude 5430',
        make: 'Dell',
        category: 'IT Equipment',
        assetType: 'LAPTOP',
        description: '14-inch Operational Ruggedized Laptop'
      },
      {
        _id: '66d700000000000000000005',
        name: 'PowerEdge R750',
        make: 'Dell',
        category: 'IT Equipment',
        assetType: 'SERVER',
        description: '2U Dual-Socket Rack Server'
      },
      {
        _id: '66d700000000000000000006',
        name: 'UltraSharp U2422H',
        make: 'Dell',
        category: 'IT Equipment',
        assetType: 'MONITOR',
        technology: 'IPS',
        description: '24-inch FHD IPS Display'
      },

      // HP Models
      {
        _id: '66d700000000000000000010',
        name: 'ProDesk 600',
        make: 'HP',
        category: 'IT Equipment',
        assetType: 'DESKTOP',
        description: 'Microtower Commercial Desktop'
      },
      {
        _id: '66d700000000000000000011',
        name: 'EliteDesk 805',
        make: 'HP',
        category: 'IT Equipment',
        assetType: 'DESKTOP',
        description: 'High-Performance Workstation Tower'
      },
      {
        _id: '66d700000000000000000012',
        name: 'ProBook 450',
        make: 'HP',
        category: 'IT Equipment',
        assetType: 'LAPTOP',
        description: '15.6-inch Business Notebook'
      },
      {
        _id: '66d700000000000000000013',
        name: 'LaserJet Pro MFP 4104',
        make: 'HP',
        category: 'Printing',
        assetType: 'MULTIFUNCTION_PRINTER',
        technology: 'Laser',
        description: 'Network Monochrome All-in-One Laser Printer'
      },
      {
        _id: '66d700000000000000000014',
        name: 'ScanJet Pro 3000',
        make: 'HP',
        category: 'Printing',
        assetType: 'SCANNER',
        technology: 'Sheetfed',
        description: 'High-Speed Sheetfed Scanner'
      },

      // Lenovo Models
      {
        _id: '66d700000000000000000020',
        name: 'ThinkPad T14',
        make: 'Lenovo',
        category: 'IT Equipment',
        assetType: 'LAPTOP',
        description: 'Enterprise 14-inch Executive Laptop'
      },
      {
        _id: '66d700000000000000000021',
        name: 'ThinkPad T14s',
        make: 'Lenovo',
        category: 'IT Equipment',
        assetType: 'LAPTOP',
        description: 'Ultrabook Slim Operational Laptop'
      },
      {
        _id: '66d700000000000000000022',
        name: 'ThinkCentre M70q',
        make: 'Lenovo',
        category: 'IT Equipment',
        assetType: 'DESKTOP',
        description: 'Tiny 1L Form Factor Workstation'
      },

      // Apple Models
      {
        _id: '66d700000000000000000030',
        name: 'MacBook Pro 16',
        make: 'Apple',
        category: 'IT Equipment',
        assetType: 'LAPTOP',
        technology: 'Liquid Retina XDR',
        description: 'Apple Silicon High-Performance Laptop'
      },
      {
        _id: '66d700000000000000000031',
        name: 'MacBook Air M2',
        make: 'Apple',
        category: 'IT Equipment',
        assetType: 'LAPTOP',
        description: 'Portable Executive Laptop'
      },

      // APC Models
      {
        _id: '66d700000000000000000040',
        name: 'Back-UPS 600VA',
        make: 'APC',
        category: 'Power',
        assetType: 'UPS',
        technology: 'Line-Interactive',
        description: '600VA Line-Interactive Desktop UPS'
      },
      {
        _id: '66d700000000000000000041',
        name: 'Smart-UPS 1500VA',
        make: 'APC',
        category: 'Power',
        assetType: 'UPS',
        technology: 'Line-Interactive',
        description: '1500VA Server-Grade Line-Interactive UPS'
      },
      {
        _id: '66d700000000000000000042',
        name: 'Smart-UPS 2200VA',
        make: 'APC',
        category: 'Power',
        assetType: 'UPS',
        technology: 'Online Double-Conversion',
        description: '2200VA Rackmount Online Power Backup'
      },

      // LG Models
      {
        _id: '66d700000000000000000050',
        name: '24MP400',
        make: 'LG',
        category: 'IT Equipment',
        assetType: 'MONITOR',
        technology: 'IPS',
        description: '24-inch Full HD IPS Display'
      },

      // Logitech Models
      {
        _id: '66d700000000000000000060',
        name: 'K120',
        make: 'Logitech',
        category: 'Office Equipment',
        assetType: 'PERIPHERAL',
        description: 'USB Standard Wired Keyboard'
      },
      {
        _id: '66d700000000000000000061',
        name: 'B100',
        make: 'Logitech',
        category: 'Office Equipment',
        assetType: 'PERIPHERAL',
        description: 'USB Optical Wired Mouse'
      },

      // Cisco Models
      {
        _id: '66d700000000000000000070',
        name: 'Catalyst 2960',
        make: 'Cisco',
        category: 'Networking',
        assetType: 'SWITCH',
        technology: 'Managed L2',
        description: '24-Port 10/100/1000 Managed Switch'
      },
      {
        _id: '66d700000000000000000071',
        name: 'Catalyst 9200',
        make: 'Cisco',
        category: 'Networking',
        assetType: 'SWITCH',
        technology: 'Managed L3',
        description: 'Enterprise L3 Gigabit Switch with PoE+'
      }
    ];

    list.forEach(item => {
      memoryModels.set(item._id, {
        ...item,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
  }
};

seedModels();

export const modelRepository = {
  findAll: async ({ make = '', assetType = '', category = '', isActive = true } = {}) => {
    if (mongoose.connection.readyState === 1) {
      const query = { isActive };
      if (make) {
        query.make = { $regex: new RegExp(`^${escapeRegex(make)}$`, 'i') };
      }
      if (assetType) {
        query.assetType = assetType.toUpperCase();
      }
      if (category) {
        query.category = { $regex: new RegExp(`^${escapeRegex(category)}$`, 'i') };
      }
      return Model.find(query).sort({ make: 1, name: 1 });
    }

    // In-memory fallback
    let list = Array.from(memoryModels.values()).filter(m => m.isActive === isActive);
    if (make) {
      const makeLower = make.toLowerCase();
      list = list.filter(m => (m.make || '').toLowerCase() === makeLower);
    }
    if (assetType) {
      const atUpper = assetType.toUpperCase();
      list = list.filter(m => (m.assetType || '').toUpperCase() === atUpper);
    }
    if (category) {
      const catLower = category.toLowerCase();
      list = list.filter(m => (m.category || '').toLowerCase() === catLower);
    }
    return list.sort((a, b) => {
      const cmpMake = (a.make || '').localeCompare(b.make || '');
      if (cmpMake !== 0) return cmpMake;
      return (a.name || '').localeCompare(b.name || '');
    });
  },

  findById: async (id) => {
    if (mongoose.connection.readyState === 1) {
      return Model.findById(id);
    }
    return memoryModels.get(id ? id.toString() : '') || null;
  },

  findByNameAndMake: async (name, make, assetType = '') => {
    if (!name || !make) return null;
    const cleanName = String(name).trim();
    const cleanMake = String(make).trim();
    if (mongoose.connection.readyState === 1) {
      const query = {
        name: { $regex: new RegExp(`^${escapeRegex(cleanName)}$`, 'i') },
        make: { $regex: new RegExp(`^${escapeRegex(cleanMake)}$`, 'i') }
      };
      if (assetType) {
        query.assetType = assetType.toUpperCase();
      }
      return Model.findOne(query);
    }

    const nameLower = cleanName.toLowerCase();
    const makeLower = cleanMake.toLowerCase();
    const atUpper = assetType ? assetType.toUpperCase() : '';

    for (const m of memoryModels.values()) {
      if (
        (m.name || '').toLowerCase() === nameLower &&
        (m.make || '').toLowerCase() === makeLower
      ) {
        if (!atUpper || (m.assetType || '').toUpperCase() === atUpper) {
          return m;
        }
      }
    }
    return null;
  },

  create: async (data) => {
    const cleanName = String(data.name || '').trim();
    const cleanMake = String(data.make || '').trim();
    if (mongoose.connection.readyState === 1) {
      const model = new Model({
        ...data,
        name: cleanName,
        make: cleanMake,
        assetType: data.assetType ? data.assetType.toUpperCase().trim() : ''
      });
      return model.save();
    }

    const id = new mongoose.Types.ObjectId().toString();
    const newModel = {
      _id: id,
      ...data,
      name: cleanName,
      make: cleanMake,
      category: data.category || '',
      assetType: data.assetType ? data.assetType.toUpperCase().trim() : '',
      technology: data.technology || '',
      specifications: data.specifications || {},
      description: data.description || '',
      isActive: data.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryModels.set(id, newModel);
    return newModel;
  },

  update: async (id, data) => {
    if (mongoose.connection.readyState === 1) {
      return Model.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    }
    const existing = memoryModels.get(id ? id.toString() : '');
    if (!existing) return null;
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date()
    };
    memoryModels.set(id.toString(), updated);
    return updated;
  },

  delete: async (id) => {
    if (mongoose.connection.readyState === 1) {
      return Model.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true });
    }
    const existing = memoryModels.get(id ? id.toString() : '');
    if (!existing) return null;
    existing.isActive = false;
    existing.updatedAt = new Date();
    return existing;
  }
};

export default modelRepository;
