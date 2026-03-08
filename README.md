# YouTube Invidious Redirector

Userscript to redirect YouTube video pages to an Invidious instance and manage preferred instances from a floating UI.

## Why this exists

- keep a simple redirect flow from YouTube to Invidious
- choose a default Invidious instance from the page itself
- add custom instances without editing the code
- return to YouTube from a supported Invidious instance

## Features

- automatic redirect from YouTube watch pages (including SPA navigation)
- support for `watch` URLs and `shorts`
- floating draggable icon
- modal selector with default and custom instances
- persistent selected instance and icon position
- one-click return to YouTube on matched Invidious instances
- intercepts YouTube SPA navigation (`pushState`, `replaceState`, `yt-navigate-finish`)

## Install

1. Install a userscript manager such as [Violentmonkey](https://violentmonkey.github.io/), [Tampermonkey](https://www.tampermonkey.net/) or [Greasemonkey](https://www.greasespot.net/).
2. Click the link below to install:

   **[Install userscript](https://raw.githubusercontent.com/HALL4Y/youtube-invidious-redirector/main/youtube-to-invidious-efficient-auto-redirector.user.js)**

3. Confirm installation in your userscript manager.

## Supported hosts

The script currently runs on:

- `www.youtube.com`
- `m.youtube.com`
- `youtube.com`
- `inv.nadeko.net`
- `yewtu.be`
- `invidious.tiekoetter.com`

Custom instances can be selected as redirect targets from YouTube. If you want the floating UI to also run on a custom Invidious host, add that host to the `@match` lines in the script header.

## Changelog

### v2.7.0
- replaced dead instance `invidious.nerdvpn.de` with `invidious.tiekoetter.com`

### v2.6.0
- `window.stop()` before redirect to prevent YouTube from blocking `window.location.replace()`
- immediate redirect on page load (removed 1500 ms delay)
- triple fallback: `replace()` → `href` → delayed `href`

### v2.5.0
- detect YouTube SPA navigation via `yt-navigate-finish` event
- intercept `history.pushState` and `history.replaceState`
- listen to `popstate` for back/forward navigation

### v2.4.0 and earlier
- replaced `innerHTML = ''` with safe DOM clearing to avoid YouTube Trusted Types / CSP failures in Firefox
- stopped matching broad `*.youtube.com` hosts such as `studio.youtube.com`
- fixed the delete button handling for non-custom instance rows

## License

[MPL-2.0](LICENSE)
