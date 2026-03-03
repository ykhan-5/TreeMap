import type { Headline } from "./types";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_HISTORY  = 72; // 12 hours of 10-min snapshots

interface CacheState {
  allHeadlines: Headline[];
  currentCounts: Map<string, number>;
  prevCounts: Map<string, number>;
  fetchedAt: number;
}

let cache: CacheState | null = null;

// Ring-buffer of word-count snapshots, oldest first.
// Each entry maps word → source-unique count at that snapshot time.
let snapshotHistory: Array<Map<string, number>> = [];

/** Returns raw headlines if the cache is still fresh, null if stale/empty. */
export function getCachedHeadlines(): Headline[] | null {
  if (!cache) return null;
  if (Date.now() - cache.fetchedAt > CACHE_TTL_MS) return null;
  return cache.allHeadlines;
}

/** Returns counts from the PREVIOUS fetch cycle — used as momentum baseline. */
export function getPrevCounts(): Map<string, number> {
  return cache?.prevCounts ?? new Map();
}

/** Returns per-snapshot counts for a word, oldest→newest. Empty array if no history. */
export function getWordHistory(word: string): number[] {
  return snapshotHistory.map((snap) => snap.get(word) ?? 0);
}

/**
 * Store a fresh batch of headlines and the word counts derived from them.
 * Also appends the counts to the history ring-buffer.
 * The old currentCounts are automatically promoted to prevCounts.
 */
export function setCachedData(headlines: Headline[], newCounts: Map<string, number>): void {
  cache = {
    allHeadlines: headlines,
    currentCounts: newCounts,
    prevCounts: cache?.currentCounts ?? new Map(),
    fetchedAt: Date.now(),
  };
  // Append a copy to history (copy so future mutations don't corrupt it)
  snapshotHistory.push(new Map(newCounts));
  if (snapshotHistory.length > MAX_HISTORY) snapshotHistory.shift();
}
