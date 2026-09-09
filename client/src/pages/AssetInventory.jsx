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
  Printer 
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { SearchInput, SelectInput, ClearFilterButton } from '../components/ui/FormControls';
import { DataTable, TableActionBtn } from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import LoadMoreButton from '../components/ui/LoadMoreButton';

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

  const handleOpenDrawer = (asset) => {
    setActiveAsset(asset);
    setIsDrawerOpen(true);
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

  const handleDownloadHandoverSlip = (assetId) => {
    window.open(`/api/v1/export/handover/asset/${assetId}/pdf`, '_blank');
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

  const handlePrintTagPdf = (assetId) => {
    window.open(`/api/v1/tags/asset/${assetId}/pdf`, '_blank');
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
        subtitle="Airports Authority of India • Regional Headquarters • Confirmed 13-Attribute Equipment Registry"
      >
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
            {/* Drawer Header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--color-brand-900)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span className="badge badge-assigned" style={{ marginBottom: '4px', background: '#0284c7', color: '#ffffff' }}>
                  {activeAsset.assetId}
                </span>
                <h2 style={{ color: '#ffffff', fontSize: '1.25rem', margin: 0 }}>{activeAsset.assetName}</h2>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {isAdmin && activeAsset.status !== 'RETIRED' && (
                  <button
                    onClick={() => handleOpenEditModal(activeAsset)}
                    className="btn btn-secondary btn-sm"
                    style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)' }}
                    title="Edit Specifications"
                    id="edit-asset-drawer-btn"
                  >
                    <Edit3 size={14} />
                    <span>Edit</span>
                  </button>
                )}
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  style={{ background: 'none', color: '#ffffff', border: 'none', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Drawer Body — Full 13 Confirmed Specification Display */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
              {/* Custody Block */}
              <div className="card" style={{ padding: '16px', background: 'var(--color-bg-subtle)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-brand-600)', marginBottom: '6px' }}>
                  Current Custodian / Holder
                </div>
                {activeAsset.currentEmployeeName ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-brand-900)' }}>
                      {activeAsset.currentEmployeeName}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                      {activeAsset.currentDesignation} &bull; <code>{activeAsset.currentEmployeeId}</code>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      Assigned On: {activeAsset.currentAssignmentDate ? new Date(activeAsset.currentAssignmentDate).toLocaleDateString() : 'N/A'}
                    </div>
                    <button
                      onClick={() => handleDownloadHandoverSlip(activeAsset.assetId)}
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: '10px', width: '100%' }}
                      id="download-slip-drawer-btn"
                    >
                      <FileText size={15} />
                      <span>Download Handover Slip (PDF)</span>
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    Item is in organizational reserve / Available in stock.
                  </div>
                )}
              </div>

              {/* Hardware Specifications */}
              <div>
                <h3 style={{ fontSize: '0.9375rem', marginBottom: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                  Hardware Specifications
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>Make / Manufacturer</span>
                    <strong>{activeAsset.make}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>Model Number</span>
                    <strong>{activeAsset.model}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>OEM Serial Number</span>
                    <code style={{ fontWeight: 700 }}>{activeAsset.serialNumber}</code>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>Category</span>
                    <strong>{activeAsset.category}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>Physical Condition</span>
                    <span className="badge badge-neutral">{activeAsset.condition}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>Current Status</span>
                    <span className="badge badge-available">{activeAsset.status}</span>
                  </div>
                </div>
              </div>

              {/* Operating System & Software */}
              <div>
                <h3 style={{ fontSize: '0.9375rem', marginBottom: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                  Operating System & Environment
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>Type of OS</span>
                    <strong>{activeAsset.operatingSystem || 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>OS Version / Build</span>
                    <strong>{activeAsset.osVersion || 'N/A'}</strong>
                  </div>
                </div>
              </div>

              {/* Location & Department */}
              <div>
                <h3 style={{ fontSize: '0.9375rem', marginBottom: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                  Deployment Location
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>Department</span>
                    <strong>{activeAsset.department}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>Floor / Location</span>
                    <strong>{activeAsset.floor}</strong>
                  </div>
                </div>
              </div>

              {/* Lifecycle & Warranty Timeline */}
              <div>
                <h3 style={{ fontSize: '0.9375rem', marginBottom: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                  Lifecycle & Warranty
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>Install Date</span>
                    <strong>{new Date(activeAsset.installDate).toLocaleDateString()}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>Warranty End Date</span>
                    <strong>{new Date(activeAsset.warrantyEndDate).toLocaleDateString()}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>Warranty Status</span>
                    <span className="badge badge-available">{activeAsset.warrantyStatus}</span>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              {activeAsset.remarks && (
                <div>
                  <h3 style={{ fontSize: '0.9375rem', marginBottom: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                    Remarks & Operational Notes
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', background: 'var(--color-bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', margin: 0 }}>
                    {activeAsset.remarks}
                  </p>
                </div>
              )}
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
    </div>
  );
}
