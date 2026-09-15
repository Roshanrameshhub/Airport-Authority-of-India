import mongoose from 'mongoose';
import Location from '../models/Location.js';

const memoryLocations = new Map();

const seedLocations = () => {
  if (memoryLocations.size === 0) {
    const list = [
      { _id: '66d300000000000000000001', name: 'Chennai International Airport', code: 'MAA', region: 'SR', facilityType: 'AIRPORT', city: 'Chennai', state: 'Tamil Nadu' },
      { _id: '66d300000000000000000002', name: 'Southern Regional Headquarters', code: 'SRHQ', region: 'SR', facilityType: 'REGIONAL_HQ', city: 'Chennai', state: 'Tamil Nadu' },
      { _id: '66d300000000000000000003', name: 'Coimbatore International Airport', code: 'CJB', region: 'SR', facilityType: 'AIRPORT', city: 'Coimbatore', state: 'Tamil Nadu' },
      { _id: '66d300000000000000000004', name: 'Madurai Airport', code: 'IXM', region: 'SR', facilityType: 'AIRPORT', city: 'Madurai', state: 'Tamil Nadu' },
      { _id: '66d300000000000000000005', name: 'Tiruchirappalli International Airport', code: 'TRZ', region: 'SR', facilityType: 'AIRPORT', city: 'Tiruchirappalli', state: 'Tamil Nadu' },
      { _id: '66d300000000000000000006', name: 'Calicut International Airport', code: 'CCJ', region: 'SR', facilityType: 'AIRPORT', city: 'Kozhikode', state: 'Kerala' },
      { _id: '66d300000000000000000007', name: 'Mangaluru International Airport', code: 'IXE', region: 'SR', facilityType: 'AIRPORT', city: 'Mangaluru', state: 'Karnataka' }
    ];

    list.forEach(item => {
      memoryLocations.set(item._id, {
        ...item,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
  }
};

seedLocations();

export const locationRepository = {
  findAll: async () => {
    if (mongoose.connection.readyState === 1) {
      return Location.find({ isActive: true }).sort({ name: 1 });
    }
    return Array.from(memoryLocations.values())
      .filter(l => l.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  findById: async (id) => {
    if (mongoose.connection.readyState === 1) {
      return Location.findById(id);
    }
    return memoryLocations.get(id.toString()) || null;
  },

  findByCode: async (code) => {
    const c = code.trim().toUpperCase();
    if (mongoose.connection.readyState === 1) {
      return Location.findOne({ code: c });
    }
    for (const loc of memoryLocations.values()) {
      if (loc.code.toUpperCase() === c) {
        return loc;
      }
    }
    return null;
  },

  create: async (data) => {
    if (mongoose.connection.readyState === 1) {
      const loc = new Location(data);
      return loc.save();
    }
    const id = new mongoose.Types.ObjectId().toString();
    const newLoc = {
      _id: id,
      ...data,
      code: data.code.toUpperCase().trim(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryLocations.set(id, newLoc);
    return newLoc;
  }
};
