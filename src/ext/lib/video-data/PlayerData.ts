import Debug from '../../conf/Debug';
import ExtensionMode from '../../../common/enums/ExtensionMode.enum'
import AspectRatioType from '../../../common/enums/AspectRatioType.enum';
import PlayerNotificationUi from '../uwui/PlayerNotificationUI';
import BrowserDetect from '../../conf/BrowserDetect';
import * as _ from 'lodash';
import { sleep } from '../../../common/js/utils';
import VideoData from './VideoData';
import Settings from '../Settings';
import Logger from '../Logger';
import EventBus from '../EventBus';
import UI from '../uwui/UI';
import { SiteSettings } from '../settings/SiteSettings';

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
  siteSettings: SiteSettings;
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
  isFullscreen: boolean = !!document.fullscreenElement;
  isTheaterMode: boolean = false;  // note: fullscreen mode will count as theaterMode if player was in theater mode before fs switch. This is desired, so far.

  //#region misc stuff
  extensionMode: any;
  dimensions: PlayerDimensions;
  private playerIdElement: any;
  private observer: ResizeObserver;

  private ui: any;

  elementStack: any[] = [];
  //#endregion

  //#region event bus configuration
  private eventBusCommands = {
    'get-player-tree': [{
      function: () => this.handlePlayerTreeRequest()
    }],
    'set-mark-element': [{      // NOTE: is this still used?
      function: (data) => this.markElement(data)
    }],
    'update-player': [{
      function: () => this.getPlayer()
    }],
  }
  //#endregion

  /**
   * Gets player aspect ratio. If in full screen, it returns screen aspect ratio unless settings say otherwise.
   */
  get aspectRatio() {
    try {
      if (this.isFullscreen) {
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
      this.siteSettings = videoData.siteSettings;
      this.eventBus = videoData.eventBus;
      this.invalid = false;
      this.element = this.getPlayer();
      this.initEventBus();

      // this.notificationService = new PlayerNotificationUi(this.element, this.settings, this.eventBus);
      this.ui = new UI('ultrawidifyUi', {parentElement: this.element, eventBus: this.eventBus});
      // this.ui.init();

      this.dimensions = undefined;
      this.overlayNode = undefined;

      this.periodicallyRefreshPlayerElement = false;
      try {
        this.periodicallyRefreshPlayerElement = this.siteSettings.data.currentDOMConfig.periodicallyRefreshPlayerElement;
      } catch (e) {
        // no biggie — that means we don't have any special settings for this site.
      }

      // this happens when we don't find a matching player element
      if (!this.element) {
        this.invalid = true;
        return;
      }


      this.trackDimensionChanges();
      this.startChangeDetection();

    } catch (e) {
      console.error('[Ultrawidify::PlayerData::ctor] There was an error setting up player data. You should be never seeing this message. Error:', e);
      this.invalid = true;
    }
  }

  private initEventBus() {
    for (const action in this.eventBusCommands) {
      for (const command of this.eventBusCommands[action]) {
        this.eventBus.subscribe(action, command);
      }
    }
  }

  /**
   * Detects whether player element is in theater mode or not.
   * If theater mode changed, emits event.
   * @returns whether player is in theater mode
   */
  private detectTheaterMode() {
    const oldTheaterMode = this.isTheaterMode;
    const newTheaterMode = this.equalish(window.innerWidth, this.element.offsetWidth, 32);

    this.isTheaterMode = newTheaterMode;

    // theater mode changed
    if (oldTheaterMode !== newTheaterMode) {
      if (newTheaterMode) {
        this.eventBus.send('player-theater-enter', {});
      } else {
        this.eventBus.send('player-theater-exit', {});
      }
    }

    return newTheaterMode;
  }

  /**
   *
   */
  trackDimensionChanges() {
    // get player dimensions _once_
    let currentPlayerDimensions;

    if (this.isFullscreen) {
      currentPlayerDimensions = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    } else {
      currentPlayerDimensions = {
        width: this.element.offsetWidth,
        height: this.element.offsetHeight
      };

      this.detectTheaterMode();
    }

    // if dimensions of the player box are the same as the last known
    // dimensions, we don't have to do anything
    if (
      this.dimensions?.width == currentPlayerDimensions.width
      && this.dimensions?.height == currentPlayerDimensions.height
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
    // if (this.isFullscreen) {
    //   this.enable();
    //   return;
    // }

    // if 'disable on small players' option is not enabled, the extension will run in any case
    // if (!restrictions?.disableOnSmallPlayers) {
    //   this.enable();
    //   return;
    // }

    // If we only allow ultrawidify in full screen, we disable it when not in full screen
    // if (restrictions.onlyAllowInFullscreen && !currentPlayerDimensions.fullscreen) {
    //   this.disable();
    //   return;
    // }

    // if current width or height are smaller than the minimum, the extension will not run
    // if (restrictions.minAllowedHeight > currentPlayerDimensions?.height || restrictions.minAllowedWidth > currentPlayerDimensions?.width) {
    //   this.disable();
    //   return;
    // }

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
            () => this.onPlayerDimensionsChanged,
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

  equalish(a,b, tolerance) {
    return a > b - tolerance && a < b + tolerance;
  }
  //#endregion

  /**
   * Finds and returns HTML element of the player
   */
  getPlayer(options?: {verbose?: boolean}) {
    const host = window.location.hostname;
    let element = this.video.parentNode;
    const videoWidth = this.video.offsetWidth;
    const videoHeight = this.video.offsetHeight;
    let playerCandidate;

    const elementStack: any[] = [{
      element: this.video,
      type: 'video',
      tagName: 'video',
      classList: this.video.classList,
      id: this.video.id,
    }];

    // first pass to generate the element stack and translate it into array
    while (element) {
      elementStack.push({
        element,
        tagName: element.tagName,
        classList: element.classList,
        id: element.id,
        width: element.offsetWidth,     // say no to reflows, don't do element.offset[width/height]
        height: element.offsetHeight,   // repeatedly ... let's just do it once at this spot
        heuristics: {},
      });
      element = element.parentElement;
    }
    this.elementStack = elementStack;

    const playerQs = this.siteSettings.getCustomDOMQuerySelector('player');
    const playerIndex = this.siteSettings.getPlayerIndex();

    if (playerQs) {
      playerCandidate = this.getPlayerQs(playerQs, elementStack, videoWidth, videoHeight);
    } else if (playerIndex) { // btw 0 is not a valid index for player
      playerCandidate = elementStack[playerIndex];
    }

    if (playerCandidate) {
      if (options?.verbose) {
        this.getPlayerAuto(elementStack, videoWidth, videoHeight);
        playerCandidate.heuristics['activePlayer'] = true;
      }
      return playerCandidate.element;
    } else {
      const playerCandidate = this.getPlayerAuto(elementStack, videoWidth, videoHeight);
      playerCandidate.heuristics['activePlayer'] = true;
      return playerCandidate.element;
    }
  }

  /**
   * Gets player based on some assumptions, without us defining shit.
   * @param elementStack
   * @param videoWidth
   * @param videoHeight
   * @returns
   */
  private getPlayerAuto(elementStack: any[], videoWidth, videoHeight) {
    let penaltyMultiplier = 1;
    const sizePenaltyMultiplier = 0.1;
    const perLevelScorePenalty = 10;

    for (const element of elementStack) {

      // ignore weird elements, those would break our stuff
      if (element.width == 0 || element.height == 0) {
        element.heuristics['invalidSize'] = true;
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
        this.equalish(element.height, videoHeight, 5)
        || this.equalish(element.width, videoWidth, 5)
      ) {
        let score = 1000;

        // -------------------
        //     PENALTIES
        // -------------------
        //
        // Our ideal player will be as close to the video element, and it will als
        // be as close to the size of the video.

        const diffX = (element.width - videoWidth);
        const diffY = (element.height - videoHeight);

        // we have a minimal amount of grace before we start dinking scores for
        // mismatched dimensions. The size of the dimension mismatch dink is
        // proportional to area rather than circumference, meaning we multiply
        // x and y dinks instead of adding them up.
        let playerSizePenalty = 1;
        if (diffY > 5) {
          playerSizePenalty *= diffY * sizePenaltyMultiplier;
        }
        if (diffX > 5) {
          playerSizePenalty *= diffX * sizePenaltyMultiplier;
        }
        score -= playerSizePenalty;

        // we prefer elements closer to the video, so the score of each potential
        // candidate gets dinked a bit
        score -= perLevelScorePenalty * penaltyMultiplier;

        element.autoScore = score;
        element.heuristics['autoScoreDetails'] = {
          playerSizePenalty,
          diffX,
          diffY,
          penaltyMultiplier
        }

        // ensure next valid candidate is gonna have a harder job winning out
        penaltyMultiplier++;
      }
    }

    let bestCandidate: any = {autoScore: -99999999, initialValue: true};
    for (const element of elementStack) {
      if (element.autoScore > bestCandidate.autoScore) {
        bestCandidate = element;
      }
    }
    if (bestCandidate.initialValue) {
      bestCandidate = null;
    } else {
      bestCandidate.heuristics['autoMatch'] = true;
    }

    return bestCandidate;
  }

  /**
   * Gets player element based on a query string.
   *
   * Since query string does not necessarily uniquely identify an element, this function also
   * tries to evaluate which candidate of element that match the query selector is the most
   * likely the one element we're looking for.
   *
   * Function prefers elements that are:
   *      1. closer to the video
   *      2. about the same size as the video
   *      3. they must appear between video and root of the DOM hierarchy
   *
   * @param queryString query string for player element
   * @param elementStack branch of DOM hierarchy that ends with a video
   * @param videoWidth width of the video
   * @param videoHeight height of the video
   * @returns best candidate or null, if nothing in elementStack matches our query selector
   */
  private getPlayerQs(queryString: string, elementStack: any[], videoWidth, videoHeight) {
    const perLevelScorePenalty = 10;
    let penaltyMultiplier = 0;

    const allSelectors = document.querySelectorAll(queryString);

    for (const element of elementStack) {
      if (this.collectionHas(allSelectors, element.element)) {
        let score = 100;

        // we award points to elements which match video size in one
        // dimension and exceed it in the other
        if (
          (element.width >= videoWidth && this.equalish(element.height, videoHeight, 2))
          || (element.height >= videoHeight && this.equalish(element.width, videoWidth, 2))
        ) {
          score += 75;
        }

        score -= perLevelScorePenalty * penaltyMultiplier;
        element.heuristics['qsScore'] = score;

        penaltyMultiplier++;
      }
    }

    let bestCandidate: any = {qsScore: -99999999, initialValue: true};
    for (const element of elementStack) {
      if (element.qsScore > bestCandidate.qsScore) {
        bestCandidate = element;
      }
    }
    if (bestCandidate.initialValue) {
      bestCandidate = null;
    } else {
      bestCandidate.heuristics['qsMatch'] = true;
    }

    return bestCandidate;
  }

  /**
   * Lists elements between video and DOM root for display in player selector (UI)
   */
  private handlePlayerTreeRequest() {
    // this populates this.elementStack fully
    this.getPlayer({verbose: true});
    this.eventBus.send('uw-config-broadcast', {type: 'player-tree', config: JSON.parse(JSON.stringify(this.elementStack))});
  }

  private markElement(data: {parentIndex: number, enable: boolean}) {
    this.elementStack[data.parentIndex].element.style.outline = data.enable ? '5px dashed #fa6' : null;
    this.elementStack[data.parentIndex].element.style.filter = data.enable ? 'sepia(1) brightness(2) contrast(0.5)' : null;
  }

  forceRefreshPlayerElement() {
    this.element = this.getPlayer();
    // this.notificationService?.replace(this.element);
    this.trackDimensionChanges();
  }

  showNotification(notificationId) {
    // this.notificationService?.showNotification(notificationId);
  }
}

if (process.env.CHANNEL !== 'stable'){
  console.info("PlayerData loaded");
}

export default PlayerData;
