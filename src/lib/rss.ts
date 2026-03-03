import Parser from "rss-parser";
import type { Headline } from "./types";
import { RSS_FEEDS } from "./feeds";

const parser = new Parser({
  timeout: 8000,
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; HeadlineTreemap/1.0)",
  },
});

export async function fetchAllFeeds(): Promise<Headline[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map((feed) => fetchFeed(feed.url, feed.name, feed.category))
  );

  const headlines: Headline[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      headlines.push(...result.value);
    }
    // Silently skip failed feeds
  }
  return headlines;
}

async function fetchFeed(url: string, sourceName: string, category: string): Promise<Headline[]> {
  const feed = await parser.parseURL(url);
  const headlines: Headline[] = [];

  for (const item of feed.items ?? []) {
    if (!item.title) continue;
    headlines.push({
      title: item.title,
      source: sourceName,
      url: item.link ?? item.guid ?? "",
      timestamp: item.pubDate ?? item.isoDate ?? new Date().toISOString(),
      category,
    });
  }

  return headlines;
}
