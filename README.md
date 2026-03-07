# YouTube Invidious Redirector

Userscript to redirect YouTube video pages to an Invidious instance and manage preferred instances from a floating UI.

## Why this exists

- keep a simple redirect flow from YouTube to Invidious
- choose a default Invidious instance from the page itself
- add custom instances without editing the code
- return to YouTube from a supported Invidious instance

## Features

- automatic redirect from YouTube watch pages
- support for `watch` URLs and `shorts`
- floating draggable icon
- modal selector with default and custom instances
- persistent selected instance and icon position
- one-click return to YouTube on matched Invidious instances

## Install

1. Install a userscript manager such as Violentmonkey.
2. Open the raw script URL:
   `https://raw.githubusercontent.com/HALL4Y/youtube-invidious-redirector/main/youtube-to-invidious-efficient-auto-redirector.user.js`
3. Confirm installation in your userscript manager.

## Supported hosts

The script currently runs on:

- `www.youtube.com`
- `m.youtube.com`
- `youtube.com`
- `inv.nadeko.net`
- `yewtu.be`
- `invidious.nerdvpn.de`

Custom instances can be selected as redirect targets from YouTube. If you want the floating UI to also run on a custom Invidious host, add that host to the metadata matches in the script.

## Known fixes in this version

- replaced `innerHTML = ''` with safe DOM clearing to avoid YouTube Trusted Types / CSP failures in Firefox
- stopped matching broad `*.youtube.com` hosts such as `studio.youtube.com`
- fixed the delete button handling for non-custom instance rows

## License

MPL-2.0
