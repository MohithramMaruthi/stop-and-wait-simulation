import React from 'react';
import { 
  Send, 
  CheckCircle, 
  RefreshCw, 
  AlertOctagon, 
  Clock, 
  Copy,
  TrendingUp,
  FileQuestion
} from 'lucide-react';

export function Statistics({ stats, totalFrames }) {
  const successRate = parseFloat(stats.successRate) || 100.0;

  return (
    <div className="statistics-dashboard-section">
      <div className="stats-section-header">
        <div className="stats-title-group">
          <TrendingUp size={16} className="stats-title-icon text-blue" />
          <h2 className="stats-section-title">Live Statistics</h2>
        </div>

        {/* Transmission Success Rate Header Highlight */}
        <div className="success-rate-banner">
          <span className="rate-title">Transmission Success Rate:</span>
          <span className="rate-value font-mono">{stats.successRate}%</span>
        </div>
      </div>

      {/* Grid of 7 Statistic Cards */}
      <div className="stats-cards-grid">
        {/* 1. Frames Sent */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Frames Sent</span>
            <Send size={15} className="stat-icon text-blue" />
          </div>
          <div className="stat-card-number font-mono">{stats.totalFramesSent}</div>
        </div>

        {/* 2. Delivered & ACKed */}
        <div className="stat-card stat-card-success">
          <div className="stat-card-header">
            <span className="stat-card-title">Delivered &amp; ACKed</span>
            <CheckCircle size={15} className="stat-icon text-emerald" />
          </div>
          <div className="stat-card-number font-mono">
            {stats.successfulFrames}
            <span className="stat-card-sub"> / {totalFrames}</span>
          </div>
        </div>

        {/* 3. Retransmissions */}
        <div className={`stat-card ${stats.retransmissions > 0 ? 'stat-card-warning' : ''}`}>
          <div className="stat-card-header">
            <span className="stat-card-title">Retransmissions</span>
            <RefreshCw size={15} className="stat-icon text-amber" />
          </div>
          <div className="stat-card-number font-mono">{stats.retransmissions}</div>
        </div>

        {/* 4. ACKs Lost */}
        <div className={`stat-card ${stats.acksLost > 0 ? 'stat-card-danger' : ''}`}>
          <div className="stat-card-header">
            <span className="stat-card-title">ACKs Lost</span>
            <AlertOctagon size={15} className="stat-icon text-red" />
          </div>
          <div className="stat-card-number font-mono">{stats.acksLost}</div>
        </div>

        {/* 5. Frames Lost */}
        <div className={`stat-card ${stats.framesLost > 0 ? 'stat-card-danger' : ''}`}>
          <div className="stat-card-header">
            <span className="stat-card-title">Frames Lost</span>
            <FileQuestion size={15} className="stat-icon text-red" />
          </div>
          <div className="stat-card-number font-mono">{stats.framesLost}</div>
        </div>

        {/* 6. Timeouts */}
        <div className={`stat-card ${stats.timeouts > 0 ? 'stat-card-warning' : ''}`}>
          <div className="stat-card-header">
            <span className="stat-card-title">Timeouts</span>
            <Clock size={15} className="stat-icon text-amber" />
          </div>
          <div className="stat-card-number font-mono">{stats.timeouts}</div>
        </div>

        {/* 7. Duplicates Detected */}
        <div className={`stat-card ${stats.duplicatesDetected > 0 ? 'stat-card-purple' : ''}`}>
          <div className="stat-card-header">
            <span className="stat-card-title">Duplicates Detected</span>
            <Copy size={15} className="stat-icon text-purple" />
          </div>
          <div className="stat-card-number font-mono">{stats.duplicatesDetected}</div>
        </div>
      </div>
    </div>
  );
}
