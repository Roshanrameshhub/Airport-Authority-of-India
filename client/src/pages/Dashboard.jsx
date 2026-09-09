import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Boxes, 
  CheckCircle2, 
  Clock, 
  Wrench, 
  AlertTriangle, 
  ArrowUpRight, 
  PlusCircle, 
  FileUp, 
  ArrowLeftRight,
  ShieldCheck,
  RefreshCw,
  LifeBuoy,
  Layers,
  AlertCircle,
  Activity,
  Users,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import { DataTable } from '../components/ui/DataTable';
import { downloadAuthenticatedPdf } from '../services/api';

export default function Dashboard() {
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [distTab, setDistTab] = useState('category'); // 'category' | 'department'
  const [showSpecs, setShowSpecs] = useState(false);

  const [stats, setStats] = useState(null);
  const [categoryDist, setCategoryDist] = useState([]);
  const [deptDist, setDeptDist] = useState([]);
  const [warrantyAlerts, setWarrantyAlerts] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [amcContracts, setAmcContracts] = useState([]);

  const fetchDashboardData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, catRes, deptRes, alertsRes, actRes, amcRes] = await Promise.all([
        fetch('/api/v1/dashboard/stats', { headers }),
        fetch('/api/v1/dashboard/category-distribution', { headers }),
        fetch('/api/v1/dashboard/department-distribution', { headers }),
        fetch('/api/v1/dashboard/warranty-alerts', { headers }),
        fetch('/api/v1/dashboard/recent-activity?limit=6', { headers }),
        fetch('/api/v1/amc', { headers })
      ]);

      const [statsData, catData, deptData, alertsData, actData, amcData] = await Promise.all([
        statsRes.json(),
        catRes.json(),
        deptRes.json(),
        alertsRes.json(),
        actRes.json(),
        amcRes.json()
      ]);

      if (statsData.success) setStats(statsData.data);
      if (catData.success) setCategoryDist(catData.data);
      if (deptData.success) setDeptDist(deptData.data);
      if (alertsData.success) setWarrantyAlerts(alertsData.data);
      if (actData.success) setRecentActivities(actData.data);
      if (amcData.success) setAmcContracts(amcData.data);
    } catch (err) {
      setError(err.message || 'Failed to synchronize live dashboard metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const renderDistributionCard = () => {
    const activeData = distTab === 'category' ? categoryDist : deptDist;
    const isDept = distTab === 'department';

    return (
      <div className="card" style={{ flex: 1.2 }}>
        <div className="card-header" style={{ marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={15} color="var(--color-brand-600)" />
            <h2 className="card-title" style={{ fontSize: '0.85rem' }}>
              {isDept ? 'Department Scope' : 'Equipment Scope'}
            </h2>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ display: 'inline-flex', background: 'var(--color-bg-subtle)', padding: '2px', borderRadius: 'var(--radius-sm)' }}>
              <button
                type="button"
                onClick={() => setDistTab('category')}
                style={{
                  border: 'none',
                  background: !isDept ? 'var(--color-brand-600)' : 'transparent',
                  color: !isDept ? '#ffffff' : 'var(--color-text-muted)',
                  fontWeight: !isDept ? 700 : 500,
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Category
              </button>
              <button
                type="button"
                onClick={() => setDistTab('department')}
                style={{
                  border: 'none',
                  background: isDept ? 'var(--color-brand-600)' : 'transparent',
                  color: isDept ? '#ffffff' : 'var(--color-text-muted)',
                  fontWeight: isDept ? 700 : 500,
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Department
              </button>
            </div>
            <Link
              to="/assets"
              style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600, marginLeft: '3px' }}
            >
              <span>All</span>
              <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>

        <div className="dashboard-scroll-panel" style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
          {activeData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
              {isDept ? 'No department metrics available' : 'Loading category metrics...'}
            </div>
          ) : (
            activeData.slice(0, 6).map((item, idx) => {
              const label = item.category || item.department || item.name;
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }} title={label}>
                      {label}
                    </span>
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      <strong>{item.count}</strong> ({item.percentage}%) &bull;{' '}
                      <span style={{ color: 'var(--color-brand-600)', fontWeight: 600 }}>{item.assigned} assigned</span>
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '5px', background: 'var(--color-bg-subtle)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${item.percentage}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--color-brand-600), var(--color-brand-400))',
                        borderRadius: '999px',
                        transition: 'width 0.4s ease-out'
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderQuickActions = () => (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">
          <ArrowLeftRight size={15} color="var(--color-brand-600)" />
          <span>Quick Actions</span>
        </h2>
      </div>
      <div className="quick-actions-grid">
        <Link to="/assets" className="quick-action-btn" id="action-create-asset">
          <PlusCircle size={15} />
          <span>Create Asset</span>
        </Link>
        <Link to="/transfers" className="quick-action-btn" id="action-transfer">
          <ArrowLeftRight size={15} />
          <span>Transfer</span>
        </Link>
        <Link to="/complaints" className="quick-action-btn" id="action-service-desk">
          <LifeBuoy size={15} />
          <span>Service Desk</span>
        </Link>
        <Link to="/import-export" className="quick-action-btn" id="action-bulk-import">
          <FileUp size={15} />
          <span>Bulk Import</span>
        </Link>
        <Link to="/employees" className="quick-action-btn" id="action-employees">
          <Users size={15} />
          <span>Employees</span>
        </Link>
        <Link to="/audit-logs" className="quick-action-btn" id="action-audit-log">
          <ShieldCheck size={15} />
          <span>Audit Log</span>
        </Link>
      </div>
    </div>
  );

  const handleDownloadAmcReport = async (contractNumber) => {
    try {
      await downloadAuthenticatedPdf(
        `/api/v1/export/amc/${contractNumber}/pdf`,
        `AAI_AMC_${contractNumber}.pdf`
      );
    } catch (err) {
      alert(err.message || 'Failed to download AMC SLA agreement report');
    }
  };

  const renderAMCContracts = () => (
    <div className="card" style={{ flex: 1 }}>
      <div className="card-header" style={{ marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Wrench size={14} color="var(--color-brand-600)" />
          <h2 className="card-title">OEM AMC Contracts</h2>
        </div>
      </div>

      <div className="dashboard-scroll-panel" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {amcContracts.length === 0 ? (
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', padding: '8px 0' }}>No AMC contracts registered</div>
        ) : (
          amcContracts.slice(0, 3).map((amc) => (
            <div
              key={amc.contractNumber}
              style={{
                background: 'var(--color-bg-subtle)',
                padding: '6px 8px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.75rem',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <strong style={{ color: 'var(--color-text-main)' }}>{amc.vendorName}</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className={`badge ${amc.status === 'ACTIVE' ? 'badge-available' : amc.status === 'EXPIRING_SOON' ? 'badge-maintenance' : 'badge-neutral'}`} style={{ fontSize: '0.62rem' }}>
                    {amc.status}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '1px 6px', fontSize: '0.62rem', height: '20px' }}
                    onClick={() => handleDownloadAmcReport(amc.contractNumber)}
                    title="Download AMC SLA Agreement Report (PDF)"
                  >
                    <FileText size={10} />
                    <span>Report</span>
                  </button>
                </div>
              </div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.7rem' }}>
                SLA: <strong>{amc.supportTier.replace(/_/g, ' ')}</strong> &bull; Desk: {amc.contactPhone || 'Support'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderSpecificationSection = () => (
    <div className="card" style={{ width: '100%', marginTop: '4px' }}>
      <div 
        className="card-header"
        onClick={() => setShowSpecs(!showSpecs)}
        style={{ cursor: 'pointer', userSelect: 'none', marginBottom: showSpecs ? '10px' : 0 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={15} color="var(--color-brand-600)" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h2 className="card-title" style={{ fontSize: '0.85rem' }}>
                Confirmed Specification — 13 Mandatory Asset Fields
              </h2>
              <span className="badge badge-neutral" style={{ fontSize: '0.62rem' }}>Reference Schema</span>
            </div>
            <span className="card-subtitle" style={{ fontSize: '0.7rem' }}>
              Official AAI Central Equipment Ledger Schema &bull; Click to {showSpecs ? 'collapse' : 'expand reference mapping'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ padding: '2px 8px', fontSize: '0.7rem' }}
            onClick={(e) => { e.stopPropagation(); setShowSpecs(!showSpecs); }}
          >
            {showSpecs ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            <span>{showSpecs ? 'Hide Schema' : 'View 13 Fields'}</span>
          </button>
          <Link to="/assets" onClick={(e) => e.stopPropagation()} style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
            <span>View Assets</span>
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      {showSpecs && (
        <div className="spec-grid">
        <div className="spec-grid-item">
          <div className="spec-grid-header">
            <span className="spec-grid-label">#1 User Name</span>
            <span className="badge badge-assigned">Custody</span>
          </div>
          <span className="spec-grid-value">Staff Full Name</span>
          <span className="spec-grid-sub">employee.name (String)</span>
        </div>

        <div className="spec-grid-item">
          <div className="spec-grid-header">
            <span className="spec-grid-label">#2 Designation</span>
            <span className="badge badge-neutral">Staff Master</span>
          </div>
          <span className="spec-grid-value">Official Rank / Title</span>
          <span className="spec-grid-sub">employee.designation (String)</span>
        </div>

        <div className="spec-grid-item">
          <div className="spec-grid-header">
            <span className="spec-grid-label">#3 Department</span>
            <span className="badge badge-available">Direct Field</span>
          </div>
          <span className="spec-grid-value">Operational Dept</span>
          <span className="spec-grid-sub">asset.department (String)</span>
        </div>

        <div className="spec-grid-item">
          <div className="spec-grid-header">
            <span className="spec-grid-label">#4 Floor / Location</span>
            <span className="badge badge-neutral">Location</span>
          </div>
          <span className="spec-grid-value">Physical Floor / Block</span>
          <span className="spec-grid-sub">asset.floor (String)</span>
        </div>

        <div className="spec-grid-item">
          <div className="spec-grid-header">
            <span className="spec-grid-label">#5 Employee ID</span>
            <span className="badge badge-assigned">Key Identifier</span>
          </div>
          <span className="spec-grid-value">Unique Staff Code</span>
          <span className="spec-grid-sub">employee.employeeId (String)</span>
        </div>

        <div className="spec-grid-item">
          <div className="spec-grid-header">
            <span className="spec-grid-label">#6 Asset Name</span>
            <span className="badge badge-available">Searchable</span>
          </div>
          <span className="spec-grid-value">Hardware Descriptor</span>
          <span className="spec-grid-sub">asset.assetName (String)</span>
        </div>

        <div className="spec-grid-item">
          <div className="spec-grid-header">
            <span className="spec-grid-label">#7 Make / Brand</span>
            <span className="badge badge-neutral">OEM Brand</span>
          </div>
          <span className="spec-grid-value">Manufacturer</span>
          <span className="spec-grid-sub">asset.make (String)</span>
        </div>

        <div className="spec-grid-item">
          <div className="spec-grid-header">
            <span className="spec-grid-label">#8 Model Number</span>
            <span className="badge badge-neutral">Product Code</span>
          </div>
          <span className="spec-grid-value">Hardware Model</span>
          <span className="spec-grid-sub">asset.model (String)</span>
        </div>

        <div className="spec-grid-item">
          <div className="spec-grid-header">
            <span className="spec-grid-label">#9 Serial Number</span>
            <span className="badge badge-assigned">Unique OEM</span>
          </div>
          <span className="spec-grid-value">Factory Serial Tag</span>
          <span className="spec-grid-sub">asset.serialNumber (String)</span>
        </div>

        <div className="spec-grid-item">
          <div className="spec-grid-header">
            <span className="spec-grid-label">#10 Installation Date</span>
            <span className="badge badge-neutral">Commission</span>
          </div>
          <span className="spec-grid-value">Date of Commissioning</span>
          <span className="spec-grid-sub">asset.installDate (Date)</span>
        </div>

        <div className="spec-grid-item">
          <div className="spec-grid-header">
            <span className="spec-grid-label">#11 Warranty Term</span>
            <span className="badge badge-available">OEM SLA</span>
          </div>
          <span className="spec-grid-value">Start & End Validity</span>
          <span className="spec-grid-sub">asset.warrantyStartDate, endDate (Date)</span>
        </div>

        <div className="spec-grid-item">
          <div className="spec-grid-header">
            <span className="spec-grid-label">#12 OS & Version</span>
            <span className="badge badge-neutral">Software</span>
          </div>
          <span className="spec-grid-value">Operating Environment</span>
          <span className="spec-grid-sub">asset.operatingSystem, osVersion (String)</span>
        </div>

        <div className="spec-grid-item" style={{ gridColumn: 'span 2' }}>
          <div className="spec-grid-header">
            <span className="spec-grid-label">#13 Remarks & Condition</span>
            <span className="badge badge-neutral">Audit Log</span>
          </div>
          <span className="spec-grid-value">Deployment, Maintenance, or Custody Notes</span>
          <span className="spec-grid-sub">asset.remarks (Text)</span>
        </div>
      </div>
      )}
    </div>
  );

  const renderWarrantyActionCenter = () => (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">
          <AlertCircle size={15} color="var(--status-danger-text)" />
          <span>Warranty Action Center</span>
        </h2>
        <Link to="/assets?warrantyStatus=EXPIRING_SOON" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
          <span>Filter</span>
          <ArrowUpRight size={13} />
        </Link>
      </div>

      <div className="dashboard-scroll-panel" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {warrantyAlerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '18px 14px', color: 'var(--color-text-muted)' }}>
            <CheckCircle2 size={22} color="var(--status-available-text)" style={{ margin: '0 auto 4px' }} />
            <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--color-text-main)' }}>All Systems Operational</div>
            <p style={{ margin: '2px 0 0', fontSize: '0.72rem' }}>No warranties expiring within 30 days.</p>
          </div>
        ) : (
          warrantyAlerts.slice(0, 4).map((alert, idx) => {
            const isExpired = alert.daysRemaining <= 0;
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: isExpired ? 'var(--status-danger-bg)' : 'var(--status-maintenance-bg)',
                  border: `1px solid ${isExpired ? 'var(--status-danger-border)' : 'var(--status-maintenance-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.76rem',
                  gap: '8px'
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {alert.assetName}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    <code>{alert.assetId}</code> &bull; {alert.department}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span className={`badge ${isExpired ? 'badge-danger' : 'badge-maintenance'}`} style={{ fontSize: '0.62rem' }}>
                    {isExpired ? `Expired (${Math.abs(alert.daysRemaining)}d)` : `${alert.daysRemaining}d left`}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const renderRecentActivity = () => (
    <div className="card" style={{ flex: 1.1 }}>
      <div className="card-header">
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={14} color="var(--color-brand-600)" />
          <span>Recent System Activity</span>
        </h2>
      </div>

      <div className="dashboard-scroll-panel" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {recentActivities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '12px', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
            No recent events recorded.
          </div>
        ) : (
          recentActivities.map((act, idx) => (
            <div
              key={idx}
              style={{
                borderBottom: idx < recentActivities.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                paddingBottom: '5px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-main)' }}>
                  {act.title}
                </span>
                <span className="badge badge-neutral" style={{ fontSize: '0.6rem' }}>
                  {act.badge}
                </span>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.25 }}>
                {act.description}
              </p>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', display: 'block' }}>
                {new Date(act.timestamp).toLocaleDateString()} {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderComplianceNotice = () => (
    <div className="card" style={{ flexShrink: 0, background: 'var(--color-bg-subtle)', borderColor: 'var(--border-subtle)', padding: '8px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
        <ShieldCheck size={15} color="var(--color-brand-600)" />
        <strong style={{ color: 'var(--color-brand-title)', fontSize: '0.78rem' }}>AAI Regional Compliance</strong>
      </div>
      <p style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', lineHeight: 1.3, margin: 0 }}>
        Immutable custody ledger active. Aviation security and hardware custody events archived.
      </p>
    </div>
  );

  return (
    <div className="page-body">
      {/* Standardized Page Header */}
      <PageHeader
        title="Executive Dashboard"
        subtitle="Airports Authority of India • Asset Lifecycle, Custody & Warranty Engine"
      >
        <button 
          className="btn btn-secondary btn-sm" 
          onClick={() => fetchDashboardData(true)} 
          disabled={refreshing || loading}
          id="refresh-dashboard-btn"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
        <Link to="/assets" className="btn btn-secondary btn-sm" id="quick-view-assets">
          <Boxes size={14} />
          <span>View Assets</span>
        </Link>
        <Link to="/import-export" className="btn btn-primary btn-sm" id="quick-import-excel">
          <FileUp size={14} />
          <span>Excel Wizard</span>
        </Link>
      </PageHeader>

      {error && (
        <div className="card" style={{ padding: '8px 12px', background: 'var(--status-danger-bg)', borderColor: 'var(--status-danger-border)', color: 'var(--status-danger-text)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span>Failed to synchronize real-time statistics: {error}</span>
          </div>
        </div>
      )}

      {/* KPI Cards Grid - Compact Responsive 6 Columns */}
      <div className="stats-grid cols-6">
        <StatCard
          label="Total Registered Assets"
          value={stats ? stats.assets.total : '--'}
          subtext={`Across ${deptDist.length || 8} Depts`}
          icon={Boxes}
          variant="indigo"
        />

        <StatCard
          label="In Custody / Assigned"
          value={stats ? stats.assets.assigned : '--'}
          subtext={stats ? `${stats.assets.utilizationRate}% Utilization` : 'Active Custody'}
          icon={CheckCircle2}
          variant="emerald"
        />

        <StatCard
          label="Available in Stock"
          value={stats ? stats.assets.available : '--'}
          subtext="Ready for Issuance"
          icon={Clock}
          variant="emerald"
        />

        <StatCard
          label="Under Maintenance"
          value={stats ? stats.assets.maintenance : '--'}
          subtext="Service Desk Linked"
          icon={Wrench}
          variant="amber"
        />

        <StatCard
          label="Expiring Warranties"
          value={stats ? stats.warranties.expiringSoon : '--'}
          subtext={stats ? `${stats.warranties.expired} Expired` : 'Within 30 Days'}
          icon={AlertTriangle}
          variant="rose"
        />

        <StatCard
          label="Active Support Tickets"
          value={stats ? stats.complaints.active : '--'}
          subtext={stats ? `${stats.complaints.critical} Critical P1` : 'Service Desk Queue'}
          icon={LifeBuoy}
          variant="indigo"
        />
      </div>

      {/* Main 2-Column Responsive Operational Grid */}
      <div className="dashboard-workspace">
        {/* Row 1: Operational Scope & Urgent Warranties */}
        <div className="dashboard-row">
          {renderDistributionCard()}
          {renderWarrantyActionCenter()}
        </div>

        {/* Row 2: Quick Actions & AMC + Activity & Compliance */}
        <div className="dashboard-row">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {renderQuickActions()}
            {renderAMCContracts()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {renderRecentActivity()}
            {renderComplianceNotice()}
          </div>
        </div>

        {/* Bottom Collapsible Confirmed Specification (13 Asset Fields) */}
        {renderSpecificationSection()}
      </div>
    </div>
  );
}
