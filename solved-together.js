// solved-together.js: which agent networks helped solve visitors' questions, and with which others. A site that
// asks other agent sites keeps, for each question a visitor says was solved, only the kind of question and which
// networks answered; it publishes the counts by network address (the one other sites call and search engines
// index). A search engine that reads such feeds from many sites can weigh what visitors found useful, next to the
// checks it runs itself. Visitors say it; nobody checks it: a feed says so, and is one signal among others.
// No dependencies: a browser, or Node 18 and later.
// From Holovessel (络宇, https://aphrogenes.com/holovessel/). Concept, aesthetics and layout of Holovessel:
// Helen AphroIcy. MIT licence.

export const SOLVED_TOGETHER = "holovessel.solved-together/v1";

const hostOf = (u) => { try { return new URL(u).host; } catch { return String(u); } };
const isUrl = (u) => { try { return /^https?:$/.test(new URL(u).protocol); } catch { return false; } };

/**
 * The records by agent network: how many questions each helped solve, on what, when last, and with which others in
 * the same answer. A network counts once per question, however many of its tools answered.
 *
 * :param records: [{t (ISO time), topic: {kind, id}, stars: [what answered]} or networks: [network URLs] instead of stars].
 * :param opts: {netOf(star): its network URL (default: the star itself), nameOf(url): a name to show (default: its host)}.
 * :return: [{url, name, solved, last, topics: [{kind, id, n}], with: [{url, n}]}], most solved first.
 */
export function tally(records = [], { netOf = (s) => s, nameOf = hostOf } = {}) {
  const rows = new Map();
  for (const r of Array.isArray(records) ? records : []) {
    if (!r?.topic) continue;
    const nets = [...new Set((Array.isArray(r.networks) ? r.networks : Array.isArray(r.stars) ? r.stars.map(netOf) : []).filter(Boolean))];
    for (const u of nets) {
      let x = rows.get(u);
      if (!x) rows.set(u, x = { url: u, name: nameOf(u) || hostOf(u), solved: 0, last: r.t || null, topics: new Map(), with: new Map() });
      x.solved += 1;
      if (r.t && (!x.last || r.t > x.last)) x.last = r.t;
      const k = `${r.topic.kind}:${r.topic.id}`;
      x.topics.set(k, (x.topics.get(k) || 0) + 1);
      for (const v of nets) if (v !== u) x.with.set(v, (x.with.get(v) || 0) + 1);
    }
  }
  return [...rows.values()].sort((a, b) => b.solved - a.solved || (a.url < b.url ? -1 : 1)).map((x) => ({
    url: x.url, name: x.name, solved: x.solved, last: x.last,
    topics: [...x.topics].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => { const i = k.indexOf(":"); return { kind: k.slice(0, i), id: k.slice(i + 1), n }; }),
    with: [...x.with].sort((a, b) => b[1] - a[1]).map(([url, n]) => ({ url, n })),
  }));
}

/** The kinds of question, most solved first. */
function topicsOf(records) {
  const m = new Map();
  for (const r of records) if (r?.topic) { const k = `${r.topic.kind}:${r.topic.id}`; m.set(k, (m.get(k) || 0) + 1); }
  return [...m].sort((a, b) => b[1] - a[1]).slice(0, 24).map(([k, n]) => { const i = k.indexOf(":"); return { kind: k.slice(0, i), id: k.slice(i + 1), n }; });
}

/**
 * The feed a site publishes.
 *
 * :param opts: {asker: {name, network (its own network URL), page?}, records, how (in words: when a record is kept,
 *   and that visitors say it), at (when it is read), netOf, nameOf}.
 * :return: {type, asker, updated, count, since, networks, topics, how}.
 */
export function feedOf({ asker, records = [], how = "", at = new Date(), netOf, nameOf } = {}) {
  const list = Array.isArray(records) ? records.filter((r) => r?.topic) : [];
  const times = list.map((r) => r.t).filter(Boolean).sort();
  return {
    type: SOLVED_TOGETHER, asker, updated: at.toISOString().slice(0, 16) + "Z",
    count: list.length, since: times[0] || null,
    networks: tally(list, { netOf, nameOf }), topics: topicsOf(list), how,
  };
}

/**
 * Check a feed's shape before weighing it.
 *
 * :param feed: What a site published.
 * :return: [problem text]: empty when it can be read.
 */
export function checkFeed(feed) {
  const out = [];
  if (!feed || typeof feed !== "object") return ["not an object"];
  if (feed.type !== SOLVED_TOGETHER) out.push(`type is not ${SOLVED_TOGETHER}`);
  if (!isUrl(feed.asker?.network)) out.push("asker.network is not a URL");
  if (!Number.isInteger(feed.count) || feed.count < 0) out.push("count is not a whole number");
  if (!Array.isArray(feed.networks)) return [...out, "networks is not a list"];
  for (const [i, x] of feed.networks.entries()) {
    if (!isUrl(x?.url)) { out.push(`networks[${i}].url is not a URL`); continue; }
    if (!Number.isInteger(x.solved) || x.solved < 0 || x.solved > feed.count) out.push(`networks[${i}].solved is not between 0 and count`);
    if (!Array.isArray(x.topics) || !Array.isArray(x.with)) out.push(`networks[${i}] lacks topics or with`);
  }
  return out;
}

/**
 * Many sites' feeds, by network: what a search engine would weigh. A network's own feed does not count for it
 * unless self is true (a site saying it was useful to itself is the weakest kind of word).
 *
 * :param feeds: Feeds as published (checkFeed is applied; a feed with problems is left out).
 * :param opts: {self}.
 * :return: [{url, name, solved, askers (how many sites said so), last, topics, with}], most solved first.
 */
export function mergeFeeds(feeds = [], { self = false } = {}) {
  const rows = new Map();
  for (const f of Array.isArray(feeds) ? feeds : []) {
    if (checkFeed(f).length) continue;
    for (const x of f.networks) {
      if (!self && x.url === f.asker.network) continue;
      let y = rows.get(x.url);
      if (!y) rows.set(x.url, y = { url: x.url, name: x.name || hostOf(x.url), solved: 0, askers: new Set(), last: null, topics: new Map(), with: new Map() });
      y.solved += x.solved;
      y.askers.add(f.asker.network);
      if (x.last && (!y.last || x.last > y.last)) y.last = x.last;
      for (const t of x.topics) { const k = `${t.kind}:${t.id}`; y.topics.set(k, (y.topics.get(k) || 0) + (t.n || 0)); }
      for (const w of x.with) y.with.set(w.url, (y.with.get(w.url) || 0) + (w.n || 0));
    }
  }
  return [...rows.values()].sort((a, b) => b.solved - a.solved || b.askers.size - a.askers.size || (a.url < b.url ? -1 : 1)).map((y) => ({
    url: y.url, name: y.name, solved: y.solved, askers: y.askers.size, last: y.last,
    topics: [...y.topics].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => { const i = k.indexOf(":"); return { kind: k.slice(0, i), id: k.slice(i + 1), n }; }),
    with: [...y.with].sort((a, b) => b[1] - a[1]).map(([url, n]) => ({ url, n })),
  }));
}
