import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { apiClient } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import * as XLSX from 'xlsx';
import {
  Search, Filter, Eye, EyeOff, Download, RefreshCw, ChevronUp, ChevronDown,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, X, Layers,
  Cpu, MapPin, ShoppingCart, Shield, Activity, Users, AlertCircle,
  CheckCircle, Clock, Package, Settings
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return '—'; }
};

const STATUS_CONFIG = {
  AVAILABLE: { color: '#059669', bg: '#D1FAE5', label: 'Available' },
  ASSIGNED:  { color: '#2563EB', bg: '#DBEAFE', label: 'Assigned' },
  GODOWN:    { color: '#92400E', bg: '#FEF3C7', label: 'Godown' },
  UNDER_MAINTENANCE: { color: '#7C3AED', bg: '#EDE9FE', label: 'Maintenance' },
  UNDER_REPAIR:      { color: '#D97706', bg: '#FEF3C7', label: 'Repair' },
  FAULTY:    { color: '#DC2626', bg: '#FEE2E2', label: 'Faulty' },
  DAMAGED:   { color: '#DC2626', bg: '#FEE2E2', label: 'Damaged' },
  RETIRED:   { color: '#6B7280', bg: '#F3F4F6', label: 'Retired' },
  DISPOSED:  { color: '#374151', bg: '#F3F4F6', label: 'Disposed' },
  WRITE_OFF: { color: '#1F2937', bg: '#E5E7EB', label: 'Write-Off' },
  LOST:      { color: '#991B1B', bg: '#FEE2E2', label: 'Lost' }
};

const EMP_TYPE_CONFIG = {
  AAI:      { color: '#1D4ED8', bg: '#DBEAFE', label: 'AAI' },
  Contract: { color: '#7C3AED', bg: '#EDE9FE', label: 'Contract' }
};

const WARRANTY_CONFIG = {
  ACTIVE:    { color: '#059669', label: 'Active' },
  EXPIRING:  { color: '#D97706', label: 'Expiring' },
  EXPIRED:   { color: '#DC2626', label: 'Expired' },
  AMC:       { color: '#2563EB', label: 'AMC' },
  NONE:      { color: '#6B7280', label: '—' }
};

// ─── Column Definitions ───────────────────────────────────────────────────────

const COLUMN_GROUPS = [
  {
    id: 'asset',
    label: 'Asset',
    icon: Layers,
    columns: [
      { id: 'assetId',     label: 'Asset ID',      frozen: true,  width: 170, render: (a) => <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '12px' }}>{a.assetId}</span> },
      { id: 'oldAssetId',  label: 'Old Asset ID',  frozen: false, width: 130, render: (a) => a.oldAssetId || '—' },
      { id: 'assetName',   label: 'Asset Name',    frozen: false, width: 220, render: (a) => a.assetName },
      { id: 'category',    label: 'Category',      frozen: false, width: 140, render: (a) => a.category },
      { id: 'assetType',   label: 'Type',          frozen: false, width: 130, render: (a) => a.assetType },
      { id: 'make',        label: 'Make',          frozen: false, width: 110, render: (a) => a.make },
      { id: 'model',       label: 'Model',         frozen: false, width: 160, render: (a) => a.model },
      { id: 'serialNumber',label: 'Serial No.',    frozen: false, width: 160, render: (a) => <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{a.serialNumber}</span> }
    ]
  },
  {
    id: 'custodian',
    label: 'Custodian',
    icon: Users,
    columns: [
      { id: 'currentEmployeeId',   label: 'Emp ID',      frozen: false, width: 110, render: (a) => a.currentEmployeeId || '—' },
      { id: 'currentEmployeeName', label: 'Custodian',   frozen: false, width: 180, render: (a) => a.currentEmployeeName || '—' },
      {
        id: 'currentEmployeeType', label: 'Type', frozen: false, width: 90,
        render: (a) => {
          const cfg = EMP_TYPE_CONFIG[a.currentEmployeeType] || EMP_TYPE_CONFIG.AAI;
          return a.currentEmployeeId
            ? <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
            : '—';
        }
      },
      { id: 'currentEmploymentCategory', label: 'Emp. Category', frozen: false, width: 130, render: (a) => a.currentEmploymentCategory || '—' },
      { id: 'currentDesignation', label: 'Designation', frozen: false, width: 200, render: (a) => a.currentDesignation || '—' },
      { id: 'department', label: 'Department', frozen: false, width: 200, render: (a) => a.department },
      { id: 'floor', label: 'Floor / Location', frozen: false, width: 160, render: (a) => a.floor },
      { id: 'currentContractorName', label: 'Contractor / Vendor', frozen: false, width: 160, render: (a) => a.currentContractorName || '—' }
    ]
  },
  {
    id: 'technical',
    label: 'Technical',
    icon: Cpu,
    columns: [
      { id: 'processor',        label: 'Processor',    frozen: false, width: 180, render: (a) => a.computerConfig?.processor || '—' },
      { id: 'ramSizeGb',        label: 'RAM (GB)',     frozen: false, width: 90,  render: (a) => a.computerConfig?.ramSizeGb != null ? `${a.computerConfig.ramSizeGb} GB` : '—' },
      { id: 'storageCapacityGb',label: 'Storage (GB)', frozen: false, width: 100, render: (a) => a.computerConfig?.storageCapacityGb != null ? `${a.computerConfig.storageCapacityGb} GB` : '—' },
      { id: 'storageType',      label: 'Storage Type', frozen: false, width: 100, render: (a) => a.computerConfig?.storageType || '—' },
      { id: 'ipAddress',        label: 'IP Address',   frozen: false, width: 130, render: (a) => a.computerConfig?.ipAddress || a.ipAddress || '—' },
      { id: 'macAddress',       label: 'MAC Address',  frozen: false, width: 150, render: (a) => <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{a.computerConfig?.macAddress || a.macAddress || '—'}</span> },
      { id: 'hostname',         label: 'Hostname',     frozen: false, width: 140, render: (a) => a.computerConfig?.hostname || '—' }
    ]
  },
  {
    id: 'location',
    label: 'Location',
    icon: MapPin,
    columns: [
      { id: 'location', label: 'Building / Loc.', frozen: false, width: 180, render: (a) => a.location || '—' },
      { id: 'room',     label: 'Room',            frozen: false, width: 100, render: (a) => a.room || '—' },
      { id: 'intercom', label: 'Intercom',        frozen: false, width: 100, render: (a) => a.intercom || '—' }
    ]
  },
  {
    id: 'procurement',
    label: 'Procurement',
    icon: ShoppingCart,
    columns: [
      { id: 'supplier',          label: 'Supplier',          frozen: false, width: 180, render: (a) => a.supplier || '—' },
      { id: 'supplyOrderNumber', label: 'SO / PO No.',       frozen: false, width: 160, render: (a) => a.supplyOrderNumber || '—' },
      { id: 'purchaseCost',      label: 'Cost (₹)',          frozen: false, width: 120, render: (a) => a.purchaseCost != null ? `₹${Number(a.purchaseCost).toLocaleString('en-IN')}` : '—' },
      { id: 'purchaseDate',      label: 'Purchase Date',     frozen: false, width: 120, render: (a) => fmt(a.purchaseDate) },
      { id: 'installDate',       label: 'Install Date',      frozen: false, width: 120, render: (a) => fmt(a.installDate) }
    ]
  },
  {
    id: 'warranty',
    label: 'Warranty & AMC',
    icon: Shield,
    columns: [
      { id: 'warrantyStartDate', label: 'Warranty Start', frozen: false, width: 120, render: (a) => fmt(a.warrantyStartDate) },
      { id: 'warrantyEndDate',   label: 'Warranty End',   frozen: false, width: 120, render: (a) => fmt(a.warrantyEndDate) },
      {
        id: 'warrantyStatus', label: 'Warranty', frozen: false, width: 100,
        render: (a) => {
          const ws = a.warrantyStatus || 'NONE';
          const cfg = WARRANTY_CONFIG[ws] || WARRANTY_CONFIG.NONE;
          return <span style={{ color: cfg.color, fontWeight: 600, fontSize: '12px' }}>{cfg.label}</span>;
        }
      },
      { id: 'amcApplicable', label: 'AMC', frozen: false, width: 70, render: (a) => a.amcApplicable ? <span style={{ color: '#2563EB', fontWeight: 600 }}>Yes</span> : '—' },
      { id: 'amcContractId', label: 'AMC Contract', frozen: false, width: 140, render: (a) => a.amcContractId || '—' },
      { id: 'amcEndDate',    label: 'AMC End',       frozen: false, width: 110, render: (a) => fmt(a.amcEndDate) }
    ]
  },
  {
    id: 'lifecycle',
    label: 'Lifecycle',
    icon: Activity,
    columns: [
      {
        id: 'status', label: 'Status', frozen: false, width: 120,
        render: (a) => {
          const cfg = STATUS_CONFIG[a.status] || { color: '#6B7280', bg: '#F3F4F6', label: a.status };
          return <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, color: cfg.color, background: cfg.bg }}>{cfg.label}</span>;
        }
      },
      { id: 'condition',           label: 'Condition',       frozen: false, width: 100, render: (a) => a.condition },
      { id: 'currentAssignmentDate',label: 'Assigned On',    frozen: false, width: 110, render: (a) => fmt(a.currentAssignmentDate) },
      { id: 'remarks',             label: 'Remarks',         frozen: false, width: 260, render: (a) => <span style={{ color: 'var(--text-muted)' }}>{a.remarks || '—'}</span> }
    ]
  }
];

const ALL_COLUMNS = COLUMN_GROUPS.flatMap(g => g.columns);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EnterpriseInventory() {
  const { theme, isDark } = useTheme();

  // Data state
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEmployeeType, setFilterEmployeeType] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterAmcOnly, setFilterAmcOnly] = useState(false);
  const [filterWarrantyExpiring, setFilterWarrantyExpiring] = useState(false);

  // UI state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortCol, setSortCol] = useState('assetId');
  const [sortDir, setSortDir] = useState('asc');
  const [hiddenGroups, setHiddenGroups] = useState(new Set(['technical', 'location', 'procurement']));
  const [showColPanel, setShowColPanel] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);

  // Derived options
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);

  const tableRef = useRef(null);

  // Dynamic Theme Palette
  const t = useMemo(() => ({
    pageBg: isDark ? 'var(--color-bg-app, #0b1120)' : 'var(--color-bg-app, #f8fafc)',
    cardBg: isDark ? 'var(--color-bg-surface, #111c34)' : 'var(--color-bg-surface, #ffffff)',
    cardSubtle: isDark ? 'var(--color-bg-subtle, #182647)' : 'var(--color-bg-subtle, #f1f5f9)',
    border: isDark ? 'var(--border-subtle, #1e2f56)' : 'var(--border-subtle, #e2e8f0)',
    borderStrong: isDark ? 'var(--border-strong, #2c4172)' : 'var(--border-strong, #cbd5e1)',
    textPrimary: isDark ? 'var(--color-text-main, #f8fafc)' : 'var(--color-text-main, #0f172a)',
    textMuted: isDark ? 'var(--color-text-muted, #94a3b8)' : 'var(--color-text-muted, #64748b)',
    headerGroupBg: isDark ? '#0d1527' : '#f1f5f9',
    headerColBg: isDark ? '#141e33' : '#f8fafc',
    rowEven: isDark ? '#111c34' : '#ffffff',
    rowOdd: isDark ? '#0e172a' : '#f8fafc',
    rowHover: isDark ? '#1e2d4d' : '#f0f9ff',
    drawerBg: isDark ? '#111c34' : '#ffffff',
    drawerPairBg: isDark ? '#182647' : '#f8fafc',
    inputBg: isDark ? '#182647' : '#ffffff',
    inputBorder: isDark ? '#2c4172' : '#cbd5e1'
  }), [isDark]);

  // Fetch assets
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: 1, limit: 10000 });
      if (search) params.set('search', search);
      if (filterCategory) params.set('category', filterCategory);
      if (filterStatus) params.set('status', filterStatus);
      if (filterDepartment) params.set('department', filterDepartment);

      const res = await apiClient(`/assets?${params.toString()}`);
      const data = res.data?.items || res.data || [];
      setAssets(Array.isArray(data) ? data : []);
      setTotalCount(res.data?.total || data.length);
    } catch (err) {
      setError(err.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [search, filterCategory, filterStatus, filterDepartment]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Fetch master data for filter dropdowns
  useEffect(() => {
    apiClient('/master/departments').then(r => setDepartments(r.data?.map(d => d.name || d) || [])).catch(() => {});
    apiClient('/master/categories').then(r => setCategories(r.data?.map(c => c.name || c) || [])).catch(() => {});
  }, []);

  // Derived: filtered + sorted list
  const processedAssets = useMemo(() => {
    let list = [...assets];

    if (filterEmployeeType) {
      list = list.filter(a => (a.currentEmployeeType || 'AAI') === filterEmployeeType);
    }
    if (filterAmcOnly) {
      list = list.filter(a => Boolean(a.amcApplicable));
    }
    if (filterWarrantyExpiring) {
      list = list.filter(a => a.warrantyStatus === 'EXPIRING');
    }

    // Sort
    list.sort((a, b) => {
      let va = a[sortCol];
      let vb = b[sortCol];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      const cmp = String(va).localeCompare(String(vb), 'en', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [assets, filterEmployeeType, filterAmcOnly, filterWarrantyExpiring, sortCol, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(processedAssets.length / pageSize));
  const pagedAssets = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processedAssets.slice(start, start + pageSize);
  }, [processedAssets, page, pageSize]);

  // Summary stats
  const stats = useMemo(() => {
    const s = {
      total: processedAssets.length,
      assigned: processedAssets.filter(a => a.status === 'ASSIGNED').length,
      available: processedAssets.filter(a => a.status === 'AVAILABLE').length,
      godown: processedAssets.filter(a => a.status === 'GODOWN').length,
      amc: processedAssets.filter(a => a.amcApplicable).length
    };
    return s;
  }, [processedAssets]);

  // Visible columns
  const visibleGroups = useMemo(() =>
    COLUMN_GROUPS.map(g => ({
      ...g,
      columns: hiddenGroups.has(g.id) ? [] : g.columns
    })).filter(g => g.columns.length > 0 || g.id === 'asset')
  , [hiddenGroups]);

  const visibleColumns = useMemo(() => visibleGroups.flatMap(g => g.columns), [visibleGroups]);

  // Sort handler
  const handleSort = (colId) => {
    if (sortCol === colId) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(colId); setSortDir('asc'); }
    setPage(1);
  };

  // Export to Excel
  const handleExport = async () => {
    setExporting(true);
    try {
      const headers = visibleColumns.map(c => c.label);
      const rows = processedAssets.map(asset =>
        visibleColumns.map(col => {
          const raw = asset[col.id];
          if (raw instanceof Date) return raw.toISOString().split('T')[0];
          if (raw === null || raw === undefined) return '';
          return String(raw);
        })
      );

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = visibleColumns.map(c => ({ wch: Math.min(Math.max(c.label.length + 4, 10), 40) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'AAI_Inventory_Register');
      XLSX.writeFile(wb, `AAI_Inventory_Register_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      setExporting(false);
    }
  };

  const toggleGroup = (gId) => {
    setHiddenGroups(prev => {
      const next = new Set(prev);
      if (next.has(gId)) next.delete(gId); else next.add(gId);
      return next;
    });
  };

  const handlePageReset = () => setPage(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: t.pageBg, color: t.textPrimary, minHeight: 0 }}>

      {/* ── Page Header ── */}
      <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: t.textPrimary }}>
              Inventory Register
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: t.textMuted }}>
              Enterprise live asset register — {processedAssets.length} records
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => fetchAssets()}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: `1px solid ${t.border}`, background: t.cardBg, color: t.textPrimary, cursor: 'pointer', fontSize: '13px' }}
              id="inv-refresh-btn"
            >
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
            <button
              onClick={() => setShowColPanel(p => !p)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: `1px solid ${showColPanel ? '#6366F1' : t.border}`, background: showColPanel ? (isDark ? '#312E81' : '#EEF2FF') : t.cardBg, color: showColPanel ? (isDark ? '#A5B4FC' : '#4F46E5') : t.textPrimary, cursor: 'pointer', fontSize: '13px', fontWeight: showColPanel ? 600 : 400 }}
              id="inv-columns-btn"
            >
              <Settings size={14} /> Columns
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || processedAssets.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #059669, #10B981)', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600, boxShadow: '0 2px 4px rgba(5,150,105,0.2)' }}
              id="inv-export-btn"
            >
              <Download size={14} />
              {exporting ? 'Exporting…' : 'Export Excel'}
            </button>
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {[
            { label: 'Total Assets', value: stats.total, icon: Package, color: '#6366F1', bg: isDark ? '#1E1B4B' : '#EEF2FF', border: isDark ? '#6366F133' : '#C7D2FE' },
            { label: 'Assigned', value: stats.assigned, icon: Users, color: '#2563EB', bg: isDark ? '#1E3A5F' : '#EFF6FF', border: isDark ? '#2563EB33' : '#BFDBFE' },
            { label: 'Available', value: stats.available, icon: CheckCircle, color: '#059669', bg: isDark ? '#064E3B' : '#ECFDF5', border: isDark ? '#05966933' : '#A7F3D0' },
            { label: 'Godown', value: stats.godown, icon: Clock, color: '#D97706', bg: isDark ? '#451A03' : '#FEF3C7', border: isDark ? '#D9770633' : '#FDE68A' },
            { label: 'AMC Active', value: stats.amc, icon: Shield, color: '#7C3AED', bg: isDark ? '#2E1065' : '#F5F3FF', border: isDark ? '#7C3AED33' : '#DDD6FE' }
          ].map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', borderRadius: '10px', background: card.bg, border: `1px solid ${card.border}`, minWidth: '150px', flex: '1' }}>
                <div style={{ width: 36, height: 36, borderRadius: '8px', background: `${card.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color={card.color} />
                </div>
                <div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: card.color, lineHeight: 1 }}>{card.value.toLocaleString()}</div>
                  <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px' }}>{card.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Search + Filter Bar ── */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '200px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: t.textMuted }} />
            <input
              id="inv-search"
              type="text"
              placeholder="Search assets, serials, employees…"
              value={search}
              onChange={e => { setSearch(e.target.value); handlePageReset(); }}
              style={{ width: '100%', paddingLeft: '32px', padding: '8px 10px 8px 32px', borderRadius: '8px', border: `1px solid ${t.border}`, background: t.cardBg, color: t.textPrimary, fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          {/* Category filter */}
          <select
            id="inv-filter-category"
            value={filterCategory}
            onChange={e => { setFilterCategory(e.target.value); handlePageReset(); }}
            style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, background: t.cardBg, color: t.textPrimary, fontSize: '13px', minWidth: '140px' }}
          >
            <option value="">All Categories</option>
            {['IT Equipment','Networking','Power','Printing','Communication','Surveillance','Office Equipment','Furniture','Other'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            id="inv-filter-status"
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); handlePageReset(); }}
            style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, background: t.cardBg, color: t.textPrimary, fontSize: '13px', minWidth: '140px' }}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>

          {/* Employee Type filter */}
          <select
            id="inv-filter-emp-type"
            value={filterEmployeeType}
            onChange={e => { setFilterEmployeeType(e.target.value); handlePageReset(); }}
            style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, background: t.cardBg, color: t.textPrimary, fontSize: '13px', minWidth: '130px' }}
          >
            <option value="">All Emp Types</option>
            <option value="AAI">AAI Staff</option>
            <option value="Contract">Contract</option>
          </select>

          {/* Department filter */}
          <select
            id="inv-filter-dept"
            value={filterDepartment}
            onChange={e => { setFilterDepartment(e.target.value); handlePageReset(); }}
            style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, background: t.cardBg, color: t.textPrimary, fontSize: '13px', minWidth: '160px', maxWidth: '220px' }}
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          {/* AMC toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '7px 12px', borderRadius: '8px', border: `1px solid ${filterAmcOnly ? '#7C3AED' : t.border}`, background: filterAmcOnly ? (isDark ? '#2E1065' : '#EDE9FE') : t.cardBg, fontSize: '13px', color: filterAmcOnly ? (isDark ? '#A78BFA' : '#6D28D9') : t.textPrimary, userSelect: 'none' }}>
            <input type="checkbox" checked={filterAmcOnly} onChange={e => { setFilterAmcOnly(e.target.checked); handlePageReset(); }} style={{ display: 'none' }} />
            <Shield size={13} /> AMC Only
          </label>

          {/* Warranty Expiring toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '7px 12px', borderRadius: '8px', border: `1px solid ${filterWarrantyExpiring ? '#D97706' : t.border}`, background: filterWarrantyExpiring ? (isDark ? '#451A03' : '#FEF3C7') : t.cardBg, fontSize: '13px', color: filterWarrantyExpiring ? (isDark ? '#FCD34D' : '#B45309') : t.textPrimary, userSelect: 'none' }}>
            <input type="checkbox" checked={filterWarrantyExpiring} onChange={e => { setFilterWarrantyExpiring(e.target.checked); handlePageReset(); }} style={{ display: 'none' }} />
            <AlertCircle size={13} /> Expiring
          </label>

          {/* Clear filters */}
          {(search || filterCategory || filterStatus || filterEmployeeType || filterDepartment || filterAmcOnly || filterWarrantyExpiring) && (
            <button
              onClick={() => { setSearch(''); setFilterCategory(''); setFilterStatus(''); setFilterEmployeeType(''); setFilterDepartment(''); setFilterAmcOnly(false); setFilterWarrantyExpiring(false); handlePageReset(); }}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', border: '1px solid #DC2626', background: 'transparent', color: '#DC2626', cursor: 'pointer', fontSize: '13px' }}
              id="inv-clear-filters"
            >
              <X size={13} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Column Visibility Panel ── */}
      {showColPanel && (
        <div style={{ flexShrink: 0, padding: '0 24px 12px' }}>
          <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: t.textMuted, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Column Groups Visibility</div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {COLUMN_GROUPS.map(g => {
                const Icon = g.icon;
                const visible = !hiddenGroups.has(g.id);
                return (
                  <button
                    key={g.id}
                    onClick={() => toggleGroup(g.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px',
                      border: `1px solid ${visible ? '#6366F1' : t.border}`,
                      background: visible ? (isDark ? '#312E81' : '#EEF2FF') : 'transparent',
                      color: visible ? (isDark ? '#A5B4FC' : '#4F46E5') : t.textMuted,
                      cursor: 'pointer', fontSize: '12px', fontWeight: 600
                    }}
                  >
                    {visible ? <Eye size={12} /> : <EyeOff size={12} />}
                    <Icon size={12} />
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '0 24px' }} ref={tableRef}>
        {error ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#DC2626', flexDirection: 'column', gap: '8px' }}>
            <AlertCircle size={32} />
            <div>{error}</div>
            <button onClick={fetchAssets} style={{ padding: '7px 18px', borderRadius: '8px', border: '1px solid #DC2626', background: 'transparent', color: '#DC2626', cursor: 'pointer', fontSize: '13px' }}>Retry</button>
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: t.textMuted, flexDirection: 'column', gap: '12px' }}>
            <div style={{ width: 40, height: 40, border: `3px solid ${t.border}`, borderTopColor: '#6366F1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontSize: '14px' }}>Loading inventory…</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: '10px', border: `1px solid ${t.border}`, minWidth: '100%', background: t.cardBg }}>
            <table style={{ borderCollapse: 'collapse', width: 'max-content', minWidth: '100%' }}>
              {/* Column group headers */}
              <thead>
                <tr style={{ background: t.headerGroupBg }}>
                  {visibleGroups.map(g => {
                    const Icon = g.icon;
                    return (
                      <th
                        key={g.id}
                        colSpan={g.columns.length}
                        style={{ padding: '8px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: t.textMuted, borderBottom: `1px solid ${t.border}`, borderRight: `2px solid ${t.border}`, whiteSpace: 'nowrap' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Icon size={11} />
                          {g.label}
                        </span>
                      </th>
                    );
                  })}
                </tr>
                {/* Column headers */}
                <tr style={{ background: t.headerColBg }}>
                  {visibleColumns.map((col, ci) => {
                    const isSort = sortCol === col.id;
                    return (
                      <th
                        key={col.id}
                        onClick={() => handleSort(col.id)}
                        style={{
                          padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 600,
                          color: isSort ? '#4F46E5' : t.textMuted, cursor: 'pointer', whiteSpace: 'nowrap',
                          borderBottom: `1px solid ${t.border}`, position: col.frozen ? 'sticky' : 'relative',
                          left: col.frozen ? 0 : 'auto', zIndex: col.frozen ? 10 : 'auto',
                          background: t.headerColBg, minWidth: col.width, maxWidth: col.width,
                          userSelect: 'none',
                          borderRight: ci < visibleColumns.length - 1 ? `1px solid ${t.border}` : 'none'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {col.label}
                          {isSort ? (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : null}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {pagedAssets.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length} style={{ textAlign: 'center', padding: '60px 20px', color: t.textMuted, fontSize: '14px' }}>
                      No assets match your current filters.
                    </td>
                  </tr>
                ) : pagedAssets.map((asset, ri) => {
                  const isHover = hoveredRow === ri;
                  const rowBg = isHover ? t.rowHover : (ri % 2 === 0 ? t.rowEven : t.rowOdd);
                  return (
                    <tr
                      key={asset.assetId || ri}
                      onClick={() => setSelectedAsset(asset)}
                      onMouseEnter={() => setHoveredRow(ri)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{
                        background: rowBg,
                        cursor: 'pointer',
                        transition: 'background 0.1s'
                      }}
                    >
                      {visibleColumns.map((col, ci) => {
                        const cellBg = col.frozen ? rowBg : 'inherit';
                        return (
                          <td
                            key={col.id}
                            style={{
                              padding: '8px 12px', fontSize: '12px', whiteSpace: 'nowrap',
                              overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: col.width,
                              borderBottom: `1px solid ${t.border}`,
                              position: col.frozen ? 'sticky' : 'relative',
                              left: col.frozen ? 0 : 'auto', zIndex: col.frozen ? 5 : 'auto',
                              background: cellBg,
                              color: t.textPrimary,
                              borderRight: ci < visibleColumns.length - 1 ? `1px solid ${t.border}` : 'none'
                            }}
                          >
                            {col.render(asset)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && !error && (
        <div style={{ flexShrink: 0, padding: '12px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: t.cardBg, borderTop: `1px solid ${t.border}`, flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: t.textMuted, fontSize: '13px' }}>
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              style={{ padding: '4px 8px', borderRadius: '6px', border: `1px solid ${t.border}`, background: t.cardBg, color: t.textPrimary, fontSize: '13px' }}
            >
              {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span style={{ marginLeft: '8px' }}>
              Showing {Math.min((page - 1) * pageSize + 1, processedAssets.length)}–{Math.min(page * pageSize, processedAssets.length)} of {processedAssets.length}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {[
              { icon: ChevronsLeft,  onClick: () => setPage(1),           disabled: page === 1,         id: 'inv-page-first' },
              { icon: ChevronLeft,   onClick: () => setPage(p => p - 1),  disabled: page === 1,         id: 'inv-page-prev' },
              { icon: ChevronRight,  onClick: () => setPage(p => p + 1),  disabled: page >= totalPages,  id: 'inv-page-next' },
              { icon: ChevronsRight, onClick: () => setPage(totalPages),  disabled: page >= totalPages,  id: 'inv-page-last' }
            ].map(btn => {
              const Icon = btn.icon;
              return (
                <button key={btn.id} id={btn.id} onClick={btn.onClick} disabled={btn.disabled}
                  style={{ width: 30, height: 30, borderRadius: '6px', border: `1px solid ${t.border}`, background: btn.disabled ? 'transparent' : t.cardBg, color: btn.disabled ? t.borderStrong : t.textPrimary, cursor: btn.disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon size={13} />
                </button>
              );
            })}
            <span style={{ fontSize: '13px', color: t.textMuted, padding: '0 8px' }}>Page {page} of {totalPages}</span>
          </div>
        </div>
      )}

      {/* ── Asset Detail Drawer ── */}
      {selectedAsset && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedAsset(null); }}
        >
          <div style={{ width: '480px', maxWidth: '95vw', background: t.drawerBg, borderLeft: `1px solid ${t.border}`, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: isDark ? '-4px 0 20px rgba(0,0,0,0.5)' : '-4px 0 20px rgba(0,0,0,0.1)' }}>
            {/* Drawer header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: t.textPrimary }}>{selectedAsset.assetName}</div>
                <div style={{ fontSize: '12px', color: t.textMuted, fontFamily: 'monospace', marginTop: '2px' }}>{selectedAsset.assetId}</div>
              </div>
              <button onClick={() => setSelectedAsset(null)} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', padding: '4px' }} id="inv-drawer-close">
                <X size={20} />
              </button>
            </div>

            {/* Status badge */}
            {(() => {
              const cfg = STATUS_CONFIG[selectedAsset.status] || { color: '#6B7280', bg: '#F3F4F6', label: selectedAsset.status };
              return <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}44`, width: 'fit-content' }}>{cfg.label}</span>;
            })()}

            {/* Sections */}
            {COLUMN_GROUPS.map(g => {
              const Icon = g.icon;
              const pairs = g.columns.map(col => ({ label: col.label, value: col.render(selectedAsset) }));
              const hasData = pairs.some(p => {
                const v = String(p.value || '');
                return v !== '—' && v !== '' && v !== 'null' && v !== 'undefined';
              });
              if (!hasData) return null;
              return (
                <div key={g.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.textMuted, marginBottom: '8px' }}>
                    <Icon size={12} />{g.label}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {pairs.map(({ label, value }) => (
                      <div key={label} style={{ background: t.drawerPairBg, borderRadius: '6px', padding: '8px 10px', border: `1px solid ${t.border}` }}>
                        <div style={{ fontSize: '10px', color: t.textMuted, marginBottom: '2px' }}>{label}</div>
                        <div style={{ fontSize: '13px', color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spin animation */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
