import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  Eye,
  Laptop, 
  Building2, 
  MapPin, 
  Mail, 
  Phone,
  AlertCircle,
  CheckCircle2,
  FileText,
  History,
  KeyRound,
  Copy,
  Check,
  UserCheck,
  UserX,
  RefreshCw
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { SearchInput, SelectInput, ClearFilterButton } from '../components/ui/FormControls';
import { DataTable, TableActionBtn } from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import LoadMoreButton from '../components/ui/LoadMoreButton';
import { downloadAuthenticatedPdf } from '../services/api';

export default function EmployeeDirectory() {
  const { user, token } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedEmployeeType, setSelectedEmployeeType] = useState('');

  // Detail Modal State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [empAssets, setEmpAssets] = useState([]);
  const [empAssetsLoading, setEmpAssetsLoading] = useState(false);

  // Account Management & Confirmation Modal States
  const [createdAccountModalData, setCreatedAccountModalData] = useState(null);
  const [accountStatus, setAccountStatus] = useState(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [resetPasswordResult, setResetPasswordResult] = useState(null);
  const [accountActionLoading, setAccountActionLoading] = useState(false);
  const [copiedState, setCopiedState] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('CREATE'); // 'CREATE' or 'EDIT'
  const [currentEmpId, setCurrentEmpId] = useState(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    designation: '',
    department: '',
    floor: '',
    email: '',
    phone: '',
    employeeType: 'AAI',
    employmentCategory: 'Regular',
    contractorName: '',
    createLoginAccount: true
  });
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const fetchEmployees = async (pageNum = 1, isLoadMore = false) => {
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
      if (selectedDept) params.append('department', selectedDept);
      if (selectedFloor) params.append('floor', selectedFloor);
      if (selectedEmployeeType) params.append('employeeType', selectedEmployeeType);

      const res = await fetch(`/api/v1/employees?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const items = Array.isArray(data.data) ? data.data : (data.data?.items || []);
        if (isLoadMore) {
          setEmployees(prev => [...prev, ...items]);
        } else {
          setEmployees(items);
        }
        setTotalCount(data.pagination?.total ?? (isLoadMore ? employees.length + items.length : items.length));
        setPage(pageNum);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
      if (isLoadMore) {
        setLoadMoreError(err.message || 'Failed to load more staff records');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (loadingMore || loading) return;
    fetchEmployees(page + 1, true);
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPage(1);
      fetchEmployees(1, false);
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search, selectedDept, selectedFloor, selectedEmployeeType, token]);

  const handleOpenDetailModal = async (emp) => {
    setSelectedEmployee(emp);
    setIsDetailModalOpen(true);
    setEmpAssetsLoading(true);
    setEmpAssets([]);
    setAccountStatus(null);
    setResetPasswordResult(null);

    // Fetch assigned assets
    fetch(`/api/v1/assignments/employee/${emp.employeeId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setEmpAssets(data.data || []);
        }
      })
      .catch(err => console.error('Failed to load employee assigned assets:', err))
      .finally(() => setEmpAssetsLoading(false));

    // Fetch employee login account status (if admin)
    if (user?.role === 'ADMIN') {
      setAccountLoading(true);
      fetch(`/api/v1/employees/${emp.employeeId}/account-status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setAccountStatus(data.data);
          }
        })
        .catch(err => console.error('Failed to load employee account status:', err))
        .finally(() => setAccountLoading(false));
    }
  };

  const handleDownloadSlip = async (assignmentId) => {
    try {
      await downloadAuthenticatedPdf(
        `/api/v1/export/handover/${assignmentId}/pdf`,
        `AAI_Handover_${assignmentId}.pdf`
      );
      setNotification({ type: 'success', message: `Handover slip for assignment ${assignmentId} downloaded.` });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to download handover slip.' });
      setTimeout(() => setNotification(null), 6000);
    }
  };

  const handleOpenCreateModal = () => {
    setModalMode('CREATE');
    setCurrentEmpId(null);
    setFormData({
      employeeId: '',
      name: '',
      designation: '',
      department: '',
      floor: '',
      email: '',
      phone: '',
      employeeType: 'AAI',
      employmentCategory: 'Regular',
      contractorName: '',
      createLoginAccount: true
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (emp) => {
    setModalMode('EDIT');
    setCurrentEmpId(emp.employeeId);
    setFormData({
      employeeId: emp.employeeId,
      name: emp.name,
      designation: emp.designation,
      department: emp.department,
      floor: emp.floor,
      email: emp.email || '',
      phone: emp.phone || '',
      employeeType: emp.employeeType || 'AAI',
      employmentCategory: emp.employmentCategory || 'Regular',
      contractorName: emp.contractorName || '',
      createLoginAccount: false
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);

    try {
      const url = modalMode === 'CREATE' ? '/api/v1/employees' : `/api/v1/employees/${currentEmpId}`;
      const method = modalMode === 'CREATE' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Operation failed');
      }

      setIsModalOpen(false);
      fetchEmployees(1, false);

      if (modalMode === 'CREATE' && data.data?.accountCreated && data.data?.accountDetails) {
        setCreatedAccountModalData(data.data.accountDetails);
      } else {
        setNotification({
          type: 'success',
          message: modalMode === 'CREATE' ? 'Staff member registered successfully' : 'Employee profile updated'
        });
        setTimeout(() => setNotification(null), 4000);
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedEmployee) return;
    if (!window.confirm(`Generate a new temporary password for ${selectedEmployee.name} (${selectedEmployee.employeeId})? The previous password will immediately stop working.`)) {
      return;
    }

    setAccountActionLoading(true);
    try {
      const res = await fetch(`/api/v1/employees/${selectedEmployee.employeeId}/reset-password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to reset password');
      }

      setResetPasswordResult(data.data);
      setNotification({ type: 'success', message: `New temporary password generated for ${selectedEmployee.name}` });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setNotification({ type: 'error', message: err.message });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setAccountActionLoading(false);
    }
  };

  const handleToggleLogin = async (targetActive) => {
    if (!selectedEmployee) return;
    const actionName = targetActive ? 'enable' : 'disable';
    if (!window.confirm(`Are you sure you want to ${actionName} login access for ${selectedEmployee.name} (${selectedEmployee.employeeId})?`)) {
      return;
    }

    setAccountActionLoading(true);
    try {
      const res = await fetch(`/api/v1/employees/${selectedEmployee.employeeId}/toggle-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: targetActive })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || `Failed to ${actionName} login`);
      }

      setAccountStatus(prev => ({ ...prev, isActive: targetActive }));
      setNotification({
        type: 'success',
        message: targetActive ? 'Login access enabled' : 'Login access disabled'
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setNotification({ type: 'error', message: err.message });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setAccountActionLoading(false);
    }
  };

  const handleCreateLogin = async () => {
    if (!selectedEmployee) return;
    setAccountActionLoading(true);
    try {
      const res = await fetch(`/api/v1/employees/${selectedEmployee.employeeId}/create-login`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create login account');
      }

      setAccountStatus({
        hasAccount: true,
        employeeId: selectedEmployee.employeeId,
        username: selectedEmployee.employeeId,
        isActive: true
      });
      setResetPasswordResult(data.data);
      setNotification({ type: 'success', message: `Login account created for ${selectedEmployee.name}` });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setNotification({ type: 'error', message: err.message });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setAccountActionLoading(false);
    }
  };

  const handleCopyCredentials = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedState(key);
    setTimeout(() => setCopiedState(null), 3000);
  };

  const handleDeleteEmployee = async (empId, empName) => {
    if (!window.confirm(`Are you sure you want to deactivate ${empName} (${empId})? Historical asset records will remain preserved.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/employees/${empId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        setNotification({ type: 'success', message: `${empName} has been deactivated.` });
        setTimeout(() => setNotification(null), 4000);
        fetchEmployees(1, false);
      }
    } catch (err) {
      console.error('Error deactivating employee:', err);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedDept('');
    setSelectedFloor('');
  };

  const hasActiveFilters = Boolean(search || selectedDept || selectedFloor);
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
          background: 'var(--status-available-bg)',
          color: 'var(--status-available-text)',
          border: '1px solid var(--status-available-border)',
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
        title="Regional Staff & Custody Directory"
        subtitle="Airports Authority of India • Regional Office Staff Roster & Asset Custody Tracking"
      >
        {isAdmin && (
          <button onClick={handleOpenCreateModal} className="btn btn-primary btn-sm" id="add-employee-btn">
            <Plus size={15} />
            <span>Add Employee</span>
          </button>
        )}
      </PageHeader>

      {/* Search & Filter Bar with Standard 38px Controls */}
      <div className="filter-bar">
        <div style={{
          display: 'grid',
          gridTemplateColumns: hasActiveFilters ? '1.8fr 1.2fr 1.2fr auto' : '1.8fr 1.2fr 1.2fr auto',
          gap: 'var(--space-2)',
          alignItems: 'center'
        }}>
          <SearchInput
            placeholder="Search by Employee ID, Name, Designation, Contractor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            id="employee-search-input"
          />

          <SelectInput
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            id="department-filter-select"
            placeholder="All Departments"
            options={Array.from(new Set(employees.map(e => e.department).filter(Boolean))).sort().map(d => ({ value: d, label: d }))}
          />

          <SelectInput
            value={selectedEmployeeType}
            onChange={(e) => setSelectedEmployeeType(e.target.value)}
            id="emp-type-filter-select"
            placeholder="All Staff Types"
            options={[
              { value: 'AAI', label: 'AAI Staff' },
              { value: 'Contract', label: 'Contract / Outsourced' }
            ]}
          />

          {hasActiveFilters ? (
            <ClearFilterButton
              onClick={handleClearFilters}
              id="clear-employee-filters-btn"
            />
          ) : (
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', padding: '0 8px' }}>
              Showing <strong>{employees.length}</strong> Staff Records
            </div>
          )}
        </div>
      </div>

      {/* Staff Data Table */}
      <DataTable id="employees-data-table" tableClassName="employee-table">
        <thead>
          <tr>
            <th className="col-emp-id">Employee ID</th>
            <th className="col-emp-name">Staff Member</th>
            <th className="col-emp-type">Type &amp; Category</th>
            <th className="col-emp-desig">Designation</th>
            <th className="col-emp-dept">Department &amp; Location</th>
            <th className="col-emp-assets">Assigned Assets</th>
            <th className="col-emp-contact">Contact Details</th>
            <th className="col-emp-actions" style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-4)' }}>
                <div className="pulse-dot" style={{ margin: '0 auto var(--space-3)' }} />
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Loading staff records...</span>
              </td>
            </tr>
          ) : employees.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No staff members match criteria"
              description="Try adjusting your search query or filter selections to view all registered personnel."
              colSpan={8}
              action={
                hasActiveFilters ? (
                  <button onClick={handleClearFilters} className="btn btn-secondary btn-sm">
                    Reset Filter
                  </button>
                ) : null
              }
            />
          ) : (
            employees.map((emp) => (
              <tr key={emp.employeeId} id={`employee-row-${emp.employeeId}`}>
                <td className="col-emp-id">
                  <button
                    type="button"
                    onClick={() => handleOpenDetailModal(emp)}
                    className="emp-id-btn"
                    title={`View profile for ${emp.name} (${emp.employeeId})`}
                  >
                    <span className="badge badge-assigned" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                      {emp.employeeId}
                    </span>
                  </button>
                </td>
                <td className="col-emp-name">
                  <div
                    className="emp-name-text"
                    onClick={() => handleOpenDetailModal(emp)}
                    style={{ cursor: 'pointer' }}
                    title={`Click to view profile: ${emp.name}`}
                  >
                    {emp.name}
                  </div>
                </td>
                <td className="col-emp-type">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span
                      className="badge"
                      style={{
                        width: 'fit-content',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        backgroundColor: emp.employeeType === 'Contract' ? '#EDE9FE' : '#DBEAFE',
                        color: emp.employeeType === 'Contract' ? '#6D28D9' : '#1D4ED8',
                        border: `1px solid ${emp.employeeType === 'Contract' ? '#C4B5FD' : '#93C5FD'}`
                      }}
                    >
                      {emp.employeeType || 'AAI'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                      {emp.employmentCategory || 'Regular'}
                    </span>
                    {emp.contractorName && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }} title={`Contractor: ${emp.contractorName}`}>
                        &bull; {emp.contractorName}
                      </span>
                    )}
                  </div>
                </td>
                <td className="col-emp-desig">
                  <div className="emp-desig-text" title={emp.designation}>
                    {emp.designation}
                  </div>
                </td>
                <td className="col-emp-dept">
                  <div className="emp-dept-cell">
                    <div className="emp-dept-title" title={emp.department}>
                      <Building2 size={13} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                      <span className="truncate-text">{emp.department}</span>
                    </div>
                    <div className="emp-dept-sub" title={emp.floor}>
                      <MapPin size={12} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                      <span className="truncate-text">{emp.floor}</span>
                    </div>
                  </div>
                </td>
                <td className="col-emp-assets">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Laptop size={14} color="var(--color-brand-600)" style={{ flexShrink: 0 }} />
                    <span className="badge badge-neutral">
                      {emp.assignedAssetsCount || 0} Assets
                    </span>
                  </div>
                </td>
                <td className="col-emp-contact">
                  <div className="emp-contact-cell">
                    {emp.email && (
                      <a
                        href={`mailto:${emp.email}`}
                        className="emp-contact-item emp-contact-link"
                        title={`Email: ${emp.email}`}
                      >
                        <Mail size={12} style={{ flexShrink: 0 }} />
                        <span className="truncate-text">{emp.email}</span>
                      </a>
                    )}
                    {emp.phone && (
                      <span className="emp-contact-item" title={`Phone: ${emp.phone}`}>
                        <Phone size={12} style={{ flexShrink: 0 }} />
                        <span className="truncate-text">{emp.phone}</span>
                      </span>
                    )}
                  </div>
                </td>
                <td className="col-emp-actions" style={{ textAlign: 'right' }}>
                  <div className="action-btn-group">
                    <TableActionBtn
                      icon={Eye}
                      onClick={() => handleOpenDetailModal(emp)}
                      title="View Full Staff Profile"
                      id={`view-btn-${emp.employeeId}`}
                    />
                    {isAdmin && (
                      <>
                        <TableActionBtn
                          icon={Edit2}
                          onClick={() => handleOpenEditModal(emp)}
                          title="Edit Staff Record"
                          id={`edit-btn-${emp.employeeId}`}
                        />
                        <TableActionBtn
                          icon={Trash2}
                          onClick={() => handleDeleteEmployee(emp.employeeId, emp.name)}
                          title="Deactivate Staff Account"
                          id={`delete-btn-${emp.employeeId}`}
                          style={{ color: 'var(--status-danger-text)' }}
                        />
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>

      {/* Progressive Load More Data Control */}
      {employees.length > 0 && (
        <LoadMoreButton
          currentCount={employees.length}
          totalCount={totalCount}
          loading={loadingMore}
          onLoadMore={handleLoadMore}
          error={loadMoreError}
          onRetry={handleLoadMore}
          itemName="staff members"
          id="load-more-employees-btn"
        />
      )}

      {/* Employee Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Staff Custody Profile"
        subtitle={`Official record for ${selectedEmployee?.name || 'Staff Member'} (${selectedEmployee?.employeeId || ''})`}
        size="md"
        id="employee-detail-modal"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsDetailModalOpen(false)}
              id="close-employee-detail-btn"
            >
              Close
            </button>
            {isAdmin && selectedEmployee && (
              <button
                type="button"
                className="btn btn-primary"
                id="edit-from-detail-btn"
                onClick={() => {
                  const empToEdit = selectedEmployee;
                  setIsDetailModalOpen(false);
                  handleOpenEditModal(empToEdit);
                }}
              >
                <Edit2 size={14} />
                <span>Edit Profile</span>
              </button>
            )}
          </>
        }
      >
        {selectedEmployee && (
          <div className="employee-detail-content">
            <div className="employee-profile-card">
              <div className="employee-profile-avatar">
                {selectedEmployee.name
                  ? selectedEmployee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                  : 'EM'}
              </div>
              <div className="employee-profile-meta">
                <h3 className="employee-profile-name">{selectedEmployee.name}</h3>
                <div className="employee-profile-role">{selectedEmployee.designation || 'Staff Officer'}</div>
                <div className="employee-profile-badges">
                  <span className="badge badge-assigned" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                    {selectedEmployee.employeeId}
                  </span>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: selectedEmployee.employeeType === 'Contract' ? '#EDE9FE' : '#DBEAFE',
                      color: selectedEmployee.employeeType === 'Contract' ? '#6D28D9' : '#1D4ED8',
                      border: `1px solid ${selectedEmployee.employeeType === 'Contract' ? '#C4B5FD' : '#93C5FD'}`,
                      fontWeight: 700
                    }}
                  >
                    {selectedEmployee.employeeType || 'AAI'} &bull; {selectedEmployee.employmentCategory || 'Regular'}
                  </span>
                  <span className="badge badge-neutral">
                    {selectedEmployee.assignedAssetsCount || 0} Assets Custodied
                  </span>
                  <span className="badge badge-available">
                    Active Roster
                  </span>
                </div>
              </div>
            </div>

            <div className="employee-info-grid">
              <div className="employee-info-item">
                <span className="employee-info-label">Employment Type &amp; Category</span>
                <span className="employee-info-value">
                  <Users size={15} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                  <strong>{selectedEmployee.employeeType || 'AAI'}</strong> &mdash; {selectedEmployee.employmentCategory || 'Regular'}
                </span>
              </div>

              {selectedEmployee.contractorName && (
                <div className="employee-info-item">
                  <span className="employee-info-label">Contractor / Agency</span>
                  <span className="employee-info-value">
                    <Building2 size={15} color="#7C3AED" style={{ flexShrink: 0 }} />
                    <strong style={{ color: '#7C3AED' }}>{selectedEmployee.contractorName}</strong>
                  </span>
                </div>
              )}

              <div className="employee-info-item">
                <span className="employee-info-label">Department</span>
                <span className="employee-info-value">
                  <Building2 size={15} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                  {selectedEmployee.department || 'Not Assigned'}
                </span>
              </div>

              <div className="employee-info-item">
                <span className="employee-info-label">Seating / Floor Location</span>
                <span className="employee-info-value">
                  <MapPin size={15} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                  {selectedEmployee.floor || 'Not Specified'}
                </span>
              </div>

              <div className="employee-info-item">
                <span className="employee-info-label">Official Email</span>
                <span className="employee-info-value">
                  <Mail size={15} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                  {selectedEmployee.email ? (
                    <a
                      href={`mailto:${selectedEmployee.email}`}
                      style={{ color: 'var(--color-brand-600)', textDecoration: 'underline' }}
                    >
                      {selectedEmployee.email}
                    </a>
                  ) : (
                    'Not Available'
                  )}
                </span>
              </div>

              <div className="employee-info-item">
                <span className="employee-info-label">Official Contact / Phone</span>
                <span className="employee-info-value">
                  <Phone size={15} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                  {selectedEmployee.phone || 'Not Available'}
                </span>
              </div>
            </div>

            {/* Account & Login Management (Admin only) */}
            {isAdmin && (
              <div style={{
                marginTop: '16px',
                padding: '14px 16px',
                backgroundColor: 'var(--color-bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <KeyRound size={16} color="var(--color-brand-600)" />
                    <strong style={{ fontSize: '0.86rem', color: 'var(--color-text-main)' }}>
                      Login Account & Access Controls
                    </strong>
                  </div>

                  {accountLoading ? (
                    <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>Checking status...</span>
                  ) : accountStatus?.hasAccount ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={`badge ${accountStatus.isActive ? 'badge-available' : 'badge-maintenance'}`} style={{ fontSize: '0.68rem' }}>
                        {accountStatus.isActive ? '● Login Active' : '○ Login Disabled'}
                      </span>
                    </div>
                  ) : (
                    <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>
                      No Login Account
                    </span>
                  )}
                </div>

                {accountLoading ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Loading account details...</div>
                ) : accountStatus?.hasAccount ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '0.8rem' }}>
                      <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Username: </span>
                        <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-brand-600)' }}>
                          {accountStatus.username || selectedEmployee.employeeId}
                        </strong>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          id="btn-reset-password"
                          disabled={accountActionLoading}
                          onClick={handleResetPassword}
                          title="Generate a new strong temporary password for this user"
                        >
                          <KeyRound size={13} />
                          <span>Reset Password</span>
                        </button>

                        {accountStatus.isActive ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            id="btn-disable-login"
                            style={{ color: 'var(--status-danger-text)' }}
                            disabled={accountActionLoading}
                            onClick={() => handleToggleLogin(false)}
                            title="Prevent this user from logging in"
                          >
                            <UserX size={13} />
                            <span>Disable Login</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            id="btn-enable-login"
                            disabled={accountActionLoading}
                            onClick={() => handleToggleLogin(true)}
                            title="Re-activate this user's login access"
                          >
                            <UserCheck size={13} />
                            <span>Enable Login</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Reset Password Result Confirmation Banner */}
                    {resetPasswordResult && (
                      <div style={{
                        padding: '12px 14px',
                        backgroundColor: 'var(--color-bg-card)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-brand-600)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--status-available-text)', fontWeight: 700, fontSize: '0.8rem' }}>
                            <CheckCircle2 size={15} />
                            <span>NEW TEMPORARY PASSWORD GENERATED</span>
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            id="btn-copy-reset-password"
                            style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                            onClick={() => handleCopyCredentials(resetPasswordResult.tempPassword, 'reset')}
                          >
                            {copiedState === 'reset' ? (
                              <>
                                <Check size={12} color="var(--status-available-text)" />
                                <span style={{ color: 'var(--status-available-text)' }}>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copy Password</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <code style={{
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--color-bg-subtle)',
                            border: '1px solid var(--border-subtle)',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            fontSize: '0.98rem',
                            color: 'var(--color-brand-600)',
                            letterSpacing: '0.5px'
                          }}>
                            {resetPasswordResult.tempPassword}
                          </code>
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                            Share with employee. This password will not be shown again.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      This staff member does not have an active login account.
                    </span>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      id="btn-create-login"
                      disabled={accountActionLoading}
                      onClick={handleCreateLogin}
                    >
                      <Plus size={13} />
                      <span>Create Login Account</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Assigned Custody Equipment */}
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
                <strong style={{ fontSize: '0.85rem', color: 'var(--color-brand-title)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Laptop size={15} color="var(--color-brand-600)" />
                  <span>Assigned Hardware & Equipment</span>
                </strong>
                <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                  {empAssets.filter(a => a.status === 'ACTIVE').length} Active
                </span>
              </div>

              {empAssetsLoading ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', padding: '8px 0' }}>Loading custody records...</div>
              ) : empAssets.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', padding: '8px 0' }}>No equipment assigned to this staff member.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                  {empAssets.map((item, idx) => (
                    <div
                      key={item.assignmentId || idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 10px',
                        background: 'var(--color-bg-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.78rem'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong style={{ fontFamily: 'monospace', color: 'var(--color-brand-600)' }}>{item.assetId}</strong>
                          <span className={`badge ${item.status === 'ACTIVE' ? 'badge-available' : 'badge-neutral'}`} style={{ fontSize: '0.62rem' }}>
                            {item.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          {item.assetName || 'Equipment'} &bull; Since: {new Date(item.assignedDate).toLocaleDateString()}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDownloadSlip(item.assignmentId)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                        title="Download Official Handover Slip (PDF)"
                      >
                        <FileText size={12} />
                        <span>Slip</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Create / Edit Modal Dialog */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'CREATE' ? 'Register New Staff Officer' : `Edit Employee: ${currentEmpId}`}
        subtitle="Staff metadata will be cross-referenced with asset custody tags and handover slips"
        size="md"
        id="employee-modal"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              id="submit-employee-btn"
              disabled={formSubmitting}
              onClick={handleFormSubmit}
            >
              {formSubmitting ? 'Saving...' : modalMode === 'CREATE' ? 'Register Staff' : 'Save Changes'}
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

        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Employee ID *</label>
              <input
                type="text"
                required
                className="form-input"
                disabled={modalMode === 'EDIT'}
                placeholder="e.g. AAI-10940"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                id="modal-employee-id"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Staff Name *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="Full User Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                id="modal-employee-name"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Designation *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Senior Manager (CNS)"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                id="modal-employee-designation"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Department *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. CNS, IT Department, Finance"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                id="modal-employee-department"
              />
            </div>
          </div>

          {/* Employment Classification */}
          <div style={{
            background: 'var(--color-bg-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)'
          }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--color-brand-600)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Employment Classification
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label">Employee Type *</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      employeeType: 'AAI',
                      employmentCategory: formData.employmentCategory === 'Contractual' || formData.employmentCategory === 'Outsourced' ? 'Regular' : formData.employmentCategory,
                      contractorName: ''
                    })}
                    className="btn btn-sm"
                    style={{
                      flex: 1,
                      backgroundColor: formData.employeeType === 'AAI' ? 'var(--color-brand-600)' : 'var(--color-bg-surface)',
                      color: formData.employeeType === 'AAI' ? '#ffffff' : 'var(--color-text-main)',
                      border: `1px solid ${formData.employeeType === 'AAI' ? 'var(--color-brand-600)' : 'var(--border-subtle)'}`,
                      fontWeight: formData.employeeType === 'AAI' ? 700 : 500
                    }}
                    id="btn-emp-type-aai"
                  >
                    AAI Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      employeeType: 'Contract',
                      employmentCategory: formData.employmentCategory === 'Regular' || formData.employmentCategory === 'Deputation' ? 'Contractual' : formData.employmentCategory
                    })}
                    className="btn btn-sm"
                    style={{
                      flex: 1,
                      backgroundColor: formData.employeeType === 'Contract' ? '#7C3AED' : 'var(--color-bg-surface)',
                      color: formData.employeeType === 'Contract' ? '#ffffff' : 'var(--color-text-main)',
                      border: `1px solid ${formData.employeeType === 'Contract' ? '#7C3AED' : 'var(--border-subtle)'}`,
                      fontWeight: formData.employeeType === 'Contract' ? 700 : 500
                    }}
                    id="btn-emp-type-contract"
                  >
                    Contract / Outsourced
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Employment Category *</label>
                <select
                  className="form-select"
                  value={formData.employmentCategory}
                  onChange={(e) => setFormData({ ...formData, employmentCategory: e.target.value })}
                  id="modal-employment-category"
                >
                  {formData.employeeType === 'AAI' ? (
                    <>
                      <option value="Regular">Regular / Permanent</option>
                      <option value="Deputation">On Deputation</option>
                      <option value="Intern">Trainee / Intern</option>
                      <option value="Casual">Casual / Temporary</option>
                    </>
                  ) : (
                    <>
                      <option value="Contractual">Contractual Staff</option>
                      <option value="Outsourced">Outsourced Vendor Personnel</option>
                      <option value="Casual">Casual / Ad-hoc</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {formData.employeeType === 'Contract' && (
              <div className="form-group" style={{ marginTop: '4px' }}>
                <label className="form-label">Contractor / Vendor Agency Name *</label>
                <input
                  type="text"
                  required={formData.employeeType === 'Contract'}
                  className="form-input"
                  placeholder="e.g. Skyline IT Solutions / M/s TechServices"
                  value={formData.contractorName}
                  onChange={(e) => setFormData({ ...formData, contractorName: e.target.value })}
                  id="modal-contractor-name"
                />
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Office Floor / Seating Location *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. 1st Floor, CNS Block, Cabin 104"
              value={formData.floor}
              onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
              id="modal-employee-floor"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Official Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="staff.name@aai.aero"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                id="modal-employee-email"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact / Extension Phone</label>
              <input
                type="tel"
                className="form-input"
                placeholder="+91 11 24632950"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                id="modal-employee-phone"
              />
            </div>
          </div>

          {modalMode === 'CREATE' && (
            <div style={{
              padding: '12px 14px',
              backgroundColor: 'var(--color-bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                <input
                  type="checkbox"
                  checked={formData.createLoginAccount}
                  onChange={(e) => setFormData({ ...formData, createLoginAccount: e.target.checked })}
                  id="chk-create-login-account"
                  style={{ width: '16px', height: '16px', accentColor: 'var(--color-brand-600)' }}
                />
                <span>Create Login Account Automatically</span>
              </label>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '24px' }}>
                System will generate a User account with Username matching Employee ID and a strong temporary password.
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Confirmation Modal: Employee Account Created */}
      <Modal
        isOpen={Boolean(createdAccountModalData)}
        onClose={() => setCreatedAccountModalData(null)}
        title="EMPLOYEE ACCOUNT CREATED"
        subtitle="Automatic User Login Account Generated for Airports Authority of India"
        size="md"
        id="employee-created-modal"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
              Password will not be displayed again once closed.
            </span>
            <button
              type="button"
              className="btn btn-primary"
              id="btn-close-created-modal"
              onClick={() => setCreatedAccountModalData(null)}
            >
              Done
            </button>
          </div>
        }
      >
        {createdAccountModalData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              padding: '12px 16px',
              backgroundColor: 'var(--status-available-bg)',
              borderColor: 'var(--status-available-border)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: 'var(--status-available-text)'
            }}>
              <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                Employee master record and active login account created successfully.
              </div>
            </div>

            <div className="card" style={{
              padding: '16px 20px',
              backgroundColor: 'var(--color-bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', fontSize: '0.86rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Employee:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>{createdAccountModalData.name}</span>

                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Employee ID:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-brand-600)' }}>
                  {createdAccountModalData.employeeId}
                </span>

                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Username:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-brand-600)' }}>
                  {createdAccountModalData.username}
                </span>

                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Temporary Password:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <code style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-bg-card)',
                    border: '1px solid var(--border-subtle)',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: 'var(--color-brand-600)',
                    letterSpacing: '0.5px'
                  }}>
                    {createdAccountModalData.tempPassword}
                  </code>
                </div>
              </div>

              <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  id="btn-copy-credentials"
                  onClick={() => handleCopyCredentials(
`Airports Authority of India - Asset Management System
Employee: ${createdAccountModalData.name}
Employee ID: ${createdAccountModalData.employeeId}
Username: ${createdAccountModalData.username}
Temporary Password: ${createdAccountModalData.tempPassword}
Login URL: ${window.location.origin}/login`,
                    'create'
                  )}
                >
                  {copiedState === 'create' ? (
                    <>
                      <Check size={14} color="var(--status-available-text)" />
                      <span style={{ color: 'var(--status-available-text)' }}>Credentials Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Credentials</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
              Provide these credentials to the employee. They can sign in at <strong>/login</strong> using either their Employee ID or Username.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
