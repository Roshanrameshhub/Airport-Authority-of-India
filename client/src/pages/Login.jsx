import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, Eye, EyeOff, AlertCircle, ShieldCheck } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(credential, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0A2540 0%, #0c1e36 60%, #001e3d 100%)',
      padding: '2.5rem 1.5rem',
      position: 'relative',
      boxSizing: 'border-box',
      width: '100%',
      maxWidth: '100%'
    }}>
      {/* Top Right Theme Switcher */}
      <div style={{ position: 'absolute', top: '20px', right: '24px', zIndex: 10 }}>
        <ThemeToggle />
      </div>

      <div style={{
        maxWidth: '440px',
        width: '100%',
        background: 'var(--color-bg-card)',
        borderRadius: 'var(--radius-xl)',
        padding: '2.5rem 2.25rem',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-subtle)',
        transition: 'background-color var(--transition-normal), border-color var(--transition-normal)'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img 
            src="/logo.svg" 
            alt="Airports Authority of India" 
            style={{ width: '56px', height: '56px', margin: '0 auto 0.75rem' }} 
          />
          <div style={{ 
            fontSize: '0.75rem', 
            fontWeight: 700, 
            color: 'var(--color-brand-600)', 
            letterSpacing: '0.08em', 
            textTransform: 'uppercase' 
          }}>
            Airports Authority of India
          </div>
          <h1 style={{ fontSize: '1.4rem', color: 'var(--color-brand-title)', marginTop: '0.2rem' }}>
            Asset Management Portal
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
            Regional Office IT Infrastructure & Custody Desk
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.75rem 1rem',
            background: 'var(--status-danger-bg)',
            border: '1px solid var(--status-danger-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--status-danger-text)',
            fontSize: '0.85rem',
            marginBottom: '1.25rem'
          }} id="login-error-alert">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label 
              htmlFor="credential-input" 
              style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.4rem' }}
            >
              Username or Official Email
            </label>
            <div style={{ position: 'relative' }}>
              <User 
                size={18} 
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} 
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
                  padding: '0.7rem 1rem 0.7rem 2.5rem',
                  backgroundColor: 'var(--color-bg-card)',
                  color: 'var(--color-text-main)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color var(--transition-fast)'
                }}
              />
            </div>
          </div>

          <div>
            <label 
              htmlFor="password-input" 
              style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.4rem' }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock 
                size={18} 
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} 
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
                  padding: '0.7rem 2.5rem 0.7rem 2.5rem',
                  backgroundColor: 'var(--color-bg-card)',
                  color: 'var(--color-text-main)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color var(--transition-fast)'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
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
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{
              padding: '0.8rem',
              fontSize: '0.95rem',
              marginTop: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
            id="login-submit-btn"
          >
            <ShieldCheck size={18} />
            <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        {/* Demo Accounts Quick-Fill */}
        <div style={{
          marginTop: '1.5rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid var(--border-subtle)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            Demo / Development Accounts
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => { setCredential('Admin'); setPassword('Admin@123'); }}
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.8rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-strong)',
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--color-text-main)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              id="demo-admin-fill-btn"
            >
              <div style={{ fontWeight: 600, color: 'var(--color-brand-500, #0284c7)' }}>Admin</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Admin@123</div>
            </button>
            <button
              type="button"
              onClick={() => { setCredential('Employee01'); setPassword('Employee@123'); }}
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.8rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-strong)',
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--color-text-main)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              id="demo-employee-fill-btn"
            >
              <div style={{ fontWeight: 600, color: 'var(--color-brand-500, #0284c7)' }}>Employee01</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Employee@123</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
