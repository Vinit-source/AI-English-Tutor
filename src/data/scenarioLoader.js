import { scenarios } from './scenarios';

export async function loadScenarioPrompt(scenarioId) {
  try {
    const promptModule = await import(`../prompts/${scenarioId}.txt`);
    return promptModule.default;
  } catch (error) {
    console.error(`Error loading prompt for scenario ${scenarioId}:`, error);
    return '';
  }
}

export function getScenarioById(scenarioId) {
  return scenarios.find(scenario => scenario.id === scenarioId);
}

export function getAllScenarios() {
  return scenarios;
}