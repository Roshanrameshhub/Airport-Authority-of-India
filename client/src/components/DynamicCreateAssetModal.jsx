/**
 * DynamicCreateAssetModal.jsx — AAI Asset Management System
 * 
 * Dynamic Category-Specific Create Asset Modal Dialog.
 * Authoritative UI component driving Phase 2C dynamic equipment registration.
 *
 * Architecture:
 * 1. Uses assetCategoryFormConfigs.js as the SINGLE source of truth for categories & fields.
 * 2. Never hardcodes category fields in the component.
 * 3. Dynamic category selection (23 active categories; undefined #2 omitted).
 * 4. Renders ONLY fields defined for the selected category.
 * 5. Uses catalogApi for Make -> Model cascading and Technology options.
 * 6. Validates via client/src/utils/assetFormValidation.js before submission.
 * 7. Constructs canonical payload via client/src/utils/assetFormPayloadAdapter.js.
 * 8. Never silently injects fake business data — passes honest user input to API.
 * 9. Clears stale fields on category change.
 * 10. Remarks is universally optional (no asterisk); all declared fields are required (with asterisk).
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Layers,
  Cpu,
  Shield,
  Tag,
  Box,
  HardDrive,
  Network,
  Monitor,
  Printer
} from 'lucide-react';
import Modal from './ui/Modal';
import { catalogApi } from '../services/api';
import {
  getActiveCategoryConfigs,
  getCategoryConfigByKey
} from '../config/assetCategoryFormConfigs';
import { validateAssetCategoryForm } from '../utils/assetFormValidation';
import { buildAssetPayload } from '../utils/assetFormPayloadAdapter';

export default function DynamicCreateAssetModal({
  isOpen,
  onClose,
  onSuccess,
  token
}) {
  // 1. Authoritative Active Categories (23 categories, #2 is excluded)
  const activeCategories = useMemo(() => getActiveCategoryConfigs(), []);

  // 2. Component State
  const [selectedCategoryKey, setSelectedCategoryKey] = useState(activeCategories[0]?.key || 'ALL_IN_ONE_PC');
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('hardware');

  // Catalog State
  const [makesList, setMakesList] = useState([]);
  const [modelsList, setModelsList] = useState([]);
  const [technologiesList, setTechnologiesList] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  // Active Category Config
  const currentConfig = useMemo(() => {
    return getCategoryConfigByKey(selectedCategoryKey) || activeCategories[0];
  }, [selectedCategoryKey, activeCategories]);

  // Reset or initialize when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setFormData({});
      setFormErrors({});
      setApiError('');
      setActiveTab('hardware');
      loadCatalogData();
    }
  }, [isOpen]);

  // Load Makes and Technologies when modal opens
  const loadCatalogData = async () => {
    setLoadingCatalog(true);
    try {
      const [makesRes, techRes] = await Promise.all([
        catalogApi.getMakes({ isActive: true }).catch(() => ({ data: [] })),
        catalogApi.getTechnologies({ isActive: true }).catch(() => ({ data: [] }))
      ]);
      if (makesRes?.data) {
        setMakesList(Array.isArray(makesRes.data) ? makesRes.data : (makesRes.data.items || []));
      }
      if (techRes?.data) {
        setTechnologiesList(Array.isArray(techRes.data) ? techRes.data : (techRes.data.items || []));
      }
    } catch (err) {
      console.error('Error fetching master catalog for dynamic form:', err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  // Dependent Model Catalog fetching: when formData.make changes, load models for that make
  useEffect(() => {
    let isMounted = true;
    const fetchModelsForMake = async () => {
      const selectedMake = formData.make;
      if (!selectedMake) {
        setModelsList([]);
        return;
      }

      setLoadingModels(true);
      try {
        const queryParams = { isActive: true, make: selectedMake };
        if (currentConfig?.assetType) {
          queryParams.assetType = currentConfig.assetType;
        }
        const res = await catalogApi.getModels(queryParams);
        if (isMounted && res?.data) {
          const list = Array.isArray(res.data) ? res.data : (res.data.items || []);
          setModelsList(list);
        }
      } catch (err) {
        console.error('Error loading dependent models:', err);
      } finally {
        if (isMounted) setLoadingModels(false);
      }
    };

    fetchModelsForMake();
    return () => { isMounted = false; };
  }, [formData.make, currentConfig?.assetType]);

  // Handle Category Switching (Clears stale values from previous category)
  const handleCategoryChange = (newKey) => {
    if (newKey === selectedCategoryKey) return;
    setSelectedCategoryKey(newKey);
    setFormData({}); // Clear all previous fields
    setFormErrors({}); // Clear validation errors
    setApiError('');
    setActiveTab('hardware');
  };

  // Handle Input Field Change
  const handleFieldChange = (fieldKey, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldKey]: value
    }));

    // Clear field-level error on change
    if (formErrors[fieldKey]) {
      setFormErrors((prev) => {
        const updated = { ...prev };
        delete updated[fieldKey];
        return updated;
      });
    }
  };

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    // Step 1: Validate flat form state using Phase 2B validator
    const validationResult = validateAssetCategoryForm(selectedCategoryKey, formData);
    if (!validationResult.valid) {
      setFormErrors(validationResult.errors);

      // Intelligent tab switching for complex forms
      if (isComplex) {
        const hasHardwareErrors = hardwareFields.some(f => validationResult.errors[f.key]);
        const hasProcurementErrors = procurementFields.some(f => validationResult.errors[f.key]);
        if (!hasHardwareErrors && hasProcurementErrors) {
          setActiveTab('procurement');
        } else if (hasHardwareErrors && !hasProcurementErrors) {
          setActiveTab('hardware');
        }
      }
      return; // Keep modal open, preserve user entered values
    }
    setFormErrors({});

    // Step 2: Build API payload using Phase 2B payload adapter
    let payload;
    try {
      payload = buildAssetPayload(selectedCategoryKey, formData);
    } catch (err) {
      setApiError(err.message || 'Failed to construct asset payload.');
      return;
    }

    // Step 3: Submit via existing API mechanism
    setSubmitting(true);
    try {
      const authToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('aai_ams_token') : null);
      const res = await fetch('/api/v1/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        // Display actual backend/API error without fabricating fake business data
        let errMsg = data.message || 'Failed to register asset.';
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          const detail = data.errors.map(e => e.message ? `${e.field || ''}: ${e.message}`.trim() : (e.field || '')).join('; ');
          errMsg = `${errMsg} (${detail})`;
        } else if (data.error) {
          errMsg = `${errMsg}: ${data.error}`;
        }
        throw new Error(errMsg);
      }

      // Success
      setFormData({});
      setFormErrors({});
      onClose();
      if (onSuccess) {
        onSuccess(data.data);
      }
    } catch (err) {
      setApiError(err.message || 'An error occurred during asset registration.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Separate fields for complex layouts (e.g. All-In-One, Laptop, CPU)
  const isComplex = currentConfig?.layout === 'complex';
  const hardwareFields = isComplex
    ? currentConfig.fields.filter(f =>
        ['assetId', 'serialNumber', 'item', 'make', 'model', 'processor', 'speed', 'chipset',
         'ram', 'ramType', 'ramSpeed', 'ramSlots', 'hddSize', 'hddMakeAndModel', 'cdDrive',
         'dvdDrive', 'nic', 'speaker'].includes(f.key)
      )
    : currentConfig.fields;

  const procurementFields = isComplex
    ? currentConfig.fields.filter(f =>
        !['assetId', 'serialNumber', 'item', 'make', 'model', 'processor', 'speed', 'chipset',
          'ram', 'ramType', 'ramSpeed', 'ramSlots', 'hddSize', 'hddMakeAndModel', 'cdDrive',
          'dvdDrive', 'nic', 'speaker'].includes(f.key)
      )
    : [];

  const visibleFields = isComplex
    ? (activeTab === 'hardware' ? hardwareFields : procurementFields)
    : currentConfig.fields;

  // Field Renderer
  const renderFieldControl = (field) => {
    const value = formData[field.key] ?? '';
    const hasError = Boolean(formErrors[field.key]);

    // A. Catalog-Backed Make Select / Input
    if (field.source === 'make') {
      return (
        <div>
          <input
            list="catalog-makes-list"
            type="text"
            className={`form-input ${hasError ? 'input-error' : ''}`}
            placeholder="Select or enter manufacturer"
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            id={`field-${field.key}`}
          />
          <datalist id="catalog-makes-list">
            {makesList.map((m) => (
              <option key={m._id || m.name} value={m.name}>{m.name}</option>
            ))}
          </datalist>
        </div>
      );
    }

    // B. Catalog-Backed Model Select / Input (Dependent on Make)
    if (field.source === 'model') {
      return (
        <div>
          <input
            list="catalog-models-list"
            type="text"
            className={`form-input ${hasError ? 'input-error' : ''}`}
            placeholder={formData.make ? (loadingModels ? 'Loading models...' : 'Select or enter model') : 'Enter or select model'}
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            id={`field-${field.key}`}
          />
          <datalist id="catalog-models-list">
            {modelsList.map((mod) => (
              <option key={mod._id || mod.name} value={mod.name}>{mod.name}</option>
            ))}
          </datalist>
        </div>
      );
    }

    // C. Catalog-Backed Technology Select / Input
    if (field.source === 'technology') {
      return (
        <div>
          <input
            list="catalog-tech-list"
            type="text"
            className={`form-input ${hasError ? 'input-error' : ''}`}
            placeholder="Select or enter technology"
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            id={`field-${field.key}`}
          />
          <datalist id="catalog-tech-list">
            {technologiesList.map((t) => (
              <option key={t._id || t.name} value={t.name}>{t.name}</option>
            ))}
          </datalist>
        </div>
      );
    }

    // D. Warranty / AMC Type Select
    if (field.source === 'warrantyAmc') {
      return (
        <select
          className={`form-select ${hasError ? 'input-error' : ''}`}
          value={value}
          onChange={(e) => handleFieldChange(field.key, e.target.value)}
          id={`field-${field.key}`}
        >
          <option value="">-- Select Coverage --</option>
          <option value="Warranty">Warranty</option>
          <option value="AMC">AMC</option>
          <option value="None">None</option>
        </select>
      );
    }

    // E. General Select with Options
    if (field.type === 'select' && field.options) {
      return (
        <select
          className={`form-select ${hasError ? 'input-error' : ''}`}
          value={value}
          onChange={(e) => handleFieldChange(field.key, e.target.value)}
          id={`field-${field.key}`}
        >
          <option value="">-- Select {field.label} --</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    // F. Textarea (Remarks)
    if (field.type === 'textarea') {
      return (
        <textarea
          rows={3}
          className={`form-input ${hasError ? 'input-error' : ''}`}
          placeholder={`Enter ${field.label.toLowerCase()} (optional)`}
          value={value}
          onChange={(e) => handleFieldChange(field.key, e.target.value)}
          id={`field-${field.key}`}
        />
      );
    }

    // G. Number Input
    if (field.type === 'number') {
      return (
        <input
          type="number"
          className={`form-input ${hasError ? 'input-error' : ''}`}
          placeholder={`Enter ${field.label.toLowerCase()}`}
          value={value}
          onChange={(e) => handleFieldChange(field.key, e.target.value)}
          id={`field-${field.key}`}
        />
      );
    }

    // H. Date Input
    if (field.type === 'date') {
      return (
        <input
          type="date"
          className={`form-input ${hasError ? 'input-error' : ''}`}
          value={value}
          onChange={(e) => handleFieldChange(field.key, e.target.value)}
          id={`field-${field.key}`}
        />
      );
    }

    // I. Standard Text Input
    return (
      <input
        type="text"
        className={`form-input ${hasError ? 'input-error' : ''}`}
        placeholder={`Enter ${field.label.toLowerCase()}`}
        value={value}
        onChange={(e) => handleFieldChange(field.key, e.target.value)}
        id={`field-${field.key}`}
      />
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register IT Equipment"
      subtitle={`AAI Dynamic Registry • Category ${currentConfig?.id} of 24: ${currentConfig?.name}`}
      size="xl"
      id="dynamic-register-asset-modal"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="btn btn-primary"
            id="dynamic-submit-asset-btn"
          >
            {submitting ? 'Registering...' : 'Register Equipment'}
          </button>
        </>
      }
    >
      {/* API / Backend Error Banner */}
      {apiError && (
        <div style={{
          padding: '10px 14px',
          background: 'var(--status-danger-bg, #fee2e2)',
          border: '1px solid var(--status-danger-border, #fca5a5)',
          borderRadius: 'var(--radius-md, 6px)',
          color: 'var(--status-danger-text, #991b1b)',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{apiError}</span>
        </div>
      )}

      {/* Category Selection Header */}
      <div style={{
        background: 'var(--color-bg-subtle, rgba(0, 32, 91, 0.03))',
        border: '1px solid var(--border-subtle, #e2e8f0)',
        borderRadius: 'var(--radius-md, 6px)',
        padding: '14px',
        marginBottom: '16px'
      }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label
            htmlFor="dynamic-category-select"
            className="form-label"
            style={{ fontWeight: 700, color: 'var(--color-brand-900, #00205B)', marginBottom: '6px' }}
          >
            Select Equipment Category / Type <span style={{ color: 'var(--status-danger-text, #dc2626)' }}>*</span>
          </label>
          <select
            id="dynamic-category-select"
            className="form-select"
            value={selectedCategoryKey}
            onChange={(e) => handleCategoryChange(e.target.value)}
            style={{ fontSize: '0.95rem', fontWeight: 600 }}
          >
            {activeCategories.map((cat) => (
              <option key={cat.key} value={cat.key}>
                {cat.displayName || cat.name} ({cat.assetType})
              </option>
            ))}
          </select>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted, #64748b)', marginTop: '4px' }}>
            Broad Category: <strong>{currentConfig?.category}</strong> • System Asset Type: <strong>{currentConfig?.assetType}</strong> • Fields required: <strong>{currentConfig?.fields.filter(f => f.required).length}</strong>
          </div>
        </div>
      </div>

      {/* Complex Layout Sub-Tabs (Only rendered for complex compute categories: All-in-One, Laptop, CPU) */}
      {isComplex && (
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
          marginBottom: '16px',
          gap: '4px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('hardware')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '0.85rem',
              fontWeight: activeTab === 'hardware' ? 700 : 500,
              color: activeTab === 'hardware' ? 'var(--color-brand-600, #00205B)' : 'var(--color-text-muted, #64748b)',
              border: 'none',
              borderBottom: activeTab === 'hardware' ? '2px solid var(--color-brand-600, #00205B)' : '2px solid transparent',
              background: activeTab === 'hardware' ? 'var(--color-brand-50, rgba(0, 32, 91, 0.05))' : 'transparent',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer'
            }}
          >
            <Cpu size={14} />
            <span>1. Core Hardware & Compute ({hardwareFields.length})</span>
            {hardwareFields.some(f => formErrors[f.key]) && (
              <span style={{
                background: 'var(--status-danger-text, #dc2626)',
                color: '#fff',
                fontSize: '0.7rem',
                borderRadius: '10px',
                padding: '1px 6px',
                fontWeight: 700
              }}>
                {hardwareFields.filter(f => formErrors[f.key]).length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('procurement')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '0.85rem',
              fontWeight: activeTab === 'procurement' ? 700 : 500,
              color: activeTab === 'procurement' ? 'var(--color-brand-600, #00205B)' : 'var(--color-text-muted, #64748b)',
              border: 'none',
              borderBottom: activeTab === 'procurement' ? '2px solid var(--color-brand-600, #00205B)' : '2px solid transparent',
              background: activeTab === 'procurement' ? 'var(--color-brand-50, rgba(0, 32, 91, 0.05))' : 'transparent',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer'
            }}
          >
            <Shield size={14} />
            <span>2. Procurement, Warranty & OS ({procurementFields.length})</span>
            {procurementFields.some(f => formErrors[f.key]) && (
              <span style={{
                background: 'var(--status-danger-text, #dc2626)',
                color: '#fff',
                fontSize: '0.7rem',
                borderRadius: '10px',
                padding: '1px 6px',
                fontWeight: 700
              }}>
                {procurementFields.filter(f => formErrors[f.key]).length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Dynamic Fields Grid */}
      <form onSubmit={handleSubmit}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '14px',
          marginBottom: '16px'
        }}>
          {visibleFields.map((field) => {
            const isFullWidth = field.type === 'textarea';
            return (
              <div
                key={field.key}
                className="form-group"
                style={{
                  gridColumn: isFullWidth ? '1 / -1' : undefined,
                  marginBottom: 0
                }}
              >
                <label
                  htmlFor={`field-${field.key}`}
                  className="form-label"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    marginBottom: '4px'
                  }}
                >
                  <span>
                    {field.label}
                    {field.required && (
                      <span style={{ color: 'var(--status-danger-text, #dc2626)', marginLeft: '3px' }} title="Required field">*</span>
                    )}
                  </span>
                  {field.isAlias && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted, #94a3b8)', fontWeight: 400 }}>
                      (Asset ID)
                    </span>
                  )}
                </label>

                {renderFieldControl(field)}

                {/* Field-level error indicator */}
                {formErrors[field.key] && (
                  <span
                    style={{
                      color: 'var(--status-danger-text, #dc2626)',
                      fontSize: '0.75rem',
                      marginTop: '3px',
                      display: 'block'
                    }}
                  >
                    {formErrors[field.key]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </form>
    </Modal>
  );
}
