import mongoose from 'mongoose';
import Make from '../models/Make.js';
import { escapeRegex } from '../utils/regexHelper.js';

const memoryMakes = new Map();

export const seedMakes = () => {
  if (memoryMakes.size === 0) {
    const list = [
      {
        _id: '66d600000000000000000001',
        name: 'Dell',
        code: 'DELL',
        categories: ['IT Equipment'],
        assetTypes: ['DESKTOP', 'LAPTOP', 'WORKSTATION', 'SERVER', 'MONITOR'],
        description: 'Dell Technologies Inc. - Enterprise computing and displays',
        website: 'https://www.dell.com'
      },
      {
        _id: '66d600000000000000000002',
        name: 'HP',
        code: 'HP',
        categories: ['IT Equipment', 'Printing'],
        assetTypes: ['DESKTOP', 'LAPTOP', 'WORKSTATION', 'SERVER', 'PRINTER', 'SCANNER', 'MULTIFUNCTION_PRINTER'],
        description: 'HP Inc. - PCs, workstations, and enterprise printers',
        website: 'https://www.hp.com'
      },
      {
        _id: '66d600000000000000000003',
        name: 'Lenovo',
        code: 'LENOVO',
        categories: ['IT Equipment'],
        assetTypes: ['DESKTOP', 'LAPTOP', 'WORKSTATION', 'SERVER', 'MONITOR'],
        description: 'Lenovo Group Ltd. - ThinkPad laptops, ThinkCentre desktops, servers',
        website: 'https://www.lenovo.com'
      },
      {
        _id: '66d600000000000000000004',
        name: 'Apple',
        code: 'APPLE',
        categories: ['IT Equipment'],
        assetTypes: ['LAPTOP', 'DESKTOP'],
        description: 'Apple Inc. - MacBook Pro, MacBook Air, iMac workstations',
        website: 'https://www.apple.com'
      },
      {
        _id: '66d600000000000000000005',
        name: 'APC',
        code: 'APC',
        categories: ['Power'],
        assetTypes: ['UPS', 'STABILIZER', 'PDU'],
        description: 'Schneider Electric APC - Smart-UPS, Back-UPS power protection',
        website: 'https://www.apc.com'
      },
      {
        _id: '66d600000000000000000006',
        name: 'Microtek',
        code: 'MICROTEK',
        categories: ['Power'],
        assetTypes: ['UPS', 'STABILIZER', 'BATTERY_BANK'],
        description: 'Microtek International - Power backup systems',
        website: 'https://www.microtek.com'
      },
      {
        _id: '66d600000000000000000007',
        name: 'LG',
        code: 'LG',
        categories: ['IT Equipment'],
        assetTypes: ['MONITOR'],
        description: 'LG Electronics - Commercial and desktop displays',
        website: 'https://www.lg.com'
      },
      {
        _id: '66d600000000000000000008',
        name: 'Samsung',
        code: 'SAMSUNG',
        categories: ['IT Equipment'],
        assetTypes: ['MONITOR', 'STORAGE'],
        description: 'Samsung Electronics - Monitors, displays, and NVMe SSDs',
        website: 'https://www.samsung.com'
      },
      {
        _id: '66d600000000000000000009',
        name: 'Logitech',
        code: 'LOGITECH',
        categories: ['Office Equipment', 'IT Equipment'],
        assetTypes: ['PERIPHERAL'],
        description: 'Logitech - Keyboards, mice, webcams, presentation remotes',
        website: 'https://www.logitech.com'
      },
      {
        _id: '66d600000000000000000010',
        name: 'Canon',
        code: 'CANON',
        categories: ['Printing'],
        assetTypes: ['PRINTER', 'SCANNER', 'MULTIFUNCTION_PRINTER'],
        description: 'Canon India - Enterprise document printers and flatbed scanners',
        website: 'https://www.canon.co.in'
      },
      {
        _id: '66d600000000000000000011',
        name: 'Epson',
        code: 'EPSON',
        categories: ['Printing', 'Office Equipment'],
        assetTypes: ['PRINTER', 'SCANNER', 'PROJECTOR'],
        description: 'Epson India - InkTank printers, high-speed document scanners, projectors',
        website: 'https://www.epson.co.in'
      },
      {
        _id: '66d600000000000000000012',
        name: 'Cisco',
        code: 'CISCO',
        categories: ['Networking', 'Communication'],
        assetTypes: ['NETWORK', 'SWITCH', 'ROUTER', 'FIREWALL', 'ACCESS_POINT', 'TELEPHONE'],
        description: 'Cisco Systems - Enterprise network switches, routers, and VoIP phones',
        website: 'https://www.cisco.com'
      },
      {
        _id: '66d600000000000000000013',
        name: 'D-Link',
        code: 'DLINK',
        categories: ['Networking'],
        assetTypes: ['NETWORK', 'SWITCH', 'ROUTER', 'ACCESS_POINT', 'MODEM'],
        description: 'D-Link - Unmanaged and smart-managed networking switches',
        website: 'https://www.dlink.co.in'
      },
      {
        _id: '66d600000000000000000014',
        name: 'Seagate',
        code: 'SEAGATE',
        categories: ['IT Equipment'],
        assetTypes: ['STORAGE'],
        description: 'Seagate Technology - Enterprise hard drives and storage arrays',
        website: 'https://www.seagate.com'
      },
      {
        _id: '66d600000000000000000015',
        name: 'Western Digital',
        code: 'WD',
        categories: ['IT Equipment'],
        assetTypes: ['STORAGE'],
        description: 'Western Digital / SanDisk - Internal and external storage drives',
        website: 'https://www.westerndigital.com'
      }
    ];

    list.forEach(item => {
      memoryMakes.set(item._id, {
        ...item,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
  }
};

seedMakes();

export const makeRepository = {
  findAll: async ({ category = '', assetType = '', isActive = true } = {}) => {
    if (mongoose.connection.readyState === 1) {
      const query = { isActive };
      if (category) {
        query.categories = { $regex: new RegExp(`^${escapeRegex(category)}$`, 'i') };
      }
      if (assetType) {
        query.assetTypes = assetType.toUpperCase();
      }
      return Make.find(query).sort({ name: 1 });
    }

    // In-memory fallback
    let list = Array.from(memoryMakes.values()).filter(m => m.isActive === isActive);
    if (category) {
      const catLower = category.toLowerCase();
      list = list.filter(m => (m.categories || []).some(c => c.toLowerCase() === catLower));
    }
    if (assetType) {
      const atUpper = assetType.toUpperCase();
      list = list.filter(m => (m.assetTypes || []).includes(atUpper));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  },

  findById: async (id) => {
    if (mongoose.connection.readyState === 1) {
      return Make.findById(id);
    }
    return memoryMakes.get(id ? id.toString() : '') || null;
  },

  findByName: async (name) => {
    if (!name) return null;
    const clean = String(name).trim();
    if (mongoose.connection.readyState === 1) {
      return Make.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(clean)}$`, 'i') }
      });
    }
    const cleanLower = clean.toLowerCase();
    for (const m of memoryMakes.values()) {
      if (m.name.toLowerCase() === cleanLower) {
        return m;
      }
    }
    return null;
  },

  create: async (data) => {
    const cleanName = String(data.name || '').trim();
    if (mongoose.connection.readyState === 1) {
      const make = new Make({
        ...data,
        name: cleanName,
        code: (data.code || cleanName).toUpperCase().trim()
      });
      return make.save();
    }

    const id = new mongoose.Types.ObjectId().toString();
    const newMake = {
      _id: id,
      ...data,
      name: cleanName,
      code: (data.code || cleanName).toUpperCase().trim(),
      categories: data.categories || [],
      assetTypes: (data.assetTypes || []).map(t => t.toUpperCase()),
      description: data.description || '',
      website: data.website || '',
      isActive: data.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryMakes.set(id, newMake);
    return newMake;
  },

  update: async (id, data) => {
    if (mongoose.connection.readyState === 1) {
      return Make.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    }
    const existing = memoryMakes.get(id ? id.toString() : '');
    if (!existing) return null;
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date()
    };
    memoryMakes.set(id.toString(), updated);
    return updated;
  },

  delete: async (id) => {
    if (mongoose.connection.readyState === 1) {
      return Make.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true });
    }
    const existing = memoryMakes.get(id ? id.toString() : '');
    if (!existing) return null;
    existing.isActive = false;
    existing.updatedAt = new Date();
    return existing;
  }
};

export default makeRepository;
