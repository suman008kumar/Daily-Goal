import React from 'react';
import './EyeStatus.css';

const EyeStatus = ({ demoMode = false }) => {
  const status = demoMode ? {
    detected: true,
    confidence: 0.96,
    status: 'open'
  } : {
    detected: false,
    confidence: 0,
    status: 'unknown'
  };

  return (
    <div className={`ai-status-item ${status.status === 'open' ? 'status-good' : 'status-warning'}`}>
      <div className="ai-status-icon">👁️</div>
      <div className="ai-status-info">
        <span className="ai-status-label">Eyes</span>
        <span className="ai-status-value">
          {status.status === 'open' ? 'Open' : status.status === 'closed' ? 'Closed' : 'Unknown'}
        </span>
        {demoMode && <span className="ai-status-confidence">{Math.round(status.confidence * 100)}%</span>}
      </div>
    </div>
  );
};

export default EyeStatus;