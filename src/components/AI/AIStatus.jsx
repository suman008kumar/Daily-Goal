import React from 'react';
import './AIStatus.css';

const AIStatus = ({
  icon,
  label,
  status,
  confidence = null,
  color = 'default'
}) => {
  return (
    <div className={`ai-status-item status-${color}`}>
      <div className="ai-status-icon">{icon}</div>
      <div className="ai-status-info">
        <span className="ai-status-label">{label}</span>
        <span className="ai-status-value">{status}</span>
        {confidence !== null && (
          <span className="ai-status-confidence">{Math.round(confidence * 100)}%</span>
        )}
      </div>
    </div>
  );
};

export default AIStatus;