import React from 'react';
import { Shield, Server } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border-subtle)',
      background: 'var(--color-bg-card)',
      transition: 'background-color var(--transition-normal)',
      marginTop: 'auto'
    }}>
      <div style={{
        maxWidth: 'var(--page-max-width)',
        margin: '0 auto',
        padding: 'var(--space-4) var(--space-8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.8125rem',
        color: 'var(--color-text-muted)',
        flexWrap: 'wrap',
        gap: 'var(--space-3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={16} color="var(--color-brand-600)" style={{ flexShrink: 0 }} />
          <span>Airports Authority of India &copy; {new Date().getFullYear()} &mdash; Regional Office IT Asset Lifecycle Management</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <span>Stack: MERN Enterprise v1.0.0</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Server size={14} style={{ flexShrink: 0 }} /> Node v22.13 &bull; React 19 &bull; MongoDB
          </span>
        </div>
      </div>
    </footer>
  );
}
