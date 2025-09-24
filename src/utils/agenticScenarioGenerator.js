/**
 * Agentic Scenario Generator
 * Dynamically creates personalized English learning scenarios
 * based on user memory, preferences, and conversation patterns
 */

import { userMemory } from './userMemory.js';

class AgenticScenarioGenerator {
  constructor() {
    this.scenarioTemplates = {
      // Professional scenarios
      professional: [
        {
          template: 'job-interview',
          title: 'Job Interview Practice',
          description: 'Practice professional interview skills and workplace vocabulary',
          contexts: ['office', 'remote', 'startup', 'corporate'],
          difficulty: ['beginner', 'intermediate', 'advanced']
        },
        {
          template: 'team-meeting',
          title: 'Team Meeting Participation',
          description: 'Learn to contribute effectively in team meetings and discussions',
          contexts: ['project-planning', 'status-update', 'brainstorming', 'problem-solving'],
          difficulty: ['intermediate', 'advanced']
        }
      ],
      
      // Social scenarios
      social: [
        {
          template: 'friendship',
          title: 'Making New Friends',
          description: 'Practice social interactions and building relationships',
          contexts: ['hobby-club', 'neighborhood', 'community-event', 'online-meetup'],
          difficulty: ['beginner', 'intermediate']
        },
        {
          template: 'cultural-exchange',
          title: 'Cultural Exchange Discussion',
          description: 'Share your culture and learn about others',
          contexts: ['festivals', 'traditions', 'cuisine', 'customs'],
          difficulty: ['intermediate', 'advanced']
        }
      ],
      
      // Daily life scenarios
      daily: [
        {
          template: 'healthcare',
          title: 'Doctor Visit',
          description: 'Practice medical vocabulary and describing symptoms',
          contexts: ['general-checkup', 'emergency', 'specialist', 'pharmacy'],
          difficulty: ['intermediate', 'advanced']
        },
        {
          template: 'banking',
          title: 'Banking Services',
          description: 'Handle banking transactions and financial discussions',
          contexts: ['account-opening', 'loan-application', 'investment', 'complaint'],
          difficulty: ['intermediate', 'advanced']
        }
      ],
      
      // Entertainment scenarios
      entertainment: [
        {
          template: 'movie-discussion',
          title: 'Movie Review Discussion',
          description: 'Share opinions about movies and entertainment',
          contexts: ['cinema', 'streaming', 'genres', 'recommendations'],
          difficulty: ['beginner', 'intermediate']
        },
        {
          template: 'sports-conversation',
          title: 'Sports Discussion',
          description: 'Talk about sports, games, and physical activities',
          contexts: ['team-sports', 'individual-sports', 'Olympics', 'local-games'],
          difficulty: ['beginner', 'intermediate']
        }
      ]
    };

    this.objectivePatterns = {
      greeting: [
        'Greet {character} appropriately for the situation',
        'Start a conversation with {character}',
        'Introduce yourself to {character}'
      ],
      information: [
        'Ask {character} about their {topic}',
        'Share information about {topic}',
        'Request details about {topic}'
      ],
      opinion: [
        'Express your opinion about {topic}',
        'Ask {character} for their views on {topic}',
        'Discuss the pros and cons of {topic}'
      ],
      problem_solving: [
        'Help {character} solve a problem with {topic}',
        'Ask for assistance with {topic}',
        'Suggest solutions for {topic}'
      ],
      closing: [
        'Thank {character} for their time',
        'Exchange contact information',
        'Make plans for future interaction'
      ]
    };
  }

  // Main method to generate personalized scenarios
  generatePersonalizedScenarios(count = 3) {
    const insights = userMemory.getUserInsights();
    if (!insights) {
      return this.getDefaultScenarios(count);
    }

    const scenarios = [];
    const userLevel = this.determineUserLevel(insights);
    const interests = this.extractUserInterests(insights);
    const strugglingAreas = insights.preferences.strugglingAreas;

    // Generate scenarios based on user interests
    interests.forEach((interest, index) => {
      if (scenarios.length < count) {
        const scenario = this.createScenarioFromInterest(interest, userLevel, insights.profile);
        if (scenario) {
          scenarios.push(scenario);
        }
      }
    });

    // Add practice scenarios for struggling areas
    Object.entries(strugglingAreas).forEach(([scenarioId, data]) => {
      if (scenarios.length < count && data.struggles > 1) {
        const practiceScenario = this.createPracticeScenario(data, userLevel, insights.profile);
        if (practiceScenario) {
          scenarios.push(practiceScenario);
        }
      }
    });

    // Fill remaining slots with adaptive scenarios
    while (scenarios.length < count) {
      const adaptiveScenario = this.createAdaptiveScenario(userLevel, insights);
      if (adaptiveScenario) {
        scenarios.push(adaptiveScenario);
      } else {
        break; // Avoid infinite loop
      }
    }

    return scenarios;
  }

  determineUserLevel(insights) {
    const { patterns } = insights;
    const avgMessageLength = patterns.averageMessageLength;
    const vocabularyDiversity = patterns.vocabularyDiversity;
    
    // Simple heuristic to determine user level
    if (avgMessageLength < 30 || vocabularyDiversity < 20) {
      return 'beginner';
    } else if (avgMessageLength < 60 || vocabularyDiversity < 50) {
      return 'intermediate';
    } else {
      return 'advanced';
    }
  }

  extractUserInterests(insights) {
    const commonTopics = insights.preferences.commonTopics;
    const recentActivity = insights.preferences.recentActivity;
    
    // Combine topics from conversation patterns and recent activity
    const interests = new Set();
    
    // Add from common topics
    commonTopics.forEach(topicData => {
      interests.add(topicData.topic);
    });
    
    // Add from recent conversations
    recentActivity.forEach(activity => {
      const topics = this.extractTopicsFromMessage(activity.userMessage);
      topics.forEach(topic => interests.add(topic));
    });
    
    return Array.from(interests);
  }

  extractTopicsFromMessage(message) {
    const topics = [];
    const topicKeywords = {
      work: ['job', 'work', 'office', 'career', 'meeting', 'project', 'business'],
      family: ['family', 'parents', 'children', 'siblings', 'mother', 'father', 'relatives'],
      food: ['food', 'restaurant', 'eat', 'drink', 'meal', 'hungry', 'cooking'],
      travel: ['travel', 'trip', 'vacation', 'flight', 'hotel', 'visit', 'country'],
      hobbies: ['hobby', 'music', 'sports', 'reading', 'movie', 'game', 'entertainment'],
      health: ['health', 'doctor', 'hospital', 'medicine', 'exercise', 'fitness'],
      education: ['study', 'school', 'university', 'learn', 'course', 'teacher']
    };

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
        topics.push(topic);
      }
    });

    return topics;
  }

  createScenarioFromInterest(interest, userLevel, userProfile) {
    const scenarioCategory = this.mapInterestToCategory(interest);
    const templates = this.scenarioTemplates[scenarioCategory] || this.scenarioTemplates.social;
    
    // Filter templates by difficulty level
    const suitableTemplates = templates.filter(template => 
      template.difficulty.includes(userLevel)
    );
    
    if (suitableTemplates.length === 0) return null;
    
    const template = suitableTemplates[Math.floor(Math.random() * suitableTemplates.length)];
    const context = template.contexts[Math.floor(Math.random() * template.contexts.length)];
    
    return this.buildScenarioFromTemplate(template, context, interest, userLevel, userProfile);
  }

  mapInterestToCategory(interest) {
    const mapping = {
      work: 'professional',
      family: 'social',
      food: 'daily',
      travel: 'daily',
      hobbies: 'entertainment',
      health: 'daily',
      education: 'professional'
    };
    
    return mapping[interest] || 'social';
  }

  buildScenarioFromTemplate(template, context, interest, userLevel, userProfile) {
    const scenarioId = `agentic-${template.template}-${context}-${Date.now()}`;
    
    // Customize based on user's native language and level
    const character = this.selectCharacter(context, userProfile);
    const objectives = this.generateSpecificObjectives(template.template, context, interest, userLevel);
    
    return {
      id: scenarioId,
      title: `${template.title} - ${this.formatContext(context)}`,
      description: `${template.description} in a ${this.formatContext(context)} setting. Personalized for your interests in ${interest}.`,
      iconName: this.getIconForTemplate(template.template),
      status: 'agentic',
      type: 'interest-based',
      difficulty: userLevel,
      context: context,
      character: character,
      objectives: objectives,
      metadata: {
        generatedFrom: interest,
        template: template.template,
        timestamp: new Date().toISOString()
      }
    };
  }

  generateSpecificObjectives(template, context, interest, userLevel) {
    // Create specific, functional objectives based on template and context
    const objectiveTemplates = {
      'job-interview': [
        { id: 'job-1', text: 'Introduce yourself professionally and state why you\'re interested in the position' },
        { id: 'job-2', text: 'Discuss your relevant skills and work experience' },
        { id: 'job-3', text: 'Ask thoughtful questions about the company or role' },
        { id: 'job-4', text: 'Thank the interviewer and express your continued interest' }
      ],
      'team-meeting': [
        { id: 'meeting-1', text: 'Contribute to the discussion with relevant ideas or updates' },
        { id: 'meeting-2', text: 'Ask clarifying questions about project details' },
        { id: 'meeting-3', text: 'Offer suggestions or solutions to challenges discussed' },
        { id: 'meeting-4', text: 'Confirm your understanding of next steps and action items' }
      ],
      'friendship': [
        { id: 'friend-1', text: 'Start a friendly conversation and show genuine interest' },
        { id: 'friend-2', text: 'Share something about yourself or your interests' },
        { id: 'friend-3', text: 'Ask questions to learn more about the other person' },
        { id: 'friend-4', text: 'Suggest an activity or way to stay in touch' }
      ],
      'cultural-exchange': [
        { id: 'culture-1', text: 'Share something unique about your own culture' },
        { id: 'culture-2', text: 'Ask respectful questions about the other person\'s background' },
        { id: 'culture-3', text: 'Find common interests or experiences to discuss' },
        { id: 'culture-4', text: 'Express appreciation for learning about different cultures' }
      ],
      'healthcare': [
        { id: 'health-1', text: 'Describe your symptoms or health concerns clearly' },
        { id: 'health-2', text: 'Ask questions about treatment options or recommendations' },
        { id: 'health-3', text: 'Confirm your understanding of the medical advice given' },
        { id: 'health-4', text: 'Schedule follow-up appointments or ask about next steps' }
      ],
      'banking': [
        { id: 'bank-1', text: 'Explain the banking service you need assistance with' },
        { id: 'bank-2', text: 'Provide necessary information and ask about requirements' },
        { id: 'bank-3', text: 'Inquire about fees, interest rates, or terms and conditions' },
        { id: 'bank-4', text: 'Complete the transaction and confirm all details' }
      ],
      'movie-discussion': [
        { id: 'movie-1', text: 'Share your opinion about a movie you\'ve recently watched' },
        { id: 'movie-2', text: 'Ask for movie recommendations based on your preferences' },
        { id: 'movie-3', text: 'Discuss what makes a good movie in your opinion' },
        { id: 'movie-4', text: 'Make plans to watch a movie together or suggest a favorite' }
      ],
      'sports-conversation': [
        { id: 'sports-1', text: 'Talk about your favorite sports or teams' },
        { id: 'sports-2', text: 'Discuss recent games or sporting events' },
        { id: 'sports-3', text: 'Ask about the other person\'s sports interests' },
        { id: 'sports-4', text: 'Share experiences of playing or watching sports' }
      ]
    };

    // Get template-specific objectives or fall back to generic ones
    const templateObjectives = objectiveTemplates[template];
    if (templateObjectives) {
      return templateObjectives.map(obj => ({ ...obj, completed: false }));
    }

    // Fallback to generic objectives if template not found
    return [
      { id: `${template}-1`, text: `Engage in conversation about ${interest}` },
      { id: `${template}-2`, text: `Express your opinions on ${interest}` },
      { id: `${template}-3`, text: `Ask questions related to ${interest}` },
      { id: `${template}-4`, text: `Share personal experiences with ${interest}` }
    ].map(obj => ({ ...obj, completed: false }));
  }

  selectCharacter(context, userProfile) {
    const characters = {
      'office': ['your new colleague', 'the team leader', 'a client'],
      'remote': ['your online teammate', 'the project manager', 'a virtual assistant'],
      'hobby-club': ['a fellow enthusiast', 'the club organizer', 'a new member'],
      'healthcare': ['the doctor', 'the nurse', 'the receptionist'],
      'cinema': ['a movie enthusiast', 'the ticket counter person', 'a friend'],
      'default': ['a friendly person', 'someone helpful', 'a conversation partner']
    };
    
    const contextCharacters = characters[context] || characters.default;
    return contextCharacters[Math.floor(Math.random() * contextCharacters.length)];
  }

  createPracticeScenario(strugglingData, userLevel, userProfile) {
    const scenarioId = `practice-${strugglingData.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    
    // Generate specific practice objectives based on the struggling scenario
    const practiceObjectives = [
      { id: 'practice-1', text: `Review and practice key vocabulary from ${strugglingData.title}`, completed: false },
      { id: 'practice-2', text: 'Use common phrases and expressions with confidence', completed: false },
      { id: 'practice-3', text: 'Apply learned vocabulary naturally in conversation', completed: false },
      { id: 'practice-4', text: 'Complete the interaction successfully without major difficulties', completed: false }
    ];
    
    return {
      id: scenarioId,
      title: `Practice: ${strugglingData.title}`,
      description: `Focused practice session for ${strugglingData.title}. This scenario has been customized to help you improve in areas where you've faced challenges.`,
      iconName: 'target',
      status: 'practice',
      type: 'remedial',
      difficulty: userLevel,
      objectives: practiceObjectives,
      metadata: {
        basedOnScenario: strugglingData.title,
        strugglesCount: strugglingData.struggles,
        timestamp: new Date().toISOString()
      }
    };
  }

  createAdaptiveScenario(userLevel, insights) {
    const scenarioId = `adaptive-${Date.now()}`;
    const categories = Object.keys(this.scenarioTemplates);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const templates = this.scenarioTemplates[randomCategory];
    
    const suitableTemplates = templates.filter(template => 
      template.difficulty.includes(userLevel)
    );
    
    if (suitableTemplates.length === 0) return null;
    
    const template = suitableTemplates[Math.floor(Math.random() * suitableTemplates.length)];
    const context = template.contexts[Math.floor(Math.random() * template.contexts.length)];
    
    // Generate specific objectives for this adaptive scenario
    const objectives = this.generateSpecificObjectives(template.template, context, 'general conversation', userLevel);
    
    return {
      id: scenarioId,
      title: `${template.title} - Adaptive`,
      description: `${template.description} This scenario adapts to your current learning level and preferences.`,
      iconName: this.getIconForTemplate(template.template),
      status: 'adaptive',
      type: 'level-based',
      difficulty: userLevel,
      context: context,
      character: this.selectCharacter(context, insights?.profile || {}),
      objectives: objectives,
      metadata: {
        category: randomCategory,
        template: template.template,
        timestamp: new Date().toISOString()
      }
    };
  }

  getIconForTemplate(template) {
    const iconMap = {
      'job-interview': 'briefcase',
      'team-meeting': 'users',
      'friendship': 'heart',
      'cultural-exchange': 'globe',
      'healthcare': 'medical',
      'banking': 'bank',
      'movie-discussion': 'film',
      'sports-conversation': 'sports'
    };
    
    return iconMap[template] || 'chat';
  }

  formatContext(context) {
    return context.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  getDefaultScenarios(count) {
    // Return some default scenarios when no user memory is available
    const defaults = [
      {
        id: 'default-greeting',
        title: 'Basic Greetings & Introductions',
        description: 'Learn essential greeting phrases and how to introduce yourself confidently.',
        iconName: 'wave',
        status: 'default',
        objectives: [
          { id: 'greet-1', text: 'Use appropriate greetings for different times of day' },
          { id: 'greet-2', text: 'Introduce yourself with basic information' },
          { id: 'greet-3', text: 'Ask and answer simple questions about yourself' },
          { id: 'greet-4', text: 'Practice polite conversation starters' }
        ]
      },
      {
        id: 'default-shopping',
        title: 'Shopping & Making Purchases',
        description: 'Practice common shopping scenarios and transaction vocabulary.',
        iconName: 'bag',
        status: 'default',
        objectives: [
          { id: 'shop-1', text: 'Ask about prices and product information' },
          { id: 'shop-2', text: 'Express preferences and make comparisons' },
          { id: 'shop-3', text: 'Handle payment and receive change' },
          { id: 'shop-4', text: 'Thank the shopkeeper and say goodbye' }
        ]
      }
    ];
    
    return defaults.slice(0, count);
  }

  // Generate personalized system prompts based on user memory
  generatePersonalizedPrompt(scenarioId, basePrompt) {
    const insights = userMemory.getUserInsights();
    if (!insights) return basePrompt;

    const { profile, preferences, patterns } = insights;
    
    let personalizedPrompt = basePrompt;
    
    // Add user-specific context
    personalizedPrompt += `\n\nUSER PERSONALIZATION:`;
    personalizedPrompt += `\n- User's native language: ${profile.nativeLanguage}`;
    personalizedPrompt += `\n- Estimated level: ${this.determineUserLevel(insights)}`;
    
    // Add vocabulary context
    if (patterns.vocabularyDiversity > 10) {
      personalizedPrompt += `\n- User has shown familiarity with ${patterns.vocabularyDiversity} vocabulary words`;
    }
    
    // Add common topics
    if (preferences.commonTopics.length > 0) {
      const topTopics = preferences.commonTopics.slice(0, 3).map(t => t.topic).join(', ');
      personalizedPrompt += `\n- User often discusses: ${topTopics}`;
    }
    
    // Add struggling areas
    const strugglingCount = Object.keys(preferences.strugglingAreas).length;
    if (strugglingCount > 0) {
      personalizedPrompt += `\n- User may need extra support - has struggled with ${strugglingCount} scenarios previously`;
    }
    
    // Add adaptation instructions
    personalizedPrompt += `\n\nADAPTATION INSTRUCTIONS:`;
    personalizedPrompt += `\n- Adjust complexity based on user's demonstrated level`;
    personalizedPrompt += `\n- Reference topics the user has shown interest in when appropriate`;
    personalizedPrompt += `\n- Be patient and encouraging, especially if user has struggled before`;
    personalizedPrompt += `\n- Provide extra explanation for concepts if user seems to need it`;
    
    return personalizedPrompt;
  }
}

// Export singleton instance
export const agenticScenarioGenerator = new AgenticScenarioGenerator();
export default AgenticScenarioGenerator;