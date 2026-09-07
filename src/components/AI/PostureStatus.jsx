import React from 'react';
import './PostureStatus.css';

const PostureStatus = ({ demoMode = false }) => {
  const status = demoMode ? {
    detected: true,
    confidence: 0.89,
    status: 'good'
  } : {
    detected: false,
    confidence: 0,
    status: 'unknown'
  };

  return (
    <div className={`ai-status-item ${status.status === 'good' ? 'status-good' : 'status-warning'}`}>
      <div className="ai-status-icon">🧍</div>
      <div className="ai-status-info">
        <span className="ai-status-label">Posture</span>
        <span className="ai-status-value">
          {status.status === 'good' ? 'Good' : status.status === 'bad' ? 'Bad' : 'Unknown'}
        </span>
        {demoMode && <span className="ai-status-confidence">{Math.round(status.confidence * 100)}%</span>}
      </div>
    </div>
  );
};

export default PostureStatus;