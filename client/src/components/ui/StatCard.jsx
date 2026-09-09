import React from 'react';

/**
 * Standardized KPI StatCard component
 * Enforces uniform heights, natural label wrapping, prominent value, and secondary icon chips
 */
export default function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  variant = 'indigo',
  onClick,
  style
}) {
  return (
    <div
      className={`stat-card ${variant}`}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
    >
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        {Icon && (
          <div className="stat-icon">
            <Icon size={16} />
          </div>
        )}
      </div>
      <div className="stat-card-body">
        <div className="stat-value">{value ?? '--'}</div>
        {subtext && <div className="stat-subtext" title={subtext}>{subtext}</div>}
      </div>
    </div>
  );
}
