import React from 'react';
import './PhoneStatus.css';

const PhoneStatus = ({ demoMode = false }) => {
  const status = demoMode ? {
    detected: false,
    confidence: 0.97,
    status: 'not_detected'
  } : {
    detected: false,
    confidence: 0,
    status: 'unknown'
  };

  return (
    <div className={`ai-status-item ${status.status === 'not_detected' ? 'status-good' : 'status-warning'}`}>
      <div className="ai-status-icon">📱</div>
      <div className="ai-status-info">
        <span className="ai-status-label">Phone</span>
        <span className="ai-status-value">
          {status.status === 'not_detected' ? 'Not Detected' : 'Detected'}
        </span>
        {demoMode && <span className="ai-status-confidence">{Math.round(status.confidence * 100)}%</span>}
      </div>
    </div>
  );
};

export default PhoneStatus;