<h1 align="center">YouTube Invidious Redirector</h1>

<p align="center">
  <a href="https://raw.githubusercontent.com/HALL4Y/youtube-invidious-redirector/main/youtube-to-invidious-efficient-auto-redirector.user.js"><img src="https://img.shields.io/badge/Install-Userscript-brightgreen?style=for-the-badge&logo=tampermonkey" alt="Install"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/v/release/HALL4Y/youtube-invidious-redirector?label=version&style=flat-square" alt="Version">
  <img src="https://img.shields.io/github/license/HALL4Y/youtube-invidious-redirector?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/platform-Firefox%20%7C%20Chrome-blue?style=flat-square" alt="Platform">
</p>

<p align="center">
  Automatically redirects YouTube video pages to an <a href="https://invidious.io/">Invidious</a> instance.<br>
  Manage preferred instances from a floating UI — no code editing required.
</p>

---

## Features

- Automatic redirect from YouTube watch pages and `shorts`
- Handles YouTube SPA navigation (`pushState`, `replaceState`, `yt-navigate-finish`)
- Floating draggable icon with modal instance selector
- Add custom Invidious instances from the UI
- Persistent settings (selected instance, icon position)
- One-click return to YouTube from supported Invidious hosts

## Install

1. Install a userscript manager:
   [Violentmonkey](https://violentmonkey.github.io/) |
   [Tampermonkey](https://www.tampermonkey.net/) |
   [Greasemonkey](https://www.greasespot.net/)

2. **[Click here to install the script](https://raw.githubusercontent.com/HALL4Y/youtube-invidious-redirector/main/youtube-to-invidious-efficient-auto-redirector.user.js)**

3. Confirm installation in your userscript manager.

## Supported hosts

| YouTube | Invidious |
|---------|-----------|
| `www.youtube.com` | `inv.nadeko.net` |
| `m.youtube.com` | `yewtu.be` |
| `youtube.com` | `invidious.tiekoetter.com` |

> You can add custom instances from the floating UI. To also run the UI on a custom host, add it to the `@match` lines in the script header.

## Changelog

<details>
<summary><strong>v2.7.0</strong> — Instance list update</summary>

- Replaced dead instance `invidious.nerdvpn.de` with `invidious.tiekoetter.com`
</details>

<details>
<summary><strong>v2.6.0</strong> — Redirect reliability</summary>

- `window.stop()` before redirect to prevent YouTube from blocking `window.location.replace()`
- Immediate redirect on page load (removed 1500 ms delay)
- Triple fallback: `replace()` → `href` → delayed `href`
</details>

<details>
<summary><strong>v2.5.0</strong> — SPA navigation support</summary>

- Detect YouTube SPA navigation via `yt-navigate-finish` event
- Intercept `history.pushState` and `history.replaceState`
- Listen to `popstate` for back/forward navigation
</details>

<details>
<summary><strong>v2.4.0 and earlier</strong></summary>

- Replaced `innerHTML = ''` with safe DOM clearing (Trusted Types / CSP)
- Stopped matching broad `*.youtube.com` hosts (e.g. `studio.youtube.com`)
- Fixed delete button handling for non-custom instance rows
</details>

## License

[MPL-2.0](LICENSE)
