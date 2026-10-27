/* Everything a visitor saves lives here, in this browser's localStorage under
 * one key. Nothing is sent anywhere. No cookies are set: nothing on this site
 * needs one.
 *
 * Shape (version 1):
 *   ranks     { "Gunny": 2, ... }   vendor rank 1-4; a vendor left out is unknown
 *   built     { "Two-Stroke Engine": true, ... }   hideout stations built / parts in hand
 *   runsDone  { "tigerbay": true }   runs ticked on the hideout page
 *   owned     { "<item id>": true }  gear already in the stash: costs nothing in a loadout
 *   prices    { "<item id>": 4400 }  buy prices the visitor typed off their vendor screen
 *   loadouts  [ { id, name, weapon, vest, helmet, rig, backpack, ammo, ammoN, saved } ]
 *   draft     the loadout being edited, same shape without id/name
 *   bag       [ { id: "<loot id>", n: 2 } ]   what the weight tool plans to carry out
 */
(function () {
  "use strict";
  var KEY = "gzwkit.v1", APP = "gzw-toolkit", listeners = [];
  var EMPTY = function () { return { v: 1, ranks: {}, built: {}, runsDone: {}, owned: {}, prices: {}, loadouts: [], draft: {}, bag: [] }; };
  var obj = function (x) { return x && typeof x === "object" && !Array.isArray(x) ? x : {}; };
  function clean(d) {
    d = obj(d);
    var r = EMPTY(), ranks = obj(d.ranks), prices = obj(d.prices);
    Object.keys(ranks).forEach(function (k) { var n = Number(ranks[k]); if (n >= 1 && n <= 4) r.ranks[k] = Math.round(n); });
    ["built", "runsDone", "owned"].forEach(function (f) { var o = obj(d[f]); Object.keys(o).forEach(function (k) { if (o[k]) r[f][k] = true; }); });
    Object.keys(prices).forEach(function (k) { var n = Number(prices[k]); if (isFinite(n) && n >= 0) r.prices[k] = Math.round(n); });
    r.loadouts = (Array.isArray(d.loadouts) ? d.loadouts : []).filter(function (l) { return l && typeof l === "object" && l.id; }).map(function (l) {
      return { id: String(l.id), name: String(l.name || "Loadout").slice(0, 60), weapon: l.weapon || "", vest: l.vest || "", helmet: l.helmet || "",
        rig: l.rig || "", backpack: l.backpack || "", ammo: l.ammo || "", ammoN: Math.max(0, Math.min(2000, Number(l.ammoN) || 0)), saved: l.saved || "" };
    });
    var dr = obj(d.draft);
    ["weapon", "vest", "helmet", "rig", "backpack", "ammo"].forEach(function (k) { if (dr[k]) r.draft[k] = String(dr[k]); });
    if (dr.ammoN != null) r.draft.ammoN = Math.max(0, Math.min(2000, Number(dr.ammoN) || 0));
    r.bag = (Array.isArray(d.bag) ? d.bag : []).filter(function (b) { return b && b.id; }).map(function (b) { return { id: String(b.id), n: Math.max(1, Math.min(99, Number(b.n) || 1)) }; });
    return r;
  }
  var state;
  function load() {
    try { state = clean(JSON.parse(localStorage.getItem(KEY) || "null")); }
    catch (e) { state = EMPTY(); }
    return state;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch (e) { return false; }
  }
  load();
  window.GZK = {
    KEY: KEY,
    get: function () { return state; },
    /* change(fn): fn edits the state in place; it is cleaned, saved and announced */
    change: function (fn) { fn(state); state = clean(state); var ok = save(); listeners.forEach(function (l) { l(state); }); return ok; },
    on: function (fn) { listeners.push(fn); },
    reload: function () { load(); listeners.forEach(function (l) { l(state); }); },
    exportJSON: function () { return JSON.stringify({ app: APP, version: 1, exportedAt: new Date().toISOString(), data: state }, null, 1); },
    /* returns a short summary on success, throws with a reason on a bad file */
    importJSON: function (text) {
      var o = JSON.parse(text);
      if (!o || o.app !== APP || !o.data) throw new Error("This is not a GZW Toolkit export.");
      state = clean(o.data); save(); listeners.forEach(function (l) { l(state); });
      return GZK.summary();
    },
    clear: function () { state = EMPTY(); try { localStorage.removeItem(KEY); } catch (e) {} listeners.forEach(function (l) { l(state); }); },
    summary: function () {
      var s = state, n = function (o) { return Object.keys(o).length; };
      return n(s.ranks) + " vendor ranks, " + n(s.built) + " hideout ticks, " + n(s.runsDone) + " runs done, " + n(s.owned) + " owned items, " +
        n(s.prices) + " prices, " + s.loadouts.length + " saved loadouts, " + s.bag.length + " bag lines";
    },
    /* rank rule, shared by every page: an item is buyable when any vendor that
       sells it is at or above that rank for this visitor. null = ranks unknown */
    canBuy: function (it) {
      var r = state.ranks;
      if (!Object.keys(r).length) return null;
      return (it.sold || []).some(function (s) { return s.rank != null && r[s.vendor] >= s.rank; });
    },
  };
  /* another tab saved: pick it up */
  window.addEventListener("storage", function (e) { if (e.key === KEY) GZK.reload(); });
})();
