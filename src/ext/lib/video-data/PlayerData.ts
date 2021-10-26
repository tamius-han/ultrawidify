import Debug from '../../conf/Debug';
import ExtensionMode from '../../../common/enums/ExtensionMode.enum'
import AspectRatioType from '../../../common/enums/AspectRatioType.enum';
import PlayerNotificationUi from '../uwui/PlayerNotificationUI';
import PlayerUi from '../uwui/PlayerUI';
import BrowserDetect from '../../conf/BrowserDetect';
import * as _ from 'lodash';
import { sleep } from '../../../common/js/utils';
import VideoData from './VideoData';
import Settings from '../Settings';
import Logger from '../Logger';
import EventBus from '../EventBus';

if (process.env.CHANNEL !== 'stable'){
  console.info("Loading: PlayerData.js");
}

interface PlayerDimensions {
  width?: number;
  height?: number;
  fullscreen?: boolean;
}

/**
 * accepts <video> tag (element) and list of names that can appear in id or class
 * returns player dimensions (width, height)
 * Theater mode is mildly broken on youtube. <video> tag remains bigger than the player after leaving the fullscreen mode, and
 * there's nothing we can do about that. This function aims to solve the problem by finding the player element that's wrapped around
 * the <video> tag.

 * In general, an outer tag should be bigger than the inner tag. Therefore the smallest element between <video> tag and the document
 * root should be the player.

 * If list of names is provided, the function returns dimensions of the first element that contains any name from the list in either
 * id or class.
 */

class PlayerData {
  private playerCssClass = 'uw-ultrawidify-player-css';

  //#region helper objects
  logger: Logger;
  videoData: VideoData;
  settings: Settings;
  notificationService: PlayerNotificationUi;
  eventBus: EventBus;
  //#endregion

  //#region HTML objects
  video: any;
  element: any;
  overlayNode: any;
  //#endregion

  //#region flags
  enabled: boolean;
  invalid: boolean = false;
  private periodicallyRefreshPlayerElement: boolean = false;
  halted: boolean = true;

  //#region misc stuff
  extensionMode: any;
  dimensions: PlayerDimensions;
  private playerIdElement: any;
  private observer: ResizeObserver;

  private ui: any;
  //#endregion

  /**
   * Gets player aspect ratio. If in full screen, it returns screen aspect ratio unless settings say otherwise.
   */
  get aspectRatio() {
    try {
      if (this.dimensions?.fullscreen && !this.settings.getSettingsForSite()?.usePlayerArInFullscreen) {
        return window.innerWidth / window.innerHeight;
      }

      return this.dimensions.width / this.dimensions.height;
    } catch (e) {
      console.error('cannot determine aspect ratio!', e);
      return 1;
    }
  }

  constructor(videoData) {
    try {
      this.logger = videoData.logger;
      this.videoData = videoData;
      this.video = videoData.video;
      this.settings = videoData.settings;
      this.eventBus = videoData.eventBus;
      this.extensionMode = videoData.extensionMode;
      this.invalid = false;
      this.element = this.getPlayer();

      this.notificationService = new PlayerNotificationUi(this.element, this.settings);
      this.ui = new PlayerUi(this.element, this.settings, this.eventBus);
      this.ui.init();

      this.dimensions = undefined;
      this.overlayNode = undefined;

      this.periodicallyRefreshPlayerElement = false;
      try {
        this.periodicallyRefreshPlayerElement = this.settings.active.sites[window.location.hostname].DOM.player.periodicallyRefreshPlayerElement;
      } catch (e) {
        // no biggie — that means we don't have any special settings for this site.
      }

      // this happens when we don't find a matching player element
      if (!this.element) {
        this.invalid = true;
        return;
      }

      if (this.extensionMode === ExtensionMode.Enabled) {
        this.trackDimensionChanges();
      }
      this.startChangeDetection();

    } catch (e) {
      console.error('[Ultrawidify::PlayerData::ctor] There was an error setting up player data. You should be never seeing this message. Error:', e);
      this.invalid = true;
    }

  }

  /**
   * Returns whether we're in fullscreen mode or not.
   */
  static isFullScreen(){
    const ihdiff = Math.abs(window.screen.height - window.innerHeight);
    const iwdiff = Math.abs(window.screen.width - window.innerWidth);

    // Chrome on linux on X on mixed PPI displays may return ever so slightly different values
    // for innerHeight vs screen.height abd innerWidth vs. screen.width, probably courtesy of
    // fractional scaling or something. This means we'll give ourself a few px of margin — the
    // window elements visible in not-fullscreen are usually double digit px tall
    return ( ihdiff < 5 && iwdiff < 5 );
  }


  /**
   *
   */
  trackDimensionChanges() {

    // get player dimensions _once_
    let currentPlayerDimensions;
    const isFullScreen = PlayerData.isFullScreen();

    if (isFullScreen) {
      currentPlayerDimensions = {
        width: window.innerWidth,
        height: window.innerHeight,
        fullscreen: true
      };
    } else {
      currentPlayerDimensions = {
        width: this.element.offsetWidth,
        height: this.element.offsetHeight,
        fullscreen: false,
      }
    }

    // if dimensions of the player box are the same as the last known
    // dimensions, we don't have to do anything
    if (
      this.dimensions
      && this.dimensions.width == currentPlayerDimensions.width
      && this.dimensions.height == currentPlayerDimensions.height
    ) {
      this.dimensions = currentPlayerDimensions;
      return;
    }

    // in every other case, we need to check if the player is still
    // big enough to warrant our extension running.

    this.handleSizeConstraints(currentPlayerDimensions);
    this.handleDimensionChanges(currentPlayerDimensions, this.dimensions);

    // Save current dimensions to avoid triggering this function pointlessly
    this.dimensions = currentPlayerDimensions;
  }


  /**
   * Handles size restrictions (if any)
   * @param currentPlayerDimensions
   */
  private handleSizeConstraints(currentPlayerDimensions: PlayerDimensions) {

    // never disable ultrawidify in full screen
    if (currentPlayerDimensions.fullscreen) {
      this.enable();
      return;
    }

    const restrictions = this.settings.getSettingsForSite()?.restrictions ?? this.settings.active?.restrictions;

    // if 'disable on small players' option is not enabled, the extension will run in any case
    if (!restrictions?.disableOnSmallPlayers) {
      this.enable();
      return;
    }

    // If we only allow ultrawidify in full screen, we disable it when not in full screen
    if (restrictions.onlyAllowInFullscreen && !currentPlayerDimensions.fullscreen) {
      this.disable();
      return;
    }

    // if current width or height are smaller than the minimum, the extension will not run
    if (restrictions.minAllowedHeight > currentPlayerDimensions?.height || restrictions.minAllowedWidth > currentPlayerDimensions?.width) {
      this.disable();
      return;
    }

    // in this case, the player is big enough to warrant enabling Ultrawidify
    this.enable();
  }


  private handleDimensionChanges(newDimensions: PlayerDimensions, oldDimensions: PlayerDimensions) {
    if (!this.enabled) {
      this.logger.log('info', 'debug', "[PlayerDetect] player size changed, but PlayerDetect is in disabled state. The player element is probably too small.");
      return;
    }

    // this 'if' is just here for debugging — real code starts later. It's safe to collapse and
    // ignore the contents of this if (unless we need to change how logging works)
    this.logger.log('info', 'debug', "[PlayerDetect] player size potentially changed.\n\nold dimensions:", oldDimensions, '\nnew dimensions:', newDimensions);

    // if size doesn't match, trigger onPlayerDimensionChange
    if (
      newDimensions?.width != oldDimensions?.width
      || newDimensions?.height != oldDimensions?.height
      || newDimensions?.fullscreen != oldDimensions?.fullscreen
    ){
      // If player size changes, we restore aspect ratio
      this.videoData.resizer?.restore();
    }
  }

  /**
   * Enables ultrawidify for this video by adding the relevant classes
   * to the video and player element.
   */
  enable() {
    this.enabled = true;
    this.element.classList.add(this.playerCssClass);
    this.startChangeDetection();
    this.videoData.enable({fromPlayer: true});
  }

  /**
   * Disables ultrawidify for this video by removing the relevant classes
   * from the video and player elements.
   *
   * NOTE: it is very important to keep change detection active while disabled,
   * because otherwise ultrawidify will otherwise remain inactive after
   * switching (back to) full screen.
   */
  disable() {
    this.enabled = false;
    this.element.classList.remove(this.playerCssClass);
    this.videoData.disable({fromPlayer: true});
  }


  onPlayerDimensionsChanged(mutationList?, observer?) {
    this.trackDimensionChanges();
  }

  destroy() {
    this.stopChangeDetection();
    this.destroyOverlay();
    this.notificationService?.destroy();
  }

  //#region player element change detection
  startChangeDetection(){
    if (this.invalid) {
      return;
    }

    try {
      if (BrowserDetect.firefox) {
        this.observer = new ResizeObserver(
          _.debounce(           // don't do this too much:
            this.onPlayerDimensionsChanged,
            250,                // do it once per this many ms
            {
              leading: true,    // do it when we call this fallback first
              trailing: true    // do it after the timeout if we call this callback few more times
            }
          )
        );
      } else {
        // Chrome for some reason insists that this.onPlayerDimensionsChanged is not a function
        // when it's not wrapped into an anonymous function
        this.observer = new ResizeObserver(
          _.debounce(           // don't do this too much:
            (m,o) => this.onPlayerDimensionsChanged(m,o),
            250,                // do it once per this many ms
            {
              leading: true,    // do it when we call this fallback first
              trailing: true    // do it after the timeout if we call this callback few more times
            }
          )
        );
      }

      const observerConf = {
        attributes: true,
        // attributeFilter: ['style', 'class'],
        attributeOldValue: true,
      };

      this.observer.observe(this.element);
    } catch (e) {
      console.error("failed to set observer",e )
    }
    // legacy mode still exists, but acts as a fallback for observers and is triggered less
    // frequently in order to avoid too many pointless checks
    this.legacyChangeDetection();
  }

  async legacyChangeDetection() {
    while (!this.halted) {
      await sleep(1000);
      try {
        this.forceRefreshPlayerElement();
      } catch (e) {
        console.error('[PlayerData::legacycd] this message is pretty high on the list of messages you shouldn\'t see', e);
      }
    }
  }

  doPeriodicPlayerElementChangeCheck() {
    if (this.periodicallyRefreshPlayerElement) {
      this.forceRefreshPlayerElement();
    }
  }

  stopChangeDetection(){
    this.observer.disconnect();
  }

  //#region interface
  makeOverlay() {
    if (!this.overlayNode) {
      this.destroyOverlay();
    }

    let overlay = document.createElement('div');
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.zIndex = '1000000000';
    overlay.style.pointerEvents = 'none';

    this.overlayNode = overlay;
    this.element.appendChild(overlay);
  }

  destroyOverlay() {
    if(this.playerIdElement) {
      this.playerIdElement.remove();
      this.playerIdElement = undefined;
    }
    if (this.overlayNode) {
      this.overlayNode.remove();
      this.overlayNode = undefined;
    }
  }

  markPlayer(name, color) {
    if (!this.overlayNode) {
      this.makeOverlay();
    }
    if (this.playerIdElement) {
      this.playerIdElement.remove();
    }
    this.playerIdElement = document.createElement('div');
    this.playerIdElement.innerHTML = `<div style="background-color: ${color}; color: #fff; position: absolute; top: 0; left: 0">${name}</div>`;

    this.overlayNode.appendChild(this.playerIdElement);
  }

  unmarkPlayer() {
    this.logger.log('info', 'debug', "[PlayerData::unmarkPlayer] unmarking player!", {playerIdElement: this.playerIdElement});
    if (this.playerIdElement) {
      this.playerIdElement.innerHTML = '';
      this.playerIdElement.remove();
    }
    this.playerIdElement = undefined;
  }
  //#endregion


  //#region helper functions
  collectionHas(collection, element) {
    for (let i = 0, len = collection.length; i < len; i++) {
      if (collection[i] == element) {
        return true;
      }
    }
    return false;
  }
  //#endregion

  getPlayer() {
    const host = window.location.hostname;
    let element = this.video.parentNode;
    const videoWidth = this.video.offsetWidth;
    const videoHeight = this.video.offsetHeight;
    const elementQ = [];
    const scorePenalty = 10;
    const sizePenaltyMultiplier = 0.1;
    let penaltyMultiplier = 0;
    let score;

    try {
      if(! element ){
        this.logger.log('info', 'debug', "[PlayerDetect::_pd_getPlayer] element is not valid, doing nothing.", element)
        if(this.element) {
          const ths = this;
        }
        this.element = undefined;
        this.dimensions = undefined;
        return;
      }

      // log the entire hierarchy from <video> to root
      if (this.logger.canLog('playerDetect')) {
        const logObj = [];
        logObj.push(`window size: ${window.innerWidth} x ${window.innerHeight}`);
        let e = element;
        while (e) {
          logObj.push({offsetSize: {width: e.offsetWidth, height: e.offsetHeight}, clientSize: {width: e.clientWidth, height: e.clientHeight}, element: e});
          e = e.parentNode;
        }
        this.logger.log('info', 'playerDetect', "\n\n[PlayerDetect::getPlayer()] element hierarchy (video->root)", logObj);
      }

      if (this.settings.active.sites[host]?.DOM?.player?.manual) {
        if (this.settings.active.sites[host]?.DOM?.player?.useRelativeAncestor
            && this.settings.active.sites[host]?.DOM?.player?.videoAncestor) {

          let parentsLeft = this.settings.active.sites[host].DOM.player.videoAncestor - 1;
          while (parentsLeft --> 0) {
            element = element.parentNode;
          }
          if (element) {
            return element;
          }
        } else if (this.settings.active.sites[host]?.DOM?.player?.querySelectors) {
          const allSelectors = document.querySelectorAll(this.settings.active.sites[host].DOM.player.querySelectors);
          // actually we'll also score this branch in a similar way we score the regular, auto branch
          while (element) {

            // Let's see how this works
            if (this.collectionHas(allSelectors, element)) {
              score = 100; // every matching element gets a baseline 100 points

              // elements that match the size get a hefty bonus
              if ( (element.offsetWidth >= videoWidth && this.equalish(element.offsetHeight, videoHeight, 2))
                || (element.offsetHeight >= videoHeight && this.equalish(element.offsetWidth, videoHeight, 2))) {
                  score += 75;
              }

              // elements farther away from the video get a penalty
              score -= (scorePenalty) * 20;

              // push the element on the queue/stack:
              elementQ.push({
                score: score,
                element: element,
              });
            }

            element = element.parentNode;
          }

          // log player candidates
          this.logger.log('info', 'playerDetect', 'player detect via query selector: element queue and final element:', {queue: elementQ, bestCandidate: elementQ.length ? elementQ.sort( (a,b) => b.score - a.score)[0].element : 'n/a'});

          if (elementQ.length) {
            // return element with biggest score
            // if video player has not been found, proceed to automatic detection
            const playerElement = elementQ.sort( (a,b) => b.score - a.score)[0].element;
            return playerElement;
          }
        }
      }

      // try to find element the old fashioned way

      while (element){
        // remove weird elements, those would break our stuff
        if ( element.offsetWidth == 0 || element.offsetHeight == 0){
          element = element.parentNode;
          continue;
        }

        // element is player, if at least one of the sides is as long as the video
        // note that we can't make any additional assumptions with regards to player
        // size, since there are both cases where the other side is bigger _and_ cases
        // where other side is smaller than the video.
        //
        // Don't bother thinking about this too much, as any "thinking" was quickly
        // corrected by bugs caused by various edge cases.
        if (
          this.equalish(element.offsetHeight, videoHeight, 5)
          || this.equalish(element.offsetWidth, videoWidth, 5)
        ) {
          score = 1000;

          // -------------------
          //     PENALTIES
          // -------------------
          //
          // Our ideal player will be as close to the video element, and it will als
          // be as close to the size of the video.

          // prefer elements closer to <video>
          score -= scorePenalty * penaltyMultiplier++;

          // the bigger the size difference between the video and the player,
          // the more penalty we'll incur. Since we did some grace ith
          let playerSizePenalty = 1;
          if ( element.offsetHeight > (videoHeight + 5)) {
            playerSizePenalty = (element.offsetWidth - videoHeight) * sizePenaltyMultiplier;
          }
          if ( element.offsetWidth > (videoWidth + 5)) {
            playerSizePenalty *= (element.offsetWidth - videoWidth) * sizePenaltyMultiplier
          }

          score -= playerSizePenalty;

          elementQ.push({
            element: element,
            score: score,
          });
        }

        element = element.parentNode;
      }

      // log player candidates
      this.logger.log('info', 'playerDetect', 'player detect, auto/fallback: element queue and final element:', {queue: elementQ, bestCandidate: elementQ.length ? elementQ.sort( (a,b) => b.score - a.score)[0].element : 'n/a'});

      if (elementQ.length) {
        // return element with biggest score
        const playerElement = elementQ.sort( (a,b) => b.score - a.score)[0].element;

        return playerElement;
      }

      // if no candidates were found, something is obviously very, _very_ wrong.
      // we return nothing. Player will be marked as invalid and setup will stop.
      // VideoData should check for that before starting anything.
      this.logger.log('warn', 'debug', '[PlayerData::getPlayer] no matching player was found for video', this.video, 'Extension cannot work on this site.');
      return;
    } catch (e) {
      this.logger.log('crit', 'debug', '[PlayerData::getPlayer] something went wrong while detecting player:', e, 'Shutting down extension for this page');
    }
  }

  equalish(a,b, tolerance) {
    return a > b - tolerance && a < b + tolerance;
  }

  forceRefreshPlayerElement() {
    this.element = this.getPlayer();
    this.notificationService?.replace(this.element);
    this.trackDimensionChanges();
  }

  showNotification(notificationId) {
    this.notificationService?.showNotification(notificationId);
  }

  /**
   * NOTE: this method needs to be deleted once Edge gets its shit together.
   */
  showEdgeNotification() {
    // if (BrowserDetect.isEdgeUA && !this.settings.active.mutedNotifications?.browserSpecific?.edge?.brokenDrm?.[window.hostname]) {
    //   this.ui = new PlayerUi(this.element, this.settings);
    // }
  }
}

if (process.env.CHANNEL !== 'stable'){
  console.info("PlayerData loaded");
}

export default PlayerData;
