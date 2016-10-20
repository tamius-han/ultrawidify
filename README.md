# Ultrawidify — youtube aspect ratio fixer for firefox

## What does it do?

The technology has been here for a while, but plenty of people don't know how to properly encode a video (despite the fact [youtube has an article that explains aspect ratios](https://support.google.com/youtube/answer/6375112)). Plenty of people surprisingly includes major Holywood studios, such as [Marvel](https://www.youtube.com/watch?v=Ke1Y3P9D0Bc), [Disney](https://www.youtube.com/watch?v=yCOPJi0Urq4), [Dreamworks](https://www.youtube.com/watch?v=oKiYuIsPxYk), [Warner Brothers](https://www.youtube.com/watch?v=VYZ3U1inHA4), [Sony](https://www.youtube.com/watch?v=7BWWWQzTpNU), et cetera. You'd think that this is the one thing Holywood studios and people who make [music videos for a living](https://www.youtube.com/watch?v=c6Mx2mxpaCY) would know how to do right, but they don't. This extension is here to fix that.

### TL;DR: it does this:

![Should these black bars be here? No [...] But an ultrawide user never forgets.](img-demo/example-httyd2.png)

I'd demo with [Sintel](https://www.youtube.com/watch?v=eRsGyueVLvQ) but they encoded the video without the black bars. Thanks, Blender Foundation. 

This extension also allows you to zoom in or out of video (similar to how SMPlayer does it).

## Installing

### Temporary install

1. Clone this repo
2. Open up Firefox
3. Go to `about:debugging`
4. Add temporary addon
5. Browse to wherever you saved it and select manifest.json

### Permanent install

Download the extension from Mozilla's addon page.

[Experimental version](http://tamius.net/ultrawidify) — If 30 minutes old is stable enough for you, this is it. This version is pretty much code from this repo. It's also unlisted so I don't have to go through AMO for every minor change. **NOTE: AUTOUPDATING ISN'T IMPLEMENTED YET. You will have to update manually.** (tfw no https)

[Regular version](https://addons.mozilla.org/en/firefox/addon/ultrawidify/) — more stable and with AMO's approval. No experimental features either. **NOTE: AMO still hasn't approved this version. You won't be able to install it until they do.**

## How do I use it?

Here's the list of keybinds:

* `w` : fit to width (will crop top and bottom if video is taller than the display)
* `e` : fit to height (will crop left and right if video is wider than the display)
* `z` : zoom
* `u` : unzoom
* `r` : reset to default

As of version 0.9.6, there's also experimental feature that will try to force an aspect ratio for the video. You specify the aspect ratio of the video you're watching. Extension then looks at the actual aspect ratio of the video. If aspect ratios are different, extension assumes that video contains black borders and zooms in on the video, so the black bars are removed. For example: if the video you're watching is 4:3, but you specify it's actually 16:9, then the extension will zoom on 16:9 section inside that video. (Visual example is going to land soon, because I'm bad at explaining this).

Here's the list of keybinds:

* `s` : force 16:9¹ (1920/1080)
* `a` : force 16:10
* `d` : force 21:9¹ (2560/1080)
* `x` : force 4:3

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
* Adding buttons for actions in youtube's player
* ~~Adding an option to force specific aspect ratio~~ (now it's "experimental")
