"use client";

import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import type { WordData } from "@/lib/types";

interface Props {
  words: WordData[];
  selectedWord: string | null;
  onSelect: (word: WordData) => void;
  grouped: boolean;
}

// A generic tree node used for D3 hierarchy in both modes
interface TreeNode {
  name?: string;       // category label (branch nodes only)
  wordData?: WordData; // word payload (leaf nodes only)
  children?: TreeNode[];
}

// Category header height in grouped mode
const CAT_HEADER = 20;

// Category display order (controls render priority)
const CATEGORY_ORDER = [
  "Global News",
  "Technology",
  "Business & Markets",
  "Science & Space",
  "Research",
  "Security",
  "Culture",
];

// Subtle distinct background tints per category (dark, not distracting)
const CATEGORY_BG: Record<string, string> = {
  "Global News":        "#0c1322",
  "Technology":         "#0c1a0c",
  "Business & Markets": "#1a120c",
  "Science & Space":    "#0c1622",
  "Research":           "#150c1a",
  "Security":           "#1a0c0c",
  "Culture":            "#161006",
};

function getMomentumColor(momentum: number, count: number): string {
  if (momentum === 0) return "#4b5563";
  const intensity = Math.min(Math.abs(momentum) / Math.max(count * 0.5, 1), 1);
  if (momentum > 0) return d3.interpolateRgb("#1f6b3b", "#22c55e")(intensity);
  // Softer red ceiling — #dc2626 instead of full #ef4444, scaled to 80% max intensity
  return d3.interpolateRgb("#7f1d1d", "#dc2626")(intensity * 0.8);
}

export default function Treemap({ words, selectedWord, onSelect, grouped }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const render = useCallback(() => {
    const container = containerRef.current;
    const svg = svgRef.current;
    if (!container || !svg || words.length === 0) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    d3.select(svg).selectAll("*").remove();
    d3.select(svg).attr("width", width).attr("height", height);

    // ── Build hierarchy ──────────────────────────────────────────────────────
    let treeData: TreeNode;

    if (grouped) {
      // Group words by their dominant category
      const catMap = new Map<string, WordData[]>();
      for (const word of words) {
        const arr = catMap.get(word.category) ?? [];
        arr.push(word);
        catMap.set(word.category, arr);
      }
      // Sort categories by predefined order, then by total count
      const categories = CATEGORY_ORDER
        .filter((c) => catMap.has(c))
        .map((name) => ({ name, words: catMap.get(name)! }));
      // Append any categories not in predefined order
      catMap.forEach((ws, name) => {
        if (!CATEGORY_ORDER.includes(name)) categories.push({ name, words: ws });
      });

      treeData = {
        children: categories.map((cat) => ({
          name: cat.name,
          children: cat.words.map((w) => ({ wordData: w })),
        })),
      };
    } else {
      treeData = { children: words.map((w) => ({ wordData: w })) };
    }

    const root = d3
      .hierarchy<TreeNode>(treeData)
      .sum((d) => d.wordData?.count ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    const layout = d3
      .treemap<TreeNode>()
      .size([width, height])
      .paddingOuter(grouped ? 4 : 3)
      .paddingInner(grouped ? 1 : 2)
      .paddingTop(grouped ? CAT_HEADER : 2)
      .round(true);

    layout(root);

    // ── ClipPath per tile (prevents text bleeding past tile edges) ───────────
    const uid   = Math.random().toString(36).slice(2);
    const defs  = d3.select(svg).append("defs");
    const leafNodes = root.leaves() as d3.HierarchyRectangularNode<TreeNode>[];
    leafNodes.forEach((d, i) => {
      defs.append("clipPath")
        .attr("id", `tc-${uid}-${i}`)
        .append("rect")
        .attr("width",  Math.max(0, d.x1 - d.x0))
        .attr("height", Math.max(0, d.y1 - d.y0))
        .attr("rx", 3);
    });

    const g = d3.select(svg).append("g");

    // ── Grouped mode: render category backgrounds + labels ───────────────────
    if (grouped) {
      const catNodes = root.descendants().filter(
        (d) => d.depth === 1
      ) as d3.HierarchyRectangularNode<TreeNode>[];

      // Category background rects
      g.selectAll<SVGRectElement, d3.HierarchyRectangularNode<TreeNode>>(".cat-bg")
        .data(catNodes)
        .join("rect")
        .attr("class", "cat-bg")
        .attr("x", (d) => d.x0)
        .attr("y", (d) => d.y0)
        .attr("width", (d) => d.x1 - d.x0)
        .attr("height", (d) => d.y1 - d.y0)
        .attr("fill", (d) => CATEGORY_BG[d.data.name ?? ""] ?? "#0f172a")
        .attr("rx", 4);

      // Category header labels
      g.selectAll<SVGTextElement, d3.HierarchyRectangularNode<TreeNode>>(".cat-label")
        .data(catNodes.filter((d) => d.x1 - d.x0 > 60))
        .join("text")
        .attr("class", "cat-label")
        .attr("x", (d) => d.x0 + 6)
        .attr("y", (d) => d.y0 + CAT_HEADER / 2 + 1)
        .attr("dominant-baseline", "middle")
        .attr("fill", "#cbd5e1")
        .attr("font-size", "13px")
        .attr("font-weight", "700")
        .attr("letter-spacing", "0.04em")
        .attr("font-family", "system-ui, sans-serif")
        .style("pointer-events", "none")
        .text((d) => (d.data.name ?? "").toUpperCase());
    }

    // ── Leaf tiles (words) ────────────────────────────────────────────────────
    const leaves = leafNodes;

    const cellWidth  = (d: d3.HierarchyRectangularNode<TreeNode>) => d.x1 - d.x0;
    const cellHeight = (d: d3.HierarchyRectangularNode<TreeNode>) => d.y1 - d.y0;

    const cell = g
      .selectAll<SVGGElement, d3.HierarchyRectangularNode<TreeNode>>("g.tile")
      .data(leaves)
      .join("g")
      .attr("class", "tile")
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`)
      .attr("clip-path", (_, i) => `url(#tc-${uid}-${i})`)
      .style("cursor", "pointer")
      .on("click", (_, d) => { if (d.data.wordData) onSelect(d.data.wordData); });

    // Background rect
    cell
      .append("rect")
      .attr("width",  (d) => Math.max(0, cellWidth(d)))
      .attr("height", (d) => Math.max(0, cellHeight(d)))
      .attr("fill",   (d) => getMomentumColor(
        d.data.wordData?.momentum ?? 0,
        d.data.wordData?.count    ?? 1,
      ))
      .attr("rx", 3)
      .attr("stroke",       (d) => (d.data.wordData?.word === selectedWord ? "#fff" : "transparent"))
      .attr("stroke-width", 2)
      .style("transition", "filter 0.15s ease")
      .on("mouseenter", function () { d3.select(this).style("filter", "brightness(1.25)"); })
      .on("mouseleave", function () { d3.select(this).style("filter", "brightness(1)"); });

    // Word label (always when tile is wide enough)
    const hasTwoLines = (d: d3.HierarchyRectangularNode<TreeNode>) =>
      cellWidth(d) > 55 && cellHeight(d) > 56;

    // Truncate text so it fits reasonably in a narrow tile
    const labelText = (d: d3.HierarchyRectangularNode<TreeNode>) => {
      const word = (d.data.wordData?.word ?? "").toUpperCase();
      const w = cellWidth(d);
      // Bigrams on narrow tiles: shorten to first word only
      if (word.includes(" ") && w < 80) return word.split(" ")[0];
      return word;
    };

    const labelFontSize = (d: d3.HierarchyRectangularNode<TreeNode>) => {
      const w  = cellWidth(d);
      const h  = cellHeight(d);
      const area = w * h;
      const isBigram = (d.data.wordData?.word ?? "").includes(" ");
      if (area > 20000) return isBigram ? "14px" : "17px";
      if (area > 8000)  return isBigram ? "11px" : "13px";
      if (area > 3000)  return "10px";
      return "9px";
    };

    cell
      .filter((d) => cellWidth(d) > 30 && cellHeight(d) > 18)
      .append("text")
      .attr("x", (d) => cellWidth(d) / 2)
      .attr("y", (d) => hasTwoLines(d) ? cellHeight(d) / 2 - 9 : cellHeight(d) / 2)
      .attr("text-anchor",      "middle")
      .attr("dominant-baseline","middle")
      .attr("fill",        "white")
      .attr("font-weight", "700")
      .attr("font-family", "system-ui, sans-serif")
      .attr("font-size",   labelFontSize)
      .style("pointer-events", "none")
      .text(labelText);

    // "N sources" sub-label
    cell
      .filter((d) => hasTwoLines(d))
      .append("text")
      .attr("x", (d) => cellWidth(d) / 2)
      .attr("y", (d) => cellHeight(d) / 2 + 11)
      .attr("text-anchor",      "middle")
      .attr("dominant-baseline","middle")
      .attr("fill",       "rgba(255,255,255,0.55)")
      .attr("font-size",  "10px")
      .attr("font-family","system-ui, sans-serif")
      .style("pointer-events", "none")
      .text((d) => {
        const c = d.data.wordData?.count ?? 0;
        const w = cellWidth(d);
        return w >= 90 ? `${c} sources` : `${c} src`;
      });
    // ── Sparkline on hover ────────────────────────────────────────────────────
    // Only drawn dynamically on mouseenter; removed on mouseleave.
    cell
      .on("mouseenter.sparkline", function (_, d) {
        const wData = d.data.wordData;
        const history = wData?.history;
        if (!history || history.length < 3) return;
        const w = cellWidth(d);
        const h = cellHeight(d);
        if (w < 55 || h < 50) return;

        const SPARK_H = Math.min(24, h * 0.28);
        const SPARK_Y = h - SPARK_H - 2;

        const xScale = d3.scaleLinear().domain([0, history.length - 1]).range([3, w - 3]);
        const maxVal  = Math.max(...history, 1);
        const yScale  = d3.scaleLinear().domain([0, maxVal]).range([SPARK_H - 1, 1]);
        const lineGen = d3.line<number>()
          .x((_, i) => xScale(i))
          .y((v)    => yScale(v))
          .curve(d3.curveCatmullRom);

        const grp = d3.select<SVGGElement, unknown>(this as SVGGElement);

        // Semi-transparent background strip
        grp.append("rect")
          .attr("class", "spark-bg")
          .attr("x", 0).attr("y", SPARK_Y)
          .attr("width", w).attr("height", SPARK_H + 2)
          .attr("fill", "rgba(0,0,0,0.45)")
          .style("pointer-events", "none");

        // Sparkline path
        const pathD = lineGen(history);
        if (pathD) {
          grp.append("path")
            .attr("class", "spark-line")
            .attr("d", pathD)
            .attr("transform", `translate(0,${SPARK_Y})`)
            .attr("fill", "none")
            .attr("stroke-width", 1.5)
            .attr("stroke-linecap", "round")
            .attr("stroke", wData!.momentum > 0 ? "#4ade80" : wData!.momentum < 0 ? "#f87171" : "#94a3b8")
            .style("pointer-events", "none");
        }
      })
      .on("mouseleave.sparkline", function () {
        d3.select(this as SVGGElement).selectAll(".spark-bg, .spark-line").remove();
      });
  }, [words, selectedWord, onSelect, grouped]);

  useEffect(() => { render(); }, [render]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => render());
    observer.observe(container);
    return () => observer.disconnect();
  }, [render]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
