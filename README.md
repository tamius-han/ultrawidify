# Ultrawidify — aspect ratio fixer for youtube and netflix

## TL;DR

If you own an ultrawide monitor, you have probably noticed that sometimes videos aren't encoded properly — they feature black bars on all four sides. This could happen because someone was incompetent (note: as far as youtube is concerned, improperly rendered videos might be due to youtube's implementation of certain new features). The extension kinda fixes that by doing this:

![Demo](img-demo/example-httyd2.png "Should these black bars be here? No [...] But an ultrawide user never forgets.")

Works (tested!) on Youtube and Netflix, but you can try your luck with other sites as well. Available for [Firefox](https://addons.mozilla.org/en/firefox/addon/ultrawidify/) and [Chrome](https://chrome.google.com/webstore/detail/ultrawidify/dndehlekllfkaijdlokmmicgnlanfjbi). Should support theater mode on youtube, iframes only supported on fullscreen.

Youtube demo of autodetection stuff can be found [here](https://www.youtube.com/watch?v=j2xn1WpbtCQ).

## Beggathon

Working on this extension takes time, coffee and motivation. If you want to buy me a beer or something, you can [use this link to send me motivation](https://www.paypal.me/tamius). **Any donations are well appreciated.**

## The long version

The technology has been here for a while, but plenty of people don't know how to properly encode a video (despite the fact [youtube has an article that explains aspect ratios](https://support.google.com/youtube/answer/6375112)). Plenty of people surprisingly includes major Holywood studios, such as [Marvel](https://www.youtube.com/watch?v=Ke1Y3P9D0Bc), [Disney](https://www.youtube.com/watch?v=yCOPJi0Urq4), [Dreamworks](https://www.youtube.com/watch?v=oKiYuIsPxYk), [Warner Brothers](https://www.youtube.com/watch?v=VYZ3U1inHA4), [Sony](https://www.youtube.com/watch?v=7BWWWQzTpNU), et cetera. You'd think that this is the one thing Holywood studios and people who make [music videos for a living](https://www.youtube.com/watch?v=c6Mx2mxpaCY) would know how to do right, but they don't. This extension is here to fix that.

![Jesus Christ.](img-demo/example-jasonbourne.png "This is indeed worse than Snowden.")

## Features

TL;DR:

* **Can be enabled or disabled on per-site basis**
* **Crop video to fit screen** (no stretching. Supported aspect ratios: 21/9 (1:2.39), 16:9, 16:10, _one custom aspect ratio_)
* **Automatic aspect ratio detection** (can be enabled/disabled entirely or on a per-site basis, separately of the extension)
* **[NEW in v3!] Stretch video to fit the screen** (4 different approaches)

Most settings are self-explanatory.

### Automatic aspect ratio detection

There's a few caveats to automatic aspect ratio detection. Namely, it only works on videos. If videos on the site are DRM-protected (e.g. Netflix), autodetection will not work unless you're using Firefox (and even then, no guarantees).


![Demo](img-demo/ui/popup/autoar.png)

Top row of buttons determines the default mode of operation for automatic detection.

* **Always** — works on all sites this extension is enabled on, unless autodetection is specifically disabled for that site. [Default]
* **Only on whitelisted sites** — autodetection only works on sites, on which autodetection is enabled.
* **Never** — turn aspect ratio detection off

Bottom row of buttons detemrmines the mode of operation for automatic detection for current site. 

* **Blacklist** — don't ever attempt automatic aspect ratio detection on this site
* **Default** — follow global rules. If default mode of operation is 'always', automatic aspect ratio detection will work on this site, otherwise it won't.
* **Whitelist** — perform automatic detection on given site, unless automatic aspec ratio detection is turned off 

'Check every ___ ms box determines how often the extension will check for aspect ratio changes. Longer periods will result in this extension using less system resources, but extension will be slow to detect changes. Short periods will increase the use of system resources. Periods shorter than 500 ms will significantly increase RAM and CPU usage. **Time periods shorter than 100 _will_ result in _massive_ RAM usage due to technical limitations of Javascript and canvas API. To give a solid example, setting this value to '30' ms can result in multiple _gigabytes_ of RAM used (personal record is 7 GB, but the number is very dependant on multiple factors, such as what browser are you using and how long the browser has been running. In Firefox 56, the amount of RAM used was correlated with amount of time the browser has been running).

By default, extension is set to check for aspect ratio changes once every 666 ms, as it turned out to be a decent compromise between RAM usage (generally well under 500 MB) and the time it takes extension to react to aspect ratio changes.




## Default keyboard shortcuts

`w`   - fit to width  
`e`   - fit to height  
`r`   - reset

`a`   - attempt to automatically determine the aspect ratio 

`s`   - force 16:9  
`d`   - force 21:9  
`x`   - force 18:9  

### About aspect ratio autodetection

Aspect ratio autodetection is achieved by performing some black magic every 30-something milliseconds. This currently can't be turned off by default. If this extension makes video sites lag too much, open an issue and include your hardware and OS — **this is important for me to know in order to better optimize autodetection.**.

Manually triggering aspect ratio change will suspend automatic aspect ratio detection for until the page is refreshed, although it'll maybe unsuspend itself when video is changed. I don't know for certain.

## Installing

### Permanent install / stable

[Latest stable for Firefox — download from AMO](https://addons.mozilla.org/en/firefox/addon/ultrawidify/)

[Latest stafle for Chrome — download from Chrome store](https://chrome.google.com/webstore/detail/ultrawidify/dndehlekllfkaijdlokmmicgnlanfjbi)

### Installing the current, github version

1. Clone this repo
2. Open up Firefox
3. Go to `about:debugging`
4. Add temporary addon
5. Browse to wherever you saved it and select manifest.json

## Known issues

* Netflix autodetection not working in Chrome, wontfix as issue is fundamentally unfixable. (Although a different kind of workaround could probably be put in place, but don't count on it)
* Everything reported in [issues](https://github.com/xternal7/ultrawidify/issues)

## Plans for the future

~~1. Handle porting of extension settings between versions. (Some people had some issues where extension broke until reinstalled, and corrupted settings seemed to be the problem.)~~ seems to work for me?
2. Reintroduce gradual zoom on z and u and provide a way to 'scroll' the zoomed in video up/down left/right
reintroduce settings page (rebindable keys, blacklist/whitelist management, some settings for automatic aspect ratio detection)
3. site-specific options for sites that require additional CSS classes or other hacks (see: vimeo, which is disabled)
4. figure the best way to do GUI (injecting buttons into the player bar is not a good way. Been there, done that, each site has its own way and some appear to be impossible). Might get bumped to be released alongside #2
5. Stretch mode, because some people are very salty and toxic about the fact that this extension is here to solve a problem that's different than the one they want. More salty than me rn.
6. Improvements to automatic aspect ratio detection

## Changelog

see changelog.md

todo: add link to changelog.md here