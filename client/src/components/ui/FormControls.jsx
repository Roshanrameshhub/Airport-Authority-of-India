import React from 'react';
import { Search, X, RotateCcw } from 'lucide-react';

/**
 * Standardized Search input with integrated left icon and 38px enterprise height
 */
export function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  id = 'search-input',
  style,
  ...props
}) {
  return (
    <div className="search-input-wrapper" style={style}>
      <Search size={16} className="search-icon" />
      <input
        id={id}
        type="text"
        className="form-input"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        {...props}
      />
      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
          title="Clear search"
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            padding: 0
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

/**
 * Standardized Select dropdown with 38px enterprise height and uniform styling
 */
export function SelectInput({
  value,
  onChange,
  options = [],
  placeholder,
  id,
  children,
  style,
  ...props
}) {
  return (
    <select
      id={id}
      className="form-select"
      value={value}
      onChange={onChange}
      style={style}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.length > 0
        ? options.map((opt) => (
            <option key={opt.value ?? opt.code ?? opt.name ?? opt} value={opt.value ?? opt.name ?? opt}>
              {opt.label ?? opt.name ?? opt}
            </option>
          ))
        : children}
    </select>
  );
}

/**
 * Standardized Clear Filters button with 38px height to align on the exact same baseline
 */
export function ClearFilterButton({
  onClick,
  title = 'Clear Filters',
  id = 'clear-filters-btn',
  style
}) {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      className="btn btn-secondary"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        ...style
      }}
    >
      <RotateCcw size={14} />
      <span>{title}</span>
    </button>
  );
}
