const FACTOR_CREATION_TASK_STORAGE_KEY = "otterquant:onboarding:factor-created";
export const FACTOR_CREATION_TASK_CHANGE_EVENT = "otterquant:onboarding:factor-creation-change";

export function isFactorCreationTaskComplete() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(FACTOR_CREATION_TASK_STORAGE_KEY) === "true";
}

export function syncFactorCreationTaskCompletion(count: number) {
  if (typeof window === "undefined") return;
  const nextValue = String(count > 0);
  if (window.localStorage.getItem(FACTOR_CREATION_TASK_STORAGE_KEY) === nextValue) return;
  window.localStorage.setItem(FACTOR_CREATION_TASK_STORAGE_KEY, nextValue);
  window.dispatchEvent(new Event(FACTOR_CREATION_TASK_CHANGE_EVENT));
}
