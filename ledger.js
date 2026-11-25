// ledger.js: an append-only list that nobody has to take on trust. Each entry carries the SHA-256 of the entry
// before it, and its own over its canonical JSON, so changing or removing any entry breaks every link after it.
// Whoever keeps the list publishes it whole; anyone can check every link, apply rules of their own to every
// entry, and, holding an older head, check that a newer copy still holds it at the same place.
// No dependencies: a browser, or Node 18 and later.
// From Holovessel (络宇, https://aphrogenes.com/holovessel/), where it keeps the Sidereal Domain's registrations.
// Concept, aesthetics and layout of Holovessel: Helen AphroIcy. MIT licence.

/** The prev of the first entry. */
export const GENESIS = "0".repeat(64);

/**
 * JSON with keys sorted and no spaces: the same entry always gives the same text. Keys whose value is undefined
 * are left out, as JSON.stringify leaves them out.
 *
 * :param v: Any JSON value.
 * :return: Its canonical text.
 */
export function canon(v) {
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}`;
  return JSON.stringify(v ?? null);
}

/**
 * The SHA-256 of a text (UTF-8), in lower-case hex.
 *
 * :param text: The text.
 * :return: 64 hex characters.
 */
export async function sha256(text) {
  const subtle = globalThis.crypto?.subtle || (await import("node:crypto")).webcrypto.subtle;
  const buf = await subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The next entry, sealed to the one before it. Seal one at a time: two sealed at once would take the same place.
 *
 * :param fields: What the entry holds (JSON; n, prev and hash are set here).
 * :param ledger: The entries so far, oldest first.
 * :return: {n, ...fields, prev, hash}.
 */
export async function seal(fields, ledger = []) {
  const last = ledger[ledger.length - 1];
  const e = { ...fields, n: ledger.length + 1, prev: last ? last.hash : GENESIS };
  return { ...e, hash: await sha256(canon(e)) };
}

/**
 * Check a ledger: every number, every link, every hash; each entry against rules of your own; and, given an older
 * head, that this ledger still holds it.
 *
 * :param entries: The entries, oldest first.
 * :param opts: {check(entry, index, entries): [problem text] for your own rules; head and n: an older head and its entry number}.
 * :return: {ok, count, head, problems: [text]}.
 */
export async function verifyChain(entries = [], { check = null, head = null, n = 0 } = {}) {
  const list = Array.isArray(entries) ? entries : [], problems = [];
  let prev = GENESIS;
  for (const [i, x] of list.entries()) {
    const at = `entry ${i + 1}`;
    if (!x || typeof x !== "object" || Array.isArray(x)) { problems.push(`${at} is not an object`); break; }
    const { hash, ...rest } = x;
    if (x.n !== i + 1) problems.push(`${at} says it is number ${x.n}`);
    if (x.prev !== prev) problems.push(`${at} does not follow the one before it`);
    if (await sha256(canon(rest)) !== hash) problems.push(`${at}'s hash does not match what it holds`);
    if (check) for (const p of check(x, i, list) || []) problems.push(`${at}: ${p}`);
    prev = hash;
  }
  if (head && n) { const kept = list[n - 1]; if (!kept || kept.hash !== head) problems.push(`the older head (entry ${n}) is not in this ledger as it was`); }
  return { ok: !problems.length, count: list.length, head: list.length ? prev : null, problems };
}
