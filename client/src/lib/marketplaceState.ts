import { useCallback, useEffect, useState } from "react";

const FOLLOWING_STORAGE_KEY = "otterquant.marketplace.following";
const FOLLOWING_EVENT = "otterquant:marketplace-following-change";
const DEFAULT_FOLLOWING_STRATEGY_IDS = ["STR-005"];

function readFollowingIds() {
  if (typeof window === "undefined") return new Set(DEFAULT_FOLLOWING_STRATEGY_IDS);
  try {
    const value = JSON.parse(window.localStorage.getItem(FOLLOWING_STORAGE_KEY) ?? "[]");
    const storedIds = Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
    return new Set([...DEFAULT_FOLLOWING_STRATEGY_IDS, ...storedIds]);
  } catch {
    return new Set(DEFAULT_FOLLOWING_STRATEGY_IDS);
  }
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
      writeFollowingIds(next);
      return next;
    });
  }, []);

  return { followingStrategyIds, addFollowing };
}
