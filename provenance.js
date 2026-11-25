// Where an answer's facts come from, in one shape for every tool, wherever the tool keeps its sources.
// Each tool still answers with its own source or sources fields; provenance gathers them into a list:
//   { mark, kind, name, link, licence? }
// mark ◆ calculated here (anyone can run it again), ● read from a named source, ○ someone's claim or forecast.
// Concept, aesthetics and layout: Helen AphroIcy.

export const MARKS = Object.freeze({ "◆": "calculated", "●": "sourced", "○": "claimed" });
export const PROVENANCE_NOTE = "provenance: every source this answer used, one shape for every tool. mark ◆ calculated here, ● read from a named source, ○ someone's claim or forecast; kind says the same in a word.";

const text = (v) => (typeof v === "string" ? v : v && typeof v === "object" ? (v.en || v.zh || "") : "");
const linkOf = (s) => s.link || s.url || (s.doi ? `https://doi.org/${s.doi}` : "");

/** One source in the shared shape, or null when it has no name. */
export function sourceOf(s) {
  if (!s || typeof s !== "object") return null;
  const name = text(s.name) || text(s.title);
  if (!name) return null;
  const out = { mark: s.mark || null, kind: MARKS[s.mark] || null, name, link: linkOf(s) || null };
  if (s.licence || s.license) out.licence = s.licence || s.license;
  if (s.about) out.about = text(s.about);
  return out;
}

/**
 * Every source in an answer, gathered from its source and sources fields at any depth (a planet's metal,
 * each plate of the old skies), once each.
 * :param out: A tool's answer.
 * :return: The list, at most max long.
 */
export function provenanceOf(out, { max = 24 } = {}) {
  const seen = new Map();
  const take = (s) => { const p = sourceOf(s); if (!p) return; const k = `${p.link}|${p.name}`; if (!seen.has(k)) seen.set(k, p); };
  const walk = (v, depth) => {
    if (!v || typeof v !== "object" || depth > 5) return;
    if (Array.isArray(v)) { for (const x of v) walk(x, depth + 1); return; }
    for (const [k, x] of Object.entries(v)) {
      if (k === "provenance" || k === "contacted") continue;
      if (k === "source" || k === "sources") {
        if (Array.isArray(x)) x.forEach(take);
        else if (x && typeof x === "object" && (x.name || x.title)) take(x);
        else if (x && typeof x === "object") Object.values(x).forEach(take);   // a map of sources, as the full moons keep them
      } else walk(x, depth + 1);
    }
  };
  walk(out, 0);
  return [...seen.values()].slice(0, max);
}

/**
 * What is wrong with a provenance list: an entry with no mark, a mark that is not one of the three, no name,
 * or a link that is not http(s). An answer that states facts and names no source at all is also wrong.
 * :return: The problems, in words; empty when there are none.
 */
export function checkProvenance(list, { needed = true } = {}) {
  const bad = [];
  if (!Array.isArray(list)) return ["provenance is not a list"];
  if (needed && !list.length) bad.push("no source named");
  for (const p of list) {
    if (!MARKS[p.mark]) bad.push(`${p.name || "a source"}: mark ${p.mark == null ? "missing" : JSON.stringify(p.mark)}`);
    else if (p.kind !== MARKS[p.mark]) bad.push(`${p.name}: kind does not match its mark`);
    if (!p.name) bad.push("a source with no name");
    if (p.link && !/^https?:\/\//.test(p.link)) bad.push(`${p.name}: link is not http(s)`);
  }
  return bad;
}
