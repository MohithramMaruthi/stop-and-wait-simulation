import React, { useRef, useEffect, useState } from 'react';
import { Terminal, Copy, Trash2, Check, Filter } from 'lucide-react';

export function EventLog({ logs, onClearLogs }) {
  const logContainerRef = useRef(null);
  const [filter, setFilter] = useState('ALL');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const filteredLogs = logs.filter((item) => {
    if (filter === 'LOSS_TIMEOUTS') {
      return ['LOSS', 'TIMEOUT', 'RETX', 'DUPLICATE'].includes(item.type);
    }
    if (filter === 'DATA_ACK') {
      return ['DATA', 'ACK', 'SUCCESS'].includes(item.type);
    }
    return true;
  });

  const getTagClass = (type) => {
    switch (type) {
      case 'DATA': return 'tag-data';
      case 'ACK': return 'tag-ack';
      case 'LOSS': return 'tag-loss';
      case 'TIMEOUT': return 'tag-timeout';
      case 'RETX': return 'tag-retx';
      case 'DUPLICATE': return 'tag-duplicate';
      case 'SUCCESS': return 'tag-success';
      case 'INFO':
      default: return 'tag-info';
    }
  };

  const handleCopyLogs = () => {
    if (logs.length === 0) return;
    const text = logs
      .map((l) => `${l.timestamp} [${l.type}] ${l.source ? `(${l.source})` : ''} - ${l.detail}`)
      .join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="event-log-dashboard-card">
      <div className="event-log-header">
        <div className="log-title-cluster">
          <Terminal size={17} className="log-header-icon text-blue" />
          <h2 className="log-card-title">Protocol Event Log</h2>
          <span className="log-count-pill">{filteredLogs.length} events</span>
        </div>

        <div className="log-controls-toolbar">
          {/* Filter Buttons */}
          <div className="log-filter-buttons">
            <button
              className={`btn-filter ${filter === 'ALL' ? 'filter-active' : ''}`}
              onClick={() => setFilter('ALL')}
            >
              All
            </button>
            <button
              className={`btn-filter ${filter === 'DATA_ACK' ? 'filter-active' : ''}`}
              onClick={() => setFilter('DATA_ACK')}
            >
              Data / ACK
            </button>
            <button
              className={`btn-filter ${filter === 'LOSS_TIMEOUTS' ? 'filter-active' : ''}`}
              onClick={() => setFilter('LOSS_TIMEOUTS')}
            >
              Loss &amp; Timeouts
            </button>
          </div>

          <div className="log-actions-group">
            {/* Copy Button */}
            <button
              className="btn-log-action"
              onClick={handleCopyLogs}
              title="Copy event logs to clipboard"
            >
              {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>

            {/* Clear Button */}
            <button
              className="btn-log-action"
              onClick={onClearLogs}
              title="Clear event logs"
            >
              <Trash2 size={14} />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>

      {/* Log Stream Body */}
      <div className="log-feed-viewport" ref={logContainerRef}>
        {filteredLogs.length === 0 ? (
          <div className="log-empty-state">
            No events recorded. Start simulation or step forward.
          </div>
        ) : (
          <div className="log-entries-list">
            {filteredLogs.map((log) => (
              <div key={log.id} className={`log-entry-row log-type-${log.type.toLowerCase()}`}>
                <div className="log-entry-prefix">
                  <span className="log-timestamp font-mono">{log.timestamp}</span>
                  <span className={`log-badge ${getTagClass(log.type)}`}>
                    {log.type}
                  </span>
                  {log.source && (
                    <span className="log-source-tag font-mono">[{log.source}]</span>
                  )}
                </div>
                <div className="log-entry-message">{log.detail}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
