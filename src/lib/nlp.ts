import type { Headline, WordData } from "./types";

const STOPWORDS = new Set([
  // Articles, prepositions, conjunctions
  "the", "and", "for", "with", "from", "that", "this", "are", "was",
  "were", "has", "have", "had", "not", "but", "can", "its", "will",
  "been", "being", "they", "them", "their", "there", "then", "than",
  "when", "who", "what", "which", "where", "how", "all", "any", "each",
  "more", "most", "some", "such", "into", "onto", "over", "under",
  "after", "before", "about", "above", "below", "between", "through",
  "during", "without", "within", "along", "following", "across",
  "behind", "beyond", "plus", "except", "out", "around", "per",
  "against", "off", "should", "would", "could", "may", "might",
  "must", "shall", "does", "did", "its", "your", "our", "their",
  "his", "her", "him", "she", "you", "him", "one", "two", "also",
  "just", "even", "back", "still", "well", "only", "both", "though",
  "while", "since", "until", "unless", "whether", "because", "although",
  "however", "therefore", "thus", "hence", "again", "here",
  // News noise
  "says", "said", "say", "news", "new", "year", "first", "last",
  "amid", "report", "reports", "reported", "according",
  "week", "day", "days", "make", "made", "take", "taken",
  "get", "gets", "got", "use", "used", "using", "via", "show",
  "shows", "showing", "find", "finds", "found", "know", "known",
  "become", "became", "becoming", "give", "given", "call", "called",
  "tell", "told", "ask", "asked", "look", "looks", "seem", "seems",
  "come", "came", "going", "goes", "went", "want",
  "wants", "need", "needs", "let", "put", "set", "keep", "kept",
  "start", "end", "high", "low", "big", "old", "next",
  "plan", "plans", "planned", "move", "moves", "moved", "hit",
  "hits", "raise", "raises", "raised", "fall", "falls", "fell",
  "rise", "rises", "rose", "grow", "grows", "grew", "cut", "cuts",
  "ban", "open", "close", "hold", "held", "face", "faces", "faced",
  "lead", "leads", "led", "help", "helps", "helped", "try", "tries",
  "tried", "push", "pushes", "pushed", "pull", "pulls", "pulled",
  "mark", "marks", "latest", "update", "updates",
  "breaking", "exclusive", "watch", "live", "top", "best", "worst",
  "key", "major", "third", "four", "five", "six", "seven",
  "eight", "nine", "ten",
  // Generic filler
  "video", "today", "tomorrow", "people", "time",
  "why", "now", "down", "years", "right", "like", "like", "total", "other",
  "ever", "free", "save", "brief", "finally", "review", "display",
  "price", "deal", "long", "good", "less", "much", "late", "full",
  "real", "fast", "hard", "days", "week", "weeks", "months", "month",
  "thing", "things", "way", "ways", "part", "parts", "side", "place",
  "lot", "few", "many", "ago", "old", "new", "own", "off", "yet",
  "too", "nor", "via", "per", "say", "run", "ran", "see", "seen",
  "add", "added", "adding",
  // Product adjective noise
  "pro", "max", "ultra", "mini", "plus", "lite", "buy", "feature",
  "getting", "making", "another", "take",
  // Verb / filler artifacts
  "brings", "gives", "coming", "including", "saw", "great", "everything",
  "announces", "reveals", "launches", "launched", "announced", "revealed",
  "shows", "hits", "faces", "takes", "offers", "wins", "loses", "loses",
  "comes", "goes", "sets", "gets", "puts", "lets", "runs", "calls",
  "says", "said", "using", "according", "amid",
]);

function dominantCategory(catCountMap: Map<string, number>): string {
  let best = "Global News";
  let bestCount = 0;
  catCountMap.forEach((count, cat) => {
    if (count > bestCount) { bestCount = count; best = cat; }
  });
  return best;
}

export function processHeadlines(headlines: Headline[], prevCounts: Map<string, number>): WordData[] {
  // Whether we have a previous snapshot to compute real momentum
  const hasHistory = prevCounts.size > 0;

  const countMap = new Map<string, number>();
  const headlineMap = new Map<string, Headline[]>();
  const catCountMap = new Map<string, Map<string, number>>();
  const bigramCountMap = new Map<string, number>();
  const bigramHeadlineMap = new Map<string, Headline[]>();
  const bigramCatCountMap = new Map<string, Map<string, number>>();

  // Source diversity: track (word, source) pairs so each outlet counts once per word
  const seenWordSource = new Set<string>();
  const seenBigramSource = new Set<string>();

  for (const headline of headlines) {
    const tokens = tokenize(headline.title);
    const cat = headline.category;
    const src = headline.source;

    // Unigrams — deduplicated per headline URL (for headlines list),
    //            counted per unique source (for frequency score)
    const seenInHeadline = new Set<string>();
    for (const token of tokens) {
      if (seenInHeadline.has(token)) continue;
      seenInHeadline.add(token);

      // Source-diversity count: only increment if this source hasn't counted this word yet
      const wsKey = `${token}::${src}`;
      if (!seenWordSource.has(wsKey)) {
        seenWordSource.add(wsKey);
        countMap.set(token, (countMap.get(token) ?? 0) + 1);
      }

      const hl = headlineMap.get(token) ?? [];
      if (!hl.some((h) => h.url === headline.url)) hl.push(headline);
      headlineMap.set(token, hl);

      const cm = catCountMap.get(token) ?? new Map<string, number>();
      cm.set(cat, (cm.get(cat) ?? 0) + 1);
      catCountMap.set(token, cm);
    }

    // Bigrams
    const seenBigramInHeadline = new Set<string>();
    for (let i = 0; i < tokens.length - 1; i++) {
      const bigram = `${tokens[i]} ${tokens[i + 1]}`;
      if (seenBigramInHeadline.has(bigram)) continue;
      seenBigramInHeadline.add(bigram);

      const wsKey = `${bigram}::${src}`;
      if (!seenBigramSource.has(wsKey)) {
        seenBigramSource.add(wsKey);
        bigramCountMap.set(bigram, (bigramCountMap.get(bigram) ?? 0) + 1);
      }

      const hl = bigramHeadlineMap.get(bigram) ?? [];
      if (!hl.some((h) => h.url === headline.url)) hl.push(headline);
      bigramHeadlineMap.set(bigram, hl);

      const cm = bigramCatCountMap.get(bigram) ?? new Map<string, number>();
      cm.set(cat, (cm.get(cat) ?? 0) + 1);
      bigramCatCountMap.set(bigram, cm);
    }
  }

  const results: WordData[] = [];

  // Unigrams — min 2 unique sources
  Array.from(countMap.entries()).forEach(([word, count]) => {
    if (count < 2) return;
    results.push({
      word,
      count,
      momentum: hasHistory ? count - (prevCounts.get(word) ?? 0) : 0,
      headlines: (headlineMap.get(word) ?? []).slice(0, 20),
      category: dominantCategory(catCountMap.get(word) ?? new Map()),
    });
  });

  // Bigrams — min 2 unique sources
  Array.from(bigramCountMap.entries()).forEach(([bigram, count]) => {
    if (count < 2) return;
    results.push({
      word: bigram,
      count,
      momentum: hasHistory ? count - (prevCounts.get(bigram) ?? 0) : 0,
      headlines: (bigramHeadlineMap.get(bigram) ?? []).slice(0, 20),
      category: dominantCategory(bigramCatCountMap.get(bigram) ?? new Map()),
    });
  });

  // Phrase suppression: remove a unigram when a bigram containing it covers enough of its count.
  // Rule: suppress if bigram.count >= 3 AND covers ≥30% of the unigram,
  //       OR covers ≥50% regardless of count.
  // This ensures "MIDDLE EAST" replaces "MIDDLE" + "EAST".
  const suppressed = new Set<string>();
  for (const item of results) {
    if (!item.word.includes(" ")) continue;
    const parts = item.word.split(" ");
    for (const part of parts) {
      const partItem = results.find((r) => !r.word.includes(" ") && r.word === part);
      if (!partItem) continue;
      const strongBigram = item.count >= 3 && item.count >= partItem.count * 0.30;
      const dominantBigram = item.count >= partItem.count * 0.50;
      if (strongBigram || dominantBigram) suppressed.add(part);
    }
  }

  return results
    .filter((r) => (r.word.includes(" ") ? true : !suppressed.has(r.word)))
    .sort((a, b) => b.count - a.count)
    .slice(0, 100);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}
