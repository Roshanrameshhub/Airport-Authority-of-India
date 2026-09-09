import React, { useState, useEffect, useId } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  RefreshCw,
  Download,
  Eye,
  Clock,
  User,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Activity
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { SearchInput, SelectInput, ClearFilterButton } from '../components/ui/FormControls';
import StatCard from '../components/ui/StatCard';
import DataTable, { TableActionBtn } from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import LoadMoreButton from '../components/ui/LoadMoreButton';

export default function AuditLogs() {
  const { token } = useAuth();
  const searchInputId = useId();

  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedEntityType, setSelectedEntityType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(null);

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchAuditData = async (pageNum = 1, isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
        setLoadMoreError(null);
      } else {
        setLoading(true);
        setLoadMoreError(null);
      }
      setError(null);

      const queryParams = new URLSearchParams({
        page: String(pageNum),
        limit: '20'
      });
      if (search) queryParams.set('search', search);
      if (selectedAction) queryParams.set('action', selectedAction);
      if (selectedEntityType) queryParams.set('entityType', selectedEntityType);
      if (selectedStatus) queryParams.set('status', selectedStatus);

      const [logsRes, summaryRes] = await Promise.all([
        fetch(`/api/v1/audit-logs?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        pageNum === 1 ? fetch('/api/v1/audit-logs/summary', {
          headers: { Authorization: `Bearer ${token}` }
        }) : Promise.resolve(null)
      ]);

      if (!logsRes.ok) {
        throw new Error('Failed to retrieve audit log records');
      }

      const logsData = await logsRes.json();
      if (logsData.success) {
        const items = Array.isArray(logsData.data) ? logsData.data : (logsData.data?.items || []);
        if (isLoadMore) {
          setLogs(prev => [...prev, ...items]);
        } else {
          setLogs(items);
        }
        if (logsData.pagination) {
          setTotalPages(logsData.pagination.pages || 1);
          setTotalCount(logsData.pagination.total || 0);
        }
        setPage(pageNum);
      }

      if (summaryRes && summaryRes.ok) {
        const sumData = await summaryRes.json();
        if (sumData.success) {
          setSummary(sumData.data);
        }
      }
    } catch (err) {
      if (isLoadMore) {
        setLoadMoreError(err.message || 'Failed to load more audit records');
      } else {
        setError(err.message || 'An unexpected error occurred while fetching audit trail');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (loadingMore || loading) return;
    fetchAuditData(page + 1, true);
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPage(1);
      fetchAuditData(1, false);
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search, selectedAction, selectedEntityType, selectedStatus, token]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchAuditData(1, false);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedAction('');
    setSelectedEntityType('');
    setSelectedStatus('');
    setPage(1);
  };

  const exportCsv = () => {
    if (!logs.length) return;

    const headers = ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'Actor Username', 'Actor Name', 'Actor Role', 'IP Address', 'Status', 'Details'];
    const rows = logs.map(l => [
      new Date(l.timestamp).toLocaleString('en-IN'),
      l.action,
      l.entityType,
      l.entityId || 'N/A',
      l.actor?.username || 'SYSTEM',
      l.actor?.name || 'System Process',
      l.actor?.role || 'SYSTEM',
      l.actor?.ipAddress || '127.0.0.1',
      l.status,
      JSON.stringify(l.details || {})
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `AAI_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadgeStyle = (action) => {
    switch (action) {
      case 'USER_LOGIN':
        return { background: 'var(--color-brand-100)', color: 'var(--color-brand-600)', border: '1px solid var(--border-strong)' };
      case 'ASSET_CREATED':
      case 'COMPLAINT_STATUS_UPDATED':
        return { background: 'var(--status-available-bg)', color: 'var(--status-available-text)', border: '1px solid var(--status-available-border)' };
      case 'ASSET_UPDATED':
      case 'CUSTODY_ASSIGNED':
      case 'CUSTODY_TRANSFERRED':
      case 'EXCEL_IMPORTED':
        return { background: 'var(--status-assigned-bg)', color: 'var(--status-assigned-text)', border: '1px solid var(--status-assigned-border)' };
      case 'CUSTODY_RETURNED':
      case 'COMPLAINT_CREATED':
        return { background: 'var(--status-maintenance-bg)', color: 'var(--status-maintenance-text)', border: '1px solid var(--status-maintenance-border)' };
      case 'ASSET_DELETED':
        return { background: 'var(--status-danger-bg)', color: 'var(--status-danger-text)', border: '1px solid var(--status-danger-border)' };
      case 'ASSET_RETIRED':
      default:
        return { background: 'var(--status-neutral-bg)', color: 'var(--status-neutral-text)', border: '1px solid var(--status-neutral-border)' };
    }
  };

  const totalCustodyEvents = (summary?.byAction?.['CUSTODY_ASSIGNED'] || 0) +
    (summary?.byAction?.['CUSTODY_TRANSFERRED'] || 0) +
    (summary?.byAction?.['CUSTODY_RETURNED'] || 0);

  const totalAssetOps = (summary?.byAction?.['ASSET_CREATED'] || 0) +
    (summary?.byAction?.['ASSET_UPDATED'] || 0) +
    (summary?.byAction?.['ASSET_RETIRED'] || 0);

  const totalServiceActions = (summary?.byAction?.['COMPLAINT_CREATED'] || 0) +
    (summary?.byAction?.['COMPLAINT_STATUS_UPDATED'] || 0);

  return (
    <div className="page-body">
      {/* Standardized Page Header */}
      <PageHeader
        title="Regulatory Compliance & Audit Trail"
        subtitle="Airports Authority of India (AAI) — Immutable Activity Log & Security Chronicle"
        icon={ShieldCheck}
      >
        <button
          id="audit-export-csv-btn"
          onClick={exportCsv}
          disabled={!logs.length}
          className="btn btn-secondary btn-sm"
        >
          <Download size={14} />
          <span>Export</span>
        </button>
        <button
          id="audit-refresh-btn"
          onClick={fetchAuditData}
          className="btn btn-primary btn-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </PageHeader>

      {/* KPI Cards Grid - 6 Operational Business Categories */}
      <div className="stats-grid cols-6">
        <StatCard
          label="Total Events"
          value={summary?.total || totalCount || 0}
          subtext={`${summary?.totalSuccess || totalCount} Successful Transactions`}
          icon={Activity}
          variant="indigo"
        />
        <StatCard
          label="Asset Operations"
          value={summary?.categories?.assetOperations ?? totalAssetOps}
          subtext="Register, Update & Retire"
          icon={CheckCircle2}
          variant="emerald"
        />
        <StatCard
          label="Custody Events"
          value={summary?.categories?.custodyEvents ?? totalCustodyEvents}
          subtext="Assignments, Transfers & Returns"
          icon={Layers}
          variant="purple"
        />
        <StatCard
          label="Staff Master Edits"
          value={summary?.categories?.employeeChanges || (summary?.byAction?.['EMPLOYEE_CREATED'] || 0) + (summary?.byAction?.['EMPLOYEE_UPDATED'] || 0) + (summary?.byAction?.['EMPLOYEE_DEACTIVATED'] || 0)}
          subtext="Personnel Master Logs"
          icon={User}
          variant="indigo"
        />
        <StatCard
          label="Service Desk"
          value={summary?.categories?.serviceDeskEvents ?? totalServiceActions}
          subtext="Fault Tickets & Repairs"
          icon={AlertTriangle}
          variant="amber"
        />
        <StatCard
          label="Data & Reports"
          value={summary?.categories?.dataOperations || (summary?.byAction?.['EXCEL_IMPORTED'] || 0) + (summary?.byAction?.['EXCEL_EXPORT'] || 0) + (summary?.byAction?.['PDF_GENERATED'] || 0)}
          subtext="Imports, Exports & Slips"
          icon={Download}
          variant="sky"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <SearchInput
              id={searchInputId}
              placeholder="Search by action, asset ID, ticket ID, staff username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
            />
          </div>

          <div style={{ width: '190px' }}>
            <SelectInput
              id="audit-action-filter"
              value={selectedAction}
              onChange={(e) => { setSelectedAction(e.target.value); setPage(1); }}
            >
              <option value="">All Action Types</option>
              <option value="USER_LOGIN">User Logins</option>
              <option value="USER_LOGOUT">User Logouts</option>
              <option value="ASSET_CREATED">Asset Created</option>
              <option value="ASSET_UPDATED">Asset Updated</option>
              <option value="ASSET_RETIRED">Asset Retired</option>
              <option value="ASSET_DELETED">Asset Deleted</option>
              <option value="CUSTODY_ASSIGNED">Custody Assigned</option>
              <option value="CUSTODY_TRANSFERRED">Custody Transferred</option>
              <option value="CUSTODY_RETURNED">Custody Returned</option>
              <option value="EMPLOYEE_CREATED">Staff Registered</option>
              <option value="EMPLOYEE_UPDATED">Staff Master Updated</option>
              <option value="EMPLOYEE_DEACTIVATED">Staff Deactivated</option>
              <option value="COMPLAINT_CREATED">Complaint Raised</option>
              <option value="COMPLAINT_STATUS_UPDATED">Complaint Resolved/Updated</option>
              <option value="EXCEL_IMPORTED">Excel Bulk Import</option>
              <option value="EXCEL_EXPORT">Excel Data Export</option>
              <option value="PDF_GENERATED">PDF Handover Generated</option>
              <option value="VERIFICATION_RECORDED">Physical Audit Log</option>
            </SelectInput>
          </div>

          <div style={{ width: '160px' }}>
            <SelectInput
              id="audit-entity-filter"
              value={selectedEntityType}
              onChange={(e) => { setSelectedEntityType(e.target.value); setPage(1); }}
            >
              <option value="">All Entities</option>
              <option value="AUTH">Authentication</option>
              <option value="ASSET">Asset Registry</option>
              <option value="ASSIGNMENT">Custody Ledger</option>
              <option value="EMPLOYEE">Staff Directory</option>
              <option value="COMPLAINT">Service Desk</option>
              <option value="IMPORT">Data Import</option>
              <option value="DATA">Export & Reports</option>
              <option value="VERIFICATION">Physical Audit</option>
            </SelectInput>
          </div>

          <div style={{ width: '130px' }}>
            <SelectInput
              id="audit-status-filter"
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
            </SelectInput>
          </div>

          <button type="submit" className="btn btn-primary" id="audit-search-btn">
            Filter
          </button>

          {(search || selectedAction || selectedEntityType || selectedStatus) && (
            <ClearFilterButton
              id="audit-clear-filter-btn"
              onClick={handleClearFilters}
              title="Clear"
            />
          )}
        </form>
      </div>

      {/* Error Notice */}
      {error && (
        <div style={{
          background: 'var(--status-danger-bg)',
          border: '1px solid var(--status-danger-border)',
          color: 'var(--status-danger-text)',
          padding: '0.85rem 1rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem'
        }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Standardized Audit Log Table */}
      <DataTable
        title="Chronological Audit Records"
        badgeText={`${totalCount || logs.length} Records`}
        badgeType="neutral"
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp (IST)</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Actor</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Inspect</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
                  <div>Loading chronological audit records...</div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 0 }}>
                  <EmptyState
                    icon={ShieldCheck}
                    title="No Audit Events Found"
                    description="No events match your current search or filter criteria. Try clearing active filters."
                    action={
                      (search || selectedAction || selectedEntityType) ? (
                        <ClearFilterButton onClick={handleClearFilters} title="Reset All Filters" />
                      ) : null
                    }
                  />
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const badgeStyle = getActionBadgeStyle(log.action);
                return (
                  <tr key={log._id}>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Clock size={13} style={{ opacity: 0.6 }} />
                        <span>{new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                      </div>
                    </td>

                    <td>
                      <span
                        style={{
                          ...badgeStyle,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          display: 'inline-block'
                        }}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
                          {log.entityId || 'N/A'}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                          {log.entityType}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
                          {log.actor?.name || log.actor?.username || 'SYSTEM'}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                          {log.actor?.role} {log.actor?.username ? `(@${log.actor.username})` : ''}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`badge ${log.status === 'SUCCESS' ? 'badge-available' : 'badge-danger'}`}
                      >
                        {log.status}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <TableActionBtn
                        variant="secondary"
                        onClick={() => setSelectedLog(log)}
                        id={`view-audit-${log._id}`}
                        title="Inspect Event Payload"
                      >
                        <Eye size={13} />
                        <span>Details</span>
                      </TableActionBtn>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </DataTable>

      {/* Progressive Load More Data Control */}
      {logs.length > 0 && (
        <LoadMoreButton
          currentCount={logs.length}
          totalCount={totalCount}
          loading={loadingMore}
          onLoadMore={handleLoadMore}
          error={loadMoreError}
          onRetry={handleLoadMore}
          itemName="audit records"
          id="load-more-audit-btn"
        />
      )}

      {/* Standardized Event Details Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Event Snapshot"
        subtitle="Security chronicle and immutable event payload"
        size="lg"
        id="audit-details-modal"
        footer={
          <button
            onClick={() => setSelectedLog(null)}
            className="btn btn-secondary"
            id="audit-modal-dismiss-btn"
          >
            Close
          </button>
        }
      >
        {selectedLog && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>ACTION</span>
                <strong>{selectedLog.action}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>TIMESTAMP (IST)</span>
                <span>{new Date(selectedLog.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>ENTITY TYPE / ID</span>
                <span>{selectedLog.entityType} — <strong>{selectedLog.entityId || 'N/A'}</strong></span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>STATUS</span>
                <span style={{ color: selectedLog.status === 'SUCCESS' ? '#15803d' : '#991b1b', fontWeight: 600 }}>
                  {selectedLog.status}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>ACTOR</span>
                <span>{selectedLog.actor?.name} ({selectedLog.actor?.username})</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>SOURCE IP</span>
                <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>{selectedLog.actor?.ipAddress || '127.0.0.1'}</span>
              </div>
            </div>

            {/* Visual Field-Level Diff for Updates */}
            {selectedLog.details?.diff && (
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  FIELD-LEVEL AUDIT DIFF
                </span>
                <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse', background: 'var(--color-bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-bg-subtle)', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)' }}>Field</th>
                      <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)' }}>Previous Value</th>
                      <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)' }}>Updated Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(selectedLog.details.diff).map(([key, change]) => (
                      <tr key={key}>
                        <td style={{ padding: '6px 8px', fontWeight: 600, borderBottom: '1px solid var(--border-subtle)' }}>{key}</td>
                        <td style={{ padding: '6px 8px', color: 'var(--status-danger-text)', borderBottom: '1px solid var(--border-subtle)' }}>
                          {String(change?.old ?? change?.oldValue ?? 'N/A')}
                        </td>
                        <td style={{ padding: '6px 8px', color: 'var(--status-available-text)', borderBottom: '1px solid var(--border-subtle)' }}>
                          {String(change?.new ?? change?.newValue ?? 'N/A')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Reason / Remarks Highlight */}
            {(selectedLog.details?.reason || selectedLog.details?.transferReason) && (
              <div style={{ marginBottom: '1rem', padding: '8px 12px', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
                <strong>Reason / Remarks:</strong> {selectedLog.details.reason || selectedLog.details.transferReason}
              </div>
            )}

            <div>
              <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                RAW PAYLOAD & EVENT METADATA
              </span>
              <pre
                style={{
                  background: 'var(--surface-sunken)',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  maxHeight: '220px',
                  overflowX: 'auto',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--color-text-main)',
                  margin: 0,
                  fontFamily: 'var(--font-mono, monospace)'
                }}
              >
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
