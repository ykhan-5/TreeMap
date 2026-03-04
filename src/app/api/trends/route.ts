import { NextRequest, NextResponse } from "next/server";
import { fetchAllFeeds } from "@/lib/rss";
import { processHeadlines } from "@/lib/nlp";
import { getCachedHeadlines, getPrevCounts, setCachedData, getWordHistory } from "@/lib/cache";
import type { Headline } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const WINDOW_MAP: Record<string, number> = {
  "30m": 30 * 60 * 1000,
  "3h":  3  * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "5d":  5  * 24 * 60 * 60 * 1000,
};

function filterByWindow(headlines: Headline[], win: string): Headline[] {
  const ms = WINDOW_MAP[win];
  if (!ms) return headlines;
  const cutoff = Date.now() - ms;
  return headlines.filter((h) => {
    const ts = new Date(h.timestamp).getTime();
    return !isNaN(ts) && ts >= cutoff;
  });
}

export async function GET(req: NextRequest) {
  try {
    const win = req.nextUrl.searchParams.get("window") ?? "24h";

    let headlines = getCachedHeadlines();

    if (!headlines) {
      headlines = await fetchAllFeeds();

      if (headlines.length === 0) {
        return NextResponse.json({ error: "Could not fetch any RSS feeds" }, { status: 502 });
      }

      // Compute full-dataset counts to store as the new momentum baseline
      const prevCounts = getPrevCounts();
      const fullWords = processHeadlines(headlines, prevCounts);
      const newCounts = new Map(fullWords.map((w) => [w.word, w.count]));
      setCachedData(headlines, newCounts);
    }

    const filtered = filterByWindow(headlines, win);

    // Momentum is computed client-side by comparing successive fetches.
    // Server always returns momentum=0; client overlays its own delta.
    const words = processHeadlines(filtered, new Map<string, number>());

    // Attach per-word sparkline history
    const wordsWithHistory = words.map((w) => ({
      ...w,
      history: getWordHistory(w.word),
    }));

    return NextResponse.json({
      words: wordsWithHistory,
      fetchedAt: new Date().toISOString(),
      window: win,
    });
  } catch (err) {
    console.error("Error in /api/trends:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
