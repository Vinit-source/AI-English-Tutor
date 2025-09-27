import { useState } from 'react';
import '../styles/ScenarioCard.css';

const ScenarioCard = ({ 
  id,
  title, 
  description, 
  icon,
  iconName,
  status, 
  objectives,
  onClick, 
  delay = 0,
  animate = true,
  type,
  difficulty,
  metadata
}) => {
  const cardStyle = {
    animationDelay: `${delay}s`,
    opacity: animate ? 1 : 0
  };
  
  const getStatusBadge = () => {
    if (status === 'personalized' || status === 'agentic') {
      return <div className="scenario-status status-personalized">⭐ For You</div>;
    }
    if (status === 'practice') {
      return <div className="scenario-status status-practice">🎯 Practice</div>;
    }
    if (status === 'adaptive') {
      return <div className="scenario-status status-adaptive">🤖 Adaptive</div>;
    }
    if (status === 'free') {
      return <div className="scenario-status status-free">Free</div>;
    }
    return null;
  };
  
  return (
    <div 
      className="scenario-card" 
      onClick={() => onClick(id, objectives)}
      style={cardStyle}
      role="button"
      aria-label={`Start ${title} scenario`}
      tabIndex={0}
      data-status={status}
      data-type={type}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick(id, objectives);
        }
      }}
    >
      {getStatusBadge()}
      
      <div className="scenario-img-container">
        {icon || (
          <div className="image-placeholder">
            {title.charAt(0)}
          </div>
        )}
      </div>
      
      <h3 className="scenario-title">{title}</h3>
      
      <p className="scenario-description">
        {description || `Practice English conversation in a "${title}" scenario.`}
      </p>
      
      {difficulty && (
        <div className="scenario-difficulty">
          <span className="difficulty-label">Level: </span>
          <span className={`difficulty-value ${difficulty}`}>
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
          </span>
        </div>
      )}
      
      {metadata && metadata.generatedFrom && (
        <div className="scenario-metadata">
          <span className="metadata-text">
            Based on your interest in {metadata.generatedFrom}
          </span>
        </div>
      )}
      
      <div className="scenario-start-btn">
        Start Conversation
      </div>
    </div>
  );
};

export default ScenarioCard;
