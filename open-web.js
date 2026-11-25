// The open agentic web, as a sky: every site on the Open Agentic Web Challenge's list of agentic websites
// (docs/agentic_websites.md in cognizant-ai-labs/agentic-web), read from this browser just now. For each one:
// whether its agent-manifest.json can be read from another site (which is how another site's agents find it
// and call it), what it says can be called there, and which other sites on the list it says it calls (its
// allowed_peers). Those last are the ties between the stars. Nothing is kept anywhere; nothing is sent but
// the reads. Any agent can ask for the same through the page's open_web_sky tool.
// Concept, aesthetics and layout: Helen AphroIcy.


export const LIST_RAW = "https://raw.githubusercontent.com/cognizant-ai-labs/agentic-web/main/docs/agentic_websites.md";
export const LIST_PAGE = "https://github.com/cognizant-ai-labs/agentic-web/blob/main/docs/agentic_websites.md";
const MAX = 40;
const cut = (s, n) => (String(s || "").length > n ? String(s).slice(0, n - 1) + "…" : String(s || ""));
// the list's cells are markdown: links, code and emphasis are read as their plain words
const plain = (s) => String(s || "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*_]/g, "").replace(/\s+/g, " ").trim();
const linkOf = (s) => (String(s || "").match(/\((https?:\/\/[^)\s]+)\)/) || String(s || "").match(/(https?:\/\/\S+)/) || [])[1] || "";
// the same site, however its address is written: origin and path, without a trailing slash or a file at the end
export const siteKey = (u) => { try { const x = new URL(u); return (x.origin + x.pathname).replace(/\/[^/]*\.(json|html?)$/i, "").replace(/\/+$/, "").toLowerCase(); } catch { return ""; } };

/**
 * The rows of the list's table.
 *
 * :param md: The markdown of docs/agentic_websites.md.
 * :return: [{url, name, description, team, agent}], in the list's order, at most 40.
 */
export function parseList(md) {
  const rows = [];
  for (const line of String(md || "").split("\n")) {
    const t = line.trim();
    if (!t.startsWith("|") || /^\|\s*-/.test(t) || /^\|\s*URL\s*\|/i.test(t)) continue;
    const cells = t.replace(/^\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());
    if (cells.length < 5) continue;
    const url = linkOf(cells[0]) || plain(cells[0]);
    if (!/^https:\/\//.test(url)) continue;
    // a description may itself hold a "|": the cells between the name and the last two are all its words
    const desc = cells.slice(2, cells.length - 2).join(" | ");
    rows.push({ url, name: cut(plain(cells[1]), 60) || new URL(url).host, description: cut(plain(desc), 400), team: cut(plain(cells[cells.length - 2]).replace(/^-$/, ""), 60), agent: linkOf(cells[cells.length - 1]) });
    if (rows.length >= MAX) break;
  }
  return rows;
}

/** A site's agent card, from its published manifest; its words are its own claims. */
export async function cardOf(base, fetchImpl = fetch) {
  const url = base.replace(/\/$/, "") + "/agent-manifest.json";
  const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), 6000) : 0;
  try {
    const res = await fetchImpl(url, { credentials: "omit", signal: ctl?.signal });
    if (!res.ok) return { base, ok: false, reason: `manifest answered ${res.status}` };
    const m = await res.json();
    return {
      base: base.replace(/\/$/, ""),
      ok: true,
      brand: cut(m.brand, 60),
      networks: (m.networks || []).slice(0, 4).map((n) => ({ name: cut(n.name, 60), description: cut(n.description, 300), tags: (n.tags || []).slice(0, 12).map((t) => cut(t, 40)), samples: (n.sample_queries || []).slice(0, 6).map((q) => cut(q, 160)),
        // where its network definition can be read, as the manifest gives it (relative to the site)
        file: (() => { try { return typeof n.hocon === "string" ? new URL(n.hocon, base.replace(/\/$/, "") + "/").href : null; } catch { return null; } })() })),
      tools: (m.actions?.agentTools || []).slice(0, 12).map((t) => cut(t, 60)),
      peers: m.peer_policy?.mode === "open" ? "open" : "closed",
      // the other sites it says it calls (its allowed_peers): how the open web is tied together
      asks: (Array.isArray(m.allowed_peers) ? m.allowed_peers : []).slice(0, 24).map((p) => cut(p, 200)),
    };
  } catch (err) {
    return { base, ok: false, reason: err?.name === "AbortError" ? "no answer in 6 seconds" : "could not be read (it may not allow cross-site reads)" };
  } finally {
    clearTimeout(timer);
  }
}

let kept = null;   // {at, result}: read again after ten minutes

/**
 * Read the open agentic web now: the list, then each site's manifest, side by side.
 *
 * :param args: {fresh}: true to read again even if a reading under ten minutes old is kept.
 * :param opts: {fetchImpl, self (this site's base), onList(rows): the list as read, onSite(site): each site as its manifest answers, now}.
 * :return: {ok, type, checked, total, readable, ties, sites: [{name, url, team, description, readable, ms, networks, tools, asks, askedBy, reason}], here, sources, note}.
 */
export async function readOpenWeb({ fresh = false } = {}, { fetchImpl = fetch, self = new URL("./", import.meta.url).href, onList = null, onSite = null, now = () => Date.now() } = {}) {
  if (!fresh && kept && now() - kept.at < 10 * 60e3 && !onSite) return kept.result;
  let list = [], listOk = true;
  try {
    const r = await withTimeout(fetchImpl, LIST_RAW, 8000);
    if (!r.ok) throw new Error(String(r.status));
    list = parseList(await r.text());
    if (!list.length) throw new Error("empty");
  } catch {
    // the list could not be read: the sites this page already knows from it (agent-directory.json) stand in
    listOk = false;
    try {
      const d = await (await withTimeout(fetchImpl, new URL("agent-directory.json", self).href, 6000)).json();
      list = (d.sites || []).filter((s) => s.from === "agentic_websites.md").map((s) => ({ url: s.base, name: new URL(s.base).host, description: "", team: "", agent: "" }));
    } catch { list = []; }
  }
  const here = siteKey(self);
  onList?.(list);
  const sites = await Promise.all(list.map(async (e, i) => {
    const t0 = now();
    const c = await cardOf(e.url.replace(/\/+$/, ""), fetchImpl);
    const s = {
      name: e.name, url: e.url, team: e.team, description: e.description, agent: e.agent,
      readable: !!c.ok, ms: c.ok ? Math.max(1, Math.round(now() - t0)) : null,
      networks: c.ok ? c.networks.map((n) => n.name).filter(Boolean) : [],
      tools: c.ok ? c.tools : [],
      calls: c.ok ? (c.asks || []) : [],
      ...(c.ok ? {} : { reason: c.reason }),
      here: siteKey(e.url) === here,
      i,
    };
    onSite?.(s);
    return s;
  }));
  // the ties: a site that names another site on the list among the peers it calls. A peer named by its origin
  // alone allows every site on that origin; one named deeper than a listed address is that site.
  const byKey = new Map(sites.map((s) => [siteKey(s.url), s]));
  const findAll = (p) => {
    const k = siteKey(p);
    if (!k) return [];
    if (byKey.has(k)) return [byKey.get(k)];
    const under = sites.filter((s) => siteKey(s.url).startsWith(k + "/"));
    return under.length ? under : sites.filter((s) => k.startsWith(siteKey(s.url) + "/"));
  };
  const ties = [];
  for (const s of sites) {
    s.asks = [];
    for (const p of s.calls) for (const t of findAll(p)) if (t !== s && !s.asks.includes(t.name)) { s.asks.push(t.name); ties.push({ from: s.url, to: t.url }); }
    delete s.calls;
  }
  for (const s of sites) s.askedBy = sites.filter((o) => o.asks.includes(s.name)).map((o) => o.name);
  const result = {
    ok: sites.length > 0,
    type: "holovessel.open-web-sky/v1",
    checked: new Date(now()).toISOString(),
    total: sites.length,
    readable: sites.filter((s) => s.readable).length,
    ties: ties.length,
    tiesList: ties,
    sites,
    listRead: listOk,
    sources: [
      { mark: "●", name: "Open Agentic Web Challenge: docs/agentic_websites.md", link: LIST_PAGE },
      { mark: "○", name: "Each site's own agent-manifest.json, read just now from this browser" },
    ],
    note: (listOk ? "" : "The list could not be read just now; these are the sites from it that Holovessel already knew. ")
      + "Readable means another site can read the site's agent-manifest.json across origins, which is how agents find it. Descriptions are each site's own words (○). Ties are the peers each site names in its allowed_peers.",
  };
  kept = { at: now(), result };
  return result;
}

function withTimeout(fetchImpl, url, ms) {
  const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), ms) : 0;
  return fetchImpl(url, { credentials: "omit", cache: "no-store", signal: ctl?.signal }).finally(() => clearTimeout(timer));
}

/** The tool as agents see it (front agent and WebMCP). */
export const OPEN_WEB_SKY = {
  name: "open_web_sky",
  description: "Every site on the Open Agentic Web Challenge's list, read now: its own description, whether other sites can read its agent-manifest.json, what it says can be called, and which listed sites it calls or is called by. Changes nothing.",
  effect: "read",
  inputSchema: { type: "object", additionalProperties: false, properties: { fresh: { type: "boolean", description: "Read again now." } } },
};
