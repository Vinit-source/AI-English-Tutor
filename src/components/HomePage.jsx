import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ScenarioCard from './ScenarioCard';
import { getAllScenarios, generatePersonalizedScenarios } from '../data/scenarioLoader';
import { userMemory } from '../utils/userMemory';
import '../styles/HomePage.css';

// Create SVG icons directly in the component instead of importing them
const ScenarioIcon = ({ name, color = "#4f46e5" }) => {
  const icons = {
    phone: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
      </svg>
    ),
    restaurant: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 2L7 22M17 2C14.8 2 13 4 13 8C13 12 14.8 14 17 14L17 22M2 12L22 12M2 7L7 7M2 17L7 17"></path>
      </svg>
    ),
    shopping: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <path d="M16 10a4 4 0 0 1-8 0"></path>
      </svg>
    ),
    coffee: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
        <line x1="6" y1="1" x2="6" y2="4"></line>
        <line x1="10" y1="1" x2="10" y2="4"></line>
        <line x1="14" y1="1" x2="14" y2="4"></line>
      </svg>
    ),
    class: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h20v14H2z"></path>
        <path d="M6 21h12"></path>
        <path d="M12 17v4"></path>
      </svg>
    ),
    birthday: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"></path>
        <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4-2 2-1 2-1"></path>
        <path d="M2 21h20"></path>
        <path d="M7 8v2"></path>
        <path d="M12 8v2"></path>
        <path d="M17 8v2"></path>
        <path d="M7 4h.01"></path>
        <path d="M12 4h.01"></path>
        <path d="M17 4h.01"></path>
      </svg>
    )
  };

  return (
    <div className="scenario-icon">
      {icons[name] || 
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <rect width="20" height="20" x="2" y="2" rx="2" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      }
    </div>
  );
};

const HomePage = () => {
  const [language, setLanguage] = useState('hindi');
  const [animateCards, setAnimateCards] = useState(false);
  const [scenarios, setScenarios] = useState([]);
  const [personalizedScenarios, setPersonalizedScenarios] = useState([]);
  const [showPersonalized, setShowPersonalized] = useState(false);
  const [userInsights, setUserInsights] = useState(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    setAnimateCards(true);
    
    // Load scenarios and user insights
    const allScenarios = getAllScenarios();
    setScenarios(allScenarios);
    
    // Load user insights and personalized scenarios
    const insights = userMemory.getUserInsights();
    setUserInsights(insights);
    
    if (insights && insights.preferences.favoriteScenarios.length > 0) {
      const personalized = generatePersonalizedScenarios(3);
      setPersonalizedScenarios(personalized);
    }
    
    // Update user profile with current language selection
    userMemory.updateUserProfile({ nativeLanguage: language });
  }, [language]);

  const handleCardClick = (scenarioId, objectives) => {
    // Record scenario start in user memory
    const scenario = [...scenarios, ...personalizedScenarios].find(s => s.id === scenarioId);
    if (scenario) {
      userMemory.recordScenarioStart(scenarioId, scenario.title);
    }
    
    localStorage.setItem('userLanguage', language);
    localStorage.setItem('currentScenarioObjectives', JSON.stringify(
      objectives.map(obj => ({ ...obj, completed: false }))
    ));
    navigate(`/chat/${scenarioId}`);
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    userMemory.updateUserProfile({ nativeLanguage: newLanguage });
  };

  const toggleScenarioView = () => {
    setShowPersonalized(!showPersonalized);
  };

  const displayScenarios = showPersonalized ? personalizedScenarios : scenarios;

  return (
    <div className="home-container">
      <header className="header">
        <div className="header-top">
          <div className="title-section">
            <h1 className="app-title">AI English Tutor</h1>
            <p className="app-subtitle">
              Practice English conversations with AI in realistic scenarios.
              Choose your native language and start learning today.
            </p>
          </div>
          <button 
            className="learned-words-btn" 
            onClick={() => navigate('/learned-words')}
            aria-label="View learned words"
          >
            📚 My Words
          </button>
        </div>
        {userInsights && (
          <div className="user-insights">
            <p className="insights-text">
              🎯 {userInsights.patterns.activityLevel.messagesThisWeek} messages this week • 
              📚 {userInsights.patterns.vocabularyDiversity} unique words learned
            </p>
          </div>
        )}
      </header>

      <main>
        <div className="control-panel">
          <div className="panel-title">
            <span className="icon">🎭</span> 
            {showPersonalized ? 'Personalized Scenarios' : 'Role-Play Scenarios'}
          </div>
          <div className="control-buttons">
            <div className="language-selector">
              <select 
                value={language}
                onChange={handleLanguageChange}
                className="language-select"
                aria-label="Select your native language"
              >
                <option value="hindi">Hindi</option>
                <option value="marathi">Marathi</option>
                <option value="gujarati">Gujarati</option>
                <option value="bengali">Bengali</option>
                <option value="tamil">Tamil</option>
                <option value="telugu">Telugu</option>
                <option value="kannada">Kannada</option>
                <option value="malayalam">Malayalam</option>
              </select>
            </div>
            {personalizedScenarios.length > 0 && (
              <button 
                className="scenario-toggle-btn"
                onClick={toggleScenarioView}
                aria-label="Toggle between regular and personalized scenarios"
              >
                {showPersonalized ? '📝 All Scenarios' : '⭐ For You'}
              </button>
            )}
          </div>
        </div>

        {showPersonalized && personalizedScenarios.length > 0 && (
          <div className="personalized-info">
            <p className="info-text">
              🤖 These scenarios are dynamically generated based on your learning patterns and interests
            </p>
          </div>
        )}

        {userInsights && userInsights.recommendations.length > 0 && (
          <div className="recommendations-panel">
            <h3>📋 Recommendations</h3>
            <div className="recommendations-list">
              {userInsights.recommendations.slice(0, 2).map((rec, index) => (
                <div key={index} className={`recommendation ${rec.priority}`}>
                  <span className="rec-icon">
                    {rec.priority === 'high' ? '🎯' : rec.priority === 'medium' ? '💡' : '✨'}
                  </span>
                  <span className="rec-message">{rec.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="scenarios-container">
          {displayScenarios.map((scenario, index) => (
            <ScenarioCard 
              key={scenario.id}
              {...scenario}
              icon={<ScenarioIcon name={scenario.iconName} />}
              onClick={handleCardClick}
              delay={index * 0.1}
              animate={animateCards}
            />
          ))}
        </div>
      </main>
      
      <footer className="home-footer">
        <p>© {new Date().getFullYear()} AI English Tutor. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default HomePage;
