import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LifeBuoy,
  PlusCircle,
  Clock,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  XCircle,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import { SearchInput, SelectInput, ClearFilterButton } from '../components/ui/FormControls';
import { DataTable } from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import LoadMoreButton from '../components/ui/LoadMoreButton';

const CATEGORY_LABELS = {
  HARDWARE_FAULT: 'Hardware Fault',
  SOFTWARE_ISSUE: 'Software Issue',
  NETWORK_CONNECTIVITY: 'Network / Wi-Fi',
  PERIPHERAL_FAILURE: 'Peripheral / Printer',
  POWER_UPS_FAILURE: 'Power / UPS Failure',
  OS_CORRUPTION: 'OS Crash / Boot Loop',
  OTHER: 'General IT Request'
};

const SEVERITY_COLORS = {
  CRITICAL: { bg: 'var(--status-danger-bg)', text: 'var(--status-danger-text)', border: 'var(--status-danger-border)', label: 'Critical P1' },
  HIGH: { bg: 'var(--status-danger-bg)', text: 'var(--status-danger-text)', border: 'var(--status-danger-border)', label: 'High Priority' },
  MEDIUM: { bg: 'var(--status-maintenance-bg)', text: 'var(--status-maintenance-text)', border: 'var(--status-maintenance-border)', label: 'Medium' },
  LOW: { bg: 'var(--status-neutral-bg)', text: 'var(--status-neutral-text)', border: 'var(--status-neutral-border)', label: 'Low' }
};

const STATUS_CONFIG = {
  OPEN: { label: 'Open', className: 'badge-danger', icon: Clock },
  ASSIGNED: { label: 'Assigned', className: 'badge-neutral', icon: Clock },
  IN_PROGRESS: { label: 'Under Repair', className: 'badge-maintenance', icon: Wrench },
  RESOLVED: { label: 'Resolved', className: 'badge-available', icon: CheckCircle2 },
  CLOSED: { label: 'Closed', className: 'badge-neutral', icon: CheckCircle2 }
};

export default function ComplaintDesk() {
  const { user, token } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [complaints, setComplaints] = useState([]);
  const [availableAssets, setAvailableAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // New ticket state
  const [ticketForm, setTicketForm] = useState({
    assetId: '',
    category: 'HARDWARE_FAULT',
    severity: 'MEDIUM',
    title: '',
    description: '',
    remarks: ''
  });

  // Admin action state
  const [actionForm, setActionForm] = useState({
    assignedTechnician: '',
    resolutionNotes: '',
    partsReplaced: ''
  });
  const [updatingAction, setUpdatingAction] = useState(false);

  // Fetch Complaints with progressive pagination
  const fetchComplaints = async (pageNum = 1, isLoadMore = false, isManualRefresh = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
        setLoadMoreError(null);
      } else if (isManualRefresh) {
        setRefreshing(true);
        setLoadMoreError(null);
      } else {
        setLoading(true);
        setLoadMoreError(null);
      }
      setError(null);

      const params = new URLSearchParams();
      params.append('page', String(pageNum));
      params.append('limit', '20');
      if (statusFilter) params.append('status', statusFilter);
      if (severityFilter) params.append('severity', severityFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      if (search) params.append('search', search);

      const res = await fetch(`/api/v1/complaints?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const items = Array.isArray(data.data) ? data.data : (data.data?.items || []);
        if (isLoadMore) {
          setComplaints(prev => [...prev, ...items]);
        } else {
          setComplaints(items);
        }
        setTotalCount(data.pagination?.total ?? (isLoadMore ? complaints.length + items.length : items.length));
        setPage(pageNum);
      } else {
        throw new Error(data.message || 'Failed to fetch complaints');
      }
    } catch (err) {
      if (isLoadMore) {
        setLoadMoreError(err.message || 'Failed to load more complaints');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (loadingMore || loading) return;
    fetchComplaints(page + 1, true, false);
  };

  // Fetch eligible assets for raising complaint
  const fetchAssetsForTicket = async () => {
    try {
      const endpoint = isAdmin
        ? '/api/v1/assets?limit=100'
        : `/api/v1/assets?search=${encodeURIComponent(user?.employeeId || user?.name || '')}&limit=50`;
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const items = Array.isArray(data.data) ? data.data : (data.data?.items || []);
        setAvailableAssets(items);
      }
    } catch (err) {
      console.error('Failed to load eligible assets for ticket:', err);
    }
  };

  useEffect(() => {
    fetchAssetsForTicket();
  }, [token]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPage(1);
      fetchComplaints(1, false, false);
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search, statusFilter, severityFilter, categoryFilter, token]);



  // Statistics
  const stats = useMemo(() => {
    const total = complaints.length;
    const open = complaints.filter(c => c.status === 'OPEN').length;
    const inProgress = complaints.filter(c => c.status === 'IN_PROGRESS' || c.status === 'ASSIGNED').length;
    const critical = complaints.filter(c => (c.severity === 'CRITICAL' || c.priority === 'P1_CRITICAL') && c.status !== 'CLOSED').length;
    const resolved = complaints.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED').length;
    return { total, open, inProgress, critical, resolved };
  }, [complaints]);

  // Handle Raise Ticket Submit
  const handleRaiseSubmit = async (e) => {
    e.preventDefault();
    setSubmittingTicket(true);
    setError(null);

    try {
      if (!ticketForm.assetId || !ticketForm.title || !ticketForm.description) {
        throw new Error('Please specify the Asset ID, ticket summary title, and problem description.');
      }

      const res = await fetch('/api/v1/complaints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(ticketForm)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMessage(`Ticket #${data.data.ticketId} raised successfully. IT Service Desk has been notified.`);
        setIsRaiseModalOpen(false);
        setTicketForm({
          assetId: '',
          category: 'HARDWARE_FAULT',
          severity: 'MEDIUM',
          title: '',
          description: '',
          remarks: ''
        });
        fetchComplaints();
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        throw new Error(data.message || 'Failed to submit complaint');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Handle Update Ticket Status
  const handleUpdateTicket = async (newStatus) => {
    if (!selectedTicket) return;
    setUpdatingAction(true);

    try {
      const payload = { status: newStatus };
      if (actionForm.assignedTechnician) {
        payload.assignedTechnician = { name: actionForm.assignedTechnician };
      }
      if (actionForm.resolutionNotes || actionForm.partsReplaced) {
        payload.resolution = {
          resolutionNotes: actionForm.resolutionNotes,
          partsReplaced: actionForm.partsReplaced
        };
      }

      const res = await fetch(`/api/v1/complaints/${selectedTicket._id || selectedTicket.ticketId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSelectedTicket(data.data);
        setSuccessMessage(`Ticket #${data.data.ticketId} transitioned to ${newStatus}. Lifecycle state interlocked.`);
        fetchComplaints();
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        throw new Error(data.message || 'Failed to update ticket status');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingAction(false);
    }
  };

  const handleClearFilters = () => {
    setStatusFilter('');
    setSeverityFilter('');
    setCategoryFilter('');
    setSearch('');
  };

  const hasActiveFilters = Boolean(statusFilter || severityFilter || categoryFilter || search);

  return (
    <div className="page-body">
      {/* Standardized Page Header */}
      <PageHeader
        title="IT Service Desk & Complaint Management"
        icon={LifeBuoy}
        subtitle="Airports Authority of India • Regional Support Portal • Hardware Faults, OS Maintenance & Lifecycle Interlocks"
      >
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => fetchComplaints(true)}
          disabled={refreshing || loading}
          id="refresh-complaints-btn"
        >
          <RefreshCw size={14} className={refreshing ? 'pulse-dot' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setIsRaiseModalOpen(true)}
          id="raise-ticket-btn"
        >
          <PlusCircle size={14} />
          <span>Service Desk</span>
        </button>
      </PageHeader>

      {/* Notifications */}
      {successMessage && (
        <div className="card" style={{ marginBottom: 'var(--space-4)', background: 'var(--status-available-bg)', borderColor: 'var(--status-available-border)', color: 'var(--status-available-text)', padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="card" style={{ marginBottom: 'var(--space-4)', background: 'var(--status-danger-bg)', borderColor: 'var(--status-danger-border)', color: 'var(--status-danger-text)', padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Standardized KPI Cards Grid */}
      <div className="stats-grid">
        <StatCard
          label="Total Logged Tickets"
          value={stats.total}
          subtext="Regional service registry"
          icon={LifeBuoy}
          variant="indigo"
        />

        <StatCard
          label="Critical Faults"
          value={stats.critical}
          subtext="Urgent radar & ops systems"
          icon={ShieldAlert}
          variant="rose"
        />

        <StatCard
          label="Open & Unassigned"
          value={stats.open}
          subtext="Awaiting technician triage"
          icon={Clock}
          variant="amber"
        />

        <StatCard
          label="Under Active Repair"
          value={stats.inProgress}
          subtext="Marked Under-Maintenance"
          icon={Wrench}
          variant="indigo"
        />

        <StatCard
          label="Resolved / Restored"
          value={stats.resolved}
          subtext="Back in operational status"
          icon={CheckCircle2}
          variant="emerald"
        />
      </div>

      {/* Standardized Filter & Search Bar with Standard 38px Controls */}
      <div className="filter-bar">
        <div style={{
          display: 'grid',
          gridTemplateColumns: hasActiveFilters ? '1.8fr 1fr 1fr 1fr auto' : '1.8fr 1fr 1fr 1fr',
          gap: 'var(--space-2)',
          alignItems: 'center'
        }}>
          <SearchInput
            placeholder="Search Ticket ID, Asset, Title, Staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            id="ticket-search-input"
          />

          <SelectInput
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            id="ticket-status-filter"
            placeholder="All Statuses"
            options={[
              { value: 'OPEN', label: 'Open' },
              { value: 'ASSIGNED', label: 'Assigned' },
              { value: 'IN_PROGRESS', label: 'In Progress' },
              { value: 'RESOLVED', label: 'Resolved' },
              { value: 'CLOSED', label: 'Closed' }
            ]}
          />

          <SelectInput
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            id="ticket-severity-filter"
            placeholder="All Severities"
            options={[
              { value: 'CRITICAL', label: 'Critical Priority' },
              { value: 'HIGH', label: 'High Priority' },
              { value: 'MEDIUM', label: 'Medium Priority' },
              { value: 'LOW', label: 'Low Priority' }
            ]}
          />

          <SelectInput
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            id="ticket-category-filter"
            placeholder="All Categories"
            options={[
              { value: 'HARDWARE_FAULT', label: 'Hardware Fault' },
              { value: 'SOFTWARE_ISSUE', label: 'Software Issue' },
              { value: 'NETWORK_CONNECTIVITY', label: 'Network / Connectivity' },
              { value: 'PERIPHERAL_FAILURE', label: 'Peripherals (Printer/Scanner)' },
              { value: 'POWER_UPS_FAILURE', label: 'Power & UPS' }
            ]}
          />

          {hasActiveFilters && (
            <ClearFilterButton
              onClick={handleClearFilters}
              id="clear-complaint-filters-btn"
            />
          )}
        </div>
      </div>

      {/* Complaints Table */}
      <DataTable id="complaints-data-table">
        <thead>
          <tr>
            <th>Ticket ID</th>
            <th>Priority</th>
            <th>Asset Details</th>
            <th>Issue Summary</th>
            <th>Category</th>
            <th>Reported By</th>
            <th>Status</th>
            <th>Technician</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="9" style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-4)' }}>
                <div className="pulse-dot" style={{ margin: '0 auto var(--space-3)' }} />
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Loading IT service desk tickets...</span>
              </td>
            </tr>
          ) : complaints.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No service complaints found"
              description="All regional assets are currently operational or match filter criteria."
              colSpan="9"
              action={
                hasActiveFilters ? (
                  <button onClick={handleClearFilters} className="btn btn-secondary btn-sm">
                    Reset Filter
                  </button>
                ) : null
              }
            />
          ) : (
            complaints.map((item) => {
              const sev = SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.MEDIUM;
              const st = STATUS_CONFIG[item.status] || STATUS_CONFIG.OPEN;
              const StatusIcon = st.icon;

              return (
                <tr key={item._id || item.ticketId} style={{ cursor: 'pointer' }} onClick={() => setSelectedTicket(item)}>
                  <td>
                    <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-brand-700)' }}>
                      {item.ticketId}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.725rem',
                        fontWeight: 600,
                        background: sev.bg,
                        color: sev.text,
                        border: `1px solid ${sev.border}`
                      }}
                    >
                      {sev.label}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.assetName || item.assetId}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-brand-600)', fontFamily: 'monospace' }}>
                      {item.assetId}
                    </div>
                  </td>
                  <td style={{ maxWidth: '280px' }}>
                    <div style={{ fontWeight: 500, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.description}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-neutral">
                      {CATEGORY_LABELS[item.category] || item.category}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{item.reportedBy?.employeeName || 'Staff Member'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {item.reportedBy?.department || 'Regional Office'}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${st.className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <StatusIcon size={12} />
                      <span>{st.label}</span>
                    </span>
                  </td>
                  <td style={{ fontSize: '0.825rem', color: item.assignedTechnician?.name ? 'var(--color-text-main)' : 'var(--color-text-muted)' }}>
                    {item.assignedTechnician?.name || 'Unassigned'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTicket(item);
                      }}
                    >
                      <span>Manage</span>
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </DataTable>

      {/* Progressive Load More Data Control */}
      {complaints.length > 0 && (
        <LoadMoreButton
          currentCount={complaints.length}
          totalCount={totalCount}
          loading={loadingMore}
          onLoadMore={handleLoadMore}
          error={loadMoreError}
          onRetry={handleLoadMore}
          itemName="tickets"
          id="load-more-complaints-btn"
        />
      )}

      {/* Ticket Details & Lifecycle Action Modal */}
      {selectedTicket && (
        <Modal
          isOpen={Boolean(selectedTicket)}
          onClose={() => setSelectedTicket(null)}
          title={`Ticket: ${selectedTicket.ticketId}`}
          subtitle={selectedTicket.title}
          size="lg"
          id="manage-ticket-modal"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedTicket(null)}
              >
                Close View
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Asset Maintenance Interlock Notice */}
            <div
              style={{
                background: selectedTicket.status === 'IN_PROGRESS' ? 'var(--status-maintenance-bg)' : 'var(--color-bg-subtle)',
                border: `1px solid ${selectedTicket.status === 'IN_PROGRESS' ? 'var(--status-maintenance-border)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                fontSize: '0.8125rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>
                <Wrench size={16} color="var(--color-brand-600)" />
                <span>Asset State Machine Interlock Active</span>
              </div>
              <p style={{ color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.45 }}>
                When marked <strong>IN PROGRESS</strong>, asset <code>{selectedTicket.assetId}</code> transitions to <code>UNDER_MAINTENANCE</code>.
                Upon marking <strong>RESOLVED</strong> or <strong>CLOSED</strong>, custody status is automatically restored to operational stock.
              </p>
            </div>

            {/* Specs and Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--color-bg-subtle)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Target Asset</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedTicket.assetName}</div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-brand-600)' }}>{selectedTicket.assetId}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Issue Category</div>
                <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{CATEGORY_LABELS[selectedTicket.category] || selectedTicket.category}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Priority: <strong>{selectedTicket.severity}</strong></div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Reported By Custodian</div>
                <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{selectedTicket.reportedBy?.employeeName} ({selectedTicket.reportedBy?.employeeId})</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{selectedTicket.reportedBy?.department} &bull; {selectedTicket.reportedBy?.floor}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Assigned Technician</div>
                <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{selectedTicket.assignedTechnician?.name || 'Not yet assigned'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Raised: {new Date(selectedTicket.createdAt).toLocaleString()}</div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Fault Description
              </h4>
              <div style={{ background: 'var(--color-bg-card)', color: 'var(--color-text-main)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px', fontSize: '0.875rem', lineHeight: 1.5 }}>
                {selectedTicket.description}
              </div>
            </div>

            {/* Resolution Information if present */}
            {selectedTicket.resolution?.resolvedAt && (
              <div style={{ background: 'var(--status-available-bg)', border: '1px solid var(--status-available-border)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-available-text)', fontWeight: 600, fontSize: '0.875rem', marginBottom: '4px' }}>
                  <CheckCircle2 size={16} />
                  <span>Resolution Information</span>
                </div>
                <div style={{ fontSize: '0.825rem', color: 'var(--status-available-text)', marginBottom: '4px' }}>
                  <strong>Notes:</strong> {selectedTicket.resolution?.resolutionNotes || 'Operational maintenance executed.'}
                </div>
                {selectedTicket.resolution?.partsReplaced && (
                  <div style={{ fontSize: '0.825rem', color: 'var(--status-available-text)' }}>
                    <strong>Spares Replaced:</strong> {selectedTicket.resolution?.partsReplaced}
                  </div>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--status-available-text)', opacity: 0.9, marginTop: '6px' }}>
                  Resolved by {selectedTicket.resolution?.resolvedBy || 'IT Admin'} on {new Date(selectedTicket.resolution.resolvedAt).toLocaleString()}
                </div>
              </div>
            )}

            {/* Admin / Action Controls */}
            {isAdmin && selectedTicket.status !== 'CLOSED' && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '0.9375rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Wrench size={16} color="var(--color-brand-600)" />
                  <span>Service Desk Action Console</span>
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Assigned Hardware Technician</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Suresh Kumar (Hardware Specialist)"
                      value={actionForm.assignedTechnician}
                      onChange={(e) => setActionForm({ ...actionForm, assignedTechnician: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                    <div className="form-group">
                      <label className="form-label">Resolution Notes / Action Taken</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Cleared roller jam, updated firmware"
                        value={actionForm.resolutionNotes}
                        onChange={(e) => setActionForm({ ...actionForm, resolutionNotes: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Parts / Spares Replaced</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Roller kit, SMPS power unit"
                        value={actionForm.partsReplaced}
                        onChange={(e) => setActionForm({ ...actionForm, partsReplaced: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {selectedTicket.status === 'OPEN' && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleUpdateTicket('ASSIGNED')}
                        disabled={updatingAction}
                      >
                        <Clock size={15} />
                        <span>Assign to IT Queue</span>
                      </button>
                    )}

                    {(selectedTicket.status === 'OPEN' || selectedTicket.status === 'ASSIGNED') && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ borderColor: 'var(--status-maintenance-border)', color: 'var(--status-maintenance-text)' }}
                        onClick={() => handleUpdateTicket('IN_PROGRESS')}
                        disabled={updatingAction}
                      >
                        <Wrench size={15} />
                        <span>Mark In-Progress (Interlock)</span>
                      </button>
                    )}

                    {selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED' && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleUpdateTicket('RESOLVED')}
                        disabled={updatingAction}
                      >
                        <CheckCircle2 size={15} />
                        <span>Mark Resolved & Restore Asset</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ marginLeft: 'auto' }}
                      onClick={() => handleUpdateTicket('CLOSED')}
                      disabled={updatingAction}
                    >
                      <XCircle size={15} />
                      <span>Close Ticket</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Employee Confirmation to close ticket */}
            {!isAdmin && selectedTicket.status === 'RESOLVED' && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: '0.875rem', marginBottom: '12px' }}>
                  IT Support has resolved this ticket. Please verify that your equipment is working properly.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleUpdateTicket('CLOSED')}
                  disabled={updatingAction}
                >
                  <CheckCircle2 size={16} />
                  <span>Acknowledge Resolution & Close Ticket</span>
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Raise Ticket Modal */}
      <Modal
        isOpen={isRaiseModalOpen}
        onClose={() => setIsRaiseModalOpen(false)}
        title="Raise IT Service Ticket"
        subtitle="Report equipment fault, OS malfunction or hardware service request"
        size="md"
        id="raise-ticket-modal"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsRaiseModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={submittingTicket}
              onClick={handleRaiseSubmit}
            >
              {submittingTicket ? 'Submitting Ticket...' : 'Dispatch Ticket to IT Support'}
            </button>
          </>
        }
      >
        <form onSubmit={handleRaiseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {/* Select Asset */}
          <div className="form-group">
            <label className="form-label">Asset Under Complaint *</label>
            {availableAssets.length > 0 ? (
              <select
                className="form-select"
                value={ticketForm.assetId}
                onChange={(e) => setTicketForm({ ...ticketForm, assetId: e.target.value })}
                required
                id="ticket-asset-select"
              >
                <option value="">-- Choose Equipment --</option>
                {availableAssets.map((ast) => (
                  <option key={ast._id || ast.assetId} value={ast.assetId}>
                    {ast.assetId} &bull; {ast.assetName} ({ast.category}) - {ast.serialNumber}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="form-input"
                placeholder="e.g. AAI-REG-PC-2024-0001"
                value={ticketForm.assetId}
                onChange={(e) => setTicketForm({ ...ticketForm, assetId: e.target.value })}
                required
              />
            )}
            <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
              Select equipment from your assigned registry or enter serial / asset tag.
            </small>
          </div>

          {/* Category & Severity Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Issue Category *</label>
              <select
                className="form-select"
                value={ticketForm.category}
                onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
              >
                <option value="HARDWARE_FAULT">Hardware Fault (No boot / Screen / Fan)</option>
                <option value="SOFTWARE_ISSUE">Software / Application Issue</option>
                <option value="NETWORK_CONNECTIVITY">Network / Wi-Fi / IP LAN</option>
                <option value="PERIPHERAL_FAILURE">Peripheral (Printer, Scanner, Mouse)</option>
                <option value="POWER_UPS_FAILURE">Power, Adapter or UPS Failure</option>
                <option value="OS_CORRUPTION">OS Crash / Blue Screen</option>
                <option value="OTHER">Other Technical Problem</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Severity Level *</label>
              <select
                className="form-select"
                value={ticketForm.severity}
                onChange={(e) => setTicketForm({ ...ticketForm, severity: e.target.value })}
              >
                <option value="LOW">Low (Cosmetic, minor inconvenience)</option>
                <option value="MEDIUM">Medium (General work impediment)</option>
                <option value="HIGH">High (Primary workstation unbootable)</option>
                <option value="CRITICAL">Critical (Radar, ATC, or Flight Ops down)</option>
              </select>
            </div>
          </div>

          {/* Problem Summary */}
          <div className="form-group">
            <label className="form-label">Summary / Problem Title *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Brief description of the symptom (e.g. Display blank after power on)"
              value={ticketForm.title}
              onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
              required
            />
          </div>

          {/* Problem Details */}
          <div className="form-group">
            <label className="form-label">Detailed Symptoms & Notes *</label>
            <textarea
              className="form-control"
              style={{ height: 'auto', padding: '8px 12px' }}
              rows={4}
              placeholder="Describe what occurred, any error messages, and when the issue started..."
              value={ticketForm.description}
              onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
