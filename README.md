# Ultrawidify — youtube aspect ratio fixer for firefox

## What does it do?

The technology has been here for a while, but plenty of people don't know how to properly encode a video (despite the fact [youtube has an article that explains aspect ratios](https://support.google.com/youtube/answer/6375112)). Plenty of people surprisingly includes major Holywood studios, such as [Marvel](https://www.youtube.com/watch?v=Ke1Y3P9D0Bc), [Disney](https://www.youtube.com/watch?v=yCOPJi0Urq4), [Dreamworks](https://www.youtube.com/watch?v=oKiYuIsPxYk), [Warner Brothers](https://www.youtube.com/watch?v=VYZ3U1inHA4), [Sony](https://www.youtube.com/watch?v=7BWWWQzTpNU), et cetera. You'd think that this is the one thing Holywood studios and people who make [music videos for a living](https://www.youtube.com/watch?v=c6Mx2mxpaCY) would know how to do right, but they don't. This extension is here to fix that.

### TL;DR: it does this:

![Should these black bars be here? No [...] But an ultrawide user never forgets.](img-demo/example-httyd2.png)

I'd demo with [Sintel](https://www.youtube.com/watch?v=eRsGyueVLvQ) but they encoded the video without the black bars. Thanks, Blender Foundation. 

This extension also allows you to zoom in or out of video (similar to how SMPlayer does it).

## Installing

[Just install it from Mozilla's addon page](https://addons.mozilla.org/en/firefox/addon/ultrawidify/). I'm only showing the source here.

## How do I use it?

Here's the list of keybinds:

* `w` : fit to width (will crop top and bottom if video is taller than the display)
* `e` : fit to height (will crop left and right if video is wider than the display)
* `z` : zoom
* `u` : unzoom
* `r` : reset to default

## What works

More or less everything. Works regardless of whether the video is in fullscreen or not. Works regardless if the youtube video you're watching is embedded on some other page.

## What doesn't

On a very rare occasion, `w` button won't work. So far this behaviour was seen in [two](https://www.youtube.com/watch?v=eRsGyueVLvQ) [videos](https://www.youtube.com/watch?v=RYsPEl-xOv0) out of countless I've tried. In cases like this, use `z` to zoom instead.

## Plans for the future

* Adding custom keybinds
* Adding a proper settings page
* Adding buttons for actions in youtube's player
* Adding an option to force specific aspect ratio
