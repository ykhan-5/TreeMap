"use client";

import type { WordData } from "@/lib/types";

interface Props {
  word: WordData | null;
  onClose: () => void;
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

export default function DetailPanel({ word, onClose }: Props) {
  if (!word) return null;

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-gray-700 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide uppercase">
            {word.word}
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-gray-400 text-sm">
              {word.count} mention{word.count !== 1 ? "s" : ""}
            </span>
            {word.momentum !== 0 && (
              <span
                className={`text-sm font-medium ${
                  word.momentum > 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {word.momentum > 0 ? "▲" : "▼"} {Math.abs(word.momentum)} since last check
              </span>
            )}
            {word.momentum === 0 && (
              <span className="text-sm text-gray-500">stable</span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors ml-4 mt-1 text-xl leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Headlines list */}
      <div className="overflow-y-auto flex-1">
        {word.headlines.length === 0 ? (
          <p className="text-gray-500 p-4 text-sm">No headlines found.</p>
        ) : (
          <ul className="divide-y divide-gray-800">
            {word.headlines.map((h, i) => (
              <li key={i} className="p-4 hover:bg-gray-800 transition-colors">
                <a
                  href={h.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <p className="text-white text-sm font-medium leading-snug hover:text-blue-400 transition-colors">
                    {h.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-blue-400 font-medium">
                      {h.source}
                    </span>
                    <span className="text-xs text-gray-600">·</span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(h.timestamp)}
                    </span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
