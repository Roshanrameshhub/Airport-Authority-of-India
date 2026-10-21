import React from 'react';
import {
  Cpu,
  Monitor,
  Printer,
  Zap,
  Network,
  Shield,
  Layers,
  HardDrive,
  Info,
  Radio,
  Camera,
  Server,
  Key,
  Link as LinkIcon
} from 'lucide-react';
import {
  ASSET_CATEGORY_FORM_CONFIGS,
  getActiveCategoryConfigs
} from '../config/assetCategoryFormConfigs.js';

import {
  resolveAssetCategoryConfig,
  getAssetFieldValue,
  formatDisplayValue
} from '../utils/categoryAssetDetailsUtils.js';

export {
  resolveAssetCategoryConfig,
  getAssetFieldValue,
  formatDisplayValue
};

/**
 * CategoryAssetDetails
 * Renders category-aware specifications, technical subdocuments, and dynamic specifications.
 * Hides empty sections and unpopulated fields cleanly.
 */
const CategoryAssetDetails = ({ asset, mode = 'full' }) => {
  if (!asset) return null;

  const categoryConfig = resolveAssetCategoryConfig(asset);
  const computerConfig = asset.computerConfig || {};
  const displayConfig = asset.displayConfig || {};
  const powerConfig = asset.powerConfig || {};
  const networkConfig = asset.networkConfig || {};
  const softwareConfig = asset.softwareConfig || {};
  const specifications = asset.specifications || {};

  // Check which sections have meaningful data to avoid empty containers
  const hasComputerData =
    Boolean(computerConfig.processor) ||
    Boolean(computerConfig.processorSpeed) ||
    Boolean(computerConfig.ramSizeGb) ||
    Boolean(computerConfig.ramType) ||
    Boolean(computerConfig.ramSlots) ||
    Boolean(computerConfig.storageCapacityGb) ||
    Boolean(computerConfig.storageModel) ||
    Boolean(computerConfig.storageType) ||
    Boolean(computerConfig.formFactor) ||
    Boolean(computerConfig.opticalDrive) ||
    Boolean(computerConfig.graphicsCard) ||
    Boolean(computerConfig.hostname);

  const hasDisplayData =
    Boolean(displayConfig.screenSizeInches) ||
    Boolean(displayConfig.resolution) ||
    Boolean(displayConfig.panelType) ||
    (displayConfig.ports && displayConfig.ports.length > 0);

  const hasPowerData =
    Boolean(powerConfig.capacityVa) ||
    Boolean(powerConfig.capacityWatts) ||
    Boolean(powerConfig.topology) ||
    Boolean(powerConfig.backupTimeMinutes) ||
    Boolean(powerConfig.estimatedBackupMinutes) ||
    Boolean(powerConfig.batteryType);

  const hasNetworkData =
    Boolean(networkConfig.deviceSubtype) ||
    Boolean(networkConfig.managementIp) ||
    Boolean(networkConfig.ipAddress) ||
    Boolean(networkConfig.macAddress) ||
    Boolean(networkConfig.totalPorts) ||
    Boolean(networkConfig.portSpeed) ||
    Boolean(networkConfig.firmwareVersion) ||
    Boolean(specifications.wifiMac) ||
    Boolean(specifications.bluetooth) ||
    Boolean(specifications.ethernet);

  const hasSoftwareData =
    Boolean(softwareConfig.officeSuite) ||
    Boolean(softwareConfig.officeKey) ||
    Boolean(softwareConfig.osKey) ||
    Boolean(softwareConfig.antivirus) ||
    Boolean(softwareConfig.antivirusKey) ||
    Boolean(softwareConfig.adobeSoftware);

  // Specifications items (dynamic custom specifications)
  const specEntries = Object.entries(specifications).filter(([k, v]) => {
    // Exclude network fields rendered in network section and null/empty values
    if (['wifiMac', 'bluetooth', 'ethernet'].includes(k)) return false;
    return v !== undefined && v !== null && String(v).trim() !== '';
  });

  const hasSpecifications = specEntries.length > 0;

  // Human readable label mappings for specifications keys
  const specLabelMap = {
    chipset: 'Motherboard Chipset',
    ramSpeed: 'RAM Bus Speed',
    nic: 'Network Interface Card (NIC)',
    speaker: 'Internal / Audio Speaker',
    toner: 'Toner Cartridge Model',
    data: 'Data / Interface Cable',
    material: 'Physical Build Material',
    quantity: 'Procured Batch Quantity',
    parentLaptopId: 'Host Laptop Asset ID (LAP ID)',
    isNetworkProfile: 'Network Profile Mode'
  };

  return (
    <div className="category-asset-details" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* ── Category Badge / Identity Banner ── */}
      {categoryConfig && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--color-brand-50, rgba(0, 32, 91, 0.04))',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={14} color="var(--color-brand-600)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Equipment Classification:</span>
            <strong style={{ fontSize: '0.8rem', color: 'var(--color-brand-700)' }}>{categoryConfig.name}</strong>
          </div>
          <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
            Type: {categoryConfig.assetType}
          </span>
        </div>
      )}

      {/* ── Laptop MSE Host Reference Notice ── */}
      {(specifications.parentLaptopId || (asset.category === 'Laptop MSE' && asset._relationship?.parentAssetId)) && (
        <div style={{
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <LinkIcon size={18} color="#1E40AF" />
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, color: '#1E40AF' }}>
              Linked Host Equipment Reference
            </div>
            <div style={{ fontSize: '0.88rem', color: '#1E3A8A', marginTop: '2px' }}>
              Parent Laptop ID: <strong style={{ fontFamily: 'monospace' }}>{specifications.parentLaptopId || asset._relationship?.parentAssetId}</strong>
            </div>
          </div>
        </div>
      )}

      {/* ── Section: Compute & Processing (computerConfig) ── */}
      {hasComputerData && (
        <section style={{ background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', padding: '16px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <Cpu size={15} color="var(--color-brand-600)" />
            <span>Compute &amp; Processing Architecture</span>
          </div>
          <div className="drawer-spec-grid">
            {computerConfig.processor && (
              <div>
                <span className="drawer-spec-label">Processor / CPU</span>
                <strong className="drawer-spec-value">{computerConfig.processor}</strong>
              </div>
            )}
            {computerConfig.processorSpeed && (
              <div>
                <span className="drawer-spec-label">Clock Speed</span>
                <strong className="drawer-spec-value">{computerConfig.processorSpeed}</strong>
              </div>
            )}
            {specifications.chipset && (
              <div>
                <span className="drawer-spec-label">Chipset</span>
                <strong className="drawer-spec-value">{specifications.chipset}</strong>
              </div>
            )}
            {(computerConfig.ramSizeGb || computerConfig.ramType) && (
              <div>
                <span className="drawer-spec-label">RAM Memory</span>
                <strong className="drawer-spec-value">
                  {computerConfig.ramSizeGb ? `${computerConfig.ramSizeGb} GB` : ''} {computerConfig.ramType || ''} {specifications.ramSpeed || ''}
                </strong>
              </div>
            )}
            {computerConfig.ramSlots && (
              <div>
                <span className="drawer-spec-label">RAM Slots</span>
                <strong className="drawer-spec-value">{computerConfig.ramSlots}</strong>
              </div>
            )}
            {(computerConfig.storageCapacityGb || computerConfig.storageType) && (
              <div>
                <span className="drawer-spec-label">Primary Storage</span>
                <strong className="drawer-spec-value">
                  {computerConfig.storageCapacityGb ? `${computerConfig.storageCapacityGb} GB` : ''} {computerConfig.storageType || ''}
                </strong>
              </div>
            )}
            {computerConfig.storageModel && (
              <div>
                <span className="drawer-spec-label">Storage Make &amp; Model</span>
                <strong className="drawer-spec-value">{computerConfig.storageModel}</strong>
              </div>
            )}
            {computerConfig.opticalDrive && (
              <div>
                <span className="drawer-spec-label">Optical / CD Drive</span>
                <strong className="drawer-spec-value">{computerConfig.opticalDrive}</strong>
              </div>
            )}
            {specifications.nic && (
              <div>
                <span className="drawer-spec-label">Network Interface (NIC)</span>
                <strong className="drawer-spec-value">{specifications.nic}</strong>
              </div>
            )}
            {specifications.speaker && (
              <div>
                <span className="drawer-spec-label">Speaker / Audio</span>
                <strong className="drawer-spec-value">{specifications.speaker}</strong>
              </div>
            )}
            {computerConfig.formFactor && (
              <div>
                <span className="drawer-spec-label">Form Factor</span>
                <strong className="drawer-spec-value">{computerConfig.formFactor}</strong>
              </div>
            )}
            {computerConfig.hostname && (
              <div>
                <span className="drawer-spec-label">Host Name</span>
                <code style={{ fontWeight: 700 }}>{computerConfig.hostname}</code>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Section: Display Panel Specifications ── */}
      {hasDisplayData && (
        <section style={{ background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', padding: '16px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <Monitor size={15} color="var(--color-brand-600)" />
            <span>Display Panel Specifications</span>
          </div>
          <div className="drawer-spec-grid">
            {displayConfig.screenSizeInches && (
              <div>
                <span className="drawer-spec-label">Screen Diagonal</span>
                <strong className="drawer-spec-value">{displayConfig.screenSizeInches}" Diagonal</strong>
              </div>
            )}
            {displayConfig.resolution && (
              <div>
                <span className="drawer-spec-label">Resolution</span>
                <strong className="drawer-spec-value">{displayConfig.resolution}</strong>
              </div>
            )}
            {displayConfig.panelType && (
              <div>
                <span className="drawer-spec-label">Panel Type</span>
                <strong className="drawer-spec-value">{displayConfig.panelType}</strong>
              </div>
            )}
            {displayConfig.ports && displayConfig.ports.length > 0 && (
              <div>
                <span className="drawer-spec-label">Ports</span>
                <div style={{ display: 'flex', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                  {displayConfig.ports.map((p) => (
                    <span key={p} className="badge badge-neutral">{p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Section: Power Backup & Capacity (powerConfig) ── */}
      {hasPowerData && (
        <section style={{ background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', padding: '16px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <Zap size={15} color="var(--color-brand-600)" />
            <span>Power &amp; Inverter Specifications</span>
          </div>
          <div className="drawer-spec-grid">
            {powerConfig.capacityVa && (
              <div>
                <span className="drawer-spec-label">Rated Capacity</span>
                <strong className="drawer-spec-value">{powerConfig.capacityVa} VA</strong>
              </div>
            )}
            {powerConfig.capacityWatts && (
              <div>
                <span className="drawer-spec-label">Rated Watts</span>
                <strong className="drawer-spec-value">{powerConfig.capacityWatts} W</strong>
              </div>
            )}
            {(powerConfig.backupTimeMinutes || powerConfig.estimatedBackupMinutes) && (
              <div>
                <span className="drawer-spec-label">Runtime Backup</span>
                <strong className="drawer-spec-value">{powerConfig.backupTimeMinutes || powerConfig.estimatedBackupMinutes} Minutes</strong>
              </div>
            )}
            {powerConfig.topology && (
              <div>
                <span className="drawer-spec-label">Power Topology</span>
                <strong className="drawer-spec-value">{powerConfig.topology}</strong>
              </div>
            )}
            {powerConfig.batteryType && (
              <div>
                <span className="drawer-spec-label">Battery Chemistry</span>
                <strong className="drawer-spec-value">{powerConfig.batteryType}</strong>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Section: Network & Infrastructure (networkConfig & network specs) ── */}
      {hasNetworkData && (
        <section style={{ background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', padding: '16px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <Network size={15} color="var(--color-brand-600)" />
            <span>Network &amp; Interface Configuration</span>
          </div>
          <div className="drawer-spec-grid">
            {networkConfig.deviceSubtype && (
              <div>
                <span className="drawer-spec-label">Device Subtype</span>
                <strong className="drawer-spec-value">{networkConfig.deviceSubtype}</strong>
              </div>
            )}
            {networkConfig.managementIp && (
              <div>
                <span className="drawer-spec-label">Management IP</span>
                <code style={{ fontWeight: 700 }}>{networkConfig.managementIp}</code>
              </div>
            )}
            {networkConfig.ipAddress && (
              <div>
                <span className="drawer-spec-label">IP Address</span>
                <code style={{ fontWeight: 700 }}>{networkConfig.ipAddress}</code>
              </div>
            )}
            {networkConfig.macAddress && (
              <div>
                <span className="drawer-spec-label">MAC Address</span>
                <code style={{ fontSize: '0.78rem' }}>{networkConfig.macAddress}</code>
              </div>
            )}
            {specifications.wifiMac && (
              <div>
                <span className="drawer-spec-label">Wi-Fi MAC</span>
                <code style={{ fontSize: '0.78rem' }}>{specifications.wifiMac}</code>
              </div>
            )}
            {specifications.bluetooth && (
              <div>
                <span className="drawer-spec-label">Bluetooth</span>
                <strong className="drawer-spec-value">{specifications.bluetooth}</strong>
              </div>
            )}
            {specifications.ethernet && (
              <div>
                <span className="drawer-spec-label">Ethernet Interface</span>
                <strong className="drawer-spec-value">{specifications.ethernet}</strong>
              </div>
            )}
            {networkConfig.totalPorts && (
              <div>
                <span className="drawer-spec-label">Port Density</span>
                <strong className="drawer-spec-value">{networkConfig.totalPorts} Ports {networkConfig.portSpeed ? `(${networkConfig.portSpeed})` : ''}</strong>
              </div>
            )}
            {networkConfig.firmwareVersion && (
              <div>
                <span className="drawer-spec-label">Firmware Version</span>
                <strong className="drawer-spec-value">{networkConfig.firmwareVersion}</strong>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Section: Software & Licensing (softwareConfig) ── */}
      {hasSoftwareData && (
        <section style={{ background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', padding: '16px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <Key size={15} color="var(--color-brand-600)" />
            <span>Software &amp; Licensing</span>
          </div>
          <div className="drawer-spec-grid">
            {softwareConfig.officeSuite && (
              <div>
                <span className="drawer-spec-label">Office Suite</span>
                <strong className="drawer-spec-value">{softwareConfig.officeSuite}</strong>
              </div>
            )}
            {softwareConfig.officeKey && (
              <div>
                <span className="drawer-spec-label">Office License Key</span>
                <code style={{ fontSize: '0.78rem' }}>{softwareConfig.officeKey}</code>
              </div>
            )}
            {softwareConfig.osKey && (
              <div>
                <span className="drawer-spec-label">OS License Key / MSO Key</span>
                <code style={{ fontSize: '0.78rem' }}>{softwareConfig.osKey}</code>
              </div>
            )}
            {softwareConfig.antivirus && (
              <div>
                <span className="drawer-spec-label">Antivirus Solution</span>
                <strong className="drawer-spec-value">{softwareConfig.antivirus}</strong>
              </div>
            )}
            {softwareConfig.antivirusKey && (
              <div>
                <span className="drawer-spec-label">Antivirus Key</span>
                <code style={{ fontSize: '0.78rem' }}>{softwareConfig.antivirusKey}</code>
              </div>
            )}
            {softwareConfig.adobeSoftware && (
              <div>
                <span className="drawer-spec-label">Adobe Application</span>
                <strong className="drawer-spec-value">{softwareConfig.adobeSoftware}</strong>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Section: Category-Specific Extended Specifications ── */}
      {hasSpecifications && (
        <section style={{ background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', padding: '16px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <Info size={15} color="var(--color-brand-600)" />
            <span>Category Technical Specifications</span>
          </div>
          <div className="drawer-spec-grid">
            {specEntries.map(([key, val]) => {
              const label = specLabelMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
              return (
                <div key={key}>
                  <span className="drawer-spec-label">{label}</span>
                  <strong className="drawer-spec-value">{formatDisplayValue(val)}</strong>
                </div>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
};

export default CategoryAssetDetails;
