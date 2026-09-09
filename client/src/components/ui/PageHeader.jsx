import React from 'react';

/**
 * Standardized PageHeader component for enterprise government layout
 * Ensures identical title sizing, spacing, subtitle line-height, and action button alignment
 */
export default function PageHeader({
  title,
  icon: Icon,
  badgeText,
  badgeType = 'primary',
  subtitle,
  children
}) {
  return (
    <div className="page-header-container">
      <div className="page-title-group">
        {badgeText && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2px' }}>
            <span className={`badge badge-${badgeType}`}>{badgeText}</span>
          </div>
        )}
        <h1 className="page-title">
          {Icon && <Icon size={20} style={{ flexShrink: 0, color: 'var(--color-brand-600)' }} />}
          <span>{title}</span>
        </h1>
        {subtitle && (
          <p className="page-subtitle">
            {subtitle}
          </p>
        )}
      </div>

      {children && (
        <div className="page-actions-group">
          {children}
        </div>
      )}
    </div>
  );
}
