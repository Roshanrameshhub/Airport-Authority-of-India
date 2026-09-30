import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient, downloadAuthenticatedPdf, verificationApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  Search, Eye, EyeOff, Download, RefreshCw, ChevronUp, ChevronDown,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, X, Layers,
  Cpu, MapPin, ShoppingCart, Shield, Activity, Users, AlertCircle,
  CheckCircle, Clock, Package, Settings, Plus, Edit3, Archive,
  CheckCircle2, QrCode, Printer, ClipboardCheck, ShieldAlert,
  History, Link as LinkIcon, Unlink, FileText
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import DynamicCreateAssetModal from '../components/DynamicCreateAssetModal';
import CategoryAssetDetails from '../components/CategoryAssetDetails';
import CategoryFieldEditor from '../components/CategoryFieldEditor';
import { getActiveCategoryConfigs, getCategoryConfigByKey } from '../config/assetCategoryFormConfigs';

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
      { id: 'technology',  label: 'Technology',    frozen: false, width: 130, render: (a) => a.technology || '—' },
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
      { id: 'ipAddress',        label: 'IP Address',   frozen: false, width: 130, render: (a) => a.networkConfig?.ipAddress || a.ipAddress || '—' },
      { id: 'macAddress',       label: 'MAC Address',  frozen: false, width: 150, render: (a) => <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{a.networkConfig?.macAddress || a.macAddress || '—'}</span> },
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

const BACKEND_SORT_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'assetId',
  'assetName',
  'category',
  'assetType',
  'make',
  'model',
  'department',
  'location',
  'status',
  'condition',
  'purchaseCost',
  'purchaseDate',
  'warrantyEndDate',
  'currentEmployeeName'
]);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EnterpriseInventory() {
  const { theme, isDark } = useTheme();
  const { user, token } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Data state
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const [searchParams] = useSearchParams();
  const initWarrantyExpiring = searchParams.get('warrantyStatus') === 'EXPIRING_SOON';
  const initCategory = searchParams.get('category') || '';
  const initStatus = searchParams.get('status') || '';
  const initSearch = searchParams.get('search') || '';
  const initDepartment = searchParams.get('department') || '';
  const initAmcOnly = searchParams.get('amcApplicable') === 'true';

  // Filters
  const [search, setSearch] = useState(initSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initSearch);
  const [filterCategory, setFilterCategory] = useState(initCategory);
  const [filterStatus, setFilterStatus] = useState(initStatus);
  const [filterEmployeeType, setFilterEmployeeType] = useState('');
  const [filterDepartment, setFilterDepartment] = useState(initDepartment);
  const [filterAmcOnly, setFilterAmcOnly] = useState(initAmcOnly);
  const [filterWarrantyExpiring, setFilterWarrantyExpiring] = useState(initWarrantyExpiring);

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

  // Toast notification state
  const [notification, setNotification] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const showToast = useCallback((type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  }, []);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('overview'); // 'overview' | 'specs' | 'components' | 'timeline'
  const [drawerHistory, setDrawerHistory] = useState([]);
  const [drawerComplaints, setDrawerComplaints] = useState([]);
  const [drawerComponents, setDrawerComponents] = useState([]);
  const [drawerParent, setDrawerParent] = useState(null);
  const [drawerTimeline, setDrawerTimeline] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [timelineCategoryFilter, setTimelineCategoryFilter] = useState('ALL');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalTab, setEditModalTab] = useState('general');
  const [editFormData, setEditFormData] = useState(null);
  const [editFormError, setEditFormError] = useState('');
  const [editFormSubmitting, setEditFormSubmitting] = useState(false);

  // Component Linking Modal State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkCandidateId, setLinkCandidateId] = useState('');
  const [linkRelType, setLinkRelType] = useState('ATTACHED_COMPONENT');
  const [linkNotes, setLinkNotes] = useState('');
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [linkModalError, setLinkModalError] = useState('');
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [linkSearchResults, setLinkSearchResults] = useState([]);
  const [linkSearching, setLinkSearching] = useState(false);

  // Physical Asset Tag Modal State
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [tagAsset, setTagAsset] = useState(null);
  const [tagQrData, setTagQrData] = useState(null);
  const [tagLoading, setTagLoading] = useState(false);

  // Physical Verification Campaign State
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [newCampaignForm, setNewCampaignForm] = useState({
    name: 'FY 2026-27 Regional Office Annual Verification',
    description: 'Statutory physical inventory audit across operational units',
    fiscalYear: '2026-27'
  });
  const [verifyForm, setVerifyForm] = useState({
    assetId: '',
    status: 'VERIFIED',
    observedLocation: '',
    observedCondition: 'GOOD',
    remarks: ''
  });

  // Derived options
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locationsList, setLocationsList] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);

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

  // Debounce search to prevent query spam and request races
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch assets server-side with pagination, filters, and safe sorting
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize)
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filterCategory) params.set('category', filterCategory);
      if (filterStatus) params.set('status', filterStatus);
      if (filterDepartment) params.set('department', filterDepartment);
      if (filterEmployeeType) params.set('employeeType', filterEmployeeType);
      if (filterAmcOnly) params.set('amcApplicable', 'true');
      if (filterWarrantyExpiring) params.set('warrantyStatus', 'EXPIRING_SOON');

      if (BACKEND_SORT_FIELDS.has(sortCol)) {
        params.set('sortBy', sortCol);
        params.set('sortOrder', sortDir);
      } else {
        params.set('sortBy', 'assetId');
        params.set('sortOrder', sortDir);
      }

      const res = await apiClient(`/assets?${params.toString()}`);
      const data = res.data || [];
      setAssets(Array.isArray(data) ? data : []);
      const total = res.pagination?.total != null ? res.pagination.total : (Array.isArray(data) ? data.length : 0);
      setTotalCount(total);
    } catch (err) {
      setError(err.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterCategory, filterStatus, filterDepartment, filterEmployeeType, filterAmcOnly, filterWarrantyExpiring, page, pageSize, sortCol, sortDir]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Fetch master data for filter dropdowns & global stats
  useEffect(() => {
    apiClient('/master/departments').then(r => setDepartments(r.data?.map(d => d.name || d) || [])).catch(() => {});
    apiClient('/master/categories').then(r => setCategories(r.data?.map(c => c.name || c) || [])).catch(() => {});
    apiClient('/master/locations').then(r => setLocationsList(r.data || [])).catch(() => {});
    apiClient('/master/vendors').then(r => setVendorsList(r.data || [])).catch(() => {});
    apiClient('/dashboard/stats').then(r => {
      if (r.data?.assets) {
        setDashboardStats(r.data.assets);
      }
    }).catch(() => {});
  }, []);

  // Server-paged asset view
  const pagedAssets = assets;

  // Pagination calculation and boundary guard
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  useEffect(() => {
    if (totalCount > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [totalCount, totalPages, page]);

  // Summary stats
  const stats = useMemo(() => {
    return {
      total: totalCount,
      assigned: dashboardStats?.assigned ?? 0,
      available: dashboardStats?.available ?? 0,
      godown: dashboardStats?.maintenance ?? 0,
      amc: dashboardStats?.activeWarranties ?? 0
    };
  }, [totalCount, dashboardStats]);

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
    if (sortCol === colId) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(colId);
      setSortDir('asc');
    }
    setPage(1);
  };

  // Export to Excel using backend export endpoint with active filters
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (filterCategory) params.append('category', filterCategory);
      if (filterStatus) params.append('status', filterStatus);
      if (filterDepartment) params.append('department', filterDepartment);
      if (filterEmployeeType) params.append('employeeType', filterEmployeeType);
      if (filterAmcOnly) params.append('amcApplicable', 'true');
      if (filterWarrantyExpiring) params.append('warrantyStatus', 'EXPIRING_SOON');

      const tokenVal = token || localStorage.getItem('aai_ams_token');
      const res = await fetch(`/api/v1/export/assets/excel?${params.toString()}`, {
        headers: tokenVal ? { Authorization: `Bearer ${tokenVal}` } : {}
      });
      if (!res.ok) throw new Error('Failed to export inventory');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AAI_Inventory_Register_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('success', 'Excel export completed successfully.');
    } catch (e) {
      console.error('Export failed', e);
      showToast('error', e.message || 'Export failed');
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

  // ─── Extended Drawer Actions & Data Fetch ─────────────────────────────────────

  const normalizeComponents = (data) => {
    const list = Array.isArray(data) ? data : (data?.components || []);
    return list.map(item => ({
      assetId: item.asset?.assetId || item.assetId || item.childAssetId,
      assetName: item.asset?.assetName || item.assetName || 'Hardware Component',
      category: item.asset?.category || item.category || 'Component',
      serialNumber: item.asset?.serialNumber || item.serialNumber || '—',
      status: item.asset?.status || item.status || 'ASSIGNED',
      relationshipType: item.relationshipType || 'ATTACHED'
    }));
  };

  const normalizeParent = (data) => {
    if (!data) return null;
    const p = data.asset || data.parent || data;
    if (!p || (!p.assetId && !p.name)) return null;
    return {
      assetId: p.assetId || data.parentAssetId,
      assetName: p.assetName || p.name || 'Host Workstation',
      category: p.category || 'Workstation'
    };
  };

  const handleOpenDrawer = async (asset) => {
    setSelectedAsset(asset);
    setIsDrawerOpen(true);
    setDrawerTab('overview');
    setDrawerLoading(true);
    setDrawerHistory([]);
    setDrawerComplaints([]);
    setDrawerComponents([]);
    setDrawerParent(null);
    setDrawerTimeline([]);

    const tokenVal = token || localStorage.getItem('aai_ams_token');
    const authHeaders = tokenVal ? { Authorization: `Bearer ${tokenVal}` } : {};

    // Safe per-request helper so optional failures do NOT prevent the drawer from opening
    const safeFetch = async (url) => {
      try {
        const res = await fetch(url, { headers: authHeaders });
        if (!res.ok) return null;
        return await res.json();
      } catch (err) {
        console.warn(`[Drawer fetch error] ${url}:`, err.message);
        return null;
      }
    };

    try {
      const [histData, compData, relCompData, relParData, timeData] = await Promise.all([
        safeFetch(`/api/v1/assignments/asset/${asset.assetId}`),
        safeFetch(`/api/v1/complaints/asset/${asset.assetId}`),
        safeFetch(`/api/v1/relationships/components/${asset.assetId}`),
        safeFetch(`/api/v1/relationships/parent/${asset.assetId}`),
        safeFetch(`/api/v1/assets/${asset.assetId}/timeline`)
      ]);

      if (histData?.success) setDrawerHistory(histData.data || []);
      if (compData?.success) setDrawerComplaints(compData.data || []);
      if (relCompData?.success) setDrawerComponents(normalizeComponents(relCompData.data));
      if (relParData?.success) setDrawerParent(normalizeParent(relParData.data));
      if (timeData?.success) setDrawerTimeline(timeData.data?.timeline || []);
    } catch (err) {
      console.error('Failed to load asset drawer extended data:', err);
    } finally {
      setDrawerLoading(false);
    }
  };

  // ─── Handover & Retirement Documents ──────────────────────────────────────────

  const handleDownloadHandoverSlip = async (assetId) => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      await downloadAuthenticatedPdf(
        `/api/v1/export/handover/asset/${assetId}/pdf`,
        `AAI_Handover_Certificate_${assetId}.pdf`
      );
      showToast('success', `Handover Certificate for '${assetId}' downloaded successfully.`);
    } catch (err) {
      showToast('error', err.message || 'Failed to download handover certificate.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadRetirementRecord = async (assetId) => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      await downloadAuthenticatedPdf(
        `/api/v1/export/retirement/${assetId}/pdf`,
        `AAI_Retirement_${assetId}.pdf`
      );
      showToast('success', `Retirement record for '${assetId}' downloaded successfully.`);
    } catch (err) {
      showToast('error', err.message || 'Failed to download asset retirement record.');
    } finally {
      setPdfLoading(false);
    }
  };

  // ─── Component Assembly Link / Unlink ─────────────────────────────────────────

  const handleOpenLinkModal = () => {
    setLinkCandidateId('');
    setLinkRelType('ATTACHED_COMPONENT');
    setLinkNotes('');
    setLinkModalError('');
    setLinkSearchQuery('');
    setLinkSearchResults([]);
    setIsLinkModalOpen(true);
  };

  const handleSearchChildAssets = async () => {
    if (!linkSearchQuery.trim()) return;
    setLinkSearching(true);
    try {
      const res = await apiClient(`/assets?search=${encodeURIComponent(linkSearchQuery.trim())}&limit=10`);
      const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setLinkSearchResults(items.filter(a => a.assetId !== selectedAsset?.assetId));
    } catch (err) {
      console.error('Failed to search child assets:', err);
    } finally {
      setLinkSearching(false);
    }
  };

  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    if (!linkCandidateId) {
      setLinkModalError('Please specify or select an equipment to attach.');
      return;
    }
    setLinkSubmitting(true);
    setLinkModalError('');

    try {
      const res = await apiClient('/relationships/link', {
        method: 'POST',
        body: JSON.stringify({
          parentAssetId: selectedAsset.assetId,
          childAssetId: linkCandidateId,
          relationshipType: linkRelType,
          notes: linkNotes || 'Attached via Enterprise Technical Assembly'
        })
      });

      if (!res.success) {
        throw new Error(res.message || 'Failed to attach component');
      }

      setIsLinkModalOpen(false);
      showToast('success', `Component '${linkCandidateId}' attached to '${selectedAsset.assetId}' successfully.`);

      // Refresh drawer components
      const relRes = await apiClient(`/relationships/components/${selectedAsset.assetId}`);
      if (relRes?.success) setDrawerComponents(normalizeComponents(relRes.data));
      fetchAssets();
    } catch (err) {
      setLinkModalError(err.message || 'Failed to attach component');
    } finally {
      setLinkSubmitting(false);
    }
  };

  const handleUnlinkComponent = async (childAssetId) => {
    if (!window.confirm(`Are you sure you want to unlink component ${childAssetId} from workstation ${selectedAsset.assetId}?`)) {
      return;
    }

    try {
      const res = await apiClient('/relationships/unlink', {
        method: 'POST',
        body: JSON.stringify({
          parentAssetId: selectedAsset.assetId,
          childAssetId,
          reason: 'Component detached via Enterprise Technical Drawer'
        })
      });

      if (!res.success) {
        throw new Error(res.message || 'Failed to unlink component');
      }

      showToast('success', `Component '${childAssetId}' detached successfully.`);

      // Refresh drawer components
      const relRes = await apiClient(`/relationships/components/${selectedAsset.assetId}`);
      if (relRes?.success) setDrawerComponents(normalizeComponents(relRes.data));
      fetchAssets();
    } catch (err) {
      showToast('error', err.message || 'Failed to unlink component');
    }
  };

  // ─── Decommission / Retire Asset ──────────────────────────────────────────────

  const handleRetireAsset = async (assetId) => {
    const reason = window.prompt(`Are you sure you want to decommission/retire asset ${assetId}? Enter reason:`, 'End of operational lifespan');
    if (reason === null) return;

    try {
      const tokenVal = token || localStorage.getItem('aai_ams_token');
      const res = await fetch(`/api/v1/assets/${assetId}/retire`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenVal ? { Authorization: `Bearer ${tokenVal}` } : {})
        },
        body: JSON.stringify({ reason: reason.trim() || 'End of operational lifespan' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to retire asset');
      }

      showToast('success', `Asset '${assetId}' decommissioned and retired.`);
      fetchAssets();
      if (selectedAsset?.assetId === assetId) {
        setSelectedAsset(prev => ({ ...prev, status: 'RETIRED' }));
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to retire asset');
    }
  };

  // ─── Edit Asset Specifications ────────────────────────────────────────────────

  const handleCategoryChange = (catKey) => {
    const cfg = getCategoryConfigByKey(catKey);
    setEditFormData(prev => ({
      ...prev,
      category: cfg?.name || catKey,
      assetType: cfg?.assetType || prev?.assetType || 'OTHER'
    }));
  };

  const handleOpenEditModal = (asset) => {
    setEditFormData({
      assetId: asset.assetId,
      assetName: asset.assetName || '',
      assetType: asset.assetType || 'OTHER',
      oldAssetId: asset.oldAssetId || '',
      category: asset.category,
      make: asset.make || '',
      model: asset.model || '',
      technology: asset.technology || '',
      serialNumber: asset.serialNumber || '',
      supplier: asset.supplier || asset.vendor || '',
      supplyOrderNumber: asset.supplyOrderNumber || '',
      purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : '',
      purchaseCost: asset.purchaseCost !== undefined && asset.purchaseCost !== null ? asset.purchaseCost : '',
      installDate: asset.installDate ? new Date(asset.installDate).toISOString().split('T')[0] : '',
      warrantyStartDate: asset.warrantyStartDate ? new Date(asset.warrantyStartDate).toISOString().split('T')[0] : '',
      warrantyEndDate: asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toISOString().split('T')[0] : '',
      amcApplicable: Boolean(asset.amcApplicable),
      amcContractId: asset.amcContractId || '',
      amcEndDate: asset.amcEndDate ? new Date(asset.amcEndDate).toISOString().split('T')[0] : '',
      currentEmployeeName: asset.currentEmployeeName || '',
      operatingSystem: asset.computerConfig?.operatingSystem || asset.operatingSystem || '',
      osVersion: asset.computerConfig?.osVersion || asset.osVersion || '',
      department: asset.department || '',
      location: asset.location || 'Chennai Airport',
      floor: asset.floor || '',
      room: asset.room || '',
      intercom: asset.intercom || '',
      ipAddress: asset.networkConfig?.ipAddress || asset.ipAddress || '',
      macAddress: asset.networkConfig?.macAddress || asset.macAddress || '',
      status: asset.status || 'AVAILABLE',
      condition: asset.condition || 'GOOD',
      remarks: asset.remarks || '',
      computerConfig: { ...(asset.computerConfig || {}) },
      displayConfig: { ...(asset.displayConfig || {}) },
      powerConfig: { ...(asset.powerConfig || {}) },
      networkConfig: { ...(asset.networkConfig || {}) },
      softwareConfig: { ...(asset.softwareConfig || {}) },
      specifications: { ...(asset.specifications || {}) },
      customFields: { ...(asset.customFields || {}) }
    });
    setEditModalTab('general');
    setEditFormError('');
    setIsEditModalOpen(true);
  };

  const handleEditFormSubmit = async (e) => {
    e.preventDefault();
    setEditFormError('');
    setEditFormSubmitting(true);

    try {
      const payload = {
        assetName: editFormData.assetName || '',
        category: editFormData.category,
        assetType: editFormData.assetType,
        oldAssetId: editFormData.oldAssetId || '',
        make: editFormData.make || '',
        model: editFormData.model || '',
        technology: editFormData.technology || '',
        serialNumber: editFormData.serialNumber ? String(editFormData.serialNumber).toUpperCase() : undefined,
        supplier: editFormData.supplier || '',
        vendor: editFormData.supplier || '',
        supplyOrderNumber: editFormData.supplyOrderNumber || '',
        purchaseDate: editFormData.purchaseDate ? editFormData.purchaseDate : null,
        purchaseCost: editFormData.purchaseCost !== '' && editFormData.purchaseCost !== null ? Number(editFormData.purchaseCost) : null,
        installDate: editFormData.installDate ? editFormData.installDate : null,
        warrantyStartDate: editFormData.warrantyStartDate ? editFormData.warrantyStartDate : null,
        warrantyEndDate: editFormData.warrantyEndDate ? editFormData.warrantyEndDate : null,
        amcApplicable: Boolean(editFormData.amcApplicable),
        amcContractId: editFormData.amcContractId || '',
        amcEndDate: editFormData.amcEndDate ? editFormData.amcEndDate : null,
        department: editFormData.department || '',
        location: editFormData.location || '',
        floor: editFormData.floor || '',
        room: editFormData.room || '',
        intercom: editFormData.intercom || '',
        condition: editFormData.condition || 'GOOD',
        remarks: editFormData.remarks || '',
        computerConfig: {
          ...(editFormData.computerConfig || {}),
          operatingSystem: editFormData.operatingSystem || editFormData.computerConfig?.operatingSystem || '',
          osVersion: editFormData.osVersion || editFormData.computerConfig?.osVersion || ''
        },
        networkConfig: {
          ...(editFormData.networkConfig || {}),
          ipAddress: editFormData.ipAddress || editFormData.networkConfig?.ipAddress || '',
          macAddress: editFormData.macAddress || editFormData.networkConfig?.macAddress || ''
        },
        displayConfig: editFormData.displayConfig || {},
        powerConfig: editFormData.powerConfig || {},
        softwareConfig: editFormData.softwareConfig || {},
        specifications: editFormData.specifications || {},
        customFields: editFormData.customFields || {}
      };

      const tokenVal = token || localStorage.getItem('aai_ams_token');
      const res = await fetch(`/api/v1/assets/${editFormData.assetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenVal ? { Authorization: `Bearer ${tokenVal}` } : {})
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update asset specifications');
      }

      setIsEditModalOpen(false);
      showToast('success', `Asset '${editFormData.assetId}' specifications updated successfully.`);
      fetchAssets();
      if (selectedAsset?.assetId === editFormData.assetId) {
        setSelectedAsset(prev => ({ ...prev, ...data.data }));
      }
    } catch (err) {
      setEditFormError(err.message || 'Failed to update specifications');
    } finally {
      setEditFormSubmitting(false);
    }
  };

  // ─── Physical Asset Tag & QR ─────────────────────────────────────────────────

  const handleOpenTagModal = async (asset) => {
    setTagAsset(asset);
    setIsTagModalOpen(true);
    setTagLoading(true);
    setTagQrData(null);
    try {
      const tokenVal = token || localStorage.getItem('aai_ams_token');
      const res = await fetch(`/api/v1/tags/asset/${asset.assetId}/qr`, {
        headers: tokenVal ? { Authorization: `Bearer ${tokenVal}` } : {}
      });
      const data = await res.json();
      if (data.success) {
        setTagQrData(data.data);
      }
    } catch (err) {
      console.error('Failed to load asset QR tag:', err);
    } finally {
      setTagLoading(false);
    }
  };

  const handlePrintTagPdf = async (assetId) => {
    try {
      await downloadAuthenticatedPdf(
        `/api/v1/tags/asset/${assetId}/pdf`,
        `AAI_Asset_Tag_${assetId}.pdf`
      );
      showToast('success', `Asset tag PDF for '${assetId}' downloaded.`);
    } catch (err) {
      showToast('error', err.message || 'Failed to download asset tag PDF.');
    }
  };

  // ─── Physical Verification Campaign Handlers ─────────────────────────────────

  const handleOpenVerificationModal = async (prefillAssetId = '') => {
    setIsVerificationModalOpen(true);
    setVerificationLoading(true);
    setVerificationSuccess('');
    setVerificationError('');
    if (prefillAssetId) {
      setVerifyForm(prev => ({ ...prev, assetId: prefillAssetId }));
    }
    try {
      const res = await verificationApi.getCampaigns();
      if (res.data?.success || res.success) {
        const list = res.data || [];
        setCampaigns(list);
        if (list.length > 0) {
          const active = list.find(c => c.status === 'ACTIVE') || list[0];
          setActiveCampaign(active);
        }
      }
    } catch (err) {
      console.error('Failed to load verification campaigns:', err);
      setVerificationError(err.message || 'Failed to load campaigns');
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    setVerificationLoading(true);
    setVerificationError('');
    try {
      const res = await verificationApi.createCampaign(newCampaignForm);
      if (res.data?.success || res.success) {
        const created = res.data || res;
        setActiveCampaign(created);
        setShowCreateCampaign(false);
        setVerificationSuccess(`Verification Campaign "${newCampaignForm.name}" initiated.`);
        const listRes = await verificationApi.getCampaigns();
        if (listRes.data?.success || listRes.success) setCampaigns(listRes.data || []);
      }
    } catch (err) {
      setVerificationError(err.message || 'Failed to create campaign');
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleRecordVerification = async (e) => {
    e.preventDefault();
    if (!activeCampaign) {
      setVerificationError('Please select or create an active verification campaign first.');
      return;
    }
    if (!verifyForm.assetId) {
      setVerificationError('Please specify an Asset ID.');
      return;
    }
    setVerificationLoading(true);
    setVerificationError('');
    try {
      const res = await verificationApi.recordVerification(activeCampaign._id, verifyForm);
      if (res.data?.success || res.success) {
        setActiveCampaign(res.data || res);
        setVerificationSuccess(`Asset ${verifyForm.assetId} successfully verified as ${verifyForm.status}.`);
        setVerifyForm({
          assetId: '',
          status: 'VERIFIED',
          observedLocation: '',
          observedCondition: 'GOOD',
          remarks: ''
        });
        fetchAssets();
      }
    } catch (err) {
      setVerificationError(err.message || 'Failed to record verification');
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleFinalizeCampaign = async () => {
    if (!activeCampaign) return;
    if (!window.confirm(`Finalize campaign "${activeCampaign.name}"? This closes discrepancy logs.`)) return;
    setVerificationLoading(true);
    try {
      const res = await verificationApi.finalizeCampaign(activeCampaign._id);
      if (res.data?.success || res.success) {
        setActiveCampaign(res.data || res);
        setVerificationSuccess('Verification campaign successfully finalized.');
        const listRes = await verificationApi.getCampaigns();
        if (listRes.data?.success || listRes.success) setCampaigns(listRes.data || []);
      }
    } catch (err) {
      setVerificationError(err.message || 'Failed to finalize campaign');
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleDownloadVerificationReport = async (campaignId) => {
    try {
      await downloadAuthenticatedPdf(
        `/api/v1/export/verification/${campaignId}/pdf`,
        `AAI_Verification_${campaignId}.pdf`
      );
      showToast('success', 'Verification report PDF downloaded.');
    } catch (err) {
      showToast('error', err.message || 'Failed to download physical verification report');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: t.pageBg, color: t.textPrimary, minHeight: 0 }}>

      {/* ── Toast Notification Banner ── */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '24px',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: notification.type === 'success' ? '#065F46' : notification.type === 'error' ? '#991B1B' : '#1E40AF',
          color: '#ffffff',
          padding: '12px 18px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          fontSize: '0.875rem',
          fontWeight: 500,
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '2px', marginLeft: '6px' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Page Header ── */}
      <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: t.textPrimary }}>
              Inventory Register
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: t.textMuted }}>
              Enterprise live asset register — {totalCount} records
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleOpenVerificationModal()}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: `1px solid ${t.border}`, background: t.cardBg, color: t.textPrimary, cursor: 'pointer', fontSize: '13px' }}
              id="btn-physical-verification"
              title="Annual Physical Verification Campaign"
            >
              <ClipboardCheck size={14} />
              <span>Physical Verification</span>
            </button>
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
              disabled={exporting || totalCount === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #059669, #10B981)', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600, boxShadow: '0 2px 4px rgba(5,150,105,0.2)' }}
              id="inv-export-btn"
            >
              <Download size={14} />
              {exporting ? 'Exporting…' : 'Export Excel'}
            </button>
            {isAdmin && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: 'none', background: 'var(--color-brand-600, #00205B)', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600, boxShadow: '0 2px 4px rgba(0,32,91,0.2)' }}
                id="register-asset-btn"
              >
                <Plus size={14} />
                <span>Create Asset</span>
              </button>
            )}
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
            {categories.map(c => (
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
                  {/* Sticky Right Action Group Header */}
                  <th
                    style={{
                      position: 'sticky',
                      right: 0,
                      zIndex: 15,
                      background: t.headerGroupBg,
                      padding: '8px 12px',
                      textAlign: 'center',
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: t.textMuted,
                      borderBottom: `1px solid ${t.border}`,
                      borderLeft: `2px solid ${t.border}`,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Actions
                  </th>
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
                  {/* Sticky Right Action Column Header */}
                  <th
                    style={{
                      position: 'sticky',
                      right: 0,
                      zIndex: 15,
                      background: t.headerColBg,
                      padding: '9px 12px',
                      textAlign: 'center',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: t.textMuted,
                      borderBottom: `1px solid ${t.border}`,
                      borderLeft: `2px solid ${t.border}`,
                      whiteSpace: 'nowrap',
                      minWidth: 150,
                      maxWidth: 150
                    }}
                  >
                    Operations
                  </th>
                </tr>
              </thead>

              <tbody>
                {pagedAssets.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} style={{ textAlign: 'center', padding: '60px 20px', color: t.textMuted, fontSize: '14px' }}>
                      No assets match your current filters.
                    </td>
                  </tr>
                ) : pagedAssets.map((asset, ri) => {
                  const isHover = hoveredRow === ri;
                  const rowBg = isHover ? t.rowHover : (ri % 2 === 0 ? t.rowEven : t.rowOdd);
                  return (
                    <tr
                      key={asset.assetId || ri}
                      onClick={() => handleOpenDrawer(asset)}
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
                      {/* Sticky Right Dedicated Action Column Cell */}
                      <td
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'sticky',
                          right: 0,
                          zIndex: 5,
                          background: rowBg,
                          padding: '6px 10px',
                          borderBottom: `1px solid ${t.border}`,
                          borderLeft: `2px solid ${t.border}`,
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                          minWidth: 150,
                          maxWidth: 150
                        }}
                      >
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleOpenDrawer(asset); }}
                            style={{ padding: '5px 7px', borderRadius: '6px', border: `1px solid ${t.border}`, background: t.cardBg, color: t.textPrimary, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                            title="View Technical Details Drawer"
                            id={`view-btn-${asset.assetId}`}
                          >
                            <Eye size={13} />
                          </button>
                          {isAdmin && asset.status !== 'RETIRED' && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleOpenEditModal(asset); }}
                              style={{ padding: '5px 7px', borderRadius: '6px', border: `1px solid ${t.border}`, background: t.cardBg, color: '#2563EB', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                              title="Edit Technical Specifications"
                              id={`edit-btn-${asset.assetId}`}
                            >
                              <Edit3 size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleOpenTagModal(asset); }}
                            style={{ padding: '5px 7px', borderRadius: '6px', border: `1px solid ${t.border}`, background: t.cardBg, color: '#00205B', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                            title="Print Physical Asset Tag & QR"
                            id={`tag-btn-${asset.assetId}`}
                          >
                            <QrCode size={13} />
                          </button>
                          {isAdmin && asset.status !== 'RETIRED' && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleRetireAsset(asset.assetId); }}
                              style={{ padding: '5px 7px', borderRadius: '6px', border: `1px solid ${t.border}`, background: t.cardBg, color: '#DC2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                              title="Decommission & Retire Asset"
                              id={`retire-btn-${asset.assetId}`}
                            >
                              <Archive size={13} />
                            </button>
                          )}
                        </div>
                      </td>
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
              {[25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span style={{ marginLeft: '8px' }}>
              Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount}
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

      {/* ── Extended 4-Tab Asset Detail Drawer ── */}
      {isDrawerOpen && selectedAsset && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}
          onClick={e => { if (e.target === e.currentTarget) setIsDrawerOpen(false); }}
        >
          <div style={{ width: '560px', maxWidth: '95vw', background: t.drawerBg, borderLeft: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', height: '100%', boxShadow: isDark ? '-4px 0 20px rgba(0,0,0,0.5)' : '-4px 0 20px rgba(0,0,0,0.1)' }}>
            
            {/* Drawer Header */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, color: '#2563EB', background: '#DBEAFE', marginBottom: '4px', fontFamily: 'monospace' }}>
                  {selectedAsset.assetId}
                </span>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: t.textPrimary, wordBreak: 'break-word' }}>
                  {selectedAsset.assetName}
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, marginLeft: '12px' }}>
                {isAdmin && selectedAsset.status !== 'RETIRED' && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(selectedAsset)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', border: `1px solid ${t.border}`, background: t.cardBg, color: t.textPrimary, cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                    id="edit-asset-drawer-btn"
                  >
                    <Edit3 size={13} />
                    <span>Edit</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', padding: '4px' }}
                  id="inv-drawer-close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Drawer Navigation Tabs */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${t.border}`, background: t.cardSubtle, padding: '0 16px', gap: '4px', overflowX: 'auto', flexShrink: 0 }}>
              {[
                { id: 'overview', label: 'Overview & Placement', icon: Layers },
                { id: 'specs', label: 'Technical Specs', icon: Cpu },
                { id: 'components', label: `Components (${drawerComponents.length})`, icon: LinkIcon },
                { id: 'timeline', label: `Timeline (${drawerTimeline.length || drawerHistory.length})`, icon: History }
              ].map(tab => {
                const IconComp = tab.icon;
                const isActive = drawerTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDrawerTab(tab.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 14px',
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#6366F1' : t.textMuted,
                      border: 'none',
                      borderBottom: isActive ? '2px solid #6366F1' : '2px solid transparent',
                      background: 'transparent',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <IconComp size={13} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Drawer Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* ══════════════ TAB 1: OVERVIEW & PLACEMENT ══════════════ */}
              {drawerTab === 'overview' && (
                <>
                  {/* Custodian Section */}
                  <div style={{ background: t.cardSubtle, borderRadius: '8px', border: `1px solid ${t.border}`, padding: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6366F1', marginBottom: '10px' }}>
                      Current Custodian / Holder
                    </div>

                    {selectedAsset.currentEmployeeName ? (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginBottom: '12px' }}>
                          <div>
                            <span style={{ display: 'block', fontSize: '11px', color: t.textMuted }}>Name</span>
                            <strong style={{ fontSize: '14px', color: t.textPrimary }}>{selectedAsset.currentEmployeeName}</strong>
                          </div>
                          <div>
                            <span style={{ display: 'block', fontSize: '11px', color: t.textMuted }}>Emp ID</span>
                            <code style={{ fontWeight: 700, color: '#2563EB', fontSize: '13px' }}>{selectedAsset.currentEmployeeId}</code>
                          </div>
                          <div>
                            <span style={{ display: 'block', fontSize: '11px', color: t.textMuted }}>Designation</span>
                            <strong style={{ fontSize: '12px', color: t.textPrimary }}>{selectedAsset.currentDesignation || '—'}</strong>
                          </div>
                          <div>
                            <span style={{ display: 'block', fontSize: '11px', color: t.textMuted }}>Assigned Date</span>
                            <strong style={{ fontSize: '12px', color: t.textPrimary }}>{fmt(selectedAsset.currentAssignmentDate)}</strong>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDownloadHandoverSlip(selectedAsset.assetId)}
                          disabled={pdfLoading}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 12px', borderRadius: '6px', border: `1px solid ${t.border}`, background: t.cardBg, color: t.textPrimary, cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                          id="download-slip-drawer-btn"
                        >
                          <FileText size={14} />
                          <span>{pdfLoading ? 'Generating PDF…' : 'Download Handover Certificate (PDF)'}</span>
                        </button>
                      </>
                    ) : selectedAsset.status === 'RETIRED' ? (
                      <>
                        <div style={{ fontSize: '13px', color: '#DC2626', fontWeight: 600, marginBottom: '10px' }}>
                          Asset Decommissioned & Retired from Institutional Inventory
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownloadRetirementRecord(selectedAsset.assetId)}
                          disabled={pdfLoading}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 12px', borderRadius: '6px', border: `1px solid ${t.border}`, background: t.cardBg, color: t.textPrimary, cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                          id="download-retirement-drawer-btn"
                        >
                          <FileText size={14} />
                          <span>Download Decommissioning Record (PDF)</span>
                        </button>
                      </>
                    ) : (
                      <div style={{ fontSize: '13px', color: t.textMuted, fontStyle: 'italic' }}>
                        This item is currently in the IT store pool — not assigned to any individual.
                      </div>
                    )}
                  </div>

                  {/* Hardware Summary Grid */}
                  <div>
                    <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.textMuted, margin: '0 0 8px 0' }}>
                      Hardware Identity & Status
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ background: t.drawerPairBg, padding: '8px 10px', borderRadius: '6px', border: `1px solid ${t.border}` }}>
                        <div style={{ fontSize: '10px', color: t.textMuted }}>Make & Model</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: t.textPrimary }}>{selectedAsset.make || '—'} {selectedAsset.model || ''}</div>
                      </div>
                      <div style={{ background: t.drawerPairBg, padding: '8px 10px', borderRadius: '6px', border: `1px solid ${t.border}` }}>
                        <div style={{ fontSize: '10px', color: t.textMuted }}>OEM Serial Number</div>
                        <code style={{ fontSize: '12px', fontWeight: 600, color: t.textPrimary }}>{selectedAsset.serialNumber || '—'}</code>
                      </div>
                      <div style={{ background: t.drawerPairBg, padding: '8px 10px', borderRadius: '6px', border: `1px solid ${t.border}` }}>
                        <div style={{ fontSize: '10px', color: t.textMuted }}>Category & Type</div>
                        <div style={{ fontSize: '12px', color: t.textPrimary }}>{selectedAsset.category} {selectedAsset.assetType ? `(${selectedAsset.assetType})` : ''}</div>
                      </div>
                      <div style={{ background: t.drawerPairBg, padding: '8px 10px', borderRadius: '6px', border: `1px solid ${t.border}` }}>
                        <div style={{ fontSize: '10px', color: t.textMuted }}>Condition & Status</div>
                        <div style={{ fontSize: '12px', color: t.textPrimary }}>{selectedAsset.condition || 'GOOD'} • {selectedAsset.status}</div>
                      </div>
                    </div>
                  </div>

                  {/* Placement Grid */}
                  <div>
                    <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.textMuted, margin: '0 0 8px 0' }}>
                      Deployment & Physical Location
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ background: t.drawerPairBg, padding: '8px 10px', borderRadius: '6px', border: `1px solid ${t.border}` }}>
                        <div style={{ fontSize: '10px', color: t.textMuted }}>Airport Location</div>
                        <div style={{ fontSize: '12px', color: t.textPrimary }}>{selectedAsset.location || 'Chennai Airport'}</div>
                      </div>
                      <div style={{ background: t.drawerPairBg, padding: '8px 10px', borderRadius: '6px', border: `1px solid ${t.border}` }}>
                        <div style={{ fontSize: '10px', color: t.textMuted }}>Department</div>
                        <div style={{ fontSize: '12px', color: t.textPrimary }}>{selectedAsset.department || '—'}</div>
                      </div>
                      <div style={{ background: t.drawerPairBg, padding: '8px 10px', borderRadius: '6px', border: `1px solid ${t.border}` }}>
                        <div style={{ fontSize: '10px', color: t.textMuted }}>Floor & Room</div>
                        <div style={{ fontSize: '12px', color: t.textPrimary }}>{selectedAsset.floor || '—'}{selectedAsset.room ? ` • Room ${selectedAsset.room}` : ''}</div>
                      </div>
                      <div style={{ background: t.drawerPairBg, padding: '8px 10px', borderRadius: '6px', border: `1px solid ${t.border}` }}>
                        <div style={{ fontSize: '10px', color: t.textMuted }}>Intercom / Ext.</div>
                        <div style={{ fontSize: '12px', color: t.textPrimary }}>{selectedAsset.intercom || '—'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Procurement & Lifecycle Grid */}
                  <div>
                    <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.textMuted, margin: '0 0 8px 0' }}>
                      Procurement, Warranty & AMC
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ background: t.drawerPairBg, padding: '8px 10px', borderRadius: '6px', border: `1px solid ${t.border}` }}>
                        <div style={{ fontSize: '10px', color: t.textMuted }}>Supplier / Vendor</div>
                        <div style={{ fontSize: '12px', color: t.textPrimary }}>{selectedAsset.supplier || selectedAsset.vendor || '—'}</div>
                      </div>
                      <div style={{ background: t.drawerPairBg, padding: '8px 10px', borderRadius: '6px', border: `1px solid ${t.border}` }}>
                        <div style={{ fontSize: '10px', color: t.textMuted }}>PO / Order No.</div>
                        <div style={{ fontSize: '12px', color: t.textPrimary }}>{selectedAsset.supplyOrderNumber || '—'}</div>
                      </div>
                      <div style={{ background: t.drawerPairBg, padding: '8px 10px', borderRadius: '6px', border: `1px solid ${t.border}` }}>
                        <div style={{ fontSize: '10px', color: t.textMuted }}>Purchase Date / Cost</div>
                        <div style={{ fontSize: '12px', color: t.textPrimary }}>{fmt(selectedAsset.purchaseDate)}{selectedAsset.purchaseCost != null ? ` • ₹${Number(selectedAsset.purchaseCost).toLocaleString('en-IN')}` : ''}</div>
                      </div>
                      <div style={{ background: t.drawerPairBg, padding: '8px 10px', borderRadius: '6px', border: `1px solid ${t.border}` }}>
                        <div style={{ fontSize: '10px', color: t.textMuted }}>Warranty Status / AMC</div>
                        <div style={{ fontSize: '12px', color: t.textPrimary }}>{selectedAsset.warrantyStatus || 'NONE'}{selectedAsset.amcApplicable ? ' • AMC Covered' : ''}</div>
                      </div>
                    </div>
                  </div>

                  {/* Remarks */}
                  {selectedAsset.remarks && (
                    <div style={{ background: t.cardSubtle, padding: '12px', borderRadius: '6px', border: `1px solid ${t.border}` }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: t.textMuted, marginBottom: '4px' }}>Remarks</div>
                      <div style={{ fontSize: '12px', color: t.textPrimary, whiteSpace: 'pre-wrap' }}>{selectedAsset.remarks}</div>
                    </div>
                  )}

                  {/* Drawer Quick Actions */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '8px', borderTop: `1px solid ${t.border}` }}>
                    <button
                      type="button"
                      onClick={() => handleOpenVerificationModal(selectedAsset.assetId)}
                      style={{ flex: '1 1 140px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 12px', borderRadius: '6px', border: `1px solid ${t.border}`, background: t.cardBg, color: t.textPrimary, cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                    >
                      <ClipboardCheck size={14} />
                      <span>Audit Verification</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenTagModal(selectedAsset)}
                      style={{ flex: '1 1 140px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 12px', borderRadius: '6px', border: `1px solid ${t.border}`, background: t.cardBg, color: '#00205B', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                    >
                      <QrCode size={14} />
                      <span>Print QR Tag</span>
                    </button>
                    {isAdmin && selectedAsset.status !== 'RETIRED' && (
                      <button
                        type="button"
                        onClick={() => handleRetireAsset(selectedAsset.assetId)}
                        style={{ flex: '1 1 140px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #DC2626', background: 'transparent', color: '#DC2626', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                      >
                        <Archive size={14} />
                        <span>Retire Asset</span>
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* ══════════════ TAB 2: TECHNICAL SPECS ══════════════ */}
              {drawerTab === 'specs' && (
                <CategoryAssetDetails asset={selectedAsset} />
              )}

              {/* ══════════════ TAB 3: COMPONENTS & ASSEMBLY ══════════════ */}
              {drawerTab === 'components' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Host Workstation Card */}
                  {drawerParent && (
                    <div style={{ background: isDark ? '#1E3A5F' : '#EFF6FF', borderRadius: '8px', border: `1px solid ${isDark ? '#2563EB55' : '#BFDBFE'}`, padding: '14px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <LinkIcon size={13} />
                        <span>Installed Auxiliary Component of Workstation</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <strong style={{ fontSize: '14px', color: t.textPrimary }}>{drawerParent.assetName}</strong>
                          <div style={{ fontSize: '11px', color: t.textMuted, fontFamily: 'monospace' }}>{drawerParent.assetId} • {drawerParent.category}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const parentObj = assets.find(a => a.assetId === drawerParent.assetId);
                            if (parentObj) handleOpenDrawer(parentObj);
                            else apiClient(`/assets/${drawerParent.assetId}`).then(r => r.data && handleOpenDrawer(r.data)).catch(() => {});
                          }}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: `1px solid ${t.border}`, background: t.cardBg, color: t.textPrimary, cursor: 'pointer', fontSize: '12px' }}
                        >
                          View Host
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Attached Components List */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '13px', margin: 0, fontWeight: 700, color: t.textPrimary }}>
                        Connected Hardware Components ({drawerComponents.length})
                      </h3>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={handleOpenLinkModal}
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '6px', border: 'none', background: 'var(--color-brand-600, #00205B)', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                          id="attach-component-drawer-btn"
                        >
                          <Plus size={13} />
                          <span>Attach Component</span>
                        </button>
                      )}
                    </div>

                    {drawerComponents.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', background: t.cardSubtle, borderRadius: '8px', color: t.textMuted, fontSize: '13px' }}>
                        No peripheral components (Monitor, UPS, Printer) currently linked to this equipment.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {drawerComponents.map(comp => (
                          <div
                            key={comp.assetId}
                            style={{
                              padding: '12px 14px',
                              background: t.cardSubtle,
                              borderRadius: '8px',
                              border: `1px solid ${t.border}`,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '10px'
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px', color: '#2563EB' }}>
                                  {comp.assetId}
                                </span>
                                <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: t.border, color: t.textMuted }}>
                                  {comp.relationshipType || 'ATTACHED'}
                                </span>
                                <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: comp.status === 'ASSIGNED' ? '#DBEAFE' : '#D1FAE5', color: comp.status === 'ASSIGNED' ? '#1D4ED8' : '#059669', fontWeight: 600 }}>
                                  {comp.status}
                                </span>
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: t.textPrimary }}>
                                {comp.assetName}
                              </div>
                              <div style={{ fontSize: '11px', color: t.textMuted }}>
                                {comp.category} • SN: <code>{comp.serialNumber}</code>
                              </div>
                            </div>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleUnlinkComponent(comp.assetId)}
                                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '6px', border: '1px solid #DC2626', background: 'transparent', color: '#DC2626', cursor: 'pointer', fontSize: '11px' }}
                                title="Unlink this component"
                              >
                                <Unlink size={12} />
                                <span>Unlink</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ══════════════ TAB 4: AUDIT TIMELINE ══════════════ */}
              {drawerTab === 'timeline' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Category Filter Pills */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', borderBottom: `1px solid ${t.border}`, paddingBottom: '10px' }}>
                    {['ALL', 'LIFECYCLE', 'CUSTODY', 'MAINTENANCE', 'ASSEMBLY'].map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setTimelineCategoryFilter(cat)}
                        style={{
                          border: 'none',
                          background: timelineCategoryFilter === cat ? '#6366F1' : t.cardSubtle,
                          color: timelineCategoryFilter === cat ? '#ffffff' : t.textMuted,
                          fontWeight: timelineCategoryFilter === cat ? 700 : 500,
                          fontSize: '11px',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          cursor: 'pointer'
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {drawerLoading ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: t.textMuted, fontSize: '13px' }}>Loading timeline records...</div>
                  ) : (
                    <div className="custody-timeline-container" style={{ marginLeft: '4px' }}>
                      {(drawerTimeline.length > 0 ? drawerTimeline : drawerHistory.map(h => ({
                        id: h.assignmentId,
                        category: 'CUSTODY',
                        action: 'ASSIGNMENT',
                        description: `Custody assigned to ${h.employeeName} (${h.employeeId})`,
                        timestamp: h.assignedDate,
                        actor: 'System Admin'
                      })))
                        .filter(item => timelineCategoryFilter === 'ALL' || item.category === timelineCategoryFilter)
                        .map((evt, idx) => {
                          const isCustody = evt.category === 'CUSTODY';
                          const isMaint = evt.category === 'MAINTENANCE';
                          const isAssembly = evt.category === 'ASSEMBLY';
                          const dotColor = isCustody ? '#10B981' : (isMaint ? '#EF4444' : (isAssembly ? '#8B5CF6' : '#3B82F6'));

                          return (
                            <div key={evt.id || idx} className="custody-timeline-item">
                              <div className="custody-timeline-dot" style={{ background: dotColor, flexShrink: 0 }} />
                              <div className="custody-timeline-card" style={{ padding: '10px 12px', minWidth: 0, flex: 1, background: t.cardBg, border: `1px solid ${t.border}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', fontSize: '12px', fontWeight: 600, flexWrap: 'wrap' }}>
                                  <span style={{ wordBreak: 'break-word', color: t.textPrimary }}>
                                    {evt.action || evt.category}
                                  </span>
                                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: t.border, color: t.textMuted }}>
                                    {evt.category}
                                  </span>
                                </div>
                                <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '3px', wordBreak: 'break-word' }}>
                                  {evt.description}
                                </div>
                                <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                  <span>{new Date(evt.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                  {evt.actor && <span>By: {evt.actor}</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── Dynamic Category-Specific Create Asset Modal (Phase 2C) ── */}
      <DynamicCreateAssetModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newAsset) => {
          showToast('success', `Asset '${newAsset?.assetId || 'Equipment'}' registered successfully!`);
          fetchAssets();
        }}
        token={token}
      />

      {/* ── Component Linking Modal ── */}
      <Modal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        title={`Attach Auxiliary Component to ${selectedAsset?.assetId}`}
        subtitle="Link auxiliary equipment (Monitor, UPS, Dedicated Printer) to this parent workstation"
        size="md"
        id="link-component-modal"
        footer={
          <>
            <button type="button" onClick={() => setIsLinkModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="button" onClick={handleLinkSubmit} disabled={linkSubmitting || !linkCandidateId} className="btn btn-primary" id="submit-link-btn">
              {linkSubmitting ? 'Attaching...' : 'Attach Component'}
            </button>
          </>
        }
      >
        {linkModalError && (
          <div style={{ padding: '10px 14px', background: 'var(--status-danger-bg, #FEE2E2)', border: '1px solid var(--status-danger-border, #FCA5A5)', borderRadius: '6px', color: '#991B1B', fontSize: '13px', marginBottom: '12px' }}>
            {linkModalError}
          </div>
        )}
        <form onSubmit={handleLinkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">Search Child Equipment / Component *</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Type Asset ID, serial, or model..."
                value={linkSearchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setLinkSearchQuery(val);
                  setLinkCandidateId(val.trim().toUpperCase());
                }}
                id="link-search-input"
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={linkSearching || !linkSearchQuery.trim()}
                onClick={handleSearchChildAssets}
              >
                {linkSearching ? 'Searching...' : 'Search'}
              </button>
            </div>

            {linkSearchResults.length > 0 && (
              <div style={{ marginTop: '8px', border: `1px solid ${t.border}`, borderRadius: '6px', maxHeight: '150px', overflowY: 'auto', background: t.cardBg }}>
                {linkSearchResults.map(a => (
                  <div
                    key={a.assetId}
                    onClick={() => {
                      setLinkCandidateId(a.assetId);
                      setLinkSearchQuery(a.assetId);
                      setLinkSearchResults([]);
                    }}
                    style={{
                      padding: '8px 12px',
                      borderBottom: `1px solid ${t.border}`,
                      cursor: 'pointer',
                      fontSize: '12px',
                      background: linkCandidateId === a.assetId ? (isDark ? '#312E81' : '#EEF2FF') : 'transparent'
                    }}
                  >
                    <strong style={{ fontFamily: 'monospace', color: '#2563EB' }}>{a.assetId}</strong> — {a.assetName} ({a.category} • SN: {a.serialNumber})
                    <span style={{ marginLeft: '8px', fontSize: '10px', padding: '1px 5px', borderRadius: '4px', background: t.border, color: t.textMuted }}>{a.status}</span>
                  </div>
                ))}
              </div>
            )}

            {linkCandidateId && (
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={13} />
                <span>Selected Child Asset ID: <strong>{linkCandidateId}</strong></span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Assembly Relationship Type</label>
            <select
              className="form-select"
              value={linkRelType}
              onChange={(e) => setLinkRelType(e.target.value)}
              id="link-rel-type-select"
            >
              <option value="ATTACHED_COMPONENT">Attached Component (Standard PC Component)</option>
              <option value="PERIPHERAL_LINK">Peripheral Link (Printer / Scanner / Console)</option>
              <option value="POWER_BACKUP">Power Backup Link (Dedicated UPS)</option>
              <option value="NETWORK_UPLINK">Network Uplink</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Assembly Remarks / Connection Notes</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Primary display connected via DisplayPort to GPU"
              value={linkNotes}
              onChange={(e) => setLinkNotes(e.target.value)}
              id="link-notes-input"
            />
          </div>
        </form>
      </Modal>

      {/* ── Edit Asset Specifications Modal ── */}
      {isEditModalOpen && editFormData && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Equipment Specifications"
          subtitle={`Asset Tag: ${editFormData.assetId} • Full Lifecycle & Hardware Configuration`}
          size="xl"
          id="edit-asset-modal"
          footer={
            <>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditFormSubmit}
                disabled={editFormSubmitting}
                className="btn btn-primary"
                id="submit-edit-asset-btn"
              >
                {editFormSubmitting ? 'Updating...' : 'Save Specifications'}
              </button>
            </>
          }
        >
          {editFormError && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--status-danger-bg, #FEE2E2)',
              border: '1px solid var(--status-danger-border, #FCA5A5)',
              borderRadius: '6px',
              color: '#991B1B',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <AlertCircle size={16} />
              <span>{editFormError}</span>
            </div>
          )}

          {/* Edit Modal Navigation Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${t.border}`, marginBottom: '16px', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
            {[
              { id: 'general', label: '1. Basic & Identity', icon: Layers },
              { id: 'location', label: '2. Location & Placement', icon: MapPin },
              { id: 'procurement', label: '3. Procurement & AMC', icon: Shield },
              { id: 'technical', label: '4. Hardware & Network', icon: Cpu }
            ].map((tab) => {
              const IconComp = tab.icon;
              const isActive = editModalTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEditModalTab(tab.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#6366F1' : t.textMuted,
                    border: 'none',
                    borderBottom: isActive ? '2px solid #6366F1' : '2px solid transparent',
                    background: isActive ? (isDark ? '#312E81' : '#EEF2FF') : 'transparent',
                    borderRadius: '4px 4px 0 0',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <IconComp size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleEditFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* ════════ TAB 1: BASIC & IDENTITY ════════ */}
            {editModalTab === 'general' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Asset ID (Tag)</label>
                    <input
                      type="text"
                      disabled
                      className="form-input"
                      value={editFormData.assetId}
                      style={{ backgroundColor: t.cardSubtle, cursor: 'not-allowed', fontWeight: 700 }}
                      title="System Asset ID is immutable"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Asset Name *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={editFormData.assetName}
                      onChange={(e) => setEditFormData({ ...editFormData, assetName: e.target.value })}
                      id="edit-asset-name-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select
                      required
                      className="form-select"
                      value={getActiveCategoryConfigs().find(c => c.name === editFormData.category || c.key === editFormData.category)?.key || ''}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      id="edit-asset-category-input"
                    >
                      <option value="">Select Category</option>
                      {getActiveCategoryConfigs().map((cfg) => (
                        <option key={cfg.key} value={cfg.key}>{cfg.displayName || cfg.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Asset Type *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={editFormData.assetType || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, assetType: e.target.value })}
                      id="edit-asset-type-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Old / Legacy Tag</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. AAI-CHN-2018-042"
                      value={editFormData.oldAssetId}
                      onChange={(e) => setEditFormData({ ...editFormData, oldAssetId: e.target.value })}
                      id="edit-asset-old-tag-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Make / Company *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={editFormData.make}
                      onChange={(e) => setEditFormData({ ...editFormData, make: e.target.value })}
                      id="edit-asset-make-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Model *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={editFormData.model}
                      onChange={(e) => setEditFormData({ ...editFormData, model: e.target.value })}
                      id="edit-asset-model-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Technology</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Laser, LED, IPS"
                      value={editFormData.technology || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, technology: e.target.value })}
                      id="edit-asset-technology-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Serial Number *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={editFormData.serialNumber}
                      onChange={(e) => setEditFormData({ ...editFormData, serialNumber: e.target.value })}
                      id="edit-asset-serial-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Operational Status (Read-Only via Edit)</label>
                    <input
                      type="text"
                      disabled
                      className="form-input"
                      value={editFormData.status}
                      style={{ backgroundColor: t.cardSubtle, cursor: 'not-allowed' }}
                      title="Status transitions occur through dedicated lifecycle actions"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Physical Condition</label>
                    <select
                      className="form-select"
                      value={editFormData.condition}
                      onChange={(e) => setEditFormData({ ...editFormData, condition: e.target.value })}
                      id="edit-asset-condition-select"
                    >
                      <option value="EXCELLENT">EXCELLENT</option>
                      <option value="GOOD">GOOD</option>
                      <option value="FAIR">FAIR</option>
                      <option value="POOR">POOR</option>
                      <option value="FAULTY">FAULTY</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Remarks & Maintenance Log</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editFormData.remarks}
                    onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })}
                    id="edit-asset-remarks-input"
                  />
                </div>
              </>
            )}

            {/* ════════ TAB 2: LOCATION & PLACEMENT ════════ */}
            {editModalTab === 'location' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Airport / Facility Location *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={editFormData.location}
                      onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                      id="edit-asset-location-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Department *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={editFormData.department}
                      onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                      id="edit-asset-dept-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Floor / Level *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={editFormData.floor}
                      onChange={(e) => setEditFormData({ ...editFormData, floor: e.target.value })}
                      id="edit-asset-floor-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Room / Office / Bay</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Room 204, ATC Bay 3"
                      value={editFormData.room}
                      onChange={(e) => setEditFormData({ ...editFormData, room: e.target.value })}
                      id="edit-asset-room-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Intercom / Extension</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Ext 2412"
                      value={editFormData.intercom}
                      onChange={(e) => setEditFormData({ ...editFormData, intercom: e.target.value })}
                      id="edit-asset-intercom-input"
                    />
                  </div>
                </div>
              </>
            )}

            {/* ════════ TAB 3: PROCUREMENT & AMC ════════ */}
            {editModalTab === 'procurement' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Supplier / Vendor</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Select or enter vendor"
                      value={editFormData.supplier}
                      onChange={(e) => setEditFormData({ ...editFormData, supplier: e.target.value })}
                      id="edit-asset-supplier-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Supply Order / PO Number</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. AAI/IT/PO/2024/091"
                      value={editFormData.supplyOrderNumber}
                      onChange={(e) => setEditFormData({ ...editFormData, supplyOrderNumber: e.target.value })}
                      id="edit-asset-po-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Purchase Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={editFormData.purchaseDate}
                      onChange={(e) => setEditFormData({ ...editFormData, purchaseDate: e.target.value })}
                      id="edit-asset-purchase-date-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Purchase Cost (INR)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-input"
                      value={editFormData.purchaseCost}
                      onChange={(e) => setEditFormData({ ...editFormData, purchaseCost: e.target.value })}
                      id="edit-asset-cost-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Install Date *</label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={editFormData.installDate}
                      onChange={(e) => setEditFormData({ ...editFormData, installDate: e.target.value })}
                      id="edit-asset-install-date-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Warranty Start Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={editFormData.warrantyStartDate}
                      onChange={(e) => setEditFormData({ ...editFormData, warrantyStartDate: e.target.value })}
                      id="edit-asset-warranty-start-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Warranty End Date *</label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={editFormData.warrantyEndDate}
                      onChange={(e) => setEditFormData({ ...editFormData, warrantyEndDate: e.target.value })}
                      id="edit-asset-warranty-date-input"
                    />
                  </div>
                </div>

                <div style={{ background: t.cardSubtle, border: `1px solid ${t.border}`, borderRadius: '6px', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <input
                      type="checkbox"
                      id="edit-amc-check"
                      checked={editFormData.amcApplicable}
                      onChange={(e) => setEditFormData({ ...editFormData, amcApplicable: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#6366F1' }}
                    />
                    <label htmlFor="edit-amc-check" style={{ fontSize: '13px', fontWeight: 600, color: t.textPrimary, cursor: 'pointer' }}>
                      Covered under Comprehensive Annual Maintenance Contract (AMC)
                    </label>
                  </div>
                  {editFormData.amcApplicable && (
                    <div className="form-group" style={{ marginTop: '8px' }}>
                      <label className="form-label">AMC Contract Reference / SLA ID</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. AMC-CHN-IT-2026-004"
                        value={editFormData.amcContractId}
                        onChange={(e) => setEditFormData({ ...editFormData, amcContractId: e.target.value })}
                        id="edit-asset-amc-ref-input"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ════════ TAB 4: HARDWARE & NETWORK ════════ */}
            {editModalTab === 'technical' && (
              <CategoryFieldEditor
                editFormData={editFormData}
                setEditFormData={setEditFormData}
              />
            )}
          </form>
        </Modal>
      )}

      {/* ── Physical Asset Tag Printing Modal ── */}
      {isTagModalOpen && tagAsset && (
        <Modal
          isOpen={isTagModalOpen}
          onClose={() => setIsTagModalOpen(false)}
          title="Physical Equipment Identification Tag"
          subtitle="Civil Aviation Regulatory Standard • Barcode / QR Interlock"
          size="md"
          id="asset-tag-modal"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span style={{ fontSize: '12px', color: t.textMuted }}>
                Thermal / Laser 4" x 2" Label
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsTagModalOpen(false)}
                  className="btn btn-secondary"
                  id="tag-modal-close-btn"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintTagPdf(tagAsset.assetId)}
                  className="btn btn-primary"
                  id="print-tag-pdf-btn"
                >
                  <Printer size={15} />
                  <span>Print Sticker Tag (PDF)</span>
                </button>
              </div>
            </div>
          }
        >
          <div style={{
            border: '2px solid #00205B',
            borderRadius: '6px',
            overflow: 'hidden',
            background: '#ffffff',
            margin: '0 auto',
            maxWidth: '420px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Header Banner */}
            <div style={{ background: '#00205B', color: '#ffffff', textAlign: 'center', padding: '6px 8px' }}>
              <div style={{ fontWeight: 800, fontSize: '13px', letterSpacing: '0.5px' }}>
                AIRPORTS AUTHORITY OF INDIA
              </div>
              <div style={{ fontSize: '10px', opacity: 0.9 }}>
                REGIONAL OFFICE • IT ASSET IDENTIFICATION TAG
              </div>
            </div>

            {/* Tag Body */}
            <div style={{ padding: '12px', display: 'flex', gap: '12px', alignItems: 'center', color: '#0f172a' }}>
              <div style={{ flex: 1, fontSize: '12px' }}>
                <div style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontWeight: 800,
                  fontSize: '14px',
                  color: '#00205B',
                  fontFamily: 'monospace',
                  marginBottom: '6px'
                }}>
                  {tagAsset.assetId}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '4px', marginBottom: '3px' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Category:</span>
                  <span style={{ fontWeight: 600 }}>{tagAsset.category}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '4px', marginBottom: '3px' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Model:</span>
                  <span>{tagAsset.make} {tagAsset.model}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '4px', marginBottom: '3px' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Serial No:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{tagAsset.serialNumber}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '4px', marginBottom: '3px' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Location:</span>
                  <span>{tagAsset.department} ({tagAsset.floor || 'N/A'})</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '4px' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Warranty:</span>
                  <span style={{ color: '#047857', fontWeight: 600 }}>{tagAsset.warrantyStatus}</span>
                </div>
              </div>

              {/* QR Code Column */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100px' }}>
                {tagLoading ? (
                  <div style={{ width: 30, height: 30, border: '2px solid #cbd5e1', borderTopColor: '#00205B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                ) : tagQrData?.qrDataUrl ? (
                  <>
                    <img
                      src={tagQrData.qrDataUrl}
                      alt="Asset Verification QR"
                      style={{ width: '84px', height: '84px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                    />
                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#00205B', marginTop: '4px' }}>
                      SCAN TO VERIFY
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Generating QR...</span>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ background: '#00205B', color: '#ffffff', textAlign: 'center', fontSize: '9px', padding: '4px', letterSpacing: '0.5px' }}>
              PROPERTY OF AAI • TAMPERING OR REMOVAL IS A STRICT REGULATORY VIOLATION
            </div>
          </div>
        </Modal>
      )}

      {/* ── Annual Physical Verification Campaign Modal ── */}
      {isVerificationModalOpen && (
        <Modal
          isOpen={isVerificationModalOpen}
          onClose={() => setIsVerificationModalOpen(false)}
          title="Annual Physical Verification Campaign"
          subtitle="Institutional Equipment Audit & Discrepancy Tracking"
          size="lg"
          id="verification-campaign-modal"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span style={{ fontSize: '11px', color: t.textMuted, fontStyle: 'italic' }}>
                Civil Aviation Equipment Ledger Standard • Discrepancy Logging Engine
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {activeCampaign && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleDownloadVerificationReport(activeCampaign.campaignId || activeCampaign._id)}
                    id="btn-download-verification-report"
                  >
                    <FileText size={14} />
                    <span>Download Audit Report (PDF)</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsVerificationModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {verificationSuccess && (
              <div style={{ padding: '8px 12px', background: '#ECFDF5', color: '#065F46', border: '1px solid #10B981', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#10B981" />
                <span>{verificationSuccess}</span>
              </div>
            )}

            {verificationError && (
              <div style={{ padding: '8px 12px', background: 'var(--status-danger-bg, #FEE2E2)', color: '#991B1B', border: '1px solid var(--status-danger-border, #FCA5A5)', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{verificationError}</span>
              </div>
            )}

            {/* Campaign Selection & Meta */}
            <div style={{ padding: '12px 16px', background: t.cardSubtle, borderRadius: '8px', border: `1px solid ${t.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClipboardCheck size={16} color="#6366F1" />
                  <strong style={{ fontSize: '13px' }}>Active Campaign:</strong>
                  <select
                    className="form-select"
                    style={{ fontSize: '12px', padding: '4px 8px', minWidth: '220px' }}
                    value={activeCampaign?._id || ''}
                    onChange={(e) => {
                      const sel = campaigns.find(c => c._id === e.target.value);
                      if (sel) setActiveCampaign(sel);
                    }}
                  >
                    {campaigns.length === 0 && <option value="">No Campaigns Registered</option>}
                    {campaigns.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.status})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowCreateCampaign(!showCreateCampaign)}
                >
                  {showCreateCampaign ? 'Cancel' : '+ New Campaign'}
                </button>
              </div>

              {showCreateCampaign && (
                <form onSubmit={handleCreateCampaign} style={{ borderTop: `1px solid ${t.border}`, paddingTop: '10px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Campaign Title (e.g. FY 2026-27 Physical Stock Audit)"
                      value={newCampaignForm.name}
                      onChange={(e) => setNewCampaignForm({ ...newCampaignForm, name: e.target.value })}
                      required
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Fiscal Year (e.g. 2026-27)"
                      value={newCampaignForm.fiscalYear}
                      onChange={(e) => setNewCampaignForm({ ...newCampaignForm, fiscalYear: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button type="submit" disabled={verificationLoading} className="btn btn-primary btn-sm">
                      {verificationLoading ? 'Creating...' : 'Initialize Campaign'}
                    </button>
                  </div>
                </form>
              )}

              {activeCampaign && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '12px', color: t.textMuted }}>
                  <span>
                    Verified: <strong>{activeCampaign.verifiedCount || 0}</strong> • Discrepancies: <strong>{activeCampaign.discrepanciesCount || 0}</strong> • Scope: <strong>{activeCampaign.totalAssets || 0}</strong>
                  </span>
                  {activeCampaign.status === 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={handleFinalizeCampaign}
                      disabled={verificationLoading}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '11px', padding: '2px 8px' }}
                    >
                      Finalize Campaign
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Quick Verification Form */}
            {activeCampaign && activeCampaign.status === 'ACTIVE' && (
              <form onSubmit={handleRecordVerification} style={{ padding: '14px 16px', background: t.cardSubtle, borderRadius: '8px', border: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: t.textPrimary }}>
                  Inspect & Verify Equipment
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Asset ID *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. AAI-IT-2026-0001"
                      value={verifyForm.assetId}
                      onChange={(e) => setVerifyForm({ ...verifyForm, assetId: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Verification Result *</label>
                    <select
                      className="form-select"
                      value={verifyForm.status}
                      onChange={(e) => setVerifyForm({ ...verifyForm, status: e.target.value })}
                    >
                      <option value="VERIFIED">VERIFIED (Present & Matched)</option>
                      <option value="NOT_FOUND">NOT FOUND (Missing from Floor)</option>
                      <option value="DAMAGED">DAMAGED (Physically Impaired)</option>
                      <option value="MOVED">MOVED (Unrecorded Relocation)</option>
                      <option value="UNAUTHORIZED_LOCATION">UNAUTHORIZED LOCATION</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Observed Location</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. CNS Server Room, 2nd Floor"
                      value={verifyForm.observedLocation}
                      onChange={(e) => setVerifyForm({ ...verifyForm, observedLocation: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Observed Physical Condition</label>
                    <select
                      className="form-select"
                      value={verifyForm.observedCondition}
                      onChange={(e) => setVerifyForm({ ...verifyForm, observedCondition: e.target.value })}
                    >
                      <option value="EXCELLENT">EXCELLENT</option>
                      <option value="GOOD">GOOD</option>
                      <option value="FAIR">FAIR</option>
                      <option value="DAMAGED">DAMAGED / FAULTY</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>Audit Remarks</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Inspection findings, tag condition, custodian remarks..."
                    value={verifyForm.remarks}
                    onChange={(e) => setVerifyForm({ ...verifyForm, remarks: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button type="submit" disabled={verificationLoading} className="btn btn-primary btn-sm">
                    {verificationLoading ? 'Submitting...' : 'Record Verification Record'}
                  </button>
                </div>
              </form>
            )}

            {/* Campaign Discrepancies List */}
            {activeCampaign && activeCampaign.discrepancies?.length > 0 && (
              <div style={{ padding: '12px 16px', background: t.cardSubtle, borderRadius: '8px', border: `1px solid ${t.border}` }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#DC2626', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldAlert size={15} />
                  <span>Audit Discrepancies ({activeCampaign.discrepancies.length})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {activeCampaign.discrepancies.map((d, i) => (
                    <div key={i} style={{ padding: '6px 10px', background: t.cardBg, borderRadius: '4px', border: `1px solid ${t.border}`, fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{d.assetId}</strong> • <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', background: '#FEE2E2', color: '#DC2626', fontWeight: 600 }}>{d.status}</span>
                        <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px' }}>
                          Observed: {d.observedLocation || 'N/A'} ({d.observedCondition}) • {d.remarks || 'No remarks'}
                        </div>
                      </div>
                      <span style={{ fontSize: '10px', color: t.textMuted }}>
                        {new Date(d.verificationDate).toLocaleDateString()} by {d.verifiedBy}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Spin animation */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
