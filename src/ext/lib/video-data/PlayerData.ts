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
import PageInfo from './PageInfo';
import { RunLevel } from '../../enum/run-level.enum';

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
 *
 *
 * RUN LEVELS
 * Run are there to ensure only the necessary functions run.
 *
 *  * Off:
 *    * Extension is effectively disabled. However, even in this quasi-disabled state,
 *      certain functions of the class should still be active.
 *        1. Player size monitoring
 *           (Run level could be set to 'off' due to player being too small)
 *        2. Event bus
 *           (Actions from popup may cause RunLevel to increase)
 *
 *  * UiOnly:
 *    * Extension should show in-player UI, but it should not inject any
 *      unnecessary CSS.
 */

class PlayerData {
  private playerCssClass = 'uw-ultrawidify-player-css';

  //#region helper objects
  logger: Logger;
  videoData: VideoData;
  pageInfo: PageInfo;
  siteSettings: SiteSettings;
  notificationService: PlayerNotificationUi;
  eventBus: EventBus;
  //#endregion

  //#region HTML objects
  videoElement: any;
  element: any;
  overlayNode: any;
  //#endregion

  //#region flags
  runLevel: RunLevel = RunLevel.Off;
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

  private ui: UI;

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
    'set-run-level': [{
      function: (runLevel) => this.setRunLevel(runLevel)
    }]
  }
  //#endregion

  private dimensionChangeListener = {
    that: this,
    handleEvent: function(event: Event) {
      this.that.trackDimensionChanges()
    }
  }

  /**
   * Gets player aspect ratio. If in full screen, it returns screen aspect ratio unless settings say otherwise.
   */
  get aspectRatio() {
    try {
      if (this.isFullscreen) {
        return window.innerWidth / window.innerHeight;
      }
      if (!this.dimensions) {
        this.trackDimensionChanges();
      }

      return this.dimensions.width / this.dimensions.height;
    } catch (e) {
      console.error('cannot determine aspect ratio!', e);
      return 1;
    }
  }

  //#region lifecycle
  constructor(videoData) {
    try {
      // set all our helper objects
      this.logger = videoData.logger;
      this.videoData = videoData;
      this.videoElement = videoData.video;
      this.pageInfo = videoData.pageInfo;
      this.siteSettings = videoData.siteSettings;
      this.eventBus = videoData.eventBus;

      // do the rest
      this.invalid = false;
      this.element = this.getPlayer();
      this.initEventBus();

      // this.notificationService = new PlayerNotificationUi(this.element, this.settings, this.eventBus);
      if (this.videoData.settings.active.ui?.inPlayer?.enabled) {
        this.ui = new UI(
          'ultrawidifyUi',
          {
            parentElement: this.element,
            eventBus: this.eventBus
          }
        );
      }

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

      document.addEventListener('fullscreenchange', this.dimensionChangeListener);

      // we want to reload on storage changes
      this.siteSettings.subscribeToStorageChange('PlayerData', (siteConfUpdate) => this.reloadPlayerDataConfig(siteConfUpdate));
    } catch (e) {
      console.error('[Ultrawidify::PlayerData::ctor] There was an error setting up player data. You should be never seeing this message. Error:', e);
      this.invalid = true;
    }
  }

  private reloadPlayerDataConfig(siteConfUpdate) {
    // this.siteSettings = siteConfUpdate;
    this.element = this.getPlayer();

    this.periodicallyRefreshPlayerElement = false;
    try {
      this.periodicallyRefreshPlayerElement = this.siteSettings.data.currentDOMConfig.periodicallyRefreshPlayerElement;
    } catch (e) {
      // no biggie — that means we don't have any special settings for this site.
    }

    // because this is often caused by the UI
    this.handlePlayerTreeRequest();
  }

  /**
   * Initializes event bus
   */
  private initEventBus() {
    for (const action in this.eventBusCommands) {
      for (const command of this.eventBusCommands[action]) {
        this.eventBus.subscribe(action, command);
      }
    }
  }

  /**
   * Completely stops everything the extension is doing
   */
  destroy() {
    document.removeEventListener('fullscreenchange', this.dimensionChangeListener);
    this.stopChangeDetection();
    this.notificationService?.destroy();
  }
  //#endregion

  /**
   * Sets extension runLevel and sets or unsets appropriate css classes as necessary
   * @param runLevel
   * @returns
   */
  setRunLevel(runLevel: RunLevel) {
    if (this.runLevel === runLevel) {
      return;
    }

    // increasing runLevel works differently than decreasing
    if (this.runLevel > runLevel) {
      if (runLevel < RunLevel.CustomCSSActive) {
        this.element.classList.remove(this.playerCssClass);
      }
      if (runLevel < RunLevel.UIOnly) {
        this.ui.disable();
      }
    } else {
      if (runLevel >= RunLevel.UIOnly) {
        this.ui.enable();
        this.startChangeDetection();
      }
      if (runLevel >= RunLevel.CustomCSSActive) {
        this.element.classList.add(this.playerCssClass);
      }
    }

    this.runLevel = runLevel;
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
    this.isFullscreen = !!document.fullscreenElement;

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
   * Checks if extension is allowed to run in current environment.
   * @param currentPlayerDimensions
   */
  private handleSizeConstraints(currentPlayerDimensions: PlayerDimensions) {
    console.log('handling resize constraints');
    // Check if extension is allowed to run in current combination of theater + full screen
    const canEnable = this.siteSettings.isEnabledForEnvironment(this.isFullscreen, this.isTheaterMode) === ExtensionMode.Enabled;

    if (this.runLevel === RunLevel.Off && canEnable) {
      console.log('runLevel: off -> [anything]');
      this.eventBus.send('restore-ar', null);
      // must be called after
      this.handleDimensionChanges(currentPlayerDimensions, this.dimensions);
    } else if (!canEnable && this.runLevel !== RunLevel.Off) {
      // must be called before
      console.log('runLevel: [anything] -> off');

      this.handleDimensionChanges(currentPlayerDimensions, this.dimensions);
      this.setRunLevel(RunLevel.Off);
    }
  }


  private handleDimensionChanges(newDimensions: PlayerDimensions, oldDimensions: PlayerDimensions) {
    console.log('handling dimension changes\n\nold dimensions:', oldDimensions, '\nnew dimensions:', newDimensions, '\n\nis enabled:', this.enabled, this.runLevel, RunLevel);
    if (this.runLevel === RunLevel.Off ) {
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
      console.log('dimensions changed + we are enabled. Sending restore-ar ...');
      // If player size changes, we restore aspect ratio
      this.eventBus.send('restore-ar', null);
      this.eventBus.send('delayed-restore-ar', {delay: 500});
      // this.videoData.resizer?.restore();
    }
  }

  onPlayerDimensionsChanged(mutationList?, observer?) {
    this.trackDimensionChanges();
  }

  //#region player element change detection
  /**
   * Starts change detection.
   * @returns
   */
  startChangeDetection(){
    if (this.invalid) {
      return;
    }

    try {
      this.observer = new ResizeObserver(
        _.debounce(           // don't do this too much:
          (m,o) => {
            this.onPlayerDimensionsChanged(m,o)
          },
          250,                // do it once per this many ms
          {
            leading: true,    // do it when we call this fallback first
            trailing: true    // do it after the timeout if we call this callback few more times
          }
        )
      );

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
    let element = this.videoElement.parentNode;
    const videoWidth = this.videoElement.offsetWidth;
    const videoHeight = this.videoElement.offsetHeight;
    let playerCandidate;

    const elementStack: any[] = [{
      element: this.videoElement,
      type: 'video',
      tagName: 'video',
      classList: this.videoElement.classList,
      id: this.videoElement.id,
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

    // on verbose, get both qs and index player
    if (options?.verbose) {
      if (playerIndex) {
        playerCandidate = elementStack[playerIndex];
        playerCandidate.heuristics['manualElementByParentIndex'] = true;
      }
      if (playerQs) {
        playerCandidate = this.getPlayerQs(playerQs, elementStack, videoWidth, videoHeight);
      }
    }

    // if mode is given, we follow the preference
    console.log('we prefer manual mode:', this.siteSettings, this.siteSettings.data.currentDOMConfig?.elements?.player);

    if (this.siteSettings.data.currentDOMConfig?.elements?.player?.manual && this.siteSettings.data.currentDOMConfig?.elements?.player?.mode) {
      console.log('we prefer manual mode:', this.siteSettings.data.currentDOMConfig?.elements?.player?.mode);
      if (this.siteSettings.data.currentDOMConfig?.elements?.player?.mode === 'qs') {
        playerCandidate = this.getPlayerQs(playerQs, elementStack, videoWidth, videoHeight);
        console.log('got qs player candidate');
      } else {
        playerCandidate = elementStack[playerIndex];
        playerCandidate.heuristics['manualElementByParentIndex'] = true;
        console.log('got index player candidate')
      }
    } else {
      console.log('no preference.')
      // try to figure it out based on what we have, with playerQs taking priority
      if (playerQs) {
        playerCandidate = this.getPlayerQs(playerQs, elementStack, videoWidth, videoHeight);
      } else if (playerIndex) { // btw 0 is not a valid index for player
        playerCandidate = elementStack[playerIndex];
        playerCandidate.heuristics['manualElementByParentIndex'] = true;
      }
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
    console.log('aya')
    // this populates this.elementStack fully
    this.getPlayer({verbose: true});
    console.log('tree:', JSON.parse(JSON.stringify(this.elementStack)));
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
}

if (process.env.CHANNEL !== 'stable'){
  console.info("PlayerData loaded");
}

export default PlayerData;
