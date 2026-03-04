"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import DetailPanel from "./DetailPanel";
import SourcesModal from "./SourcesModal";
import type { WordData, TrendsResponse } from "@/lib/types";

const Treemap = dynamic(() => import("./Treemap"), { ssr: false });

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

const TIME_WINDOWS = [
  { label: "30m", value: "30m" },
  { label: "3h",  value: "3h"  },
  { label: "12h", value: "12h" },
  { label: "24h", value: "24h" },
  { label: "5d",  value: "5d"  },
] as const;

interface WindowCacheEntry {
  words: WordData[];
  fetchedAt: number;   // ms timestamp
  fetchedAtIso: string;
}

interface Props {
  initialData: TrendsResponse | null;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return ""; }
}

export default function HeadlineMap({ initialData }: Props) {
  const [words, setWords]               = useState<WordData[]>(initialData?.words ?? []);
  const [fetchedAt, setFetchedAt]       = useState<string>(initialData?.fetchedAt ?? "");
  const [selectedWord, setSelectedWord] = useState<WordData | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [showSources, setShowSources]   = useState(false);
  const [screenshotting, setScreenshotting] = useState(false);
  const [grouped, setGrouped]           = useState(false);
  const [timeWindow, setTimeWindow]     = useState("24h");
  const treemapContainerRef             = useRef<HTMLDivElement>(null);

  // Per-window client-side cache of API responses
  const windowCache     = useRef(new Map<string, WindowCacheEntry>());
  // Per-window previous word counts — used to compute client-side momentum
  const windowPrevCounts = useRef(new Map<string, Map<string, number>>());

  /** Overlay client-computed momentum onto words, replacing whatever the server sent. */
  const applyClientMomentum = useCallback((rawWords: WordData[], win: string): WordData[] => {
    const prev = windowPrevCounts.current.get(win);
    if (!prev) return rawWords;
    return rawWords.map((w) => ({
      ...w,
      momentum: w.count - (prev.get(w.word) ?? 0),
    }));
  }, []);

  /**
   * Fetch one window from the API, apply client-side momentum, and update caches.
   * Returns the processed words, or null on network error.
   */
  const fetchWindow = useCallback(async (win: string): Promise<{ words: WordData[]; fetchedAtIso: string } | null> => {
    const res = await fetch(`/api/trends?window=${win}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: TrendsResponse = await res.json();

    // Compute momentum against previous snapshot for this window
    const wordsWithMomentum = applyClientMomentum(data.words, win);

    // Save raw counts as the new baseline for next refresh
    windowPrevCounts.current.set(win, new Map(data.words.map((w) => [w.word, w.count])));

    // Cache the processed result
    windowCache.current.set(win, {
      words: wordsWithMomentum,
      fetchedAt: Date.now(),
      fetchedAtIso: data.fetchedAt,
    });

    return { words: wordsWithMomentum, fetchedAtIso: data.fetchedAt };
  }, [applyClientMomentum]);

  /**
   * Main refresh function.
   * - force=false (default): serve from client cache if < 10 min old.
   * - force=true: bypass cache, hit the API.
   */
  const refresh = useCallback(async (win?: string, force = false) => {
    const w = win ?? timeWindow;

    // Serve from client cache if still fresh
    if (!force) {
      const cached = windowCache.current.get(w);
      if (cached && Date.now() - cached.fetchedAt < REFRESH_INTERVAL_MS) {
        setWords(cached.words);
        setFetchedAt(cached.fetchedAtIso);
        if (selectedWord) {
          setSelectedWord(cached.words.find((x) => x.word === selectedWord.word) ?? null);
        }
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchWindow(w);
      if (!result) return;
      setWords(result.words);
      setFetchedAt(result.fetchedAtIso);
      if (selectedWord) {
        setSelectedWord(result.words.find((x) => x.word === selectedWord.word) ?? null);
      }
    } catch (e) {
      setError("Failed to refresh headlines.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [timeWindow, selectedWord, fetchWindow]);

  /** Force-refresh current window, then silently pre-fetch all other windows. */
  const handleRefresh = useCallback(async () => {
    const w = timeWindow;
    windowCache.current.clear(); // invalidate all cached windows

    setLoading(true);
    setError(null);
    try {
      const result = await fetchWindow(w);
      if (!result) return;
      setWords(result.words);
      setFetchedAt(result.fetchedAtIso);
      if (selectedWord) {
        setSelectedWord(result.words.find((x) => x.word === selectedWord.word) ?? null);
      }
    } catch (e) {
      setError("Failed to refresh headlines.");
      console.error(e);
      return;
    } finally {
      setLoading(false);
    }

    // Pre-fetch other windows in background (server cache is warm now)
    const otherWindows = TIME_WINDOWS.map((tw) => tw.value).filter((v) => v !== w);
    Promise.all(otherWindows.map((win) => fetchWindow(win).catch(() => null)));
  }, [timeWindow, selectedWord, fetchWindow]);

  /** Switching windows uses the client cache — no spinner, no API call if fresh. */
  const handleWindowChange = useCallback((win: string) => {
    setTimeWindow(win);
    const cached = windowCache.current.get(win);
    if (cached && Date.now() - cached.fetchedAt < REFRESH_INTERVAL_MS) {
      setWords(cached.words);
      setFetchedAt(cached.fetchedAtIso);
      if (selectedWord) {
        setSelectedWord(cached.words.find((x) => x.word === selectedWord.word) ?? null);
      }
    } else {
      // Not cached yet — fetch it (will show loading only for this window)
      refresh(win, false);
    }
  }, [selectedWord, refresh]);

  // Auto-refresh on interval (force = true to bypass client cache)
  useEffect(() => {
    const id = setInterval(() => {
      // Force-refresh current window and invalidate others
      windowCache.current.clear();
      refresh(undefined, true);
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Initial load — if SSR provided no data, fetch now
  useEffect(() => {
    if (!initialData || initialData.words.length === 0) {
      refresh(undefined, true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Top trending words (positive momentum) — available for all windows now
  const trending = useMemo(() =>
    words.filter((w) => w.momentum > 0).sort((a, b) => b.momentum - a.momentum).slice(0, 7),
    [words]
  );

  const handleScreenshot = useCallback(async () => {
    const container = treemapContainerRef.current;
    if (!container) return;
    const svg = container.querySelector("svg");
    if (!svg) return;
    setScreenshotting(true);
    try {
      const svgWidth = svg.clientWidth;
      const svgHeight = svg.clientHeight;
      const PADDING = 24;
      const HEADER_H = 68;
      const serializer = new XMLSerializer();
      const svgClone = svg.cloneNode(true) as SVGSVGElement;
      const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bgRect.setAttribute("width", String(svgWidth));
      bgRect.setAttribute("height", String(svgHeight));
      bgRect.setAttribute("fill", "#030712");
      svgClone.insertBefore(bgRect, svgClone.firstChild);
      const svgString = serializer.serializeToString(svgClone);
      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(blob);
      const canvas = document.createElement("canvas");
      const dpr = window.devicePixelRatio || 1;
      const canvasW = svgWidth + PADDING * 2;
      const canvasH = svgHeight + HEADER_H + PADDING;
      canvas.width = canvasW * dpr;
      canvas.height = canvasH * dpr;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = "#030712";
      ctx.fillRect(0, 0, canvasW, canvasH);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
      ctx.fillText("Internet Headline Map", PADDING, PADDING + 22);
      const timestamp = fetchedAt ? formatTime(fetchedAt) : new Date().toLocaleString();
      ctx.fillStyle = "#6b7280";
      ctx.font = "13px system-ui, -apple-system, sans-serif";
      ctx.fillText(timestamp, PADDING, PADDING + 44);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => { ctx.drawImage(img, PADDING, HEADER_H, svgWidth, svgHeight); URL.revokeObjectURL(svgUrl); resolve(); };
        img.onerror = reject;
        img.src = svgUrl;
      });
      const link = document.createElement("a");
      const dateSlug = new Date().toISOString().slice(0, 16).replace("T", "-").replace(":", "");
      link.download = `headline-map-${dateSlug}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) { console.error("Screenshot failed:", e); }
    finally { setScreenshotting(false); }
  }, [fetchedAt]);

  const panelOpen = selectedWord !== null;

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-gray-800 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">Internet Headline Map</h1>
          <p className="text-xs text-gray-500 mt-0.5">What the world is talking about right now</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Legend */}
          <div className="hidden lg:flex items-center gap-3 text-xs text-gray-500 mr-2">
            <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500" />rising</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-gray-600" />stable</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500" />falling</span>
            <span className="text-gray-700">·</span>
            <span>size = sources</span>
          </div>

          {fetchedAt && <span className="hidden sm:block text-xs text-gray-600 mr-1">{formatTime(fetchedAt)}</span>}

          {/* Time window segmented control */}
          <div className="flex rounded overflow-hidden border border-gray-700 text-xs">
            {TIME_WINDOWS.map((tw, i) => (
              <button
                key={tw.value}
                onClick={() => handleWindowChange(tw.value)}
                className={`px-2.5 py-1.5 transition-colors ${i > 0 ? "border-l border-gray-700" : ""} ${
                  timeWindow === tw.value ? "bg-gray-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >{tw.label}</button>
            ))}
          </div>

          {/* Flat / By Category toggle */}
          <div className="flex rounded overflow-hidden border border-gray-700 text-xs">
            <button onClick={() => setGrouped(false)} className={`px-3 py-1.5 transition-colors ${!grouped ? "bg-gray-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>Flat</button>
            <button onClick={() => setGrouped(true)} className={`px-3 py-1.5 border-l border-gray-700 transition-colors ${grouped ? "bg-gray-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>By Category</button>
          </div>

          <button onClick={() => setShowSources(true)} className="text-xs px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">Sources</button>
          <button onClick={handleScreenshot} disabled={screenshotting || words.length === 0} className="text-xs px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">{screenshotting ? "Saving…" : "Screenshot"}</button>
          <button onClick={handleRefresh} disabled={loading} className="text-xs px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{loading ? "Loading…" : "Refresh"}</button>
        </div>
      </header>

      {/* ── Trending strip (positive momentum across any window) ── */}
      {trending.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-gray-800 bg-gray-950 shrink-0 overflow-x-auto scrollbar-none">
          <span className="text-xs font-bold text-green-400 shrink-0 mr-1 tracking-wide">TRENDING ↑</span>
          {trending.map((w) => (
            <button
              key={w.word}
              onClick={() => setSelectedWord(w)}
              className="shrink-0 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-green-800 transition-colors"
            >
              <span className="text-xs text-white font-semibold">{w.word.toUpperCase()}</span>
              <span className="text-xs text-green-400 font-bold">
                {(() => {
                  const prev = w.count - w.momentum;
                  return prev > 0 ? `+${Math.round((w.momentum / prev) * 100)}%` : "NEW";
                })()}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">
        <div ref={treemapContainerRef} className={`flex-1 min-w-0 p-2 ${panelOpen ? "lg:pr-1" : ""}`}>
          {error && <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-900 text-red-200 text-sm px-4 py-2 rounded shadow-lg z-10">{error}</div>}

          {words.length === 0 && !loading && (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">No data yet — click Refresh to load headlines.</div>
          )}

          {words.length === 0 && loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-block w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin mb-3" />
                <p className="text-gray-400 text-sm">Fetching headlines from 49 sources…</p>
              </div>
            </div>
          )}

          {words.length > 0 && (
            <Treemap words={words} selectedWord={selectedWord?.word ?? null} onSelect={setSelectedWord} grouped={grouped} />
          )}
        </div>

        {panelOpen && (
          <div className="w-full lg:w-80 xl:w-96 shrink-0 border-t lg:border-t-0 lg:border-l border-gray-800 max-h-full overflow-hidden">
            <DetailPanel word={selectedWord} onClose={() => setSelectedWord(null)} />
          </div>
        )}
      </div>

      {showSources && <SourcesModal onClose={() => setShowSources(false)} />}
    </div>
  );
}
