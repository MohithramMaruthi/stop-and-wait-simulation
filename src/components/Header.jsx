import React from 'react';
import { Moon, Sun, ShieldCheck } from 'lucide-react';

export function Header({ theme, onToggleTheme }) {
  return (
    <header className="dashboard-header">
      <div className="header-brand-container">
        <div className="header-badge">
          <ShieldCheck size={13} className="header-badge-icon" />
          <span>COMMUNICATION &amp; NETWORK SECURITY</span>
        </div>
        <h1 className="header-main-title">Stop-and-Wait Protocol</h1>
        <p className="header-subtitle">Reliable Data Transmission Simulator</p>
      </div>

      <div className="header-actions">
        <button 
          className="btn-theme-toggle" 
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <>
              <Sun size={15} />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon size={15} />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
