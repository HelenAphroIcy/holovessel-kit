// ◆ ● ○: every source an answer used, in one shape, and what is wrong with a list of them.
import assert from "node:assert/strict";
import test from "node:test";
import { MARKS, sourceOf, provenanceOf, checkProvenance } from "../provenance.js";

test("the three marks", () => {
  assert.deepEqual(MARKS, { "◆": "calculated", "●": "sourced", "○": "claimed" });
});

test("provenanceOf gathers source and sources at any depth, once each", () => {
  const answer = {
    sources: [{ mark: "◆", name: "astronomy-engine", link: "https://github.com/cosinekitty/astronomy" }],
    moon: { source: { mark: "●", name: "U.S. Naval Observatory", url: "https://aa.usno.navy.mil/data/api" } },
    sites: [{ sources: [{ mark: "○", name: "A site's own words" }, { mark: "◆", name: "astronomy-engine", link: "https://github.com/cosinekitty/astronomy" }] }],
  };
  const list = provenanceOf(answer);
  assert.equal(list.length, 3);
  assert.deepEqual(list.map((p) => p.kind), ["calculated", "sourced", "claimed"]);
  assert.equal(list[1].link, "https://aa.usno.navy.mil/data/api");
  assert.deepEqual(checkProvenance(list), []);
});

test("checkProvenance says what is wrong, in words", () => {
  assert.deepEqual(checkProvenance([]), ["no source named"]);
  assert.deepEqual(checkProvenance([], { needed: false }), []);
  const bad = checkProvenance([{ mark: "?", name: "x" }, { mark: "●", kind: "claimed", name: "y" }, { mark: "◆", kind: "calculated", name: "z", link: "ftp://z" }]);
  assert.equal(bad.length, 3);
  assert.equal(sourceOf({ mark: "●" }), null);
});
