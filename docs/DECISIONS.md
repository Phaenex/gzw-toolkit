# Decisions

2026-10-27

- **Static HTML, no framework.** Six pages, no server code, no visitor data on a
  server. A Next.js shell would add a build and nothing a visitor sees.
  Alternative: copy games-center's Next.js shell.
- **Buy prices are typed by the visitor.** The Fandom wiki's vendor pages show stock
  only as screenshots and the item infoboxes carry no buy price; no other readable
  source was found (searched the wiki API, grayzonewarfaregame.wiki, web search).
  The old kit card used one player's screenshot prices from 23 Oct, which the brief
  said to strip. So each price is entered once off the vendor screen and remembered.
  Alternative: OCR the wiki's vendor screenshots; unreliable and unversioned.
- **Map links go to the live GZW Tac Map, not a map of our own.** games-center's
  map uses its own plates; porting it was out of scope. Every stop keeps its grid
  ref so it can be found on the tac map. Alternative: port /gzw/map.
- **Kit by tier is a class floor plus wiki items, not a priced kit.** Floors:
  tier 1-2 armour III / helmet IIIA, tier 3 III+ / IIIA+, tier 4 III++ / IIIA+.
  They are this guide's advice and the page says so.
- **Soft weight lines (20 and 33 kg) are shown dashed and labelled unconfirmed.**
  Only 54 kg is on the wiki (Health system page). The others are one community
  guide's measurements, kept because players use them, with no link found.
- **No cookies.** Nothing on the site needs one.
