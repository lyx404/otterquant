import { useCallback, useEffect, useState } from "react";

const FOLLOWING_STORAGE_KEY = "otterquant.marketplace.following";
const STOPPED_FOLLOWING_STORAGE_KEY = "otterquant.marketplace.stopped-following";
const FOLLOWING_EVENT = "otterquant:marketplace-following-change";
const DEFAULT_FOLLOWING_STRATEGY_IDS = ["STR-005"];

function readStoredIds(key: string) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function readFollowingIds() {
  if (typeof window === "undefined") return new Set(DEFAULT_FOLLOWING_STRATEGY_IDS);
  const storedIds = readStoredIds(FOLLOWING_STORAGE_KEY);
  const stoppedIds = readStoredIds(STOPPED_FOLLOWING_STORAGE_KEY);
  return new Set([...DEFAULT_FOLLOWING_STRATEGY_IDS, ...Array.from(storedIds)].filter((id) => !stoppedIds.has(id)));
}

function writeFollowingIds(ids: Set<string>) {
  window.localStorage.setItem(FOLLOWING_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  window.dispatchEvent(new Event(FOLLOWING_EVENT));
}

export function useFollowingStrategyIds() {
  const [followingStrategyIds, setFollowingStrategyIds] = useState<Set<string>>(readFollowingIds);

  useEffect(() => {
    const sync = () => setFollowingStrategyIds(readFollowingIds());
    window.addEventListener("storage", sync);
    window.addEventListener(FOLLOWING_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(FOLLOWING_EVENT, sync);
    };
  }, []);

  const addFollowing = useCallback((strategyId: string) => {
    setFollowingStrategyIds((current) => {
      const next = new Set(current);
      next.add(strategyId);
      const stoppedIds = readStoredIds(STOPPED_FOLLOWING_STORAGE_KEY);
      stoppedIds.delete(strategyId);
      window.localStorage.setItem(STOPPED_FOLLOWING_STORAGE_KEY, JSON.stringify(Array.from(stoppedIds)));
      writeFollowingIds(next);
      return next;
    });
  }, []);

  const removeFollowing = useCallback((strategyId: string) => {
    setFollowingStrategyIds((current) => {
      const next = new Set(current);
      next.delete(strategyId);
      const stoppedIds = readStoredIds(STOPPED_FOLLOWING_STORAGE_KEY);
      stoppedIds.add(strategyId);
      window.localStorage.setItem(STOPPED_FOLLOWING_STORAGE_KEY, JSON.stringify(Array.from(stoppedIds)));
      writeFollowingIds(next);
      return next;
    });
  }, []);

  return { followingStrategyIds, addFollowing, removeFollowing };
}
