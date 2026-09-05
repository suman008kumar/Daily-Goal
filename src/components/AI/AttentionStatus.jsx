import React from 'react';
import './AttentionStatus.css';

const AttentionStatus = ({ demoMode = false }) => {
  const status = demoMode ? {
    detected: true,
    confidence: 0.91,
    status: 'focused'
  } : {
    detected: false,
    confidence: 0,
    status: 'unknown'
  };

  return (
    <div className={`ai-status-item ${status.status === 'focused' ? 'status-good' : 'status-warning'}`}>
      <div className="ai-status-icon">🎯</div>
      <div className="ai-status-info">
        <span className="ai-status-label">Attention</span>
        <span className="ai-status-value">
          {status.status === 'focused' ? 'Focused' : status.status === 'looking_away' ? 'Looking Away' : 'Unknown'}
        </span>
        {demoMode && <span className="ai-status-confidence">{Math.round(status.confidence * 100)}%</span>}
      </div>
    </div>
  );
};

export default AttentionStatus;