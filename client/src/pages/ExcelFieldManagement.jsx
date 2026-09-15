import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Plus,
  Edit2,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  RefreshCw,
  FileSpreadsheet,
  ArrowUpDown,
  Info,
  Layers,
  ArrowLeft,
  Eye,
  Check,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';

export default function ExcelFieldManagement() {
  const { token } = useAuth();
  const [fields, setFields] = useState([]);
  const [metrics, setMetrics] = useState({
    totalFields: 13,
    coreLockedFields: 13,
    customFields: 0,
    importEnabledCount: 13,
    exportEnabledCount: 13
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: '' }

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState(null); // null = create mode
  const [formData, setFormData] = useState({
    displayName: '',
    fieldName: '',
    dataType: 'TEXT',
    optionsText: '',
    description: '',
    aliasesText: '',
    required: false,
    enabled: true,
    importEnabled: true,
    exportEnabled: true
  });

  // Delete Safeguard Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState(null);
  const [usageCheck, setUsageCheck] = useState(null);

  // Load fields
  const fetchFields = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/excel-fields', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFields(data.data.fields || []);
        setMetrics(data.data.metrics || {});
      } else {
        throw new Error(data.message || 'Failed to fetch fields');
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  // Auto-generate camelCase fieldName from displayName
  const handleDisplayNameChange = (e) => {
    const val = e.target.value;
    const camel = val
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .map((word, idx) => {
        if (idx === 0) return word.toLowerCase();
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('');

    setFormData(prev => ({
      ...prev,
      displayName: val,
      fieldName: editingField ? prev.fieldName : camel
    }));
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingField(null);
    setFormData({
      displayName: '',
      fieldName: '',
      dataType: 'TEXT',
      optionsText: '',
      description: '',
      aliasesText: '',
      required: false,
      enabled: true,
      importEnabled: true,
      exportEnabled: true
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (field) => {
    setEditingField(field);
    setFormData({
      displayName: field.displayName || '',
      fieldName: field.fieldName || '',
      dataType: field.dataType || 'TEXT',
      optionsText: (field.options || []).join(', '),
      description: field.description || '',
      aliasesText: (field.aliases || []).join(', '),
      required: Boolean(field.required),
      enabled: Boolean(field.enabled),
      importEnabled: Boolean(field.importEnabled),
      exportEnabled: Boolean(field.exportEnabled)
    });
    setIsModalOpen(true);
  };

  // Submit Create or Edit Form
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFeedback(null);

    const payload = {
      displayName: formData.displayName.trim(),
      fieldName: formData.fieldName.trim(),
      dataType: formData.dataType,
      options: formData.dataType === 'SELECT'
        ? formData.optionsText.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      description: formData.description.trim(),
      aliases: formData.aliasesText.split(',').map(s => s.trim()).filter(Boolean),
      required: formData.required,
      enabled: formData.enabled,
      importEnabled: formData.importEnabled,
      exportEnabled: formData.exportEnabled
    };

    try {
      let res;
      if (editingField) {
        res = await fetch(`/api/v1/excel-fields/${editingField.fieldId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/v1/excel-fields', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Operation failed');
      }

      setFeedback({
        type: 'success',
        message: editingField
          ? `Field '${payload.displayName}' updated successfully!`
          : `Custom field '${payload.displayName}' added successfully!`
      });
      setIsModalOpen(false);
      await fetchFields();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Toggle
  const handleToggle = async (field, property) => {
    if (field.isLocked) return;
    setActionLoading(true);
    try {
      const newValue = !field[property];
      const res = await fetch(`/api/v1/excel-fields/${field.fieldId}/toggle`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ property, value: newValue })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to toggle property');

      // Optimistic state update
      setFields(prev => prev.map(f => f.fieldId === field.fieldId ? { ...f, [property]: newValue } : f));
      setFeedback({ type: 'success', message: `Updated ${property} for '${field.displayName}'` });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Initiate Delete with Safeguard Check
  const handleInitiateDelete = async (field) => {
    if (field.isLocked) return;
    setFieldToDelete(field);
    setActionLoading(true);

    try {
      const res = await fetch(`/api/v1/excel-fields/${field.fieldId}/usage`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUsageCheck(data.data || { usageCount: 0, canDirectDelete: true });
      setDeleteModalOpen(true);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Delete
  const handleConfirmDelete = async (force = false) => {
    if (!fieldToDelete) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/excel-fields/${fieldToDelete.fieldId}?force=${force}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete field');

      setFeedback({ type: 'success', message: data.message || `Field '${fieldToDelete.displayName}' deleted.` });
      setDeleteModalOpen(false);
      setFieldToDelete(null);
      await fetchFields();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Disable Instead of Delete
  const handleDisableInstead = async () => {
    if (!fieldToDelete) return;
    await handleToggle(fieldToDelete, 'enabled');
    setDeleteModalOpen(false);
    setFieldToDelete(null);
    setFeedback({
      type: 'success',
      message: `Field '${fieldToDelete.displayName}' has been disabled. Historical asset data is safely retained while the field will no longer appear in new import templates.`
    });
  };

  // Download Current Template
  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/v1/import/template', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to download template');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'AAI_Asset_Import_Template_Custom.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Page Header */}
      <PageHeader
        title="Excel Field Configuration"
        subtitle="Manage standard and custom columns for AAI asset import/export templates. Confirmed core business fields remain locked."
        badge="ADMIN SETTINGS"
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link
            to="/import-export"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 14px' }}
          >
            <ArrowLeft size={15} /> Back to Import Pipeline
          </Link>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 14px' }}
          >
            <Download size={15} /> Download Dynamic Template
          </button>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 16px', background: '#002B49' }}
          >
            <Plus size={16} /> Add Configurable Field
          </button>
        </div>
      </PageHeader>

      {/* Locked Core Fields Invariant Banner */}
      <div style={{
        background: '#EFF6FF',
        border: '1px solid #BFDBFE',
        borderRadius: '8px',
        padding: '14px 18px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ background: '#DBEAFE', padding: '8px', borderRadius: '6px', color: '#1E40AF' }}>
          <Lock size={20} />
        </div>
        <div style={{ fontSize: '13px', color: '#1E3A8A' }}>
          <strong style={{ display: 'block', fontSize: '14px', marginBottom: '2px' }}>
            AAI Core Business Fields Protection (13 Fields Locked)
          </strong>
          The 13 confirmed AAI asset fields (User Name, Designation, Department, Floor, Employee ID, Asset Name, Make, Model, Serial Number, Install Date, Warranty End, Type of OS + Version, Remarks) are system-required and permanently locked. They cannot be renamed, disabled, or removed because critical airport compliance and handover workflows rely on them.
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div className="card" style={{ padding: '16px', background: 'var(--surface-color, #ffffff)', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Total Configured Fields</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>{metrics.totalFields}</div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>Active schema attributes</div>
        </div>

        <div className="card" style={{ padding: '16px', background: 'var(--surface-color, #ffffff)', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E40AF', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Lock size={12} /> Core Locked Fields
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#1E40AF', marginTop: '4px' }}>13</div>
          <div style={{ fontSize: '11px', color: '#3B82F6', marginTop: '4px' }}>Fixed standard business fields</div>
        </div>

        <div className="card" style={{ padding: '16px', background: 'var(--surface-color, #ffffff)', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#047857', textTransform: 'uppercase' }}>Custom Fields</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#047857', marginTop: '4px' }}>{metrics.customFields}</div>
          <div style={{ fontSize: '11px', color: '#10B981', marginTop: '4px' }}>Admin-managed columns</div>
        </div>

        <div className="card" style={{ padding: '16px', background: 'var(--surface-color, #ffffff)', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#0284C7', textTransform: 'uppercase' }}>Template / Import Active</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0284C7', marginTop: '4px' }}>{metrics.importEnabledCount}</div>
          <div style={{ fontSize: '11px', color: '#0ea5e9', marginTop: '4px' }}>Columns in generated template</div>
        </div>

        <div className="card" style={{ padding: '16px', background: 'var(--surface-color, #ffffff)', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#7C3AED', textTransform: 'uppercase' }}>Export Active</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#7C3AED', marginTop: '4px' }}>{metrics.exportEnabledCount}</div>
          <div style={{ fontSize: '11px', color: '#8B5CF6', marginTop: '4px' }}>Included in inventory export</div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '6px',
          marginBottom: '20px',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: feedback.type === 'success' ? '#ECFDF5' : '#FEF2F2',
          color: feedback.type === 'success' ? '#065F46' : '#991B1B',
          border: `1px solid ${feedback.type === 'success' ? '#A7F3D0' : '#FECACA'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Fields Table Card */}
      <div className="card" style={{ background: 'var(--surface-color, #ffffff)', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color, #e5e7eb)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-color, #111827)' }}>
              Configured Column Definitions
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#6B7280' }}>
              Order defines sequential column placement in dynamic Excel templates and exports.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchFields}
            disabled={loading}
            className="btn btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--table-header-bg, #f9fafb)', borderBottom: '1px solid var(--border-color, #e5e7eb)', color: '#4B5563', fontWeight: 600 }}>
                <th style={{ padding: '12px 16px', width: '50px' }}>#</th>
                <th style={{ padding: '12px 16px' }}>FIELD NAME</th>
                <th style={{ padding: '12px 16px' }}>DATA TYPE</th>
                <th style={{ padding: '12px 16px' }}>SOURCE</th>
                <th style={{ padding: '12px 16px' }}>REQUIRED</th>
                <th style={{ padding: '12px 16px' }}>IMPORT</th>
                <th style={{ padding: '12px 16px' }}>EXPORT</th>
                <th style={{ padding: '12px 16px' }}>STATUS</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                    <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px', display: 'block' }} />
                    Loading configured fields...
                  </td>
                </tr>
              ) : fields.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                    No fields found.
                  </td>
                </tr>
              ) : (
                fields.map((field, idx) => (
                  <tr
                    key={field.fieldId}
                    style={{
                      borderBottom: '1px solid var(--border-color, #e5e7eb)',
                      background: field.isLocked ? 'rgba(239, 246, 255, 0.3)' : 'transparent',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {/* Index / Sort Order */}
                    <td style={{ padding: '12px 16px', color: '#6B7280', fontWeight: 500 }}>
                      {field.sortOrder || idx + 1}
                    </td>

                    {/* Field Name & Display Name */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-color, #111827)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {field.displayName}
                        {field.isLocked && (
                          <span title="System-required core field (locked)" style={{ color: '#2563EB' }}>
                            <Lock size={13} />
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'monospace', marginTop: '2px' }}>
                        {field.fieldName}
                      </div>
                      {field.description && (
                        <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                          {field.description}
                        </div>
                      )}
                    </td>

                    {/* Data Type */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: field.dataType === 'SELECT' ? '#FEF3C7' : field.dataType === 'DATE' ? '#EDE9FE' : field.dataType === 'NUMBER' ? '#E0F2FE' : '#F3F4F6',
                        color: field.dataType === 'SELECT' ? '#92400E' : field.dataType === 'DATE' ? '#5B21B6' : field.dataType === 'NUMBER' ? '#0369A1' : '#374151'
                      }}>
                        {field.dataType}
                      </span>
                      {field.dataType === 'SELECT' && field.options?.length > 0 && (
                        <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '4px' }}>
                          Allowed: {field.options.slice(0, 3).join(', ')}{field.options.length > 3 ? '...' : ''}
                        </div>
                      )}
                    </td>

                    {/* Source: Locked vs Custom */}
                    <td style={{ padding: '12px 16px' }}>
                      {field.isLocked ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: '#DBEAFE',
                          color: '#1E40AF'
                        }}>
                          <Lock size={11} /> LOCKED / SYSTEM
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: '#ECFDF5',
                          color: '#065F46'
                        }}>
                          CUSTOM
                        </span>
                      )}
                    </td>

                    {/* Required */}
                    <td style={{ padding: '12px 16px' }}>
                      {field.required ? (
                        <span style={{ color: '#DC2626', fontWeight: 600, fontSize: '12px' }}>Required</span>
                      ) : (
                        <span style={{ color: '#6B7280', fontSize: '12px' }}>Optional</span>
                      )}
                    </td>

                    {/* Import Enabled */}
                    <td style={{ padding: '12px 16px' }}>
                      {field.isLocked ? (
                        <span style={{ color: '#059669', fontWeight: 600, fontSize: '12px' }}>LOCKED ON</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggle(field, 'importEnabled')}
                          disabled={actionLoading}
                          style={{
                            border: 'none',
                            background: field.importEnabled ? '#10B981' : '#D1D5DB',
                            color: '#FFFFFF',
                            borderRadius: '12px',
                            padding: '2px 10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {field.importEnabled ? 'ON' : 'OFF'}
                        </button>
                      )}
                    </td>

                    {/* Export Enabled */}
                    <td style={{ padding: '12px 16px' }}>
                      {field.isLocked ? (
                        <span style={{ color: '#059669', fontWeight: 600, fontSize: '12px' }}>LOCKED ON</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggle(field, 'exportEnabled')}
                          disabled={actionLoading}
                          style={{
                            border: 'none',
                            background: field.exportEnabled ? '#10B981' : '#D1D5DB',
                            color: '#FFFFFF',
                            borderRadius: '12px',
                            padding: '2px 10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {field.exportEnabled ? 'ON' : 'OFF'}
                        </button>
                      )}
                    </td>

                    {/* Enabled / Active Status */}
                    <td style={{ padding: '12px 16px' }}>
                      {field.isLocked ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#059669',
                          fontWeight: 600,
                          fontSize: '12px'
                        }}>
                          <Check size={14} /> ACTIVE
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggle(field, 'enabled')}
                          disabled={actionLoading}
                          style={{
                            border: 'none',
                            background: field.enabled ? '#ECFDF5' : '#FEF2F2',
                            color: field.enabled ? '#059669' : '#DC2626',
                            borderRadius: '12px',
                            padding: '2px 10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {field.enabled ? <Check size={12} /> : <X size={12} />}
                          {field.enabled ? 'ACTIVE' : 'DISABLED'}
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {field.isLocked ? (
                        <span style={{ fontSize: '11px', color: '#9CA3AF', fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Lock size={11} /> View Only
                        </span>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(field)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Edit field properties"
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInitiateDelete(field)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '11px', color: '#DC2626', borderColor: '#FCA5A5', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Delete or disable field"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT FIELD MODAL */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#002B49',
              color: '#ffffff'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                {editingField ? `Edit Field: ${editingField.displayName}` : 'Add New Configurable Field'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                {/* Display Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#374151' }}>
                    Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.displayName}
                    onChange={handleDisplayNameChange}
                    placeholder="e.g. Purchase Order Number"
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                  />
                </div>

                {/* Field Name / Key */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#374151' }}>
                    Field Key (camelCase) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingField}
                    value={formData.fieldName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fieldName: e.target.value }))}
                    placeholder="e.g. purchaseOrderNumber"
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #D1D5DB', borderRadius: '6px', background: editingField ? '#F3F4F6' : '#ffffff' }}
                  />
                </div>
              </div>

              {/* Data Type */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#374151' }}>
                  Data Type *
                </label>
                <select
                  value={formData.dataType}
                  onChange={(e) => setFormData(prev => ({ ...prev, dataType: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                >
                  <option value="TEXT">TEXT (Standard short string)</option>
                  <option value="LONG_TEXT">LONG_TEXT (Multiline remarks or notes)</option>
                  <option value="NUMBER">NUMBER (Cost, count, numeric values)</option>
                  <option value="DATE">DATE (Deployment, AMC, or order dates)</option>
                  <option value="BOOLEAN">BOOLEAN (Yes/No flag)</option>
                  <option value="SELECT">SELECT (Predefined allowed values)</option>
                </select>
              </div>

              {/* Allowed Options if SELECT */}
              {formData.dataType === 'SELECT' && (
                <div style={{ marginBottom: '14px', background: '#FEF3C7', padding: '12px', borderRadius: '6px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#92400E' }}>
                    Allowed Select Options (comma-separated) *
                  </label>
                  <input
                    type="text"
                    value={formData.optionsText}
                    onChange={(e) => setFormData(prev => ({ ...prev, optionsText: e.target.value }))}
                    placeholder="e.g. Excellent, Good, Fair, Poor"
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #FCD34D', borderRadius: '6px' }}
                  />
                  <span style={{ fontSize: '11px', color: '#B45309', marginTop: '4px', display: 'block' }}>
                    Example for Asset Condition: Excellent, Good, Fair, Poor
                  </span>
                </div>
              )}

              {/* Aliases for Import Matching */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#374151' }}>
                  Column Aliases for Auto-Mapping (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.aliasesText}
                  onChange={(e) => setFormData(prev => ({ ...prev, aliasesText: e.target.value }))}
                  placeholder="e.g. po no, po number, order ref, purchase order"
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                />
                <span style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px', display: 'block' }}>
                  The ingestion pipeline will automatically map source Excel headers matching any of these aliases.
                </span>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#374151' }}>
                  Description / Template Guidance
                </label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g. Official SAP Purchase Order reference number"
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                />
              </div>

              {/* Control Checkboxes */}
              <div style={{
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                padding: '12px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginBottom: '20px'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.importEnabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, importEnabled: e.target.checked }))}
                  />
                  <span>Include in <strong>Import Template</strong></span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.exportEnabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, exportEnabled: e.target.checked }))}
                  />
                  <span>Include in <strong>Excel Export</strong></span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.required}
                    onChange={(e) => setFormData(prev => ({ ...prev, required: e.target.checked }))}
                  />
                  <span>Mark as <strong>Required</strong></span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                  />
                  <span>Status: <strong>Active (Enabled)</strong></span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading}
                  style={{ background: '#002B49' }}
                >
                  {actionLoading ? 'Saving...' : editingField ? 'Save Changes' : 'Create Field'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE VS DISABLE SAFEGUARD MODAL */}
      {deleteModalOpen && fieldToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: usageCheck?.usageCount > 0 ? '#FEF2F2' : '#F9FAFB',
              color: usageCheck?.usageCount > 0 ? '#991B1B' : '#111827'
            }}>
              <AlertTriangle size={20} color={usageCheck?.usageCount > 0 ? '#DC2626' : '#F59E0B'} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                {usageCheck?.usageCount > 0 ? 'Safeguard: Field Contains Historical Data' : `Delete Field: ${fieldToDelete.displayName}`}
              </h3>
            </div>

            <div style={{ padding: '20px', fontSize: '13px', color: '#374151' }}>
              {usageCheck?.usageCount > 0 ? (
                <>
                  <p style={{ marginTop: 0, lineHeight: 1.5 }}>
                    <strong>Warning:</strong> Field <strong>'{fieldToDelete.displayName}'</strong> is currently populated in <strong>{usageCheck.usageCount} asset record(s)</strong>.
                  </p>
                  <div style={{
                    background: '#FEF3C7',
                    border: '1px solid #FCD34D',
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: '16px',
                    color: '#92400E'
                  }}>
                    <strong>Recommendation: DISABLE instead of DELETING</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
                      Disabling the field removes it from future downloadable templates and export sheets while safely preserving all historical asset audit data.
                    </p>
                  </div>
                </>
              ) : (
                <p style={{ marginTop: 0, lineHeight: 1.5 }}>
                  Field <strong>'{fieldToDelete.displayName}'</strong> is not currently used by any assets. It can be safely deleted permanently.
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={actionLoading}
                >
                  Cancel
                </button>

                {usageCheck?.usageCount > 0 && (
                  <button
                    type="button"
                    onClick={handleDisableInstead}
                    className="btn btn-primary"
                    disabled={actionLoading}
                    style={{ background: '#0284C7' }}
                  >
                    Disable Field (Recommended)
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleConfirmDelete(true)}
                  className="btn btn-danger"
                  disabled={actionLoading}
                  style={{ background: '#DC2626', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  {actionLoading ? 'Processing...' : usageCheck?.usageCount > 0 ? 'Force Permanent Delete' : 'Delete Field'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
