/**
 * assetCategoryFormConfigs.js — AAI Asset Management System
 * 
 * Central Declarative Configuration Registry for the Dynamic Create Asset Form.
 * Authoritative source of truth for all 24 category definitions, field schemas,
 * UI display aliases, data types, validation rules, and backend storage mappings.
 *
 * Rules:
 * 1. Exactly 24 numbered category definition slots.
 * 2. Category #2 is explicitly undefined, disabled, and omitted from active category selectors.
 * 3. Every user-specified field is strictly required: true.
 * 4. The ONLY exception is 'remarks', which is universally required: false.
 * 5. Category-specific ID labels (Mon ID, PTR ID, etc.) map to 'assetId' as UI aliases.
 * 6. Category-specific Serial labels (SL No, Serial No, etc.) map to 'serialNumber'.
 * 7. Make, Model, Technology are catalog-backed via source identifiers.
 */

export const ASSET_CATEGORY_FORM_CONFIGS = {
  // 1. ALL IN ONE PC
  ALL_IN_ONE_PC: {
    id: 1,
    key: 'ALL_IN_ONE_PC',
    name: 'All In One PC',
    displayName: '1. All In One PC',
    category: 'IT Equipment',
    assetType: 'DESKTOP',
    layout: 'complex',
    isDefined: true,
    enabled: true,
    fields: [
      { key: 'assetId', label: 'ID', type: 'text', required: true, target: 'assetId', isAlias: true },
      { key: 'serialNumber', label: 'SL No', type: 'text', required: true, target: 'serialNumber', isAlias: true },
      { key: 'item', label: 'Item (Laptop or PC)', type: 'select', required: true, target: 'computerConfig.formFactor', options: ['All-in-One PC', 'PC', 'Laptop'] },
      { key: 'make', label: 'Make', type: 'select', required: true, source: 'make', target: 'make' },
      { key: 'model', label: 'Model', type: 'select', required: true, source: 'model', target: 'model' },
      { key: 'processor', label: 'Processor', type: 'text', required: true, target: 'computerConfig.processor' },
      { key: 'speed', label: 'Speed', type: 'text', required: true, target: 'computerConfig.processorSpeed' },
      { key: 'chipset', label: 'Chipset', type: 'text', required: true, target: 'specifications.chipset' },
      { key: 'ram', label: 'RAM', type: 'number', required: true, target: 'computerConfig.ramSizeGb' },
      { key: 'ramType', label: 'RAM Type', type: 'text', required: true, target: 'computerConfig.ramType' },
      { key: 'ramSpeed', label: 'RAM Speed', type: 'text', required: true, target: 'specifications.ramSpeed' },
      { key: 'ramSlots', label: 'RAM Slots', type: 'number', required: true, target: 'computerConfig.ramSlots' },
      { key: 'hddSize', label: 'HDD Size', type: 'number', required: true, target: 'computerConfig.storageCapacityGb' },
      { key: 'hddMakeAndModel', label: 'HDD Make and Model', type: 'text', required: true, target: 'computerConfig.storageModel' },
      { key: 'cdDrive', label: 'CD Drive', type: 'text', required: true, target: 'computerConfig.opticalDrive' },
      { key: 'nic', label: 'NIC', type: 'text', required: true, target: 'specifications.nic' },
      { key: 'speaker', label: 'Speaker', type: 'text', required: true, target: 'specifications.speaker' },
      { key: 'installDate', label: 'Install Date', type: 'date', required: true, target: 'installDate' },
      { key: 'suppliedBy', label: 'Supplied By', type: 'text', required: true, target: 'supplier' },
      { key: 'supplyOrderNo', label: 'Supply Order No', type: 'text', required: true, target: 'supplyOrderNumber' },
      { key: 'warrantyAmcType', label: 'Warranty/AMC', type: 'select', required: true, source: 'warrantyAmc', target: 'amcApplicable' },
      { key: 'warrantyAmcDate', label: 'Warranty/AMC Date', type: 'date', required: true, target: 'warrantyEndDate' },
      { key: 'os', label: 'OS', type: 'text', required: true, target: 'computerConfig.operatingSystem' },
      { key: 'msoKey', label: 'MSO Key', type: 'text', required: true, target: 'softwareConfig.osKey' },
      { key: 'officeSuite', label: 'Office Suite', type: 'text', required: true, target: 'softwareConfig.officeSuite' },
      { key: 'officeSuiteKey', label: 'Office Suite Key', type: 'text', required: true, target: 'softwareConfig.officeKey' },
      { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, target: 'remarks' }
    ]
  },

  // 2. UNDEFINED (Category #2 is intentionally undefined and requires clarification)
  UNDEFINED_2: {
    id: 2,
    key: 'UNDEFINED_2',
    name: 'Undefined Category #2',
    displayName: '2. Undefined Category #2',
    category: 'Other',
    assetType: 'OTHER',
    layout: 'compact',
    isDefined: false,
    enabled: false,
    fields: []
  },

  // 3. MONITOR
  MONITOR: {
    id: 3,
    key: 'MONITOR',
    name: 'Monitor',
    displayName: '3. Monitor',
    category: 'IT Equipment',
    assetType: 'MONITOR',
    layout: 'compact',
    isDefined: true,
    enabled: true,
    fields: [
      { key: 'assetId', label: 'Mon ID', type: 'text', required: true, target: 'assetId', isAlias: true },
      { key: 'serialNumber', label: 'Mon SL No', type: 'text', required: true, target: 'serialNumber', isAlias: true },
      { key: 'make', label: 'Make', type: 'select', required: true, source: 'make', target: 'make' },
      { key: 'model', label: 'Model', type: 'select', required: true, source: 'model', target: 'model' },
      { key: 'technology', label: 'Technology', type: 'select', required: true, source: 'technology', target: 'technology' },
      { key: 'installDate', label: 'Install Date', type: 'date', required: true, target: 'installDate' },
      { key: 'suppliedBy', label: 'Supplied By', type: 'text', required: true, target: 'supplier' },
      { key: 'supplyOrderNo', label: 'Supply Order No', type: 'text', required: true, target: 'supplyOrderNumber' },
      { key: 'warrantyAmcType', label: 'Warranty/AMC', type: 'select', required: true, source: 'warrantyAmc', target: 'amcApplicable' },
      { key: 'warrantyAmcDate', label: 'Warranty/AMC Date', type: 'date', required: true, target: 'warrantyEndDate' },
      { key: 'data', label: 'Data', type: 'text', required: true, target: 'specifications.data' },
      { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, target: 'remarks' }
    ]
  },

  // 4. PRINTER
  PRINTER: {
    id: 4,
    key: 'PRINTER',
    name: 'Printer',
    displayName: '4. Printer',
    category: 'Printing',
    assetType: 'PRINTER',
    layout: 'compact',
    isDefined: true,
    enabled: true,
    fields: [
      { key: 'assetId', label: 'PTR ID', type: 'text', required: true, target: 'assetId', isAlias: true },
      { key: 'serialNumber', label: 'PTR SL No', type: 'text', required: true, target: 'serialNumber', isAlias: true },
      { key: 'make', label: 'Make', type: 'select', required: true, source: 'make', target: 'make' },
      { key: 'model', label: 'Model', type: 'select', required: true, source: 'model', target: 'model' },
      { key: 'technology', label: 'Technology', type: 'select', required: true, source: 'technology', target: 'technology' },
      { key: 'installDate', label: 'Install Date', type: 'date', required: true, target: 'installDate' },
      { key: 'suppliedBy', label: 'Supplied By', type: 'text', required: true, target: 'supplier' },
      { key: 'supplyOrderNo', label: 'Supply Order No', type: 'text', required: true, target: 'supplyOrderNumber' },
      { key: 'warrantyAmcType', label: 'Warranty/AMC', type: 'select', required: true, source: 'warrantyAmc', target: 'amcApplicable' },
      { key: 'warrantyAmcDate', label: 'Warranty/AMC Date', type: 'date', required: true, target: 'warrantyEndDate' },
      { key: 'toner', label: 'Toner', type: 'text', required: true, target: 'specifications.toner' },
      { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, target: 'remarks' }
    ]
  },

  // 5. SCANNER
  SCANNER: {
    id: 5,
    key: 'SCANNER',
    name: 'Scanner',
    displayName: '5. Scanner',
    category: 'Printing',
    assetType: 'SCANNER',
    layout: 'compact',
    isDefined: true,
    enabled: true,
    fields: [
      { key: 'assetId', label: 'SCR ID', type: 'text', required: true, target: 'assetId', isAlias: true },
      { key: 'serialNumber', label: 'SCR SL No', type: 'text', required: true, target: 'serialNumber', isAlias: true },
      { key: 'make', label: 'Make', type: 'select', required: true, source: 'make', target: 'make' },
      { key: 'model', label: 'Model', type: 'select', required: true, source: 'model', target: 'model' },
      { key: 'technology', label: 'Technology', type: 'select', required: true, source: 'technology', target: 'technology' },
      { key: 'installDate', label: 'Install Date', type: 'date', required: true, target: 'installDate' },
      { key: 'suppliedBy', label: 'Supplied By', type: 'text', required: true, target: 'supplier' },
      { key: 'supplyOrderNo', label: 'Supply Order No', type: 'text', required: true, target: 'supplyOrderNumber' },
      { key: 'warrantyAmcType', label: 'Warranty/AMC', type: 'select', required: true, source: 'warrantyAmc', target: 'amcApplicable' },
      { key: 'warrantyAmcDate', label: 'Warranty/AMC Date', type: 'date', required: true, target: 'warrantyEndDate' },
      { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, target: 'remarks' }
    ]
  },

  // 6. KEYBOARD
  KEYBOARD: {
    id: 6,
    key: 'KEYBOARD',
    name: 'Keyboard',
    displayName: '6. Keyboard',
    category: 'Office Equipment',
    assetType: 'PERIPHERAL',
    layout: 'compact',
    isDefined: true,
    enabled: true,
    fields: [
      { key: 'assetId', label: 'KBD ID', type: 'text', required: true, target: 'assetId', isAlias: true },
      { key: 'serialNumber', label: 'KBD SL No', type: 'text', required: true, target: 'serialNumber', isAlias: true },
      { key: 'make', label: 'Make', type: 'select', required: true, source: 'make', target: 'make' },
      { key: 'model', label: 'Model', type: 'select', required: true, source: 'model', target: 'model' },
      { key: 'technology', label: 'Technology', type: 'select', required: true, source: 'technology', target: 'technology' },
      { key: 'installDate', label: 'Install Date', type: 'date', required: true, target: 'installDate' },
      { key: 'suppliedBy', label: 'Supplied By', type: 'text', required: true, target: 'supplier' },
      { key: 'supplyOrderNo', label: 'Supply Order No', type: 'text', required: true, target: 'supplyOrderNumber' },
      { key: 'warrantyAmcType', label: 'Warranty/AMC', type: 'select', required: true, source: 'warrantyAmc', target: 'amcApplicable' },
      { key: 'warrantyAmcDate', label: 'Warranty/AMC Date', type: 'date', required: true, target: 'warrantyEndDate' },
      { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, target: 'remarks' }
    ]
  },

  // 7. MOUSE
  MOUSE: {
    id: 7,
    key: 'MOUSE',
    name: 'Mouse',
    displayName: '7. Mouse',
    category: 'Office Equipment',
    assetType: 'PERIPHERAL',
    layout: 'compact',
    isDefined: true,
    enabled: true,
    fields: [
      { key: 'assetId', label: 'MSE ID', type: 'text', required: true, target: 'assetId', isAlias: true },
      { key: 'serialNumber', label: 'MSE SL No', type: 'text', required: true, target: 'serialNumber', isAlias: true },
      { key: 'make', label: 'Make', type: 'select', required: true, source: 'make', target: 'make' },
      { key: 'model', label: 'Model', type: 'select', required: true, source: 'model', target: 'model' },
      { key: 'technology', label: 'Technology', type: 'select', required: true, source: 'technology', target: 'technology' },
      { key: 'installDate', label: 'Install Date', type: 'date', required: true, target: 'installDate' },
      { key: 'suppliedBy', label: 'Supplied By', type: 'text', required: true, target: 'supplier' },
      { key: 'supplyOrderNo', label: 'Supply Order No', type: 'text', required: true, target: 'supplyOrderNumber' },
      { key: 'warrantyAmcType', label: 'Warranty/AMC', type: 'select', required: true, source: 'warrantyAmc', target: 'amcApplicable' },
      { key: 'warrantyAmcDate', label: 'Warranty/AMC Date', type: 'date', required: true, target: 'warrantyEndDate' },
      { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, target: 'remarks' }
    ]
  },

  // 8. UPS
  UPS: {
    id: 8,
    key: 'UPS',
    name: 'UPS',
    displayName: '8. UPS',
    category: 'Power',
    assetType: 'UPS',
    layout: 'compact',
    isDefined: true,
    enabled: true,
    fields: [
      { key: 'assetId', label: 'UPS ID', type: 'text', required: true, target: 'assetId', isAlias: true },
      { key: 'serialNumber', label: 'UPS SL No', type: 'text', required: true, target: 'serialNumber', isAlias: true },
      { key: 'make', label: 'Make', type: 'select', required: true, source: 'make', target: 'make' },
      { key: 'model', label: 'Model', type: 'select', required: true, source: 'model', target: 'model' },
      { key: 'capacity', label: 'Capacity', type: 'number', required: true, target: 'powerConfig.capacityVa' },
      { key: 'technology', label: 'Technology', type: 'select', required: true, source: 'technology', target: 'technology' },
      { key: 'installDate', label: 'Install Date', type: 'date', required: true, target: 'installDate' },
      { key: 'suppliedBy', label: 'Supplied By', type: 'text', required: true, target: 'supplier' },
      { key: 'supplyOrderNo', label: 'Supply Order No', type: 'text', required: true, target: 'supplyOrderNumber' },
      { key: 'warrantyAmcType', label: 'Warranty/AMC', type: 'select', required: true, source: 'warrantyAmc', target: 'amcApplicable' },
      { key: 'warrantyAmcDate', label: 'Warranty/AMC Date', type: 'date', required: true, target: 'warrantyEndDate' },
      { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, target: 'remarks' }
    ]
  },

  // 9. BIOMETRIC
  BIOMETRIC: {
    id: 9,
    key: 'BIOMETRIC',
    name: 'Biometric',
    displayName: '9. Biometric',
    category: 'Surveillance',
    assetType: 'BIOMETRIC',
    layout: 'compact',
    isDefined: true,
    enabled: true,
    fields: [
      { key: 'assetId', label: 'Asset ID', type: 'text', required: true, target: 'assetId' },
      { key: 'serialNumber', label: 'SL No', type: 'text', required: true, target: 'serialNumber', isAlias: true },
      { key: 'make', label: 'Make', type: 'select', required: true, source: 'make', target: 'make' },
      { key: 'model', label: 'Model', type: 'select', required: true, source: 'model', target: 'model' },
      { key: 'technology', label: 'Tech', type: 'select', required: true, source: 'technology', target: 'technology' },
      { key: 'installDate', label: 'Install Date', type: 'date', required: true, target: 'installDate' },
      { key: 'suppliedBy', label: 'Supplied By', type: 'text', required: true, target: 'supplier' },
      { key: 'supplyOrderNo', label: 'Supply Order No', type: 'text', required: true, target: 'supplyOrderNumber' },
      { key: 'warrantyAmcType', label: 'Warranty/AMC', type: 'select', required: true, source: 'warrantyAmc', target: 'amcApplicable' },
      { key: 'warrantyAmcDate', label: 'Warranty/AMC Date', type: 'date', required: true, target: 'warrantyEndDate' },
      { key: 'department', label: 'Dept', type: 'text', required: true, target: 'department' },
      { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, target: 'remarks' }
    ]
  },

  // 10. CAMERA / CCTV
  CAMERA_CCTV: {
    id: 10,
    key: 'CAMERA_CCTV',
    name: 'Camera / CCTV',
    displayName: '10. Camera / CCTV',
    category: 'Surveillance',
    assetType: 'CCTV',
    layout: 'compact',
    isDefined: true,
    enabled: true,
    fields: [
      { key: 'material', label: 'Material', type: 'text', required: true, target: 'specifications.material' },
      { key: 'make', label: 'Make', type: 'select', required: true, source: 'make', target: 'make' },
      { key: 'model', label: 'Model', type: 'select', required: true, source: 'model', target: 'model' },
      { key: 'serialNumber', label: 'Serial Number', type: 'text', required: true, target: 'serialNumber' },
      { key: 'ipAddress', label: 'IP', type: 'text', required: true, target: 'networkConfig.ipAddress' },
      { key: 'location', label: 'Location', type: 'text', required: true, target: 'location' },
      { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, target: 'remarks' }
    ]
  },

  // 11. TV & SERVER
  TV_SERVER: {
    id: 11,
    key: 'TV_SERVER',
    name: 'TV & Server',
    displayName: '11. TV & Server',
    category: 'IT Equipment',
    assetType: 'SERVER',
    layout: 'compact',
    isDefined: true,
    enabled: true,
    fields: [
      { key: 'assetId', label: 'Asset ID', type: 'text', required: true, target: 'assetId' },
      { key: 'make', label: 'Make', type: 'select', required: true, source: 'make', target: 'make' },
      { key: 'model', label: 'Model', type: 'select', required: true, source: 'model', target: 'model' },
      { key: 'serialNumber', label: 'Serial Number', type: 'text', required: true, target: 'serialNumber' },
      { key: 'location', label: 'Location', type: 'text', required: true, target: 'location' },
      { key: 'installDate', label: 'Install Date', type: 'date', required: true, target: 'installDate' },
      { key: 'suppliedBy', label: 'Supplied By', type: 'text', required: true, target: 'supplier' },
      { key: 'supplyOrderNo', label: 'Supply Order No', type: 'text', required: true, target: 'supplyOrderNumber' },
      { key: 'warrantyAmcType', label: 'Warranty/AMC', type: 'select', required: true, source: 'warrantyAmc', target: 'amcApplicable' },
      { key: 'warrantyAmcDate', label: 'Warranty/AMC Date', type: 'date', required: true, target: 'warrantyEndDate' },
      { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, target: 'remarks' }
    ]
  },

  // 12. LAPTOP
  LAPTOP: {
    id: 12,
    key: 'LAPTOP',
    name: 'Laptop',
    displayName: '12. Laptop',
    category: 'IT Equipment',
    assetType: 'LAPTOP',
    layout: 'complex',
    isDefined: true,
    enabled: true,
    fields: [
      { key: 'assetId', label: 'LAP ID', type: 'text', required: true, target: 'assetId', isAlias: true },
      { key: 'serialNumber', label: 'LAP SL No', type: 'text', required: true, target: 'serialNumber', isAlias: true },
      { key: 'make', label: 'Make', type: 'select', required: true, source: 'make', target: 'make' },
      { key: 'model', label: 'Model', type: 'select', required: true, source: 'model', target: 'model' },
      { key: 'processor', label: 'Processor', type: 'text', required: true, target: 'computerConfig.processor' },
      { key: 'speed', label: 'Speed', type: 'text', required: true, target: 'computerConfig.processorSpeed' },
      { key: 'chipset', label: 'Chipset', type: 'text', required: true, target: 'specifications.chipset' },
      { key: 'ram', label: 'RAM', type: 'number', required: true, target: 'computerConfig.ramSizeGb' },
      { key: 'ramType', label: 'RAM Type', type: 'text', required: true, target: 'computerConfig.ramType' },
      { key: 'ramSpeed', label: 'RAM Speed', type: 'text', required: true, target: 'specifications.ramSpeed' },
      { key: 'ramSlots', label: 'RAM Slots', type: 'number', required: true, target: 'computerConfig.ramSlots' },
      { key: 'hddSize', label: 'HDD Size', type: 'number', required: true, target: 'computerConfig.storageCapacityGb' },
      { key: 'hddMakeAndModel', label: 'HDD Make and Model', type: 'text', required: true, target: 'computerConfig.storageModel' },
      { key: 'cdDrive', label: 'CD Drive', type: 'text', required: true, target: 'computerConfig.opticalDrive' },
      { key: 'dvdDrive', label: 'DVD Drive', type: 'text', required: true, target: 'computerConfig.opticalDrive' },
      { key: 'nic', label: 'NIC', type: 'text', required: true, target: 'specifications.nic' },
      { key: 'installDate', label: 'Install Date', type: 'date', required: true, target: 'installDate' },
      { key: 'suppliedBy', label: 'Supplied By', type: 'text', required: true, target: 'supplier' },
      { key: 'supplyOrderNo', label: 'Supply Order No', type: 'text', required: true, target: 'supplyOrderNumber' },
      { key: 'warrantyAmcType', label: 'Warranty/AMC', type: 'select', required: true, source: 'warrantyAmc', target: 'amcApplicable' },
      { key: 'warrantyAmcDate', label: 'Warranty/AMC Date', type: 'date', required: true, target: 'warrantyEndDate' },
      { key: 'os', label: 'OS', type: 'text', required: true, target: 'computerConfig.operatingSystem' },
      { key: 'msoKey', label: 'MSO Key', type: 'text', required: true, target: 'softwareConfig.osKey' },
      { key: 'officeSuite', label: 'Office Suite', type: 'text', required: true, target: 'softwareConfig.officeSuite' },
      { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, target: 'remarks' }
    ]
  },

  // 13. SWITCHES
  SWITCHES: {
    id: 13,
    key: 'SWITCHES',
    name: 'Switches',
    displayName: '13. Switches',
    category: 'Networking',
    assetType: 'SWITCH',
    layout: 'compact',
    isDefined: true,
    enabled: true,
    fields: [
      { key: 'switchDescription', label: 'Switch Description', type: 'text', required: true, target: 'assetName' },
      { key: 'configIp', label: 'Config IP', type: 'text', required: true, target: 'networkConfig.managementIp' },
      { key: 'serialNumber', label: 'Serial No', type: 'text', required: true, target: 'serialNumber', isAlias: true },
      { key: 'location', label: 'Location', type: 'text', required: true, target: 'location' },
      { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, target: 'remarks' }
    ]
  },

  // 14. HDD
  HDD: {
    id: 14,
    key: 'HDD',
    name: 'HDD',
    displayName: '14. HDD',
    category: 'IT Equipment',
    assetType: 'STORAGE',
    layout: 'compact',
    isDefined: true,
    enabled: true,
    fields: [
      { key: 'assetId', label: 'HDD ID', type: 'text', required: true, target: 'assetId', isAlias: true },
      { key: 'serialNumber', label: 'Serial No', type: 'text', required: true, target: 'serialNumber', isAlias: true },
      { key: 'make', label: 'Make', type: 'select', required: true, source: 'make', target: 'make' },
      { key: 'model', label: 'Model', type: 'select', required: true, source: 'model', target: 'model' },
      { key: 'size', label: 'Size', type: 'text', required: true, target: 'specifications.size' },
      { key: 'installDate', label: 'Install Date', type: 'date', required: true, target: 'installDate' },
      { key: 'suppliedBy', label: 'Supplied By', type: 'text', required: true, target: 'supplier' },
      { key: 'supplyOrderNo', label: 'Supply Order No', type: 'text', required: true, target: 'supplyOrderNumber' },
      { key: 'warrantyAmcType', label: 'Warranty/AMC', type: 'select', required: true, source: 'warrantyAmc', target: 'amcApplicable' },
      { key: 'warrantyAmcDate', label: 'Warranty/AMC Date', type: 'date', required: true, target: 'warrantyEndDate' },
      { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, target: 'remarks' }
    ]
  },

  // 15. PODIUM
  PODIUM: {
    id: 15,
    key: 'PODIUM',
    name: 'Podium',
    displayName: '15. Podium',
    category: 'Office Equipment',
    assetType: 'OTHER',
    layout: 'compact',
    isDefined: true,
    enabled: true,
    fields: [
      { key: 'assetId', label: 'Podium ID', type: 'text', required: true, target: 'assetId', isAlias: true },
      { key: 'serialNumber', label: 'SL No', type: 'text', required: true, target: 'serialNumber', isAlias: true },
      { key: 'make', label: 'Make', type: 'select', required: true, source: 'make', target: 'make' },
      { key: 'model', label: 'Model', type: 'select', required: true, source: 'model', target: 'model' },
      { key: 'technology', label: 'Technology', type: 'select', required: true, source: 'technology', target: 'technology' },
      { key: 'installDate', label: 'Install Date', type: 'date', required: true, target: 'installDate' },
      { key: 'suppliedBy', label: 'Supplied By', type: 'text', required: true, target: 'supplier' },
      { key: 'supplyOrderNo', label: 'Supply Order No', type: 'text', required: true, target: 'supplyOrderNumber' },
      { key: 'warrantyAmcType', label: 'Warranty/AMC', type: 'select', required: true, source: 'warrantyAmc', target: 'amcApplicable' },
      { key: 'warrantyAmcDate', label: 'Warranty/AMC Date', type: 'date', required: true, target: 'warrantyEndDate' },
      { key: 'department', label: 'Dept', type: 'text', required: true, target: 'department' },
      { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, target: 'remarks' }
    ]
  },

  // 16. PROJECTOR
  PROJECTOR: {
    id: 16,
    key: 'PROJECTOR',
    name: 'Projector',
    displayName: '16. Projector',
    category: 'Office Equipment',
    assetType: 'PROJECTOR',
    layout: 'compact',
    isDefined: true,
    enabled: true,
    fields: [
      { key: 'make', label: 'Make', type: 'select', required: true, source: 'make', target: 'make' },
      { key: 'model', label: 'Model', type: 'select', required: true, source: 'model', target: 'model' },
      { key: 'serialNumber', label: 'SL No', type: 'text', required: true, target: 'serialNumber', isAlias: true },
      { key: 'location', label: 'Location', type: 'text', required: true, target: 'location' },
      { key: 'installDate', label: 'Date', type: 'date', required: true, target: 'installDate' },
      { key: 'quantity', label: 'Quantity', type: 'number', required: true, target: 'specifications.quantity' },
      { key: 'assetId', label: 'Asset ID', type: 'text', required: true, target: 'assetId' },
      { key: 'purchaseDate', label: 'PO Date', type: 'date', required: true, target: 'purchaseDate' },
      { key: 'supplyOrderNo', label: 'Supply Order No', type: 'text', required: true, target: 'supplyOrderNumber' },
      { key: 'suppliedBy', label: 'Supplied By', type: 'text', required: true, target: 'supplier' },
      { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, target: 'remarks' }
    ]
  },

  // 17. IP & MAC
  IP_AND_MAC: {
    id: 17,
    key: 'IP_AND_MAC',
    name: 'IP & MAC',
    displayName: '17. IP & MAC',
    category: 'Networking',
    assetType: 'NETWORK',
    layout: 'compact',
    isDefined: true,
    enabled: true,
    fields: [
      { key: 'assetId', label: 'Asset ID', type: 'text', required: true, target: 'assetId' },
      { key: 'antivirus', label: 'Antivirus', type: 'text', required: true, target: 'softwareConfig.antivirus' },
      { key: 'hostname', label: 'Host Name', type: 'text', required: true, target: 'computerConfig.hostname' },
      { key: 'ipAddress', label: 'IP Address', type: 'text', required: true, target: 'networkConfig.ipAddress' },
      { key: 'macAddress', label: 'MAC Address', type: 'text', required: true, target: 'networkConfig.macAddress' },
      { key: 'wifiMac', label: 'WiFi MAC', type: 'text', required: true, target: 'specifications.wifiMac' },
      { key: 'bluetooth', label: 'Bluetooth', type: 'text', required: true, target: 'specifications.bluetooth' },
      { key: 'ethernet', label: 'Ethernet', type: 'text', required: true, target: 'specifications.ethernet' },
      { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, target: 'remarks' }
    ]
  },

  // 18. NEW PTR IP
  NEW_PTR_IP: {
    id: 18,
    key: 'NEW_PTR_IP',
    name: 'New PTR IP',
    displayName: '18. New PTR IP',
    category: 'Printing',
    assetType: 'PRINTER',
    layout: 'compact',
    isDefined: true,
    enabled: true,
    fields: [
      { key: 'assetId', label: 'Asset ID', type: 'text', required: true, target: 'assetId' },
      { key: 'ipAddress', label: 'IP Address', type: 'text', required: true, target: 'networkConfig.ipAddress' },
      { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, target: 'remarks' }
    ]
  },

  // 19. CPU
  CPU: {
    id: 19,
    key: 'CPU',
    name: 'CPU',
    displayName: '19. CPU',
    category: 'IT Equipment',
    assetType: 'DESKTOP',
    layout: 'complex',
    isDefined: true,
    enabled: true,
    fields: [
      { key: 'assetId', label: 'CPU ID', type: 'text', required: true, target: 'assetId', isAlias: true },
      { key: 'serialNumber', label: 'CPU SL No', type: 'text', required: true, target: 'serialNumber', isAlias: true },
      { key: 'make', label: 'Make', type: 'select', required: true, source: 'make', target: 'make' },
      { key: 'model', label: 'Model', type: 'select', required: true, source: 'model', target: 'model' },
      { key: 'processor', label: 'Processor', type: 'text', required: true, target: 'computerConfig.processor' },
      { key: 'speed', label: 'Speed', type: 'text', required: true, target: 'computerConfig.processorSpeed' },
      { key: 'chipset', label: 'Chipset', type: 'text', required: true, target: 'specifications.chipset' },
      { key: 'ram', label: 'RAM', type: 'number', required: true, target: 'computerConfig.ramSizeGb' },
      { key: 'ramType', label: 'RAM Type', type: 'text', required: true, target: 'computerConfig.ramType' },
      { key: 'ramSpeed', label: 'RAM Speed', type: 'text', required: true, target: 'specifications.ramSpeed' },
      { key: 'ramSlots', label: 'RAM Slots', type: 'number', required: true, target: 'computerConfig.ramSlots' },
      { key: 'hddSize', label: 'HDD Size', type: 'number', required: true, target: 'computerConfig.storageCapacityGb' },
      { key: 'hddMakeAndModel', label: 'HDD Make and Model', type: 'text', required: true, target: 'computerConfig.storageModel' },
      { key: 'cdDrive', label: 'CD Drive', type: 'text', required: true, target: 'computerConfig.opticalDrive' },
      { key: 'nic', label: 'NIC', type: 'text', required: true, target: 'specifications.nic' },
      { key: 'speaker', label: 'Speaker', type: 'text', required: true, target: 'specifications.speaker' },
      { key: 'installDate', label: 'Install Date', type: 'date', required: true, target: 'installDate' },
      { key: 'suppliedBy', label: 'Supplied By', type: 'text', required: true, target: 'supplier' },
      { key: 'supplyOrderNo', label: 'Supply Order No', type: 'text', required: true, target: 'supplyOrderNumber' },
      { key: 'warrantyAmcType', label: 'Warranty/AMC', type: 'select', required: true, source: 'warrantyAmc', target: 'amcApplicable' },
      { key: 'warrantyAmcDate', label: 'Warranty/AMC Date', type: 'date', required: true, target: 'warrantyEndDate' },
      { key: 'os', label: 'OS', type: 'text', required: true, target: 'computerConfig.operatingSystem' },
      { key: 'msoKey', label: 'MSO Key', type: 'text', required: true, target: 'softwareConfig.osKey' },
      { key: 'officeSuite', label: 'Office Suite', type: 'text', required: true, target: 'softwareConfig.officeSuite' },
      { key: 'officeSuiteKey', label: 'Office Suite Key', type: 'text', required: true, target: 'softwareConfig.officeKey' },
      { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, target: 'remarks' }
    ]
  },

  // 20. LAPTOP MSE
  LAPTOP_MSE: {
    id: 20,
    key: 'LAPTOP_MSE',
    name: 'Laptop MSE',
    displayName: '20. Laptop MSE',
    category: 'Office Equipment',
    assetType: 'PERIPHERAL',
    layout: 'compact',
    isDefined: true,
    enabled: true,
    fields: [
      { key: 'assetId', label: 'Asset ID', type: 'text', required: true, target: 'assetId' },
      { key: 'lapId', label: 'LAP ID', type: 'text', required: true, source: 'relationship', target: 'relationship.parentAssetId', description: 'Parent Laptop Asset ID' },
      { key: 'serialNumber', label: 'Serial', type: 'text', required: true, target: 'serialNumber', isAlias: true },
      { key: 'make', label: 'Make', type: 'select', required: true, source: 'make', target: 'make' },
      { key: 'model', label: 'Model', type: 'select', required: true, source: 'model', target: 'model' },
      { key: 'user', label: 'User', type: 'text', required: true, target: 'currentEmployeeName' },
      { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, target: 'remarks' }
    ]
  },

  // 21. SWITCH UPS
  SWITCH_UPS: {
    id: 21,
    key: 'SWITCH_UPS',
    name: 'Switch UPS',
    displayName: '21. Switch UPS',
    category: 'Power',
    assetType: 'UPS',
    layout: 'compact',
    isDefined: true,
    enabled: true,
    fields: [
      { key: 'assetId', label: 'UPS ID', type: 'text', required: true, target: 'assetId', isAlias: true },
      { key: 'serialNumber', label: 'UPS SL No', type: 'text', required: true, target: 'serialNumber', isAlias: true },
      { key: 'make', label: 'Make', type: 'select', required: true, source: 'make', target: 'make' },
      { key: 'model', label: 'Model', type: 'select', required: true, source: 'model', target: 'model' },
      { key: 'capacity', label: 'Capacity', type: 'number', required: true, target: 'powerConfig.capacityVa' },
      { key: 'technology', label: 'Technology', type: 'select', required: true, source: 'technology', target: 'technology' },
      { key: 'installDate', label: 'Install Date', type: 'date', required: true, target: 'installDate' },
      { key: 'suppliedBy', label: 'Supplied By', type: 'text', required: true, target: 'supplier' },
      { key: 'supplyOrderNo', label: 'Supply Order No', type: 'text', required: true, target: 'supplyOrderNumber' },
      { key: 'warrantyAmcType', label: 'Warranty/AMC', type: 'select', required: true, source: 'warrantyAmc', target: 'amcApplicable' },
      { key: 'warrantyAmcDate', label: 'Warranty/AMC Date', type: 'date', required: true, target: 'warrantyEndDate' },
      { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, target: 'remarks' }
    ]
  },

  // 22. IT ACCESS
  IT_ACCESS: {
    id: 22,
    key: 'IT_ACCESS',
    name: 'IT Access',
    displayName: '22. IT Access',
    category: 'Office Equipment',
    assetType: 'PERIPHERAL',
    layout: 'compact',
    isDefined: true,
    enabled: true,
    fields: [
      { key: 'assetId', label: 'Asset ID', type: 'text', required: true, target: 'assetId' },
      { key: 'make', label: 'Make', type: 'select', required: true, source: 'make', target: 'make' },
      { key: 'model', label: 'Model', type: 'select', required: true, source: 'model', target: 'model' },
      { key: 'serialNumber', label: 'Serial No', type: 'text', required: true, target: 'serialNumber', isAlias: true },
      { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, target: 'remarks' }
    ]
  },

  // 23. TAB
  TAB: {
    id: 23,
    key: 'TAB',
    name: 'Tab',
    displayName: '23. Tab',
    category: 'IT Equipment',
    assetType: 'OTHER',
    layout: 'compact',
    isDefined: true,
    enabled: true,
    fields: [
      { key: 'material', label: 'Material', type: 'text', required: true, target: 'specifications.material' },
      { key: 'make', label: 'Make', type: 'select', required: true, source: 'make', target: 'make' },
      { key: 'model', label: 'Model', type: 'select', required: true, source: 'model', target: 'model' },
      { key: 'serialNumber', label: 'Serial No', type: 'text', required: true, target: 'serialNumber', isAlias: true },
      { key: 'department', label: 'Dept', type: 'text', required: true, target: 'department' },
      { key: 'assetId', label: 'Asset ID', type: 'text', required: true, target: 'assetId' },
      { key: 'location', label: 'Location', type: 'text', required: true, target: 'location' },
      { key: 'technology', label: 'Technology', type: 'select', required: true, source: 'technology', target: 'technology' },
      { key: 'suppliedBy', label: 'Supplied By', type: 'text', required: true, target: 'supplier' },
      { key: 'supplyOrderNo', label: 'Supply Order No', type: 'text', required: true, target: 'supplyOrderNumber' },
      { key: 'warrantyAmcType', label: 'Warranty/AMC', type: 'select', required: true, source: 'warrantyAmc', target: 'amcApplicable' },
      { key: 'warrantyAmcDate', label: 'Warranty/AMC Date', type: 'date', required: true, target: 'warrantyEndDate' },
      { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, target: 'remarks' }
    ]
  },

  // 24. ACCESS POINT
  ACCESS_POINT: {
    id: 24,
    key: 'ACCESS_POINT',
    name: 'Access Point',
    displayName: '24. Access Point',
    category: 'Networking',
    assetType: 'ACCESS_POINT',
    layout: 'compact',
    isDefined: true,
    enabled: true,
    fields: [
      { key: 'assetId', label: 'Access ID', type: 'text', required: true, target: 'assetId', isAlias: true },
      { key: 'serialNumber', label: 'SL No', type: 'text', required: true, target: 'serialNumber', isAlias: true },
      { key: 'make', label: 'Make', type: 'select', required: true, source: 'make', target: 'make' },
      { key: 'model', label: 'Model', type: 'select', required: true, source: 'model', target: 'model' },
      { key: 'technology', label: 'Technology', type: 'select', required: true, source: 'technology', target: 'technology' },
      { key: 'installDate', label: 'Install Date', type: 'date', required: true, target: 'installDate' },
      { key: 'suppliedBy', label: 'Supplied By', type: 'text', required: true, target: 'supplier' },
      { key: 'supplyOrderNo', label: 'Supply Order No', type: 'text', required: true, target: 'supplyOrderNumber' },
      { key: 'warrantyAmcType', label: 'Warranty/AMC', type: 'select', required: true, source: 'warrantyAmc', target: 'amcApplicable' },
      { key: 'warrantyAmcDate', label: 'Warranty/AMC Date', type: 'date', required: true, target: 'warrantyEndDate' },
      { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, target: 'remarks' }
    ]
  }
};

/**
 * Returns all 23 active, defined category configurations (excludes undefined #2).
 * Use this in UI category dropdowns and active form selectors.
 */
export const getActiveCategoryConfigs = () => {
  return Object.values(ASSET_CATEGORY_FORM_CONFIGS).filter(
    (cfg) => cfg.isDefined === true && cfg.enabled === true
  );
};

/**
 * Returns all 24 category configuration objects (including undefined #2 placeholder).
 */
export const getAllCategoryConfigs = () => {
  return Object.values(ASSET_CATEGORY_FORM_CONFIGS);
};

/**
 * Retrieves a category configuration by key (e.g. 'MONITOR').
 */
export const getCategoryConfigByKey = (key) => {
  if (!key) return null;
  return ASSET_CATEGORY_FORM_CONFIGS[key] || null;
};

/**
 * Retrieves a category configuration by numeric ID (1-24).
 */
export const getCategoryConfigById = (id) => {
  const numId = Number(id);
  if (isNaN(numId)) return null;
  return Object.values(ASSET_CATEGORY_FORM_CONFIGS).find((cfg) => cfg.id === numId) || null;
};

export default ASSET_CATEGORY_FORM_CONFIGS;
