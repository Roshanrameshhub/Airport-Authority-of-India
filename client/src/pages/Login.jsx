import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Lock, User, Eye, EyeOff, AlertCircle, ShieldCheck } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import './Login.css';

export default function Login() {
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const user = await login(credential, password);
      if (user?.role === 'ADMIN') {
        const dest = from && from !== '/login' ? from : '/';
        navigate(dest, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (demoCred, demoPass) => {
    setError('');
    setIsSubmitting(true);
    setCredential(demoCred);
    setPassword(demoPass);

    try {
      const user = await login(demoCred, demoPass);
      if (user?.role === 'ADMIN') {
        const dest = from && from !== '/login' ? from : '/';
        navigate(dest, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Demo authentication failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-viewport-wrapper">
      {/* LAYER 1 — BACKGROUND (Full Width Cover, Left to Right, Top to Bottom) */}
      <div className="login-bg-layer" aria-hidden="true">
        <img
          src="/assets/login-light.jpg"
          alt="AAI Airport Sunrise - Light Theme"
          className={`login-background-image ${!isDark ? 'is-active' : ''}`}
        />
        <img
          src="/assets/login-dark.jpg"
          alt="AAI Airport Night - Dark Theme"
          className={`login-background-image ${isDark ? 'is-active' : ''}`}
        />
      </div>

      {/* LAYER 3 — THEME TOGGLE (Fixed top: 24px, right: 28px, z-index: 50) */}
      <div className="login-theme-toggle-wrap">
        <ThemeToggle />
      </div>

      {/* LAYER 2 — LOGIN CONTENT (Centered Overlay Relative to Entire Viewport) */}
      <div className="login-content">
        <div className="login-card-container">
          {/* Brand Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.1rem' }}>
            <img 
              src="/logo.svg" 
              alt="Airports Authority of India" 
              style={{ width: '40px', height: '40px', margin: '0 auto 0.35rem' }} 
            />
            <div style={{ 
              fontSize: '0.68rem', 
              fontWeight: 700, 
              color: 'var(--color-brand-600)', 
              letterSpacing: '0.08em', 
              textTransform: 'uppercase' 
            }}>
              Airports Authority of India
            </div>
            <h1 style={{ fontSize: '1.15rem', color: 'var(--color-brand-title)', marginTop: '0.15rem' }}>
              Asset Management Portal
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.76rem', marginTop: '0.2rem' }}>
              Regional Office IT Infrastructure & Custody Desk
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 0.75rem',
              background: 'var(--status-danger-bg)',
              border: '1px solid var(--status-danger-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--status-danger-text)',
              fontSize: '0.78rem',
              marginBottom: '0.85rem'
            }} id="login-error-alert">
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div>
              <label 
                htmlFor="credential-input" 
                style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.3rem' }}
              >
                Username or Official Email
              </label>
              <div style={{ position: 'relative' }}>
                <User 
                  size={15} 
                  style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} 
                />
                <input
                  id="credential-input"
                  type="text"
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  placeholder="e.g. admin or employee.name"
                  required
                  style={{
                    width: '100%',
                    padding: '0.52rem 0.75rem 0.52rem 2.2rem',
                    backgroundColor: 'var(--color-bg-card)',
                    color: 'var(--color-text-main)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.82rem',
                    outline: 'none',
                    transition: 'border-color var(--transition-fast)'
                  }}
                />
              </div>
            </div>

            <div>
              <label 
                htmlFor="password-input" 
                style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.3rem' }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock 
                  size={15} 
                  style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} 
                />
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{
                    width: '100%',
                    padding: '0.52rem 2.2rem 0.52rem 2.2rem',
                    backgroundColor: 'var(--color-bg-card)',
                    color: 'var(--color-text-main)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.82rem',
                    outline: 'none',
                    transition: 'border-color var(--transition-fast)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    color: 'var(--color-text-muted)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{
                padding: '0.6rem',
                fontSize: '0.85rem',
                marginTop: '0.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
              id="login-submit-btn"
            >
              <ShieldCheck size={16} />
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
            </button>
          </form>

          {/* Demo Cards — Compact, Side by Side, Directly Clickable */}
          <div
            id="demo-credentials-section"
            style={{
              marginTop: '0.9rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.45rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: 'var(--color-text-main)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Demo Accounts
              </span>
              <span
                style={{
                  fontSize: '0.62rem',
                  padding: '1px 5px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(2, 132, 199, 0.1)',
                  color: 'var(--color-brand-500, #0284c7)',
                  fontWeight: 600,
                  border: '1px solid rgba(2, 132, 199, 0.25)',
                }}
              >
                1-Click Sign In
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
              {/* Admin Demo Card */}
              <button
                type="button"
                onClick={() => handleDemoLogin('admin', 'Admin@123')}
                disabled={isSubmitting}
                className="demo-card-btn"
                id="demo-admin-login-btn"
                data-testid="demo-admin-card"
                title="Click to log in directly as System Administrator"
                style={{
                  padding: '0.5rem 0.6rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-subtle, rgba(255,255,255,0.04))',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--color-text-main)',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.15rem',
                  opacity: isSubmitting ? 0.6 : 1,
                  transition: 'border-color var(--transition-fast), background-color var(--transition-fast)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.74rem', color: 'var(--color-brand-500, #0284c7)' }}>
                    Admin
                  </span>
                  <span style={{ fontSize: '0.58rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Panel
                  </span>
                </div>
                <div style={{ fontSize: '0.66rem', color: 'var(--color-text-secondary)', lineHeight: 1.25 }}>
                  <code style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.66rem', color: 'var(--color-text-main)' }}>admin</code>
                  <span style={{ color: 'var(--color-text-muted)' }}> / </span>
                  <code style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.66rem', color: 'var(--color-text-muted)' }}>Admin@123</code>
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--color-brand-600, #0284c7)', fontWeight: 600, marginTop: '0.15rem' }}>
                  Sign In to Panel →
                </div>
              </button>

              {/* Employee Demo Card */}
              <button
                type="button"
                onClick={() => handleDemoLogin('employee01', 'Employee@123')}
                disabled={isSubmitting}
                className="demo-card-btn"
                id="demo-employee-login-btn"
                data-testid="demo-employee-card"
                title="Click to log in directly as Demo Employee"
                style={{
                  padding: '0.5rem 0.6rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-subtle, rgba(255,255,255,0.04))',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--color-text-main)',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.15rem',
                  opacity: isSubmitting ? 0.6 : 1,
                  transition: 'border-color var(--transition-fast), background-color var(--transition-fast)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.74rem', color: 'var(--color-brand-500, #0284c7)' }}>
                    Employee
                  </span>
                  <span style={{ fontSize: '0.58rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Desk
                  </span>
                </div>
                <div style={{ fontSize: '0.66rem', color: 'var(--color-text-secondary)', lineHeight: 1.25 }}>
                  <code style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.66rem', color: 'var(--color-text-main)' }}>employee01</code>
                  <span style={{ color: 'var(--color-text-muted)' }}> / </span>
                  <code style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.66rem', color: 'var(--color-text-muted)' }}>Employee@123</code>
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--color-brand-600, #0284c7)', fontWeight: 600, marginTop: '0.15rem' }}>
                  Sign In to Desk →
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
