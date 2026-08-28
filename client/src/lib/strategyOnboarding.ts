const STRATEGY_CREATION_TASK_STORAGE_KEY = "otterquant:onboarding:strategy-created";
const STRATEGY_RUN_TASK_STORAGE_KEY = "otterquant:onboarding:strategy-run-complete";
const PAPER_DEPLOYMENT_TASK_STORAGE_KEY = "otterquant:onboarding:paper-deployment-complete";
const CREATED_STRATEGIES_STORAGE_KEY = "otterquant:mystrategies:created-strategies";
export const STRATEGY_CREATION_TASK_CHANGE_EVENT = "otterquant:onboarding:strategy-creation-change";
export const STRATEGY_RUN_TASK_CHANGE_EVENT = "otterquant:onboarding:strategy-run-change";
export const PAPER_DEPLOYMENT_TASK_CHANGE_EVENT = "otterquant:onboarding:paper-deployment-change";

function hasStoredCreatedStrategy() {
  try {
    const records = JSON.parse(window.localStorage.getItem(CREATED_STRATEGIES_STORAGE_KEY) ?? "[]");
    return Array.isArray(records) && records.some(
      (record) => typeof record?.id === "string" && typeof record?.name === "string",
    );
  } catch {
    return false;
  }
}

export function isStrategyCreationTaskComplete() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STRATEGY_CREATION_TASK_STORAGE_KEY) === "true" || hasStoredCreatedStrategy();
}

export function completeStrategyCreationTask() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STRATEGY_CREATION_TASK_STORAGE_KEY, "true");
  window.dispatchEvent(new Event(STRATEGY_CREATION_TASK_CHANGE_EVENT));
}

export function isStrategyRunTaskComplete() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STRATEGY_RUN_TASK_STORAGE_KEY) === "true";
}

export function syncStrategyRunTaskCompletion(completedCount: number) {
  if (typeof window === "undefined") return;
  const isComplete = completedCount > 0;
  const nextValue = String(isComplete);
  if (window.localStorage.getItem(STRATEGY_RUN_TASK_STORAGE_KEY) === nextValue) return;
  window.localStorage.setItem(STRATEGY_RUN_TASK_STORAGE_KEY, nextValue);
  window.dispatchEvent(new Event(STRATEGY_RUN_TASK_CHANGE_EVENT));
}

export function isPaperDeploymentTaskComplete() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PAPER_DEPLOYMENT_TASK_STORAGE_KEY) === "true";
}

export function syncPaperDeploymentTaskCompletion(count: number) {
  if (typeof window === "undefined") return;
  const nextValue = String(count > 0);
  if (window.localStorage.getItem(PAPER_DEPLOYMENT_TASK_STORAGE_KEY) === nextValue) return;
  window.localStorage.setItem(PAPER_DEPLOYMENT_TASK_STORAGE_KEY, nextValue);
  window.dispatchEvent(new Event(PAPER_DEPLOYMENT_TASK_CHANGE_EVENT));
}
