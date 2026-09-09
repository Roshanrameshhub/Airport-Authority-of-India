import React from 'react';

/**
 * Standardized Enterprise DataTable container and helper components
 * Implements internal scrolling with sticky headers and zero page overflow
 */
export function DataTable({ children, style, className = '', tableClassName = '', id }) {
  const isDirectTable = React.isValidElement(children) && children.type === 'table';

  return (
    <div className={`table-container ${className}`} style={style} id={id}>
      <div className="table-scroll-area">
        {isDirectTable ? (
          children
        ) : (
          <table className={`data-table ${tableClassName}`.trim()}>
            {children}
          </table>
        )}
      </div>
    </div>
  );
}

/**
 * Standardized Table Action Icon Button (32px x 32px)
 */
export function TableActionBtn({
  icon: Icon,
  onClick,
  title,
  id,
  variant = 'secondary',
  style,
  children,
  ...props
}) {
  return (
    <button
      type="button"
      className={`btn btn-${variant} ${Icon && !children ? 'btn-icon-sm' : 'btn-sm'}`}
      onClick={onClick}
      title={title}
      id={id}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.35rem',
        ...style
      }}
      {...props}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

export default DataTable;
