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
  History
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

  // Detail Modal State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [empAssets, setEmpAssets] = useState([]);
  const [empAssetsLoading, setEmpAssetsLoading] = useState(false);

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
    phone: ''
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
  }, [search, selectedDept, selectedFloor, token]);

  const handleOpenDetailModal = async (emp) => {
    setSelectedEmployee(emp);
    setIsDetailModalOpen(true);
    setEmpAssetsLoading(true);
    setEmpAssets([]);

    try {
      const res = await fetch(`/api/v1/assignments/employee/${emp.employeeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setEmpAssets(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load employee assigned assets:', err);
    } finally {
      setEmpAssetsLoading(false);
    }
  };

  const handleDownloadSlip = async (assignmentId) => {
    try {
      await downloadAuthenticatedPdf(
        `/api/v1/export/handover/${assignmentId}/pdf`,
        `AAI_Handover_${assignmentId}.pdf`
      );
    } catch (err) {
      alert(err.message || 'Failed to download handover slip');
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
      phone: ''
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
      phone: emp.phone || ''
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
      setNotification({
        type: 'success',
        message: modalMode === 'CREATE' ? 'Staff member registered successfully' : 'Employee profile updated'
      });
      setTimeout(() => setNotification(null), 4000);
      fetchEmployees(1, false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
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
          gridTemplateColumns: hasActiveFilters ? '2fr 1.2fr auto' : '2fr 1.2fr auto',
          gap: 'var(--space-2)',
          alignItems: 'center'
        }}>
          <SearchInput
            placeholder="Search by Employee ID, Name, or Designation..."
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
            <th className="col-emp-desig">Designation</th>
            <th className="col-emp-dept">Department & Location</th>
            <th className="col-emp-assets">Assigned Assets</th>
            <th className="col-emp-contact">Contact Details</th>
            <th className="col-emp-actions" style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-4)' }}>
                <div className="pulse-dot" style={{ margin: '0 auto var(--space-3)' }} />
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Loading staff records...</span>
              </td>
            </tr>
          ) : employees.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No staff members match criteria"
              description="Try adjusting your search query or filter selections to view all registered personnel."
              colSpan={7}
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
        </form>
      </Modal>
    </div>
  );
}
