# GZW Toolkit

Free tools for Gray Zone Warfare 0.5 (Rogue Ops): a hideout run planner, a loadout
builder that checks your vendor ranks, a carry-weight calculator and loot sell values.

Everything a visitor sets (vendor ranks, hideout ticks, owned gear, typed prices,
saved loadouts, the planned bag) is kept in their own browser's localStorage under
`gzwkit.v1`. There are no accounts, no cookies, and nothing is sent to a server.
The Your data page exports it as JSON and imports it back.

Fan-made, not affiliated with MADFINGER Games.

## Pages

| Path | What it does |
|---|---|
| `/` | vendor ranks, links to the tools |
| `/hideout` | goals in build order with ticks, quick runs per goal, kit by tier, 0.5 door codes, the tier 3 hacking-tool parts, safes |
| `/loadout` | weapon, armour, helmet, rig, backpack and ammo from wiki item data; rank check; cost by vendor; named loadouts |
| `/weight` | loadout plus planned carry against the 54 kg encumbrance limit |
| `/loot` | sell price, best vendor per kind, per slot and per kg |
| `/data` | export, import, clear; where the numbers come from |

## Data

`public/data/*.json` and `public/img/` are generated, not hand-edited. They are
read from the games-center repo, which holds the scrapers:

```bash
npm run sync              # read games-center's current data
npm run sync:rescrape     # run games-center's wiki/tac-map scrapers and hideout builder first
```

`GC_DIR` points at games-center if it is not a sibling folder. The sync drops
anything about one particular player and games-center's internal map links.

## Checks

```bash
npm run check:clean                                     # nothing personal or games-center-internal is served
npm run serve                                           # local server on :4321 with clean URLs
BASE=http://localhost:4321 node scripts/check-browser.mjs local
```

`check-browser` loads every page at 1280x720 and 375x812, fails on any console
error or sideways scroll, and checks that saved state survives a reload and that
export, clear, import gives back the same state. Screenshots and `results.json`
land in `docs/evidence/<label>/`. Both gates were watched failing first; the
outputs are in `docs/evidence/gates/`.

## Sources

Item stats, sizes, weights, sell prices and pictures: the
[Gray Zone Warfare Fandom wiki](https://gray-zone-warfare.fandom.com/), each item linked
to its page. Map pins: the [GZW Tac Map](https://gzwtacmap.com/maps/lamang). Hideout
costs, routes and codes: the community guides credited on each line. The wiki does
not publish vendor buy prices, so the loadout builder asks the visitor for them.
