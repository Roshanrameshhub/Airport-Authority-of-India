import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Laptop, 
  Monitor, 
  Printer, 
  AlertCircle, 
  PlusCircle, 
  ShieldCheck, 
  CheckCircle2, 
  Calendar, 
  Cpu,
  RefreshCw,
  Clock,
  HardDrive,
  UserCheck,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import DataTable from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';
import { downloadAuthenticatedPdf } from '../services/api';

const getCategoryIcon = (category = '') => {
  const cat = category.toLowerCase();
  if (cat.includes('laptop') || cat.includes('notebook')) return Laptop;
  if (cat.includes('monitor') || cat.includes('display')) return Monitor;
  if (cat.includes('printer') || cat.includes('scanner')) return Printer;
  if (cat.includes('server') || cat.includes('network') || cat.includes('ups')) return Cpu;
  return HardDrive;
};

export default function EmployeeDashboard() {
  const { user, token } = useAuth();
  const [assignedAssets, setAssignedAssets] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const fetchEmployeeData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const empId = user?.employeeId || user?.username || '';

    try {
      // 1. Fetch live assigned assets from Asset repository
      const assetRes = await fetch(`/api/v1/assets?employeeId=${encodeURIComponent(empId)}&status=ASSIGNED&limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const assetData = await assetRes.json();

      let items = [];
      if (assetRes.ok && assetData.success) {
        items = assetData.data?.items || [];
      } else {
        // Fallback search by employee identifier
        const fallbackRes = await fetch(`/api/v1/assets?search=${encodeURIComponent(empId)}&limit=50`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const fallbackData = await fallbackRes.json();
        if (fallbackRes.ok && fallbackData.success) {
          items = (fallbackData.data?.items || []).filter(
            a => (a.currentEmployeeId || '').toUpperCase() === empId.toUpperCase()
          );
        }
      }
      setAssignedAssets(items);

      // 2. Fetch live complaints for employee
      const complaintRes = await fetch(`/api/v1/complaints?employeeId=${encodeURIComponent(empId)}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const complaintData = await complaintRes.json();
      if (complaintRes.ok && complaintData.success) {
        setComplaints(complaintData.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load employee custody records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchEmployeeData();
    }
  }, [token, user?.employeeId]);

  // Derived KPI metrics from real live records
  const activeWarrantiesCount = assignedAssets.filter(a => a.warrantyStatus === 'ACTIVE').length;
  const expiringSoonCount = assignedAssets.filter(a => a.warrantyStatus === 'EXPIRING_SOON').length;
  const openComplaintsCount = complaints.filter(
    c => c.status === 'OPEN' || c.status === 'IN_PROGRESS' || c.status === 'ASSIGNED'
  ).length;

  return (
    <div className="page-body">
      {/* PDF download toast notifications */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '1.25rem',
          right: '1.25rem',
          zIndex: 9999,
          padding: '0.85rem 1.25rem',
          background: notification.type === 'success' ? 'var(--status-active-bg, #D1FAE5)' : 'var(--status-danger-bg, #FEE2E2)',
          border: `1px solid ${notification.type === 'success' ? 'var(--status-active-border, #6EE7B7)' : 'var(--status-danger-border, #FCA5A5)'}`,
          borderRadius: 'var(--radius-md, 8px)',
          color: notification.type === 'success' ? 'var(--status-active-text, #065F46)' : 'var(--status-danger-text, #991B1B)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          maxWidth: '380px'
        }}>
          <span>{notification.type === 'success' ? '✓' : '⚠'}</span>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Standardized Welcome Header */}
      <PageHeader
        title={`Welcome, ${user?.name || 'Staff Officer'}`}
        subtitle={`Employee ID: ${user?.employeeId || 'AAI-STAFF'} • ${user?.designation || 'Staff Member'} • ${user?.department || 'Operations'}`}
        icon={UserCheck}
      >
        <button
          onClick={() => fetchEmployeeData(true)}
          className="btn btn-secondary btn-sm"
          disabled={refreshing || loading}
          title="Refresh inventory"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
        <Link to="/complaints" className="btn btn-primary btn-sm" id="raise-ticket-btn">
          <PlusCircle size={14} />
          <span>Service Desk</span>
        </Link>
      </PageHeader>

      {error && (
        <div style={{
          padding: '0.85rem 1.25rem',
          background: 'var(--status-danger-bg)',
          border: '1px solid var(--status-danger-border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--status-danger-text)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem'
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Real-time Dynamic KPI Summary Cards */}
      <div className="stats-grid cols-4">
        <StatCard
          label="Assigned Assets"
          value={loading ? '—' : assignedAssets.length}
          subtext="Hardware in your custody"
          icon={Laptop}
          variant="indigo"
        />
        <StatCard
          label="Active Warranty"
          value={loading ? '—' : activeWarrantiesCount}
          subtext="Covered by OEM warranty"
          icon={ShieldCheck}
          variant="emerald"
        />
        <StatCard
          label="Expiring Soon"
          value={loading ? '—' : expiringSoonCount}
          subtext="Within next 30 days"
          icon={Calendar}
          variant="amber"
        />
        <StatCard
          label="Active Tickets"
          value={loading ? '—' : openComplaintsCount}
          subtext={openComplaintsCount === 0 ? 'All equipment operational' : 'Under IT service desk'}
          icon={openComplaintsCount === 0 ? CheckCircle2 : Clock}
          variant="emerald"
        />
      </div>

      {/* Live Assigned Assets Registry */}
      <DataTable
        title="My Assigned Equipment"
        subtitle="Equipment officially assigned to your employee ID. Report hardware faults directly via the complaints desk."
        badgeText={`${assignedAssets.length} Active Items`}
        badgeType="assigned"
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Asset ID</th>
              <th>Asset Name</th>
              <th>Category</th>
              <th>Make / Model</th>
              <th>Serial Number</th>
              <th>Operating System</th>
              <th>Warranty</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Loading custody records...</span>
                  </div>
                </td>
              </tr>
            ) : assignedAssets.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ padding: 0 }}>
                  <EmptyState
                    icon={HardDrive}
                    title="No Assigned Equipment"
                    description="You currently do not have any IT hardware equipment assigned to your custody profile. Contact IT Store Administration for equipment issuance."
                  />
                </td>
              </tr>
            ) : (
              assignedAssets.map((asset) => {
                const Icon = getCategoryIcon(asset.category);
                const wStatus = asset.warrantyStatus || 'ACTIVE';
                const isExpiring = wStatus === 'EXPIRING_SOON';
                const isExpired = wStatus === 'EXPIRED';

                return (
                  <tr key={asset.assetId || asset._id}>
                    <td><code style={{ fontWeight: 600, color: 'var(--color-brand-700)' }}>{asset.assetId}</code></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                        <Icon size={16} color="var(--color-brand-600)" />
                        <span>{asset.assetName}</span>
                      </div>
                    </td>
                    <td><span className="badge badge-neutral">{asset.category || 'Hardware'}</span></td>
                    <td>{asset.make} &bull; {asset.model}</td>
                    <td><code style={{ fontSize: '0.8rem' }}>{asset.serialNumber}</code></td>
                    <td style={{ fontSize: '0.825rem' }}>
                      {asset.operatingSystem && asset.operatingSystem !== 'N/A' 
                        ? `${asset.operatingSystem} ${asset.osVersion || ''}`
                        : 'Hardware Unit'}
                    </td>
                    <td>
                      <span className={`badge ${
                        isExpired 
                          ? 'badge-danger' 
                          : isExpiring 
                          ? 'badge-maintenance' 
                          : 'badge-available'
                      }`}>
                        {wStatus}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', opacity: pdfLoading ? 0.7 : 1 }}
                          title="Download Official Handover Certificate (PDF)"
                          disabled={pdfLoading}
                          onClick={async () => {
                            if (pdfLoading) return;
                            setPdfLoading(true);
                            setNotification(null);
                            try {
                              await downloadAuthenticatedPdf(
                                `/api/v1/export/handover/asset/${asset.assetId}/pdf`,
                                `AAI_Handover_Certificate_${asset.assetId}.pdf`
                              );
                              setNotification({
                                type: 'success',
                                message: `Handover Certificate for '${asset.assetId}' downloaded.`
                              });
                              setTimeout(() => setNotification(null), 4000);
                            } catch (err) {
                              setNotification({
                                type: 'error',
                                message: err.message || 'Failed to download handover certificate.'
                              });
                              setTimeout(() => setNotification(null), 6000);
                            } finally {
                              setPdfLoading(false);
                            }
                          }}
                        >
                          <FileText size={12} />
                          <span>{pdfLoading ? 'Generating…' : 'Slip'}</span>
                        </button>
                        <Link 
                          to="/complaints" 
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                        >
                          Report Issue
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </DataTable>
    </div>
  );
}
