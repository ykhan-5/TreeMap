export type FeedCategory =
  | "Global News"
  | "Technology"
  | "Business & Markets"
  | "Science & Space"
  | "Research"
  | "Security"
  | "Culture";

export interface FeedConfig {
  url: string;
  name: string;
  category: FeedCategory;
}

export const RSS_FEEDS: FeedConfig[] = [
  // Global News
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", name: "BBC World", category: "Global News" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", name: "Al Jazeera", category: "Global News" },
  { url: "https://feeds.npr.org/1001/rss.xml", name: "NPR News", category: "Global News" },
  { url: "https://www.theguardian.com/world/rss", name: "The Guardian", category: "Global News" },
  { url: "https://rss.cnn.com/rss/edition.rss", name: "CNN", category: "Global News" },
  { url: "https://rss.cnn.com/rss/edition_world.rss", name: "CNN World", category: "Global News" },
  { url: "https://abcnews.go.com/abcnews/topstories", name: "ABC News", category: "Global News" },
  { url: "https://www.cbsnews.com/latest/rss/main", name: "CBS News", category: "Global News" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", name: "NY Times", category: "Global News" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", name: "NY Times World", category: "Global News" },
  { url: "https://feeds.washingtonpost.com/rss/world", name: "Washington Post", category: "Global News" },
  { url: "https://www.politico.com/rss/politicopicks.xml", name: "Politico", category: "Global News" },
  { url: "https://feeds.skynews.com/feeds/rss/world.xml", name: "Sky News", category: "Global News" },

  // Technology
  { url: "https://techcrunch.com/feed/", name: "TechCrunch", category: "Technology" },
  { url: "https://www.theverge.com/rss/index.xml", name: "The Verge", category: "Technology" },
  { url: "https://www.wired.com/feed/rss", name: "Wired", category: "Technology" },
  { url: "https://feeds.arstechnica.com/arstechnica/index", name: "Ars Technica", category: "Technology" },
  { url: "https://www.technologyreview.com/feed/", name: "MIT Tech Review", category: "Technology" },
  { url: "https://venturebeat.com/feed/", name: "VentureBeat", category: "Technology" },
  { url: "https://www.engadget.com/rss.xml", name: "Engadget", category: "Technology" },
  { url: "https://mashable.com/feed/", name: "Mashable", category: "Technology" },
  { url: "https://www.zdnet.com/news/rss.xml", name: "ZDNet", category: "Technology" },
  { url: "https://www.androidauthority.com/feed/", name: "Android Authority", category: "Technology" },
  { url: "https://appleinsider.com/rss/news", name: "AppleInsider", category: "Technology" },
  { url: "https://github.blog/feed/", name: "GitHub Blog", category: "Technology" },
  { url: "https://hnrss.org/frontpage", name: "Hacker News", category: "Technology" },
  { url: "https://www.reddit.com/r/technology/.rss", name: "Reddit Technology", category: "Technology" },
  { url: "https://www.reddit.com/r/worldnews/.rss", name: "Reddit World News", category: "Global News" },

  // Business & Markets
  { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", name: "CNBC", category: "Business & Markets" },
  { url: "https://feeds.marketwatch.com/marketwatch/topstories/", name: "MarketWatch", category: "Business & Markets" },
  { url: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml", name: "WSJ Markets", category: "Business & Markets" },
  { url: "https://finance.yahoo.com/news/rssindex", name: "Yahoo Finance", category: "Business & Markets" },
  { url: "https://www.forbes.com/business/feed/", name: "Forbes", category: "Business & Markets" },
  { url: "https://www.businessinsider.com/rss", name: "Business Insider", category: "Business & Markets" },
  { url: "https://www.economist.com/latest/rss.xml", name: "The Economist", category: "Business & Markets" },
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", name: "CoinDesk", category: "Business & Markets" },

  // Science & Space
  { url: "https://www.sciencedaily.com/rss/top/science.xml", name: "Science Daily", category: "Science & Space" },
  { url: "https://www.nasa.gov/rss/dyn/breaking_news.rss", name: "NASA", category: "Science & Space" },
  { url: "https://www.space.com/feeds/all", name: "Space.com", category: "Science & Space" },
  { url: "https://www.esa.int/rssfeed/Our_Activities", name: "ESA", category: "Science & Space" },
  { url: "https://www.livescience.com/feeds/all", name: "Live Science", category: "Science & Space" },
  { url: "https://www.smithsonianmag.com/rss/latest_articles/", name: "Smithsonian", category: "Science & Space" },

  // Research
  { url: "https://www.brookings.edu/feed/", name: "Brookings", category: "Research" },
  { url: "https://www.rand.org/topics/rss.xml", name: "RAND", category: "Research" },

  // Security
  { url: "https://krebsonsecurity.com/feed/", name: "Krebs on Security", category: "Security" },
  { url: "https://feeds.feedburner.com/TheHackersNews", name: "The Hacker News", category: "Security" },

  // Culture
  { url: "https://www.rollingstone.com/music/music-news/feed/", name: "Rolling Stone", category: "Culture" },
];
