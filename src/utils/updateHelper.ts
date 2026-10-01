import type { AppVersionPolicy } from "../services/appVersion";

let globalRequireUpdate: ((policy: AppVersionPolicy) => void) | null = null;

export function setGlobalRequireUpdate(callback: (policy: AppVersionPolicy) => void) {
  globalRequireUpdate = callback;
}

export function callGlobalRequireUpdate(policy: AppVersionPolicy) {
  globalRequireUpdate?.(policy);
}
