import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import EmployeeDirectory from './pages/EmployeeDirectory';
import AssetInventory from './pages/AssetInventory';
import AssetTransfers from './pages/AssetTransfers';
import BulkImportExport from './pages/BulkImportExport';
import ComplaintDesk from './pages/ComplaintDesk';
import AuditLogs from './pages/AuditLogs';

function RootDashboard() {
  const { user } = useAuth();
  return user?.role === 'ADMIN' ? <Dashboard /> : <EmployeeDashboard />;
}

function AppLayout({ children }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  return (
    <div className="app-container">
      <Navbar
        onToggleSidebar={() => setIsSidebarCollapsed(prev => !prev)}
        isSidebarCollapsed={isSidebarCollapsed}
      />
      <div className="app-body-layout">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(prev => !prev)}
        />
        <main className="app-main">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
      <Router>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Application Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <RootDashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/assets"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AppLayout>
                  <AssetInventory />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/transfers"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AppLayout>
                  <AssetTransfers />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/employees"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AppLayout>
                  <EmployeeDirectory />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/complaints"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'EMPLOYEE']}>
                <AppLayout>
                  <ComplaintDesk />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/import-export"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AppLayout>
                  <BulkImportExport />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AppLayout>
                  <AuditLogs />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  </ThemeProvider>
  );
}
