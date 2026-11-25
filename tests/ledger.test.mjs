// ledger.js: every entry sealed to the one before it; any change or removal breaks the links after it.
import assert from "node:assert/strict";
import test from "node:test";
import { GENESIS, canon, sha256, seal, verifyChain } from "../ledger.js";

test("canonical JSON: keys sorted, no spaces, undefined left out", () => {
  assert.equal(canon({ b: 1, a: [2, { d: null, c: "x", e: undefined }] }), '{"a":[2,{"c":"x","d":null}],"b":1}');
  assert.equal(canon("中"), '"中"');
});

test("sha256 is the standard one", async () => {
  assert.equal(await sha256("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("a ledger holds together; a changed, removed or reordered entry is found", async () => {
  const L = [];
  for (const site of ["https://a.example", "https://b.example", "https://c.example"]) L.push(await seal({ site, kind: "join" }, L));
  assert.equal(L[0].prev, GENESIS);
  assert.equal(L[2].prev, L[1].hash);
  const v = await verifyChain(L);
  assert.deepEqual([v.ok, v.count, v.head], [true, 3, L[2].hash]);
  const copy = () => JSON.parse(JSON.stringify(L));
  let t = copy(); t[1].site = "https://evil.example";
  assert.match((await verifyChain(t)).problems.join(" "), /entry 2's hash does not match/);
  t = copy(); t.splice(1, 1);
  assert.equal((await verifyChain(t)).ok, false);
  t = copy(); [t[0], t[1]] = [t[1], t[0]];
  assert.equal((await verifyChain(t)).ok, false);
  assert.equal((await verifyChain([])).head, null);
});

test("rules of your own run on every entry; a mirror's older head is checked", async () => {
  const L = [];
  for (const n of [1, 2, 3]) L.push(await seal({ value: n }, L));
  const odd = (x) => (x.value % 2 ? [] : ["value must be odd"]);
  assert.deepEqual((await verifyChain(L, { check: odd })).problems, ["entry 2: value must be odd"]);
  assert.equal((await verifyChain(L, { head: L[1].hash, n: 2 })).ok, true);
  assert.equal((await verifyChain(L.slice(0, 1), { head: L[1].hash, n: 2 })).ok, false);
});
