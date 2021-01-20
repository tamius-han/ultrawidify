# Changelog



### Plans for the future

* Native builds for Chromium Edge
* Settings page looks ugly af right now. Maybe fix it some time later
* other bug fixes

## v5.0 (planned major)

 * WebGL autodetection
 * in-player GUI
 * Fix UI logger

## v4.x (current major)

### v4.5.2

* Fixed the issue where videos would sometimes get misaligned while using hybrid stretch, except for real this time. ([#125](https://github.com/tamius-han/ultrawidify/issues/125))
* Improved DRM detection (the 'autodetection cannot work on this site' popup should now no longer show up on the sites where autodetection _can_ work)

### v4.5.1

* Fixed the misalignment issue on netflix ... hopefully.
* 'Site settings' tab should now work in Chrome as well ([#126](https://github.com/tamius-han/ultrawidify/issues/126))
* Popup interface now refreshes properly ([#127](https://github.com/tamius-han/ultrawidify/issues/127))
* Videos should now be scaled correctly when the display is narrower than video's native aspect ratio ([#118](https://github.com/tamius-han/ultrawidify/issues/118))
* Fullscreen videos on streamable are aligned correctly ([#116](https://github.com/tamius-han/ultrawidify/issues/118)).
* **[4.5.1.1]** Streamable fix broke old.reddit + RES on embeds from v.redd.it and streamable.com. We're now using an alternative implementation. ([#128](https://github.com/tamius-han/ultrawidify/issues/128))
* **[4.5.1.2]** Fixed the issue where videos would sometimes get misaligned while using hybrid stretch. ([#125](https://github.com/tamius-han/ultrawidify/issues/125))
* **[4.5.1.3]** Added fix for disney plus
* **[4.5.1.3]** Microsoft Edge has fixed the bugs that prevented the extension from working properly. Popup should no longer be shown.


### v4.5.0 (Current)

* Under the hood: migrated from vue2 to vue3, because optional chaining in templates is too OP.
* (On options page, section 'Action &amp; shortcuts') Manual aspect ratio now supports entering custom ratios using '21/9' and '2.39:1' formats (as opposed to single number, e.g. '2.39') — [#121](https://github.com/tamius-han/ultrawidify/issues/121).
* Added config for wakanim.tv (special thanks to @saschanaz for doing the legwork — [#113](https://github.com/tamius-han/ultrawidify/issues/113))
* (In Firefox) When extension was placed in overflow menu, the popup was cut off. That should be fixed now. [#119](https://github.com/tamius-han/ultrawidify/issues/119)
* The extension will now show a notification when autodetection can't run due to DRM
* Videos on facebook and reddit no longer get shifted up and to the left for me (cropping most of the video off-screen), but I haven't been deliberately trying to fix that issue. If you experience that issue, please consider contacting me (via github or email) with a link to a problematic video.

### v4.4.10 

* Video alignment should now work on Twitch — [#109](https://github.com/tamius-han/ultrawidify/issues/109)
* Videos should now align properly on Hulu while cropped — [#111](https://github.com/tamius-han/ultrawidify/issues/111) & via email
* Fixed a problem where changing certain settings would cause multiple instances of Ultrawidify to run on a page, effectively preventing some crop options to be set until reload. (possibly [#112](https://github.com/tamius-han/ultrawidify/issues/112)?)
* Fixed a problem where embedded videos would be misaligned after switching from full screen
* **[4.4.10.1]** Fixed cruncyhroll regression — [#109](https://github.com/tamius-han/ultrawidify/issues/115)

### v4.4.9

* Fixed the youtube alignment issue (previously fixed in v4.4.7.1-2), but this time for real (and in a bit more proper way)
* Fixed the bug where extension wouldn't work when URL specified a port (e.g. www.example.com:80)
* **[4.4.9.1]** removed source files from extension build in order to decrease package size
* **[4.4.9.2]** updated dependencies and stuff

In addition to that, as of 4.4.9.1 the build process ensures removal of `node_modules` before building the extension so we can have reproducible builds except for real this time. Hopefully.

### v4.4.8

* Fixed the bug where on pages with more than one video, the list of available videos in the extension popup wouldn't remove videos that are no longer displayed on site. This resulted in extension listing videos that were no longer on the page. Reboot or navigation would also not clear the list if navigating between various pages on the same host.
* Fixed the chrome-only bug where on sites with more than one video, the number wouldn't get hidden when the extension popup closed.

### v4.4.7

* Removed unnecessary font files and image files from the package.
* LoggerUI is now functional.
* **[4.4.7.1]** Additional CSS fixes
* **[4.4.7.1]** Bruteforce fix for youtube alignment issue
* **[4.4.7.2]** Bruteforce fix for youtube alignment issue — increase number of retries

### v4.4.6

* Ensured that Vue part of the content script (logger UI) only loads when necessary in order to fix breakage on certain sites (#96).
* Disabling (or enabling, if running in whitelist-only mode) specific sites used to not work (#91). This issue appears to have been fixed.
* Default stretch mode for sites is now probably being observed, too (#94).
* Fixed netflix (and possibly disney+ )
* It's been almost a month and Chrome Web Store still hasn't finished the review of the 4.4.4.1 (and 4.4.4.2) revisions because when it comes to incompetence, it's hard to expect anything less from Google. I've did some proverbial yelling at the support in hopes that Chrome version will finally see an update (disclaimer: when I said yelling I really mean a polite request, because support staff doesn't deserve abuse because a different department is utter shite at doing their jobs).

### v4.4.5 

* Extension no longer requires `allTabs` and `webNavigation` permissions
* Some CSS on the debugger popup was not scoped, causing issues with some sites.
* Fix some additional issues with video alignment when changing video on autoplay

### v4.4.4

* Tab detection in extension popup has been made more accurate
* QoL: Added user-accessible logger (to make fixing sites I can't access a bit easier)
* Changed links to reflect my github username change
* **[4.4.4.1]** Fix broken extension popup.
* **[4.4.4.1]** Fix global/site settings not getting applied immediately/only getting applied after page reload.
* **[4.4.4.2]** Fix problem with video being offset while switching between full screen and non-fullscreen non-theater mode on Youtube

### v4.4.3

* Fixed conf patch for disney+ (hopefully) (v4.4.3.1: but for real)
* `Settings.save()` adds missing values to site config when saving extension configuration.

### v4.4.2

* New stretching modes that squish video to a specified aspect ratio. One of the two modes correct aspect ratio before cropping, the other corrects after cropping.
* Potential fix for disney+ — added an option that forces extension to force player re-detection.
* Fixed bug where certain custom actions that should be removable weren't removable

### v4.4.1

* Changes to player detection that fix issues with vk
* Extension tries to avoid setting aspect ratio pointlessly
* (Hopefully) fixed mailto: and reddit compose links. 
* When reporting bugs, email/reddit template now automatically gathers browser, extension version and OS.

### v4.4.0

* Russian users (and users of other non-latin keyboard layouts) can now use keyboard shortcuts by default, without having to rebind them manually. (NOTE: if you've changed keyboard shortcuts manually, this change will ***NOT*** be applied to your configuration.)
* NOTE: when using non-latin layouts, 'zoom' shortcut (`z` by default) uses the position of 'Y' on QWERTY layout.
* Ability to preserve aspect ratio between different videos (applies to current page and doesn't survive proper page reloads)
* Changing aspect ratio now resets zooming and panning.
* Fixed bug where keyboard shortcuts would work while typing in certain text fields
* Fixed minor bug with autodetection
* **[4.4.0.1]** fixed mailto and reddit compose links. When reporting issues via e-mail or reddit, extension version, browser
and OS are automatically included in email/reddit template.

### v4.3.1

* Minor rework of settings page (actions & shortcuts section)
* Fixed bug that prevented settings page from opening
* **[4.3.1.1]** quick patch for twitch.tv

### v4.3.0

* Fixed some issues with incorrect alignment after window resize
* Fixed all sorts of issues for videos hosted on v.reddit for new (and old) reddit
* Fixed the issue where setting extension to 'whitelist only' would disable 'site settings' in popup.
* Added user-friendly way to export/import settings (export requires 'download' permissions)
* Reworked logging
* Started using mutation observers to watch for changes in player size as well. Since mutation observers aren't entirely reliable, old way of doing things is still somewhat present as a backup way, but runs less frequently.
* Implemented/improved/fixed settings patching
* **[4.3.0.1]** Removed some console.logs that I missed the first time around.
* **[4.3.0.2]** Extension would not work for new users. (Special thanks to [ezzak](https://github.com/ezzak) for finding and submitting a patch)

### v4.2.4 / 4.2.4.x

* Improvements to player detection. More details in the [blog post](https://stuff.tamius.net/sacred-texts/2019/08/31/ultrawidify-and-the-improper-cropping/).
* **[4.2.4.1]** Fixed default video settings for reddit
* **[4.2.4.1]** Manually specified query selectors will also be checked for compliance with player detection rules.
* **[4.2.4.2]** Additional bugfixes. Updated/fixed default settings.

### v4.2.3 / 4.2.3.x
* Fixed twitchy behaviour on Twitch, Facebook and Twatter. Here's a [blog post](https://stuff.tamius.net/sacred-texts/2019/08/24/ultrawidify-the-twitchy-twitch-problem/) that covers the issue in more detail.
* Cropping now uses user styles (as opposed to modifying element's style attribute)
* Fixed the issue where one-pixel letterbox would result in constant aspect ratio corrections.
* Started using mutation observers to watch for anything modifying the size of our video.
* **[4.2.3.1]** fixed some bugs in popup.

### v4.2.2 

* Fixed player detection on reddit (for videos from v.reddit)

### v4.2.1
* Fixed bug where custom CSS didn't get applied to pages

### v4.2.0 

* Slightly improved popup design. (Design change suggested by PortaTrekos)
* Player detection: youtube and twitch now have manual player element detection, with strictly defined players. 
* Improved site settings control in extension popup. It's possible to enable extension for previously disabled embedded sites.
* Improved incompatibilities with reddit, where videos would be vertically misaligned when not using RES
* Fixed imcompatibilities with Iridium. Flicker when clicking play/pause or switching between big and popup player is caused by either Youtube or Iridium trying to apply their styles over mine.
* Issues with inconsistent alignment that some people reported are potentially fixed

### v4.1.2 

* Fixed video alignment issues on www.reddit as well (for people who use old reddit without going to old.reddit)
* Fixed bug with 'player detection' tab

### v4.1.1

* Disabled gfycat

### v4.1.0

* Added ability to add custom CSS to page
* Fixed video alignment issues on old.reddit. Disabled extension on imgur by default. 
* Extension now works on vimeo again
* **UX:** Renamed 'about' to 'report a problem' in order to make contact info more discoverable


### v4.0.1

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
* **Settings page was re-added**
  * This includes a page for adding new aspect ratios and keyboard shortcuts. This feature is experimental.
  * It's possible to tweak autodetection sensitivity and frequency — in slightly more user-friendly way as well
  * It's also possible to tweak autodetection settings in detail.
  * It's now possible to reset settings to default
* Rewrote keyboard shortcuts and changed how they're handled. Massively.
* You can now select which specific video on the page you control, provided each video is in its separate iframe
* While I wasn't looking, Netflix started supporting ultrawide monitors on its own. Netflix' implementation clashes with my own, though, so I've decided to disable autodetection on videos that netflix already cropped on their own. Manual aspect ratio changes are still possible, but they're off. You've been warned.

## v3.x

~~### v3.3.0~~

~~This will probably get promoted to 4.0, continuing the trend of version something. 3 not happening. Eulul~~

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
