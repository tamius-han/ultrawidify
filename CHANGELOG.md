# Changelog

## v4.x

### Plans for the future

* Allow users to set autodetection sensitivity
* Settings page looks ugly af right now. Maybe fix it some time later

### v4.0.1 (current) 

* Fixed bug where sites using 'default' option in 'Extension mode' settings would be disabled, even if extension was not. 
* Fixed bug where extension sometimes wouldn't work on Netflix.

### v4.0.0 

* Fixed the bug where saving settings wouldn't work
* Massive under-the-hood changes. The extension popup and settings page use VueJS
* **Autodetection improvements:**
 * Autodetection tries to differentiate between gradients and hard edge and avoids correcting on gradients. This should help with videos that are similar to [IGN's review of Hollow Knight](https://www.youtube.com/watch?v=hg25ONutphA).
 * Black frame detection has been implemented and improved. Some cases (but not all) of text on black background causing aspect ratio corrections have also been fixed.
 * Autodetection frequency increased from roughly once every 0.6 seconds to about 3 checks per second.
 * Fixed the bug where autodetectin didn't calculate aspect ratio correctly. This bug would manifest in extension cropping too much even though the edge was clearly defined. It most commonly occured in videos of aspect ratio <1 that contained letterbox. [ex 1]( https://www.youtube.com/watch?v=9DP0TbOQcOw), [ex 2](https://www.reddit.com/r/videos/comments/a137pj/daily_reminder_that_shelly_miscavige_wife_of/)
 * Black frame detection has been implemented and improved. Some cases (but not all) of text on black background causing aspect ratio corrections have also been fixed.
* **Settings page was re-added**
  * This includes a page for adding new aspect ratios and keyboard shortcuts. This feature is experimental.
  * It's possible to tweak autodetection sensitivity and frequency.
  * It's also possible to tweak autodetection settings in detail.
  * It's now possible to reset settings to default  
* Rewrote keyboard shortcuts and changed how they're handled. Massively.
* You can now select which specific video on the page you control, provided each video is in its separate iframe
* While I wasn't looking, Netflix started supporting ultrawide monitors on its own. Netflix' implementation clashes with my own, though, so I've decided to disable autodetection on videos that netflix already cropped on their own. Manual aspect ratio changes are still possible, but they're off. You've been warned.

## v3.x

~~### v3.3.0~~

~~This will probably get promoted to 4.0, continuing the trend of version something.3 not happening. Eulul~~

* ~~Basic mode added~~
* ~~Per-site controls in popup (to control embedded videos)~~
* ~~Rewrote keyboard shortcuts and changed how they're handled. Massively.~~

Never happened, got bumped to 4.0.0.

### v3.2.2 

* Pan event listener now gets properly unbound
* Fixed 'reset zoom' button in popup

### v3.2.1

* Fixed issue where global video alignment setting didn't get saved properly

### v3.2.0 

* Zoom and panning
* Reorganized popup
* Various bug fixes

### v3.1.1 (Chrome-only)

* Logging was accidentally left on in release version. This was fixed.

### v3.1.0

* Fixed the issue where aspect ratio change wouldn't survive switching between fullscreen and non-fullscreen modes
* Fixed the issue where settings wouldn't survive browser restarts in Firefox

Under the hood:

* rewrote how settings work, swapped Comms with storage.onChanged where it made sense & as much as possible
* enabling/disabling extension (either globally or for a given site) has now instant effect (consequence of above)

### v3.0.1

Minor fixes.

### v3.0.0

Pretty much rewrote extension in more object-oriented way and sorted out spaghetti a little. Site settings and keybinds have been merged with the rest of the extension settings. Rewrote messageing.

User-facing changes:
* Extension can be enabled/disabled globally or on per-site basis
* Automatic aspect ratio can be turned off, either globally or on per-site basis
* Stretching mode implemented
* Popup has been pimped up to reflect those changes

## v2.x

### v2.2.5 (AMO, Chrome)

Added some anti-lag measures. This seems to be an issue affecting _only_ Chrome (and only then some installs), where canvas.drawImage() won't work properly for some reason.

### v2.2.4 

Lots of mostly incredibly minor stuff.

* Fixed issue where 21:9 videos with no letterbox would be zoomed in incorrectly in theater mode
* Added pillarbox basic pillarbox detection: extension will avoid zooming in a video if both letterbox and pillarbox are detected. This should fix the issues with incorrect zooming on certain kinds of images (such as movie titles and studio logos, e.g. [lucasfilm](https://i.ytimg.com/vi/H368H5cTqVM/maxresdefault.jpg) was one of the offenders).
* Fixed an issue where automatic detection would sometimes _not_ unzoom the video in cases where it clearly should
* Implemented some debugging tools for me. It's not much.
* Fixed some under-the-hood bugs nobody knew they even existed
* A lil bit of refactoring

### v2.2.3 

* Fixed automatic aspect ratio detection on DRM-protected sites.

### v2.2.2  

* Fixes problems with switching from normal to fullscreen player on youtube. If 2.2.1 didn't fix the font issue, this version should have.

### v2.2.1

* Fixes few chrome-specific fixes/bugs that v2.2.0 introduced. Maybe fixed the font problem.


### v2.2.0

Various improvements to automatic aspect ratio detection:

* **Fixed the situation with insane memory usage due to the automatic aspect ratio detection (#25, #32) and lag that appeared in certain cases after the extension has been running for a while.** There's still fun stuff going on — see notes below.
* Improved accuracy of automatic detection. This should fix the issue of rapid switching in dark videos or videos with otherwise uneven edges (#12 - [video](https://www.youtube.com/watch?v=NaTGwlfRB_c); #24 - [video](https://www.youtube.com/watch?v=xvZqHgFz51I) (see the car at the beginning))

Improved accuracy has increased the base RAM usage, and not by a small amount (I seem to have fixed my blunders, so that could _actually_ be on Firefox). As a result, I've reduced both resolution of the sample as well as polling frequency. 

Polling of 1 check per second shouldn't use too much RAM. If you want automatic aspect ratio detection to react faster, you can up that number to 30 in the settings. 30 checks per second can be expensive: up to 400 MB if you've just started Firefox and went to youtube. Can go north of 2 gigs if you've been running Firefox for longer than that (seems to be a problem with Javascript garbage collection). 

Videos that aren't playing (e.g. videos that are paused or ended) do (should) ***not*** use any meaningful amount of RAM.

* Overpass font is now bundled with this extension, meaning the popup should appear the way it was meant to appear™.


### v2.1.4

* Extension has been disabled on imgur (it was breaking gifs)

### v2.1.3

* Youtube pushed an update that broke this extension on Firefox (but not on Chrome?). This update fixes it.
* Extension disabled on reddit by default

Youtube fix seems to have broken Chrome compatibility (again), so any quick fix for this point forward will land in Chrome version along with v2.2.

### v2.1.2 

* Fixed some bugs with autodetection sometimes not working properly on Youtube.

Problem: there's this bit of code that keeps aspect ratio from changing when the difference between 'previous' and 'current' aspect ratio is too small. Unfortunately, the 'previous' value was _not_ updated on every aspect ratio switch for some reason. Also `ArDetect.init()` — for some reason — didn't always clean the 'previous' value even though it should. 

### v2.1.1

* Fixed issue #20 — aspect ratio autodetection should now start on subsequent videos as well.
* Netflix sometimes always showed 'no video detected' warning. Popup and background script now periodically poll for `hasVideos` property.

### v2.1.0 (Chrome)

* Popup should work more reliably now
* Twitch works ... kinda but not always

### v2.0.3 

* Fixed the bug where Netflix videos weren't vertically centered in Firefox 57+ (not present in Chrome or FF 56 or earlier)

### v2.0.2

v2.0.1, but UI in the extension button now also works in Chrome.

### v2.0.1

* Autodetection: aspect ratio is no longer corrected if the detected difference is too small to make a meaningful difference

### v2.0

* Completely rewritten
* Automatic aspect ratio detection works on Youtube _and_ Netflix
* Added popup for quick actions (serves as a replacement for player UI)
* Restored settings page for keybinds.

Getting automatic aspect ratio detection required some hacks, not sure how easy will be to port to chrome.

### v2.0a1

The extension is being rewritten almost ground-up, around automatic aspect ratio detection. By default, this extension now only works in fullscreen, but due to some simplification it should work on most sites. As direct result of this simplification:

* The UI is completely gone
* Ability to add custom sites has been scrapped (might get implemented later on if some sites are a bit more problematic
* Extension broken up between smaller files, this time the proper way
* Added "the impossible aspect ratio autodetection"
* Zoom/unzoom options are gone
* Can't customize keybinds yet

# v1.x

### v1.3a1

* Adding ability to add custom sites (in progress)
* Most of the extension is being completely rewritten to accomodate that feature, which means there's a serious regression with Netflix support (no netflix at the moment)
* I'm also trying to break the 1500 line behemoth into smaller files.

### v1.2.1

* Fixed the bugs which caused aspect ratio to not be calculated properly.
* Introduced further changes that allow me to not keep two separate version for Firefox and Chrome.

### v1.2.0

* Auto-aspect ratio detection on netflix
* initial port to Chrome

### v1.1.1

* Fixed zooming issue on netflix
* Ultrawidify shortcuts > youtube/netflix shortcuts
* Fixed 'settings' page
* Fixed 'settings' (wrench button) popup on youtube (it was broken by one of the previous updates)

### v1.1.0

* Introduced Netflix support.

As Netflix relies on extension re-initializing at least the UI ***a lot***, the optimization introduced in 1.0.2 was reversed (as waiting 2 seconds for the UI to appear is just too much). 

Furthermore, triggering UI re-initialisation on onUpdated events turned out to not be the proper way to go: immediately after the extension is initialized, onUpdated gets triggered even more often than your average Buzzfeed writer/reader. But change the episode on Netflix and suddenly, onUpdated gets barely triggered at all — which means that more often than not, the UI extension injects into the page wasn't visible. (the fuck, really)

This is why Netflix uses another function that manually checks whether the player bar is present. Ideally that check happens every tenth of a second, but Firefox may be limiting that to one per second.

### v1.0.2  

The 'extension sometimes not working' bug was fixed (by having extension try to setup every time a page got updated), but the fix had some problems. Namely, the extension would re-initiate (complete with re-adding the entire UI) itself very _very_ often. 

This could be a problem, so it was fixed. Extension is notified of updates only every ~2 seconds (which absorbs most of the "page was updated" events on page load) and doesn't attempt to reload the UI if the UI was already loaded. (Unless `debugmsg` is set to true. It's generally not, but any commits to this repo could potentially still have it enabled).

### v1.0.1

Fixed the bug where sometimes the extension would fail to work. (example: you opened youtube's search page in a brand new tab. You then opened a video from the search results (_not_ in a new tab). Extension wouldn't work at all in videos opened in that manner).

### v1.0.0

* Is pretty much rc1, except slightly different background image.

### v1.0-rc1

* Settings page is added and mostly working. 

### v0.9.9.6

* The issue with buttons not fitting in the control bar was resolved.

### v0.9.9.5

* Played with settings and localstorage a bit, but no clear implementation yet.
* Fixed some bugs caused by event propagation.
* All buttons in the player's control bar are now also in the settings popup.
* Had to scrap settings page in its current form
* TODO: sometimes not all buttons can fit in the control bar. Such occurences should be detected.

### v0.9.9.1

* Keybinds `a` and `w` now work. 
* Some changes under the bonnet, mostly regarding the way keypresses are handled.
* 'Settings' page is ~15% done.

### v0.9.9

* The aspect ratio thingy is now also in GUI
* Fixed code for forcing aspect ratio. At least I think it's fixed now.

### v0.9.8

* Added GUI/buttons on the player.
* Script now only loads on youtube pages (iframes included) (before, this script would run on any page)

### v0.9.7

* No new features added. Version number got incremented due to an attempt at autoupdating (which got foiled due to lack of HTTPS)

### v0.9.6

* Added experimental feature that tries to force an aspect ratio

### v0.9.1

* First version on GitHub (and on AMO) with basic features (zoom, fit to width, fit to height)
