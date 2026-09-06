// ZenContextUrlBar.uc.js
// "Zen Context URL Bar" — embeds a functional address bar (mirroring Zen's
// sidebar / floating URL bar features) directly inside the right-click
// (content area) context menu.
//
// Features (matching Zen's sidebar URL bar):
//   - Type a URL or a search query and press Enter to navigate.
//   - @engine selection (e.g. "@ddg kittens", "@google weather") using the
//     browser's configured search engines.
//   - "*" prefix searches your bookmarks, "%" prefix searches open tabs.
//   - History & bookmark autocomplete suggestions in a dropdown.
//   - Persistent input memory (remembers last query across sessions).
//   - Choose where to open: current tab, new tab, or background tab.
//
// Install:
//   Requires fx-autoconfig (https://github.com/MrOtherGuy/fx-autoconfig).
//   Drop this file into <profile>/chrome/JS/  then restart Zen
//   (or clear startup cache from about:support).
//
// License: MIT
// Author: connectors-testing-pplx
(function () {
  "use strict";

  // ---------------------------------------------------------------- prefs
  const PREF = {
    enabled: "uc.contexturlbar.enabled",
    openIn: "uc.contexturlbar.openin",          // "current" | "tab" | "bg-tab"
    autocomplete: "uc.contexturlbar.autocomplete",
    engineSearch: "uc.contexturlbar.enginesearch",
    inTabMenu: "uc.contexturlbar.intabmenu",    // also add to tab context menu
    rememberQuery: "uc.contexturlbar.rememberquery",
    lastQuery: "uc.contexturlbar.lastquery",
  };

  const getPref = (name, def) => {
    try {
      const ps = Services.prefs;
      if (!ps.prefHasUserValue(name)) return def;
      switch (ps.getPrefType(name)) {
        case ps.PREF_BOOL: return ps.getBoolPref(name);
        case ps.PREF_INT: return ps.getIntPref(name);
        case ps.PREF_STRING: return ps.getStringPref(name);
      }
    } catch (e) { /* ignore */ }
    return def;
  };
  const setPref = (name, val) => {
    try {
      const ps = Services.prefs;
      if (typeof val === "boolean") ps.setBoolPref(name, val);
      else if (typeof val === "number") ps.setIntPref(name, val);
      else ps.setStringPref(name, String(val));
    } catch (e) { /* ignore */ }
  };

  const MENU_ID = "zen-context-urlbar-row";
  const SEP_ID = "zen-context-urlbar-sep";
  const INPUT_ID = "zen-context-urlbar-input";
  const LIST_ID = "zen-context-urlbar-suggestions";

  // ------------------------------------------------------------- query resolve
  // Decide whether the typed text is a URL or a search query, honoring @engine
  // prefixes and the browser's default search engine. Returns {url, type}.
  function resolveQuery(input) {
    input = (input || "").trim();
    if (!input) return null;

    // @engine selection: "@ddg query" -> use named engine
    if (getPref(PREF.engineSearch, true)) {
      const m = input.match(/^@(\S+)\s+(.*)$/);
      if (m) {
        const alias = m[1].toLowerCase();
        const rest = m[2].trim();
        let engine = null;
        try {
          const engines = Services.search.getEngines();
          engine = engines.find(e => (e.alias || "").toLowerCase() === alias) ||
                   engines.find(e => (e.name || "").toLowerCase() === alias);
        } catch (e) { /* ignore */ }
        if (engine && rest) {
          const sub = engine.getSubmission(rest);
          return { url: sub.uri.spec, type: "search", engine: engine.name };
        }
      }
    }

    // "*" bookmark search -> open the first matching bookmark
    if (input.startsWith("*") && input.length > 1) {
      const term = input.slice(1).trim().toLowerCase();
      try {
        const bq = PlacesUtils.history.getNewQuery();
        bq.searchTerms = term;
        bq.onlyBookmarked = true;
        const bo = PlacesUtils.history.getNewQueryOptions();
        bo.maxResults = 50;
        const bres = PlacesUtils.history.executeQuery(bq, bo);
        const broot = bres.root;
        broot.containerOpen = true;
        for (let i = 0; i < broot.childCount; i++) {
          const node = broot.getChild(i);
          const t = (node.title || "").toLowerCase();
          const u = (node.uri || "").toLowerCase();
          if (t.includes(term) || u.includes(term)) {
            const url = node.uri;
            broot.containerOpen = false;
            return { url, type: "bookmark" };
          }
        }
        broot.containerOpen = false;
      } catch (e) { /* ignore */ }
    }

    // "%" tab search -> switch to the first open tab whose title/url matches
    if (input.startsWith("%") && input.length > 1) {
      const term = input.slice(1).trim().toLowerCase();
      for (const win of Services.wm.getEnumerator("navigator:browser")) {
        for (const tab of win.gBrowser.tabs) {
          const url = tab.linkedBrowser.currentURI.spec || "";
          const title = tab.label || "";
          if (title.toLowerCase().includes(term) || url.toLowerCase().includes(term)) {
            win.gBrowser.selectedTab = tab;
            win.focus();
            return { url: null, type: "tab-switch" };
          }
        }
      }
    }

    // Bare URL?
    const looksURL =
      /^(https?|about|file|ftp|moz-extension):/i.test(input) ||
      (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(input) && !/\s/.test(input));
    if (looksURL) {
      let url = input;
      if (!/^[a-z]+:/i.test(url)) url = "https://" + url;
      return { url, type: "url" };
    }

    // Fall back to default search engine.
    try {
      const engine = Services.search.getDefault ? Services.search.getDefault() : Services.search.defaultEngine;
      if (engine) {
        const sub = engine.getSubmission(input);
        return { url: sub.uri.spec, type: "search" };
      }
    } catch (e) { /* ignore */ }
    return null;
  }


  // ----------------------------------------------------------- autocomplete
  // Build a small list of history + bookmark matches for the typed text.
  function getSuggestions(text) {
    const out = [];
    text = (text || "").trim().toLowerCase();
    if (!text || !getPref(PREF.autocomplete, true)) return out;
    try {
      const q = PlacesUtils.history.getNewQuery();
      q.searchTerms = text;
      const opts = PlacesUtils.history.getNewQueryOptions();
      opts.sort = Ci.nsINavHistoryQueryOptions.SORT_BY_FRECENCY_DESCENDING;
      opts.maxResults = 8;
      const res = PlacesUtils.history.executeQuery(q, opts);
      const root = res.root;
      root.containerOpen = true;
      for (let i = 0; i < root.childCount && out.length < 6; i++) {
        const node = root.getChild(i);
        out.push({ title: node.title || node.uri, url: node.uri });
      }
      root.containerOpen = false;
    } catch (e) { /* ignore history errors */ }
    // bookmarks
    try {
      const bq = PlacesUtils.history.getNewQuery();
      bq.searchTerms = text;
      bq.onlyBookmarked = true;
      const bo = PlacesUtils.history.getNewQueryOptions();
      bo.maxResults = 4;
      const bres = PlacesUtils.history.executeQuery(bq, bo);
      const broot = bres.root;
      broot.containerOpen = true;
      for (let i = 0; i < broot.childCount && out.length < 8; i++) {
        const node = broot.getChild(i);
        if (!out.some(o => o.url === node.uri)) out.push({ title: node.title || node.uri, url: node.uri });
      }
      broot.containerOpen = false;
    } catch (e) { /* ignore bookmark errors */ }
    return out;
  }

  // ------------------------------------------------------------- navigation
  function navigate(resolved) {
    if (!resolved || !resolved.url) return;
    const where = getPref(PREF.openIn, "tab");
    try {
      if (where === "current") {
        gBrowser.loadURI(resolved.url, { triggeringPrincipal: gBrowser.contentPrincipal });
      } else {
        const bg = where === "bg-tab";
        gBrowser.addTab(resolved.url, {
          inBackground: bg,
          triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
        });
      }
    } catch (e) {
      console.warn("ZenContextUrlBar: navigate failed", e, resolved.url);
    }
    closeContext();
  }

  let closeContext = () => {};

  // ------------------------------------------------------------- UI builder
  function buildUI() {
    const popup = document.getElementById("contentAreaContextMenu");
    if (!popup || popup.querySelector("#" + MENU_ID)) return;
    if (!getPref(PREF.enabled, true)) return;

    // separator + container row. closemenu="none" keeps the popup open while
    // the user focuses/types into the embedded input.
    const sep = document.createXULElement("menuseparator");
    sep.id = SEP_ID;

    const row = document.createXULElement("menuitem");
    row.id = MENU_ID;
    row.setAttribute("closemenu", "none");
    // prevent the row from acting like a normal clickable menu item
    row.style.padding = "4px 6px";

    const hbox = document.createXULElement("hbox");
    hbox.setAttribute("flex", "1");
    hbox.style.alignItems = "center";

    // prefix icon-ish label
    const glyph = document.createXULElement("label");
    glyph.value = "\u{1F310}"; // globe
    glyph.style.marginInlineEnd = "6px";
    glyph.style.color = "var(--zen-primary-color, inherit)";

    // HTML input lives inside XUL via the html namespace.
    const htmlNS = "http://www.w3.org/1999/xhtml";
    const input = document.createElementNS(htmlNS, "input");
    input.id = INPUT_ID;
    input.type = "text";
    input.placeholder = "Search or enter address  (@engine, *bookmarks, %tabs)";
    input.style.flex = "1";
    input.style.minWidth = "280px";
    input.style.padding = "5px 8px";
    input.style.border = "1px solid var(--zen-button-border, rgba(255,255,255,.18))";
    input.style.borderRadius = "8px";
    input.style.background = "var(--zen-main-browser-background, #2b2b2b)";
    input.style.color = "var(--zen-text-color, #fff)";
    input.style.fontSize = "13px";
    input.style.outline = "none";
    // restore last query (persistent input memory)
    if (getPref(PREF.rememberQuery, true)) {
      input.value = getPref(PREF.lastQuery, "");
    }

    hbox.appendChild(glyph);
    hbox.appendChild(input);
    row.appendChild(hbox);

    // suggestion list (a second non-closing menuitem)
    const listRow = document.createXULElement("menuitem");
    listRow.id = LIST_ID;
    listRow.setAttribute("closemenu", "none");
    listRow.style.padding = "0 6px";
    listRow.style.display = "none";

    // place near the top, after the navigation buttons block if present
    const anchor = popup.querySelector("#context-sep-navigation") ||
                   popup.querySelector("#context-navigation") ||
                   popup.firstElementChild;
    popup.insertBefore(row, anchor ? anchor.nextSibling : popup.firstChild);
    popup.insertBefore(sep, row);
    popup.insertBefore(listRow, row.nextSibling);

    wireInput(input, listRow, popup);

    // also add to the tab context menu if enabled
    if (getPref(PREF.inTabMenu, false)) {
      const tabMenu = document.getElementById("tabContextMenu");
      if (tabMenu && !tabMenu.querySelector("#" + MENU_ID)) {
        const tSep = sep.cloneNode(false);
        tSep.id = SEP_ID + "-tab";
        const tRow = row.cloneNode(true);
        tRow.id = MENU_ID + "-tab";
        const tInput = tRow.querySelector("#" + INPUT_ID);
        if (tInput) tInput.id = INPUT_ID + "-tab";
        const tList = listRow.cloneNode(false);
        tList.id = LIST_ID + "-tab";
        const tAnchor = tabMenu.querySelector("#context_closeTab") || tabMenu.firstElementChild;
        tabMenu.insertBefore(tRow, tAnchor ? tAnchor.nextSibling : tabMenu.firstChild);
        tabMenu.insertBefore(tSep, tRow);
        tabMenu.insertBefore(tList, tRow.nextSibling);
        wireInput(tRow.querySelector("input"), tList, tabMenu);
      }
    }
  }

  // ------------------------------------------------------------- wiring
  function wireInput(input, listRow, popup) {
    if (!input) return;

    // focus the input shortly after the menu opens
    popup.addEventListener("popupshown", () => {
      if (getPref(PREF.enabled, true)) setTimeout(() => { try { input.focus(); input.select(); } catch(e){} }, 30);
    });

    // remember last query
    input.addEventListener("input", () => {
      if (getPref(PREF.rememberQuery, true)) setPref(PREF.lastQuery, input.value);
      renderSuggestions(input, listRow);
    });

    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        ev.stopPropagation();
        const res = resolveQuery(input.value);
        if (res) navigate(res);
      } else if (ev.key === "Escape") {
        closeContext();
      }
    });

    closeContext = () => { try { popup.hidePopup(); } catch (e) {} };
  }

  function renderSuggestions(input, listRow) {
    const sugg = getSuggestions(input.value);
    listRow.innerHTML = "";
    if (!sugg.length) { listRow.style.display = "none"; return; }
    const vbox = document.createXULElement("vbox");
    sugg.forEach(s => {
      const item = document.createXULElement("menuitem");
      item.setAttribute("closemenu", "none");
      item.setAttribute("label", s.title || s.url);
      item.style.padding = "3px 10px";
      item.style.fontSize = "12px";
      item.style.maxWidth = "360px";
      item.style.overflow = "hidden";
      item.style.textOverflow = "ellipsis";
      item.style.color = "var(--zen-text-color, inherit)";
      item.addEventListener("command", () => navigate({ url: s.url, type: "history" }));
      vbox.appendChild(item);
    });
    listRow.appendChild(vbox);
    listRow.style.display = "";
  }

  // ------------------------------------------------------------- boot
  function init() {
    if (!window || !document.getElementById("contentAreaContextMenu")) {
      setTimeout(init, 500);
      return;
    }
    buildUI();
    // rebuild after location changes / customization just in case
    Services.obs.addObserver({
      observe() { try { buildUI(); } catch (e) {} }
    }, "chrome-document-loaded");
  }

  setTimeout(init, 1200);
})();
