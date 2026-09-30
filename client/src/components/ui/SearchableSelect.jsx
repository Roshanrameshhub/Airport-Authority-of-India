import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, ChevronDown, Loader2, Check, AlertCircle } from 'lucide-react';

/**
 * SearchableSelect
 * 
 * Reusable, server-driven searchable combobox component.
 * Designed for high-performance bounded asynchronous searching (e.g. assets, employees).
 * 
 * Features:
 * - Debounced asynchronous server searching (~300ms default)
 * - Zero unbounded client-side accumulation
 * - Loading indicator and empty/no-results states
 * - Controlled value support with clean onChange(option, value) callback
 * - Disabled state & configurable placeholder
 * - Keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
 * - Click-outside dismissal
 * - Generic: supports custom label/value accessors and custom option renderers
 */
export default function SearchableSelect({
  id,
  name,
  value,
  onChange,
  loadOptions,
  placeholder = 'Type to search...',
  disabled = false,
  debounceMs = 300,
  minQueryLength = 1,
  isClearable = true,
  selectedOption = null,
  selectedLabel = '',
  getOptionLabel,
  getOptionValue,
  renderOption,
  noResultsText = 'No matching results found',
  error = null,
  helperText = null,
  className = '',
  style = {}
}) {
  // Accessor fallbacks
  const resolveLabel = useCallback((opt) => {
    if (!opt) return '';
    if (typeof getOptionLabel === 'function') {
      return getOptionLabel(opt);
    }
    if (typeof opt === 'string' || typeof opt === 'number') {
      return String(opt);
    }
    // Default smart enterprise label resolution
    if (opt.assetId && opt.assetName) {
      return `${opt.assetId} — ${opt.assetName}`;
    }
    if (opt.assetId) return opt.assetId;
    if (opt.fullName) {
      return opt.employeeId ? `${opt.employeeId} — ${opt.fullName}` : opt.fullName;
    }
    if (opt.firstName || opt.lastName) {
      const name = [opt.firstName, opt.lastName].filter(Boolean).join(' ');
      return opt.employeeId ? `${opt.employeeId} — ${name}` : name;
    }
    if (opt.label) return opt.label;
    if (opt.name) return opt.name;
    return String(opt.id || opt.value || opt);
  }, [getOptionLabel]);

  const resolveValue = useCallback((opt) => {
    if (!opt) return '';
    if (typeof getOptionValue === 'function') {
      return getOptionValue(opt);
    }
    if (typeof opt === 'string' || typeof opt === 'number') {
      return opt;
    }
    return opt.value ?? opt.id ?? opt.assetId ?? opt.employeeId ?? opt._id ?? opt;
  }, [getOptionValue]);

  // Internal state
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [internalSelected, setInternalSelected] = useState(null);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const requestIdRef = useRef(0);

  // Derive activeOption cleanly without triggering cascading renders via setState in effect
  const activeOption = selectedOption
    ? selectedOption
    : (value && typeof value === 'object')
      ? value
      : (internalSelected && value && resolveValue(internalSelected) === value)
        ? internalSelected
        : null;

  // Compute display text for the input
  const displayValue = activeOption
    ? resolveLabel(activeOption)
    : (selectedLabel || (typeof value === 'string' ? value : ''));

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Trigger search with debounce
  const executeSearch = useCallback((query) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = (query || '').trim();

    if (trimmed.length < minQueryLength) {
      setOptions([]);
      setLoading(false);
      setHasSearched(false);
      setSearchError(null);
      return;
    }

    if (typeof loadOptions !== 'function') {
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      const currentRequestId = ++requestIdRef.current;
      setLoading(true);
      setSearchError(null);

      try {
        const results = await loadOptions(trimmed);
        // Prevent race condition: only update state if this is still the latest request
        if (requestIdRef.current === currentRequestId) {
          const items = Array.isArray(results) ? results : (results?.items || results?.data || []);
          setOptions(items);
          setHasSearched(true);
          setLoading(false);
          setHighlightedIndex(items.length > 0 ? 0 : -1);
        }
      } catch (err) {
        if (requestIdRef.current === currentRequestId) {
          console.error('[SearchableSelect error]', err);
          setOptions([]);
          setSearchError(err.message || 'Failed to load results');
          setHasSearched(true);
          setLoading(false);
          setHighlightedIndex(-1);
        }
      }
    }, debounceMs);
  }, [loadOptions, minQueryLength, debounceMs]);

  // Handle user input changes
  const handleInputChange = (e) => {
    const newQuery = e.target.value;
    setSearchTerm(newQuery);
    if (!isOpen) {
      setIsOpen(true);
    }
    executeSearch(newQuery);
  };

  // Handle opening dropdown on focus or click
  const handleInputFocus = () => {
    if (disabled) return;
    setIsOpen(true);
    // If input already has text or minQueryLength is 0, trigger search
    if (searchTerm.trim().length >= minQueryLength) {
      executeSearch(searchTerm);
    } else if (minQueryLength === 0) {
      executeSearch('');
    }
  };

  // Select an option
  const handleSelectOption = (option) => {
    setInternalSelected(option);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);

    if (onChange) {
      const val = option ? resolveValue(option) : null;
      onChange(option, val);
    }

    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  // Clear selection
  const handleClear = (e) => {
    e.stopPropagation();
    if (disabled) return;

    setInternalSelected(null);
    setSearchTerm('');
    setOptions([]);
    setHasSearched(false);
    setHighlightedIndex(-1);

    if (onChange) {
      onChange(null, null);
    }

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
        if (searchTerm.trim().length >= minQueryLength || minQueryLength === 0) {
          executeSearch(searchTerm);
        }
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (options.length > 0) {
          setHighlightedIndex((prev) => (prev + 1) % options.length);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (options.length > 0) {
          setHighlightedIndex((prev) => (prev - 1 + options.length) % options.length);
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          handleSelectOption(options[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  // Auto-scroll highlighted option into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const itemElement = listRef.current.children[highlightedIndex];
      if (itemElement && typeof itemElement.scrollIntoView === 'function') {
        itemElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const hasValue = Boolean(activeOption || value || selectedLabel);
  const inputValue = isOpen && searchTerm !== '' ? searchTerm : (hasValue ? displayValue : '');

  return (
    <div
      ref={containerRef}
      className={`searchable-select-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        boxSizing: 'border-box',
        ...style
      }}
    >
      {/* Combobox Input Box */}
      <div
        className="searchable-select-control"
        style={{
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          width: '100%',
          height: 'var(--control-height, 36px)',
          minHeight: '36px',
          background: disabled ? 'var(--color-bg-subtle, #f1f5f9)' : 'var(--color-bg-card, #ffffff)',
          border: error
            ? '1px solid var(--color-danger, #ef4444)'
            : isOpen
              ? '1px solid var(--color-brand-600, #0284c7)'
              : '1px solid var(--border-strong, #cbd5e1)',
          boxShadow: isOpen ? '0 0 0 3px rgba(2, 132, 199, 0.15)' : 'none',
          borderRadius: 'var(--radius-md, 6px)',
          transition: 'border-color 150ms ease, box-shadow 150ms ease',
          opacity: disabled ? 0.7 : 1,
          cursor: disabled ? 'not-allowed' : 'text'
        }}
        onClick={() => {
          if (!disabled && inputRef.current) {
            inputRef.current.focus();
          }
        }}
      >
        {/* Leading Search Icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingLeft: '10px',
            color: 'var(--color-text-muted, #94a3b8)',
            pointerEvents: 'none'
          }}
        >
          <Search size={15} />
        </div>

        {/* Search / Display Input */}
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          disabled={disabled}
          placeholder={hasValue && !isOpen ? displayValue : placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            height: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            padding: '0 8px',
            fontSize: '0.8125rem',
            color: 'var(--color-text-main, #0f172a)',
            fontFamily: 'inherit',
            width: '100%',
            cursor: disabled ? 'not-allowed' : 'text'
          }}
        />

        {/* Trailing Controls: Clear, Loading Spinner, Chevron */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            paddingRight: '8px'
          }}
        >
          {loading && (
            <Loader2
              size={15}
              style={{
                color: 'var(--color-brand-600, #0284c7)',
                animation: 'spin 1s linear infinite'
              }}
            />
          )}

          {!loading && isClearable && hasValue && !disabled && (
            <button
              type="button"
              id={id ? `${id}-clear-btn` : undefined}
              onClick={handleClear}
              title="Clear selection"
              aria-label="Clear selection"
              style={{
                background: 'none',
                border: 'none',
                padding: '2px',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-muted, #94a3b8)',
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm, 4px)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-text-main, #0f172a)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-muted, #94a3b8)';
              }}
            >
              <X size={14} />
            </button>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-muted, #94a3b8)',
              pointerEvents: 'none',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 150ms ease'
            }}
          >
            <ChevronDown size={15} />
          </div>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div
          ref={listRef}
          role="listbox"
          id={id ? `${id}-options-list` : undefined}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: '260px',
            overflowY: 'auto',
            background: 'var(--color-bg-card, #ffffff)',
            border: '1px solid var(--border-subtle, #e2e8f0)',
            borderRadius: 'var(--radius-md, 6px)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 1050,
            padding: '4px'
          }}
        >
          {/* State 1: Loading */}
          {loading && (
            <div
              style={{
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8125rem',
                color: 'var(--color-text-muted, #64748b)'
              }}
            >
              <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Searching...</span>
            </div>
          )}

          {/* State 2: Error */}
          {!loading && searchError && (
            <div
              style={{
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8125rem',
                color: 'var(--color-danger, #ef4444)'
              }}
            >
              <AlertCircle size={15} />
              <span>{searchError}</span>
            </div>
          )}

          {/* State 3: Prompt (user has not typed enough characters yet) */}
          {!loading && !searchError && !hasSearched && searchTerm.trim().length < minQueryLength && (
            <div
              style={{
                padding: '12px 14px',
                fontSize: '0.8125rem',
                color: 'var(--color-text-muted, #64748b)',
                textAlign: 'center'
              }}
            >
              {minQueryLength > 0
                ? `Type at least ${minQueryLength} character${minQueryLength > 1 ? 's' : ''} to search...`
                : 'Search for records...'}
            </div>
          )}

          {/* State 4: Empty results after search */}
          {!loading && !searchError && hasSearched && options.length === 0 && (
            <div
              style={{
                padding: '12px 14px',
                fontSize: '0.8125rem',
                color: 'var(--color-text-muted, #64748b)',
                textAlign: 'center'
              }}
            >
              {noResultsText}
            </div>
          )}

          {/* State 5: Options list */}
          {!loading && !searchError && options.length > 0 && options.map((opt, index) => {
            const optValue = resolveValue(opt);
            const isSelected = activeOption
              ? resolveValue(activeOption) === optValue
              : (value === optValue);
            const isHighlighted = index === highlightedIndex;

            return (
              <div
                key={optValue ?? index}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelectOption(opt)}
                onMouseEnter={() => setHighlightedIndex(index)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm, 4px)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  fontSize: '0.8125rem',
                  background: isHighlighted
                    ? 'var(--color-bg-hover, #f1f5f9)'
                    : isSelected
                      ? 'var(--color-bg-subtle, #f8fafc)'
                      : 'transparent',
                  color: isSelected
                    ? 'var(--color-brand-600, #0284c7)'
                    : 'var(--color-text-main, #0f172a)',
                  transition: 'background-color 100ms ease'
                }}
              >
                {/* Option Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {typeof renderOption === 'function' ? (
                    renderOption(opt, { isSelected, isHighlighted })
                  ) : (
                    <DefaultOptionRenderer opt={opt} resolveLabel={resolveLabel} />
                  )}
                </div>

                {/* Selected Checkmark Indicator */}
                {isSelected && (
                  <Check
                    size={15}
                    style={{
                      color: 'var(--color-brand-600, #0284c7)',
                      flexShrink: 0
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Helper text or Error message */}
      {(error || helperText) && (
        <div
          style={{
            marginTop: '3px',
            fontSize: '0.75rem',
            color: error ? 'var(--color-danger, #ef4444)' : 'var(--color-text-muted, #64748b)'
          }}
        >
          {error || helperText}
        </div>
      )}
    </div>
  );
}

/**
 * Default option renderer with intelligent formatting for assets, employees, and generic objects
 */
function DefaultOptionRenderer({ opt, resolveLabel }) {
  if (typeof opt !== 'object' || opt === null) {
    return <span>{String(opt)}</span>;
  }

  // 1. Asset rendering: Asset ID (bold mono) + Category badge + Status / Name
  if (opt.assetId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>
            {opt.assetId}
          </span>
          {opt.category && (
            <span
              style={{
                fontSize: '0.7rem',
                padding: '1px 5px',
                borderRadius: 'var(--radius-sm, 4px)',
                background: 'var(--color-bg-subtle, #f1f5f9)',
                color: 'var(--color-text-muted, #64748b)'
              }}
            >
              {opt.category}
            </span>
          )}
          {opt.status && (
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: '10px',
                background: opt.status === 'AVAILABLE' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(2, 132, 199, 0.12)',
                color: opt.status === 'AVAILABLE' ? '#059669' : '#0284c7'
              }}
            >
              {opt.status}
            </span>
          )}
        </div>
        {(opt.assetName || opt.make || opt.model) && (
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}>
            {[opt.assetName, opt.make, opt.model].filter(Boolean).join(' • ')}
          </span>
        )}
      </div>
    );
  }

  // 2. Employee rendering: Employee ID (bold mono) + Name + Department
  if (opt.employeeId) {
    const fullName = opt.fullName || [opt.firstName, opt.lastName].filter(Boolean).join(' ') || opt.name;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>
            {opt.employeeId}
          </span>
          {fullName && (
            <span style={{ fontWeight: 500 }}>{fullName}</span>
          )}
        </div>
        {(opt.department || opt.designation || opt.email) && (
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}>
            {[opt.department, opt.designation, opt.email].filter(Boolean).join(' • ')}
          </span>
        )}
      </div>
    );
  }

  // 3. Fallback generic object
  return <span>{resolveLabel(opt)}</span>;
}
