import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userMemory } from '../utils/userMemory';
import '../styles/LearnedWords.css';

const LearnedWords = () => {
  const [learnedWords, setLearnedWords] = useState([]);
  const [stats, setStats] = useState(null);
  const [filterBy, setFilterBy] = useState('all'); // all, recent, high-confidence
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadLearnedWords();
    
    // Listen for storage changes to reload data when learned words are updated
    const handleStorageChange = (e) => {
      if (e.key === 'aiTutorUserMemory') {
        loadLearnedWords();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also set up an interval to periodically check for updates (fallback)
    const interval = setInterval(() => {
      loadLearnedWords();
    }, 5000); // Check every 5 seconds
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const loadLearnedWords = () => {
    const words = userMemory.getLearnedWords();
    const statistics = userMemory.getLearnedWordsStats();
    
    setLearnedWords(words);
    setStats(statistics);
  };

  const filterWords = () => {
    let filtered = learnedWords;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(word => 
        word.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
        word.translation.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    switch (filterBy) {
      case 'recent':
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(word => 
          new Date(word.learnedDate) > oneWeekAgo
        );
        break;
      case 'high-confidence':
        filtered = filtered.filter(word => word.confidence >= 0.9);
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    return filtered;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getConfidenceLevel = (confidence) => {
    if (confidence >= 0.9) return 'expert';
    if (confidence >= 0.8) return 'proficient';
    if (confidence >= 0.7) return 'learning';
    return 'beginner';
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return '#10b981'; // green
    if (confidence >= 0.8) return '#3b82f6'; // blue
    if (confidence >= 0.7) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const filteredWords = filterWords();

  return (
    <div className="learned-words-container">
      <header className="learned-words-header">
        <div className="header-top">
          <button 
            className="back-button" 
            onClick={() => navigate('/')}
            aria-label="Go back to home"
          >
            ← Back
          </button>
          <h1 className="page-title">My Learned Words</h1>
          <button 
            className="refresh-button" 
            onClick={loadLearnedWords}
            aria-label="Refresh learned words"
            title="Refresh learned words"
          >
            🔄 Refresh
          </button>
        </div>
        
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{stats.totalLearned}</div>
              <div className="stat-label">Total Words</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.learnedThisWeek}</div>
              <div className="stat-label">This Week</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.learnedThisMonth}</div>
              <div className="stat-label">This Month</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{Math.round(stats.averageConfidence * 100)}%</div>
              <div className="stat-label">Avg. Confidence</div>
            </div>
          </div>
        )}
      </header>

      <div className="words-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search words or translations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-container">
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Words ({learnedWords.length})</option>
            <option value="recent">Recent (This Week)</option>
            <option value="high-confidence">High Confidence (90%+)</option>
          </select>
        </div>
      </div>

      <div className="words-list">
        {filteredWords.length === 0 ? (
          <div className="empty-state">
            {learnedWords.length === 0 ? (
              <div className="no-words">
                <div className="empty-icon">📚</div>
                <h3>No learned words yet!</h3>
                <p>Start practicing conversations to build your vocabulary.</p>
                <button 
                  className="start-learning-btn"
                  onClick={() => navigate('/')}
                >
                  Start Learning
                </button>
              </div>
            ) : (
              <div className="no-results">
                <div className="empty-icon">🔍</div>
                <h3>No words found</h3>
                <p>Try adjusting your search or filter criteria.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="words-grid">
            {filteredWords.map((word, index) => (
              <div key={`${word.word}-${index}`} className="word-card">
                <div className="word-header">
                  <div className="word-english">{word.english}</div>
                  <div 
                    className={`confidence-badge ${getConfidenceLevel(word.confidence)}`}
                    style={{ backgroundColor: getConfidenceColor(word.confidence) }}
                  >
                    <span className="confidence-text">
                      {Math.round(word.confidence * 100)}%
                    </span>
                  </div>
                </div>
                
                <div className="word-translation">{word.translation}</div>
                
                <div className="word-details">
                  <div className="word-meta">
                    <span className="learned-date">
                      📅 Learned: {formatDate(word.learnedDate)}
                    </span>
                    <span className="usage-count">
                      🔄 Used {word.usageCount || 1} time{(word.usageCount || 1) !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {word.contexts && word.contexts.length > 0 && (
                    <div className="word-contexts">
                      <span className="contexts-label">Practiced in:</span>
                      <div className="contexts-tags">
                        {word.contexts.slice(0, 3).map((context, idx) => (
                          <span key={idx} className="context-tag">
                            {context.replace(/-/g, ' ')}
                          </span>
                        ))}
                        {word.contexts.length > 3 && (
                          <span className="context-tag more">
                            +{word.contexts.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LearnedWords;