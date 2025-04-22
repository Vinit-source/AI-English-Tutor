import { useState, useEffect } from 'react';
import '../styles/ObjectivesPanel.css';

const ObjectivesPanel = ({ scenario, objectives, onClose, onObjectiveChange }) => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    // Calculate progress percentage
    const completedCount = objectives.filter(obj => obj.completed).length;
    const totalCount = objectives.length;
    const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    setProgress(progressPercent);
  }, [objectives]);
  
  return (
    <div className="objectives-panel">
      <div className="objectives-header">
        <h2 className="objectives-title">Objectives</h2>
        <button 
          className="close-btn" 
          onClick={onClose}
          aria-label="Close objectives panel"
        >
          ✕
        </button>
      </div>
      
      <div className="objectives-content">
        <h3 className="section-title scenario">Scenario</h3>
        <p className="scenario-description">
          {scenario === 'over a phone call' ? (
            "You are calling your friend in Chennai, curious about their well-being, work life, and upcoming weekend getaway plans."
          ) : (
            `Practice English conversation in a "${scenario}" scenario.`
          )}
        </p>
        
        <h3 className="section-title objectives">Learning Objectives</h3>
        <ul className="objectives-list">
          {objectives.map((objective) => (
            <li 
              key={objective.id} 
              className={`objective-item ${objective.completed ? 'completed' : ''}`}
            >
              <input
                type="checkbox"
                id={objective.id}
                className="objective-checkbox"
                checked={objective.completed}
                onChange={(e) => onObjectiveChange(objective.id, e.target.checked)}
                aria-label={objective.text}
              />
              <label 
                htmlFor={objective.id}
                className="objective-label"
              >
                {objective.text}
              </label>
            </li>
          ))}
        </ul>
        
        <div className="progress-bar-container">
          <div 
            className="progress-bar" 
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin="0"
            aria-valuemax="100"
          ></div>
        </div>
        
        <p className="progress-text">
          {progress === 100 ? (
            <span className="progress-complete">All objectives completed! 🎉</span>
          ) : (
            <span>{Math.round(progress)}% complete</span>
          )}
        </p>
      </div>
    </div>
  );
};

export default ObjectivesPanel;
