# Holovessel kit

Three small pieces from [Holovessel 络宇](https://aphrogenes.com/holovessel/), an astrolabe where every star is a website, made for the [Open Agentic Web Challenge](https://github.com/cognizant-ai-labs/agentic-web). They have no dependencies and run in a browser or in Node 18+.

络宇的三个小部件，给做代理网站的人用：开放代理网此刻的样子、◆●○出处记号、可以带走再重跑的星图。没有依赖，浏览器和Node 18以上都能跑。

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

## Tests

```
npm test
```

## Licence

Code: MIT (LICENSE). The names Holovessel, 络宇, Fufu and 浮浮, their artwork and the page's design are not covered (NOTICE).
Concept, aesthetics and layout of Holovessel: Helen AphroIcy.
