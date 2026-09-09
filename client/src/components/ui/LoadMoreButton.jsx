import React from 'react';
import { RefreshCw, ChevronDown, AlertCircle } from 'lucide-react';

/**
 * Standardized Enterprise LoadMoreButton Component
 * Supports progressive server-side pagination, counter display,
 * anti-spam click protection, and inline retry handling.
 */
export default function LoadMoreButton({
  currentCount = 0,
  totalCount = 0,
  loading = false,
  onLoadMore,
  error = null,
  onRetry,
  itemName = 'records',
  id
}) {
  const hasMore = currentCount < totalCount;
  const buttonId = id || `load-more-${itemName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-btn`;

  return (
    <div className="load-more-container" role="region" aria-label="Pagination Controls">
      {error ? (
        <div className="load-more-error" role="alert">
          <AlertCircle size={15} />
          <span>Unable to load more {itemName}.</span>
          {onRetry && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onRetry}
              disabled={loading}
              title={`Retry loading more ${itemName}`}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Retry</span>
            </button>
          )}
        </div>
      ) : hasMore ? (
        <button
          type="button"
          className="btn btn-secondary btn-load-more"
          onClick={onLoadMore}
          disabled={loading}
          id={buttonId}
          aria-busy={loading}
          title={`Load next batch of ${itemName}`}
        >
          {loading ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              <span>Loading more...</span>
            </>
          ) : (
            <>
              <span>Load More</span>
              <ChevronDown size={14} />
            </>
          )}
        </button>
      ) : null}

      <div className="load-more-counter" aria-live="polite">
        Showing {currentCount} of {totalCount} {itemName}
      </div>
    </div>
  );
}
