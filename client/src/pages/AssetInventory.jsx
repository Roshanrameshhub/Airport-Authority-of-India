import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Boxes, 
  Plus, 
  Edit3, 
  Eye, 
  Archive, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Download, 
  FileText, 
  QrCode, 
  Printer,
  ClipboardCheck,
  ShieldAlert,
  History,
  LifeBuoy
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { SearchInput, SelectInput, ClearFilterButton } from '../components/ui/FormControls';
import { DataTable, TableActionBtn } from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import LoadMoreButton from '../components/ui/LoadMoreButton';
import { downloadAuthenticatedPdf, verificationApi } from '../services/api';

export default function AssetInventory() {
  const { user, token } = useAuth();
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(null);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedWarranty, setSelectedWarranty] = useState('');

  // Modals & Drawer State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeAsset, setActiveAsset] = useState(null);

  // Extended Drawer State (Custody History & Tickets)
  const [drawerHistory, setDrawerHistory] = useState([]);
  const [drawerComplaints, setDrawerComplaints] = useState([]);
  const [drawerHistoryLoading, setDrawerHistoryLoading] = useState(false);

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

  // Physical Asset Tag Modal State
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [tagAsset, setTagAsset] = useState(null);
  const [tagQrData, setTagQrData] = useState(null);
  const [tagLoading, setTagLoading] = useState(false);

  // Edit Asset Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [editFormError, setEditFormError] = useState('');
  const [editFormSubmitting, setEditFormSubmitting] = useState(false);

  // Form State for New Asset
  const [formData, setFormData] = useState({
    assetId: '',
    assetName: '',
    category: 'Desktop PC',
    make: '',
    model: '',
    serialNumber: '',
    installDate: new Date().toISOString().split('T')[0],
    warrantyStartDate: new Date().toISOString().split('T')[0],
    warrantyEndDate: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    operatingSystem: 'Windows 11 Enterprise',
    osVersion: '23H2',
    department: '',
    floor: '',
    remarks: '',
    status: 'AVAILABLE',
    condition: 'EXCELLENT',
    currentEmployeeId: ''
  });
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const fetchFiltersMaster = async () => {
    try {
      const [catRes, empRes] = await Promise.all([
        fetch('/api/v1/master/categories', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/employees?limit=100', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const catData = await catRes.json();
      const empData = await empRes.json();

      if (catData.success) setCategories(catData.data || []);
      if (empData.success) setEmployees(empData.data || []);
    } catch (err) {
      console.error('Error fetching master filters:', err);
    }
  };

  const fetchAssets = async (pageNum = 1, isLoadMore = false) => {
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
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedDept) params.append('department', selectedDept);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedWarranty) params.append('warrantyStatus', selectedWarranty);

      const res = await fetch(`/api/v1/assets?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const items = Array.isArray(data.data) ? data.data : (data.data?.items || []);
        if (isLoadMore) {
          setAssets(prev => [...prev, ...items]);
        } else {
          setAssets(items);
        }
        setTotalCount(data.pagination?.total ?? (isLoadMore ? assets.length + items.length : items.length));
        setPage(pageNum);
      }
    } catch (err) {
      console.error('Error fetching assets:', err);
      if (isLoadMore) {
        setLoadMoreError(err.message || 'Failed to load more assets');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (loadingMore || loading) return;
    fetchAssets(page + 1, true);
  };

  useEffect(() => {
    fetchFiltersMaster();
  }, [token]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPage(1);
      fetchAssets(1, false);
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search, selectedCategory, selectedDept, selectedStatus, selectedWarranty, token]);

  const isPeripheralCategory = (catName) => {
    if (!catName) return false;
    const lower = catName.toLowerCase();
    return ['printer', 'scanner', 'monitor', 'ups', 'switch', 'router', 'projector'].some(p => lower.includes(p));
  };

  const handleCategoryChange = (catName, isEdit = false) => {
    const isPeripheral = isPeripheralCategory(catName);
    if (isEdit) {
      setEditFormData(prev => ({
        ...prev,
        category: catName,
        operatingSystem: isPeripheral ? 'N/A' : (prev.operatingSystem === 'N/A' ? 'Windows 11 Enterprise' : prev.operatingSystem),
        osVersion: isPeripheral ? '' : (prev.osVersion || '23H2')
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        category: catName,
        operatingSystem: isPeripheral ? 'N/A' : (prev.operatingSystem === 'N/A' ? 'Windows 11 Enterprise' : prev.operatingSystem),
        osVersion: isPeripheral ? '' : (prev.osVersion || '23H2')
      }));
    }
  };

  const handleOpenEditModal = (asset) => {
    setEditFormData({
      assetId: asset.assetId,
      assetName: asset.assetName,
      category: asset.category,
      make: asset.make,
      model: asset.model,
      serialNumber: asset.serialNumber,
      installDate: asset.installDate ? new Date(asset.installDate).toISOString().split('T')[0] : '',
      warrantyStartDate: asset.warrantyStartDate ? new Date(asset.warrantyStartDate).toISOString().split('T')[0] : '',
      warrantyEndDate: asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toISOString().split('T')[0] : '',
      operatingSystem: asset.operatingSystem || 'N/A',
      osVersion: asset.osVersion || '',
      department: asset.department,
      floor: asset.floor,
      condition: asset.condition || 'GOOD',
      remarks: asset.remarks || ''
    });
    setEditFormError('');
    setIsEditModalOpen(true);
  };

  const handleEditFormSubmit = async (e) => {
    e.preventDefault();
    setEditFormError('');
    setEditFormSubmitting(true);

    try {
      const res = await fetch(`/api/v1/assets/${editFormData.assetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editFormData)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update asset specifications');
      }

      setIsEditModalOpen(false);
      setNotification({
        type: 'success',
        message: `Asset '${editFormData.assetId}' specifications updated successfully.`
      });
      setTimeout(() => setNotification(null), 4000);
      fetchAssets();
      if (activeAsset?.assetId === editFormData.assetId) {
        setActiveAsset({ ...activeAsset, ...data.data });
      }
    } catch (err) {
      setEditFormError(err.message);
    } finally {
      setEditFormSubmitting(false);
    }
  };

  const handleOpenRegisterModal = () => {
    setFormData({
      assetId: '',
      assetName: '',
      category: categories[0]?.name || 'Desktop PC',
      make: '',
      model: '',
      serialNumber: '',
      installDate: new Date().toISOString().split('T')[0],
      warrantyStartDate: new Date().toISOString().split('T')[0],
      warrantyEndDate: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      operatingSystem: 'Windows 11 Enterprise',
      osVersion: '23H2',
      department: '',
      floor: '',
      remarks: '',
      status: 'AVAILABLE',
      condition: 'EXCELLENT',
      currentEmployeeId: ''
    });
    setFormError('');
    setIsRegisterModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);

    try {
      const res = await fetch('/api/v1/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to register asset');
      }

      setIsRegisterModalOpen(false);
      setNotification({
        type: 'success',
        message: `Asset '${data.data.assetId}' registered with all 13 confirmed specifications!`
      });
      setTimeout(() => setNotification(null), 4000);
      fetchAssets();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleRetireAsset = async (assetId) => {
    if (!window.confirm(`Are you sure you want to decommission/retire asset ${assetId}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/assets/${assetId}/retire`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: `Asset ${assetId} decommissioned.` });
        setTimeout(() => setNotification(null), 4000);
        fetchAssets();
        if (activeAsset?.assetId === assetId) {
          setIsDrawerOpen(false);
        }
      }
    } catch (err) {
      console.error('Error retiring asset:', err);
    }
  };

  const handleOpenDrawer = async (asset) => {
    setActiveAsset(asset);
    setIsDrawerOpen(true);
    setDrawerHistoryLoading(true);
    setDrawerHistory([]);
    setDrawerComplaints([]);

    try {
      const [histRes, compRes] = await Promise.all([
        fetch(`/api/v1/assignments/asset/${asset.assetId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/v1/complaints/asset/${asset.assetId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const [histData, compData] = await Promise.all([histRes.json(), compRes.json()]);
      if (histData.success) setDrawerHistory(histData.data || []);
      if (compData.success) setDrawerComplaints(compData.data || []);
    } catch (err) {
      console.error('Failed to load asset drawer extended history:', err);
    } finally {
      setDrawerHistoryLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedDept) params.append('department', selectedDept);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedWarranty) params.append('warrantyStatus', selectedWarranty);

      const res = await fetch(`/api/v1/export/assets/excel?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to export inventory');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AAI_Asset_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Export failed');
    }
  };

  const handleDownloadHandoverSlip = async (assetId) => {
    if (pdfLoading) return;
    setPdfLoading(true);
    setNotification(null);
    try {
      await downloadAuthenticatedPdf(
        `/api/v1/export/handover/asset/${assetId}/pdf`,
        `AAI_Handover_Certificate_${assetId}.pdf`
      );
      setNotification({
        type: 'success',
        message: `Handover Certificate for '${assetId}' downloaded successfully.`
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to download handover certificate. Please try again.'
      });
      setTimeout(() => setNotification(null), 6000);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadRetirementRecord = async (assetId) => {
    try {
      await downloadAuthenticatedPdf(
        `/api/v1/export/retirement/${assetId}/pdf`,
        `AAI_Retirement_${assetId}.pdf`
      );
    } catch (err) {
      alert(err.message || 'Failed to download asset retirement record');
    }
  };

  const handleDownloadVerificationReport = async (campaignId) => {
    try {
      await downloadAuthenticatedPdf(
        `/api/v1/export/verification/${campaignId}/pdf`,
        `AAI_Verification_${campaignId}.pdf`
      );
    } catch (err) {
      alert(err.message || 'Failed to download physical verification report');
    }
  };

  const handleOpenTagModal = async (asset) => {
    setTagAsset(asset);
    setIsTagModalOpen(true);
    setTagLoading(true);
    setTagQrData(null);
    try {
      const res = await fetch(`/api/v1/tags/asset/${asset.assetId}/qr`, {
        headers: { Authorization: `Bearer ${token}` }
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
    } catch (err) {
      alert(err.message || 'Failed to download asset tag PDF');
    }
  };

  // Physical Verification Campaign Handlers
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
      if (res.data?.success) {
        const list = res.data.data || [];
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
      if (res.data?.success) {
        setActiveCampaign(res.data.data);
        setShowCreateCampaign(false);
        setVerificationSuccess(`Verification Campaign "${newCampaignForm.name}" initiated.`);
        const listRes = await verificationApi.getCampaigns();
        if (listRes.data?.success) setCampaigns(listRes.data.data);
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
      if (res.data?.success) {
        setActiveCampaign(res.data.data);
        setVerificationSuccess(`Asset ${verifyForm.assetId} successfully verified as ${verifyForm.status}.`);
        setVerifyForm({
          assetId: '',
          status: 'VERIFIED',
          observedLocation: '',
          observedCondition: 'GOOD',
          remarks: ''
        });
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
      if (res.data?.success) {
        setActiveCampaign(res.data.data);
        setVerificationSuccess('Verification campaign successfully finalized.');
        const listRes = await verificationApi.getCampaigns();
        if (listRes.data?.success) setCampaigns(listRes.data.data);
      }
    } catch (err) {
      setVerificationError(err.message || 'Failed to finalize campaign');
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedDept('');
    setSelectedStatus('');
    setSelectedWarranty('');
  };

  const hasActiveFilters = Boolean(search || selectedCategory || selectedDept || selectedStatus || selectedWarranty);
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="page-body">
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '85px',
          right: '32px',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 20px',
          background: '#047857',
          color: '#ffffff',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          fontSize: '0.875rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Standardized Page Header */}
      <PageHeader
        title="Central IT Asset Inventory"
        subtitle="Airports Authority of India • Confirmed 13-Attribute Equipment Registry"
      >
        <button
          onClick={() => handleOpenVerificationModal()}
          className="btn btn-secondary btn-sm"
          id="btn-physical-verification"
          title="Annual Physical Verification Campaign"
        >
          <ClipboardCheck size={15} />
          <span>Physical Verification</span>
        </button>
        <button onClick={handleExportExcel} className="btn btn-secondary btn-sm" id="export-excel-btn">
          <Download size={15} />
          <span>Export</span>
        </button>
        {isAdmin && (
          <button onClick={handleOpenRegisterModal} className="btn btn-primary btn-sm" id="register-asset-btn">
            <Plus size={15} />
            <span>Create Asset</span>
          </button>
        )}
      </PageHeader>

      {/* Search & Multi-Facet Filters Bar with Standard 38px Controls */}
      <div className="filter-bar">
        <div style={{ display: 'grid', gridTemplateColumns: hasActiveFilters ? '2fr 1fr 1fr 1fr 1fr auto' : '2fr 1fr 1fr 1fr 1fr', gap: 'var(--space-2)', alignItems: 'center' }}>
          <SearchInput
            placeholder="Search Asset ID, Name, Serial, Custodian..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            id="asset-search-input"
          />

          <SelectInput
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            id="category-filter-select"
            placeholder="All Categories"
            options={categories.map(c => ({ value: c.name, label: c.name }))}
          />

          <SelectInput
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            id="dept-filter-select"
            placeholder="All Departments"
            options={Array.from(new Set(assets.map(a => a.department).filter(Boolean))).sort().map(d => ({ value: d, label: d }))}
          />

          <SelectInput
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            id="status-filter-select"
            placeholder="All Statuses"
            options={[
              { value: 'AVAILABLE', label: 'AVAILABLE (In Stock)' },
              { value: 'ASSIGNED', label: 'ASSIGNED (In Custody)' },
              { value: 'UNDER_MAINTENANCE', label: 'UNDER MAINTENANCE' },
              { value: 'RETIRED', label: 'RETIRED' }
            ]}
          />

          <SelectInput
            value={selectedWarranty}
            onChange={(e) => setSelectedWarranty(e.target.value)}
            id="warranty-filter-select"
            placeholder="All Warranties"
            options={[
              { value: 'ACTIVE', label: 'ACTIVE Warranty' },
              { value: 'EXPIRING_SOON', label: 'EXPIRING SOON (≤ 30d)' },
              { value: 'EXPIRED', label: 'EXPIRED' }
            ]}
          />

          {hasActiveFilters && (
            <ClearFilterButton
              onClick={handleClearFilters}
              id="clear-asset-filters-btn"
            />
          )}
        </div>
      </div>

      {/* Assets Data Table */}
      <DataTable id="assets-data-table">
        <thead>
          <tr>
            <th>Asset ID</th>
            <th>Asset Name & Category</th>
            <th>Make & Model</th>
            <th>Serial Number</th>
            <th>Current Custodian (Staff)</th>
            <th>Department & Floor</th>
            <th>Warranty</th>
            <th>Status</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={9} style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-4)' }}>
                <div className="pulse-dot" style={{ margin: '0 auto var(--space-3)' }} />
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Loading equipment records...</span>
              </td>
            </tr>
          ) : assets.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No assets match current filters"
              description="Try modifying your search query or reset filter options to view all inventory."
              colSpan={9}
              action={
                hasActiveFilters ? (
                  <button onClick={handleClearFilters} className="btn btn-secondary btn-sm">
                    Reset All Filters
                  </button>
                ) : null
              }
            />
          ) : (
            assets.map((asset) => {
              const isAssigned = asset.status === 'ASSIGNED';
              const isMaintenance = asset.status === 'UNDER_MAINTENANCE';
              const isRetired = asset.status === 'RETIRED';

              return (
                <tr key={asset.assetId} id={`asset-row-${asset.assetId}`}>
                  <td>
                    <button
                      onClick={() => handleOpenDrawer(asset)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'var(--color-brand-600)',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                      title="View Technical Details"
                    >
                      {asset.assetId}
                    </button>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--color-brand-900)' }}>{asset.assetName}</div>
                    <span className="badge badge-neutral" style={{ fontSize: '0.65rem', marginTop: '2px' }}>
                      {asset.category}
                    </span>
                  </td>
                  <td>{asset.make} &bull; {asset.model}</td>
                  <td>
                    <code style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                      {asset.serialNumber}
                    </code>
                  </td>
                  <td>
                    {isAssigned ? (
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.825rem', color: 'var(--color-text-main)' }}>
                          {asset.currentEmployeeName}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)' }}>
                          {asset.currentDesignation} ({asset.currentEmployeeId})
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        In Stock (Unassigned)
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.825rem', color: 'var(--color-text-main)' }}>{asset.department}</div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)' }}>{asset.floor}</div>
                  </td>
                  <td>
                    <span className={`badge ${
                      asset.warrantyStatus === 'ACTIVE' 
                        ? 'badge-available' 
                        : asset.warrantyStatus === 'EXPIRING_SOON' 
                          ? 'badge-maintenance' 
                          : 'badge-danger'
                    }`}>
                      {asset.warrantyStatus}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${
                      isAssigned 
                        ? 'badge-assigned' 
                        : isMaintenance 
                          ? 'badge-maintenance' 
                          : isRetired 
                            ? 'badge-neutral' 
                            : 'badge-available'
                    }`}>
                      {asset.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="action-btn-group">
                      <TableActionBtn
                        icon={Eye}
                        onClick={() => handleOpenDrawer(asset)}
                        title="View Technical Details Drawer"
                        id={`view-btn-${asset.assetId}`}
                      />
                      {isAdmin && !isRetired && (
                        <TableActionBtn
                          icon={Edit3}
                          onClick={() => handleOpenEditModal(asset)}
                          title="Edit Technical Specifications"
                          id={`edit-btn-${asset.assetId}`}
                          style={{ color: 'var(--color-brand-600)' }}
                        />
                      )}
                      <TableActionBtn
                        icon={QrCode}
                        onClick={() => handleOpenTagModal(asset)}
                        title="Print Physical Asset Tag & QR Code"
                        id={`tag-btn-${asset.assetId}`}
                        style={{ color: '#00205B' }}
                      />
                      {isAdmin && !isRetired && (
                        <TableActionBtn
                          icon={Archive}
                          onClick={() => handleRetireAsset(asset.assetId)}
                          title="Decommission & Retire Asset"
                          id={`retire-btn-${asset.assetId}`}
                          style={{ color: 'var(--color-text-muted)' }}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </DataTable>

      {/* Progressive Load More Data Control */}
      {assets.length > 0 && (
        <LoadMoreButton
          currentCount={assets.length}
          totalCount={totalCount}
          loading={loadingMore}
          onLoadMore={handleLoadMore}
          error={loadMoreError}
          onRetry={handleLoadMore}
          itemName="assets"
          id="load-more-assets-btn"
        />
      )}

      {/* Asset Technical Details Slide-Out Drawer */}
      {isDrawerOpen && activeAsset && (
        <div className="drawer-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setIsDrawerOpen(false); }}>
          <div className="drawer-content">

            {/* ── DRAWER HEADER ── */}
            <div className="drawer-header">
              <div style={{ minWidth: 0, flex: 1 }}>
                <span className="badge badge-assigned" style={{ marginBottom: '4px', display: 'inline-block' }}>
                  {activeAsset.assetId}
                </span>
                <h2 className="drawer-title" style={{ wordBreak: 'break-word' }}>{activeAsset.assetName}</h2>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, marginLeft: '12px' }}>
                {isAdmin && activeAsset.status !== 'RETIRED' && (
                  <button
                    onClick={() => handleOpenEditModal(activeAsset)}
                    className="btn btn-secondary btn-sm"
                    title="Edit Specifications"
                    id="edit-asset-drawer-btn"
                  >
                    <Edit3 size={14} />
                    <span>Edit</span>
                  </button>
                )}
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  style={{ background: 'none', color: 'inherit', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
                  title="Close Drawer"
                  aria-label="Close Drawer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* ── DRAWER BODY ── */}
            <div className="drawer-body">

              {/* ── SECTION 1: CURRENT CUSTODIAN ── */}
              <section style={{ background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', padding: '16px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-brand-600)', marginBottom: '12px' }}>
                  Current Custodian / Holder
                </div>

                {activeAsset.currentEmployeeName ? (
                  <>
                    {/* Custodian 2-col info grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginBottom: '12px' }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Name</span>
                        <strong style={{ fontSize: '0.95rem', wordBreak: 'break-word', display: 'block', color: 'var(--color-text-main)' }}>
                          {activeAsset.currentEmployeeName}
                        </strong>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Employee ID</span>
                        <code style={{ fontWeight: 700, color: 'var(--color-brand-700)', fontSize: '0.85rem' }}>
                          {activeAsset.currentEmployeeId}
                        </code>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Designation</span>
                        <strong style={{ fontSize: '0.82rem', wordBreak: 'break-word', display: 'block', color: 'var(--color-text-main)' }}>
                          {activeAsset.currentDesignation || 'N/A'}
                        </strong>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Assigned On</span>
                        <strong style={{ fontSize: '0.82rem', display: 'block', color: 'var(--color-text-main)' }}>
                          {activeAsset.currentAssignmentDate
                            ? new Date(activeAsset.currentAssignmentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            : 'N/A'}
                        </strong>
                      </div>
                    </div>

                    {/* PDF Button — its own full-width row */}
                    <button
                      onClick={() => handleDownloadHandoverSlip(activeAsset.assetId)}
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', justifyContent: 'center', opacity: pdfLoading ? 0.7 : 1 }}
                      id="download-slip-drawer-btn"
                      disabled={pdfLoading}
                    >
                      <FileText size={14} />
                      <span>{pdfLoading ? 'Generating PDF…' : 'Download Handover Certificate (PDF)'}</span>
                    </button>
                  </>
                ) : activeAsset.status === 'RETIRED' ? (
                  <>
                    <div style={{ fontSize: '0.875rem', color: 'var(--status-danger-text)', fontWeight: 600, marginBottom: '12px' }}>
                      Asset Decommissioned &amp; Retired from Institutional Inventory
                    </div>
                    <button
                      onClick={() => handleDownloadRetirementRecord(activeAsset.assetId)}
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', justifyContent: 'center' }}
                      id="download-retirement-drawer-btn"
                    >
                      <FileText size={14} />
                      <span>Download Decommissioning Record (PDF)</span>
                    </button>
                  </>
                ) : (
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    This item is currently in the IT store pool — not assigned to any individual.
                  </div>
                )}
              </section>

              {/* ── SECTION 2: HARDWARE SPECIFICATIONS ── */}
              <section>
                <h3 className="drawer-section-heading">Hardware Specifications</h3>
                <div className="drawer-spec-grid">
                  <div style={{ minWidth: 0 }}>
                    <span className="drawer-spec-label">Make / Manufacturer</span>
                    <strong className="drawer-spec-value">{activeAsset.make}</strong>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span className="drawer-spec-label">Model Number</span>
                    <strong className="drawer-spec-value">{activeAsset.model}</strong>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span className="drawer-spec-label">OEM Serial Number</span>
                    <code style={{ fontWeight: 700, wordBreak: 'break-all', display: 'block', color: 'var(--color-text-main)' }}>
                      {activeAsset.serialNumber}
                    </code>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span className="drawer-spec-label">Category</span>
                    <strong className="drawer-spec-value">{activeAsset.category}</strong>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span className="drawer-spec-label">Physical Condition</span>
                    <span className="badge badge-neutral" style={{ marginTop: '2px', display: 'inline-block' }}>{activeAsset.condition}</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span className="drawer-spec-label">Current Status</span>
                    <span
                      className={`badge ${
                        activeAsset.status === 'ASSIGNED' ? 'badge-assigned'
                        : activeAsset.status === 'UNDER_MAINTENANCE' ? 'badge-maintenance'
                        : activeAsset.status === 'RETIRED' || activeAsset.status === 'DISPOSED' ? 'badge-neutral'
                        : 'badge-available'
                      }`}
                      style={{ marginTop: '2px', display: 'inline-block' }}
                    >
                      {activeAsset.status}
                    </span>
                  </div>
                </div>
              </section>

              {/* ── SECTION 3: OPERATING SYSTEM ── */}
              <section>
                <h3 className="drawer-section-heading">Operating System &amp; Environment</h3>
                <div className="drawer-spec-grid">
                  <div style={{ minWidth: 0 }}>
                    <span className="drawer-spec-label">Type of OS</span>
                    <strong className="drawer-spec-value">{activeAsset.operatingSystem || 'N/A'}</strong>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span className="drawer-spec-label">OS Version / Build</span>
                    <strong className="drawer-spec-value">{activeAsset.osVersion || 'N/A'}</strong>
                  </div>
                </div>
              </section>

              {/* ── SECTION 4: DEPLOYMENT & LOCATION ── */}
              <section>
                <h3 className="drawer-section-heading">Deployment &amp; Physical Location</h3>
                <div className="drawer-spec-grid">
                  <div style={{ minWidth: 0 }}>
                    <span className="drawer-spec-label">Department</span>
                    <strong className="drawer-spec-value" style={{ wordBreak: 'break-word' }}>{activeAsset.department}</strong>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span className="drawer-spec-label">Physical Location / Floor</span>
                    <strong className="drawer-spec-value" style={{ wordBreak: 'break-word' }}>{activeAsset.floor}</strong>
                  </div>
                </div>
              </section>

              {/* ── SECTION 5: WARRANTY ── */}
              <section>
                <h3 className="drawer-section-heading">Lifecycle, Warranty &amp; Asset Aging</h3>
                <div className="drawer-spec-grid">
                  <div style={{ minWidth: 0 }}>
                    <span className="drawer-spec-label">Commission / Install Date</span>
                    <strong className="drawer-spec-value">
                      {activeAsset.installDate ? new Date(activeAsset.installDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                    </strong>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span className="drawer-spec-label">Warranty End Date</span>
                    <strong className="drawer-spec-value">
                      {activeAsset.warrantyEndDate ? new Date(activeAsset.warrantyEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                    </strong>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span className="drawer-spec-label">Warranty Status</span>
                    <span
                      className={`badge ${
                        activeAsset.warrantyStatus === 'ACTIVE' ? 'badge-available'
                        : activeAsset.warrantyStatus === 'EXPIRING_SOON' ? 'badge-maintenance'
                        : 'badge-danger'
                      }`}
                      style={{ marginTop: '2px', display: 'inline-block' }}
                    >
                      {activeAsset.warrantyStatus || 'UNKNOWN'}
                    </span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span className="drawer-spec-label">Asset Age</span>
                    <strong className="drawer-spec-value" style={{ color: 'var(--color-brand-700)' }}>
                      {(() => {
                        const install = new Date(activeAsset.installDate);
                        if (isNaN(install.getTime())) return 'N/A';
                        const diffMs = Date.now() - install.getTime();
                        const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
                        const years = Math.floor(diffDays / 365);
                        const months = Math.floor((diffDays % 365) / 30);
                        return `${years > 0 ? `${years}y ` : ''}${months}m (${diffDays}d)`;
                      })()}
                    </strong>
                  </div>
                </div>
              </section>

              {/* ── SECTION 6: REMARKS ── */}
              {activeAsset.remarks && (
                <section>
                  <h3 className="drawer-section-heading">Remarks &amp; Operational Notes</h3>
                  <p style={{
                    fontSize: '0.85rem',
                    color: 'var(--color-text-secondary)',
                    background: 'var(--color-bg-subtle)',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    margin: 0,
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6
                  }}>
                    {activeAsset.remarks}
                  </p>
                </section>
              )}

              {/* ── SECTION 7: CUSTODY / TRANSFER HISTORY ── */}
              <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                  <h3 style={{ fontSize: '0.9375rem', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-main)' }}>
                    <History size={15} color="var(--color-brand-600)" />
                    <span>Custody &amp; Transfer History</span>
                  </h3>
                  <span className="badge badge-neutral" style={{ fontSize: '0.65rem', flexShrink: 0 }}>{drawerHistory.length} events</span>
                </div>
                {drawerHistoryLoading ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', padding: '8px 0' }}>Loading custody timeline...</div>
                ) : drawerHistory.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', padding: '8px 0' }}>No custody transfer records for this equipment.</div>
                ) : (
                  <div className="custody-timeline-container" style={{ marginLeft: '4px' }}>
                    {drawerHistory.map((h, i) => (
                      <div key={h.assignmentId || i} className="custody-timeline-item">
                        <div className="custody-timeline-dot" style={{ background: h.status === 'ACTIVE' ? '#10B981' : '#3B82F6', flexShrink: 0 }} />
                        <div className="custody-timeline-card" style={{ padding: '10px 12px', minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', fontSize: '0.8rem', fontWeight: 600, flexWrap: 'wrap' }}>
                            <span style={{ wordBreak: 'break-word', minWidth: 0 }}>{h.employeeName} ({h.employeeId})</span>
                            <span className="badge badge-neutral" style={{ fontSize: '0.62rem', flexShrink: 0 }}>{h.status}</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '3px', wordBreak: 'break-word' }}>
                            {new Date(h.assignedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {h.returnedDate
                              ? ` → Returned: ${new Date(h.returnedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                              : ' (Current Custody)'}
                            {h.transferReason && <span> &bull; {h.transferReason}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ── SECTION 8: COMPLAINT / REPAIR TICKETS ── */}
              <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                  <h3 style={{ fontSize: '0.9375rem', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-main)' }}>
                    <LifeBuoy size={15} color="var(--color-brand-600)" />
                    <span>Service Desk &amp; Repair Tickets</span>
                  </h3>
                  <span className="badge badge-neutral" style={{ fontSize: '0.65rem', flexShrink: 0 }}>{drawerComplaints.length} tickets</span>
                </div>
                {drawerHistoryLoading ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', padding: '8px 0' }}>Loading tickets...</div>
                ) : drawerComplaints.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', padding: '8px 0' }}>No active or past repair tickets for this asset.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {drawerComplaints.map((c, i) => (
                      <div key={c.ticketId || i} style={{ padding: '10px 12px', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <strong style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--color-text-main)', flexShrink: 0 }}>{c.ticketId}</strong>
                          <span
                            className={`badge ${
                              c.severity === 'CRITICAL' || c.severity === 'HIGH' ? 'badge-danger'
                              : c.severity === 'MEDIUM' ? 'badge-maintenance'
                              : 'badge-neutral'
                            }`}
                            style={{ fontSize: '0.62rem' }}
                          >
                            {c.severity} &bull; {c.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '2px', wordBreak: 'break-word' }}>
                          {c.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', wordBreak: 'break-word' }}>
                          {c.description}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ── SECTION 9: QUICK ACTIONS ── */}
              <section style={{ paddingTop: '4px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: '1 1 140px' }}
                    onClick={() => {
                      setIsDrawerOpen(false);
                      handleOpenVerificationModal(activeAsset.assetId);
                    }}
                  >
                    <ClipboardCheck size={14} />
                    <span>Audit Verification</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: '1 1 140px' }}
                    onClick={() => handleOpenTagModal(activeAsset)}
                  >
                    <QrCode size={14} />
                    <span>Print QR Tag</span>
                  </button>
                </div>
              </section>

            </div>
          </div>
        </div>
      )}

      {/* Register New Asset Modal Dialog */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Register IT Equipment"
        subtitle="Captures all 13 confirmed handwritten specification fields"
        size="lg"
        id="register-asset-modal"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleFormSubmit}
              disabled={formSubmitting}
              className="btn btn-primary"
              id="submit-asset-btn"
            >
              {formSubmitting ? 'Registering...' : 'Register Equipment'}
            </button>
          </>
        }
      >
        {formError && (
          <div style={{
            padding: '10px 14px',
            background: 'var(--status-danger-bg)',
            border: '1px solid var(--status-danger-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--status-danger-text)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: 'var(--space-4)'
          }}>
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Asset Name & Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Asset Name * (Confirmed Field 6)</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Dell OptiPlex 7090 MT"
                value={formData.assetName}
                onChange={(e) => setFormData({ ...formData, assetName: e.target.value })}
                id="asset-name-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                required
                className="form-select"
                value={formData.category}
                onChange={(e) => handleCategoryChange(e.target.value, false)}
                id="asset-category-input"
              >
                {categories.map((c) => (
                  <option key={c.code} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Make, Model & Serial Number */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Make / Company * (Field 7)</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Dell, HP, APC"
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                id="asset-make-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Model * (Field 8)</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Latitude 5420"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                id="asset-model-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Serial Number * (Field 9)</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="OEM Serial Tag"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                id="asset-serial-input"
              />
            </div>
          </div>

          {/* Install Date & Warranty End Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Install Date * (Field 10)</label>
              <input
                type="date"
                required
                className="form-input"
                value={formData.installDate}
                onChange={(e) => setFormData({ ...formData, installDate: e.target.value })}
                id="asset-install-date-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Warranty End Date * (Field 11)</label>
              <input
                type="date"
                required
                className="form-input"
                value={formData.warrantyEndDate}
                onChange={(e) => setFormData({ ...formData, warrantyEndDate: e.target.value })}
                id="asset-warranty-date-input"
              />
            </div>
          </div>

          {/* Operating System & Version */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Type of OS (Field 12)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Windows 11 Enterprise / Linux / N/A"
                value={formData.operatingSystem}
                onChange={(e) => setFormData({ ...formData, operatingSystem: e.target.value })}
                id="asset-os-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">OS Version (Field 12)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 23H2 (Build 22631)"
                value={formData.osVersion}
                onChange={(e) => setFormData({ ...formData, osVersion: e.target.value })}
                id="asset-os-version-input"
              />
            </div>
          </div>

          {/* Department & Floor */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Department * (Field 3)</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. IT Department, CNS, Terminal Operations"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                id="asset-dept-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Floor / Location * (Field 4)</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. 2nd Floor, Technical Block"
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                id="asset-floor-input"
              />
            </div>
          </div>

          {/* Optional Initial Custodian (Fields 1, 2, 5) */}
          <div className="form-group">
            <label className="form-label">
              Assign to Employee (Fields 1, 2, 5: User Name, Designation, ID)
            </label>
            <select
              className="form-select"
              value={formData.currentEmployeeId}
              onChange={(e) => setFormData({ ...formData, currentEmployeeId: e.target.value })}
              id="asset-assignee-select"
            >
              <option value="">None (Keep In Stock / Available)</option>
              {employees.map((emp) => (
                <option key={emp.employeeId} value={emp.employeeId}>
                  {emp.name} &bull; {emp.designation} ({emp.employeeId}) &bull; {emp.department}
                </option>
              ))}
            </select>
          </div>

          {/* Remarks */}
          <div className="form-group">
            <label className="form-label">Remarks (Field 13)</label>
            <textarea
              rows={2}
              className="form-control"
              style={{ height: 'auto', padding: '8px 12px' }}
              placeholder="Deployment notes, special software licenses, or procurement details..."
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              id="asset-remarks-input"
            />
          </div>
        </form>
      </Modal>

      {/* Edit Asset Specifications Modal Dialog */}
      {isEditModalOpen && editFormData && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Equipment Specifications"
          subtitle={`Asset Tag: ${editFormData.assetId} • Confirmed 13 Attributes`}
          size="lg"
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
              background: 'var(--status-danger-bg)',
              border: '1px solid var(--status-danger-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--status-danger-text)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: 'var(--space-4)'
            }}>
              <AlertCircle size={16} />
              <span>{editFormError}</span>
            </div>
          )}

          <form onSubmit={handleEditFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Asset Name & Category */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label">Asset Name * (Confirmed Field 6)</label>
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
                  value={editFormData.category}
                  onChange={(e) => handleCategoryChange(e.target.value, true)}
                  id="edit-asset-category-input"
                >
                  {categories.map((c) => (
                    <option key={c.code} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Make, Model & Serial Number */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label">Make / Company * (Field 7)</label>
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
                <label className="form-label">Model * (Field 8)</label>
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
                <label className="form-label">Serial Number * (Field 9)</label>
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

            {/* Install Date & Warranty End Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label">Install Date * (Field 10)</label>
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
                <label className="form-label">Warranty End Date * (Field 11)</label>
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

            {/* Operating System & Version */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label">Type of OS (Field 12)</label>
                <input
                  type="text"
                  className="form-input"
                  value={editFormData.operatingSystem}
                  onChange={(e) => setEditFormData({ ...editFormData, operatingSystem: e.target.value })}
                  id="edit-asset-os-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">OS Version (Field 12)</label>
                <input
                  type="text"
                  className="form-input"
                  value={editFormData.osVersion}
                  onChange={(e) => setEditFormData({ ...editFormData, osVersion: e.target.value })}
                  id="edit-asset-os-version-input"
                />
              </div>
            </div>

            {/* Department & Floor */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label">Department * (Field 3)</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. IT Department, CNS, Terminal Operations"
                  value={editFormData.department}
                  onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                  id="edit-asset-dept-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Floor / Location * (Field 4)</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={editFormData.floor}
                  onChange={(e) => setEditFormData({ ...editFormData, floor: e.target.value })}
                  id="edit-asset-floor-input"
                />
              </div>
            </div>

            {/* Condition & Remarks */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label">Condition</label>
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

              <div className="form-group">
                <label className="form-label">Remarks</label>
                <input
                  type="text"
                  className="form-input"
                  value={editFormData.remarks}
                  onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })}
                  id="edit-asset-remarks-input"
                />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Physical Asset Tag Printing Modal */}
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
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
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
                  <Printer size={16} />
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
            boxShadow: 'var(--shadow-sm)'
          }}>
            {/* Header Banner */}
            <div style={{ background: '#00205B', color: '#ffffff', textAlign: 'center', padding: '6px 8px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.8125rem', letterSpacing: '0.5px' }}>
                AIRPORTS AUTHORITY OF INDIA
              </div>
              <div style={{ fontSize: '0.65rem', opacity: 0.9 }}>
                REGIONAL OFFICE • IT ASSET IDENTIFICATION TAG
              </div>
            </div>

            {/* Tag Body */}
            <div style={{ padding: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ flex: 1, fontSize: '0.75rem' }}>
                <div style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  color: '#00205B',
                  fontFamily: 'monospace',
                  marginBottom: '6px'
                }}>
                  {tagAsset.assetId}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '4px', marginBottom: '3px' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Category:</span>
                  <span style={{ fontWeight: 600 }}>{tagAsset.category}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '4px', marginBottom: '3px' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Model:</span>
                  <span>{tagAsset.make} {tagAsset.model}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '4px', marginBottom: '3px' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Serial No:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{tagAsset.serialNumber}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '4px', marginBottom: '3px' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Location:</span>
                  <span>{tagAsset.department} ({tagAsset.floor || 'N/A'})</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '4px' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Warranty:</span>
                  <span style={{ color: '#047857', fontWeight: 600 }}>{tagAsset.warrantyStatus}</span>
                </div>
              </div>

              {/* QR Code Column */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100px' }}>
                {tagLoading ? (
                  <div className="pulse-dot" style={{ margin: '1rem auto' }} />
                ) : tagQrData?.qrDataUrl ? (
                  <>
                    <img
                      src={tagQrData.qrDataUrl}
                      alt="Asset Verification QR"
                      style={{ width: '84px', height: '84px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                    />
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#00205B', marginTop: '4px' }}>
                      SCAN TO VERIFY
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Generating QR...</span>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ background: '#00205B', color: '#ffffff', textAlign: 'center', fontSize: '0.6rem', padding: '4px', letterSpacing: '0.5px' }}>
              PROPERTY OF AAI • TAMPERING OR REMOVAL IS A STRICT REGULATORY VIOLATION
            </div>
          </div>
        </Modal>
      )}

      {/* Annual Physical Verification Campaign Modal */}
      {isVerificationModalOpen && (
        <Modal
          isOpen={isVerificationModalOpen}
          onClose={() => setIsVerificationModalOpen(false)}
          title="Annual Physical Verification Campaign"
          subtitle="Institutional Equipment Audit & Discrepancy Tracking (TECHNICALLY RECOMMENDED — BUSINESS CONFIRMATION REQUIRED)"
          size="lg"
          id="verification-campaign-modal"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                Civil Aviation Equipment Ledger Standard &bull; Discrepancy Logging Engine
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
              <div style={{ padding: '8px 12px', background: '#ECFDF5', color: '#065F46', border: '1px solid #10B981', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#10B981" />
                <span>{verificationSuccess}</span>
              </div>
            )}

            {verificationError && (
              <div style={{ padding: '8px 12px', background: 'var(--status-danger-bg)', color: 'var(--status-danger-text)', border: '1px solid var(--status-danger-border)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{verificationError}</span>
              </div>
            )}

            {/* Campaign Selection & Meta */}
            <div className="card" style={{ padding: '12px 16px', background: 'var(--color-bg-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClipboardCheck size={16} color="var(--color-brand-600)" />
                  <strong style={{ fontSize: '0.875rem' }}>Active Campaign:</strong>
                  <select
                    className="form-select"
                    style={{ fontSize: '0.8rem', padding: '4px 8px', minWidth: '220px' }}
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
                <form onSubmit={handleCreateCampaign} style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  <span>
                    Verified: <strong>{activeCampaign.verifiedCount || 0}</strong> &bull; Discrepancies: <strong>{activeCampaign.discrepanciesCount || 0}</strong> &bull; Total Scope: <strong>{activeCampaign.totalAssets || 0}</strong>
                  </span>
                  {activeCampaign.status === 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={handleFinalizeCampaign}
                      disabled={verificationLoading}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                    >
                      Finalize Campaign
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Quick Verification Form */}
            {activeCampaign && activeCampaign.status === 'ACTIVE' && (
              <form onSubmit={handleRecordVerification} className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-brand-title)' }}>
                  Inspect & Verify Equipment
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Asset ID *</label>
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
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Verification Result *</label>
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
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Observed Location</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. CNS Server Room, 2nd Floor"
                      value={verifyForm.observedLocation}
                      onChange={(e) => setVerifyForm({ ...verifyForm, observedLocation: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Observed Physical Condition</label>
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
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Audit Remarks</label>
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
              <div className="card" style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--status-danger-text)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldAlert size={15} />
                  <span>Audit Discrepancies ({activeCampaign.discrepancies.length})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {activeCampaign.discrepancies.map((d, i) => (
                    <div key={i} style={{ padding: '6px 10px', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{d.assetId}</strong> &bull; <span className="badge badge-danger" style={{ fontSize: '0.62rem' }}>{d.status}</span>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          Observed: {d.observedLocation || 'N/A'} ({d.observedCondition}) &bull; {d.remarks || 'No remarks'}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
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
    </div>
  );
}
