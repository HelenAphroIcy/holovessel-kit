// A star map: one question as a small program that can be carried away in a link and run again later.
import assert from "node:assert/strict";
import test from "node:test";
import { STARMAP_TYPE, MAX_STEPS, checkMap, runMap, encodeMap, decodeMap } from "../starmap.js";

const MAP = { type: STARMAP_TYPE, question: "When is the next full moon?", lang: "en",
  steps: [{ kind: "tool", tool: "full_moons", args: { count: 1 }, summary: "24 Dec", digest: "x" }, { kind: "partner", site: "https://isaro.aphrogenes.com", request: "…", decision: "allow" }],
  answer: "24 December.", kept: ["key"], again: "on-return" };

test("checkMap keeps a good map and refuses a bad one with a reason", () => {
  const ok = checkMap(MAP);
  assert.equal(ok.ok, true);
  assert.equal(ok.map.steps.length, 2);
  assert.equal(checkMap({ steps: [] }).ok, false);
  assert.equal(checkMap({ steps: Array(MAX_STEPS + 1).fill({ kind: "tool", tool: "sky_now" }) }).ok, false);
  assert.match(checkMap({ steps: [{ kind: "tool", tool: "delete_everything" }] }).reason, /Not a step a map may run/);
});

test("a map rides in a link and comes back the same", () => {
  const link = encodeMap(checkMap(MAP).map);
  assert.ok(!/[+/=]/.test(link));
  assert.deepEqual(decodeMap(link).map, checkMap(MAP).map);
  assert.equal(decodeMap("not a map").ok, false);
});

test("runMap runs the tool steps again and leaves the partner to the visitor", async () => {
  const run = await runMap(checkMap(MAP).map, { full_moons: async () => ({ ok: true, moons: [{ date: "2026-12-24", name: { en: "Cold Moon" } }] }) });
  assert.equal(run.steps[0].ok, true);
  assert.equal(run.steps[0].changed, true);
  assert.equal(run.steps[1].kind, "partner");
  assert.equal(run.steps[1].ok, false);
});
