import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  Users,
  AlertCircle,
  FileSpreadsheet,
  ShieldCheck,
  Laptop,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function Sidebar({ isCollapsed, onToggle }) {
  const location = useLocation();
  const { user } = useAuth();

  // Role-Aware Navigation Links
  const adminNavItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, id: 'nav-dashboard' },
    { path: '/assets', label: 'Assets', icon: Boxes, id: 'nav-assets' },
    { path: '/transfers', label: 'Transfers', icon: ArrowLeftRight, id: 'nav-transfers' },
    { path: '/employees', label: 'Employees', icon: Users, id: 'nav-employees' },
    { path: '/complaints', label: 'Complaints', icon: AlertCircle, id: 'nav-complaints' },
    { path: '/import-export', label: 'Excel/Reports', icon: FileSpreadsheet, id: 'nav-excel-reports' },
    { path: '/audit-logs', label: 'Audit Trail', icon: ShieldCheck, id: 'nav-audit-trail' }
  ];

  const employeeNavItems = [
    { path: '/', label: 'My Desk', icon: Laptop, id: 'nav-dashboard' },
    { path: '/complaints', label: 'My Complaints', icon: AlertCircle, id: 'nav-complaints' }
  ];

  const navItems = user?.role === 'ADMIN' ? adminNavItems : employeeNavItems;

  return (
    <aside className={`app-sidebar ${isCollapsed ? 'collapsed' : ''}`} aria-label="Main Navigation">
      <div className="sidebar-nav-container">
        <div className="sidebar-nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                id={item.id}
                title={isCollapsed ? item.label : undefined}
              >
                <span className="sidebar-item-icon">
                  <Icon size={18} />
                </span>
                {!isCollapsed && <span className="sidebar-item-label">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="sidebar-footer">
        {!isCollapsed && (
          <div className="sidebar-footer-text">
            <span className="sidebar-version-badge">AAI AMS v2.4</span>
            <span className="sidebar-region-text">Asset Management</span>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="sidebar-collapse-btn"
          id="sidebar-collapse-toggle-btn"
          title={isCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Navigation Sidebar'}
          aria-label={isCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Navigation Sidebar'}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
