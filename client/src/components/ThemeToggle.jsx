import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      id="theme-toggle-btn"
      onClick={toggleTheme}
      className={`theme-toggle-btn ${isDark ? 'is-dark' : 'is-light'}`}
      title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
    >
      <span className="theme-toggle-icon-wrap">
        {isDark ? (
          <Moon size={14} className="theme-icon moon-icon" />
        ) : (
          <Sun size={14} className="theme-icon sun-icon" />
        )}
      </span>
      <span className="theme-toggle-label">
        {isDark ? 'Dark' : 'Light'}
      </span>
      <span className="theme-toggle-switch-track" aria-hidden="true">
        <span className="theme-toggle-switch-thumb" />
      </span>
    </button>
  );
}
