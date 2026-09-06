# zen-context-urlbar

A Zen Browser mod that adds a **functional address bar to the right-click context menu**, replicating Zen's sidebar / floating URL bar features (URL+search, `@engine` prefixes, `*` bookmark search, `%` tab search, history/bookmark autocomplete, persistent input memory).

> Because an interactive address bar requires JavaScript, this mod is a `userChrome.js` (`.uc.js`) script installed via [fx-autoconfig](https://github.com/MrOtherGuy/fx-autoconfig). The Zen theme-store is CSS-only and cannot host the functional part of this mod; it is distributed via GitHub instead. See [`readme.md`](readme.md) for full install + testing steps.

## Files

- `ZenContextUrlBar.uc.js` — the mod (script). Copy into `<profile>/chrome/JS/`.
- `chrome.css` — Zen-styled visual layer (theme-store compatible styling).
- `theme.json` — mod metadata (used if you submit the CSS layer to the theme-store).
- `preferences.json` — mod preference definitions.
- `readme.md` — installation, usage, and preference reference.

## Quick start

1. Install fx-autoconfig (one-time) — see `readme.md`.
2. Copy `ZenContextUrlBar.uc.js` to `<profile>/chrome/JS/`.
3. `about:support` → Clear startup cache → restart Zen.
4. Right-click on a page → type a URL or search → Enter.

## License

MIT
