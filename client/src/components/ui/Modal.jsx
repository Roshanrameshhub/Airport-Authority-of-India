import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Standardized Enterprise Modal dialog component
 * Ensures identical backdrop, header spacing, body scrolling, footer button placement, and width logic
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  children,
  footer,
  id
}) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      id={id ? `${id}-backdrop` : undefined}
    >
      <div
        className={`modal-content modal-${size}`}
        role="dialog"
        aria-modal="true"
        id={id}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.1875rem', fontWeight: 700, color: 'var(--color-brand-900)', margin: 0 }}>
              {title}
            </h2>
            {subtitle && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: 'var(--radius-sm)'
            }}
            title="Close dialog"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
