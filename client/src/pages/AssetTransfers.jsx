import React, { useState, useEffect, useId, useCallback } from 'react';
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
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import { SearchInput, SelectInput, ClearFilterButton } from '../components/ui/FormControls';
import { DataTable } from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import SearchableSelect from '../components/ui/SearchableSelect';
import { 
  api, 
  assignmentApi, 
  employeeApi, 
  assetApi, 
  downloadAuthenticatedPdf 
} from '../services/api';

const SORTABLE_COLUMNS = [
  { key: 'assignmentId', label: 'Assignment ID', backendField: 'createdAt' },
  { key: 'assetId', label: 'Asset', backendField: 'assetId' },
  { key: 'employeeId', label: 'Custodian', backendField: 'employeeId' },
  { key: 'department', label: 'Department / Floor', backendField: 'department' },
  { key: 'assignedDate', label: 'Assigned / Returned', backendField: 'assignedDate' },
  { key: 'status', label: 'Status', backendField: 'status' }
];

export default function AssetTransfers() {
  const { user } = useAuth();
  const searchInputId = useId();

  // Core Data States (Server-driven dataset; zero client accumulator)
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Authoritative Database Statistics (Loaded via assignmentApi.getStats())
  const [stats, setStats] = useState({ total: 0, active: 0, transferred: 0, returned: 0 });

  // Server-Side Pagination States
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  // Server-Side Search, Filters & Sorting
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [sortBy, setSortBy] = useState('assignedDate');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals & Drawers Management
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Active Asset Custody Timeline Drawer
  const [timelineAsset, setTimelineAsset] = useState(null);
  const [assetHistory, setAssetHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Component Cascade & Attached Peripherals State
  const [attachedComponents, setAttachedComponents] = useState([]);
  const [_componentsLoading, setComponentsLoading] = useState(false);
  const [currentCustodian, setCurrentCustodian] = useState(null);
  const [returnAssetCustodian, setReturnAssetCustodian] = useState(null);

  // Form State: Assign Asset
  const [assignForm, setAssignForm] = useState({
    assetId: '',
    selectedAsset: null,
    employeeId: '',
    selectedEmployee: null,
    condition: 'GOOD',
    transferReason: 'Initial Staff Assignment',
    remarks: '',
    cascadeComponents: true
  });

  // Form State: Transfer Asset
  const [transferForm, setTransferForm] = useState({
    assetId: '',
    selectedAsset: null,
    toEmployeeId: '',
    selectedTargetEmployee: null,
    conditionAtReturn: 'GOOD',
    conditionAtNewAssignment: 'GOOD',
    transferReason: '',
    remarks: '',
    cascadeComponents: true
  });

  // Form State: Return Asset to IT Pool
  const [returnForm, setReturnForm] = useState({
    assetId: '',
    selectedAsset: null,
    conditionAtReturn: 'GOOD',
    returnReason: 'Return to IT Reserve Store',
    remarks: '',
    cascadeComponents: true
  });

  // =========================================================================
  // 1. Authoritative Stats & Server-Side Pagination Loaders
  // =========================================================================

  const fetchStats = useCallback(async () => {
    try {
      const res = await assignmentApi.getStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('[AssetTransfers] Failed to fetch stats:', err);
    }
  }, []);

  const fetchAssignments = useCallback(async (targetPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await assignmentApi.getAll({
        page: targetPage,
        limit: pageSize,
        search: debouncedSearch,
        status: selectedStatus,
        department: selectedDepartment,
        sortBy,
        sortOrder
      });

      if (res.success) {
        const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        // Strictly replace displayed page dataset (NO accumulator)
        setAssignments(items);
        const total = res.pagination?.total ?? res.data?.total ?? items.length;
        setTotalCount(total);
      }
    } catch (err) {
      console.error('[AssetTransfers] Failed to load assignments:', err);
      setError(err.message || 'Failed to load transfer records');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, selectedStatus, selectedDepartment, sortBy, sortOrder]);

  // Debounce search input (~300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch ledger when pagination, filter, or sort criteria change
  useEffect(() => {
    fetchAssignments(page);
  }, [fetchAssignments, page]);

  // Initial stats fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // =========================================================================
  // 2. Sorting & Filtering Handlers
  // =========================================================================

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSelectedStatus('');
    setSelectedDepartment('');
    setSortBy('assignedDate');
    setSortOrder('desc');
    setPage(1);
  };

  // =========================================================================
  // 3. Bounded Searchable Pickers for Modals (limit=10)
  // =========================================================================

  const loadAvailableAssets = useCallback(async (term) => {
    try {
      const res = await assetApi.getAll({
        search: term,
        status: 'AVAILABLE',
        limit: 10
      });
      return res.data?.items || res.data || [];
    } catch (err) {
      console.error('[AssetTransfers] Failed to search available assets:', err);
      return [];
    }
  }, []);

  const loadAssignedAssets = useCallback(async (term) => {
    try {
      const res = await assetApi.getAll({
        search: term,
        status: 'ASSIGNED',
        limit: 10
      });
      return res.data?.items || res.data || [];
    } catch (err) {
      console.error('[AssetTransfers] Failed to search assigned assets:', err);
      return [];
    }
  }, []);

  const loadEmployees = useCallback(async (term) => {
    try {
      const res = await employeeApi.getAll({
        search: term,
        limit: 10
      });
      return res.data?.items || res.data || [];
    } catch (err) {
      console.error('[AssetTransfers] Failed to search employees:', err);
      return [];
    }
  }, []);

  // Fetch attached components/peripherals for cascade UI
  const fetchAssetComponents = useCallback(async (assetId) => {
    if (!assetId) {
      setAttachedComponents([]);
      return;
    }
    setComponentsLoading(true);
    try {
      const res = await api.get(`/relationships/components/${assetId}`);
      if (res.success && Array.isArray(res.data)) {
        setAttachedComponents(res.data);
      } else {
        setAttachedComponents([]);
      }
    } catch (err) {
      console.error('[AssetTransfers] Failed to fetch attached components:', err);
      setAttachedComponents([]);
    } finally {
      setComponentsLoading(false);
    }
  }, []);

  // Handle transfer asset selection & auto-detect current custodian
  const handleSelectTransferAsset = async (assetOpt) => {
    if (!assetOpt) {
      setTransferForm(prev => ({ ...prev, assetId: '', selectedAsset: null }));
      setCurrentCustodian(null);
      setAttachedComponents([]);
      return;
    }

    const assetId = assetOpt.assetId || assetOpt.value;
    setTransferForm(prev => ({ ...prev, assetId, selectedAsset: assetOpt }));

    if (assetOpt.currentEmployeeId || assetOpt.currentEmployeeName) {
      setCurrentCustodian({
        employeeId: assetOpt.currentEmployeeId,
        name: assetOpt.currentEmployeeName,
        designation: assetOpt.currentDesignation,
        employeeType: assetOpt.currentEmployeeType,
        department: assetOpt.department,
        floor: assetOpt.floor,
        contractorName: assetOpt.currentContractorName
      });
    } else {
      try {
        const histRes = await assignmentApi.getAssetHistory(assetId);
        if (histRes.success && Array.isArray(histRes.data)) {
          const activeEntry = histRes.data.find(h => h.status === 'ACTIVE') || histRes.data[0];
          if (activeEntry) {
            setCurrentCustodian({
              employeeId: activeEntry.employeeId,
              name: activeEntry.employeeName,
              designation: activeEntry.designation,
              employeeType: activeEntry.employeeType,
              department: activeEntry.department,
              floor: activeEntry.floor,
              contractorName: activeEntry.contractorName
            });
          }
        }
      } catch (err) {
        console.error('[AssetTransfers] Failed to resolve custodian info:', err);
      }
    }

    fetchAssetComponents(assetId);
  };

  // Handle return asset selection
  const handleSelectReturnAsset = async (assetOpt) => {
    if (!assetOpt) {
      setReturnForm(prev => ({ ...prev, assetId: '', selectedAsset: null }));
      setReturnAssetCustodian(null);
      setAttachedComponents([]);
      return;
    }

    const assetId = assetOpt.assetId || assetOpt.value;
    setReturnForm(prev => ({ ...prev, assetId, selectedAsset: assetOpt }));

    if (assetOpt.currentEmployeeId || assetOpt.currentEmployeeName) {
      setReturnAssetCustodian({
        employeeId: assetOpt.currentEmployeeId,
        name: assetOpt.currentEmployeeName,
        designation: assetOpt.currentDesignation,
        employeeType: assetOpt.currentEmployeeType,
        department: assetOpt.department,
        floor: assetOpt.floor,
        contractorName: assetOpt.currentContractorName
      });
    }

    fetchAssetComponents(assetId);
  };

  // =========================================================================
  // 4. Modal Submit Handlers (Assign / Transfer / Return with cascadeComponents)
  // =========================================================================

  const handleAssignSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    if (!assignForm.assetId) {
      setError('Please select an available equipment to assign.');
      return;
    }
    if (!assignForm.employeeId) {
      setError('Please select an assignee staff member.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await assignmentApi.assign({
        assetId: assignForm.assetId,
        employeeId: assignForm.employeeId,
        condition: assignForm.condition,
        transferReason: assignForm.transferReason,
        remarks: assignForm.remarks,
        cascadeComponents: Boolean(assignForm.cascadeComponents)
      });

      if (!res.success) {
        throw new Error(res.message || 'Assignment failed');
      }

      setSuccessMessage(`Asset '${assignForm.assetId}' successfully assigned!`);
      setIsAssignModalOpen(false);
      setAssignForm({
        assetId: '',
        selectedAsset: null,
        employeeId: '',
        selectedEmployee: null,
        condition: 'GOOD',
        transferReason: 'Initial Staff Assignment',
        remarks: '',
        cascadeComponents: true
      });
      setAttachedComponents([]);
      fetchAssignments(1);
      fetchStats();
    } catch (err) {
      setError(err.message || 'Assignment operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    if (!transferForm.assetId) {
      setError('Please select an assigned equipment to transfer.');
      return;
    }
    if (!transferForm.toEmployeeId) {
      setError('Please select a target custodian.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await assignmentApi.transfer({
        assetId: transferForm.assetId,
        toEmployeeId: transferForm.toEmployeeId,
        conditionAtReturn: transferForm.conditionAtReturn,
        conditionAtNewAssignment: transferForm.conditionAtNewAssignment,
        transferReason: transferForm.transferReason,
        remarks: transferForm.remarks,
        cascadeComponents: Boolean(transferForm.cascadeComponents)
      });

      if (!res.success) {
        throw new Error(res.message || 'Transfer failed');
      }

      setSuccessMessage(`Asset '${transferForm.assetId}' transferred successfully!`);
      setIsTransferModalOpen(false);
      setTransferForm({
        assetId: '',
        selectedAsset: null,
        toEmployeeId: '',
        selectedTargetEmployee: null,
        conditionAtReturn: 'GOOD',
        conditionAtNewAssignment: 'GOOD',
        transferReason: '',
        remarks: '',
        cascadeComponents: true
      });
      setCurrentCustodian(null);
      setAttachedComponents([]);
      fetchAssignments(1);
      fetchStats();
    } catch (err) {
      setError(err.message || 'Transfer operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    if (!returnForm.assetId) {
      setError('Please select an equipment to return.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await assignmentApi.return({
        assetId: returnForm.assetId,
        conditionAtReturn: returnForm.conditionAtReturn,
        returnReason: returnForm.returnReason,
        remarks: returnForm.remarks,
        cascadeComponents: Boolean(returnForm.cascadeComponents)
      });

      if (!res.success) {
        throw new Error(res.message || 'Return to pool failed');
      }

      setSuccessMessage(`Asset '${returnForm.assetId}' returned to inventory pool.`);
      setIsReturnModalOpen(false);
      setReturnForm({
        assetId: '',
        selectedAsset: null,
        conditionAtReturn: 'GOOD',
        returnReason: 'Return to IT Reserve Store',
        remarks: '',
        cascadeComponents: true
      });
      setReturnAssetCustodian(null);
      setAttachedComponents([]);
      fetchAssignments(1);
      fetchStats();
    } catch (err) {
      setError(err.message || 'Return operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================================
  // 5. Asset Custody Timeline & Documentation Slip Handlers
  // =========================================================================

  const handleOpenTimeline = async (assetId, assetName) => {
    setTimelineAsset({ assetId, assetName });
    setIsTimelineOpen(true);
    setHistoryLoading(true);

    try {
      const res = await assignmentApi.getAssetHistory(assetId);
      if (res.success) {
        setAssetHistory(res.data || []);
      }
    } catch (err) {
      console.error('[AssetTransfers] Failed to load asset custody timeline:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDownloadSlip = async (target) => {
    try {
      const assignmentId = typeof target === 'object' && target !== null ? target.assignmentId : target;
      const status = typeof target === 'object' && target !== null ? target.status : null;
      const prevEmp = typeof target === 'object' && target !== null ? target.previousEmployeeId : null;

      let endpoint = `/api/v1/export/handover/${assignmentId}/pdf`;
      let filename = `AAI_Handover_${assignmentId}.pdf`;

      if (status === 'TRANSFERRED' || prevEmp) {
        endpoint = `/api/v1/export/transfer/${assignmentId}/pdf`;
        filename = `AAI_Transfer_${assignmentId}.pdf`;
      } else if (status === 'RETURNED') {
        endpoint = `/api/v1/export/return/${assignmentId}/pdf`;
        filename = `AAI_Return_${assignmentId}.pdf`;
      } else if (status === 'ACTIVE') {
        endpoint = `/api/v1/export/assignment/${assignmentId}/pdf`;
        filename = `AAI_Assignment_${assignmentId}.pdf`;
      }

      await downloadAuthenticatedPdf(endpoint, filename);
      setSuccessMessage(`Document for assignment ${assignmentId} downloaded successfully.`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to download official custody slip. Please try again.');
      setTimeout(() => setError(null), 6000);
    }
  };

  const isAdmin = user?.role === 'ADMIN';
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

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
          onClick={() => {
            setAttachedComponents([]);
            setReturnAssetCustodian(null);
            setIsReturnModalOpen(true);
          }}
          disabled={!isAdmin}
          id="btn-return-pool"
          title={!isAdmin ? 'Admin permission required' : 'Return equipment to pool'}
        >
          <RotateCcw size={14} />
          <span>Return to Pool</span>
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => {
            setAttachedComponents([]);
            setCurrentCustodian(null);
            setIsTransferModalOpen(true);
          }}
          disabled={!isAdmin}
          id="btn-transfer-asset"
          title={!isAdmin ? 'Admin permission required' : 'Transfer equipment custody'}
        >
          <ArrowRightLeft size={14} />
          <span>Transfer</span>
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            setAttachedComponents([]);
            setIsAssignModalOpen(true);
          }}
          disabled={!isAdmin}
          id="btn-assign-asset"
          title={!isAdmin ? 'Admin permission required' : 'Assign equipment to staff'}
        >
          <Plus size={14} />
          <span>Assign Equipment</span>
        </button>
      </PageHeader>

      {/* Success Notification Banner */}
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
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
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
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Authoritative Metric Summary Cards (from assignmentApi.getStats) */}
      <div className="stats-grid cols-4">
        <StatCard
          label="Total Ledger Records"
          value={stats.total ?? 0}
          subtext="Authoritative database total"
          icon={History}
          variant="indigo"
        />

        <StatCard
          label="Active Custody"
          value={stats.active ?? 0}
          subtext="Currently deployed to staff"
          icon={CheckCircle2}
          variant="emerald"
        />

        <StatCard
          label="Transferred Log"
          value={stats.transferred ?? 0}
          subtext="Inter-department handovers"
          icon={ArrowRightLeft}
          variant="indigo"
        />

        <StatCard
          label="Returned to Store"
          value={stats.returned ?? 0}
          subtext="Restored to IT warehouse stock"
          icon={RotateCcw}
          variant="neutral"
        />
      </div>

      {/* Standardized Filter and Server Search Bar */}
      <div className="filter-bar">
        <div style={{
          display: 'grid',
          gridTemplateColumns: search || selectedStatus || selectedDepartment ? '1fr 180px 180px auto' : '1fr 180px 180px',
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
            id="filter-status-select"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            placeholder="All Statuses"
            options={[
              { value: 'ACTIVE', label: 'ACTIVE (In Use)' },
              { value: 'TRANSFERRED', label: 'TRANSFERRED' },
              { value: 'RETURNED', label: 'RETURNED' }
            ]}
          />

          <SelectInput
            id="filter-department-select"
            value={selectedDepartment}
            onChange={(e) => {
              setSelectedDepartment(e.target.value);
              setPage(1);
            }}
            placeholder="All Departments"
            options={[
              { value: 'CNS', label: 'CNS' },
              { value: 'ATM', label: 'ATM' },
              { value: 'IT', label: 'IT' },
              { value: 'ELECTRONICS', label: 'ELECTRONICS' },
              { value: 'ELECTRICAL', label: 'ELECTRICAL' },
              { value: 'OPERATIONS', label: 'OPERATIONS' },
              { value: 'SECURITY', label: 'SECURITY' },
              { value: 'FINANCE', label: 'FINANCE' },
              { value: 'HR', label: 'HR' },
              { value: 'COMMUNICATION', label: 'COMMUNICATION' },
              { value: 'TERMINAL', label: 'TERMINAL' },
              { value: 'ENGINEERING', label: 'ENGINEERING' }
            ]}
          />

          {(search || selectedStatus || selectedDepartment || sortBy !== 'assignedDate' || sortOrder !== 'desc') && (
            <ClearFilterButton onClick={handleClearFilters} />
          )}
        </div>
      </div>

      {/* Custody Ledger Table with Server-Driven Sorting */}
      <DataTable id="transfers-data-table">
        <thead>
          <tr>
            {SORTABLE_COLUMNS.map(col => {
              const isSorted = sortBy === col.backendField;
              return (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.backendField)}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  title={`Click to sort by ${col.label}`}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>{col.label}</span>
                    {isSorted ? (
                      sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    ) : (
                      <ArrowUpDown size={12} style={{ opacity: 0.35 }} />
                    )}
                  </div>
                </th>
              );
            })}
            <th>Condition</th>
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
          ) : assignments.length === 0 ? (
            <EmptyState
              icon={ArrowRightLeft}
              title="No custody records match current criteria"
              description="Try modifying your search query or reset filter options."
              colSpan={8}
              action={
                (search || selectedStatus || selectedDepartment) ? (
                  <button onClick={handleClearFilters} className="btn btn-secondary btn-sm">
                    Reset Filter
                  </button>
                ) : null
              }
            />
          ) : (
            assignments.map((item) => (
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600 }}>{item.employeeName}</span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      backgroundColor: (item.employeeType || 'AAI') === 'Contract' ? '#EDE9FE' : '#DBEAFE',
                      color: (item.employeeType || 'AAI') === 'Contract' ? '#6D28D9' : '#1D4ED8'
                    }}>
                      {item.employeeType || 'AAI'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    <code>{item.employeeId}</code> {item.designation ? `• ${item.designation}` : ''}
                    {item.contractorName ? ` • Agency: ${item.contractorName}` : ''}
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

                <td>
                  <span className="badge badge-neutral">{item.conditionAtAssignment || 'GOOD'}</span>
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
                      onClick={() => handleDownloadSlip(item)}
                      title={`Download Official ${item.status === 'TRANSFERRED' ? 'Transfer Slip' : item.status === 'RETURNED' ? 'Return Receipt' : 'Assignment Slip'} (PDF)`}
                    >
                      <FileText size={14} />
                      <span>{item.status === 'TRANSFERRED' ? 'Transfer Slip' : item.status === 'RETURNED' ? 'Return Receipt' : 'Slip'}</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>

      {/* Server-Side Pagination Footer */}
      <div className="table-pagination" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--color-bg-card)',
        borderRadius: '0 0 var(--radius-md) var(--radius-md)',
        fontSize: '0.8125rem',
        color: 'var(--color-text-secondary)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Record count summary */}
        <div>
          {totalCount > 0 ? (
            <span>
              Showing <strong style={{ color: 'var(--color-text-main)' }}>{(page - 1) * pageSize + 1}</strong> to{' '}
              <strong style={{ color: 'var(--color-text-main)' }}>{Math.min(page * pageSize, totalCount)}</strong> of{' '}
              <strong style={{ color: 'var(--color-text-main)' }}>{totalCount}</strong> records
            </span>
          ) : (
            <span>No records to display</span>
          )}
        </div>

        {/* Controls: Page size selector and page navigation buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Rows per page:</span>
            <select
              id="select-transfers-page-size"
              value={pageSize}
              onChange={(e) => {
                const newSize = parseInt(e.target.value, 10);
                setPageSize(newSize);
                setPage(1);
              }}
              className="form-select"
              style={{ width: '70px', height: '30px', padding: '0 6px', fontSize: '0.8125rem' }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              id="btn-prev-transfers-page"
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', height: '30px', padding: '0 8px' }}
            >
              <ChevronLeft size={15} />
              <span>Prev</span>
            </button>

            <span style={{ padding: '0 4px', fontWeight: 500 }}>
              Page {page} of {totalPages}
            </span>

            <button
              id="btn-next-transfers-page"
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', height: '30px', padding: '0 8px' }}
            >
              <span>Next</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

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
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              id="btn-submit-assign"
              onClick={handleAssignSubmit}
              disabled={submitting || !assignForm.assetId || !assignForm.employeeId}
            >
              {submitting ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </>
        }
      >
        <form onSubmit={handleAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {/* Server-driven Bounded Searchable Asset Picker */}
          <div className="form-group">
            <label className="form-label">Select Available Asset *</label>
            <SearchableSelect
              id="assign-asset-select"
              placeholder="Search available equipment by ID, make, model..."
              value={assignForm.assetId}
              selectedOption={assignForm.selectedAsset}
              loadOptions={loadAvailableAssets}
              onChange={(opt, val) => {
                setAssignForm(prev => ({ ...prev, assetId: val || '', selectedAsset: opt }));
                fetchAssetComponents(val);
              }}
            />
          </div>

          {/* Component Cascade Panel */}
          {attachedComponents.length > 0 && (
            <ComponentCascadeDisclosure
              components={attachedComponents}
              cascade={assignForm.cascadeComponents}
              onToggle={(checked) => setAssignForm(prev => ({ ...prev, cascadeComponents: checked }))}
            />
          )}

          {/* Server-driven Bounded Searchable Employee Picker */}
          <div className="form-group">
            <label className="form-label">Assignee Staff Member *</label>
            <SearchableSelect
              id="assign-employee-select"
              placeholder="Search employee by ID or name..."
              value={assignForm.employeeId}
              selectedOption={assignForm.selectedEmployee}
              loadOptions={loadEmployees}
              onChange={(opt, val) => setAssignForm(prev => ({ ...prev, employeeId: val || '', selectedEmployee: opt }))}
            />
          </div>

          {assignForm.selectedEmployee && (
            <div style={{
              background: 'var(--color-bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              fontSize: '0.8125rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Selected Custodian:</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: (assignForm.selectedEmployee.employeeType || 'AAI') === 'Contract' ? '#EDE9FE' : '#DBEAFE',
                  color: (assignForm.selectedEmployee.employeeType || 'AAI') === 'Contract' ? '#6D28D9' : '#1D4ED8'
                }}>
                  {assignForm.selectedEmployee.employeeType === 'Contract' ? 'Contract / Outsourced' : 'AAI Staff'}
                </span>
              </div>
              <div><strong>{assignForm.selectedEmployee.name || assignForm.selectedEmployee.fullName}</strong> ({assignForm.selectedEmployee.employeeId}) • {assignForm.selectedEmployee.designation || 'Staff'}</div>
              <div><strong>Department:</strong> {assignForm.selectedEmployee.department} • <strong>Location:</strong> {assignForm.selectedEmployee.floor || 'N/A'}</div>
              {assignForm.selectedEmployee.contractorName && (
                <div style={{ color: '#6D28D9', marginTop: '2px' }}>
                  <strong>Contractor / Vendor:</strong> {assignForm.selectedEmployee.contractorName}
                </div>
              )}
            </div>
          )}

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
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              id="btn-submit-transfer"
              onClick={handleTransferSubmit}
              disabled={submitting || !transferForm.assetId || !transferForm.toEmployeeId}
            >
              {submitting ? 'Executing Transfer...' : 'Execute Transfer'}
            </button>
          </>
        }
      >
        <form onSubmit={handleTransferSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {/* Custody Guarantee Banner */}
          <div style={{
            background: '#F0FDF4',
            border: '1px solid #86EFAC',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            fontSize: '0.8125rem',
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} color="#16A34A" style={{ flexShrink: 0 }} />
            <div>
              <strong>Custody-Only Transfer Guarantee:</strong> Handover updates only the asset's custody ledger. Employee Master records remain unaltered.
            </div>
          </div>

          {/* Searchable Currently Assigned Asset */}
          <div className="form-group">
            <label className="form-label">Select Currently Assigned Asset *</label>
            <SearchableSelect
              id="transfer-asset-select"
              placeholder="Search currently assigned equipment by ID, make, model..."
              value={transferForm.assetId}
              selectedOption={transferForm.selectedAsset}
              loadOptions={loadAssignedAssets}
              onChange={handleSelectTransferAsset}
            />
          </div>

          {/* Component Cascade Panel */}
          {attachedComponents.length > 0 && (
            <ComponentCascadeDisclosure
              components={attachedComponents}
              cascade={transferForm.cascadeComponents}
              onToggle={(checked) => setTransferForm(prev => ({ ...prev, cascadeComponents: checked }))}
            />
          )}

          {/* Current Custodian Display */}
          {currentCustodian && (
            <div style={{
              background: 'var(--color-bg-subtle)',
              border: '1px dashed var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              fontSize: '0.8125rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Current Custodian Information:</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: (currentCustodian.employeeType || 'AAI') === 'Contract' ? '#EDE9FE' : '#DBEAFE',
                  color: (currentCustodian.employeeType || 'AAI') === 'Contract' ? '#6D28D9' : '#1D4ED8'
                }}>
                  {currentCustodian.employeeType || 'AAI Staff'}
                </span>
              </div>
              <div><strong>Name:</strong> {currentCustodian.name} ({currentCustodian.employeeId})</div>
              <div><strong>Designation:</strong> {currentCustodian.designation || 'N/A'}</div>
              <div><strong>Department:</strong> {currentCustodian.department} • <strong>Floor:</strong> {currentCustodian.floor || 'N/A'}</div>
              {currentCustodian.contractorName && (
                <div style={{ color: '#6D28D9', marginTop: '2px' }}>
                  <strong>Contractor / Agency:</strong> {currentCustodian.contractorName}
                </div>
              )}
            </div>
          )}

          {/* Searchable Target Employee */}
          <div className="form-group">
            <label className="form-label">Transfer To New Custodian (Target Staff) *</label>
            <SearchableSelect
              id="transfer-target-employee-select"
              placeholder="Search target employee by ID or name..."
              value={transferForm.toEmployeeId}
              selectedOption={transferForm.selectedTargetEmployee}
              loadOptions={loadEmployees}
              onChange={(opt, val) => setTransferForm(prev => ({ ...prev, toEmployeeId: val || '', selectedTargetEmployee: opt }))}
            />
          </div>

          {transferForm.selectedTargetEmployee && (
            <div style={{
              background: 'var(--color-bg-subtle)',
              border: '1px solid #93C5FD',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              fontSize: '0.8125rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: '#1E40AF' }}>Target Custodian (New):</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: (transferForm.selectedTargetEmployee.employeeType || 'AAI') === 'Contract' ? '#EDE9FE' : '#DBEAFE',
                  color: (transferForm.selectedTargetEmployee.employeeType || 'AAI') === 'Contract' ? '#6D28D9' : '#1D4ED8'
                }}>
                  {transferForm.selectedTargetEmployee.employeeType === 'Contract' ? 'Contract / Outsourced' : 'AAI Staff'}
                </span>
              </div>
              <div><strong>Name:</strong> {transferForm.selectedTargetEmployee.name || transferForm.selectedTargetEmployee.fullName} ({transferForm.selectedTargetEmployee.employeeId}) • {transferForm.selectedTargetEmployee.designation || 'Staff'}</div>
              <div><strong>Department:</strong> {transferForm.selectedTargetEmployee.department} • <strong>Location:</strong> {transferForm.selectedTargetEmployee.floor || 'N/A'}</div>
              {transferForm.selectedTargetEmployee.contractorName && (
                <div style={{ color: '#6D28D9', marginTop: '2px' }}>
                  <strong>Contractor / Agency:</strong> {transferForm.selectedTargetEmployee.contractorName}
                </div>
              )}
            </div>
          )}

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
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              id="btn-submit-return"
              onClick={handleReturnSubmit}
              disabled={submitting || !returnForm.assetId}
            >
              {submitting ? 'Returning...' : 'Unassign & Return'}
            </button>
          </>
        }
      >
        <form onSubmit={handleReturnSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {/* Searchable Assigned Asset to Return */}
          <div className="form-group">
            <label className="form-label">Select Equipment to Return *</label>
            <SearchableSelect
              id="return-asset-select"
              placeholder="Search currently assigned equipment by ID, make, model..."
              value={returnForm.assetId}
              selectedOption={returnForm.selectedAsset}
              loadOptions={loadAssignedAssets}
              onChange={handleSelectReturnAsset}
            />
          </div>

          {/* Component Cascade Panel */}
          {attachedComponents.length > 0 && (
            <ComponentCascadeDisclosure
              components={attachedComponents}
              cascade={returnForm.cascadeComponents}
              onToggle={(checked) => setReturnForm(prev => ({ ...prev, cascadeComponents: checked }))}
            />
          )}

          {returnAssetCustodian && (
            <div style={{
              background: 'var(--color-bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              fontSize: '0.8125rem'
            }}>
              <div style={{ fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                Current Custodian Releasing Asset:
              </div>
              <div><strong>{returnAssetCustodian.name}</strong> ({returnAssetCustodian.employeeId})</div>
              <div><strong>Department:</strong> {returnAssetCustodian.department} • <strong>Location:</strong> {returnAssetCustodian.floor || 'N/A'}</div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Condition on Return to Store *</label>
            <select
              className="form-select"
              value={returnForm.conditionAtReturn}
              onChange={(e) => setReturnForm({ ...returnForm, conditionAtReturn: e.target.value })}
            >
              <option value="EXCELLENT">EXCELLENT</option>
              <option value="GOOD">GOOD</option>
              <option value="FAIR">FAIR</option>
              <option value="DEFECTIVE">DEFECTIVE (Faulty)</option>
              <option value="NEEDS_REPAIR">NEEDS_REPAIR (Requires Maintenance)</option>
              <option value="POOR">POOR</option>
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
            <div className="drawer-header">
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-brand-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Asset Custody History
                </div>
                <h3 className="drawer-title" style={{ margin: '2px 0 0 0' }}>
                  {timelineAsset?.assetId}
                </h3>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-drawer-header-text)', opacity: 0.85 }}>
                  {timelineAsset?.assetName}
                </span>
              </div>
              <button
                onClick={() => setIsTimelineOpen(false)}
                style={{ background: 'none', color: 'inherit', border: 'none', cursor: 'pointer', padding: '4px' }}
                title="Close Drawer"
                aria-label="Close Drawer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="drawer-body">
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
                      <div
                        className="custody-timeline-dot"
                        style={{
                          background: entry.status === 'ACTIVE' ? '#10B981' : entry.status === 'TRANSFERRED' ? '#3B82F6' : '#6B7280'
                        }}
                      />

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
                            <strong>{entry.conditionAtAssignment || 'GOOD'}</strong>
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
                onClick={() => handleDownloadSlip(selectedRecord)}
              >
                <FileText size={14} />
                <span>Download {selectedRecord.status === 'TRANSFERRED' ? 'Transfer Slip' : selectedRecord.status === 'RETURNED' ? 'Return Receipt' : 'Custody Slip'}</span>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="spec-grid-value">{selectedRecord.employeeName}</span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    backgroundColor: (selectedRecord.employeeType || 'AAI') === 'Contract' ? '#EDE9FE' : '#DBEAFE',
                    color: (selectedRecord.employeeType || 'AAI') === 'Contract' ? '#6D28D9' : '#1D4ED8'
                  }}>
                    {selectedRecord.employeeType || 'AAI'}
                  </span>
                </div>
                <span className="spec-grid-sub">
                  {selectedRecord.employeeId} {selectedRecord.designation ? `• ${selectedRecord.designation}` : ''}
                  {selectedRecord.contractorName ? ` • Agency: ${selectedRecord.contractorName}` : ''}
                </span>
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

/**
 * Reusable Component Cascade Disclosure panel for attached peripheral items
 */
function ComponentCascadeDisclosure({ components, cascade, onToggle }) {
  return (
    <div style={{
      background: 'var(--color-bg-subtle)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.8125rem' }}>
          <Layers size={15} color="var(--color-brand-600)" />
          <span>Attached Components & Peripherals ({components.length})</span>
        </div>
        <span className="badge badge-neutral" style={{ fontSize: '11px' }}>Relationship Link</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
        {components.map((comp, idx) => (
          <div key={comp.childAssetId || comp._id || idx} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 8px',
            background: 'var(--color-bg-card)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem'
          }}>
            <div>
              <strong style={{ fontFamily: 'var(--font-mono, monospace)' }}>{comp.childAssetId}</strong>
              {comp.componentRole && <span style={{ color: 'var(--color-text-muted)', marginLeft: '6px' }}>({comp.componentRole})</span>}
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
              {comp.relationshipType || 'ATTACHED_COMPONENT'}
            </span>
          </div>
        ))}
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '4px', fontSize: '0.8125rem', fontWeight: 500 }}>
        <input
          type="checkbox"
          checked={cascade}
          onChange={(e) => onToggle(e.target.checked)}
          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
        />
        <span>Cascade custody change to all attached components ({components.length})</span>
      </label>
      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginLeft: '24px' }}>
        When checked, child components will transition alongside this parent asset automatically.
      </div>
    </div>
  );
}
