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
  LifeBuoy,
  Cpu,
  Monitor,
  Zap,
  Network,
  HardDrive,
  Link as LinkIcon,
  Unlink,
  Layers,
  Tag,
  Shield,
  Building2,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Activity
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { SearchInput, SelectInput, ClearFilterButton } from '../components/ui/FormControls';
import { DataTable, TableActionBtn } from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import LoadMoreButton from '../components/ui/LoadMoreButton';
import { downloadAuthenticatedPdf, verificationApi } from '../services/api';

/**
 * Canonical Category -> Asset Type mapping for AAI AMS.
 * Categorically distinguishes broad business classifications from equipment types.
 */
export const CANONICAL_CATEGORY_MAP = {
  'IT Equipment': [
    { key: 'DESKTOP', label: 'Desktop Workstation / PC' },
    { key: 'LAPTOP', label: 'Laptop / Notebook' },
    { key: 'WORKSTATION', label: 'High-Performance Workstation' },
    { key: 'SERVER', label: 'Enterprise Server' },
    { key: 'MONITOR', label: 'Display Screen / Monitor' },
    { key: 'STORAGE', label: 'Storage Subsystem (NAS / SAN / DAS)' },
    { key: 'THIN_CLIENT', label: 'Thin Client Terminal' }
  ],
  'Networking': [
    { key: 'NETWORK', label: 'Network Equipment (Generic)' },
    { key: 'SWITCH', label: 'Network Switch' },
    { key: 'ROUTER', label: 'Router / Gateway' },
    { key: 'FIREWALL', label: 'Firewall / UTM Appliance' },
    { key: 'ACCESS_POINT', label: 'Wireless Access Point' },
    { key: 'MODEM', label: 'Modem / ADSL / Cable' }
  ],
  'Power': [
    { key: 'UPS', label: 'Uninterruptible Power Supply (UPS)' },
    { key: 'BATTERY_BANK', label: 'Battery Bank / Inverter' },
    { key: 'STABILIZER', label: 'Voltage Stabilizer / AVR' },
    { key: 'PDU', label: 'Power Distribution Unit (PDU)' }
  ],
  'Printing': [
    { key: 'PRINTER', label: 'Printer (Laser / Inkjet / Dot Matrix)' },
    { key: 'SCANNER', label: 'Scanner (Sheetfed / Flatbed)' },
    { key: 'MULTIFUNCTION_PRINTER', label: 'Multifunction / All-in-One Printer' },
    { key: 'PLOTTER', label: 'Plotter / Wide Format Printer' }
  ],
  'Communication': [
    { key: 'INTERCOM', label: 'Intercom System / EPABX Terminal' },
    { key: 'TELEPHONE', label: 'Telephone / IP Phone' },
    { key: 'COMMUNICATION_DEVICE', label: 'Communication Device (Generic)' },
    { key: 'RADIO', label: 'Radio / VHF Equipment' }
  ],
  'Surveillance': [
    { key: 'CCTV', label: 'CCTV Camera' },
    { key: 'DVR_NVR', label: 'DVR / NVR Recorder' },
    { key: 'ACCESS_CONTROL', label: 'Access Control System' },
    { key: 'BIOMETRIC', label: 'Biometric Attendance Terminal' }
  ],
  'Office Equipment': [
    { key: 'PROJECTOR', label: 'Projector / Presentation Display' },
    { key: 'PERIPHERAL', label: 'Peripheral Device' },
    { key: 'SHREDDER', label: 'Document Shredder' },
    { key: 'LAMINATOR', label: 'Laminator' },
    { key: 'BINDING', label: 'Binding Machine' }
  ],
  'Furniture': [
    { key: 'OTHER', label: 'Furniture / Fixture Item' }
  ],
  'Other': [
    { key: 'OTHER', label: 'Other Operational Equipment' }
  ]
};

export const getAssetTypesForCategory = (catName = '') => {
  if (!catName) return CANONICAL_CATEGORY_MAP['IT Equipment'];
  if (CANONICAL_CATEGORY_MAP[catName]) return CANONICAL_CATEGORY_MAP[catName];
  const lower = catName.toLowerCase();
  for (const [cat, types] of Object.entries(CANONICAL_CATEGORY_MAP)) {
    if (cat.toLowerCase() === lower) return types;
  }
  if (lower.includes('desktop') || lower.includes('pc') || lower.includes('laptop') || lower.includes('server') || lower.includes('monitor') || lower.includes('workstation')) {
    return CANONICAL_CATEGORY_MAP['IT Equipment'];
  }
  if (lower.includes('printer') || lower.includes('scanner') || lower.includes('plotter')) {
    return CANONICAL_CATEGORY_MAP['Printing'];
  }
  if (lower.includes('power') || lower.includes('ups') || lower.includes('battery')) {
    return CANONICAL_CATEGORY_MAP['Power'];
  }
  if (lower.includes('network') || lower.includes('switch') || lower.includes('router') || lower.includes('firewall')) {
    return CANONICAL_CATEGORY_MAP['Networking'];
  }
  if (lower.includes('intercom') || lower.includes('phone') || lower.includes('communication')) {
    return CANONICAL_CATEGORY_MAP['Communication'];
  }
  if (lower.includes('cctv') || lower.includes('surveillance') || lower.includes('biometric')) {
    return CANONICAL_CATEGORY_MAP['Surveillance'];
  }
  if (lower.includes('projector') || lower.includes('shredder') || lower.includes('office')) {
    return CANONICAL_CATEGORY_MAP['Office Equipment'];
  }
  return CANONICAL_CATEGORY_MAP['Other'];
};

export default function AssetInventory() {
  const { user, token } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [locationsList, setLocationsList] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);
  const [assetTypesList, setAssetTypesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(null);

  // Search & Multi-Facet Filter State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedWarranty, setSelectedWarranty] = useState('');
  const [selectedAmc, setSelectedAmc] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  // Modals & Drawer State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerModalTab, setRegisterModalTab] = useState('general');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeAsset, setActiveAsset] = useState(null);
  const [drawerTab, setDrawerTab] = useState('overview'); // 'overview' | 'specs' | 'components' | 'timeline'

  // Extended Drawer State (Custody History, Tickets, Relationships, Timeline)
  const [drawerHistory, setDrawerHistory] = useState([]);
  const [drawerComplaints, setDrawerComplaints] = useState([]);
  const [drawerComponents, setDrawerComponents] = useState([]);
  const [drawerParent, setDrawerParent] = useState(null);
  const [drawerTimeline, setDrawerTimeline] = useState([]);
  const [drawerHistoryLoading, setDrawerHistoryLoading] = useState(false);
  const [timelineCategoryFilter, setTimelineCategoryFilter] = useState('ALL');

  // Component Linking Modal State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkCandidateId, setLinkCandidateId] = useState('');
  const [linkRelType, setLinkRelType] = useState('ATTACHED_COMPONENT');
  const [linkNotes, setLinkNotes] = useState('');
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [linkModalError, setLinkModalError] = useState('');

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
  const [editModalTab, setEditModalTab] = useState('general');
  const [editFormData, setEditFormData] = useState(null);
  const [editFormError, setEditFormError] = useState('');
  const [editFormSubmitting, setEditFormSubmitting] = useState(false);

  // Form State for New Asset
  const [formData, setFormData] = useState({
    assetId: '',
    assetName: '',
    assetType: 'DESKTOP',
    oldAssetId: '',
    category: 'IT Equipment',
    make: '',
    model: '',
    serialNumber: '',
    supplier: '',
    supplyOrderNumber: '',
    purchaseDate: '',
    purchaseCost: '',
    installDate: new Date().toISOString().split('T')[0],
    warrantyStartDate: new Date().toISOString().split('T')[0],
    warrantyEndDate: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amcApplicable: false,
    amcContractId: '',
    operatingSystem: 'Windows 11 Enterprise',
    osVersion: '23H2',
    department: '',
    location: 'Chennai Airport',
    floor: '',
    room: '',
    intercom: '',
    ipAddress: '',
    macAddress: '',
    remarks: '',
    status: 'AVAILABLE',
    condition: 'EXCELLENT',
    currentEmployeeId: '',
    computerConfig: {
      processor: '',
      ramSizeGb: 16,
      storageCapacityGb: 512,
      storageType: 'SSD',
      hostname: ''
    },
    displayConfig: {
      screenSizeInches: 24,
      resolution: '1920x1080',
      displayType: 'IPS'
    },
    powerConfig: {
      capacityVa: 1000,
      backupTimeMinutes: 15,
      topology: 'Line-Interactive'
    }
  });
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const fetchFiltersMaster = async () => {
    try {
      const [catRes, empRes, deptRes, locRes, vendRes, typeRes] = await Promise.all([
        fetch('/api/v1/master/categories', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/employees?limit=200', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/master/departments', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/master/locations', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/master/vendors', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/master/asset-types', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const [catData, empData, deptData, locData, vendData, typeData] = await Promise.all([
        catRes.json(), empRes.json(), deptRes.json(), locRes.json(), vendRes.json(), typeRes.json()
      ]);

      if (catData.success) setCategories(catData.data || []);
      if (empData.success) setEmployees(empData.data || []);
      if (deptData.success) setDepartmentsList(deptData.data || []);
      if (locData.success) setLocationsList(locData.data || []);
      if (vendData.success) setVendorsList(vendData.data || []);
      if (typeData.success) setAssetTypesList(typeData.data || []);
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
      if (selectedAssetType) params.append('assetType', selectedAssetType);
      if (selectedDept) params.append('department', selectedDept);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedWarranty) params.append('warrantyStatus', selectedWarranty);
      if (selectedAmc) params.append('amcApplicable', selectedAmc);
      if (selectedVendor) params.append('supplier', selectedVendor);
      if (selectedLocation) params.append('location', selectedLocation);

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
  }, [search, selectedCategory, selectedAssetType, selectedDept, selectedStatus, selectedWarranty, selectedAmc, selectedVendor, selectedLocation, token]);

  const deriveAssetTypeFromCategory = (catName = '') => {
    const cat = (catName || '').toLowerCase();
    if (cat.includes('desktop') || cat.includes('pc') || cat.includes('workstation')) return 'DESKTOP';
    if (cat.includes('laptop') || cat.includes('notebook')) return 'LAPTOP';
    if (cat.includes('printer')) return 'PRINTER';
    if (cat.includes('scanner')) return 'SCANNER';
    if (cat.includes('ups') || cat.includes('power')) return 'UPS';
    if (cat.includes('monitor') || cat.includes('display')) return 'MONITOR';
    if (cat.includes('server')) return 'SERVER';
    if (cat.includes('switch') || cat.includes('router') || cat.includes('network') || cat.includes('firewall')) return 'NETWORK';
    if (cat.includes('projector')) return 'PROJECTOR';
    if (cat.includes('storage') || cat.includes('nas') || cat.includes('san')) return 'STORAGE';
    if (cat.includes('keyboard') || cat.includes('mouse') || cat.includes('peripheral')) return 'PERIPHERAL';
    return 'OTHER';
  };

  const isPeripheralCategory = (catName) => {
    if (!catName) return false;
    const lower = catName.toLowerCase();
    return ['printer', 'scanner', 'monitor', 'ups', 'switch', 'router', 'projector'].some(p => lower.includes(p));
  };

  const handleCategoryChange = (catName, isEdit = false) => {
    const isPeripheral = isPeripheralCategory(catName);
    const availableTypes = getAssetTypesForCategory(catName);
    const defaultType = availableTypes[0]?.key || 'OTHER';
    if (isEdit) {
      setEditFormData(prev => ({
        ...prev,
        category: catName,
        assetType: availableTypes.some(t => t.key === prev?.assetType) ? prev.assetType : defaultType,
        operatingSystem: isPeripheral ? 'N/A' : (prev.operatingSystem === 'N/A' ? 'Windows 11 Enterprise' : prev.operatingSystem),
        osVersion: isPeripheral ? '' : (prev.osVersion || '23H2')
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        category: catName,
        assetType: defaultType,
        operatingSystem: isPeripheral ? 'N/A' : (prev.operatingSystem === 'N/A' ? 'Windows 11 Enterprise' : prev.operatingSystem),
        osVersion: isPeripheral ? '' : (prev.osVersion || '23H2')
      }));
    }
  };

  const handleOpenEditModal = (asset) => {
    const catTypes = getAssetTypesForCategory(asset.category);
    const initialType = asset.assetType || catTypes[0]?.key || 'OTHER';
    setEditFormData({
      assetId: asset.assetId,
      assetName: asset.assetName,
      assetType: initialType,
      oldAssetId: asset.oldAssetId || '',
      category: asset.category,
      make: asset.make,
      model: asset.model,
      serialNumber: asset.serialNumber,
      supplier: asset.supplier || asset.vendor || '',
      supplyOrderNumber: asset.supplyOrderNumber || '',
      purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : '',
      purchaseCost: asset.purchaseCost || '',
      installDate: asset.installDate ? new Date(asset.installDate).toISOString().split('T')[0] : '',
      warrantyStartDate: asset.warrantyStartDate ? new Date(asset.warrantyStartDate).toISOString().split('T')[0] : '',
      warrantyEndDate: asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toISOString().split('T')[0] : '',
      amcApplicable: Boolean(asset.amcApplicable),
      amcContractId: asset.amcContractId || '',
      operatingSystem: asset.computerConfig?.operatingSystem || asset.operatingSystem || 'N/A',
      osVersion: asset.computerConfig?.osVersion || asset.osVersion || '',
      department: asset.department,
      location: asset.location || 'Chennai Airport',
      floor: asset.floor,
      room: asset.room || '',
      intercom: asset.intercom || '',
      ipAddress: asset.networkConfig?.ipAddress || asset.ipAddress || '',
      macAddress: asset.networkConfig?.macAddress || asset.macAddress || '',
      status: asset.status || 'AVAILABLE',
      condition: asset.condition || 'GOOD',
      remarks: asset.remarks || '',
      computerConfig: asset.computerConfig || {
        processor: '',
        ramSizeGb: 16,
        storageCapacityGb: 512,
        storageType: 'SSD',
        hostname: ''
      },
      displayConfig: asset.displayConfig || {
        screenSizeInches: 24,
        resolution: '1920x1080',
        displayType: 'IPS'
      },
      powerConfig: asset.powerConfig || {
        capacityVa: 1000,
        backupTimeMinutes: 15,
        topology: 'Line-Interactive'
      }
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
      const res = await fetch(`/api/v1/assets/${editFormData.assetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...editFormData,
          computerConfig: {
            ...editFormData.computerConfig,
            operatingSystem: editFormData.operatingSystem,
            osVersion: editFormData.osVersion
          },
          networkConfig: {
            ipAddress: editFormData.ipAddress,
            macAddress: editFormData.macAddress
          }
        })
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
      assetType: 'DESKTOP',
      oldAssetId: '',
      category: categories[0]?.name || 'Desktop PC',
      make: '',
      model: '',
      serialNumber: '',
      supplier: vendorsList[0]?.name || '',
      supplyOrderNumber: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      purchaseCost: '',
      installDate: new Date().toISOString().split('T')[0],
      warrantyStartDate: new Date().toISOString().split('T')[0],
      warrantyEndDate: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amcApplicable: false,
      amcContractId: '',
      operatingSystem: 'Windows 11 Enterprise',
      osVersion: '23H2',
      department: departmentsList[0]?.name || 'Information Technology',
      location: locationsList[0]?.name || 'Chennai Airport',
      floor: '',
      room: '',
      intercom: '',
      ipAddress: '',
      macAddress: '',
      remarks: '',
      status: 'AVAILABLE',
      condition: 'EXCELLENT',
      currentEmployeeId: '',
      computerConfig: {
        processor: '',
        ramSizeGb: 16,
        storageCapacityGb: 512,
        storageType: 'SSD',
        hostname: ''
      },
      displayConfig: {
        screenSizeInches: 24,
        resolution: '1920x1080',
        displayType: 'IPS'
      },
      powerConfig: {
        capacityVa: 1000,
        backupTimeMinutes: 15,
        topology: 'Line-Interactive'
      }
    });
    setRegisterModalTab('general');
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
        body: JSON.stringify({
          ...formData,
          computerConfig: {
            ...formData.computerConfig,
            operatingSystem: formData.operatingSystem,
            osVersion: formData.osVersion
          },
          networkConfig: {
            ipAddress: formData.ipAddress,
            macAddress: formData.macAddress
          }
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to register asset');
      }

      setIsRegisterModalOpen(false);
      setNotification({
        type: 'success',
        message: `Asset '${data.data.assetId}' registered with rich common specifications!`
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
    setDrawerTab('overview');
    setDrawerHistoryLoading(true);
    setDrawerHistory([]);
    setDrawerComplaints([]);
    setDrawerComponents([]);
    setDrawerParent(null);
    setDrawerTimeline([]);

    try {
      const [histRes, compRes, relCompRes, relParRes, timeRes] = await Promise.all([
        fetch(`/api/v1/assignments/asset/${asset.assetId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/v1/complaints/asset/${asset.assetId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/v1/relationships/components/${asset.assetId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/v1/relationships/parent/${asset.assetId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/v1/assets/${asset.assetId}/timeline`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const [histData, compData, relCompData, relParData, timeData] = await Promise.all([
        histRes.json(),
        compRes.json(),
        relCompRes.json(),
        relParRes.json(),
        timeRes.json()
      ]);

      if (histData.success) setDrawerHistory(histData.data || []);
      if (compData.success) setDrawerComplaints(compData.data || []);
      if (relCompData.success) setDrawerComponents(relCompData.data?.components || []);
      if (relParData.success) setDrawerParent(relParData.data?.parent || null);
      if (timeData.success) setDrawerTimeline(timeData.data?.timeline || []);
    } catch (err) {
      console.error('Failed to load asset drawer extended history:', err);
    } finally {
      setDrawerHistoryLoading(false);
    }
  };

  const handleUnlinkComponent = async (childAssetId) => {
    if (!window.confirm(`Are you sure you want to unlink component ${childAssetId} from workstation ${activeAsset.assetId}?`)) {
      return;
    }

    try {
      const res = await fetch('/api/v1/relationships/unlink', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          parentAssetId: activeAsset.assetId,
          childAssetId,
          reason: 'Component detached via AMS Technical Drawer'
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to unlink component');
      }

      setNotification({
        type: 'success',
        message: `Component ${childAssetId} detached successfully.`
      });
      setTimeout(() => setNotification(null), 4000);

      // Refresh drawer components
      const relRes = await fetch(`/api/v1/relationships/components/${activeAsset.assetId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const relData = await relRes.json();
      if (relData.success) setDrawerComponents(relData.data?.components || []);
      fetchAssets(page);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenLinkModal = () => {
    setLinkCandidateId('');
    setLinkRelType('ATTACHED_COMPONENT');
    setLinkNotes('');
    setLinkModalError('');
    setIsLinkModalOpen(true);
  };

  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    if (!linkCandidateId) {
      setLinkModalError('Please select or specify an asset to attach.');
      return;
    }
    setLinkSubmitting(true);
    setLinkModalError('');

    try {
      const res = await fetch('/api/v1/relationships/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          parentAssetId: activeAsset.assetId,
          childAssetId: linkCandidateId,
          relationshipType: linkRelType,
          notes: linkNotes || 'Attached via Technical Assembly Workspace'
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to attach component');
      }

      setIsLinkModalOpen(false);
      setNotification({
        type: 'success',
        message: `Component ${linkCandidateId} attached to ${activeAsset.assetId} successfully.`
      });
      setTimeout(() => setNotification(null), 4000);

      // Refresh drawer components
      const relRes = await fetch(`/api/v1/relationships/components/${activeAsset.assetId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const relData = await relRes.json();
      if (relData.success) setDrawerComponents(relData.data?.components || []);
      fetchAssets(page);
    } catch (err) {
      setLinkModalError(err.message);
    } finally {
      setLinkSubmitting(false);
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
    setSelectedAssetType('');
    setSelectedDept('');
    setSelectedStatus('');
    setSelectedWarranty('');
    setSelectedAmc('');
    setSelectedVendor('');
    setSelectedLocation('');
  };

  const hasActiveFilters = Boolean(
    search || selectedCategory || selectedAssetType || selectedDept || selectedStatus || selectedWarranty || selectedAmc || selectedVendor || selectedLocation
  );

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
          gap: '10px',
          background: notification.type === 'success' ? '#065F46' : '#991B1B',
          color: '#ffffff',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          fontSize: '0.875rem',
          fontWeight: 500,
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        icon={Boxes}
        title="Institutional Asset Registry"
        subtitle={`Centralized AAI IT inventory (${totalCount} operational equipment assets tracked)`}
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

      {/* Multi-Facet Filter Bar */}
      <div className="filter-bar" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {/* Row 1: Primary Search & Categorization */}
        <div style={{ display: 'grid', gridTemplateColumns: hasActiveFilters ? '2fr 1fr 1fr 1fr auto' : '2fr 1fr 1fr 1fr', gap: 'var(--space-2)', alignItems: 'center' }}>
          <SearchInput
            placeholder="Search Asset ID, Serial, Old ID, PO Number, Supplier, Room..."
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
            value={selectedAssetType}
            onChange={(e) => setSelectedAssetType(e.target.value)}
            id="asset-type-filter-select"
            placeholder="All Asset Types"
            options={[
              { value: 'DESKTOP', label: 'DESKTOP (PC Workstation)' },
              { value: 'LAPTOP', label: 'LAPTOP (Notebook)' },
              { value: 'PRINTER', label: 'PRINTER (MFP/Laser)' },
              { value: 'SCANNER', label: 'SCANNER' },
              { value: 'UPS', label: 'UPS (Power Backup)' },
              { value: 'MONITOR', label: 'MONITOR (Display)' },
              { value: 'SERVER', label: 'SERVER' },
              { value: 'NETWORK', label: 'NETWORK (Switch/Router)' },
              { value: 'STORAGE', label: 'STORAGE (NAS/SAN)' },
              { value: 'PERIPHERAL', label: 'PERIPHERAL' },
              { value: 'OTHER', label: 'OTHER' }
            ]}
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

          {hasActiveFilters && (
            <ClearFilterButton
              onClick={handleClearFilters}
              id="clear-asset-filters-btn"
            />
          )}
        </div>

        {/* Row 2: Secondary Facets: Department, Airport Location, Vendor, AMC, Warranty */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 'var(--space-2)', alignItems: 'center' }}>
          <SelectInput
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            id="dept-filter-select"
            placeholder="All Departments"
            options={departmentsList.map(d => ({ value: d.name, label: d.name }))}
          />

          <SelectInput
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            id="location-filter-select"
            placeholder="All Airport Locations"
            options={locationsList.map(l => ({ value: l.name, label: `${l.name} (${l.code})` }))}
          />

          <SelectInput
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            id="vendor-filter-select"
            placeholder="All Suppliers / Vendors"
            options={vendorsList.map(v => ({ value: v.name, label: v.name }))}
          />

          <SelectInput
            value={selectedAmc}
            onChange={(e) => setSelectedAmc(e.target.value)}
            id="amc-filter-select"
            placeholder="All AMC Status"
            options={[
              { value: 'true', label: 'Covered under AMC' },
              { value: 'false', label: 'Not under AMC' }
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
        </div>
      </div>

      {/* Assets Data Table */}
      <DataTable id="assets-data-table">
        <thead>
          <tr>
            <th>Asset Tag / ID</th>
            <th>Equipment &amp; Type</th>
            <th>Make &amp; Model</th>
            <th>OEM Serial Number</th>
            <th>Current Custodian</th>
            <th>Station &amp; Placement</th>
            <th>Warranty &amp; AMC</th>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
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
                          textDecoration: 'underline',
                          fontSize: '0.85rem'
                        }}
                        title="View Technical Details"
                      >
                        {asset.assetId}
                      </button>
                      {asset.oldAssetId && (
                        <span className="badge badge-neutral" style={{ fontSize: '0.62rem' }} title="Authoritative Legacy Inventory Register ID">
                          Old: {asset.oldAssetId}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--color-brand-900)' }}>{asset.assetName}</div>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                      <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                        {asset.category}
                      </span>
                      {asset.assetType && (
                        <span className="badge badge-available" style={{ fontSize: '0.62rem' }}>
                          {asset.assetType}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{asset.make} &bull; {asset.model}</td>
                  <td>
                    <code style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
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
                        In Stock (Available)
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.825rem', color: 'var(--color-text-main)', fontWeight: 500 }}>
                      {asset.department}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)' }}>
                      {asset.location ? `${asset.location} • ` : ''}{asset.room ? `Room ${asset.room}, ` : ''}{asset.floor}
                    </div>
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
                    {asset.amcApplicable && (
                      <span className="badge badge-assigned" style={{ fontSize: '0.6rem', display: 'block', marginTop: '2px' }}>
                        AMC Active
                      </span>
                    )}
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

            {/* ── DRAWER NAVIGATION TABS ── */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--color-bg-subtle)',
              padding: '0 16px',
              gap: '4px',
              overflowX: 'auto',
              flexShrink: 0
            }}>
              {[
                { id: 'overview', label: 'Overview & Placement', icon: Boxes },
                { id: 'specs', label: 'Technical Specs', icon: Cpu },
                { id: 'components', label: `Components (${drawerComponents.length})`, icon: LinkIcon },
                { id: 'timeline', label: `Timeline (${drawerTimeline.length || drawerHistory.length})`, icon: History }
              ].map(t => {
                const IconComp = t.icon;
                const isActive = drawerTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDrawerTab(t.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 14px',
                      fontSize: '0.8rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? 'var(--color-brand-600)' : 'var(--color-text-muted)',
                      border: 'none',
                      borderBottom: isActive ? '2px solid var(--color-brand-600)' : '2px solid transparent',
                      background: 'transparent',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <IconComp size={14} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ── DRAWER BODY ── */}
            <div className="drawer-body">

              {/* ══════════════ TAB 1: OVERVIEW & PLACEMENT ══════════════ */}
              {drawerTab === 'overview' && (
                <>
                  {/* ── SECTION 1: CURRENT CUSTODIAN ── */}
                  <section style={{ background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', padding: '16px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-brand-600)', marginBottom: '12px' }}>
                      Current Custodian / Holder
                    </div>

                    {activeAsset.currentEmployeeName ? (
                      <>
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
                        <span className="drawer-spec-label">Category &amp; Type</span>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                          <span className="badge badge-neutral">{activeAsset.category}</span>
                          {activeAsset.assetType && <span className="badge badge-available">{activeAsset.assetType}</span>}
                        </div>
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

                  {/* ── SECTION 3: PROCUREMENT & SUPPLY ORDER ── */}
                  <section>
                    <h3 className="drawer-section-heading">Procurement &amp; Supply Order</h3>
                    <div className="drawer-spec-grid">
                      <div style={{ minWidth: 0 }}>
                        <span className="drawer-spec-label">Supplier / Vendor</span>
                        <strong className="drawer-spec-value">{activeAsset.supplier || activeAsset.vendor || 'AAI Central Stores'}</strong>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span className="drawer-spec-label">GeM / PO Order Number</span>
                        <strong className="drawer-spec-value">{activeAsset.supplyOrderNumber || 'N/A'}</strong>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span className="drawer-spec-label">Purchase Date</span>
                        <strong className="drawer-spec-value">
                          {activeAsset.purchaseDate ? new Date(activeAsset.purchaseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </strong>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span className="drawer-spec-label">Purchase Cost</span>
                        <strong className="drawer-spec-value" style={{ color: 'var(--color-brand-700)' }}>
                          {activeAsset.purchaseCost ? `₹${Number(activeAsset.purchaseCost).toLocaleString('en-IN')}` : 'N/A'}
                        </strong>
                      </div>
                    </div>
                  </section>

                  {/* ── SECTION 4: DEPLOYMENT & PHYSICAL LOCATION ── */}
                  <section>
                    <h3 className="drawer-section-heading">Deployment &amp; Placement</h3>
                    <div className="drawer-spec-grid">
                      <div style={{ minWidth: 0 }}>
                        <span className="drawer-spec-label">Airport Location</span>
                        <strong className="drawer-spec-value">{activeAsset.location || 'Chennai Airport (MAA)'}</strong>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span className="drawer-spec-label">Department</span>
                        <strong className="drawer-spec-value">{activeAsset.department}</strong>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span className="drawer-spec-label">Floor / Wing</span>
                        <strong className="drawer-spec-value">{activeAsset.floor}</strong>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span className="drawer-spec-label">Room / Office Number</span>
                        <strong className="drawer-spec-value">{activeAsset.room || 'General Technical Area'}</strong>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span className="drawer-spec-label">Intercom Extension</span>
                        <strong className="drawer-spec-value">{activeAsset.intercom || 'N/A'}</strong>
                      </div>
                    </div>
                  </section>

                  {/* ── SECTION 5: NETWORK & OPERATING ENVIRONMENT ── */}
                  <section>
                    <h3 className="drawer-section-heading">Network &amp; Communication</h3>
                    <div className="drawer-spec-grid">
                      <div style={{ minWidth: 0 }}>
                        <span className="drawer-spec-label">Operating System</span>
                        <strong className="drawer-spec-value">{activeAsset.computerConfig?.operatingSystem || activeAsset.operatingSystem || 'N/A'} {activeAsset.computerConfig?.osVersion || activeAsset.osVersion || ''}</strong>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span className="drawer-spec-label">Static / DHCP IP</span>
                        <code style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>{activeAsset.networkConfig?.ipAddress || activeAsset.ipAddress || 'Not Assigned'}</code>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span className="drawer-spec-label">Physical MAC Address</span>
                        <code style={{ fontSize: '0.78rem' }}>{activeAsset.macAddress || 'N/A'}</code>
                      </div>
                    </div>
                  </section>

                  {/* ── SECTION 6: LIFECYCLE, WARRANTY & AMC ── */}
                  <section>
                    <h3 className="drawer-section-heading">Lifecycle, Warranty &amp; AMC</h3>
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
                        <span className="drawer-spec-label">AMC Coverage</span>
                        <span
                          className={`badge ${activeAsset.amcApplicable ? 'badge-assigned' : 'badge-neutral'}`}
                          style={{ marginTop: '2px', display: 'inline-block' }}
                        >
                          {activeAsset.amcApplicable ? `Active (${activeAsset.amcContractId || 'Covered'})` : 'No AMC'}
                        </span>
                      </div>
                    </div>
                  </section>

                  {/* ── SECTION 7: REMARKS ── */}
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

                  {/* ── SECTION 8: QUICK ACTIONS ── */}
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
                </>
              )}

              {/* ══════════════ TAB 2: TECHNICAL SPECIFICATIONS ══════════════ */}
              {drawerTab === 'specs' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Computer / Server Config */}
                  {(activeAsset.computerConfig || ['DESKTOP', 'LAPTOP', 'SERVER'].includes(activeAsset.assetType)) && (
                    <section style={{ background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', padding: '16px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                        <Cpu size={16} color="var(--color-brand-600)" />
                        <span>Compute &amp; Processing Architecture</span>
                      </div>
                      <div className="drawer-spec-grid">
                        <div>
                          <span className="drawer-spec-label">Processor</span>
                          <strong className="drawer-spec-value">{activeAsset.computerConfig?.processor || 'Standard Intel/AMD Core'}</strong>
                        </div>
                        <div>
                          <span className="drawer-spec-label">RAM Memory</span>
                          <strong className="drawer-spec-value">{activeAsset.computerConfig?.ramSizeGb || 16} GB {activeAsset.computerConfig?.ramType || 'DDR4'}</strong>
                        </div>
                        <div>
                          <span className="drawer-spec-label">Primary Storage</span>
                          <strong className="drawer-spec-value">{activeAsset.computerConfig?.storageCapacityGb || 512} GB {activeAsset.computerConfig?.storageType || 'SSD'}</strong>
                        </div>
                        <div>
                          <span className="drawer-spec-label">Graphics Adapter</span>
                          <strong className="drawer-spec-value">{activeAsset.computerConfig?.graphicsCard || 'Integrated Graphics'}</strong>
                        </div>
                        <div>
                          <span className="drawer-spec-label">Form Factor</span>
                          <strong className="drawer-spec-value">{activeAsset.computerConfig?.formFactor || (activeAsset.assetType === 'LAPTOP' ? 'Laptop' : 'Tower / SFF')}</strong>
                        </div>
                        <div>
                          <span className="drawer-spec-label">Network Hostname</span>
                          <code style={{ fontWeight: 700 }}>{activeAsset.computerConfig?.hostname || activeAsset.assetId}</code>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Display / Monitor Config */}
                  {(activeAsset.displayConfig || activeAsset.assetType === 'MONITOR') && (
                    <section style={{ background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', padding: '16px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                        <Monitor size={16} color="var(--color-brand-600)" />
                        <span>Display Panel Specifications</span>
                      </div>
                      <div className="drawer-spec-grid">
                        <div>
                          <span className="drawer-spec-label">Screen Diagonal</span>
                          <strong className="drawer-spec-value">{activeAsset.displayConfig?.screenSizeInches || 24}" Screen</strong>
                        </div>
                        <div>
                          <span className="drawer-spec-label">Resolution</span>
                          <strong className="drawer-spec-value">{activeAsset.displayConfig?.resolution || '1920x1080 Full HD'}</strong>
                        </div>
                        <div>
                          <span className="drawer-spec-label">Panel Type</span>
                          <strong className="drawer-spec-value">{activeAsset.displayConfig?.displayType || 'IPS LED'}</strong>
                        </div>
                        <div>
                          <span className="drawer-spec-label">Supported Ports</span>
                          <div style={{ display: 'flex', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                            <span className="badge badge-neutral">HDMI</span>
                            <span className="badge badge-neutral">DisplayPort</span>
                            <span className="badge badge-neutral">VGA</span>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Power / UPS Config */}
                  {(activeAsset.powerConfig || activeAsset.assetType === 'UPS') && (
                    <section style={{ background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', padding: '16px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                        <Zap size={16} color="var(--color-brand-600)" />
                        <span>Power Backup &amp; Inverter Architecture</span>
                      </div>
                      <div className="drawer-spec-grid">
                        <div>
                          <span className="drawer-spec-label">Rated Capacity</span>
                          <strong className="drawer-spec-value">{activeAsset.powerConfig?.capacityVa || 1000} VA</strong>
                        </div>
                        <div>
                          <span className="drawer-spec-label">Runtime Backup</span>
                          <strong className="drawer-spec-value">{activeAsset.powerConfig?.backupTimeMinutes || 15} Minutes runtime</strong>
                        </div>
                        <div>
                          <span className="drawer-spec-label">Topology</span>
                          <strong className="drawer-spec-value">{activeAsset.powerConfig?.topology || 'Line-Interactive'}</strong>
                        </div>
                        <div>
                          <span className="drawer-spec-label">Battery Cell Chemistry</span>
                          <strong className="drawer-spec-value">{activeAsset.powerConfig?.batteryType || 'Sealed Lead Acid (VRLA)'}</strong>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Network Infrastructure Config */}
                  {(activeAsset.networkConfig || activeAsset.assetType === 'NETWORK') && (
                    <section style={{ background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', padding: '16px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                        <Network size={16} color="var(--color-brand-600)" />
                        <span>Network Infrastructure Architecture</span>
                      </div>
                      <div className="drawer-spec-grid">
                        <div>
                          <span className="drawer-spec-label">Subtype</span>
                          <strong className="drawer-spec-value">{activeAsset.networkConfig?.deviceSubtype || 'Managed Switch'}</strong>
                        </div>
                        <div>
                          <span className="drawer-spec-label">Port Density</span>
                          <strong className="drawer-spec-value">{activeAsset.networkConfig?.portCount || 24} Ports ({activeAsset.networkConfig?.portSpeed || '1 Gbps'})</strong>
                        </div>
                        <div>
                          <span className="drawer-spec-label">Management Layer</span>
                          <strong className="drawer-spec-value">{activeAsset.networkConfig?.managementType || 'Layer 2/3 Web GUI & CLI'}</strong>
                        </div>
                        <div>
                          <span className="drawer-spec-label">PoE Support</span>
                          <strong className="drawer-spec-value">{activeAsset.networkConfig?.poeSupport ? 'PoE Enabled' : 'Non-PoE'}</strong>
                        </div>
                      </div>
                    </section>
                  )}
                </div>
              )}

              {/* ══════════════ TAB 3: COMPONENT LINKS & ASSEMBLY ══════════════ */}
              {drawerTab === 'components' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Host Workstation Parent if this is a child component */}
                  {drawerParent && (
                    <section style={{ background: '#EFF6FF', borderRadius: 'var(--radius-md)', border: '1px solid #BFDBFE', padding: '16px' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1E40AF', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <LinkIcon size={14} />
                        <span>Installed Auxiliary Component of Workstation</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <strong style={{ fontSize: '0.95rem', color: '#1E3A8A' }}>{drawerParent.assetName}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#3B82F6', fontFamily: 'monospace' }}>{drawerParent.assetId} &bull; {drawerParent.category}</div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            const parentAssetObj = assets.find(a => a.assetId === drawerParent.assetId);
                            if (parentAssetObj) handleOpenDrawer(parentAssetObj);
                          }}
                        >
                          View Host Workstation
                        </button>
                      </div>
                    </section>
                  )}

                  {/* Attached Components List */}
                  <section>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '0.9rem', margin: 0, fontWeight: 700, color: 'var(--color-text-main)' }}>
                        Connected Hardware Components ({drawerComponents.length})
                      </h3>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={handleOpenLinkModal}
                          className="btn btn-primary btn-sm"
                          id="attach-component-drawer-btn"
                        >
                          <Plus size={13} />
                          <span>Attach Component</span>
                        </button>
                      )}
                    </div>

                    {drawerComponents.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                        No peripheral components (Monitor, UPS, Printer) currently linked to this equipment.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {drawerComponents.map(comp => (
                          <div
                            key={comp.assetId}
                            style={{
                              padding: '12px 14px',
                              background: 'var(--color-bg-subtle)',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border-subtle)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '10px'
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-brand-700)' }}>
                                  {comp.assetId}
                                </span>
                                <span className="badge badge-neutral" style={{ fontSize: '0.62rem' }}>
                                  {comp.relationshipType || 'ATTACHED'}
                                </span>
                                <span className={`badge ${comp.status === 'ASSIGNED' ? 'badge-assigned' : 'badge-available'}`} style={{ fontSize: '0.62rem' }}>
                                  {comp.status}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                                {comp.assetName}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                {comp.category} &bull; SN: <code>{comp.serialNumber}</code>
                              </div>
                            </div>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleUnlinkComponent(comp.assetId)}
                                className="btn btn-secondary btn-sm"
                                style={{ color: 'var(--status-danger-text)' }}
                                title="Unlink this component"
                              >
                                <Unlink size={13} />
                                <span>Unlink</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* ══════════════ TAB 4: COMPLETE AUDIT TIMELINE ══════════════ */}
              {drawerTab === 'timeline' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Category Filter Pills */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                    {['ALL', 'LIFECYCLE', 'CUSTODY', 'MAINTENANCE', 'ASSEMBLY'].map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setTimelineCategoryFilter(cat)}
                        style={{
                          border: 'none',
                          background: timelineCategoryFilter === cat ? 'var(--color-brand-600)' : 'var(--color-bg-subtle)',
                          color: timelineCategoryFilter === cat ? '#ffffff' : 'var(--color-text-muted)',
                          fontWeight: timelineCategoryFilter === cat ? 700 : 500,
                          fontSize: '0.7rem',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          cursor: 'pointer'
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {drawerHistoryLoading ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>Loading timeline records...</div>
                  ) : (
                    <div className="custody-timeline-container" style={{ marginLeft: '4px' }}>
                      {(drawerTimeline.length > 0 ? drawerTimeline : drawerHistory.map(h => ({
                        id: h.assignmentId,
                        category: 'CUSTODY',
                        action: 'ASSIGNMENT',
                        description: `Custody to ${h.employeeName} (${h.employeeId})`,
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
                              <div className="custody-timeline-card" style={{ padding: '10px 12px', minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', fontSize: '0.8rem', fontWeight: 600, flexWrap: 'wrap' }}>
                                  <span style={{ wordBreak: 'break-word', minWidth: 0, color: 'var(--color-text-main)' }}>
                                    {evt.action || evt.category}
                                  </span>
                                  <span className="badge badge-neutral" style={{ fontSize: '0.62rem', flexShrink: 0 }}>
                                    {evt.category}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '3px', wordBreak: 'break-word' }}>
                                  {evt.description}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
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

      {/* Link / Attach Component Modal Dialog */}
      <Modal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        title={`Attach Auxiliary Component to ${activeAsset?.assetId}`}
        subtitle="Link auxiliary equipment (Monitor, UPS, Dedicated Printer) to this parent workstation"
        size="md"
        id="link-component-modal"
        footer={
          <>
            <button type="button" onClick={() => setIsLinkModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="button" onClick={handleLinkSubmit} disabled={linkSubmitting} className="btn btn-primary" id="submit-link-btn">
              {linkSubmitting ? 'Attaching...' : 'Attach Component'}
            </button>
          </>
        }
      >
        {linkModalError && (
          <div style={{ padding: '10px 14px', background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', borderRadius: 'var(--radius-md)', color: 'var(--status-danger-text)', fontSize: '0.85rem', marginBottom: '12px' }}>
            {linkModalError}
          </div>
        )}
        <form onSubmit={handleLinkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className="form-group">
            <label className="form-label">Select Equipment to Attach *</label>
            <select
              required
              className="form-select"
              value={linkCandidateId}
              onChange={(e) => setLinkCandidateId(e.target.value)}
              id="link-candidate-select"
            >
              <option value="">-- Choose equipment from inventory --</option>
              {assets
                .filter(a => a.assetId !== activeAsset?.assetId && (a.status === 'AVAILABLE' || a.status === 'ASSIGNED'))
                .map(a => (
                  <option key={a.assetId} value={a.assetId}>
                    {a.assetId} • {a.assetName} ({a.category} • SN: {a.serialNumber})
                  </option>
                ))}
            </select>
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

      {/* Register New Asset Modal Dialog */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Register IT Equipment"
        subtitle="AAI Central Asset Registry • Full Specification & Master Data Linkage"
        size="xl"
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

        {/* Modal Navigation Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '16px',
          gap: '4px',
          overflowX: 'auto',
          paddingBottom: '2px'
        }}>
          {[
            { id: 'general', label: '1. Basic & Identity', icon: Layers },
            { id: 'location', label: '2. Location & Placement', icon: MapPin },
            { id: 'procurement', label: '3. Procurement & AMC', icon: Shield },
            { id: 'technical', label: '4. Hardware & Network', icon: Cpu }
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = registerModalTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRegisterModalTab(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--color-brand-600)' : 'var(--color-text-muted)',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--color-brand-600)' : '2px solid transparent',
                  background: isActive ? 'var(--color-brand-50, rgba(0, 32, 91, 0.05))' : 'transparent',
                  borderRadius: '4px 4px 0 0',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <IconComp size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Datalists for Master Data Autocomplete */}
        <datalist id="reg-locations-list">
          {locationsList.map(l => (
            <option key={l.code || l.name} value={l.name}>{l.airportCode ? `${l.airportCode} - ${l.name}` : l.name}</option>
          ))}
        </datalist>
        <datalist id="reg-depts-list">
          {departmentsList.map(d => (
            <option key={d.code || d.name} value={d.name}>{d.name}</option>
          ))}
        </datalist>
        <datalist id="reg-vendors-list">
          {vendorsList.map(v => (
            <option key={v.vendorCode || v.name} value={v.name}>{v.name}</option>
          ))}
        </datalist>

        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* ════════ TAB 1: BASIC & IDENTITY ════════ */}
          {registerModalTab === 'general' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Asset Name *</label>
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
                    {Object.keys(CANONICAL_CATEGORY_MAP).map((catName) => (
                      <option key={catName} value={catName}>{catName}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Asset Type *</label>
                  <select
                    required
                    className="form-select"
                    value={formData.assetType}
                    onChange={(e) => setFormData({ ...formData, assetType: e.target.value })}
                    id="asset-type-input"
                  >
                    {getAssetTypesForCategory(formData.category).map(t => (
                      <option key={t.key} value={t.key}>{t.label || t.key}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Old / Legacy Asset Tag</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. AAI-CHN-2018-042"
                    value={formData.oldAssetId}
                    onChange={(e) => setFormData({ ...formData, oldAssetId: e.target.value })}
                    id="asset-old-tag-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Make / Company *</label>
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
                  <label className="form-label">Model *</label>
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
                  <label className="form-label">Serial Number *</label>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Physical Condition</label>
                  <select
                    className="form-select"
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    id="asset-condition-select"
                  >
                    <option value="EXCELLENT">EXCELLENT</option>
                    <option value="GOOD">GOOD</option>
                    <option value="FAIR">FAIR</option>
                    <option value="POOR">POOR</option>
                    <option value="FAULTY">FAULTY</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Custodian Assignment</label>
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
              </div>

              <div className="form-group">
                <label className="form-label">Remarks &amp; Deployment Notes</label>
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
            </>
          )}

          {/* ════════ TAB 2: LOCATION & PLACEMENT ════════ */}
          {registerModalTab === 'location' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Airport / Facility Location *</label>
                  <input
                    type="text"
                    required
                    list="reg-locations-list"
                    className="form-input"
                    placeholder="Select or enter facility (e.g. Chennai Airport)"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    id="asset-location-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <input
                    type="text"
                    required
                    list="reg-depts-list"
                    className="form-input"
                    placeholder="Select or enter department (e.g. Information Technology)"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    id="asset-dept-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Floor / Level *</label>
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

                <div className="form-group">
                  <label className="form-label">Room / Office / Bay</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Room 204, ATC Bay 3"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    id="asset-room-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Intercom / Extension</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Ext 2412"
                    value={formData.intercom}
                    onChange={(e) => setFormData({ ...formData, intercom: e.target.value })}
                    id="asset-intercom-input"
                  />
                </div>
              </div>
            </>
          )}

          {/* ════════ TAB 3: PROCUREMENT & AMC ════════ */}
          {registerModalTab === 'procurement' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Supplier / Vendor</label>
                  <input
                    type="text"
                    list="reg-vendors-list"
                    className="form-input"
                    placeholder="Select or enter vendor (e.g. Dell India)"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    id="asset-supplier-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Supply Order / PO Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. AAI/IT/PO/2024/091"
                    value={formData.supplyOrderNumber}
                    onChange={(e) => setFormData({ ...formData, supplyOrderNumber: e.target.value })}
                    id="asset-po-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Purchase Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    id="asset-purchase-date-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Purchase Cost (INR)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-input"
                    placeholder="e.g. 65000"
                    value={formData.purchaseCost}
                    onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
                    id="asset-cost-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Install Date *</label>
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
                  <label className="form-label">Warranty Start Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.warrantyStartDate}
                    onChange={(e) => setFormData({ ...formData, warrantyStartDate: e.target.value })}
                    id="asset-warranty-start-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Warranty End Date *</label>
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

              <div style={{ background: 'var(--color-bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    id="reg-amc-check"
                    checked={formData.amcApplicable}
                    onChange={(e) => setFormData({ ...formData, amcApplicable: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--color-brand-600)' }}
                  />
                  <label htmlFor="reg-amc-check" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)', cursor: 'pointer' }}>
                    Covered under Comprehensive Annual Maintenance Contract (AMC)
                  </label>
                </div>
                {formData.amcApplicable && (
                  <div className="form-group" style={{ marginTop: '8px' }}>
                    <label className="form-label">AMC Contract Reference / SLA ID</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. AMC-CHN-IT-2026-004"
                      value={formData.amcContractId}
                      onChange={(e) => setFormData({ ...formData, amcContractId: e.target.value })}
                      id="asset-amc-ref-input"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* ════════ TAB 4: HARDWARE & NETWORK ════════ */}
          {registerModalTab === 'technical' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Operating System</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Windows 11 Enterprise / Ubuntu / N/A"
                    value={formData.operatingSystem}
                    onChange={(e) => setFormData({ ...formData, operatingSystem: e.target.value })}
                    id="asset-os-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">OS Version / Build</label>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">IP Address (Static / DHCP)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 192.168.10.45"
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    id="asset-ip-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">MAC Address (Physical Address)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 00:1A:2B:3C:4D:5E"
                    value={formData.macAddress}
                    onChange={(e) => setFormData({ ...formData, macAddress: e.target.value })}
                    id="asset-mac-input"
                  />
                </div>
              </div>

              {/* Dynamic Subsystem Specifications */}
              <div style={{ background: 'var(--color-bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-brand-600)', marginBottom: '10px' }}>
                  Subsystem Configuration ({formData.assetType || 'GENERIC'})
                </div>

                {['DESKTOP', 'LAPTOP', 'SERVER', 'WORKSTATION', 'STORAGE'].includes(formData.assetType) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 'var(--space-3)' }}>
                    <div className="form-group">
                      <label className="form-label">Processor / CPU</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Intel Core i7-12700"
                        value={formData.computerConfig?.processor || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          computerConfig: { ...(formData.computerConfig || {}), processor: e.target.value }
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">RAM (GB)</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="16"
                        value={formData.computerConfig?.ramSizeGb || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          computerConfig: { ...(formData.computerConfig || {}), ramSizeGb: Number(e.target.value) }
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Storage (GB)</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="512"
                        value={formData.computerConfig?.storageCapacityGb || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          computerConfig: { ...(formData.computerConfig || {}), storageCapacityGb: Number(e.target.value) }
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Storage Type</label>
                      <select
                        className="form-select"
                        value={formData.computerConfig?.storageType || 'SSD'}
                        onChange={(e) => setFormData({
                          ...formData,
                          computerConfig: { ...(formData.computerConfig || {}), storageType: e.target.value }
                        })}
                      >
                        <option value="SSD">SSD</option>
                        <option value="NVMe">NVMe</option>
                        <option value="HDD">HDD</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                    </div>
                  </div>
                )}

                {['MONITOR', 'DISPLAY'].includes(formData.assetType) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
                    <div className="form-group">
                      <label className="form-label">Screen Size (Inches)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-input"
                        placeholder="24"
                        value={formData.displayConfig?.screenSizeInches || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          displayConfig: { ...(formData.displayConfig || {}), screenSizeInches: Number(e.target.value) }
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Resolution</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="1920x1080"
                        value={formData.displayConfig?.resolution || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          displayConfig: { ...(formData.displayConfig || {}), resolution: e.target.value }
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Panel Type</label>
                      <select
                        className="form-select"
                        value={formData.displayConfig?.displayType || 'IPS'}
                        onChange={(e) => setFormData({
                          ...formData,
                          displayConfig: { ...(formData.displayConfig || {}), displayType: e.target.value }
                        })}
                      >
                        <option value="IPS">IPS</option>
                        <option value="VA">VA</option>
                        <option value="TN">TN</option>
                        <option value="OLED">OLED</option>
                      </select>
                    </div>
                  </div>
                )}

                {['UPS', 'POWER'].includes(formData.assetType) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
                    <div className="form-group">
                      <label className="form-label">Capacity (VA)</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="1000"
                        value={formData.powerConfig?.capacityVa || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          powerConfig: { ...(formData.powerConfig || {}), capacityVa: Number(e.target.value) }
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Backup Time (Mins)</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="15"
                        value={formData.powerConfig?.backupTimeMinutes || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          powerConfig: { ...(formData.powerConfig || {}), backupTimeMinutes: Number(e.target.value) }
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Topology</label>
                      <select
                        className="form-select"
                        value={formData.powerConfig?.topology || 'Line-Interactive'}
                        onChange={(e) => setFormData({
                          ...formData,
                          powerConfig: { ...(formData.powerConfig || {}), topology: e.target.value }
                        })}
                      >
                        <option value="Line-Interactive">Line-Interactive</option>
                        <option value="Online Double-Conversion">Online Double-Conversion</option>
                        <option value="Offline / Standby">Offline / Standby</option>
                      </select>
                    </div>
                  </div>
                )}

                {!['DESKTOP', 'LAPTOP', 'SERVER', 'WORKSTATION', 'STORAGE', 'MONITOR', 'DISPLAY', 'UPS', 'POWER'].includes(formData.assetType) && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Auxiliary / peripheral specifications are captured in basic attributes and general remarks.
                  </div>
                )}
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* Edit Asset Specifications Modal Dialog */}
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

          {/* Edit Modal Navigation Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: '16px',
            gap: '4px',
            overflowX: 'auto',
            paddingBottom: '2px'
          }}>
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
                    fontSize: '0.8rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--color-brand-600)' : 'var(--color-text-muted)',
                    border: 'none',
                    borderBottom: isActive ? '2px solid var(--color-brand-600)' : '2px solid transparent',
                    background: isActive ? 'var(--color-brand-50, rgba(0, 32, 91, 0.05))' : 'transparent',
                    borderRadius: '4px 4px 0 0',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <IconComp size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Datalists for Master Data Autocomplete in Edit Modal */}
          <datalist id="edit-locations-list">
            {locationsList.map(l => (
              <option key={l.code || l.name} value={l.name}>{l.airportCode ? `${l.airportCode} - ${l.name}` : l.name}</option>
            ))}
          </datalist>
          <datalist id="edit-depts-list">
            {departmentsList.map(d => (
              <option key={d.code || d.name} value={d.name}>{d.name}</option>
            ))}
          </datalist>
          <datalist id="edit-vendors-list">
            {vendorsList.map(v => (
              <option key={v.vendorCode || v.name} value={v.name}>{v.name}</option>
            ))}
          </datalist>

          <form onSubmit={handleEditFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* ════════ TAB 1: BASIC & IDENTITY ════════ */}
            {editModalTab === 'general' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 'var(--space-3)' }}>
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
                      value={editFormData.category}
                      onChange={(e) => handleCategoryChange(e.target.value, true)}
                      id="edit-asset-category-input"
                    >
                      {Object.keys(CANONICAL_CATEGORY_MAP).map((catName) => (
                        <option key={catName} value={catName}>{catName}</option>
                      ))}
                      {!Object.keys(CANONICAL_CATEGORY_MAP).includes(editFormData.category) && editFormData.category && (
                        <option value={editFormData.category}>{editFormData.category} (Legacy)</option>
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Asset Type *</label>
                    <select
                      required
                      className="form-select"
                      value={editFormData.assetType}
                      onChange={(e) => setEditFormData({ ...editFormData, assetType: e.target.value })}
                      id="edit-asset-type-input"
                    >
                      {(() => {
                        const types = getAssetTypesForCategory(editFormData.category);
                        const hasCurrent = types.some(t => t.key === editFormData.assetType);
                        return (
                          <>
                            {types.map(t => (
                              <option key={t.key} value={t.key}>{t.label || t.key}</option>
                            ))}
                            {!hasCurrent && editFormData.assetType && (
                              <option value={editFormData.assetType}>{editFormData.assetType} (Stored)</option>
                            )}
                          </>
                        );
                      })()}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Old / Legacy Asset Tag</label>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Operational Status</label>
                    <select
                      className="form-select"
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                      id="edit-asset-status-select"
                    >
                      <option value="AVAILABLE">AVAILABLE (In Store)</option>
                      <option value="ASSIGNED">ASSIGNED (In Custody)</option>
                      <option value="GODOWN">GODOWN (Scrap / Holding)</option>
                      <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                      <option value="UNDER_REPAIR">UNDER_REPAIR</option>
                      <option value="FAULTY">FAULTY</option>
                      <option value="DAMAGED">DAMAGED</option>
                      <option value="LOST">LOST / MISSING</option>
                      <option value="WRITE_OFF">WRITE_OFF (Surveyed)</option>
                      <option value="RETIRED">RETIRED</option>
                      <option value="DISPOSED">DISPOSED</option>
                    </select>
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
                  <label className="form-label">Remarks &amp; Maintenance Log</label>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Airport / Facility Location *</label>
                    <input
                      type="text"
                      required
                      list="edit-locations-list"
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
                      list="edit-depts-list"
                      className="form-input"
                      value={editFormData.department}
                      onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                      id="edit-asset-dept-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Supplier / Vendor</label>
                    <input
                      type="text"
                      list="edit-vendors-list"
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
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

                <div style={{ background: 'var(--color-bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <input
                      type="checkbox"
                      id="edit-amc-check"
                      checked={editFormData.amcApplicable}
                      onChange={(e) => setEditFormData({ ...editFormData, amcApplicable: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--color-brand-600)' }}
                    />
                    <label htmlFor="edit-amc-check" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)', cursor: 'pointer' }}>
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
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Operating System</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editFormData.operatingSystem}
                      onChange={(e) => setEditFormData({ ...editFormData, operatingSystem: e.target.value })}
                      id="edit-asset-os-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">OS Version</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editFormData.osVersion}
                      onChange={(e) => setEditFormData({ ...editFormData, osVersion: e.target.value })}
                      id="edit-asset-os-version-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">IP Address (Static / DHCP)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 192.168.10.45"
                      value={editFormData.ipAddress}
                      onChange={(e) => setEditFormData({ ...editFormData, ipAddress: e.target.value })}
                      id="edit-asset-ip-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">MAC Address (Physical Address)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 00:1A:2B:3C:4D:5E"
                      value={editFormData.macAddress}
                      onChange={(e) => setEditFormData({ ...editFormData, macAddress: e.target.value })}
                      id="edit-asset-mac-input"
                    />
                  </div>
                </div>

                {/* Dynamic Subsystem Specifications */}
                <div style={{ background: 'var(--color-bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-brand-600)', marginBottom: '10px' }}>
                    Subsystem Configuration ({editFormData.assetType || 'GENERIC'})
                  </div>

                  {['DESKTOP', 'LAPTOP', 'SERVER', 'WORKSTATION', 'STORAGE'].includes(editFormData.assetType) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 'var(--space-3)' }}>
                      <div className="form-group">
                        <label className="form-label">Processor / CPU</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Intel Core i7-12700"
                          value={editFormData.computerConfig?.processor || ''}
                          onChange={(e) => setEditFormData({
                            ...editFormData,
                            computerConfig: { ...(editFormData.computerConfig || {}), processor: e.target.value }
                          })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">RAM (GB)</label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="16"
                          value={editFormData.computerConfig?.ramSizeGb || ''}
                          onChange={(e) => setEditFormData({
                            ...editFormData,
                            computerConfig: { ...(editFormData.computerConfig || {}), ramSizeGb: Number(e.target.value) }
                          })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Storage (GB)</label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="512"
                          value={editFormData.computerConfig?.storageCapacityGb || ''}
                          onChange={(e) => setEditFormData({
                            ...editFormData,
                            computerConfig: { ...(editFormData.computerConfig || {}), storageCapacityGb: Number(e.target.value) }
                          })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Storage Type</label>
                        <select
                          className="form-select"
                          value={editFormData.computerConfig?.storageType || 'SSD'}
                          onChange={(e) => setEditFormData({
                            ...editFormData,
                            computerConfig: { ...(editFormData.computerConfig || {}), storageType: e.target.value }
                          })}
                        >
                          <option value="SSD">SSD</option>
                          <option value="NVMe">NVMe</option>
                          <option value="HDD">HDD</option>
                          <option value="Hybrid">Hybrid</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {['MONITOR', 'DISPLAY'].includes(editFormData.assetType) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
                      <div className="form-group">
                        <label className="form-label">Screen Size (Inches)</label>
                        <input
                          type="number"
                          step="0.1"
                          className="form-input"
                          placeholder="24"
                          value={editFormData.displayConfig?.screenSizeInches || ''}
                          onChange={(e) => setEditFormData({
                            ...editFormData,
                            displayConfig: { ...(editFormData.displayConfig || {}), screenSizeInches: Number(e.target.value) }
                          })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Resolution</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="1920x1080"
                          value={editFormData.displayConfig?.resolution || ''}
                          onChange={(e) => setEditFormData({
                            ...editFormData,
                            displayConfig: { ...(editFormData.displayConfig || {}), resolution: e.target.value }
                          })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Panel Type</label>
                        <select
                          className="form-select"
                          value={editFormData.displayConfig?.displayType || 'IPS'}
                          onChange={(e) => setEditFormData({
                            ...editFormData,
                            displayConfig: { ...(editFormData.displayConfig || {}), displayType: e.target.value }
                          })}
                        >
                          <option value="IPS">IPS</option>
                          <option value="VA">VA</option>
                          <option value="TN">TN</option>
                          <option value="OLED">OLED</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {['UPS', 'POWER'].includes(editFormData.assetType) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
                      <div className="form-group">
                        <label className="form-label">Capacity (VA)</label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="1000"
                          value={editFormData.powerConfig?.capacityVa || ''}
                          onChange={(e) => setEditFormData({
                            ...editFormData,
                            powerConfig: { ...(editFormData.powerConfig || {}), capacityVa: Number(e.target.value) }
                          })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Backup Time (Mins)</label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="15"
                          value={editFormData.powerConfig?.backupTimeMinutes || ''}
                          onChange={(e) => setEditFormData({
                            ...editFormData,
                            powerConfig: { ...(editFormData.powerConfig || {}), backupTimeMinutes: Number(e.target.value) }
                          })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Topology</label>
                        <select
                          className="form-select"
                          value={editFormData.powerConfig?.topology || 'Line-Interactive'}
                          onChange={(e) => setEditFormData({
                            ...editFormData,
                            powerConfig: { ...(editFormData.powerConfig || {}), topology: e.target.value }
                          })}
                        >
                          <option value="Line-Interactive">Line-Interactive</option>
                          <option value="Online Double-Conversion">Online Double-Conversion</option>
                          <option value="Offline / Standby">Offline / Standby</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {!['DESKTOP', 'LAPTOP', 'SERVER', 'WORKSTATION', 'STORAGE', 'MONITOR', 'DISPLAY', 'UPS', 'POWER'].includes(editFormData.assetType) && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      Auxiliary / peripheral specifications are captured in basic attributes and general remarks.
                    </div>
                  )}
                </div>
              </>
            )}
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
