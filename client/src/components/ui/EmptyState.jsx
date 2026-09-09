import React from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * Standardized visually centered EmptyState component
 * Supports both standalone rendering and embedded table rows
 */
export default function EmptyState({
  icon: Icon = HelpCircle,
  title = 'No records found',
  description = 'Try modifying your search query or reset active filters.',
  action,
  colSpan
}) {
  const content = (
    <div className="empty-state-box">
      <div className="empty-state-icon">
        <Icon size={26} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );

  if (colSpan) {
    return (
      <tr>
        <td colSpan={colSpan} style={{ padding: 0 }}>
          {content}
        </td>
      </tr>
    );
  }

  return content;
}
