// solved-together.js: counts by network, once per question; feeds checked and merged, a site's word for itself left out.
import assert from "node:assert/strict";
import test from "node:test";
import { SOLVED_TOGETHER, tally, feedOf, checkFeed, mergeFeeds } from "../solved-together.js";

const A = "https://a.example/alpha", B = "https://b.example/beta", C = "https://c.example/gamma";
const recs = [
  { t: "2026-11-26T05:00Z", topic: { kind: "mineral", id: "fluorite" }, stars: ["a_one", "a_two", "b"] },
  { t: "2026-11-26T06:00Z", topic: { kind: "sky", id: "moon" }, stars: ["b"] },
  { t: "2026-11-26T07:00Z", topic: { kind: "mineral", id: "fluorite" }, networks: [C, B] },
];
const netOf = (s) => ({ a_one: A, a_two: A, b: B }[s]);

test("tally: a network counts once per question, with the others in the same answer", () => {
  const rows = Object.fromEntries(tally(recs, { netOf }).map((x) => [x.url, x]));
  assert.equal(rows[A].solved, 1);
  assert.equal(rows[B].solved, 3);
  assert.equal(rows[B].last, "2026-11-26T07:00Z");
  assert.deepEqual(rows[B].topics, [{ kind: "mineral", id: "fluorite", n: 2 }, { kind: "sky", id: "moon", n: 1 }]);
  assert.deepEqual(rows[B].with.map((w) => w.url).sort(), [A, C]);
  assert.equal(rows[C].name, "c.example");
});

test("a feed has the type, the asker, counts only, and passes its own check", () => {
  const f = feedOf({ asker: { name: "Alpha", network: A }, records: recs, how: "Visitors say it.", at: new Date("2026-11-26T08:00:00Z"), netOf });
  assert.equal(f.type, SOLVED_TOGETHER);
  assert.deepEqual([f.count, f.since, f.updated], [3, "2026-11-26T05:00Z", "2026-11-26T08:00Z"]);
  assert.ok(!JSON.stringify(f).includes("stars"));
  assert.deepEqual(checkFeed(f), []);
  assert.ok(checkFeed({ ...f, type: "x" }).length);
  assert.ok(checkFeed({ ...f, networks: [{ url: "not a url", solved: 1, topics: [], with: [] }] }).length);
});

test("many feeds merged: summed by network, how many sites said so, a site's word for itself left out", () => {
  const fa = feedOf({ asker: { network: A }, records: recs, netOf });
  const fc = feedOf({ asker: { network: C }, records: [{ t: "2026-11-27T01:00Z", topic: { kind: "sky", id: "moon" }, networks: [B, C] }] });
  const m = Object.fromEntries(mergeFeeds([fa, fc, { type: "nonsense" }]).map((x) => [x.url, x]));
  assert.equal(m[B].solved, 4);
  assert.equal(m[B].askers, 2);
  assert.equal(m[A], undefined);   // A's own feed does not count for A
  assert.equal(m[C].solved, 1);    // counted from A's feed, not from its own
  assert.equal(mergeFeeds([fa], { self: true }).find((x) => x.url === A).solved, 1);
});
