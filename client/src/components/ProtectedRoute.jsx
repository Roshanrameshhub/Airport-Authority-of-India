import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="pulse-dot" style={{ width: '16px', height: '16px', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Verifying security credentials...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="page-body">
        <div className="card" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'var(--status-danger-bg)',
            color: 'var(--status-danger-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}>
            <ShieldAlert size={32} />
          </div>
          <h2 style={{ fontSize: '1.35rem', marginBottom: '0.5rem', color: 'var(--color-brand-title)' }}>
            Access Restricted
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Your account role is <strong>{user.role}</strong>. This module requires administrative authorization (<strong>{allowedRoles.join(', ')}</strong>).
          </p>
          <Link to="/" className="btn btn-secondary">
            <ArrowLeft size={16} /> Return to Permitted Workspace
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
