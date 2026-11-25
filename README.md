# Holovessel kit

Five small pieces from [Holovessel 络宇](https://aphrogenes.com/holovessel/), an astrolabe where every star is a website, made for the [Open Agentic Web Challenge](https://github.com/cognizant-ai-labs/agentic-web). They have no dependencies and run in a browser or in Node 18+.

络宇的五个小部件，给做代理网站的人用：开放代理网此刻的样子、◆●○出处记号、可以带走再重跑的星图、谁都能核对的账本、「一起解决过问题」的开放数据。没有依赖，浏览器和Node 18以上都能跑。

## open-web.js: the open agentic web, read now

Every site on the challenge's [list of agentic websites](https://github.com/cognizant-ai-labs/agentic-web/blob/main/docs/agentic_websites.md), read from where you run it: whether another site can read its `agent-manifest.json` (which is how agents find and call it) and how fast, the networks and tools it says can be called, and which listed sites it calls or is called by (from `allowed_peers`).

```js
import { readOpenWeb } from "./open-web.js";
const web = await readOpenWeb();   // { total, readable, ties, sites: [{ name, url, readable, ms, networks, tools, asks, askedBy, ... }], sources }
```

`onList(rows)` and `onSite(site)` let a page draw the sky as the answers come in. `cardOf(base)` reads one site's manifest. Descriptions are each site's own words (○). In Holovessel it is the sky behind the three small stars at the end of the network's row, and the tool `open_web_sky`.

## provenance.js: ◆ ● ○

One shape for every source an answer used: ◆ calculated here (anyone can run it again), ● read from a named source, ○ someone's claim or forecast.

```js
import { provenanceOf, checkProvenance } from "./provenance.js";
const answer = { ...result, provenance: provenanceOf(result) };   // gathers source and sources at any depth
checkProvenance(answer.provenance);                               // [] when nothing is wrong, else what is, in words
```

## starmap.js: a question you can carry away

A star map records what one question did (which tools were asked, with what, what came back, what stayed with the visitor) as a small JSON program (`holovessel.starmap/v1`, schema in `starmap.schema.json`). It travels after the `#` of a link, so it never reaches a server, and brought back it runs again on today's data and says which steps changed.

```js
import { checkMap, runMap, encodeMap, decodeMap } from "./starmap.js";
const link = "https://aphrogenes.com/holovessel/#map=" + encodeMap(checkMap(map).map);
const run = await runMap(decodeMap(link.split("#map=")[1]).map, { full_moons: myFullMoons });
```

`RUNNABLE` lists the read-only tools Holovessel runs; change it for your own. Partner steps are never run by the map: only a visitor can agree to them, in their own browser.

## ledger.js: a list nobody has to take on trust

An append-only list: each entry carries the SHA-256 of the entry before it, and its own over its canonical JSON (keys sorted, no spaces), so changing or removing any entry breaks every link after it. Whoever keeps the list publishes it whole; anyone can check every link, run rules of their own on every entry, and, holding an older head, check that a newer copy still holds it at the same place.

```js
import { seal, verifyChain } from "./ledger.js";
ledger.push(await seal({ kind: "join", site: "https://example.org" }, ledger));   // {kind, site, n, prev, hash}
const v = await verifyChain(ledger, { check: (entry) => [], head: oldHead, n: oldN });   // { ok, count, head, problems }
```

Seal one entry at a time. In Holovessel it keeps the Sidereal Domain's registrations ([visits?only=domain](https://aphrogenes.com/holovessel/visits?only=domain)): the page checks it in the visitor's browser, recalculates every star's region from its moment, and marks the region ◆ when it holds.

## solved-together.js: which sites actually helped

A site that asks other agent sites keeps, for each question a visitor says was solved, only the kind of question and which networks answered, and publishes the counts by network address, the one other sites call and search engines index (`holovessel.solved-together/v1`, schema in `solved-together.schema.json`). Visitors say it and nobody checks it; the feed says so, and it is one signal among others.

```js
import { feedOf, checkFeed, mergeFeeds } from "./solved-together.js";
const feed = feedOf({ asker: { name: "My site", network: "https://my.site/agents" }, records, how: "Kept when a visitor says the answer solved their question." });
// a search engine: many sites' feeds, by network; a site's word for itself is left out
const useful = mergeFeeds(feeds);   // [{ url, solved, askers, last, topics, with }]
```

Holovessel publishes its own at [visits?only=solved](https://aphrogenes.com/holovessel/visits?only=solved), and its way-finding (`ask_the_way`) weighs it a little.

## Tests

```
npm test
```

## Licence

Code: MIT (LICENSE). The names Holovessel, 络宇, Fufu and 浮浮, their artwork and the page's design are not covered (NOTICE).
Concept, aesthetics and layout of Holovessel: Helen AphroIcy.
