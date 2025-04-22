import { useState } from 'react';
import '../styles/ScenarioCard.css';

const ScenarioCard = ({ 
  title, 
  description, 
  image, 
  icon,
  status, 
  onClick, 
  delay = 0,
  animate = true
}) => {
  const cardStyle = {
    animationDelay: `${delay}s`,
    opacity: animate ? 1 : 0
  };
  
  return (
    <div 
      className="scenario-card" 
      onClick={onClick}
      style={cardStyle}
      role="button"
      aria-label={`Start ${title} scenario`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      {status === 'free' && (
        <div className="scenario-status status-free">Free</div>
      )}
      
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
      
      <div className="scenario-start-btn">
        Start Conversation
      </div>
    </div>
  );
};

export default ScenarioCard;
