import React, { useState, useEffect, useId } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowRightLeft, 
  Plus, 
  RotateCcw, 
  History, 
  FileText, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Eye
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import { SearchInput, SelectInput, ClearFilterButton } from '../components/ui/FormControls';
import { DataTable } from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import LoadMoreButton from '../components/ui/LoadMoreButton';
import { downloadAuthenticatedPdf } from '../services/api';

export default function AssetTransfers() {
  const { token } = useAuth();
  const searchInputId = useId();

  // Core Data States
  const [assignments, setAssignments] = useState([]);
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Pagination & Load More States
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(null);

  // Modals Management
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Active Asset Timeline Selection
  const [timelineAsset, setTimelineAsset] = useState(null);
  const [assetHistory, setAssetHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Filters and Search
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Form State: Assign Asset
  const [assignForm, setAssignForm] = useState({
    assetId: '',
    employeeId: '',
    condition: 'GOOD',
    transferReason: 'Initial Staff Assignment',
    remarks: ''
  });

  // Form State: Transfer Asset
  const [transferForm, setTransferForm] = useState({
    assetId: '',
    toEmployeeId: '',
    conditionAtReturn: 'GOOD',
    conditionAtNewAssignment: 'GOOD',
    transferReason: '',
    remarks: ''
  });

  // Form State: Return Asset to IT Pool
  const [returnForm, setReturnForm] = useState({
    assetId: '',
    conditionAtReturn: 'GOOD',
    returnReason: 'Return to IT Reserve Store',
    remarks: ''
  });

  // Fetch master data (assets, employees)
  const fetchMasterData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [assetRes, empRes] = await Promise.all([
        fetch('/api/v1/assets?limit=200', { headers }),
        fetch('/api/v1/employees?limit=200', { headers })
      ]);
      const [assetData, empData] = await Promise.all([assetRes.json(), empRes.json()]);
      if (assetData.success) setAssets(assetData.data || []);
      if (empData.success) setEmployees(empData.data || []);
    } catch (err) {
      console.error('Failed to load master asset/employee lists', err);
    }
  };

  // Fetch paginated assignments
  const fetchAssignments = async (pageNum = 1, isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
      setLoadMoreError(null);
    } else {
      setLoading(true);
      setLoadMoreError(null);
    }
    try {
      const params = new URLSearchParams();
      params.append('page', String(pageNum));
      params.append('limit', '20');
      if (search) params.append('search', search);
      if (selectedStatus) params.append('status', selectedStatus);

      const res = await fetch(`/api/v1/assignments?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const items = Array.isArray(data.data) ? data.data : (data.data?.items || []);
        if (isLoadMore) {
          setAssignments(prev => [...prev, ...items]);
        } else {
          setAssignments(items);
        }
        setTotalCount(data.pagination?.total ?? (isLoadMore ? assignments.length + items.length : items.length));
        setPage(pageNum);
      }
    } catch (err) {
      console.error('Failed to load transfer records', err);
      if (isLoadMore) {
        setLoadMoreError(err.message || 'Failed to load more transfer records');
      } else {
        setError(err.message || 'Failed to load transfer records');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (loadingMore || loading) return;
    fetchAssignments(page + 1, true);
  };

  const fetchAllData = () => {
    fetchMasterData();
    fetchAssignments(1, false);
  };

  useEffect(() => {
    fetchMasterData();
  }, [token]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPage(1);
      fetchAssignments(1, false);
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search, selectedStatus, token]);

  // View Asset Timeline
  const handleOpenTimeline = async (assetId, assetName) => {
    setTimelineAsset({ assetId, assetName });
    setIsTimelineOpen(true);
    setHistoryLoading(true);

    try {
      const res = await fetch(`/api/v1/assignments/asset/${assetId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAssetHistory(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load asset history', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDownloadSlip = async (assignmentId) => {
    try {
      await downloadAuthenticatedPdf(
        `/api/v1/export/handover/${assignmentId}/pdf`,
        `AAI_Handover_${assignmentId}.pdf`
      );
    } catch (err) {
      alert(err.message || 'Failed to download official handover slip');
    }
  };

  // Submit New Assignment
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/v1/assignments/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(assignForm)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Assignment failed');
      }

      setSuccessMessage(`Asset '${assignForm.assetId}' successfully assigned!`);
      setIsAssignModalOpen(false);
      setAssignForm({
        assetId: '',
        employeeId: '',
        condition: 'GOOD',
        transferReason: 'Initial Staff Assignment',
        remarks: ''
      });
      fetchAllData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Submit Asset Transfer
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/v1/assignments/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(transferForm)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Transfer failed');
      }

      setSuccessMessage(`Asset '${transferForm.assetId}' transferred successfully!`);
      setIsTransferModalOpen(false);
      setTransferForm({
        assetId: '',
        toEmployeeId: '',
        conditionAtReturn: 'GOOD',
        conditionAtNewAssignment: 'GOOD',
        transferReason: '',
        remarks: ''
      });
      fetchAllData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Submit Return to Pool
  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/v1/assignments/return', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(returnForm)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Return to pool failed');
      }

      setSuccessMessage(`Asset '${returnForm.assetId}' returned to inventory pool.`);
      setIsReturnModalOpen(false);
      setReturnForm({
        assetId: '',
        conditionAtReturn: 'GOOD',
        returnReason: 'Return to IT Reserve Store',
        remarks: ''
      });
      fetchAllData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Currently selected transfer asset
  const selectedTransferAsset = assets.find(a => a.assetId === transferForm.assetId);

  // Assignments List (Server-Filtered)
  const filteredAssignments = assignments;

  // Summary Metrics
  const totalRecords = assignments.length;
  const activeCount = assignments.filter(a => a.status === 'ACTIVE').length;
  const transferredCount = assignments.filter(a => a.status === 'TRANSFERRED').length;
  const returnedCount = assignments.filter(a => a.status === 'RETURNED').length;

  // Available and Assigned Assets Filtered for Modals
  const availableAssets = assets.filter(a => a.status === 'AVAILABLE');
  const assignedAssets = assets.filter(a => a.status === 'ASSIGNED');
  const activeEmployees = employees.filter(e => e.isActive);

  return (
    <div className="page-body">
      {/* Standardized Page Header */}
      <PageHeader
        title="Asset Custody & Transfer Engine"
        icon={ArrowRightLeft}
        badgeText="Custody Ledger"
        subtitle="Immutable historical custody ledger. Track hardware assignments, departmental handovers, and return to IT store."
      >
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setIsReturnModalOpen(true)}
          disabled={assignedAssets.length === 0}
          id="btn-return-pool"
        >
          <RotateCcw size={14} />
          <span>Return to Pool</span>
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setIsTransferModalOpen(true)}
          disabled={assignedAssets.length === 0}
          id="btn-transfer-asset"
        >
          <ArrowRightLeft size={14} />
          <span>Transfer</span>
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setIsAssignModalOpen(true)}
          disabled={availableAssets.length === 0}
          id="btn-assign-asset"
        >
          <Plus size={14} />
          <span>Assign Equipment</span>
        </button>
      </PageHeader>

      {/* Success Banner */}
      {successMessage && (
        <div className="card" style={{
          backgroundColor: '#ECFDF5',
          borderColor: '#10B981',
          color: '#065F46',
          padding: '12px 16px',
          marginBottom: 'var(--space-5)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} color="#10B981" />
            <span style={{ fontWeight: 500 }}>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065F46' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="card" style={{
          backgroundColor: '#FEF2F2',
          borderColor: '#EF4444',
          color: '#991B1B',
          padding: '12px 16px',
          marginBottom: 'var(--space-5)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} color="#EF4444" />
            <span style={{ fontWeight: 500 }}>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Standardized Metric Summary Cards */}
      <div className="stats-grid cols-4">
        <StatCard
          label="Total Ledger Records"
          value={totalRecords}
          subtext="Chronological assignment log"
          icon={History}
          variant="indigo"
        />

        <StatCard
          label="Active Custody"
          value={activeCount}
          subtext="Currently deployed to staff"
          icon={CheckCircle2}
          variant="emerald"
        />

        <StatCard
          label="Transferred Log"
          value={transferredCount}
          subtext="Inter-department handovers"
          icon={ArrowRightLeft}
          variant="indigo"
        />

        <StatCard
          label="Returned to Store"
          value={returnedCount}
          subtext="Restored to IT warehouse stock"
          icon={RotateCcw}
          variant="neutral"
        />
      </div>

      {/* Standardized Filter and Search Bar */}
      <div className="filter-bar">
        <div style={{
          display: 'grid',
          gridTemplateColumns: search || selectedStatus ? '1fr 220px auto' : '1fr 220px',
          gap: 'var(--space-2)',
          alignItems: 'center'
        }}>
          <SearchInput
            id={searchInputId}
            placeholder="Search by assignment ID, asset tag, staff name, department, or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />

          <SelectInput
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            placeholder="All Statuses"
            options={[
              { value: 'ACTIVE', label: 'ACTIVE (In Use)' },
              { value: 'TRANSFERRED', label: 'TRANSFERRED' },
              { value: 'RETURNED', label: 'RETURNED' }
            ]}
          />

          {(search || selectedStatus) && (
            <ClearFilterButton
              onClick={() => {
                setSearch('');
                setSelectedStatus('');
              }}
            />
          )}
        </div>
      </div>

      {/* Custody Ledger Table */}
      <DataTable id="transfers-data-table">
        <thead>
          <tr>
            <th>Assignment ID</th>
            <th>Asset</th>
            <th>Custodian</th>
            <th>Department / Floor</th>
            <th>Assigned / Returned</th>
            <th>Condition</th>
            <th>Status</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-4)' }}>
                <div className="pulse-dot" style={{ margin: '0 auto var(--space-3)' }} />
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Loading custody ledger...</span>
              </td>
            </tr>
          ) : filteredAssignments.length === 0 ? (
            <EmptyState
              icon={ArrowRightLeft}
              title="No custody records match current criteria"
              description="Try modifying your search query or reset filter options."
              colSpan={8}
              action={
                (search || selectedStatus) ? (
                  <button onClick={() => { setSearch(''); setSelectedStatus(''); }} className="btn btn-secondary btn-sm">
                    Reset Filter
                  </button>
                ) : null
              }
            />
          ) : (
            filteredAssignments.map((item) => (
              <tr key={item.assignmentId || item._id}>
                <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                  {item.assignmentId}
                </td>

                <td>
                  <div style={{ fontWeight: 600, color: 'var(--color-brand-600)' }}>{item.assetId}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                    {item.assetName || 'AAI Equipment'}
                  </div>
                </td>

                <td>
                  <div style={{ fontWeight: 600 }}>{item.employeeName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    <code>{item.employeeId}</code> {item.designation ? `• ${item.designation}` : ''}
                  </div>
                </td>

                <td>
                  <div>{item.department}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{item.floor}</div>
                </td>

                <td>
                  <div style={{ fontSize: '0.8125rem' }}>
                    <strong>{new Date(item.assignedDate).toLocaleDateString()}</strong>
                  </div>
                  {item.returnedDate ? (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      Ret: {new Date(item.returnedDate).toLocaleDateString()}
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>Active Now</span>
                  )}
                </td>

                <td>
                  <span className="badge badge-neutral">{item.conditionAtAssignment}</span>
                </td>

                <td>
                  <span className={`badge ${
                    item.status === 'ACTIVE'
                      ? 'badge-available'
                      : item.status === 'TRANSFERRED'
                      ? 'badge-assigned'
                      : 'badge-neutral'
                  }`}>
                    {item.status}
                  </span>
                </td>

                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div className="action-btn-group">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => { setSelectedRecord(item); setIsDetailModalOpen(true); }}
                      title="View Complete Transfer Details & Remarks"
                    >
                      <Eye size={14} />
                      <span>Details</span>
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenTimeline(item.assetId, item.assetName)}
                      title="View Asset Custody Timeline"
                    >
                      <History size={14} />
                      <span>Timeline</span>
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDownloadSlip(item.assignmentId)}
                      title="Download Printable Handover Slip"
                    >
                      <FileText size={14} />
                      <span>Slip</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>

      {/* Progressive Load More Data Control */}
      {filteredAssignments.length > 0 && (
        <LoadMoreButton
          currentCount={filteredAssignments.length}
          totalCount={totalCount}
          loading={loadingMore}
          onLoadMore={handleLoadMore}
          error={loadMoreError}
          onRetry={handleLoadMore}
          itemName="custody records"
          id="load-more-transfers-btn"
        />
      )}

      {/* ================= MODAL: ASSIGN EQUIPMENT ================= */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Equipment to Staff"
        subtitle="Registers formal custody handover with regulatory signature tracking"
        size="md"
        id="assign-modal"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAssignModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              id="btn-submit-assign"
              onClick={handleAssignSubmit}
            >
              Confirm Assignment
            </button>
          </>
        }
      >
        <form onSubmit={handleAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className="form-group">
            <label className="form-label">Select Available Asset *</label>
            <select
              className="form-select"
              required
              value={assignForm.assetId}
              onChange={(e) => setAssignForm({ ...assignForm, assetId: e.target.value })}
            >
              <option value="">-- Choose Available Equipment --</option>
              {availableAssets.map(a => (
                <option key={a.assetId} value={a.assetId}>
                  {a.assetId} - {a.assetName} ({a.make} {a.model})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Assignee Staff Member *</label>
            <select
              className="form-select"
              required
              value={assignForm.employeeId}
              onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
            >
              <option value="">-- Select Employee --</option>
              {activeEmployees.map(emp => (
                <option key={emp.employeeId} value={emp.employeeId}>
                  {emp.name} ({emp.employeeId}) • {emp.designation} - {emp.department}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Physical Condition at Handover</label>
            <select
              className="form-select"
              value={assignForm.condition}
              onChange={(e) => setAssignForm({ ...assignForm, condition: e.target.value })}
            >
              <option value="EXCELLENT">EXCELLENT (Pristine / Like New)</option>
              <option value="GOOD">GOOD (Functional with minor wear)</option>
              <option value="FAIR">FAIR (Operational with cosmetic wear)</option>
              <option value="POOR">POOR (Degraded performance)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Assignment Reason / Justification *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. New Employee Onboarding, Terminal Upgrade"
              value={assignForm.transferReason}
              onChange={(e) => setAssignForm({ ...assignForm, transferReason: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Handover Remarks (Optional)</label>
            <textarea
              className="form-control"
              style={{ height: 'auto', padding: '8px 12px' }}
              rows={2}
              placeholder="Additional notes on cables, accessories, installed software..."
              value={assignForm.remarks}
              onChange={(e) => setAssignForm({ ...assignForm, remarks: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: TRANSFER CUSTODY ================= */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Transfer Equipment Custody"
        subtitle="Direct inter-departmental handover between staff members"
        size="md"
        id="transfer-modal"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsTransferModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              id="btn-submit-transfer"
              onClick={handleTransferSubmit}
            >
              Execute Transfer
            </button>
          </>
        }
      >
        <form onSubmit={handleTransferSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className="form-group">
            <label className="form-label">Select Currently Assigned Asset *</label>
            <select
              className="form-select"
              required
              value={transferForm.assetId}
              onChange={(e) => setTransferForm({ ...transferForm, assetId: e.target.value })}
            >
              <option value="">-- Choose Assigned Equipment --</option>
              {assignedAssets.map(a => (
                <option key={a.assetId} value={a.assetId}>
                  {a.assetId} - {a.assetName} (Held by: {a.currentEmployeeName || 'Staff'})
                </option>
              ))}
            </select>
          </div>

          {selectedTransferAsset && (
            <div style={{
              background: 'var(--color-bg-subtle)',
              border: '1px dashed var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              fontSize: '0.8125rem'
            }}>
              <div style={{ fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                Current Custodian Information:
              </div>
              <div><strong>Name:</strong> {selectedTransferAsset.currentEmployeeName} ({selectedTransferAsset.currentEmployeeId})</div>
              <div><strong>Designation:</strong> {selectedTransferAsset.currentDesignation || 'N/A'}</div>
              <div><strong>Department:</strong> {selectedTransferAsset.department} • <strong>Floor:</strong> {selectedTransferAsset.floor}</div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Transfer To New Custodian (Target Staff) *</label>
            <select
              className="form-select"
              required
              value={transferForm.toEmployeeId}
              onChange={(e) => setTransferForm({ ...transferForm, toEmployeeId: e.target.value })}
            >
              <option value="">-- Select New Employee --</option>
              {activeEmployees
                .filter(emp => !selectedTransferAsset || emp.employeeId !== selectedTransferAsset.currentEmployeeId)
                .map(emp => (
                  <option key={emp.employeeId} value={emp.employeeId}>
                    {emp.name} ({emp.employeeId}) • {emp.designation} - {emp.department}
                  </option>
                ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Condition at Relinquish</label>
              <select
                className="form-select"
                value={transferForm.conditionAtReturn}
                onChange={(e) => setTransferForm({ ...transferForm, conditionAtReturn: e.target.value })}
              >
                <option value="EXCELLENT">EXCELLENT</option>
                <option value="GOOD">GOOD</option>
                <option value="FAIR">FAIR</option>
                <option value="POOR">POOR</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Condition at Reassignment</label>
              <select
                className="form-select"
                value={transferForm.conditionAtNewAssignment}
                onChange={(e) => setTransferForm({ ...transferForm, conditionAtNewAssignment: e.target.value })}
              >
                <option value="EXCELLENT">EXCELLENT</option>
                <option value="GOOD">GOOD</option>
                <option value="FAIR">FAIR</option>
                <option value="POOR">POOR</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Transfer Reason *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Department Relocation, Staff Promotion, Seat Reallocation"
              value={transferForm.transferReason}
              onChange={(e) => setTransferForm({ ...transferForm, transferReason: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Handover Notes (Optional)</label>
            <textarea
              className="form-control"
              style={{ height: 'auto', padding: '8px 12px' }}
              rows={2}
              placeholder="Notes on handover sign-off, asset verification..."
              value={transferForm.remarks}
              onChange={(e) => setTransferForm({ ...transferForm, remarks: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: RETURN TO POOL ================= */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title="Return Equipment to IT Store"
        subtitle="Unassigns equipment and returns to available reserve warehouse inventory"
        size="md"
        id="return-modal"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsReturnModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              id="btn-submit-return"
              onClick={handleReturnSubmit}
            >
              Unassign & Return
            </button>
          </>
        }
      >
        <form onSubmit={handleReturnSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className="form-group">
            <label className="form-label">Select Equipment to Return *</label>
            <select
              className="form-select"
              required
              value={returnForm.assetId}
              onChange={(e) => setReturnForm({ ...returnForm, assetId: e.target.value })}
            >
              <option value="">-- Choose Equipment to Unassign --</option>
              {assignedAssets.map(a => (
                <option key={a.assetId} value={a.assetId}>
                  {a.assetId} - {a.assetName} (Held by: {a.currentEmployeeName || 'Staff'})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Condition on Return to Store</label>
            <select
              className="form-select"
              value={returnForm.conditionAtReturn}
              onChange={(e) => setReturnForm({ ...returnForm, conditionAtReturn: e.target.value })}
            >
              <option value="EXCELLENT">EXCELLENT</option>
              <option value="GOOD">GOOD</option>
              <option value="FAIR">FAIR</option>
              <option value="POOR">POOR (Requires maintenance)</option>
              <option value="UNUSABLE">UNUSABLE (Damaged)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Return Reason *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Project Completion, Employee Resignation, System Upgrade"
              value={returnForm.returnReason}
              onChange={(e) => setReturnForm({ ...returnForm, returnReason: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Storage Remarks (Optional)</label>
            <textarea
              className="form-control"
              style={{ height: 'auto', padding: '8px 12px' }}
              rows={2}
              placeholder="Location shelf, rack number, accessory completeness..."
              value={returnForm.remarks}
              onChange={(e) => setReturnForm({ ...returnForm, remarks: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* ================= DRAWER: CUSTODY TIMELINE ================= */}
      {isTimelineOpen && (
        <div className="drawer-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setIsTimelineOpen(false); }}>
          <div className="drawer-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--color-bg-subtle)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-brand-600)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Asset Custody History
                </div>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '1.2rem', color: 'var(--color-brand-900)' }}>
                  {timelineAsset?.assetId}
                </h3>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  {timelineAsset?.assetName}
                </span>
              </div>
              <button
                onClick={() => setIsTimelineOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--color-text-muted)' }}>
                  <div className="pulse-dot" style={{ margin: '0 auto var(--space-3)' }} />
                  Loading custody timeline...
                </div>
              ) : assetHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--color-text-muted)' }}>
                  No custody transfer history recorded for this asset yet.
                </div>
              ) : (
                <div className="custody-timeline-container">
                  {assetHistory.map((entry, idx) => (
                    <div key={entry.assignmentId || idx} className="custody-timeline-item">
                      {/* Timeline Node Dot */}
                      <div
                        className="custody-timeline-dot"
                        style={{
                          background: entry.status === 'ACTIVE' ? '#10B981' : entry.status === 'TRANSFERRED' ? '#3B82F6' : '#6B7280'
                        }}
                      />

                      {/* Timeline Content Card */}
                      <div className="custody-timeline-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', fontFamily: 'monospace' }}>
                            {entry.assignmentId}
                          </span>
                          <span className={`badge ${
                            entry.status === 'ACTIVE' ? 'badge-available' : entry.status === 'TRANSFERRED' ? 'badge-assigned' : 'badge-neutral'
                          }`}>
                            {entry.status}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <User size={16} color="var(--color-brand-600)" />
                          <strong style={{ fontSize: '0.9375rem' }}>{entry.employeeName}</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>({entry.employeeId})</span>
                        </div>

                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                          {entry.designation ? `${entry.designation} • ` : ''}{entry.department} ({entry.floor})
                        </div>

                        <div className="custody-timeline-meta-box">
                          <div>
                            <span style={{ color: 'var(--color-text-muted)' }}>Assigned: </span>
                            <strong>{new Date(entry.assignedDate).toLocaleDateString()}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--color-text-muted)' }}>Returned: </span>
                            <strong>{entry.returnedDate ? new Date(entry.returnedDate).toLocaleDateString() : 'Active'}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--color-text-muted)' }}>Condition: </span>
                            <strong>{entry.conditionAtAssignment}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--color-text-muted)' }}>Admin: </span>
                            <strong>{entry.assignedBy}</strong>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.8125rem' }}>
                          <strong>Reason:</strong> {entry.transferReason}
                        </div>

                        {entry.remarks && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                            "{entry.remarks}"
                          </div>
                        )}

                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ marginTop: '10px', width: '100%' }}
                          onClick={() => handleDownloadSlip(entry.assignmentId)}
                        >
                          <FileText size={14} />
                          <span>Download Official Handover Slip (PDF)</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transfer Record Detail Modal */}
      {isDetailModalOpen && selectedRecord && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => { setIsDetailModalOpen(false); setSelectedRecord(null); }}
          title="Custody Assignment & Transfer Details"
          subtitle={`Record ID: ${selectedRecord.assignmentId}`}
          size="md"
          id="transfer-detail-modal"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleOpenTimeline(selectedRecord.assetId, selectedRecord.assetName)}
              >
                <History size={14} />
                <span>Timeline</span>
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleDownloadSlip(selectedRecord.assignmentId)}
              >
                <FileText size={14} />
                <span>Download Slip</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => { setIsDetailModalOpen(false); setSelectedRecord(null); }}
              >
                Close
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="spec-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <div className="spec-grid-item">
                <span className="spec-grid-label">Assignment ID</span>
                <span className="spec-grid-value" style={{ fontFamily: 'monospace' }}>{selectedRecord.assignmentId}</span>
              </div>
              <div className="spec-grid-item">
                <span className="spec-grid-label">Status</span>
                <div>
                  <span className={`badge ${
                    selectedRecord.status === 'ACTIVE'
                      ? 'badge-available'
                      : selectedRecord.status === 'TRANSFERRED'
                      ? 'badge-assigned'
                      : 'badge-neutral'
                  }`}>
                    {selectedRecord.status}
                  </span>
                </div>
              </div>
              <div className="spec-grid-item">
                <span className="spec-grid-label">Asset Identifier</span>
                <span className="spec-grid-value" style={{ color: 'var(--color-brand-600)' }}>{selectedRecord.assetId}</span>
                <span className="spec-grid-sub">{selectedRecord.assetName || 'AAI Equipment'}</span>
              </div>
              <div className="spec-grid-item">
                <span className="spec-grid-label">Custodian Staff</span>
                <span className="spec-grid-value">{selectedRecord.employeeName}</span>
                <span className="spec-grid-sub">{selectedRecord.employeeId} {selectedRecord.designation ? `• ${selectedRecord.designation}` : ''}</span>
              </div>
              <div className="spec-grid-item">
                <span className="spec-grid-label">Department & Location</span>
                <span className="spec-grid-value">{selectedRecord.department}</span>
                <span className="spec-grid-sub">{selectedRecord.floor}</span>
              </div>
              <div className="spec-grid-item">
                <span className="spec-grid-label">Condition</span>
                <span className="spec-grid-value">{selectedRecord.conditionAtAssignment || 'GOOD'}</span>
              </div>
              <div className="spec-grid-item">
                <span className="spec-grid-label">Assigned Date</span>
                <span className="spec-grid-value">{new Date(selectedRecord.assignedDate).toLocaleDateString()}</span>
              </div>
              <div className="spec-grid-item">
                <span className="spec-grid-label">Return Date</span>
                <span className="spec-grid-value">{selectedRecord.returnedDate ? new Date(selectedRecord.returnedDate).toLocaleDateString() : 'Active In Custody'}</span>
              </div>
            </div>

            <div style={{
              padding: '12px',
              background: 'var(--color-bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)'
            }}>
              <span className="spec-grid-label" style={{ display: 'block', marginBottom: '4px' }}>Transfer Reason</span>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-main)', lineHeight: 1.5 }}>
                {selectedRecord.transferReason || 'Standard allocation.'}
              </p>
            </div>

            {selectedRecord.remarks && (
              <div style={{
                padding: '12px',
                background: 'var(--color-bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)'
              }}>
                <span className="spec-grid-label" style={{ display: 'block', marginBottom: '4px' }}>Administrative Remarks</span>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-main)', lineHeight: 1.5 }}>
                  {selectedRecord.remarks}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
