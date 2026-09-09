import React, { useState, useEffect } from 'react';
import { checkSystemHealth } from '../services/api';

export default function HealthStatus() {
  const [health, setHealth] = useState({ status: 'CHECKING', database: 'CONNECTING' });

  useEffect(() => {
    let mounted = true;

    const fetchHealth = async () => {
      try {
        const response = await checkSystemHealth();
        if (mounted && response.success) {
          setHealth(response.data);
        }
      } catch (err) {
        if (mounted) {
          setHealth({ status: 'OFFLINE', database: 'DISCONNECTED' });
        }
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const isHealthy = health.status === 'HEALTHY';

  return (
    <div 
      className="health-pill" 
      style={{
        background: isHealthy ? 'var(--status-available-bg)' : 'var(--status-danger-bg)',
        color: isHealthy ? 'var(--status-available-text)' : 'var(--status-danger-text)',
        border: `1px solid ${isHealthy ? 'var(--status-available-border)' : 'var(--status-danger-border)'}`
      }}
      title={`Database: ${health.database} | Uptime: ${health.uptime || 'N/A'}`}
      id="system-health-indicator"
    >
      <span 
        className="pulse-dot" 
        style={{ background: isHealthy ? '#10b981' : '#ef4444' }}
      />
      <span>API: {health.status}</span>
    </div>
  );
}
