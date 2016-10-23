# Ultrawidify — youtube aspect ratio fixer for firefox

## What does it do?

The technology has been here for a while, but plenty of people don't know how to properly encode a video (despite the fact [youtube has an article that explains aspect ratios](https://support.google.com/youtube/answer/6375112)). Plenty of people surprisingly includes major Holywood studios, such as [Marvel](https://www.youtube.com/watch?v=Ke1Y3P9D0Bc), [Disney](https://www.youtube.com/watch?v=yCOPJi0Urq4), [Dreamworks](https://www.youtube.com/watch?v=oKiYuIsPxYk), [Warner Brothers](https://www.youtube.com/watch?v=VYZ3U1inHA4), [Sony](https://www.youtube.com/watch?v=7BWWWQzTpNU), et cetera. You'd think that this is the one thing Holywood studios and people who make [music videos for a living](https://www.youtube.com/watch?v=c6Mx2mxpaCY) would know how to do right, but they don't. This extension is here to fix that.

### TL;DR: it does this:

![Demo](img-demo/example-httyd2.png "Should these black bars be here? No [...] But an ultrawide user never forgets.")

I'd demo with [Sintel](https://www.youtube.com/watch?v=eRsGyueVLvQ) but they encoded the video without the black bars. ~~Thanks, Blender Foundation.~~ Actually they're not off the hook.

This extension also allows you to zoom in or out of video (similar to how SMPlayer does it).

## Installing

### Temporary install

1. Clone this repo
2. Open up Firefox
3. Go to `about:debugging`
4. Add temporary addon
5. Browse to wherever you saved it and select manifest.json

### Permanent install

[v0.9.9 — Experimental version — download from here](http://tamius.net/ultrawidify) — If 30 minutes old is stable enough for you, this is it. This version is pretty much code from this repo. It's also unlisted so I don't have to go through AMO for every minor change. It hasn't been tested whether autoupdating works.

[v0.9.1 — Regular version — download from AMO](https://addons.mozilla.org/en/firefox/addon/ultrawidify/) — more stable and with AMO's approval. No experimental features either.

**NOTE:** Have only one version of the extension running at a time. Don't run both at the same time.

## How do I use it?

This is the interface (**NOTE: AMO version doesn't have buttons yet!**):

![GUI buttons - ELI5](img-demo/interface-explained.jpg "If you know me and came looking for the obligatory »it's a wyvern, not a dragon« comment ... well, you just found it.")

And that's the keybinds for the actions displayed:

* `w` : fit to width (will crop top and bottom if video is taller than the display)
* `e` : fit to height (will crop left and right if video is wider than the display)
* `z` : zoom
* `u` : unzoom
* `r` : reset to default

As of version 0.9.6, there's also experimental feature that will try to force an aspect ratio for the video. You specify the aspect ratio of the video you're watching. Extension then looks at the actual aspect ratio of the video. If aspect ratios are different, extension assumes that video contains black borders and zooms in on the video, so the black bars are removed. For example: if the video you're watching is 4:3, but you specify it's actually 16:9, then the extension will zoom on 16:9 section inside that video. 

As of 0.9.9, option to force aspect ratio is available from settings. That's this button:

![Settings](img-demo/interface-settings.jpg "If I ever found out that the video I'm in is 21:9, but encoded as 16:9 + black bars, I'd probably consider killing myself as well.")

If you can read this, you'll probably figure out the rest of the way.

¹These ratios are calculated using the number in the brackets, as 1920/1080 does not strictly equal to 16/9 (same goes for 21:9).

**Please note that these keybindings could change at any time, and some definitely will** (apparently some of them conflict with youtube player)**.** I'll try to get them sorted out by the end of october.

## What works

More or less everything. Works regardless of whether the video is in fullscreen or not. Works regardless if the youtube video you're watching is embedded on some other page.

## What doesn't

On a very rare occasion, `w` button won't work. So far this behaviour was seen in [two](https://www.youtube.com/watch?v=eRsGyueVLvQ) [videos](https://www.youtube.com/watch?v=RYsPEl-xOv0) out of countless I've tried. In cases like this, use `z` to zoom instead.

Keybind `a` just doesn't work at all, so no 16:10.

## Plans for the future

* Adding custom keybinds
* Adding a proper settings page
* ~~Adding buttons for actions in youtube's player~~ (kinda done)
* ~~Adding an option to force specific aspect ratio~~ (now it's "good enough")

## Changelog

###v0.9.1

* First version on GitHub (and on AMO) with basic features (zoom, fit to width, fit to height)

###v0.9.6

* Added experimental feature that tries to force an aspect ratio

###v0.9.7

* No new features added. Version number got incremented due to an attempt at autoupdating (which got foiled due to lack of HTTPS)

###v0.9.8

* Added GUI/buttons on the player.
* Script now only loads on youtube pages (iframes included) (before, this script would run on any page)

###v0.9.9

* The aspect ratio thingy is now also in GUI
* Fixed code for forcing aspect ratio. At least I think it's fixed now.
