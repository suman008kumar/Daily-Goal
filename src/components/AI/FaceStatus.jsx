import React from 'react';
import './FaceStatus.css';

const FaceStatus = ({ demoMode = false }) => {
  const status = demoMode ? {
    detected: true,
    confidence: 0.98,
    status: 'Detected'
  } : {
    detected: false,
    confidence: 0,
    status: 'Unknown'
  };

  return (
    <div className={`ai-status-item ${status.detected ? 'good' : ''}`}>
      <span className="ai-status-icon">👤</span>
      <span className="ai-status-label">Face</span>
      <span className="ai-status-value">{status.status}</span>
      {demoMode && <span className="ai-status-confidence">{Math.round(status.confidence * 100)}%</span>}
    </div>
  );
};

export default FaceStatus;