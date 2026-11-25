// The open agentic web's sky: the list is read as its table says, and the ties are the peers each site names.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseList, readOpenWeb, siteKey, LIST_RAW } from "../open-web.js";

const MD = `# Agentic Websites

| URL | Name | Description | DevPost Team | Agent URL |
|---|---|---|---|---|
|https://a.example/|Alpha| Does \`one\` thing; callable by peers.| Ann | [Link](https://a.example/a.network.json) |
|https://b.example/app/|Beta| Two | things | Bo | [Link](https://b.example/app/b.network.json) |
|https://c.example.io/|Gamma| Third.| - | [Link](https://c.example.io/x.json) |
|not a row|
`;

test("parseList reads each row, keeps a | inside a description, and drops markdown", () => {
  const rows = parseList(MD);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], { url: "https://a.example/", name: "Alpha", description: "Does one thing; callable by peers.", team: "Ann", agent: "https://a.example/a.network.json" });
  assert.equal(rows[1].description, "Two | things");
  assert.equal(rows[2].team, "");
});

test("siteKey: the same site however its address is written", () => {
  assert.equal(siteKey("https://B.example/app/agent-manifest.json"), "https://b.example/app");
  assert.equal(siteKey("https://b.example/app/"), "https://b.example/app");
  assert.equal(siteKey("nope"), "");
});

test("readOpenWeb: readable sites, their networks and the ties between them", async () => {
  const manifests = {
    "https://a.example/agent-manifest.json": { brand: "Alpha", networks: [{ name: "alpha" }], allowed_peers: ["https://b.example", "https://a.example"], actions: { agentTools: ["x"] } },
    "https://b.example/app/agent-manifest.json": { brand: "Beta", networks: [{ name: "beta" }], allowed_peers: [] },
  };
  const fetchImpl = async (url) => {
    const u = String(url);
    if (u === LIST_RAW) return { ok: true, status: 200, text: async () => MD };
    if (manifests[u]) return { ok: true, status: 200, json: async () => manifests[u] };
    return { ok: false, status: 404, json: async () => ({}), text: async () => "" };
  };
  let seen = 0;
  const r = await readOpenWeb({ fresh: true }, { fetchImpl, self: "https://here.example/holovessel/", onSite: () => { seen++; } });
  assert.equal(r.ok, true);
  assert.equal(r.type, "holovessel.open-web-sky/v1");
  assert.equal(seen, 3);
  assert.equal(r.total, 3);
  assert.equal(r.readable, 2);
  const a = r.sites.find((s) => s.name === "Alpha"), b = r.sites.find((s) => s.name === "Beta"), c = r.sites.find((s) => s.name === "Gamma");
  assert.deepEqual(a.asks, ["Beta"]);          // an origin alone reaches the site under it; itself is not a tie
  assert.deepEqual(b.askedBy, ["Alpha"]);
  assert.deepEqual(a.networks, ["alpha"]);
  assert.equal(c.readable, false);
  assert.ok(c.reason);
  assert.equal(r.ties, 1);
  assert.equal(r.sources[0].mark, "●");
});

test("readOpenWeb: without the list it falls back to the sites already known from it", async () => {
  const fetchImpl = async (url) => {
    const u = String(url);
    if (u === LIST_RAW) return { ok: false, status: 503, text: async () => "" };
    if (u.endsWith("agent-directory.json")) return { ok: true, json: async () => ({ sites: [{ base: "https://isaro.example" }, { base: "https://a.example", from: "agentic_websites.md" }] }) };
    return { ok: false, status: 404, json: async () => ({}) };
  };
  const r = await readOpenWeb({ fresh: true }, { fetchImpl, self: "https://here.example/holovessel/" });
  assert.equal(r.listRead, false);
  assert.deepEqual(r.sites.map((s) => s.url), ["https://a.example"]);
  assert.match(r.note, /could not be read/);
});
