import { scenarios } from './scenarios';
import { agenticScenarioGenerator } from '../utils/agenticScenarioGenerator.js';
import { userMemory } from '../utils/userMemory.js';

export async function loadScenarioPrompt(scenarioId) {
  try {
    // Check if it's a dynamic scenario first
    if (scenarioId.startsWith('dynamic-') || scenarioId.startsWith('agentic-') || scenarioId.startsWith('practice-') || scenarioId.startsWith('adaptive-')) {
      return generateDynamicPrompt(scenarioId);
    }
    
    const promptModule = await import(`../prompts/${scenarioId}.txt`);
    return promptModule.default;
  } catch (error) {
    console.error(`Error loading prompt for scenario ${scenarioId}:`, error);
    return generateFallbackPrompt(scenarioId);
  }
}

export function getScenarioById(scenarioId) {
  // First check static scenarios
  const staticScenario = scenarios.find(scenario => scenario.id === scenarioId);
  if (staticScenario) return staticScenario;
  
  // Then check if it's a dynamic scenario stored in memory
  const dynamicScenarios = getDynamicScenarios();
  return dynamicScenarios.find(scenario => scenario.id === scenarioId);
}

export function getAllScenarios() {
  const staticScenarios = [...scenarios];
  const dynamicScenarios = getDynamicScenarios();
  
  // Combine static and dynamic scenarios
  return [...staticScenarios, ...dynamicScenarios];
}

export function getDynamicScenarios() {
  try {
    const personalizedScenarios = agenticScenarioGenerator.generatePersonalizedScenarios(3);
    return personalizedScenarios;
  } catch (error) {
    console.error('Error generating dynamic scenarios:', error);
    return [];
  }
}

export function generatePersonalizedScenarios(count = 3) {
  return agenticScenarioGenerator.generatePersonalizedScenarios(count);
}

function generateDynamicPrompt(scenarioId) {
  const scenario = getScenarioById(scenarioId);
  if (!scenario) {
    return generateFallbackPrompt(scenarioId);
  }

  const basePrompt = createBasePromptForScenario(scenario);
  
  // Use the agentic generator to personalize the prompt
  return agenticScenarioGenerator.generatePersonalizedPrompt(scenarioId, basePrompt);
}

function createBasePromptForScenario(scenario) {
  const objectivesList = scenario.objectives
    .map((obj, index) => `${index + 1}. [${index + 1}] ${obj.text}`)
    .join('\n');

  return `You are a friendly English tutor conducting a "${scenario.title}" scenario. Your role is to guide the student through this interactive learning experience.

SCENARIO: ${scenario.title}
DESCRIPTION: ${scenario.description}

KEY CONVERSATION OBJECTIVES:
${objectivesList}

INTERACTION GUIDELINES:
- Act as ${scenario.character || 'a helpful conversation partner'} in this scenario
- Guide the conversation naturally through the learning objectives
- Provide opportunities for the student to practice each objective
- Correct any grammatical mistakes gently using the correction format
- Use vocabulary appropriate for this scenario
- Be encouraging and supportive

FEEDBACK PROTOCOL:
1. When the student correctly fulfills an objective, add the corresponding number in brackets (e.g., [1]) at the start of your response
2. For grammar or phrasing mistakes:
   a. Acknowledge their meaning
   b. Use the exact phrase "You could say: <<CORRECTION>>" where <<CORRECTION>> is your suggested correction in double quotes
   c. Explanation if needed

Example of correction:
"I understand you want to ${scenario.objectives[0]?.text.toLowerCase() || 'practice conversation'}. You could say: "Could you help me with this?" This is a more natural way to ask for assistance."

FORMAT:
Always provide your English response first, followed by its translation in parentheses.
Example: "Hello! Welcome to this scenario. How can I help you today? (Hindi: नमस्ते! इस परिदृश्य में आपका स्वागत है। मैं आज आपकी कैसे मदद कर सकता हूं?)"`;
}

function generateFallbackPrompt(scenarioId) {
  return `You are a friendly English tutor helping a student practice English conversation. 

The student is working on scenario: ${scenarioId}

Please:
- Be encouraging and supportive
- Help them practice natural English conversation
- Correct mistakes gently
- Ask engaging questions to keep the conversation flowing

Always provide your English response first, followed by its translation in parentheses.`;
}