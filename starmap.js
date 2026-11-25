// Star maps: one question as a small program that can be carried away and brought back.
// A map records what a question actually did: which stars were asked, with what, what came back (◆●○),
// and what stayed with the visitor. Brought back, its tool steps run again on today's data, and each
// says whether it changed. Other agents may write their own maps and have Holovessel run them.
// Concept, aesthetics and layout: Helen AphroIcy.
//
// {
//   "type": "holovessel.starmap/v1",
//   "question": "…", "asked": "2026-11-23T04:10:00Z", "lang": "zh",
//   "steps": [
//     { "kind": "tool", "tool": "search_collection", "args": {"mineral": "Fluorite", "place": "Rogerley"},
//       "summary": "9 specimens", "digest": "…" },
//     { "kind": "partner", "site": "https://isaro.aphrogenes.com", "request": "…", "decision": "allow" }
//   ],
//   "answer": "…", "kept": ["key", "place", "past star maps"], "again": "on-return"
// }

export const STARMAP_TYPE = "holovessel.starmap/v1";
export const MAX_STEPS = 8;
// the steps a map may run: read-only tools, here or through the MCP door
export const RUNNABLE = ["search_collection", "noon_sun", "sky_now", "full_moons", "planet_now", "solar_terms", "stargazing_nights", "sky_names", "sky_traditions", "deep_space_now", "site_facts"];

/* ---------- what a result says, in one line, and what to compare ---------- */
const n = (x) => (Number.isFinite(x) ? x : null);
// what matters in each tool's result: a run compares these, not the whole answer
const KEY = {
  search_collection: (r) => ({ total: r.total, ids: (r.specimens || r.records || []).map((s) => s.catalogue || s.catalogNumber || s.id).filter(Boolean).slice(0, 20) }),
  noon_sun: (r) => ({ days: (r.days || r.results || []).map((x) => [x.date, x.altitude]) }),
  sky_now: (r) => ({ moon: [r.moon?.sign, r.moon?.illuminated], sun: r.sun?.sign }),
  full_moons: (r) => ({ moons: (r.moons || []).map((x) => [x.date, x.name?.en, x.blue, x.eclipse]) }),
  planet_now: (r) => ({ sign: r.sign, retro: r.retrograde }),
  solar_terms: (r) => ({ now: r.now?.en, next: r.next?.map((x) => [x.en, x.utc]) }),
  stargazing_nights: (r) => (r.mode === "aurora towns" ? { best: r.best } : { best: r.best, nights: (r.nights || []).map((x) => [x.date, x.score]) }),
  sky_names: (r) => ({ cultures: (r.readings || []).map((x) => x.culture) }),
  sky_traditions: (r) => ({ ids: (r.plates || []).map((p) => p.id) }),
  deep_space_now: (r) => ({ craft: [...new Set((r.links || []).map((x) => x.spacecraft))].sort() }),
  site_facts: (r) => ({ sources: (r.sources || []).length }),
};
const SIGN_ZH = { Aries: "白羊座", Taurus: "金牛座", Gemini: "双子座", Cancer: "巨蟹座", Leo: "狮子座", Virgo: "处女座", Libra: "天秤座", Scorpio: "天蝎座", Sagittarius: "射手座", Capricorn: "摩羯座", Aquarius: "水瓶座", Pisces: "双鱼座" };
const PHASE_ZH = { "new moon": "新月", "waxing crescent": "娥眉月", "first quarter": "上弦月", "waxing gibbous": "盈凸月", "full moon": "满月", "waning gibbous": "亏凸月", "last quarter": "下弦月", "waning crescent": "残月" };
export const BODY_NAME = { sun: ["太阳", "The Sun"], moon: ["月亮", "The Moon"], mercury: ["水星", "Mercury"], venus: ["金星", "Venus"], mars: ["火星", "Mars"], jupiter: ["木星", "Jupiter"], saturn: ["土星", "Saturn"] };
const s_ = (k, one, many) => `${k} ${k === 1 ? one : many}`;

/** One short line about a result, in the map's language (zh lines carry no spaces around numbers). */
export function speak(tool, r, zh = false) {
  if (!r || r.ok === false) return r?.reason || (zh ? "没有读到" : "Nothing read");
  switch (tool) {
    case "search_collection": return zh ? `${r.total ?? 0}件标本` : s_(r.total ?? 0, "specimen", "specimens");
    case "noon_sun": { const hi = Math.max(...(r.days || []).map((x) => n(x.altitude) ?? -90)); return zh ? `正午最高${hi}°` : `Highest at noon ${hi}°`; }
    case "sky_now": return zh ? `月亮${PHASE_ZH[r.moon?.phase] || ""}，${r.moon?.illuminated}%亮，在${SIGN_ZH[r.moon?.sign] || ""}` : `Moon ${r.moon?.phase}, ${r.moon?.illuminated}% lit, in ${r.moon?.sign}`;
    case "full_moons": { const m = r.moons?.[0]; return !m ? "—" : zh ? `下一次：${m.name?.zh}，${m.date}` : `Next: ${m.name?.en}, ${m.date}`; }
    case "planet_now": { const b = BODY_NAME[r.body] || [r.body, r.body]; return zh ? `${b[0]}在${SIGN_ZH[r.sign] || r.sign}${r.degreeInSign}°${r.retrograde ? "，逆行" : ""}` : `${b[1]} in ${r.sign} ${r.degreeInSign}°${r.retrograde ? ", retrograde" : ""}`; }
    case "solar_terms": return zh ? `现在是${r.now?.zh}，下一个是${r.next?.[0]?.zh}` : `Now ${r.now?.en}; next ${r.next?.[0]?.en}, ${r.next?.[0]?.utc}`;
    case "stargazing_nights":
      if (r.mode === "aurora towns") return r.best ? (zh ? `今晚最好：${r.towns?.[0]?.zh || r.best}` : `Best aurora town tonight: ${r.best}`) : (zh ? "今晚各地都难见极光" : "Little aurora anywhere tonight");
      return r.best ? (zh ? `最好的一晚：${r.best}` : `Best night: ${r.best}`) : (zh ? "这几晚都不太好" : "No good night soon");
    case "sky_names": { const k = (r.readings || []).length; return zh ? `${k}片天空有它的名字` : `${s_(k, "sky names", "skies name")} it`; }
    case "sky_traditions": { const k = (r.plates || []).length; return zh ? `${k}块盘` : s_(k, "plate", "plates"); }
    case "deep_space_now": { const k = new Set((r.links || []).map((x) => x.spacecraft)).size; return zh ? `正在和${k}艘飞船通话` : `Talking to ${s_(k, "spacecraft", "spacecraft")}`; }
    case "site_facts": return zh ? "络宇是谁做的" : "Who made Holovessel";
    default: return zh ? "读到了" : "Read";
  }
}
/** One line about a result, and a stable fingerprint of what matters in it. */
export function summarize(tool, result, lang = "en") {
  if (!result || result.ok === false) return { summary: result?.reason || (lang === "zh" ? "没有读到" : "Nothing read"), digest: "x" };
  return { summary: speak(tool, result, lang === "zh"), digest: fingerprint(JSON.stringify((KEY[tool] || ((r) => r))(result))) };
}
function fingerprint(s) {   // FNV-1a, enough to say "changed" or "the same"
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}

/* ---------- checking a map someone hands over ---------- */
/** :return: {ok, map} with only what a map may hold, or {ok: false, reason}. */
export function checkMap(raw) {
  let m = raw;
  if (typeof m === "string") { try { m = JSON.parse(m); } catch { return { ok: false, reason: "Not JSON." }; } }
  if (!m || typeof m !== "object") return { ok: false, reason: "A star map is an object." };
  if (m.type && m.type !== STARMAP_TYPE) return { ok: false, reason: `type must be ${STARMAP_TYPE}` };
  const steps = Array.isArray(m.steps) ? m.steps : [];
  if (!steps.length) return { ok: false, reason: "A star map needs steps." };
  if (steps.length > MAX_STEPS) return { ok: false, reason: `At most ${MAX_STEPS} steps.` };
  const clean = steps.map((s) => {
    if (s?.kind === "partner") return { kind: "partner", site: String(s.site || "").slice(0, 200), request: String(s.request || "").slice(0, 200), decision: s.decision === "allow" ? "allow" : s.decision === "decline" ? "decline" : null };
    const tool = String(s?.tool || "").replace(/^website_/, "");
    return { kind: "tool", tool, args: s?.args && typeof s.args === "object" ? JSON.parse(JSON.stringify(s.args)) : {}, summary: s?.summary ? String(s.summary).slice(0, 200) : null, digest: s?.digest ? String(s.digest).slice(0, 20) : null };
  });
  const bad = clean.find((s) => s.kind === "tool" && !RUNNABLE.includes(s.tool));
  if (bad) return { ok: false, reason: `Not a step a map may run: ${bad.tool}. Runnable: ${RUNNABLE.join(", ")}.` };
  return { ok: true, map: { type: STARMAP_TYPE, question: String(m.question || "").slice(0, 300), asked: m.asked || null, lang: m.lang === "zh" ? "zh" : "en", steps: clean, answer: m.answer ? String(m.answer).slice(0, 600) : null, kept: Array.isArray(m.kept) ? m.kept.slice(0, 6).map(String) : [], again: m.again === "on-return" ? "on-return" : null } };
}

/* ---------- running it again ---------- */
/**
 * Run a map's tool steps on today's data, in order; partner steps are not run here (only a visitor can
 * agree to them, in their own browser).
 *
 * :param map: A checked map.
 * :param tools: {name: async (args) => result} for the runnable tools.
 * :param onStep: Optional callback (i, step) as each step starts, for the page's beads.
 * :return: {ok, ran, steps: [{i, kind, tool|site, ok, summary, was, changed}]}.
 */
export async function runMap(map, tools, onStep = () => {}) {
  const out = [];
  for (const [i, s] of map.steps.entries()) {
    onStep(i, s);
    if (s.kind === "partner") { out.push({ i, kind: "partner", site: s.site, ok: false, summary: "not run here: a partner is asked only after the visitor agrees, in their own browser" }); continue; }
    const fn = tools[s.tool];
    if (!fn) { out.push({ i, kind: "tool", tool: s.tool, ok: false, summary: "not available here" }); continue; }
    let res;
    try { res = await fn(s.args || {}); } catch (err) { res = { ok: false, reason: String(err?.message || err) }; }
    const { summary, digest } = summarize(s.tool, res, map.lang);
    out.push({ i, kind: "tool", tool: s.tool, args: s.args, ok: res?.ok !== false, summary, was: s.summary, changed: res?.ok === false || !s.digest ? null : s.digest !== digest, digest, result: res });
  }
  return { ok: true, ran: new Date().toISOString(), question: map.question, steps: out };
}

/**
 * The door's tool: run a map someone hands over (as JSON or as a #map= link) and say what changed.
 *
 * :param args: {map} or {link}.
 * :param tools: {name: async (args) => result}, the read-only tools this side can run.
 * :param page: The page a visitor opens to see the map, for the link back.
 * :return: {ok, question, ran, steps, again, note} or {ok: false, reason}.
 */
export async function runStarMapTool({ map, link } = {}, tools, page = "https://aphrogenes.com/holovessel/") {
  const got = link ? decodeMap(String(link).split("#map=").pop()) : map ? checkMap(map) : { ok: false, reason: "Give map (a holovessel.starmap/v1 object) or link (a #map= link)." };
  if (!got.ok) return got;
  const run = await runMap(got.map, tools);
  const out = { ...run, again: `${page}#map=${encodeMap(got.map)}`,
    note: "Each tool step ran again on today's data. changed: true or false against the digest the map carried; null when it carried none, or when the step could not be read this time (its reason is in summary), since that says nothing about whether its answer changed. Partner steps are not run here: a partner is asked only after the visitor agrees, in their own browser. again: the page link a visitor can open to see this map and run it themselves." };
  if (JSON.stringify(out).length > 60000) { out.steps = out.steps.map(({ result, ...s }) => s); out.trimmed = "Results left out for size; summaries kept."; }
  return out;
}

/* ---------- carrying it: a link whose map rides after the # (never sent to the server) ---------- */
const b64 = (s) => (typeof btoa === "function" ? btoa(unescape(encodeURIComponent(s))) : Buffer.from(s, "utf8").toString("base64"));
const unb64 = (s) => (typeof atob === "function" ? decodeURIComponent(escape(atob(s))) : Buffer.from(s, "base64").toString("utf8"));
export const encodeMap = (map) => b64(JSON.stringify(map)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export function decodeMap(s) {
  try { return checkMap(JSON.parse(unb64(String(s).replace(/-/g, "+").replace(/_/g, "/")))); } catch { return { ok: false, reason: "That link does not hold a star map." }; }
}
