import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, LogOut } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Navbar({ onToggleSidebar, isSidebarCollapsed }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'AA';

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="sidebar-hamburger-btn"
          id="sidebar-toggle-btn"
          title={isSidebarCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Navigation Sidebar'}
          aria-label={isSidebarCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Navigation Sidebar'}
        >
          <Menu size={18} />
        </button>

        <Link to="/" className="aai-brand" title="Airports Authority of India - Asset Management System">
          <div className="brand-logo-box">
            <img src="/logo.svg" alt="AAI Logo" />
          </div>
          <div className="brand-title-group">
            <div className="brand-top-row">
              <span className="brand-org">AIRPORTS AUTHORITY OF INDIA</span>
              <span className="brand-country-badge">INDIA</span>
            </div>
            <span className="brand-system">Asset Management System</span>
          </div>
        </Link>
      </div>

      <div className="header-right">
        <ThemeToggle />

        {user ? (
          <div className="header-user-group">
            <div className="user-badge" title={`Role: ${user.role} | Department: ${user.department || 'N/A'}`}>
              <div className="user-avatar">{initials}</div>
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                <span className="user-role-tag">{user.role}</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="btn btn-secondary btn-sm"
              title="Sign out of current session"
              id="logout-btn"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <Link to="/login" className="btn btn-primary btn-sm" id="header-login-link">
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
