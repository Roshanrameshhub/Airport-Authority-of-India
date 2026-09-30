import mongoose from 'mongoose';
import Technology from '../models/Technology.js';
import { escapeRegex } from '../utils/regexHelper.js';

const memoryTechnologies = new Map();

export const seedTechnologies = () => {
  if (memoryTechnologies.size === 0) {
    const list = [
      // Display Technologies
      {
        _id: '66d800000000000000000001',
        name: 'IPS',
        category: 'IT Equipment',
        assetTypes: ['MONITOR'],
        description: 'In-Plane Switching display panel technology'
      },
      {
        _id: '66d800000000000000000002',
        name: 'LED',
        category: 'IT Equipment',
        assetTypes: ['MONITOR'],
        description: 'Light Emitting Diode backlit display'
      },
      {
        _id: '66d800000000000000000003',
        name: 'OLED',
        category: 'IT Equipment',
        assetTypes: ['MONITOR'],
        description: 'Organic Light Emitting Diode display'
      },
      {
        _id: '66d800000000000000000004',
        name: 'VA',
        category: 'IT Equipment',
        assetTypes: ['MONITOR'],
        description: 'Vertical Alignment display panel technology'
      },
      {
        _id: '66d800000000000000000005',
        name: 'Liquid Retina XDR',
        category: 'IT Equipment',
        assetTypes: ['LAPTOP', 'MONITOR'],
        description: 'High dynamic range mini-LED display'
      },

      // Printer & Imaging Technologies
      {
        _id: '66d800000000000000000010',
        name: 'Laser',
        category: 'Printing',
        assetTypes: ['PRINTER', 'MULTIFUNCTION_PRINTER'],
        description: 'Electrophotographic laser beam printing'
      },
      {
        _id: '66d800000000000000000011',
        name: 'Inkjet',
        category: 'Printing',
        assetTypes: ['PRINTER', 'MULTIFUNCTION_PRINTER', 'PLOTTER'],
        description: 'Piezoelectric or thermal ink droplet printing'
      },
      {
        _id: '66d800000000000000000012',
        name: 'Dot Matrix',
        category: 'Printing',
        assetTypes: ['PRINTER'],
        description: 'Impact serial matrix printing for continuous stationery'
      },
      {
        _id: '66d800000000000000000013',
        name: 'Thermal',
        category: 'Printing',
        assetTypes: ['PRINTER'],
        description: 'Direct thermal or thermal transfer sticker/receipt printing'
      },
      {
        _id: '66d800000000000000000014',
        name: 'Sheetfed',
        category: 'Printing',
        assetTypes: ['SCANNER'],
        description: 'Automatic document feeder scanner'
      },

      // Power & Backup Technologies
      {
        _id: '66d800000000000000000020',
        name: 'Line-Interactive',
        category: 'Power',
        assetTypes: ['UPS', 'STABILIZER'],
        description: 'Voltage regulating transformer line-interactive backup'
      },
      {
        _id: '66d800000000000000000021',
        name: 'Online Double-Conversion',
        category: 'Power',
        assetTypes: ['UPS'],
        description: 'Zero transfer time true online double-conversion power system'
      },
      {
        _id: '66d800000000000000000022',
        name: 'Offline / Standby',
        category: 'Power',
        assetTypes: ['UPS'],
        description: 'Standard passive standby power backup'
      },

      // Storage Technologies
      {
        _id: '66d800000000000000000030',
        name: 'NVMe SSD',
        category: 'IT Equipment',
        assetTypes: ['STORAGE', 'DESKTOP', 'LAPTOP', 'SERVER'],
        description: 'Non-Volatile Memory Express PCIe solid state storage'
      },
      {
        _id: '66d800000000000000000031',
        name: 'SATA SSD',
        category: 'IT Equipment',
        assetTypes: ['STORAGE', 'DESKTOP', 'LAPTOP', 'SERVER'],
        description: 'Serial ATA solid state storage drive'
      },
      {
        _id: '66d800000000000000000032',
        name: 'HDD',
        category: 'IT Equipment',
        assetTypes: ['STORAGE', 'DESKTOP', 'LAPTOP', 'SERVER'],
        description: 'Mechanical magnetic hard disk drive (7200/5400 RPM)'
      },

      // Network Technologies
      {
        _id: '66d800000000000000000040',
        name: 'Managed L2',
        category: 'Networking',
        assetTypes: ['NETWORK', 'SWITCH'],
        description: 'Layer 2 Managed Ethernet Switch with VLAN support'
      },
      {
        _id: '66d800000000000000000041',
        name: 'Managed L3',
        category: 'Networking',
        assetTypes: ['NETWORK', 'SWITCH', 'ROUTER'],
        description: 'Layer 3 Routing Ethernet Switch'
      },
      {
        _id: '66d800000000000000000042',
        name: 'Unmanaged',
        category: 'Networking',
        assetTypes: ['NETWORK', 'SWITCH'],
        description: 'Plug-and-play unmanaged network switch'
      },
      {
        _id: '66d800000000000000000043',
        name: 'PoE+',
        category: 'Networking',
        assetTypes: ['NETWORK', 'SWITCH'],
        description: 'Power over Ethernet Plus (802.3at) switch'
      }
    ];

    list.forEach(item => {
      memoryTechnologies.set(item._id, {
        ...item,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
  }
};

seedTechnologies();

export const technologyRepository = {
  findAll: async ({ assetType = '', category = '', isActive = true } = {}) => {
    if (mongoose.connection.readyState === 1) {
      const query = { isActive };
      if (assetType) {
        query.assetTypes = assetType.toUpperCase();
      }
      if (category) {
        query.category = { $regex: new RegExp(`^${escapeRegex(category)}$`, 'i') };
      }
      return Technology.find(query).sort({ name: 1 });
    }

    // In-memory fallback
    let list = Array.from(memoryTechnologies.values()).filter(t => t.isActive === isActive);
    if (assetType) {
      const atUpper = assetType.toUpperCase();
      list = list.filter(t => (t.assetTypes || []).includes(atUpper));
    }
    if (category) {
      const catLower = category.toLowerCase();
      list = list.filter(t => (t.category || '').toLowerCase() === catLower);
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  },

  findById: async (id) => {
    if (mongoose.connection.readyState === 1) {
      return Technology.findById(id);
    }
    return memoryTechnologies.get(id ? id.toString() : '') || null;
  },

  findByName: async (name, category = '') => {
    if (!name) return null;
    const clean = String(name).trim();
    if (mongoose.connection.readyState === 1) {
      const query = {
        name: { $regex: new RegExp(`^${escapeRegex(clean)}$`, 'i') }
      };
      if (category) {
        query.category = { $regex: new RegExp(`^${escapeRegex(category)}$`, 'i') };
      }
      return Technology.findOne(query);
    }

    const cleanLower = clean.toLowerCase();
    const catLower = category ? category.toLowerCase() : '';
    for (const t of memoryTechnologies.values()) {
      if (t.name.toLowerCase() === cleanLower) {
        if (!catLower || (t.category || '').toLowerCase() === catLower) {
          return t;
        }
      }
    }
    return null;
  },

  create: async (data) => {
    const cleanName = String(data.name || '').trim();
    if (mongoose.connection.readyState === 1) {
      const tech = new Technology({
        ...data,
        name: cleanName,
        assetTypes: (data.assetTypes || []).map(t => t.toUpperCase())
      });
      return tech.save();
    }

    const id = new mongoose.Types.ObjectId().toString();
    const newTech = {
      _id: id,
      ...data,
      name: cleanName,
      category: data.category || '',
      assetTypes: (data.assetTypes || []).map(t => t.toUpperCase()),
      description: data.description || '',
      isActive: data.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryTechnologies.set(id, newTech);
    return newTech;
  },

  update: async (id, data) => {
    if (mongoose.connection.readyState === 1) {
      return Technology.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    }
    const existing = memoryTechnologies.get(id ? id.toString() : '');
    if (!existing) return null;
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date()
    };
    memoryTechnologies.set(id.toString(), updated);
    return updated;
  },

  delete: async (id) => {
    if (mongoose.connection.readyState === 1) {
      return Technology.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true });
    }
    const existing = memoryTechnologies.get(id ? id.toString() : '');
    if (!existing) return null;
    existing.isActive = false;
    existing.updatedAt = new Date();
    return existing;
  }
};

export default technologyRepository;
