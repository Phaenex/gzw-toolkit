/* The shared frame (header, footer, credits) and the small helpers every page uses. */
(function () {
  "use strict";
  var PAGES = [["/", "Home"], ["/hideout", "Hideout"], ["/loadout", "Loadout"], ["/weight", "Weight"], ["/loot", "Loot values"], ["/data", "Your data"]];
  var here = location.pathname.replace(/\.html$/, "").replace(/\/index$/, "/") || "/";
  var esc = function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  var head = '<a class="skip" href="#main">Skip to content</a><header class="top"><div class="in"><a class="brand" href="/">GZW Toolkit<small>0.5 Rogue Ops</small></a><nav aria-label="Site">' +
    PAGES.map(function (p) { return '<a href="' + p[0] + '"' + (p[0] === here ? ' aria-current="page"' : "") + ">" + p[1] + "</a>"; }).join("") + "</nav></div></header>";
  var foot = '<footer class="site"><div class="in">' +
    '<p>A fan-made reference for Gray Zone Warfare, not affiliated with or endorsed by MADFINGER Games. Item stats, sizes, weights, sell prices and pictures come from the ' +
    '<a href="https://gray-zone-warfare.fandom.com/" rel="noopener" target="_blank">Gray Zone Warfare Fandom wiki</a> (text CC BY-SA; game art belongs to MADFINGER Games). ' +
    'Map positions come from the <a href="https://gzwtacmap.com/maps/lamang" rel="noopener" target="_blank">GZW Tac Map</a>. Hideout routes and codes credit their guide on each line.</p>' +
    '<p>Your ranks, ticks, loadouts and bag are saved only in this browser. There are no accounts and nothing you enter is sent anywhere. <a href="/data">Export or clear it</a>.</p>' +
    '<p id="dataDates"></p></div></footer>';
  document.body.insertAdjacentHTML("afterbegin", head);
  document.body.insertAdjacentHTML("beforeend", foot);

  var cache = {};
  function getJSON(u) {
    if (!cache[u]) cache[u] = fetch(u).then(function (r) { if (!r.ok) throw new Error(u + " " + r.status); return r.json(); });
    return cache[u];
  }
  getJSON("/data/meta.json").then(function (m) {
    var el = document.getElementById("dataDates");
    if (el) el.textContent = "Data: wiki items read " + m.itemsFetched.slice(0, 10) + ", loot and sell prices read " + m.lootFetched.slice(0, 10) + ", hideout guide built " + m.hideoutBuilt + ".";
  }).catch(function () {});

  window.Site = {
    esc: esc,
    getJSON: getJSON,
    $: function (id) { return document.getElementById(id); },
    money: function (n) { return n == null ? "-" : "$" + Number(n).toLocaleString("en-US"); },
    kg: function (n) { return n == null ? "-" : (Math.round(n * 100) / 100).toLocaleString("en-US") + " kg"; },
    ext: function (url, text) { return '<a href="' + esc(url) + '" rel="noopener" target="_blank">' + esc(text) + "</a>"; },
    /* a real picture from the wiki, or a gap that says so */
    pic: function (it) {
      return it && it.img ? '<span class="pic"><img src="' + esc(it.img) + '" alt="" loading="lazy" width="56" height="42"></span>'
        : '<span class="pic gap" title="The wiki has no picture of this item">no wiki picture</span>';
    },
    /* the visitor's vendor ranks, one select per vendor; saves on change */
    ranks: function (elId) {
      var el = document.getElementById(elId);
      if (!el) return;
      getJSON("/data/items.json").then(function (D) {
        function draw() {
          var r = GZK.get().ranks;
          el.innerHTML = '<div class="row" role="group" aria-label="Your vendor ranks">' + D.vendors.map(function (v) {
            return '<label>' + esc(v) + ' <select data-v="' + esc(v) + '"><option value="">?</option>' + [1, 2, 3, 4].map(function (n) {
              return '<option value="' + n + '"' + (r[v] === n ? " selected" : "") + ">R" + n + "</option>"; }).join("") + "</select></label>";
          }).join("") + "</div>";
        }
        draw();
        el.addEventListener("change", function (e) {
          var v = e.target.getAttribute("data-v"); if (!v) return;
          var n = Number(e.target.value);
          GZK.change(function (s) { if (n) s.ranks[v] = n; else delete s.ranks[v]; });
        });
        GZK.on(function () { if (!el.contains(document.activeElement)) draw(); });
      });
    },
    fail: function (where, e) {
      var el = document.getElementById(where);
      if (el) el.insertAdjacentHTML("afterbegin", '<p class="err">The data did not load (' + esc(e.message) + "). Reload to try again.</p>");
    },
  };
})();
