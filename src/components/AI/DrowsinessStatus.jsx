import React from 'react';
import './DrowsinessStatus.css';

const DrowsinessStatus = ({ demoMode = false }) => {
  const status = demoMode ? {
    detected: false,
    confidence: 0.94,
    status: 'normal'
  } : {
    detected: false,
    confidence: 0,
    status: 'unknown'
  };

  return (
    <div className={`ai-status-item ${status.status === 'normal' ? 'status-good' : 'status-warning'}`}>
      <div className="ai-status-icon">😴</div>
      <div className="ai-status-info">
        <span className="ai-status-label">Drowsiness</span>
        <span className="ai-status-value">
          {status.status === 'normal' ? 'Normal' : status.status === 'drowsy' ? 'Drowsy' : 'Unknown'}
        </span>
        {demoMode && <span className="ai-status-confidence">{Math.round(status.confidence * 100)}%</span>}
      </div>
    </div>
  );
};

export default DrowsinessStatus;