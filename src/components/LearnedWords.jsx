import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userMemory } from '../utils/userMemory';
import '../styles/LearnedWords.css';

const LearnedWords = () => {
  const [learnedWords, setLearnedWords] = useState([]);
  const [learnedPhrases, setLearnedPhrases] = useState([]);
  const [stats, setStats] = useState(null);
  const [filterBy, setFilterBy] = useState('all'); // all, recent, high-confidence
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('both'); // words, phrases, both
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
    const phrases = userMemory.getLearnedPhrases();
    const statistics = userMemory.getCombinedLearningStats();
    
    setLearnedWords(words);
    setLearnedPhrases(phrases);
    setStats(statistics);
  };

  const filterWords = () => {
    let filteredWords = learnedWords;
    let filteredPhrases = learnedPhrases;

    // Apply search filter
    if (searchTerm) {
      filteredWords = filteredWords.filter(word => 
        word.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
        word.translation.toLowerCase().includes(searchTerm.toLowerCase())
      );
      filteredPhrases = filteredPhrases.filter(phrase => 
        phrase.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
        phrase.translation.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    switch (filterBy) {
      case 'recent':
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        filteredWords = filteredWords.filter(word => 
          new Date(word.learnedDate) > oneWeekAgo
        );
        filteredPhrases = filteredPhrases.filter(phrase => 
          new Date(phrase.learnedDate) > oneWeekAgo
        );
        break;
      case 'high-confidence':
        filteredWords = filteredWords.filter(word => word.confidence >= 0.9);
        filteredPhrases = filteredPhrases.filter(phrase => phrase.confidence >= 0.9);
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    return { words: filteredWords, phrases: filteredPhrases };
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

  const getPhraseTypeIcon = (type) => {
    switch (type) {
      case 'idiom': return '🎭';
      case 'phrasal_verb': return '🔗';
      case 'expression': return '💬';
      case 'pattern': return '🏗️';
      default: return '📝';
    }
  };

  const getPhraseTypeLabel = (type) => {
    switch (type) {
      case 'idiom': return 'Idiom';
      case 'phrasal_verb': return 'Phrasal Verb';
      case 'expression': return 'Expression';
      case 'pattern': return 'Pattern';
      default: return 'Phrase';
    }
  };

  const { words: filteredWords, phrases: filteredPhrases } = filterWords();

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
          <h1 className="page-title">My Learnings</h1>
          <button 
            className="refresh-button" 
            onClick={loadLearnedWords}
            aria-label="Refresh learned content"
            title="Refresh learned content"
          >
            🔄 Refresh
          </button>
        </div>
        
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{stats.totalLearned}</div>
              <div className="stat-label">Total Learned</div>
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
            placeholder="Search words, phrases, or translations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-container">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="filter-select"
          >
            <option value="both">All ({learnedWords.length + learnedPhrases.length})</option>
            <option value="words">Words Only ({learnedWords.length})</option>
            <option value="phrases">Phrases Only ({learnedPhrases.length})</option>
          </select>
          
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Time</option>
            <option value="recent">Recent (This Week)</option>
            <option value="high-confidence">High Confidence (90%+)</option>
          </select>
        </div>
      </div>

      <div className="words-list">
        {(filteredWords.length === 0 && filteredPhrases.length === 0) ? (
          <div className="empty-state">
            {(learnedWords.length === 0 && learnedPhrases.length === 0) ? (
              <div className="no-words">
                <div className="empty-icon">📚</div>
                <h3>No learned content yet!</h3>
                <p>Start practicing conversations to build your vocabulary and learn phrases.</p>
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
                <h3>No content found</h3>
                <p>Try adjusting your search or filter criteria.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="words-grid">
            {/* Display words if enabled */}
            {(viewMode === 'both' || viewMode === 'words') && filteredWords.map((word, index) => (
              <div key={`word-${word.word}-${index}`} className="word-card">
                <div className="word-header">
                  <div className="word-type-badge">📝 Word</div>
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
            
            {/* Display phrases if enabled */}
            {(viewMode === 'both' || viewMode === 'phrases') && filteredPhrases.map((phrase, index) => (
              <div key={`phrase-${phrase.phrase}-${index}`} className="word-card phrase-card">
                <div className="word-header">
                  <div className="word-type-badge phrase-badge">
                    {getPhraseTypeIcon(phrase.type)} {getPhraseTypeLabel(phrase.type)}
                  </div>
                  <div className="word-english">{phrase.english}</div>
                  <div 
                    className={`confidence-badge ${getConfidenceLevel(phrase.confidence)}`}
                    style={{ backgroundColor: getConfidenceColor(phrase.confidence) }}
                  >
                    <span className="confidence-text">
                      {Math.round(phrase.confidence * 100)}%
                    </span>
                  </div>
                </div>
                
                <div className="word-translation">{phrase.translation}</div>
                
                <div className="word-details">
                  <div className="word-meta">
                    <span className="learned-date">
                      📅 Learned: {formatDate(phrase.learnedDate)}
                    </span>
                    <span className="usage-count">
                      🔄 Used {phrase.usageCount || 1} time{(phrase.usageCount || 1) !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {phrase.contexts && phrase.contexts.length > 0 && (
                    <div className="word-contexts">
                      <span className="contexts-label">Practiced in:</span>
                      <div className="contexts-tags">
                        {phrase.contexts.slice(0, 3).map((context, idx) => (
                          <span key={idx} className="context-tag">
                            {context.replace(/-/g, ' ')}
                          </span>
                        ))}
                        {phrase.contexts.length > 3 && (
                          <span className="context-tag more">
                            +{phrase.contexts.length - 3} more
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