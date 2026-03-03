export interface Headline {
  title: string;
  source: string;
  url: string;
  timestamp: string;
  category: string;
}

export interface WordData {
  word: string;
  count: number;
  momentum: number;
  headlines: Headline[];
  category: string; // dominant category (most headline contributions)
  history?: number[]; // source-unique counts per snapshot, oldest→newest (populated by API)
}

export interface TrendsResponse {
  words: WordData[];
  fetchedAt: string;
  window?: string;
}
