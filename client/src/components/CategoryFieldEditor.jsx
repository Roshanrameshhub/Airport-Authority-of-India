import React from 'react';
import { resolveAssetCategoryConfig } from '../utils/categoryAssetDetailsUtils.js';

/**
 * CategoryFieldEditor
 * Renders category-aware editable fields for the Edit Asset Modal.
 * Safely updates nested subdocuments (computerConfig, networkConfig, displayConfig, powerConfig, softwareConfig, specifications).
 */
const CategoryFieldEditor = ({ editFormData, setEditFormData }) => {
  if (!editFormData) return null;

  const categoryConfig = resolveAssetCategoryConfig(editFormData);
  const catKey = categoryConfig?.key || '';
  const assetType = editFormData.assetType || categoryConfig?.assetType || 'OTHER';

  // Helper updaters
  const updateNested = (subdoc, field, value) => {
    setEditFormData((prev) => ({
      ...prev,
      [subdoc]: {
        ...(prev[subdoc] || {}),
        [field]: value
      }
    }));
  };

  const updateSpec = (field, value) => {
    setEditFormData((prev) => ({
      ...prev,
      specifications: {
        ...(prev.specifications || {}),
        [field]: value
      }
    }));
  };

  const isComputer =
    ['ALL_IN_ONE_PC', 'LAPTOP', 'CPU'].includes(catKey) ||
    ['DESKTOP', 'LAPTOP', 'SERVER', 'WORKSTATION'].includes(assetType);

  const isMonitor = catKey === 'MONITOR' || ['MONITOR', 'DISPLAY'].includes(assetType);
  const isPrinter = catKey === 'PRINTER' || catKey === 'NEW_PTR_IP' || assetType === 'PRINTER';
  const isPower = catKey === 'UPS' || catKey === 'SWITCH_UPS' || ['UPS', 'POWER', 'BATTERY_BANK'].includes(assetType);
  const isCCTV = catKey === 'CAMERA_CCTV' || assetType === 'CCTV';
  const isProjector = catKey === 'PROJECTOR' || assetType === 'PROJECTOR';
  const isNetworkEquipment =
    ['IP_AND_MAC', 'SWITCHES', 'ACCESS_POINT'].includes(catKey) ||
    ['NETWORK', 'SWITCH', 'ROUTER', 'ACCESS_POINT'].includes(assetType);
  const isLaptopMSE = catKey === 'LAPTOP_MSE';
  const isTab = catKey === 'TAB';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      
      {/* ── Category Banner ── */}
      <div style={{
        padding: '10px 14px',
        background: 'var(--color-bg-subtle)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
          Active Configuration Schema: <strong style={{ color: 'var(--color-brand-600)' }}>{categoryConfig?.name || editFormData.category || 'Standard Equipment'}</strong>
        </div>
        <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
          {assetType}
        </span>
      </div>

      {/* ── 1. Computer Configuration (AIO PC, Laptop, CPU, Server) ── */}
      {isComputer && (
        <div style={{ background: 'var(--color-bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-brand-600)', marginBottom: '12px' }}>
            Compute &amp; Processing Architecture
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Processor / CPU</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Intel Core i7-12700"
                value={editFormData.computerConfig?.processor || ''}
                onChange={(e) => updateNested('computerConfig', 'processor', e.target.value)}
                id="edit-cpu-processor-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Clock Speed</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 3.2 GHz"
                value={editFormData.computerConfig?.processorSpeed || ''}
                onChange={(e) => updateNested('computerConfig', 'processorSpeed', e.target.value)}
                id="edit-cpu-speed-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Motherboard Chipset</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Intel B660"
                value={editFormData.specifications?.chipset || ''}
                onChange={(e) => updateSpec('chipset', e.target.value)}
                id="edit-cpu-chipset-input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">RAM (GB)</label>
              <input
                type="number"
                min="1"
                className="form-input"
                placeholder="16"
                value={editFormData.computerConfig?.ramSizeGb ?? ''}
                onChange={(e) => updateNested('computerConfig', 'ramSizeGb', e.target.value === '' ? null : Number(e.target.value))}
                id="edit-ram-size-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">RAM Type</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. DDR4"
                value={editFormData.computerConfig?.ramType || ''}
                onChange={(e) => updateNested('computerConfig', 'ramType', e.target.value)}
                id="edit-ram-type-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">RAM Speed</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 3200 MHz"
                value={editFormData.specifications?.ramSpeed || ''}
                onChange={(e) => updateSpec('ramSpeed', e.target.value)}
                id="edit-ram-speed-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">RAM Slots</label>
              <input
                type="number"
                min="1"
                className="form-input"
                placeholder="2"
                value={editFormData.computerConfig?.ramSlots ?? ''}
                onChange={(e) => updateNested('computerConfig', 'ramSlots', e.target.value === '' ? null : Number(e.target.value))}
                id="edit-ram-slots-input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Storage Capacity (GB)</label>
              <input
                type="number"
                min="1"
                className="form-input"
                placeholder="512"
                value={editFormData.computerConfig?.storageCapacityGb ?? ''}
                onChange={(e) => updateNested('computerConfig', 'storageCapacityGb', e.target.value === '' ? null : Number(e.target.value))}
                id="edit-storage-size-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Storage Type</label>
              <select
                className="form-select"
                value={editFormData.computerConfig?.storageType || 'SSD'}
                onChange={(e) => updateNested('computerConfig', 'storageType', e.target.value)}
                id="edit-storage-type-select"
              >
                <option value="SSD">SSD</option>
                <option value="NVMe">NVMe</option>
                <option value="HDD">HDD</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Storage Make &amp; Model</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Samsung PM9A1 NVMe"
                value={editFormData.computerConfig?.storageModel || ''}
                onChange={(e) => updateNested('computerConfig', 'storageModel', e.target.value)}
                id="edit-storage-model-input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Optical / CD Drive</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. DVD-RW or None"
                value={editFormData.computerConfig?.opticalDrive || ''}
                onChange={(e) => updateNested('computerConfig', 'opticalDrive', e.target.value)}
                id="edit-optical-drive-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Network Interface (NIC)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Intel Gigabit Ethernet"
                value={editFormData.specifications?.nic || ''}
                onChange={(e) => updateSpec('nic', e.target.value)}
                id="edit-nic-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Internal Speaker</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Integrated High-Definition"
                value={editFormData.specifications?.speaker || ''}
                onChange={(e) => updateSpec('speaker', e.target.value)}
                id="edit-speaker-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Network Hostname</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. AAI-MAA-PC-102"
                value={editFormData.computerConfig?.hostname || ''}
                onChange={(e) => updateNested('computerConfig', 'hostname', e.target.value)}
                id="edit-hostname-input"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Software & Licensing (AIO PC, Laptop, CPU) ── */}
      {isComputer && (
        <div style={{ background: 'var(--color-bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-brand-600)', marginBottom: '12px' }}>
            Operating System &amp; Software Licenses
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Operating System</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Windows 11 Enterprise"
                value={editFormData.operatingSystem || ''}
                onChange={(e) => setEditFormData({ ...editFormData, operatingSystem: e.target.value })}
                id="edit-os-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">OS License Key / MSO Key</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. W269N-WFGWX-YVC9B-4J6C9-T83GX"
                value={editFormData.softwareConfig?.osKey || ''}
                onChange={(e) => updateNested('softwareConfig', 'osKey', e.target.value)}
                id="edit-os-key-input"
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Office Suite</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Microsoft Office 2021 LTSC"
                value={editFormData.softwareConfig?.officeSuite || ''}
                onChange={(e) => updateNested('softwareConfig', 'officeSuite', e.target.value)}
                id="edit-office-suite-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Office Suite License Key</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                value={editFormData.softwareConfig?.officeKey || ''}
                onChange={(e) => updateNested('softwareConfig', 'officeKey', e.target.value)}
                id="edit-office-key-input"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Monitor Configuration ── */}
      {isMonitor && (
        <div style={{ background: 'var(--color-bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-brand-600)', marginBottom: '12px' }}>
            Monitor Display Panel &amp; Interface
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Screen Size (Inches)</label>
              <input
                type="number"
                step="0.1"
                min="10"
                className="form-input"
                placeholder="24"
                value={editFormData.displayConfig?.screenSizeInches ?? ''}
                onChange={(e) => updateNested('displayConfig', 'screenSizeInches', e.target.value === '' ? null : Number(e.target.value))}
                id="edit-monitor-size-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Resolution</label>
              <input
                type="text"
                className="form-input"
                placeholder="1920x1080"
                value={editFormData.displayConfig?.resolution || ''}
                onChange={(e) => updateNested('displayConfig', 'resolution', e.target.value)}
                id="edit-monitor-resolution-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Panel Type</label>
              <select
                className="form-select"
                value={editFormData.displayConfig?.displayType || 'IPS'}
                onChange={(e) => updateNested('displayConfig', 'displayType', e.target.value)}
                id="edit-monitor-panel-select"
              >
                <option value="IPS">IPS</option>
                <option value="VA">VA</option>
                <option value="TN">TN</option>
                <option value="OLED">OLED</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Data / Interface Cable</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. HDMI to DisplayPort Cable"
                value={editFormData.specifications?.data || ''}
                onChange={(e) => updateSpec('data', e.target.value)}
                id="edit-monitor-data-input"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Printer Configuration ── */}
      {isPrinter && (
        <div style={{ background: 'var(--color-bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-brand-600)', marginBottom: '12px' }}>
            Printer &amp; Consumables Configuration
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Toner Cartridge Model</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. HP 88A / Canon Cartridge 328"
                value={editFormData.specifications?.toner || ''}
                onChange={(e) => updateSpec('toner', e.target.value)}
                id="edit-printer-toner-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Printer IP Address</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 192.168.10.85"
                value={editFormData.networkConfig?.ipAddress || editFormData.ipAddress || ''}
                onChange={(e) => {
                  setEditFormData({ ...editFormData, ipAddress: e.target.value });
                  updateNested('networkConfig', 'ipAddress', e.target.value);
                }}
                id="edit-printer-ip-input"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Power Backup Configuration (UPS, Switch UPS) ── */}
      {isPower && (
        <div style={{ background: 'var(--color-bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-brand-600)', marginBottom: '12px' }}>
            Power Backup &amp; Inverter Configuration
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Capacity (VA)</label>
              <input
                type="number"
                min="100"
                className="form-input"
                placeholder="1000"
                value={editFormData.powerConfig?.capacityVa ?? ''}
                onChange={(e) => updateNested('powerConfig', 'capacityVa', e.target.value === '' ? null : Number(e.target.value))}
                id="edit-power-capacity-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Runtime Backup (Minutes)</label>
              <input
                type="number"
                min="1"
                className="form-input"
                placeholder="15"
                value={editFormData.powerConfig?.backupTimeMinutes ?? ''}
                onChange={(e) => updateNested('powerConfig', 'backupTimeMinutes', e.target.value === '' ? null : Number(e.target.value))}
                id="edit-power-backup-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Power Topology</label>
              <select
                className="form-select"
                value={editFormData.powerConfig?.topology || editFormData.technology || 'Line-Interactive'}
                onChange={(e) => {
                  updateNested('powerConfig', 'topology', e.target.value);
                  setEditFormData((prev) => ({ ...prev, technology: e.target.value }));
                }}
                id="edit-power-topology-select"
              >
                <option value="Line-Interactive">Line-Interactive</option>
                <option value="Online Double-Conversion">Online Double-Conversion</option>
                <option value="Offline / Standby">Offline / Standby</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Camera / CCTV & Tab ── */}
      {(isCCTV || isTab) && (
        <div style={{ background: 'var(--color-bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-brand-600)', marginBottom: '12px' }}>
            Equipment Material &amp; Stream IP
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Physical Material / Chassis</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Metal Dome / Weatherproof Bullet"
                value={editFormData.specifications?.material || ''}
                onChange={(e) => updateSpec('material', e.target.value)}
                id="edit-cctv-material-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">IP Address</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 10.10.40.12"
                value={editFormData.networkConfig?.ipAddress || editFormData.ipAddress || ''}
                onChange={(e) => {
                  setEditFormData({ ...editFormData, ipAddress: e.target.value });
                  updateNested('networkConfig', 'ipAddress', e.target.value);
                }}
                id="edit-cctv-ip-input"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 7. Projector ── */}
      {isProjector && (
        <div style={{ background: 'var(--color-bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-brand-600)', marginBottom: '12px' }}>
            Projector Procurement Batch
          </div>
          <div className="form-group" style={{ maxWidth: '300px' }}>
            <label className="form-label">Procured Quantity</label>
            <input
              type="number"
              min="1"
              className="form-input"
              placeholder="1"
              value={editFormData.specifications?.quantity ?? ''}
              onChange={(e) => updateSpec('quantity', e.target.value === '' ? null : Number(e.target.value))}
              id="edit-projector-qty-input"
            />
          </div>
        </div>
      )}

      {/* ── 8. IP & MAC and Network Equipment ── */}
      {isNetworkEquipment && (
        <div style={{ background: 'var(--color-bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-brand-600)', marginBottom: '12px' }}>
            Network Addressing &amp; Interfaces
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Host Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. MAA-AP-SW01"
                value={editFormData.computerConfig?.hostname || ''}
                onChange={(e) => updateNested('computerConfig', 'hostname', e.target.value)}
                id="edit-net-hostname-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Management / Primary IP</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 10.10.1.1"
                value={editFormData.networkConfig?.managementIp || editFormData.networkConfig?.ipAddress || editFormData.ipAddress || ''}
                onChange={(e) => {
                  setEditFormData({ ...editFormData, ipAddress: e.target.value });
                  updateNested('networkConfig', 'managementIp', e.target.value);
                  updateNested('networkConfig', 'ipAddress', e.target.value);
                }}
                id="edit-mgmt-ip-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Physical MAC Address</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 00:1A:2B:3C:4D:5E"
                value={editFormData.networkConfig?.macAddress || editFormData.macAddress || ''}
                onChange={(e) => {
                  setEditFormData({ ...editFormData, macAddress: e.target.value });
                  updateNested('networkConfig', 'macAddress', e.target.value);
                }}
                id="edit-net-mac-input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Wi-Fi MAC Address</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 00:1A:2B:3C:4D:5F"
                value={editFormData.specifications?.wifiMac || ''}
                onChange={(e) => updateSpec('wifiMac', e.target.value)}
                id="edit-wifi-mac-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Bluetooth Interface</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. BT 5.2 / Enabled"
                value={editFormData.specifications?.bluetooth || ''}
                onChange={(e) => updateSpec('bluetooth', e.target.value)}
                id="edit-bt-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Ethernet Details</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 1 Gbps Full-Duplex"
                value={editFormData.specifications?.ethernet || ''}
                onChange={(e) => updateSpec('ethernet', e.target.value)}
                id="edit-eth-input"
              />
            </div>
          </div>

          <div className="form-group" style={{ maxWidth: '400px' }}>
            <label className="form-label">Antivirus Solution</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Quick Heal Total Security"
              value={editFormData.softwareConfig?.antivirus || ''}
              onChange={(e) => updateNested('softwareConfig', 'antivirus', e.target.value)}
              id="edit-antivirus-input"
            />
          </div>
        </div>
      )}

      {/* ── 9. Laptop MSE ── */}
      {isLaptopMSE && (
        <div style={{ background: 'var(--color-bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-brand-600)', marginBottom: '12px' }}>
            Laptop MSE Host &amp; Custodian Association
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Host Laptop ID (LAP ID Reference)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. AAI-CHN-LAP-2024-001"
                value={editFormData.specifications?.parentLaptopId || ''}
                onChange={(e) => updateSpec('parentLaptopId', e.target.value.toUpperCase())}
                id="edit-laptop-mse-lapid-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Assigned User / Custodian</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. K. V. Raman"
                value={editFormData.currentEmployeeName || ''}
                onChange={(e) => setEditFormData({ ...editFormData, currentEmployeeName: e.target.value })}
                id="edit-laptop-mse-user-input"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CategoryFieldEditor;
