import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  FileCheck,
  X,
  RefreshCw,
  Boxes,
  HelpCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import { DataTable } from '../components/ui/DataTable';

export default function BulkImportExport() {
  const { token } = useAuth();
  const fileInputRef = useRef(null);

  // Workflow Step: 'UPLOAD' | 'PREVIEW' | 'COMPLETE'
  const [currentStep, setCurrentStep] = useState('UPLOAD');

  // File state
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState(null);

  // Staged Validation Results
  const [validationResult, setValidationResult] = useState(null);
  const [previewFilter, setPreviewFilter] = useState('ALL'); // 'ALL' | 'VALID' | 'INVALID'

  // Commit Results
  const [commitResult, setCommitResult] = useState(null);
  const [conflictStrategy, setConflictStrategy] = useState('SKIP_EXISTING');

  // Download Sample Template
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
      a.download = 'AAI_Asset_Import_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateFileSelection(file);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateFileSelection(e.target.files[0]);
    }
  };

  const validateFileSelection = (file) => {
    setError(null);
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Invalid file type. Please select an Excel workbook (.xlsx, .xls) or CSV (.csv)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds maximum permitted limit of 10MB');
      return;
    }
    setSelectedFile(file);
  };

  // Step 1: Upload & Validate Spreadsheet
  const handleValidateSpreadsheet = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('/api/v1/import/validate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Validation failed');
      }

      setValidationResult(data.data);
      setCurrentStep('PREVIEW');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Step 2: Confirm Commit
  const handleCommitImport = async () => {
    if (!validationResult?.importToken) return;

    setIsCommitting(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/import/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          importToken: validationResult.importToken,
          conflictStrategy
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Import ingestion failed');
      }

      setCommitResult(data.data);
      setCurrentStep('COMPLETE');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleReset = () => {
    setCurrentStep('UPLOAD');
    setSelectedFile(null);
    setValidationResult(null);
    setCommitResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validRows = validationResult?.validRows || [];
  const invalidRows = validationResult?.invalidRows || [];

  return (
    <div className="page-body">
      {/* Standardized Page Header */}
      <PageHeader
        title="Bulk Excel Import Engine"
        icon={FileSpreadsheet}
        subtitle="Two-phase validation wizard. Ingest legacy department hardware inventories with automated duplicate detection."
      >
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleDownloadTemplate}
          id="btn-download-template"
        >
          <Download size={15} />
          <span>Download Sample Template (.xlsx)</span>
        </button>
      </PageHeader>

      {/* Wizard Step Progress Tracker */}
      <div className="wizard-card" style={{ marginBottom: '4px' }}>
        <div className="wizard-steps-grid">
          {/* Step 1 */}
          <div className="wizard-step-node">
            <div className={`wizard-step-circle ${currentStep === 'UPLOAD' ? 'active' : 'completed'}`}>
              {currentStep === 'UPLOAD' ? '1' : <CheckCircle2 size={16} />}
            </div>
            <div className="wizard-step-content">
              <span className="wizard-step-title">Upload Spreadsheet</span>
              <span className="wizard-step-subtitle">Select .xlsx or .csv</span>
            </div>
          </div>

          <ArrowRight size={16} color="var(--border-strong)" style={{ flexShrink: 0 }} />

          {/* Step 2 */}
          <div className="wizard-step-node">
            <div className={`wizard-step-circle ${currentStep === 'PREVIEW' ? 'active' : currentStep === 'COMPLETE' ? 'completed' : 'pending'}`}>
              {currentStep === 'COMPLETE' ? <CheckCircle2 size={16} /> : '2'}
            </div>
            <div className="wizard-step-content">
              <span className="wizard-step-title">Validation & Preview</span>
              <span className="wizard-step-subtitle">Audit staged rows</span>
            </div>
          </div>

          <ArrowRight size={16} color="var(--border-strong)" style={{ flexShrink: 0 }} />

          {/* Step 3 */}
          <div className="wizard-step-node">
            <div className={`wizard-step-circle ${currentStep === 'COMPLETE' ? 'completed' : 'pending'}`}>
              {currentStep === 'COMPLETE' ? <CheckCircle2 size={16} /> : '3'}
            </div>
            <div className="wizard-step-content">
              <span className="wizard-step-title">Database Ingestion</span>
              <span className="wizard-step-subtitle">Commit assets to DB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="card" style={{
          backgroundColor: 'var(--status-danger-bg)',
          borderColor: 'var(--status-danger-border)',
          color: 'var(--status-danger-text)',
          padding: '10px 14px',
          marginBottom: '4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} color="#EF4444" />
            <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>{error}</span>
          </div>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ================= STEP 1: UPLOAD & RECOGNIZED FIELDS ================= */}
      {currentStep === 'UPLOAD' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* 2-Column Balanced Grid */}
          <div className="excel-workspace-grid">
            {/* Left Column: Dropzone */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`excel-dropzone ${isDragging ? 'dragging' : ''}`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx,.xls,.csv"
                  style={{ display: 'none' }}
                  id="file-upload-input"
                />

                <div style={{
                  display: 'inline-flex',
                  padding: '10px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-brand-50)',
                  color: 'var(--color-brand-600)',
                  marginBottom: '10px'
                }}>
                  <Upload size={24} />
                </div>

                <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: 'var(--color-brand-title)', fontWeight: 600 }}>
                  {selectedFile ? selectedFile.name : 'Drag & drop Excel or CSV file here'}
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 14px 0', fontSize: '0.8rem' }}>
                  {selectedFile
                    ? `${(selectedFile.size / 1024).toFixed(1)} KB • Ready for validation`
                    : 'Supports .xlsx, .xls, and .csv workbooks up to 10MB'}
                </p>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Browse Local Files
                </button>
              </div>

              {/* Validation Action Bar */}
              {selectedFile && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                  <button className="btn btn-secondary btn-sm" onClick={handleReset}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleValidateSpreadsheet}
                    disabled={isUploading}
                    id="btn-validate-sheet"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw size={14} className="pulse-dot" />
                        <span>Validating...</span>
                      </>
                    ) : (
                      <>
                        <FileCheck size={14} />
                        <span>Validate & Stage</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: 13 Confirmed Specification Specs Info Card */}
            <div className="excel-specs-card">
              <div className="card-header" style={{ marginBottom: '8px', paddingBottom: '6px' }}>
                <h3 className="card-title" style={{ fontSize: '0.85rem' }}>
                  <HelpCircle size={15} color="var(--color-brand-600)" />
                  <span>Recognized Column Headers (13 Fields)</span>
                </h3>
                <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>Confirmed Spec</span>
              </div>

              <div className="excel-specs-grid">
                <div className="excel-field-item">1. <strong>User Name</strong> <span style={{ color: 'var(--color-text-muted)' }}>(Custodian)</span></div>
                <div className="excel-field-item">2. <strong>Designation</strong></div>
                <div className="excel-field-item">3. <strong>Department</strong> <span style={{ color: 'var(--color-brand-600)', fontSize: '0.7rem' }}>(Direct)</span></div>
                <div className="excel-field-item">4. <strong>Floor</strong> <span style={{ color: 'var(--color-text-muted)' }}>(Location)</span></div>
                <div className="excel-field-item">5. <strong>Employee ID</strong></div>
                <div className="excel-field-item">6. <strong>Asset Name</strong></div>
                <div className="excel-field-item">7. <strong>Make / Company</strong></div>
                <div className="excel-field-item">8. <strong>Model</strong></div>
                <div className="excel-field-item">9. <strong>Serial Number</strong> <span style={{ color: 'var(--color-brand-600)', fontSize: '0.7rem' }}>(Unique)</span></div>
                <div className="excel-field-item">10. <strong>Install Date</strong></div>
                <div className="excel-field-item">11. <strong>Warranty End</strong></div>
                <div className="excel-field-item">12. <strong>Type of OS</strong> (+ Version)</div>
                <div className="excel-field-item" style={{ gridColumn: 'span 2' }}>13. <strong>Remarks</strong> <span style={{ color: 'var(--color-text-muted)' }}>(Handover notes)</span></div>
              </div>

              <div style={{ marginTop: '10px', padding: '8px 10px', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                Headers must match these specifications. Automatic alias mapping is applied for legacy regional spreadsheets.
              </div>
            </div>
          </div>

          {/* Export Central Asset Inventory Card - Aligned Full Width Below */}
          <div className="excel-export-card">
            <div>
              <h3 style={{ margin: '0 0 3px 0', fontSize: '0.925rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-brand-title)' }}>
                <Download size={16} color="var(--color-brand-600)" />
                <span>Export Central Asset Inventory</span>
              </h3>
              <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.78rem' }}>
                Download official AAI equipment register including current custodian, physical location, and warranty specifications.
              </p>
            </div>

            <button
              className="btn btn-primary btn-sm"
              onClick={async () => {
                try {
                  const res = await fetch('/api/v1/export/assets/excel', {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  if (!res.ok) throw new Error('Export failed');
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `AAI_Central_Asset_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  setError(err.message);
                }
              }}
              id="btn-export-full-inventory"
              style={{ whiteSpace: 'nowrap' }}
            >
              <Download size={14} />
              <span>Export (.xlsx)</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 2: PREVIEW ================= */}
      {currentStep === 'PREVIEW' && validationResult && (
        <div>
          {/* Summary Metric Chips */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-6)'
          }}>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Rows Scanned
              </div>
              <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--color-brand-900)' }}>
                {validationResult.totalRows}
              </div>
            </div>

            <div className="card" style={{ padding: '16px', borderColor: 'var(--status-available-border)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--status-available-text)', fontWeight: 600, textTransform: 'uppercase' }}>
                Valid Assets Ready
              </div>
              <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--status-available-text)' }}>
                {validationResult.validCount}
              </div>
            </div>

            <div className="card" style={{ padding: '16px', borderColor: validationResult.invalidCount > 0 ? 'var(--status-danger-border)' : 'var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: validationResult.invalidCount > 0 ? 'var(--status-danger-text)' : 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Rows With Issues
              </div>
              <div style={{ fontSize: '1.625rem', fontWeight: 700, color: validationResult.invalidCount > 0 ? 'var(--status-danger-text)' : 'inherit' }}>
                {validationResult.invalidCount}
              </div>
            </div>
          </div>

          {/* Table Header Filter Tabs and Conflict Strategy */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-4)',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className={`btn ${previewFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => setPreviewFilter('ALL')}
              >
                All ({validationResult.totalRows})
              </button>
              <button
                className={`btn ${previewFilter === 'VALID' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => setPreviewFilter('VALID')}
              >
                Valid Ready ({validationResult.validCount})
              </button>
              <button
                className={`btn ${previewFilter === 'INVALID' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => setPreviewFilter('INVALID')}
              >
                With Issues ({validationResult.invalidCount})
              </button>
            </div>

            {/* Ingestion Strategy Options */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Conflict Strategy:</span>
              <select
                className="form-select"
                value={conflictStrategy}
                onChange={(e) => setConflictStrategy(e.target.value)}
                style={{ width: 'auto', height: '34px', fontSize: '0.8125rem' }}
              >
                <option value="SKIP_EXISTING">Skip Duplicate Serials</option>
              </select>
            </div>
          </div>

          {/* Staged Rows Table */}
          <DataTable id="import-preview-table" style={{ marginBottom: 'var(--space-6)' }}>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Row #</th>
                <th>Validation Status</th>
                <th>Asset Name & Category</th>
                <th>Make & Model</th>
                <th>Serial Number</th>
                <th>Department / Floor</th>
                <th>Custodian</th>
                <th>Issues / Notices</th>
              </tr>
            </thead>
            <tbody>
              {/* Invalid Rows */}
              {(previewFilter === 'ALL' || previewFilter === 'INVALID') &&
                invalidRows.map((item, idx) => (
                  <tr key={`inv-${idx}`} style={{ backgroundColor: 'var(--status-danger-bg)' }}>
                    <td style={{ fontWeight: 600 }}>{item.rowIndex}</td>
                    <td>
                      <span className="badge badge-danger">
                        INVALID
                      </span>
                    </td>
                    <td>{item.data.assetName || '—'}</td>
                    <td>{item.data.make} {item.data.model}</td>
                    <td><code style={{ fontSize: '0.78rem' }}>{item.data.serialNumber || '—'}</code></td>
                    <td>{item.data.department || '—'}</td>
                    <td>{item.data.userName || '—'}</td>
                    <td style={{ color: 'var(--status-danger-text)' }}>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem' }}>
                        {item.errors.map((e, errIdx) => (
                          <li key={errIdx}>{e}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}

              {/* Valid Rows */}
              {(previewFilter === 'ALL' || previewFilter === 'VALID') &&
                validRows.map((item, idx) => (
                  <tr key={`val-${idx}`}>
                    <td style={{ fontWeight: 600 }}>{item._rowIndex || idx + 1}</td>
                    <td>
                      <span className="badge badge-available">READY</span>
                    </td>
                    <td>
                      <strong>{item.assetName}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{item.category}</div>
                    </td>
                    <td>{item.make} {item.model}</td>
                    <td><code style={{ fontSize: '0.78rem' }}>{item.serialNumber}</code></td>
                    <td>
                      <div>{item.department}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{item.floor}</div>
                    </td>
                    <td>
                      {item.custodian ? (
                        <div>
                          <strong>{item.custodian.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{item.custodian.employeeId}</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Unassigned (IT Store)</span>
                      )}
                    </td>
                    <td style={{ color: '#059669' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8125rem' }}>
                        <CheckCircle2 size={14} color="#10B981" />
                        <span>Passed all checks</span>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </DataTable>

          {/* Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <button className="btn btn-secondary" onClick={handleReset}>
              Discard & Upload Another File
            </button>

            <button
              className="btn btn-primary"
              onClick={handleCommitImport}
              disabled={isCommitting || validRows.length === 0}
              id="btn-confirm-commit"
            >
              {isCommitting ? (
                <>
                  <RefreshCw size={16} className="pulse-dot" />
                  <span>Ingesting {validRows.length} Assets...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Confirm & Commit {validRows.length} Valid Assets</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: COMPLETE ================= */}
      {currentStep === 'COMPLETE' && commitResult && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{
            display: 'inline-flex',
            padding: '16px',
            borderRadius: '50%',
            backgroundColor: 'var(--status-available-bg)',
            color: 'var(--status-available-text)',
            marginBottom: '16px'
          }}>
            <CheckCircle2 size={44} />
          </div>

          <h2 style={{ fontSize: '1.625rem', margin: '0 0 6px 0', color: 'var(--color-brand-title)' }}>
            Bulk Ingestion Completed!
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: '500px', margin: '0 auto 20px auto', fontSize: '0.875rem' }}>
            Successfully added <strong>{commitResult.importedCount}</strong> new IT assets to the AAI Regional Office database.
            Custody records and assignments were generated automatically.
          </p>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            marginBottom: '16px'
          }}>
            <div className="card" style={{ padding: '12px 24px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>IMPORTED ASSETS</div>
              <div style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--status-available-text)' }}>{commitResult.importedCount}</div>
            </div>
            {commitResult.skippedCount > 0 && (
              <div className="card" style={{ padding: '12px 24px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>SKIPPED DUPLICATES</div>
                <div style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--status-maintenance-text)' }}>{commitResult.skippedCount}</div>
              </div>
            )}
          </div>

          <div style={{ maxWidth: '600px', margin: '0 auto 24px auto', padding: '8px 12px', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            * Institutional batch reconciliation: <strong>TECHNICALLY RECOMMENDED — BUSINESS CONFIRMATION REQUIRED</strong> for final fixed asset capitalization register sign-off.
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={handleReset}>
              Import Another Spreadsheet
            </button>
            <Link to="/assets" className="btn btn-primary" id="btn-view-inventory">
              <Boxes size={16} />
              <span>View Asset Inventory</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
