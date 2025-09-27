/**
 * User Memory Management System
 * Tracks user preferences, conversation patterns, and interaction history
 * to enable agentic behavior for dynamic scenario generation
 */

class UserMemory {
  constructor() {
    this.memoryKey = 'aiTutorUserMemory';
    this.conversationKey = 'aiTutorConversationHistory';
    this.initialize();
  }

  initialize() {
    // Initialize memory structure if it doesn't exist
    if (!this.getMemory()) {
      const initialMemory = {
        userProfile: {
          nativeLanguage: 'hindi',
          preferredDifficulty: 'beginner',
          learningGoals: [],
          interests: [],
          commonMistakes: [],
          improvementAreas: []
        },
        scenarioPreferences: {
          favoriteScenarios: {},
          completedScenarios: {},
          strugglingScenarios: {},
          requestedTopics: []
        },
        conversationPatterns: {
          commonTopics: {},
          vocabularyUsed: [],
          grammarPatterns: {},
          responseStyle: 'formal'
        },
        learnedWords: {
          // Structure: { word: { translation, confidence, learnedDate, context, usageCount } }
          masteredVocabulary: {},
          totalLearnedCount: 0,
          lastUpdated: null
        },
        learnedPhrases: {
          // Structure: { phrase: { translation, confidence, learnedDate, context, usageCount, type } }
          masteredPhrases: {},
          totalLearnedCount: 0,
          lastUpdated: null
        },
        adaptationSettings: {
          personalizedRecommendations: true,
          dynamicScenarios: true,
          difficultyAdjustment: true
        },
        sessionHistory: [],
        lastUpdated: new Date().toISOString()
      };
      this.saveMemory(initialMemory);
    }
  }

  // Core memory operations
  getMemory() {
    try {
      const memory = localStorage.getItem(this.memoryKey);
      return memory ? JSON.parse(memory) : null;
    } catch (error) {
      console.error('Error reading user memory:', error);
      return null;
    }
  }

  saveMemory(memory) {
    try {
      memory.lastUpdated = new Date().toISOString();
      localStorage.setItem(this.memoryKey, JSON.stringify(memory));
      console.log('User memory updated successfully');
    } catch (error) {
      console.error('Error saving user memory:', error);
    }
  }

  updateUserProfile(updates) {
    const memory = this.getMemory();
    if (!memory) return;

    memory.userProfile = { ...memory.userProfile, ...updates };
    this.saveMemory(memory);
  }

  // Track scenario interactions
  recordScenarioStart(scenarioId, scenarioTitle) {
    const memory = this.getMemory();
    if (!memory) return;

    // Initialize if not exists
    if (!memory.scenarioPreferences.favoriteScenarios[scenarioId]) {
      memory.scenarioPreferences.favoriteScenarios[scenarioId] = {
        title: scenarioTitle,
        startCount: 0,
        completionCount: 0,
        averageObjectivesCompleted: 0,
        lastAccessed: null,
        difficulty: 'medium'
      };
    }

    memory.scenarioPreferences.favoriteScenarios[scenarioId].startCount++;
    memory.scenarioPreferences.favoriteScenarios[scenarioId].lastAccessed = new Date().toISOString();

    this.saveMemory(memory);
  }

  recordScenarioCompletion(scenarioId, objectivesCompleted, totalObjectives) {
    const memory = this.getMemory();
    if (!memory) return;

    if (memory.scenarioPreferences.favoriteScenarios[scenarioId]) {
      const scenario = memory.scenarioPreferences.favoriteScenarios[scenarioId];
      scenario.completionCount++;
      
      // Calculate rolling average of objectives completed
      const completionRate = objectivesCompleted / totalObjectives;
      scenario.averageObjectivesCompleted = (
        (scenario.averageObjectivesCompleted * (scenario.completionCount - 1) + completionRate) / 
        scenario.completionCount
      );

      // Adjust difficulty based on performance
      if (completionRate > 0.8) {
        scenario.difficulty = 'easy';
      } else if (completionRate < 0.4) {
        scenario.difficulty = 'hard';
        // Track struggling scenarios
        memory.scenarioPreferences.strugglingScenarios[scenarioId] = {
          title: scenario.title,
          struggles: (memory.scenarioPreferences.strugglingScenarios[scenarioId]?.struggles || 0) + 1,
          lastStruggle: new Date().toISOString()
        };
      }
    }

    this.saveMemory(memory);
  }

  // Track conversation patterns and learned words
  recordConversation(userMessage, aiResponse, scenarioId, learnedWordsFromAI = [], learnedPhrasesFromAI = []) {
    const memory = this.getMemory();
    if (!memory) return;

    // Analyze user message for patterns
    this.analyzeUserMessage(userMessage, memory);
    
    // Process learned words from AI response
    this.processLearnedWords(learnedWordsFromAI, memory, scenarioId);
    
    // Process learned phrases from AI response  
    this.processLearnedPhrases(learnedPhrasesFromAI, memory, scenarioId);
    
    // Store conversation history (keep last 50 exchanges)
    const conversationEntry = {
      timestamp: new Date().toISOString(),
      scenarioId,
      userMessage,
      aiResponse,
      messageLength: userMessage.length,
      wordCount: userMessage.split(' ').length,
      learnedWordsCount: learnedWordsFromAI.length,
      learnedPhrasesCount: learnedPhrasesFromAI.length
    };

    let conversationHistory = this.getConversationHistory();
    conversationHistory.push(conversationEntry);
    
    // Keep only last 50 entries
    if (conversationHistory.length > 50) {
      conversationHistory = conversationHistory.slice(-50);
    }
    
    localStorage.setItem(this.conversationKey, JSON.stringify(conversationHistory));
    this.saveMemory(memory);
  }

  analyzeUserMessage(message, memory) {
    // Extract vocabulary
    const words = message.toLowerCase().match(/\b\w+\b/g) || [];
    words.forEach(word => {
      if (word.length > 3) { // Only track meaningful words
        if (!memory.conversationPatterns.vocabularyUsed.includes(word)) {
          memory.conversationPatterns.vocabularyUsed.push(word);
        }
      }
    });

    // Analyze common topics by keywords
    const topicKeywords = {
      family: ['family', 'parents', 'children', 'siblings', 'mother', 'father'],
      work: ['job', 'work', 'office', 'career', 'meeting', 'project'],
      food: ['food', 'restaurant', 'eat', 'drink', 'meal', 'hungry'],
      travel: ['travel', 'trip', 'vacation', 'flight', 'hotel', 'visit'],
      hobbies: ['hobby', 'music', 'sports', 'reading', 'movie', 'game']
    };

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      const mentions = keywords.filter(keyword => 
        message.toLowerCase().includes(keyword)
      ).length;
      
      if (mentions > 0) {
        memory.conversationPatterns.commonTopics[topic] = 
          (memory.conversationPatterns.commonTopics[topic] || 0) + mentions;
      }
    });
  }

  // Process learned words identified by AI
  processLearnedWords(learnedWordsFromAI, memory, scenarioId) {
    if (!Array.isArray(learnedWordsFromAI) || learnedWordsFromAI.length === 0) {
      return;
    }

    learnedWordsFromAI.forEach(wordData => {
      const { english, translation, confidence = 0.8 } = wordData;
      
      if (!english || !translation) {
        return; // Skip incomplete data
      }

      const wordKey = english.toLowerCase().trim();
      
      // Only consider words with high confidence (>= 0.7) as truly learned
      if (confidence >= 0.7) {
        const currentTime = new Date().toISOString();
        
        if (memory.learnedWords.masteredVocabulary[wordKey]) {
          // Update existing learned word
          const existingWord = memory.learnedWords.masteredVocabulary[wordKey];
          existingWord.usageCount = (existingWord.usageCount || 1) + 1;
          existingWord.lastUsed = currentTime;
          existingWord.contexts = existingWord.contexts || [];
          
          // Add scenario context if not already present
          if (!existingWord.contexts.includes(scenarioId)) {
            existingWord.contexts.push(scenarioId);
          }
          
          // Update confidence (weighted average)
          existingWord.confidence = (existingWord.confidence * 0.7) + (confidence * 0.3);
        } else {
          // Add new learned word
          memory.learnedWords.masteredVocabulary[wordKey] = {
            english: english.trim(),
            translation: translation.trim(),
            confidence: confidence,
            learnedDate: currentTime,
            lastUsed: currentTime,
            usageCount: 1,
            contexts: [scenarioId]
          };
          
          memory.learnedWords.totalLearnedCount++;
        }
        
        memory.learnedWords.lastUpdated = currentTime;
      }
    });
  }

  // Process learned phrases identified by AI
  processLearnedPhrases(learnedPhrasesFromAI, memory, scenarioId) {
    if (!Array.isArray(learnedPhrasesFromAI) || learnedPhrasesFromAI.length === 0) {
      return;
    }

    learnedPhrasesFromAI.forEach(phraseData => {
      const { english, translation, confidence = 0.8, type = 'expression' } = phraseData;
      
      if (!english || !translation) {
        return; // Skip incomplete data
      }

      const phraseKey = english.toLowerCase().trim();
      
      // Only consider phrases with high confidence (>= 0.7) as truly learned
      if (confidence >= 0.7) {
        const currentTime = new Date().toISOString();
        
        if (memory.learnedPhrases.masteredPhrases[phraseKey]) {
          // Update existing learned phrase
          const existingPhrase = memory.learnedPhrases.masteredPhrases[phraseKey];
          existingPhrase.usageCount = (existingPhrase.usageCount || 1) + 1;
          existingPhrase.lastUsed = currentTime;
          existingPhrase.contexts = existingPhrase.contexts || [];
          
          // Add scenario context if not already present
          if (!existingPhrase.contexts.includes(scenarioId)) {
            existingPhrase.contexts.push(scenarioId);
          }
          
          // Update confidence (weighted average)
          existingPhrase.confidence = (existingPhrase.confidence * 0.7) + (confidence * 0.3);
        } else {
          // Add new learned phrase
          memory.learnedPhrases.masteredPhrases[phraseKey] = {
            english: english.trim(),
            translation: translation.trim(),
            confidence: confidence,
            type: type,
            learnedDate: currentTime,
            lastUsed: currentTime,
            usageCount: 1,
            contexts: [scenarioId]
          };
          
          memory.learnedPhrases.totalLearnedCount++;
        }
        
        memory.learnedPhrases.lastUpdated = currentTime;
      }
    });
  }

  // Get learned words for display
  getLearnedWords() {
    const memory = this.getMemory();
    if (!memory || !memory.learnedWords) return [];

    return Object.entries(memory.learnedWords.masteredVocabulary)
      .map(([wordKey, wordData]) => ({
        word: wordKey,
        ...wordData
      }))
      .sort((a, b) => new Date(b.learnedDate) - new Date(a.learnedDate));
  }

  // Get learned words statistics
  getLearnedWordsStats() {
    const memory = this.getMemory();
    if (!memory || !memory.learnedWords) return null;

    const learnedWords = this.getLearnedWords();
    const now = new Date();
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const wordsThisWeek = learnedWords.filter(word => 
      new Date(word.learnedDate) > thisWeek
    ).length;

    const wordsThisMonth = learnedWords.filter(word => 
      new Date(word.learnedDate) > thisMonth
    ).length;

    return {
      totalLearned: memory.learnedWords.totalLearnedCount,
      learnedThisWeek: wordsThisWeek,
      learnedThisMonth: wordsThisMonth,
      averageConfidence: learnedWords.length > 0 
        ? learnedWords.reduce((sum, word) => sum + word.confidence, 0) / learnedWords.length 
        : 0
    };
  }

  // Get learned phrases for display
  getLearnedPhrases() {
    const memory = this.getMemory();
    if (!memory || !memory.learnedPhrases) return [];

    return Object.entries(memory.learnedPhrases.masteredPhrases)
      .map(([phraseKey, phraseData]) => ({
        phrase: phraseKey,
        ...phraseData
      }))
      .sort((a, b) => new Date(b.learnedDate) - new Date(a.learnedDate));
  }

  // Get learned phrases statistics
  getLearnedPhrasesStats() {
    const memory = this.getMemory();
    if (!memory || !memory.learnedPhrases) return null;

    const learnedPhrases = this.getLearnedPhrases();
    const now = new Date();
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const phrasesThisWeek = learnedPhrases.filter(phrase => 
      new Date(phrase.learnedDate) > thisWeek
    ).length;

    const phrasesThisMonth = learnedPhrases.filter(phrase => 
      new Date(phrase.learnedDate) > thisMonth
    ).length;

    return {
      totalLearned: memory.learnedPhrases.totalLearnedCount,
      learnedThisWeek: phrasesThisWeek,
      learnedThisMonth: phrasesThisMonth,
      averageConfidence: learnedPhrases.length > 0 
        ? learnedPhrases.reduce((sum, phrase) => sum + phrase.confidence, 0) / learnedPhrases.length 
        : 0
    };
  }

  // Get combined learning statistics (words + phrases)
  getCombinedLearningStats() {
    const wordsStats = this.getLearnedWordsStats();
    const phrasesStats = this.getLearnedPhrasesStats();
    
    if (!wordsStats && !phrasesStats) return null;

    return {
      totalLearned: (wordsStats?.totalLearned || 0) + (phrasesStats?.totalLearned || 0),
      learnedThisWeek: (wordsStats?.learnedThisWeek || 0) + (phrasesStats?.learnedThisWeek || 0),
      learnedThisMonth: (wordsStats?.learnedThisMonth || 0) + (phrasesStats?.learnedThisMonth || 0),
      averageConfidence: ((wordsStats?.averageConfidence || 0) + (phrasesStats?.averageConfidence || 0)) / 2,
      words: wordsStats,
      phrases: phrasesStats
    };
  }

  getConversationHistory() {
    try {
      const history = localStorage.getItem(this.conversationKey);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error reading conversation history:', error);
      return [];
    }
  }

  // Generate user insights for agentic behavior
  getUserInsights() {
    const memory = this.getMemory();
    if (!memory) return null;

    const conversationHistory = this.getConversationHistory();
    
    return {
      profile: memory.userProfile,
      preferences: {
        favoriteScenarios: this.getTopScenarios(memory.scenarioPreferences.favoriteScenarios, 3),
        strugglingAreas: memory.scenarioPreferences.strugglingScenarios,
        commonTopics: this.getTopTopics(memory.conversationPatterns.commonTopics, 5),
        recentActivity: conversationHistory.slice(-10)
      },
      patterns: {
        averageMessageLength: this.calculateAverageMessageLength(conversationHistory),
        vocabularyDiversity: this.calculateVocabularyDiversity(memory.conversationPatterns.vocabularyUsed),
        activityLevel: this.calculateActivityLevel(conversationHistory)
      },
      recommendations: this.generateRecommendations(memory, conversationHistory)
    };
  }

  getTopScenarios(scenarios, limit = 3) {
    return Object.entries(scenarios)
      .sort(([,a], [,b]) => b.startCount - a.startCount)
      .slice(0, limit)
      .map(([id, data]) => ({ id, ...data }));
  }

  getTopTopics(topics, limit = 5) {
    return Object.entries(topics)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([topic, count]) => ({ topic, count }));
  }

  calculateAverageMessageLength(history) {
    if (!history.length) return 0;
    const totalLength = history.reduce((sum, entry) => sum + entry.messageLength, 0);
    return Math.round(totalLength / history.length);
  }

  calculateVocabularyDiversity(vocabulary) {
    const vocabArray = Array.isArray(vocabulary) ? vocabulary : [];
    return vocabArray.length;
  }

  calculateActivityLevel(history) {
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentMessages = history.filter(entry => 
      new Date(entry.timestamp) > lastWeek
    );
    
    return {
      messagesThisWeek: recentMessages.length,
      averagePerDay: Math.round(recentMessages.length / 7 * 10) / 10
    };
  }

  generateRecommendations(memory, conversationHistory) {
    const recommendations = [];

    // Recommend scenarios based on struggling areas
    Object.entries(memory.scenarioPreferences.strugglingScenarios).forEach(([scenarioId, data]) => {
      if (data.struggles > 2) {
        recommendations.push({
          type: 'scenario_practice',
          priority: 'high',
          message: `Practice more with "${data.title}" - you've had difficulty with this scenario`,
          scenarioId
        });
      }
    });

    // Recommend new scenarios based on interests
    const topTopics = this.getTopTopics(memory.conversationPatterns.commonTopics, 3);
    topTopics.forEach(({ topic }) => {
      recommendations.push({
        type: 'scenario_suggestion',
        priority: 'medium',
        message: `Try scenarios related to ${topic} - you often discuss this topic`,
        topic
      });
    });

    // Recommend difficulty adjustment
    const scenarios = Object.values(memory.scenarioPreferences.favoriteScenarios);
    if (scenarios.length > 0) {
      const avgCompletion = scenarios
        .reduce((sum, scenario) => sum + scenario.averageObjectivesCompleted, 0) / scenarios.length;
      
      if (avgCompletion > 0.8) {
        recommendations.push({
          type: 'difficulty_increase',
          priority: 'low',
          message: 'Consider trying more challenging scenarios - you\'re doing great!'
        });
      }
    }

    return recommendations;
  }

  // Agentic scenario generation
  generatePersonalizedScenarios(count = 3) {
    const insights = this.getUserInsights();
    if (!insights) return [];

    const scenarios = [];
    const { commonTopics, strugglingAreas } = insights.preferences;
    const { profile } = insights;

    // Generate scenarios based on user's common topics
    commonTopics.forEach((topicData, index) => {
      if (index < count) {
        scenarios.push(this.createDynamicScenario(topicData.topic, profile, 'interest-based'));
      }
    });

    // Generate practice scenarios for struggling areas
    Object.values(strugglingAreas).forEach((struggle, index) => {
      if (index < 2 && scenarios.length < count) {
        scenarios.push(this.createDynamicScenario(struggle.title, profile, 'practice-based'));
      }
    });

    return scenarios;
  }

  createDynamicScenario(topic, profile, type) {
    const scenarioId = `dynamic-${topic.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    
    const baseScenarios = {
      'interest-based': {
        family: {
          id: scenarioId,
          title: 'Family Gathering Discussion',
          description: 'Practice talking about family events, relationships, and traditions in a warm, personal setting.',
          iconName: 'users',
          status: 'personalized',
          objectives: [
            { id: 'fam-1', text: 'Introduce family members and their relationships' },
            { id: 'fam-2', text: 'Describe a recent family event or celebration' },
            { id: 'fam-3', text: 'Share family traditions or customs' },
            { id: 'fam-4', text: 'Express feelings about family relationships' }
          ]
        },
        work: {
          id: scenarioId,
          title: 'Professional Networking Event',
          description: 'Navigate workplace conversations, discuss career goals, and build professional relationships.',
          iconName: 'briefcase',
          status: 'personalized',
          objectives: [
            { id: 'work-1', text: 'Introduce yourself professionally' },
            { id: 'work-2', text: 'Discuss your current role and responsibilities' },
            { id: 'work-3', text: 'Share career aspirations and goals' },
            { id: 'work-4', text: 'Exchange professional contact information' }
          ]
        },
        food: {
          id: scenarioId,
          title: 'Cooking Class Experience',
          description: 'Learn to discuss recipes, cooking techniques, and food preferences in an interactive cooking class.',
          iconName: 'utensils',
          status: 'personalized',
          objectives: [
            { id: 'cook-1', text: 'Ask about ingredients and cooking methods' },
            { id: 'cook-2', text: 'Share your favorite dishes and cooking experiences' },
            { id: 'cook-3', text: 'Request cooking tips and advice' },
            { id: 'cook-4', text: 'Compliment the instructor and other participants' }
          ]
        }
      }
    };

    // Default dynamic scenario structure
    const dynamicScenario = {
      id: scenarioId,
      title: `Personalized ${topic.charAt(0).toUpperCase() + topic.slice(1)} Scenario`,
      description: `A customized scenario based on your interests in ${topic}. Practice relevant vocabulary and situations.`,
      iconName: 'star',
      status: 'personalized',
      type: type,
      objectives: [
        { id: `${scenarioId}-1`, text: `Engage in conversation about ${topic}` },
        { id: `${scenarioId}-2`, text: `Express your opinions on ${topic}` },
        { id: `${scenarioId}-3`, text: `Ask questions related to ${topic}` },
        { id: `${scenarioId}-4`, text: `Share personal experiences with ${topic}` }
      ]
    };

    // Use predefined scenario if available, otherwise use dynamic one
    return baseScenarios['interest-based'][topic] || dynamicScenario;
  }

  // Memory export/import for backup
  exportMemory() {
    const memory = this.getMemory();
    const conversationHistory = this.getConversationHistory();
    
    return {
      memory,
      conversationHistory,
      exportDate: new Date().toISOString()
    };
  }

  importMemory(data) {
    if (data.memory) {
      this.saveMemory(data.memory);
    }
    if (data.conversationHistory) {
      localStorage.setItem(this.conversationKey, JSON.stringify(data.conversationHistory));
    }
  }

  // Clear all memory (for testing or privacy)
  clearMemory() {
    localStorage.removeItem(this.memoryKey);
    localStorage.removeItem(this.conversationKey);
    this.initialize();
  }
}

// Export singleton instance
export const userMemory = new UserMemory();
export default UserMemory;