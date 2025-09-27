import { useState, useEffect, forwardRef } from 'react';
import { getScenarioById } from '../data/scenarioLoader';
import '../styles/ObjectivesPanel.css';

const ObjectivesPanel = forwardRef(({ scenario, scenarioData, objectives, onClose, onObjectiveChange, closing = false }, ref) => {
  const [progress, setProgress] = useState(0);
  const [displayScenarioData, setDisplayScenarioData] = useState(null);
  
  useEffect(() => {
    if (scenarioData) {
      // Use the passed scenario data directly
      setDisplayScenarioData(scenarioData);
    } else {
      // Fallback: try to load scenario data by converting scenario name to ID
      const scenarioId = scenario.toLowerCase().replace(/ /g, '-');
      const data = getScenarioById(scenarioId);
      setDisplayScenarioData(data);
    }
  }, [scenario, scenarioData]);
  
  useEffect(() => {
    const completedCount = objectives.filter(obj => obj.completed).length;
    const totalCount = objectives.length;
    const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    setProgress(progressPercent);
  }, [objectives]);
  
  return (
    <div className={`objectives-panel ${closing ? 'closing' : ''}`} ref={ref}>
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
          {displayScenarioData ? displayScenarioData.description : `Practice English conversation in a "${scenario}" scenario.`}
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
});

export default ObjectivesPanel;
