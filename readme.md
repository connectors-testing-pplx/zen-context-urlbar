# Zen Context URL Bar

A Zen Browser mod that embeds a **functional address bar directly inside the right-click context menu**, mirroring the features of Zen's sidebar / floating URL bar.

## What it does

Right-click anywhere on a page and you get an address bar row at the top of the menu. Type into it and press Enter to navigate, exactly like Zen's sidebar URL bar:

- **URL or search** — type `github.com` or `kittens` and press Enter; it auto-decides URL vs. search using your default engine.
- **`@engine` selection** — `@ddg privacy`, `@google weather`, `@youtube lofi` use the named engine from your browser's configured search engines.
- **`*` bookmark search** — `*news` jumps to the first bookmark whose title/url matches.
- **`%` tab search** — `%github` switches to the first open tab matching the term.
- **History & bookmark autocomplete** — a suggestion dropdown appears as you type, ranked by frecency.
- **Persistent input memory** — the last query is remembered across browser restarts.
- **Open target** — choose current tab, new foreground tab, or background tab via `uc.contexturlbar.openin`.
- Also optionally available in the **tab** right-click menu (`uc.contexturlbar.intabmenu`).

## Important: this mod requires JavaScript (fx-autoconfig)

The official Zen theme-store only distributes CSS-based mods. A genuinely interactive address bar — typing, autocomplete, `@engine` parsing, navigation — **cannot be built with CSS alone**. This mod therefore ships as a `userChrome.js` (`.uc.js`) script that runs through [fx-autoconfig](https://github.com/MrOtherGuy/fx-autoconfig), the same mechanism used by mods like [Quick Search](https://github.com/Darsh-A/Quick-Search-Zen-Browser).

The included `chrome.css` is the visual styling layer (theme-store compatible) and is applied automatically alongside the script when installed locally.

## Features vs. Zen's sidebar URL bar

| Zen sidebar URL bar feature | In this mod |
|---|---|
| Type URL or search query | Yes |
| `@engine` prefixes | Yes |
| `*` bookmark search | Yes |
| `%` tab search | Yes |
| History/bookmark autocomplete | Yes (frecency-ranked) |
| Persistent input memory | Yes |
| Open in current / new / background tab | Yes |

## Installation

### Part 1 — Install fx-autoconfig (one time)

1. Download the ZIP from [MrOtherGuy/fx-autoconfig](https://github.com/MrOtherGuy/fx-autoconfig).
2. From the ZIP, copy the `defaults` folder and `config.js` into your **Zen Browser installation folder**:
   - Windows: `C:\Program Files\Zen Browser`
   - macOS: `/Applications/Zen Browser.app/Contents/Resources`
   - Linux: `/opt/zen-browser` (or wherever you installed)
   - (Merge `config.js` and `defaults/pref/config-prefs.js` if files already exist.)
3. Open `about:profiles` in Zen, find your profile, and **Open Folder** for the Root Directory.
4. Copy the `chrome` folder (from the ZIP's `profile` folder) into your profile root directory.

### Part 2 — Install this mod

1. Copy `ZenContextUrlBar.uc.js` into `<profile>/chrome/JS/` (create the `JS` folder if missing).
2. (Optional) Copy `chrome.css` into `<profile>/chrome/` if you want the matching styling and don't already have a `userChrome.css`.
3. Open `about:support` and click **Clear startup cache…**, then restart Zen.

## Usage

1. Right-click on any web page.
2. The address bar row appears near the top of the context menu — it auto-focuses.
3. Type a URL, a search, or use `@engine` / `*` / `%` prefixes, then press **Enter**.
4. Press **Esc** to close the menu without navigating.

## Preferences (about:config)

All settings live under `uc.contexturlbar.*`:

| Preference | Default | Meaning |
|---|---|---|
| `uc.contexturlbar.enabled` | `true` | Master on/off |
| `uc.contexturlbar.openin` | `tab` | `current` \| `tab` \| `bg-tab` |
| `uc.contexturlbar.autocomplete` | `true` | Show suggestion dropdown |
| `uc.contexturlbar.enginesearch` | `true` | Enable `@engine` selection |
| `uc.contexturlbar.intabmenu` | `false` | Also show in tab right-click menu |
| `uc.contexturlbar.rememberquery` | `true` | Remember last query across sessions |

## License

MIT
