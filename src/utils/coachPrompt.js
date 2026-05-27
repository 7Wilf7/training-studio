// AI Coach prompt assembly helpers — extracted from AICoachTab so they can
// be called from the lifted sendChat/importToCalendar in AppShell. None of
// these touch React; they're pure data → string transforms.

import { SPARTAN_SUBTYPES } from "../constants";
import { formatDuration, formatPaceFromSec } from "./format";

// Locale-aware headers for the dynamic data block (current date / target races /
// race history / recent activities). Numbers + race names stay as-is — only the
// section titles + the priority label change. The "en" version is canonical
// (LLM-facing); "zh" is for the in-app preview only.
export const DATA_LABELS = {
  en: {
    currentDate: "[Current Date]",
    targets: "[Target Races]",
    history: "[Race History]",
    recent: "[Recent Activities (last 10)]",
    none: "None",
    priorityTag: (p) => `[Priority ${p}]`,
  },
  zh: {
    currentDate: "[当前时间]",
    targets: "[目标比赛]",
    history: "[比赛历史]",
    recent: "[近期活动（最近 10 条）]",
    none: "无",
    priorityTag: (p) => `[${p} 级目标]`,
  },
};

// Local time formatter — explicit per-component build, locale-independent.
// `now.toISOString()` returns UTC, which mislabels as GMT+8 in the data
// block; this returns the user's wall-clock time as "YYYY-MM-DD HH:MM".
export function formatLocalDateTime(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Difficulty rank for Spartan subtypes — higher = harder.
const SPARTAN_RANK = SPARTAN_SUBTYPES.reduce((acc, name, i) => {
  acc[name] = i + 1;
  return acc;
}, {});

// Pick a representative subset of history races to send to the coach.
// Per category:
//   • 10K / HM / Marathon / Hyrox / Other / Uncategorized → latest 3 by date
//   • Trail   → latest 3 + longest by distance (if not already in the 3)
//   • Spartan → latest 3 + toughest by subtype rank (if not already in the 3)
// Goal: keep the prompt focused on recent form, while always anchoring trail
// and Spartan signal with the user's peak performance for each.
export function selectHistoryForPrompt(historyRaces) {
  const groups = {};
  for (const r of historyRaces) {
    const cat = r.category || "Uncategorized";
    (groups[cat] = groups[cat] || []).push(r);
  }
  const picked = new Set();
  for (const [cat, group] of Object.entries(groups)) {
    const byDate = [...group].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    byDate.slice(0, 3).forEach(r => picked.add(r.id));
    if (cat === "Trail") {
      const longest = [...group].filter(r => r.distance > 0)
        .sort((a, b) => b.distance - a.distance)[0];
      if (longest) picked.add(longest.id);
    } else if (cat === "Spartan") {
      const toughest = [...group].filter(r => SPARTAN_RANK[r.subtype])
        .sort((a, b) => SPARTAN_RANK[b.subtype] - SPARTAN_RANK[a.subtype])[0];
      if (toughest) picked.add(toughest.id);
    }
  }
  return historyRaces
    .filter(r => picked.has(r.id))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

// Format a race finish time as H:MM:SS (h unpadded; m/s padded). Returns ""
// when no time recorded so callers can omit the "→ time" suffix.
export function formatRaceTime(r) {
  if (![r.resultH, r.resultM, r.resultS].some(Boolean)) return "";
  return `${r.resultH || "0"}:${String(r.resultM || "0").padStart(2, "0")}:${String(r.resultS || "0").padStart(2, "0")}`;
}

// Build the category tag for a race entry. Spartan includes its tier
// (Sprint/Super/Beast/Ultra) inline so the LLM doesn't have to guess.
export function categoryTagFor(r, brackets = "[]") {
  if (!r.category) return "";
  const inside = r.category === "Spartan" && r.subtype ? `${r.category} ${r.subtype}` : r.category;
  return `${brackets[0]}${inside}${brackets[1]}`;
}

// Target race line — no more "goal: X" (targets don't capture a finish time).
// Priority is spelled out ("Priority A" / "A 级目标") so the LLM doesn't have
// to infer the meaning of a bare `[A]`. Distance + ascent carry units.
export function formatTargetRace(r, lang) {
  const L_ = DATA_LABELS[lang] || DATA_LABELS.en;
  const priority = r.priority ? L_.priorityTag(r.priority) : "";
  const catTag = categoryTagFor(r, "()");
  const dateStr = r.date ? `on ${r.date}` : "";
  const metrics = [];
  if (r.distance > 0) metrics.push(`${r.distance} km`);
  if (r.ascent && parseInt(r.ascent) > 0) metrics.push(`+${r.ascent} m`);
  const metricStr = metrics.length ? `(${metrics.join(", ")})` : "";
  return [priority, r.name, catTag, dateStr, metricStr].filter(Boolean).join(" ");
}

// History race line — only emit metrics that are meaningful for the category:
//   Trail   → distance + ascent (the defining metrics)
//   Spartan → tier inline with category tag
//   Road / Hyrox / Other → distance is implicit in the category, so just time
// "→ time" appended only when a finish time was recorded.
export function formatHistoryRace(r) {
  const parts = [r.date, r.name, categoryTagFor(r, "[]")].filter(Boolean);
  if (r.category === "Trail") {
    const metrics = [];
    if (r.distance > 0) metrics.push(`${r.distance} km`);
    if (r.ascent && parseInt(r.ascent) > 0) metrics.push(`+${r.ascent} m`);
    if (metrics.length) parts.push(metrics.join(", "));
  }
  let line = parts.join(" ");
  const t = formatRaceTime(r);
  if (t) line += ` → ${t}`;
  if (r.itraScore) line += ` ITRA ${r.itraScore}`;
  return line;
}

// Dynamic data block injected into the system prompt. Only the section titles
// are localized; values (dates, race names, numbers) stay verbatim across
// languages so the model receives consistent data.
export function buildDataBlock({ logs, races, now, lang = "en" }) {
  const D = DATA_LABELS[lang] || DATA_LABELS.en;
  // Strip future-planned entries — the LLM should only see what actually
  // happened. Planned rows would otherwise be misread as "recent activity"
  // (e.g. "your last run was 10km" when the user hasn't run it yet).
  const recentLogs = logs.filter(l => !l.isPlanned).slice(0, 10).map(l =>
    `${l.date} ${l.type}${l.subTypes.length ? "(" + l.subTypes.join(",") + ")" : ""} ${l.distance > 0 ? l.distance + "km" : ""} ${formatDuration(l.duration)}${l.pace ? " " + formatPaceFromSec(l.pace) + "/km" : ""}${l.hr ? " HR" + l.hr : ""}${l.maxHR ? "/" + l.maxHR : ""}${l.ascent ? " +" + l.ascent + "m" : ""}${l.cadence ? " cad" + l.cadence : ""}${l.aerobicTE ? " TE" + l.aerobicTE : ""}${l.gap ? " GAP" + formatPaceFromSec(l.gap) : ""}`
  ).join("\n");
  const targetRaces = races.filter(r => r.isTarget)
    .map(r => formatTargetRace(r, lang)).join("\n") || D.none;
  const historyRaces = selectHistoryForPrompt(races.filter(r => !r.isTarget))
    .map(formatHistoryRace).join("\n") || D.none;

  return `${D.currentDate} ${formatLocalDateTime(now)} GMT+8

${D.targets}
${targetRaces}

${D.history}
${historyRaces}

${D.recent}
${recentLogs}`;
}

// Tolerant JSON-array extraction from a coach reply. The LLM may wrap its
// output in markdown fences, prefix it with commentary, or even return a
// plain object — we try a few peelings before giving up.
export function parsePlansFromLLM(text) {
  if (!text) return [];
  let cleaned = text.trim();
  // Strip ```json … ``` or ``` … ``` fences if present.
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* fall through */ }
  // Last resort — find the FIRST `[ … ]` substring and try that.
  const m = cleaned.match(/\[[\s\S]*\]/);
  if (m) {
    try {
      const parsed = JSON.parse(m[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* give up */ }
  }
  return [];
}
