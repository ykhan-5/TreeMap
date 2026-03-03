"use client";

import { RSS_FEEDS } from "@/lib/feeds";

interface Props {
  onClose: () => void;
}

// Group feeds by category based on index ranges matching feeds.ts order
const CATEGORIES = [
  { label: "Global News", slice: [0, 13] },
  { label: "Technology", slice: [13, 29] },
  { label: "Business & Markets", slice: [29, 37] },
  { label: "Science & Space", slice: [37, 43] },
  { label: "Research", slice: [43, 45] },
  { label: "Security", slice: [45, 47] },
  { label: "Culture", slice: [47, 48] },
] as const;

export default function SourcesModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">RSS Sources</h2>
            <p className="text-xs text-gray-500 mt-0.5">{RSS_FEEDS.length} feeds · refreshed every 10 minutes</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Feed list */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
          {CATEGORIES.map((cat) => {
            const feeds = RSS_FEEDS.slice(cat.slice[0], cat.slice[1]);
            if (feeds.length === 0) return null;
            return (
              <div key={cat.label}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {cat.label}
                </h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {feeds.map((feed) => (
                    <a
                      key={feed.url}
                      href={feed.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors group"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors truncate">
                        {feed.name}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
