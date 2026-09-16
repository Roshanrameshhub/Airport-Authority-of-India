import React, { useState, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  X,
  RefreshCw,
  Boxes,
  Plus,
  Trash2,
  KeyRound,
  Check,
  Eye,
  EyeOff,
  Lock,
  FileText,
  Layers,
  Clock,
  RotateCcw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import * as XLSX from 'xlsx';

// The 13 required standard AAI fields + supporting hardware specs
const CANONICAL_FIELD_OPTIONS = [
  { key: '', label: '-- Ignore Column --' },
  { key: 'userName', label: '1. User Name' },
  { key: 'designation', label: '2. Designation' },
  { key: 'department', label: '3. Department' },
  { key: 'floor', label: '4. Floor' },
  { key: 'employeeId', label: '5. Employee ID' },
  { key: 'assetName', label: '6. Asset Name' },
  { key: 'make', label: '7. Make / Company' },
  { key: 'model', label: '8. Model' },
  { key: 'serialNumber', label: '9. Serial Number' },
  { key: 'installDate', label: '10. Install Date' },
  { key: 'warrantyEndDate', label: '11. Warranty End' },
  { key: 'operatingSystem', label: '12. Type of OS + Version' },
  { key: 'remarks', label: '13. Remarks' },
  { key: 'supportingInfo', label: 'Use in Remarks (Processor, RAM, IP, MAC specs)' }
];

// The 13 required standard columns description for the info modal
const STANDARD_13_FIELDS_INFO = [
  { num: 1, name: 'User Name', desc: 'Name of the custodian or officer assigned to the equipment' },
  { num: 2, name: 'Designation', desc: 'Official designation of the assigned staff member' },
  { num: 3, name: 'Department', desc: 'Division or section (e.g. CNS, ATM, Finance, Operations)' },
  { num: 4, name: 'Floor', desc: 'Building floor or physical location of the equipment' },
  { num: 5, name: 'Employee ID', desc: 'Unique staff identification code (e.g. AAI-10842)' },
  { num: 6, name: 'Asset Name', desc: 'Equipment category/type (e.g. Desktop PC, Laptop, Monitor)' },
  { num: 7, name: 'Make / Company', desc: 'Equipment manufacturer (e.g. Dell, HP, Lenovo, Apple)' },
  { num: 8, name: 'Model', desc: 'Hardware model number (e.g. OptiPlex 7090, ThinkPad T14)' },
  { num: 9, name: 'Serial Number', desc: 'Unique hardware machine serial number (Primary hardware key)' },
  { num: 10, name: 'Install Date', desc: 'Date of commissioning/deployment (YYYY-MM-DD)' },
  { num: 11, name: 'Warranty End', desc: 'Warranty expiration date (YYYY-MM-DD)' },
  { num: 12, name: 'Type of OS + Version', desc: 'Installed operating system (e.g. Windows 11 Pro 23H2)' },
  { num: 13, name: 'Remarks', desc: 'Handover remarks, configuration notes, and merged hardware specs' }
];

// 3 Simple Stages
const STAGES = [
  { id: 1, title: 'STEP 1', name: 'Select Files & Worksheets' },
  { id: 2, title: 'STEP 2', name: 'Map & Connect' },
  { id: 3, title: 'STEP 3', name: 'Review & Import' }
];

// Helper to format file size cleanly
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Fast browser-side row and sheet counter using XLSX with encrypted workbook detection
async function inspectFileInBrowser(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);

        // Check for OLE Compound Document signature on .xlsx files (signals password encryption)
        const isEncryptedXlsx = file.name.match(/\.xlsx$/i) &&
          data.length >= 4 &&
          data[0] === 0xD0 && data[1] === 0xCF && data[2] === 0x11 && data[3] === 0xE0;

        if (isEncryptedXlsx) {
          resolve({
            rowCount: 0,
            sheets: [],
            isParsed: false,
            isPasswordProtected: true,
            isUnlocked: false
          });
          return;
        }

        const wb = XLSX.read(data, { type: 'array', cellDates: false });
        let totalRows = 0;
        const sheetDetails = [];
        wb.SheetNames.forEach((sheetName) => {
          const ws = wb.Sheets[sheetName];
          if (ws && ws['!ref']) {
            const range = XLSX.utils.decode_range(ws['!ref']);
            const rows = Math.max(0, range.e.r - range.s.r); // Exclude header row
            totalRows += rows;
            sheetDetails.push({ name: sheetName, rows });
          }
        });
        resolve({
          rowCount: totalRows,
          sheets: sheetDetails,
          isParsed: true,
          isPasswordProtected: false,
          isUnlocked: true
        });
      } catch (err) {
        const msg = (err?.message || '').toLowerCase();
        const isPassword = msg.includes('password') || msg.includes('encrypt');
        resolve({
          rowCount: 0,
          sheets: [],
          isParsed: false,
          isPasswordProtected: isPassword,
          isUnlocked: false
        });
      }
    };
    reader.onerror = () => {
      resolve({ rowCount: 0, sheets: [], isParsed: false, isPasswordProtected: false, isUnlocked: true });
    };
    reader.readAsArrayBuffer(file);
  });
}

export default function BulkImportExport() {
  const { token } = useAuth();
  const fileInputRef = useRef(null);

  // Active Stage: 1, 2, or 3
  const [currentStage, setCurrentStage] = useState(1);

  // ---------------------------------------------------------------------------
  // STEP 1 STATE: Selected Files & Live Processing Progress
  // ---------------------------------------------------------------------------
  // fileQueue item: { id, file, name, size, type, rowCount, status: 'READY' | 'READING' | 'DONE' | 'ERROR' }
  const [fileQueue, setFileQueue] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [processingState, setProcessingState] = useState({
    phase: 'READING_FILES', // 'READING_FILES' | 'MAPPING_COLUMNS' | 'CONNECTING_RECORDS' | 'COMBINING_DATA' | 'CHECKING_DATA' | 'READY_TO_REVIEW'
    currentFileIndex: 0,
    totalFiles: 0,
    percent: 0,
    fileStatuses: {} // { [fileName]: 'WAITING' | 'READING' | 'DONE' | 'ERROR' }
  });

  // Global Error & File Specific Error State
  const [errorState, setErrorState] = useState(null); // { message, fileName, problem, details }

  // ---------------------------------------------------------------------------
  // PASSWORD MODAL & UNLOCK STATE
  // ---------------------------------------------------------------------------
  const [passwordModal, setPasswordModal] = useState({
    isOpen: false,
    fileIndex: null,
    fileName: '',
    isUnlocking: false,
    errorMessage: '',
    statusText: ''
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);

  // ---------------------------------------------------------------------------
  // STEP 1 & 2 STATE: Connect & Map
  // ---------------------------------------------------------------------------
  const [importToken, setImportToken] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [sheetSelection, setSheetSelection] = useState({}); // { [fileIdx]: { [sheetName]: { isSelected: boolean, suggestedAssetName: string } } }
  const [sheetMappings, setSheetMappings] = useState({});
  const [selectedCommonKey, setSelectedCommonKey] = useState('EMPLOYEE_ID');
  const [isCombiningRecords, setIsCombiningRecords] = useState(false);

  // ---------------------------------------------------------------------------
  // STEP 3 STATE: Review Clean Data & Final Ingestion
  // ---------------------------------------------------------------------------
  const [reconcileResult, setReconcileResult] = useState(null);
  const [previewFilter, setPreviewFilter] = useState('ALL');
  const [previewSearch, setPreviewSearch] = useState('');
  const [conflictStrategy, setConflictStrategy] = useState('SKIP_EXISTING');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, percent: 0 });
  const [commitResult, setCommitResult] = useState(null);

  // ---------------------------------------------------------------------------
  // HEADER ACTION STATES (Export & Template)
  // ---------------------------------------------------------------------------
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateState, setTemplateState] = useState({ loading: false, success: false, error: null });
  const [exportState, setExportState] = useState({ loading: false, success: false, error: null });

  // ===========================================================================
  // HANDLERS: EXPORT INVENTORY & DOWNLOAD TEMPLATE
  // ===========================================================================

  // Download Standard Template (.xlsx) with Live Button States
  const handleDownloadTemplate = async () => {
    if (templateState.loading) return;
    setTemplateState({ loading: true, success: false, error: null });

    try {
      const res = await fetch('/api/v1/import/template', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}: Failed to download template`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'AAI_Asset_Import_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setTemplateState({ loading: false, success: true, error: null });
      setTimeout(() => {
        setTemplateState(prev => ({ ...prev, success: false }));
      }, 2500);
    } catch (err) {
      setTemplateState({ loading: false, success: false, error: err.message });
      setErrorState({
        message: 'Template Download Failed',
        problem: err.message
      });
    }
  };

  // Export Central Inventory (.xlsx) with Live Button States
  const handleExportInventory = async () => {
    if (exportState.loading) return;
    setExportState({ loading: true, success: false, error: null });

    try {
      const res = await fetch('/api/v1/export/assets/excel', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}: Failed to export inventory`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AAI_Central_Asset_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setExportState({ loading: false, success: true, error: null });
      setTimeout(() => {
        setExportState(prev => ({ ...prev, success: false }));
      }, 2500);
    } catch (err) {
      setExportState({ loading: false, success: false, error: err.message });
      setErrorState({
        message: 'Export Failed',
        problem: err.message
      });
    }
  };

  // ===========================================================================
  // HANDLERS: FILE SELECTION & QUEUE MANAGEMENT (STEP 1)
  // ===========================================================================

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFiles(Array.from(e.target.files));
    }
    // Always clear input value so selecting identical file again triggers change event
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processSelectedFiles = async (files) => {
    setErrorState(null);
    const validRawFiles = [];

    for (const f of files) {
      if (!f.name.match(/\.(xlsx|xls|csv)$/i)) {
        setErrorState({
          message: 'Unsupported File Format',
          fileName: f.name,
          problem: `File "${f.name}" is not supported. Please select Excel (.xlsx, .xls) or CSV (.csv) files.`
        });
        return;
      }
      if (f.size > 25 * 1024 * 1024) {
        setErrorState({
          message: 'File Size Exceeded',
          fileName: f.name,
          problem: `File "${f.name}" (${formatFileSize(f.size)}) exceeds the 25MB maximum limit.`
        });
        return;
      }
      validRawFiles.push(f);
    }

    if (validRawFiles.length === 0) return;

    // Filter out already queued files with same name
    const existingNames = new Set(fileQueue.map(item => item.name));
    const newItemsToAdd = validRawFiles.filter(f => !existingNames.has(f.name));

    if (newItemsToAdd.length === 0) return;

    // Quick parallel browser-side inspection to compute exact row counts
    const parsedItems = await Promise.all(
      newItemsToAdd.map(async (file) => {
        const inspection = await inspectFileInBrowser(file);
        return {
          id: file.name + '-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          file,
          name: file.name,
          size: file.size,
          extension: file.name.split('.').pop().toUpperCase(),
          rowCount: inspection.rowCount,
          isPasswordProtected: Boolean(inspection.isPasswordProtected),
          isUnlocked: Boolean(inspection.isUnlocked),
          status: inspection.isPasswordProtected ? 'PASSWORD_REQUIRED' : 'READY'
        };
      })
    );

    setFileQueue(prev => [...prev, ...parsedItems]);
  };

  const removeFileFromQueue = (idToRemove) => {
    setFileQueue(prev => prev.filter(item => item.id !== idToRemove));
    if (errorState) setErrorState(null);
  };

  const clearAllFiles = () => {
    setFileQueue([]);
    setErrorState(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ===========================================================================
  // HANDLERS: STEP 1 -> STEP 2 (PROCESS & ANALYZE FILES WITH LIVE PROGRESS)
  // ===========================================================================

  const handleProcessFiles = async () => {
    if (fileQueue.length === 0) {
      setErrorState({
        message: 'No Files Selected',
        problem: 'Please add at least one Excel file before processing.'
      });
      return;
    }

    setIsProcessingFiles(true);
    setErrorState(null);

    const total = fileQueue.length;
    const initialStatuses = {};
    fileQueue.forEach(item => {
      initialStatuses[item.name] = 'WAITING';
    });

    setProcessingState({
      phase: 'READING_FILES',
      currentFileIndex: 0,
      totalFiles: total,
      percent: 10,
      fileStatuses: initialStatuses
    });

    // Animate simulated initial reading sequence so user sees per-file progress
    for (let i = 0; i < total; i++) {
      const fileName = fileQueue[i].name;
      setProcessingState(prev => ({
        ...prev,
        phase: 'READING_FILES',
        currentFileIndex: i + 1,
        percent: Math.min(85, Math.round(((i + 1) / total) * 75)),
        fileStatuses: {
          ...prev.fileStatuses,
          [fileName]: 'READING'
        }
      }));
      // Brief responsive tick for smooth user perception
      await new Promise(r => setTimeout(r, 160));
      setProcessingState(prev => ({
        ...prev,
        fileStatuses: {
          ...prev.fileStatuses,
          [fileName]: 'DONE'
        }
      }));
    }

    setProcessingState(prev => ({
      ...prev,
      phase: 'MAPPING_COLUMNS',
      percent: 85
    }));

    const formData = new FormData();
    fileQueue.forEach(item => {
      formData.append('files', item.file);
    });

    try {
      const res = await fetch('/api/v1/import/analyze', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'File processing failed');
      }

      setProcessingState(prev => ({
        ...prev,
        phase: 'CONNECTING_RECORDS',
        percent: 95
      }));
      await new Promise(r => setTimeout(r, 200));

      setImportToken(data.data.importToken);
      setAnalysisResult(data.data);

      // Initialize mapping editor state and worksheet selections
      const initialMappings = {};
      const initialSelection = {};
      data.data.files.forEach(file => {
        initialMappings[file.fileIndex] = {};
        initialSelection[file.fileIndex] = {};
        file.sheets.forEach(sh => {
          initialMappings[file.fileIndex][sh.sheetName] = { ...sh.mappings };
          initialSelection[file.fileIndex][sh.sheetName] = {
            isSelected: sh.isSelected !== false,
            suggestedAssetName: sh.suggestedAssetName || ''
          };
        });
      });
      setSheetMappings(initialMappings);
      setSheetSelection(initialSelection);

      // Check if any file is password protected and still locked
      const lockedFile = data.data.files.find(f => f.isPasswordProtected && !f.isUnlocked);
      if (lockedFile) {
        setPasswordModal({
          isOpen: true,
          fileIndex: lockedFile.fileIndex,
          fileName: lockedFile.fileName,
          isUnlocking: false,
          errorMessage: lockedFile.errorMessage || '',
          statusText: ''
        });
      }

      // Remain on Step 1 so the admin reviews and selects worksheets first
      setCurrentStage(1);
    } catch (err) {
      setErrorState({
        message: 'Processing Failed',
        fileName: fileQueue[0]?.name || 'Excel Workbook',
        problem: err.message || 'Unable to read worksheet or parse file headers.',
        details: 'Check if the file is password protected or corrupted, then try again.'
      });
    } finally {
      setIsProcessingFiles(false);
    }
  };

  // Password Unlock Handlers
  const handleOpenPasswordModal = (fileIndex, fileName) => {
    setPasswordInput('');
    setShowPasswordText(false);
    setPasswordModal({
      isOpen: true,
      fileIndex,
      fileName,
      isUnlocking: false,
      errorMessage: '',
      statusText: ''
    });
  };

  const handleCancelPassword = () => {
    setPasswordInput('');
    setPasswordModal(prev => ({ ...prev, isOpen: false, isUnlocking: false, errorMessage: '', statusText: '' }));
  };

  const handleUnlockFile = async () => {
    if (!passwordInput.trim() || !importToken || passwordModal.fileIndex === null) return;

    setPasswordModal(prev => ({
      ...prev,
      isUnlocking: true,
      errorMessage: '',
      statusText: 'Unlocking workbook...'
    }));

    try {
      const res = await fetch(`/api/v1/import/unlock/${importToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fileIndex: passwordModal.fileIndex,
          fileName: passwordModal.fileName,
          password: passwordInput
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Incorrect password. Please try again.');
      }

      // Step: Workbook unlocked
      setPasswordModal(prev => ({ ...prev, statusText: 'Workbook unlocked' }));
      await new Promise(r => setTimeout(r, 350));

      // Step: Reading worksheets...
      setPasswordModal(prev => ({ ...prev, statusText: 'Reading worksheets...' }));
      await new Promise(r => setTimeout(r, 350));

      const unlockedFile = data.data.file;

      // Update analysisResult state with newly unlocked file
      setAnalysisResult(prev => {
        if (!prev) return prev;
        const updatedFiles = prev.files.map(f => {
          if (f.fileIndex === unlockedFile.fileIndex) {
            return unlockedFile;
          }
          return f;
        });
        return {
          ...prev,
          files: updatedFiles,
          metrics: data.data.metrics || prev.metrics
        };
      });

      // Update sheet mappings & selections for this unlocked file
      setSheetMappings(prev => {
        const fileMappings = {};
        (unlockedFile.sheets || []).forEach(sh => {
          fileMappings[sh.sheetName] = { ...sh.mappings };
        });
        return {
          ...prev,
          [unlockedFile.fileIndex]: fileMappings
        };
      });

      setSheetSelection(prev => {
        const fileSelection = {};
        (unlockedFile.sheets || []).forEach(sh => {
          fileSelection[sh.sheetName] = {
            isSelected: sh.isSelected !== false,
            suggestedAssetName: sh.suggestedAssetName || ''
          };
        });
        return {
          ...prev,
          [unlockedFile.fileIndex]: fileSelection
        };
      });

      // Clear password from memory immediately
      setPasswordInput('');

      // Close modal
      setPasswordModal({
        isOpen: false,
        fileIndex: null,
        fileName: '',
        isUnlocking: false,
        errorMessage: '',
        statusText: ''
      });

    } catch (err) {
      setPasswordModal(prev => ({
        ...prev,
        isUnlocking: false,
        statusText: '',
        errorMessage: err.message || 'Incorrect password. Please try again.'
      }));
    }
  };

  // ===========================================================================
  // HANDLERS: STEP 1 & 2 (WORKSHEET SELECTION & COLUMN MAPPING)
  // ===========================================================================

  const handleToggleSheet = (fileIdx, sheetName) => {
    setSheetSelection(prev => {
      const fileSel = prev[fileIdx] || {};
      const current = fileSel[sheetName] || { isSelected: true, suggestedAssetName: '' };
      return {
        ...prev,
        [fileIdx]: {
          ...fileSel,
          [sheetName]: {
            ...current,
            isSelected: !current.isSelected
          }
        }
      };
    });
  };

  const handleSuggestedAssetChange = (fileIdx, sheetName, newName) => {
    setSheetSelection(prev => {
      const fileSel = prev[fileIdx] || {};
      const current = fileSel[sheetName] || { isSelected: true, suggestedAssetName: '' };
      return {
        ...prev,
        [fileIdx]: {
          ...fileSel,
          [sheetName]: {
            ...current,
            suggestedAssetName: newName
          }
        }
      };
    });
  };

  const handleColumnMapChange = (fileIdx, sheetName, colIdx, canonicalKey) => {
    setSheetMappings(prev => ({
      ...prev,
      [fileIdx]: {
        ...prev[fileIdx],
        [sheetName]: {
          ...prev[fileIdx]?.[sheetName],
          [colIdx]: canonicalKey
        }
      }
    }));
  };

  // STEP 2 -> STEP 3: Combine records using selected key and review clean data
  const handleReviewCleanData = async () => {
    setIsCombiningRecords(true);
    setErrorState(null);

    try {
      // 1. Save column mappings and worksheet selections
      const mapRes = await fetch(`/api/v1/import/mappings/${importToken}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          mappings: sheetMappings,
          selectedSheets: sheetSelection
        })
      });
      const mapData = await mapRes.json();
      if (!mapRes.ok || !mapData.success) {
        throw new Error(mapData.message || 'Failed to save column mappings');
      }

      // 2. Combine and reconcile across files using common key and selected sheets
      const reconRes = await fetch(`/api/v1/import/reconcile/${importToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          commonKey: selectedCommonKey,
          selectedSheets: sheetSelection
        })
      });
      const reconData = await reconRes.json();
      if (!reconRes.ok || !reconData.success) {
        throw new Error(reconData.message || 'Failed to combine records');
      }

      setReconcileResult(reconData.data);
      setCurrentStage(3);
    } catch (err) {
      setErrorState({
        message: 'Combining Records Failed',
        problem: err.message || 'Failed to combine records using the selected common key.'
      });
    } finally {
      setIsCombiningRecords(false);
    }
  };

  // ===========================================================================
  // HANDLERS: STEP 3 (CONFLICT RESOLUTION & FINAL IMPORT COMMIT)
  // ===========================================================================

  const handleResolveConflict = async (conflictId, choice, chosenValue) => {
    try {
      const res = await fetch(`/api/v1/import/resolve/${importToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          conflictResolutions: [{ conflictId, choice, manualValue: chosenValue }],
          employeeResolutions: []
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to resolve conflict');
      }

      setReconcileResult(prev => ({
        ...prev,
        metrics: data.data.metrics,
        stagedAssets: data.data.stagedAssets,
        conflicts: data.data.conflicts
      }));
    } catch (err) {
      setErrorState({
        message: 'Conflict Resolution Failed',
        problem: err.message
      });
    }
  };

  // Final Ingestion into MongoDB with Live Step Progress
  const handleConfirmImport = async () => {
    if (!importToken) return;

    setIsImporting(true);
    setErrorState(null);
    setIsConfirmModalOpen(false);

    const totalAssets = reconcileResult?.stagedAssets?.filter(a => !a.hasConflict).length || 1;
    setImportProgress({ current: 0, total: totalAssets, percent: 10 });

    // Live progress counter ticks
    const stepInterval = setInterval(() => {
      setImportProgress(prev => {
        if (prev.percent >= 90) return prev;
        const nextPercent = Math.min(90, prev.percent + 20);
        const nextCurrent = Math.min(prev.total, Math.round((nextPercent / 100) * prev.total));
        return { current: nextCurrent, total: prev.total, percent: nextPercent };
      });
    }, 250);

    try {
      const res = await fetch('/api/v1/import/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          importToken,
          conflictStrategy
        })
      });

      clearInterval(stepInterval);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to import into database');
      }

      setImportProgress({ current: totalAssets, total: totalAssets, percent: 100 });
      await new Promise(r => setTimeout(r, 200));
      setCommitResult(data.data);
    } catch (err) {
      clearInterval(stepInterval);
      setErrorState({
        message: 'Import Commit Failed',
        problem: err.message || 'Failed to save cleaned records into database.',
        details: 'Review duplicate serial numbers or database connection.'
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Full workflow reset
  const handleResetWorkflow = () => {
    setCurrentStage(1);
    setFileQueue([]);
    setImportToken('');
    setAnalysisResult(null);
    setSheetMappings({});
    setSelectedCommonKey('SERIAL');
    setReconcileResult(null);
    setCommitResult(null);
    setErrorState(null);
    setIsConfirmModalOpen(false);
    setIsImporting(false);
    setIsProcessingFiles(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Filter preview table rows
  const filteredAssets = useMemo(() => {
    if (!reconcileResult?.stagedAssets) return [];
    let list = reconcileResult.stagedAssets;

    if (previewFilter === 'AVAILABLE') {
      list = list.filter(a => a.status === 'AVAILABLE');
    } else if (previewFilter === 'ASSIGNED') {
      list = list.filter(a => a.status === 'ASSIGNED');
    } else if (previewFilter === 'MERGED') {
      list = list.filter(a => a.mergeType === 'COMPLEMENTARY_MERGED');
    } else if (previewFilter === 'CONFLICT') {
      list = list.filter(a => a.hasConflict);
    }

    if (previewSearch.trim()) {
      const q = previewSearch.toLowerCase();
      list = list.filter(a =>
        (a.serialNumber && a.serialNumber.toLowerCase().includes(q)) ||
        (a.assetName && a.assetName.toLowerCase().includes(q)) ||
        (a.make && a.make.toLowerCase().includes(q)) ||
        (a.userName && a.userName.toLowerCase().includes(q)) ||
        (a.employeeId && a.employeeId.toLowerCase().includes(q)) ||
        (a.department && a.department.toLowerCase().includes(q))
      );
    }

    return list;
  }, [reconcileResult, previewFilter, previewSearch]);

  const pendingConflicts = useMemo(() => {
    return reconcileResult?.conflicts?.filter(c => !c.isResolved) || [];
  }, [reconcileResult]);

  // Plain-English stage description text
  const stageExplanations = {
    READING_FILES: 'The system is reading the information from your Excel files.',
    MAPPING_COLUMNS: 'The system is proposing standard field mappings for each file.',
    CONNECTING_RECORDS: 'The system is matching information that belongs to the same asset.',
    COMBINING_DATA: 'The system is creating one complete record from the matching files.',
    CHECKING_DATA: 'The system is checking required information and duplicate serial numbers.',
    READY_TO_REVIEW: 'Your files have been processed and are ready to review.'
  };

  // ===========================================================================
  // RENDER MAIN VIEW
  // ===========================================================================

  return (
    <div className="page-body">
      {/* Hidden real file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx,.xls,.csv"
        multiple
        style={{ display: 'none' }}
        id="multi-file-upload-input"
      />

      {/* Standard Page Header with Action Buttons */}
      <PageHeader
        title="Excel Import & Export Engine"
        subtitle="Airports Authority of India • Multi-File Reconciliation & Asset Lifecycle Management"
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* View Required Columns Modal Trigger */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsTemplateModalOpen(true)}
            id="btn-view-template-columns"
            title="View the 13 required standard asset fields"
          >
            <Eye size={14} />
            <span>View Required Columns</span>
          </button>

          {/* Download Standard Template with Live Feedback */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleDownloadTemplate}
            disabled={templateState.loading}
            id="btn-download-template"
            title="Download clean standard Excel template"
          >
            {templateState.loading ? (
              <>
                <RefreshCw size={14} className="pulse-dot" />
                <span>Preparing Template...</span>
              </>
            ) : templateState.success ? (
              <>
                <Check size={14} color="var(--status-available-text)" />
                <span style={{ color: 'var(--status-available-text)' }}>Template Downloaded</span>
              </>
            ) : (
              <>
                <Download size={14} />
                <span>Download Standard Template</span>
              </>
            )}
          </button>

          {/* Export Full Inventory with Live Feedback */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleExportInventory}
            disabled={exportState.loading}
            id="btn-export-inventory"
            title="Export full inventory register to Excel (.xlsx)"
          >
            {exportState.loading ? (
              <>
                <RefreshCw size={14} className="pulse-dot" />
                <span>Preparing Export...</span>
              </>
            ) : exportState.success ? (
              <>
                <Check size={14} color="var(--status-available-text)" />
                <span style={{ color: 'var(--status-available-text)' }}>Export Completed</span>
              </>
            ) : (
              <>
                <Boxes size={14} />
                <span>Export Inventory</span>
              </>
            )}
          </button>
        </div>
      </PageHeader>

      {/* 3 Simple Stages Navigation Strip */}
      <div className="card" style={{ marginBottom: '14px', padding: '12px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          {STAGES.map((st, idx) => {
            const isActive = currentStage === st.id;
            const isCompleted = currentStage > st.id;

            return (
              <React.Fragment key={st.id}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    opacity: isActive || isCompleted ? 1 : 0.45,
                    cursor: isCompleted && !commitResult ? 'pointer' : 'default'
                  }}
                  onClick={() => {
                    if (isCompleted && !commitResult && !isProcessingFiles && !isImporting) {
                      setCurrentStage(st.id);
                    }
                  }}
                >
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    backgroundColor: isActive ? 'var(--color-brand-600)' : isCompleted ? 'var(--status-available-text)' : 'var(--border-subtle)',
                    color: isActive || isCompleted ? '#ffffff' : 'var(--color-text-muted)',
                    transition: 'all 0.2s ease'
                  }}>
                    {isCompleted ? <Check size={16} /> : st.id}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                      {st.title}
                    </div>
                    <div style={{ fontSize: '0.84rem', fontWeight: isActive ? 700 : 600, color: isActive ? 'var(--color-brand-600)' : 'var(--color-text-main)' }}>
                      {st.name}
                    </div>
                  </div>
                </div>

                {idx < STAGES.length - 1 && (
                  <div style={{
                    flex: '1 1 20px',
                    height: '2px',
                    backgroundColor: isCompleted ? 'var(--status-available-text)' : 'var(--border-subtle)',
                    minWidth: '16px',
                    transition: 'background-color 0.25s ease'
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* User-Friendly Error Alert Box */}
      {errorState && (
        <div className="card" style={{
          backgroundColor: 'var(--status-danger-bg)',
          borderColor: 'var(--status-danger-border)',
          color: 'var(--status-danger-text)',
          padding: '14px 18px',
          marginBottom: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ fontSize: '0.92rem', display: 'block', marginBottom: '2px' }}>
                  {errorState.message || 'Operation Error'}
                </strong>
                {errorState.fileName && (
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.9 }}>
                    File: {errorState.fileName}
                  </div>
                )}
                <div style={{ fontSize: '0.82rem', marginTop: '4px', lineHeight: 1.35 }}>
                  {errorState.problem || errorState.message}
                </div>
                {errorState.details && (
                  <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '4px' }}>
                    {errorState.details}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {currentStage === 1 && fileQueue.length > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '4px 10px', height: 'auto' }}
                  onClick={handleProcessFiles}
                >
                  <RotateCcw size={12} />
                  <span>Retry</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setErrorState(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '4px' }}
                title="Dismiss"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: UPLOAD & SELECT WORKSHEETS */}
      {/* ========================================================================= */}
      {currentStage === 1 && !commitResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!analysisResult ? (
            /* Upload / Dropzone state when no workbook has been analyzed yet */
            <div className="card" style={{ padding: '24px' }}>
              {/* Live Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: '2px dashed var(--border-strong)',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: isDragging ? 'var(--color-bg-hover)' : 'var(--color-bg-subtle)',
                  padding: fileQueue.length > 0 ? '20px' : '36px 20px',
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                {fileQueue.length === 0 ? (
                  /* Empty Dropzone State */
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                  >
                    <div style={{
                      padding: '14px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-brand-50)',
                      color: 'var(--color-brand-600)',
                      marginBottom: '12px'
                    }}>
                      <Upload size={32} />
                    </div>

                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', color: 'var(--color-text-main)', fontWeight: 700 }}>
                      Upload Excel Files
                    </h3>
                    <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 16px 0', fontSize: '0.86rem', maxWidth: '420px' }}>
                      Drag and drop your Excel workbooks here, or click to browse files from your computer.
                    </p>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      id="btn-add-excel-files"
                      disabled={isProcessingFiles}
                    >
                      {isProcessingFiles ? (
                        <>
                          <RefreshCw size={16} className="pulse-dot" />
                          <span>Processing Files...</span>
                        </>
                      ) : (fileQueue.length > 0 && !isProcessingFiles) ? (
                        <>
                          <Check size={16} />
                          <span>Files Ready</span>
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          <span>Add Excel Files</span>
                        </>
                      )}
                    </button>

                    <div style={{ marginTop: '14px', fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                      Supported formats: <strong>.xlsx</strong> / <strong>.xls</strong> / <strong>.csv</strong> &bull; Multiple sheets supported
                    </div>
                  </div>
                ) : (
                  /* Transformed Dropzone: Files Selected State */
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          padding: '6px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--color-brand-50)',
                          color: 'var(--color-brand-600)'
                        }}>
                          <FileSpreadsheet size={20} />
                        </div>
                        <div>
                          <strong style={{ fontSize: '1rem', color: 'var(--color-text-main)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {fileQueue.length} {fileQueue.length === 1 ? 'WORKBOOK SELECTED' : 'WORKBOOKS SELECTED'}
                          </strong>
                          <div style={{ fontSize: '0.76rem', color: 'var(--color-text-secondary)' }}>
                            Files loaded in memory. Click "Process Files" to inspect sheets and detected equipment types.
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isProcessingFiles}
                          id="btn-add-more-files"
                        >
                          <Plus size={14} />
                          <span>Add More Files</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={clearAllFiles}
                          disabled={isProcessingFiles}
                        >
                          <span>Clear All</span>
                        </button>
                      </div>
                    </div>

                    {/* List of Selected Files with row counts, file size and remove buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {fileQueue.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            backgroundColor: 'var(--color-bg-card)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                            {item.isPasswordProtected && !item.isUnlocked ? (
                              <KeyRound size={20} color="var(--status-maintenance-text)" style={{ flexShrink: 0 }} />
                            ) : (
                              <CheckCircle2 size={20} color="var(--status-available-text)" style={{ flexShrink: 0 }} />
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.name}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                                {item.isPasswordProtected && !item.isUnlocked ? (
                                  <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                                    Password protected
                                  </span>
                                ) : item.isPasswordProtected && item.isUnlocked ? (
                                  <span className="badge badge-available" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                                    ✓ Unlocked
                                  </span>
                                ) : (
                                  <span className="badge badge-available" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                                    ✓ Ready
                                  </span>
                                )}
                                <span>&bull;</span>
                                <span>{formatFileSize(item.size)}</span>
                                {item.rowCount > 0 && (
                                  <>
                                    <span>&bull;</span>
                                    <span style={{ fontWeight: 600, color: 'var(--color-brand-600)' }}>
                                      {item.rowCount} rows
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ color: 'var(--status-danger-text)', border: 'none', padding: '6px 8px' }}
                            onClick={() => removeFileFromQueue(item.id)}
                            disabled={isProcessingFiles}
                            title="Remove file from selection"
                          >
                            <Trash2 size={15} />
                            <span style={{ marginLeft: '4px', fontSize: '0.75rem' }}>Remove</span>
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Dropzone Bottom Action Bar */}
                    {!isProcessingFiles && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                          Selected: <strong>{fileQueue.length} {fileQueue.length === 1 ? 'workbook' : 'workbooks'}</strong> &bull; Estimated rows: <strong>{fileQueue.reduce((acc, f) => acc + (f.rowCount || 0), 0)}</strong>
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary btn-lg"
                          onClick={handleProcessFiles}
                          id="btn-process-files"
                        >
                          <span>Process Files</span>
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Live Multi-File Processing Progress Panel */}
              {isProcessingFiles && (
                <div
                  className="card"
                  style={{
                    marginTop: '20px',
                    padding: '20px',
                    backgroundColor: 'var(--color-bg-subtle)',
                    borderColor: 'var(--color-brand-600)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <RefreshCw size={18} className="pulse-dot" color="var(--color-brand-600)" />
                      <strong style={{ fontSize: '0.95rem', color: 'var(--color-text-main)', letterSpacing: '0.5px' }}>
                        INSPECTING WORKBOOK STRUCTURE
                      </strong>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-brand-600)' }}>
                      {processingState.currentFileIndex} / {processingState.totalFiles} files ({processingState.percent}%)
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-subtle)', borderRadius: '999px', overflow: 'hidden', marginBottom: '12px' }}>
                    <div style={{
                      width: `${processingState.percent}%`,
                      height: '100%',
                      backgroundColor: 'var(--color-brand-600)',
                      borderRadius: '999px',
                      transition: 'width 0.25s ease'
                    }} />
                  </div>

                  {/* Plain-English Status Message */}
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: '16px', padding: '8px 12px', backgroundColor: 'var(--color-bg-card)', borderRadius: 'var(--radius-sm)' }}>
                    <strong>{processingState.phase.replace(/_/g, ' ')}:</strong> {stageExplanations[processingState.phase]}
                  </div>

                  {/* Per-File Live Reading Checklist */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {fileQueue.map((item, idx) => {
                      const status = processingState.fileStatuses[item.name] || 'WAITING';

                      return (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            backgroundColor: 'var(--color-bg-card)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.8rem',
                            border: status === 'READING' ? '1px solid var(--color-brand-600)' : '1px solid var(--border-subtle)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>
                              {idx + 1} / {fileQueue.length}
                            </span>
                            <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
                              {item.name}
                            </span>
                          </div>

                          <div>
                            {status === 'DONE' && (
                              <span style={{ color: 'var(--status-available-text)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                <Check size={14} />
                                <span>Sheets detected successfully</span>
                              </span>
                            )}
                            {status === 'READING' && (
                              <span style={{ color: 'var(--color-brand-600)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                <RefreshCw size={12} className="pulse-dot" />
                                <span>Inspecting worksheets...</span>
                              </span>
                            )}
                            {status === 'WAITING' && (
                              <span style={{ color: 'var(--color-text-muted)' }}>
                                ○ Waiting
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STEP 1: SELECT WORKSHEETS (AFTER UPLOAD) */
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <FileSpreadsheet size={24} color="var(--color-brand-600)" />
                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text-main)', fontWeight: 700 }}>
                      {analysisResult.files?.[0]?.fileName || 'AAI Inventory Workbook'}
                    </h2>
                    <span className="badge badge-neutral" style={{ fontSize: '0.8rem', padding: '3px 8px' }}>
                      {analysisResult.files?.reduce((acc, f) => acc + f.sheets.length, 0)} worksheets found
                    </span>
                  </div>
                  <h3 style={{ margin: '8px 0 4px 0', fontSize: '1.05rem', color: 'var(--color-text-main)', fontWeight: 600 }}>
                    Which sheets contain information we should use?
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                    Select the worksheets you want to import. Obviously irrelevant or legacy sheets can be set to Ignore.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setAnalysisResult(null);
                      setSheetSelection({});
                    }}
                  >
                    <RotateCcw size={14} />
                    <span>Upload Different File</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setCurrentStage(2)}
                    disabled={analysisResult.files?.some(f => f.isPasswordProtected && !f.isUnlocked)}
                    id="btn-continue-to-step2"
                    title={analysisResult.files?.some(f => f.isPasswordProtected && !f.isUnlocked) ? 'Please unlock all password-protected workbooks to continue' : 'Continue to Step 2'}
                  >
                    <span>Continue</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Worksheets Grid / List per Workbook */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
                {analysisResult.files.map((file) => (
                  <div key={file.fileIndex} style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px', backgroundColor: 'var(--color-bg-card)' }}>
                    {/* File Header Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: file.isPasswordProtected && !file.isUnlocked ? '0' : '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {file.isPasswordProtected && !file.isUnlocked ? (
                          <KeyRound size={20} color="var(--status-maintenance-text)" />
                        ) : (
                          <FileSpreadsheet size={20} color="var(--color-brand-600)" />
                        )}
                        <strong style={{ fontSize: '0.96rem', color: 'var(--color-text-main)' }}>
                          {file.fileName}
                        </strong>

                        {file.isPasswordProtected && !file.isUnlocked ? (
                          <span className="badge badge-warning" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                            Password protected
                          </span>
                        ) : file.isPasswordProtected && file.isUnlocked ? (
                          <span className="badge badge-available" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                            ✓ Unlocked &bull; {file.sheets?.length || 0} worksheets found
                          </span>
                        ) : (
                          <span className="badge badge-neutral" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                            ✓ Ready &bull; {file.sheets?.length || 0} worksheets found
                          </span>
                        )}
                      </div>

                      {file.isPasswordProtected && !file.isUnlocked && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleOpenPasswordModal(file.fileIndex, file.fileName)}
                          id={`btn-enter-password-${file.fileIndex}`}
                        >
                          <KeyRound size={14} />
                          <span>Enter Password</span>
                        </button>
                      )}
                    </div>

                    {/* If file is locked, show instruction prompt */}
                    {file.isPasswordProtected && !file.isUnlocked ? (
                      <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                        This workbook is protected by an open password. Click <strong>"Enter Password"</strong> above to unlock and inspect its worksheets.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                          <thead>
                            <tr style={{ backgroundColor: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                              <th style={{ padding: '10px 14px', width: '25%', color: 'var(--color-text-muted)' }}>Worksheet Name</th>
                              <th style={{ padding: '10px 14px', width: '25%', color: 'var(--color-text-muted)' }}>Detected Purpose</th>
                              <th style={{ padding: '10px 14px', width: '15%', color: 'var(--color-text-muted)' }}>Row Count</th>
                              <th style={{ padding: '10px 14px', width: '20%', color: 'var(--color-text-muted)' }}>Suggested Asset Type</th>
                              <th style={{ padding: '10px 14px', width: '15%', textAlign: 'right', color: 'var(--color-text-muted)' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                          {file.sheets.map((sheet) => {
                            const sel = sheetSelection[file.fileIndex]?.[sheet.sheetName] || {
                              isSelected: sheet.isSelected !== false,
                              suggestedAssetName: sheet.suggestedAssetName || ''
                            };
                            const isUsed = sel.isSelected;

                            return (
                              <tr
                                key={sheet.sheetName}
                                style={{
                                  borderBottom: '1px solid var(--border-subtle)',
                                  backgroundColor: isUsed ? 'transparent' : 'var(--color-bg-subtle)',
                                  opacity: isUsed ? 1 : 0.6
                                }}
                              >
                                <td style={{ padding: '12px 14px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileSpreadsheet size={16} color={isUsed ? 'var(--color-brand-600)' : 'var(--color-text-muted)'} />
                                    <strong style={{ color: isUsed ? 'var(--color-text-main)' : 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                      {sheet.sheetName}
                                    </strong>
                                  </div>
                                </td>
                                <td style={{ padding: '12px 14px' }}>
                                  <span className={`badge ${sheet.isEmployeeSheet ? 'badge-neutral' : isUsed ? 'badge-available' : 'badge-danger'}`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                                    {sheet.detectedPurpose || 'Unknown'}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                                  {sheet.totalRows} rows
                                </td>
                                <td style={{ padding: '12px 14px' }}>
                                  {sheet.isEmployeeSheet ? (
                                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                      Staff Information
                                    </span>
                                  ) : (
                                    <input
                                      type="text"
                                      className="form-control"
                                      style={{ height: '28px', fontSize: '0.78rem', width: '140px' }}
                                      value={sel.suggestedAssetName}
                                      onChange={(e) => handleSuggestedAssetChange(file.fileIndex, sheet.sheetName, e.target.value)}
                                      disabled={!isUsed}
                                      placeholder="Asset Name"
                                      title="Confirm or customize suggested asset type"
                                    />
                                  )}
                                </td>
                                <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                  <button
                                    type="button"
                                    className={`btn btn-sm ${isUsed ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{
                                      minWidth: '80px',
                                      fontSize: '0.78rem',
                                      padding: '4px 10px',
                                      backgroundColor: isUsed ? 'var(--color-brand-600)' : undefined
                                    }}
                                    onClick={() => handleToggleSheet(file.fileIndex, sheet.sheetName)}
                                    id={`btn-toggle-sheet-${sheet.sheetName.replace(/\s+/g, '-').toLowerCase()}`}
                                  >
                                    {isUsed ? (
                                      <>
                                        <Check size={13} />
                                        <span>Use</span>
                                      </>
                                    ) : (
                                      <span>Ignore</span>
                                    )}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>

              {/* Bottom Continue Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)' }}>
                  Active worksheets for import:{' '}
                  <strong style={{ color: 'var(--color-text-main)' }}>
                    {Object.values(sheetSelection).reduce((acc, fileSel) => acc + Object.values(fileSel).filter(s => s.isSelected).length, 0)}
                  </strong>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={() => setCurrentStage(2)}
                  id="btn-continue-step-2"
                >
                  <span>Continue to Step 2: Map & Connect</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: MAP & CONNECT */}
      {/* ========================================================================= */}
      {currentStage === 2 && analysisResult && !commitResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', margin: '0 0 4px 0', color: 'var(--color-text-main)', fontWeight: 700 }}>
                STEP 2 — MAP & CONNECT
              </h2>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
                Map columns from your selected sheets to our 13 standard fields, and choose the identifier to connect related sheets.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentStage(1)}
                disabled={isCombiningRecords}
              >
                <ArrowLeft size={14} />
                <span>Back to Worksheets</span>
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleReviewCleanData}
                disabled={isCombiningRecords}
                id="btn-review-clean-data"
              >
                {isCombiningRecords ? (
                  <>
                    <RefreshCw size={14} className="pulse-dot" />
                    <span>Combining Records...</span>
                  </>
                ) : (
                  <>
                    <span>Review Clean Data</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* First: Map Columns for Selected Sheets */}
          <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="var(--color-brand-600)" />
            <span>Map Columns for Selected Sheets</span>
          </div>

          {analysisResult.files.map((file) => {
            const selectedSheetsList = file.sheets.filter(sh => sheetSelection[file.fileIndex]?.[sh.sheetName]?.isSelected !== false);

            if (selectedSheetsList.length === 0) {
              return (
                <div key={file.fileIndex} className="card" style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No sheets selected from {file.fileName}. Please go back to Step 1 and mark sheets as [Use].
                </div>
              );
            }

            return (
              <div key={file.fileIndex} className="card" style={{ padding: '16px 20px' }}>
                {analysisResult.files.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                    <FileSpreadsheet size={20} color="var(--color-brand-600)" />
                    <div>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--color-text-main)' }}>
                        {file.fileName}
                      </strong>
                    </div>
                  </div>
                )}

                {selectedSheetsList.map((sheet) => {
                  const mappings = sheetMappings[file.fileIndex]?.[sheet.sheetName] || {};

                  return (
                    <div key={sheet.sheetName} style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                          Worksheet: <span style={{ color: 'var(--color-brand-600)' }}>"{sheet.sheetName}"</span>
                          <span style={{ marginLeft: '8px', fontWeight: 500, fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                            ({sheet.detectedPurpose || 'Assets'} &bull; {sheet.totalRows} data rows)
                          </span>
                        </div>
                      </div>

                      <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                          <thead>
                            <tr style={{ backgroundColor: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                              <th style={{ padding: '8px 12px', width: '32%', color: 'var(--color-text-muted)' }}>Source Column in Excel</th>
                              <th style={{ padding: '8px 12px', width: '28%', color: 'var(--color-text-muted)' }}>Sample Data</th>
                              <th style={{ padding: '8px 12px', width: '40%', color: 'var(--color-text-muted)' }}>Map To AAI Standard Field</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sheet.rawHeaders.map((header, colIdx) => {
                              const currentTarget = mappings[colIdx] || '';
                              const isMapped = currentTarget !== '';

                              return (
                                <tr key={colIdx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                  <td style={{ padding: '8px 12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      {isMapped ? (
                                        <Check size={14} color="var(--status-available-text)" />
                                      ) : (
                                        <span style={{ width: '14px', height: '14px', display: 'inline-block', borderRadius: '50%', border: '1px solid var(--border-strong)' }} />
                                      )}
                                      <strong style={{ color: 'var(--color-text-main)' }}>{header}</strong>
                                    </div>
                                  </td>
                                  <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>
                                    <span style={{ fontSize: '0.76rem' }}>
                                      {sheet.candidates?.[colIdx]?.[0] || '—'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '8px 12px' }}>
                                    <select
                                      className="form-control"
                                      style={{ height: '32px', fontSize: '0.78rem' }}
                                      value={currentTarget}
                                      onChange={(e) => handleColumnMapChange(file.fileIndex, sheet.sheetName, colIdx, e.target.value)}
                                    >
                                      {CANONICAL_FIELD_OPTIONS.map(opt => (
                                        <option key={opt.key} value={opt.key}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Then: Choose Connecting Field (Step 3 Requirement in Step 2) */}
          <div className="card" style={{ padding: '18px 22px', backgroundColor: 'var(--color-bg-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <KeyRound size={20} color="var(--color-brand-600)" />
              <strong style={{ fontSize: '1rem', color: 'var(--color-text-main)' }}>
                Identify the Connecting Field
              </strong>
            </div>

            <p style={{ margin: '0 0 12px 0', fontSize: '0.84rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
              Some worksheets contain information about the same employee or asset. Choose a value that appears in more than one sheet so the system can connect related information.
            </p>

            <div style={{ maxWidth: '460px', marginBottom: '14px' }}>
              <label className="form-label" style={{ marginBottom: '6px', fontSize: '0.82rem', fontWeight: 600 }}>
                Connect records using:
              </label>
              <select
                className="form-control"
                value={selectedCommonKey}
                onChange={(e) => setSelectedCommonKey(e.target.value)}
                id="select-common-key"
              >
                <option value="EMPLOYEE_ID">Employee ID (Recommended — Connects staff to equipment)</option>
                <option value="SERIAL">Serial Number (Primary hardware machine identifier)</option>
                <option value="ASSET_ID">Asset ID / Code (Unique asset code identifier)</option>
              </select>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                This helps the system connect information from different sheets that belongs to the same employee.
              </div>
            </div>

            {/* Visual Connecting Example */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              backgroundColor: 'var(--color-bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="badge badge-neutral">USER DETAIL</span>
                <span>Employee ID:</span>
                <code style={{ background: 'var(--color-bg-subtle)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>10021410</code>
              </div>
              <span style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>+</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="badge badge-neutral">CPU</span>
                <span>Employee ID:</span>
                <code style={{ background: 'var(--color-bg-subtle)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>10021410</code>
              </div>
              <span style={{ color: 'var(--status-available-text)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={16} />
                <span>✓ Connected</span>
              </span>
            </div>
          </div>

          {/* Bottom Action Strip */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCurrentStage(1)}
              disabled={isCombiningRecords}
            >
              <ArrowLeft size={15} />
              <span>Back to Worksheets</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleReviewCleanData}
              disabled={isCombiningRecords}
              id="btn-review-clean-data-bottom"
            >
              {isCombiningRecords ? (
                <>
                  <RefreshCw size={15} className="pulse-dot" />
                  <span>Combining Records...</span>
                </>
              ) : (
                <>
                  <span>Review Clean Data</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: REVIEW CLEAN DATA & FINAL IMPORT */}
      {/* ========================================================================= */}
      {currentStage === 3 && reconcileResult && !commitResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', margin: '0 0 2px 0', color: 'var(--color-text-main)', fontWeight: 700 }}>
                READY TO REVIEW
              </h2>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
                Review the combined, cleaned data below. This is what will be saved into the central asset database.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentStage(2)}
                disabled={isImporting}
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsConfirmModalOpen(true)}
                disabled={reconcileResult.stagedAssets?.length === 0 || isImporting}
                id="btn-import-clean-data"
              >
                <span>Import Clean Data</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Top Summary Stats Strip Matching Exact Required Format */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px'
          }}>
            <div className="card" style={{ padding: '12px 16px', textAlign: 'center', backgroundColor: 'var(--color-bg-card)' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Employees Found
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-brand-600)', marginTop: '2px' }}>
                {reconcileResult.metrics?.employeesFound ?? 0}
              </div>
            </div>

            <div className="card" style={{ padding: '12px 16px', textAlign: 'center', backgroundColor: 'var(--color-bg-card)' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Assets Found
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '2px' }}>
                {reconcileResult.metrics?.assetsFound ?? reconcileResult.stagedAssets?.length ?? 0}
              </div>
            </div>

            <div className="card" style={{ padding: '12px 16px', textAlign: 'center', backgroundColor: 'var(--color-bg-card)' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Assets With Employee
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '2px' }}>
                {reconcileResult.metrics?.assetsWithEmployee ?? 0}
              </div>
            </div>

            <div className="card" style={{ padding: '12px 16px', textAlign: 'center', backgroundColor: 'var(--color-bg-card)' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Available / Unassigned
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--status-available-text)', marginTop: '2px' }}>
                {reconcileResult.metrics?.availableCount ?? 0}
              </div>
            </div>

            <div className="card" style={{ padding: '12px 16px', textAlign: 'center', backgroundColor: 'var(--color-bg-card)' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Needs Review
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: (reconcileResult.metrics?.needsReviewCount || pendingConflicts.length) > 0 ? 'var(--status-maintenance-text)' : 'var(--color-text-muted)', marginTop: '2px' }}>
                {reconcileResult.metrics?.needsReviewCount ?? pendingConflicts.length}
              </div>
            </div>
          </div>

          {/* Simple Conflict / Disagreement Resolver Card */}
          {pendingConflicts.length > 0 && (
            <div className="card" style={{
              padding: '14px 18px',
              backgroundColor: 'var(--status-maintenance-bg)',
              borderColor: 'var(--status-maintenance-border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-maintenance-text)', fontWeight: 700, fontSize: '0.88rem', marginBottom: '4px' }}>
                <AlertTriangle size={17} />
                <span>Information Conflict ({pendingConflicts.length})</span>
              </div>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: 'var(--status-maintenance-text)' }}>
                Two worksheets gave different information for the same asset. Choose the correct value:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingConflicts.map(conflict => (
                  <div
                    key={conflict.conflictId}
                    style={{
                      padding: '10px 14px',
                      backgroundColor: 'var(--color-bg-card)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                        Serial: <span style={{ color: 'var(--color-brand-600)' }}>{conflict.serialNumber || conflict.assetIdentifier}</span> &bull; Field: <strong>{conflict.field}</strong>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        Source 1: "{String(conflict.valueA)}" vs Source 2: "{String(conflict.valueB)}"
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleResolveConflict(conflict.conflictId, 'USE_A', conflict.valueA)}
                      >
                        Keep "{String(conflict.valueA)}"
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleResolveConflict(conflict.conflictId, 'USE_B', conflict.valueB)}
                      >
                        Keep "{String(conflict.valueB)}"
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Table Filters & Search Bar */}
          <div className="card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-sm ${previewFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPreviewFilter('ALL')}
              >
                All Assets ({reconcileResult.metrics?.assetsFound ?? reconcileResult.stagedAssets?.length ?? 0})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${previewFilter === 'ASSIGNED' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPreviewFilter('ASSIGNED')}
              >
                Assets with Employee ({reconcileResult.metrics?.assetsWithEmployee ?? 0})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${previewFilter === 'AVAILABLE' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPreviewFilter('AVAILABLE')}
              >
                Available / Unassigned ({reconcileResult.metrics?.availableCount ?? 0})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${previewFilter === 'MERGED' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPreviewFilter('MERGED')}
              >
                Combined Across Files ({reconcileResult.stagedAssets?.filter(a => a.mergeType === 'COMPLEMENTARY_MERGED').length || 0})
              </button>
            </div>

            <div style={{ minWidth: '220px' }}>
              <input
                type="text"
                className="form-control"
                style={{ height: '30px', fontSize: '0.78rem' }}
                placeholder="Search serial, asset, staff..."
                value={previewSearch}
                onChange={(e) => setPreviewSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Clean 13-Column Table Preview */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', minWidth: '1100px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', color: 'var(--color-text-muted)' }}>#</th>
                    <th style={{ padding: '10px 12px', color: 'var(--color-text-main)' }}>1. User Name</th>
                    <th style={{ padding: '10px 12px', color: 'var(--color-text-main)' }}>2. Designation</th>
                    <th style={{ padding: '10px 12px', color: 'var(--color-text-main)' }}>3. Department</th>
                    <th style={{ padding: '10px 12px', color: 'var(--color-text-main)' }}>4. Floor</th>
                    <th style={{ padding: '10px 12px', color: 'var(--color-text-main)' }}>5. Emp ID</th>
                    <th style={{ padding: '10px 12px', color: 'var(--color-text-main)' }}>6. Asset Name</th>
                    <th style={{ padding: '10px 12px', color: 'var(--color-text-main)' }}>7. Make</th>
                    <th style={{ padding: '10px 12px', color: 'var(--color-text-main)' }}>8. Model</th>
                    <th style={{ padding: '10px 12px', color: 'var(--color-text-main)' }}>9. Serial Number</th>
                    <th style={{ padding: '10px 12px', color: 'var(--color-text-main)' }}>10. Install Date</th>
                    <th style={{ padding: '10px 12px', color: 'var(--color-text-main)' }}>11. Warranty</th>
                    <th style={{ padding: '10px 12px', color: 'var(--color-text-main)' }}>12. OS</th>
                    <th style={{ padding: '10px 12px', color: 'var(--color-text-main)' }}>13. Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={14} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        No records match the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map((asset, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          backgroundColor: asset.hasConflict ? 'var(--status-maintenance-bg)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '8px 12px', color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--color-text-main)' }}>
                          {asset.userName || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>
                          {asset.designation || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>
                          {asset.department || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>
                          {asset.floor || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--color-brand-600)', fontWeight: 600 }}>
                          {asset.employeeId || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--color-text-main)' }}>
                          {asset.assetName || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>
                          {asset.make || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>
                          {asset.model || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-brand-600)' }}>
                          {asset.serialNumber || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>
                          {asset.installDate || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>
                          {asset.warrantyEndDate || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>
                          {asset.computerConfig?.operatingSystem || asset.operatingSystem || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--color-text-muted)', fontSize: '0.74rem', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={asset.remarks}>
                          {asset.remarks || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import Progress Overlay / Card */}
          {isImporting && (
            <div className="card" style={{
              padding: '24px',
              backgroundColor: 'var(--color-bg-subtle)',
              borderColor: 'var(--color-brand-600)',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                <RefreshCw size={20} className="pulse-dot" color="var(--color-brand-600)" />
                <strong style={{ fontSize: '1.1rem', color: 'var(--color-text-main)' }}>
                  IMPORTING ASSETS
                </strong>
              </div>

              <p style={{ margin: '0 0 14px 0', fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
                The cleaned records are being saved to the asset database. Please wait...
              </p>

              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-subtle)', borderRadius: '999px', overflow: 'hidden', maxWidth: '500px', margin: '0 auto 12px auto' }}>
                <div style={{
                  width: `${importProgress.percent}%`,
                  height: '100%',
                  backgroundColor: 'var(--color-brand-600)',
                  borderRadius: '999px',
                  transition: 'width 0.25s ease'
                }} />
              </div>

              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--color-brand-600)', marginBottom: '16px' }}>
                {importProgress.current} / {importProgress.total} records ({importProgress.percent}%)
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', fontSize: '0.78rem', color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={14} color="var(--status-available-text)" />
                  <span>Employee profiles matched</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={14} color="var(--status-available-text)" />
                  <span>Hardware assets registered</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={14} color="var(--status-available-text)" />
                  <span>Custody assignments linked</span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* FINAL COMPLETION SCREEN (Part 11) */}
      {/* ========================================================================= */}
      {commitResult && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px', maxWidth: '640px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex',
            padding: '16px',
            borderRadius: '50%',
            backgroundColor: 'var(--status-available-bg)',
            color: 'var(--status-available-text)',
            marginBottom: '16px'
          }}>
            <CheckCircle2 size={44} />
          </div>

          <h2 style={{ fontSize: '1.4rem', margin: '0 0 6px 0', color: 'var(--color-text-main)', fontWeight: 700 }}>
            IMPORT COMPLETED
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', margin: '0 auto 24px auto', fontSize: '0.86rem', maxWidth: '460px' }}>
            Cleaned records have been successfully saved into the Airports Authority of India database.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
            <div className="card" style={{ padding: '14px 28px', backgroundColor: 'var(--color-bg-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>ASSETS IMPORTED</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--status-available-text)' }}>
                {commitResult.importedCount}
              </div>
            </div>

            {commitResult.matchedCount > 0 && (
              <div className="card" style={{ padding: '14px 28px', backgroundColor: 'var(--color-bg-subtle)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>MATCHED EXISTING</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-brand-600)' }}>
                  {commitResult.matchedCount}
                </div>
              </div>
            )}

            {commitResult.skippedCount > 0 && (
              <div className="card" style={{ padding: '14px 28px', backgroundColor: 'var(--color-bg-subtle)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>RECORDS SKIPPED</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--status-maintenance-text)' }}>
                  {commitResult.skippedCount}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResetWorkflow}
            >
              Import More Files
            </button>
            <Link to="/assets" className="btn btn-primary" id="btn-view-inventory">
              <Boxes size={15} />
              <span>View Assets in Inventory</span>
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRM IMPORT BEFORE INGESTION */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => !isImporting && setIsConfirmModalOpen(false)}
        title="Confirm Asset Import"
        subtitle="Final confirmation before saving cleaned records into the database"
        size="md"
        id="confirm-import-modal"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsConfirmModalOpen(false)}
              disabled={isImporting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirmImport}
              disabled={isImporting}
              id="btn-confirm-import-execute"
            >
              {isImporting ? (
                <>
                  <RefreshCw size={15} className="pulse-dot" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>Confirm Import</span>
                </>
              )}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-text-main)' }}>
            You are about to add <strong>{reconcileResult?.stagedAssets?.filter(a => !a.hasConflict).length || 0}</strong> cleaned asset records into the AAI Asset Management System.
          </p>

          <div style={{ padding: '14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <label className="form-label" style={{ marginBottom: '6px' }}>
              If an asset serial already exists in the database:
            </label>
            <select
              className="form-control"
              value={conflictStrategy}
              onChange={(e) => setConflictStrategy(e.target.value)}
              id="modal-select-conflict-strategy"
            >
              <option value="SKIP_EXISTING">Skip existing records (Safe - do not overwrite)</option>
              <option value="UPDATE_EXISTING">Update existing records with new data</option>
            </select>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            • Assets with no employee info will remain <strong>AVAILABLE</strong> for allocation.<br />
            • Only the approved 13 standard fields will be written to MongoDB.
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: VIEW REQUIRED COLUMNS (Part 15) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title="Required Excel Columns"
        subtitle="The fixed master asset format used across the Airports Authority of India"
        size="lg"
        id="view-template-modal"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsTemplateModalOpen(false)}
            >
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setIsTemplateModalOpen(false);
                handleDownloadTemplate();
              }}
            >
              <Download size={14} />
              <span>Download Excel Template</span>
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-brand-50)', borderRadius: 'var(--radius-sm)', color: 'var(--color-brand-700)', fontSize: '0.84rem' }}>
            Source Excel files can use different column names. During import, you can map them to these standard fields.
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', width: '8%', color: 'var(--color-text-muted)' }}>#</th>
                  <th style={{ padding: '8px 12px', width: '32%', color: 'var(--color-text-main)' }}>Standard Field</th>
                  <th style={{ padding: '8px 12px', width: '60%', color: 'var(--color-text-secondary)' }}>Description & Guidelines</th>
                </tr>
              </thead>
              <tbody>
                {STANDARD_13_FIELDS_INFO.map(f => (
                  <tr key={f.num} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--color-brand-600)' }}>{f.num}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--color-text-main)' }}>{f.name}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>{f.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Password Required Modal */}
      {passwordModal.isOpen && (
        <Modal
          isOpen={passwordModal.isOpen}
          onClose={handleCancelPassword}
          title="Excel Password Required"
          size="sm"
        >
          <div style={{ padding: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                padding: '10px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--color-brand-50)',
                color: 'var(--color-brand-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <KeyRound size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-text-main)' }}>
                  {passwordModal.fileName}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  This workbook is password protected. Enter the password to continue.
                </div>
              </div>
            </div>

            {passwordModal.errorMessage && (
              <div className="alert alert-danger" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{passwordModal.errorMessage}</span>
              </div>
            )}

            {passwordModal.statusText && (
              <div style={{
                marginBottom: '16px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.84rem',
                color: 'var(--color-brand-600)',
                fontWeight: 600
              }}>
                <RefreshCw size={14} className="pulse-dot" />
                <span>{passwordModal.statusText}</span>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleUnlockFile(); }}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" htmlFor="input-excel-password" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Enter workbook password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    disabled={passwordModal.isUnlocking}
                    autoFocus
                    id="input-excel-password"
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-text-muted)',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title={showPasswordText ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancelPassword}
                  disabled={passwordModal.isUnlocking}
                  id="btn-cancel-password"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={passwordModal.isUnlocking || !passwordInput.trim()}
                  id="btn-unlock-password"
                >
                  {passwordModal.isUnlocking ? (
                    <>
                      <RefreshCw size={14} className="pulse-dot" />
                      <span>Unlocking...</span>
                    </>
                  ) : (
                    <span>Unlock & Continue</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
