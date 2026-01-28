import { Ar } from '@src/common/interfaces/ArInterface';
import { ExtensionEnvironment } from '@src/common/interfaces/SettingsInterface';
import { Stretch } from '@src/common/interfaces/StretchInterface';
import { sleep } from '@src/common/utils/sleep';
import BrowserDetect from '@src/ext/conf/BrowserDetect';
import { RunLevel } from '@src/ext/enum/run-level.enum';
import { Aard } from '@src/ext/module/aard/Aard';
import { AardLegacy } from '@src/ext/module/aard/AardLegacy';
import { hasDrm } from '@src/ext/module/ar-detect/DrmDetector';
import { CommsOrigin } from '@src/ext/module/comms/CommsClient';
import EventBus from '@src/ext/module/EventBus';
import { ComponentLogger } from '@src/ext/module/logging/ComponentLogger';
import { LogAggregator } from '@src/ext/module/logging/LogAggregator';
import Settings from '@src/ext/module/settings/Settings';
import { SiteSettings } from '@src/ext/module/settings/SiteSettings';
import { ExtensionStatus } from '@src/ext/module/video-data/ExtensionStatus';
import PageInfo from '@src/ext/module/video-data/PageInfo';
import PlayerData from '@src/ext/module/video-data/PlayerData';
import Resizer from '@src/ext/module/video-transform/Resizer';
import * as _ from 'lodash';

/**
 * VideoData — handles CSS for the video element.
 *
 * To quickly disable or revert all modifications extension has made to the
 * video element, you can call disable() function. Calling disable() also
 * toggles autodetection off.
 */
class VideoData {
  private baseCssName: string = 'uw-ultrawidify-base-wide-screen';
  private baseVideoCss = `.uw-ultrawidify-base-wide-screen {
    margin: 0px 0px 0px 0px !important;
    width: initial !important;
    align-self: start !important;
    justify-self: start !important;
    max-height: initial !important;
    max-width: initial !important;
  }`;

  //#region flags
  arSetupComplete: boolean = false;
  enabled: boolean;
  runLevel: RunLevel = RunLevel.Off;
  destroyed: boolean = false;
  invalid: boolean = false;
  videoStatusOk: boolean = false;
  videoLoaded: boolean = false;
  videoDimensionsLoaded: boolean = false;
  active: boolean = false;
  //#endregion

  //#region misc stuff
  vdid: string;
  video: any;
  observer: ResizeObserver;
  mutationObserver: MutationObserver;
  mutationObserverConf: MutationObserverInit = {
    attributes: true,
    attributeFilter: ['class', 'style'],
    attributeOldValue: true,
  };
  userCssClassName: string;
  validationId: number;
  dimensions: any;
  hasDrm: boolean;
  //#endregion

  //#region helper objects
  logger: ComponentLogger;
  logAggregator: LogAggregator
  settings: Settings; // AARD needs it
  siteSettings: SiteSettings;
  pageInfo: PageInfo;
  player: PlayerData;
  resizer: Resizer;

  aard: Aard | AardLegacy;

  eventBus: EventBus;
  extensionStatus: ExtensionStatus;

  private currentEnvironment: ExtensionEnvironment;
  //#endregion


  get aspectRatio() {
    try {
      return this.video.videoWidth / this.video.videoHeight;
    } catch (e) {
      console.error('cannot determine stream aspect ratio!', e);
      return 1;
    }
  }

  private eventBusCommands = {
    'get-drm-status': {
      function: () => {
        this.hasDrm = hasDrm(this.video);
        this.eventBus.send('uw-config-broadcast', {type: 'drm-status', hasDrm: this.hasDrm});
      }
    },
    'set-run-level': {
      function: (runLevel: RunLevel) => this.setRunLevel(runLevel)
    },
    'uw-environment-change': {
      function: () => {
        this.onEnvironmentChanged();
      }
    },
    'get-current-site': {
      function: () => {
        console.warn('received get current site!');
      }
    }
  }

  /**
   * Creates new VideoData object
   * @param video
   * @param settings NEEDED FOR AARD
   * @param siteSettings
   * @param pageInfo
   */
  constructor(video, settings: Settings, siteSettings: SiteSettings, pageInfo: PageInfo){
    this.logAggregator = pageInfo.logAggregator;
    this.logger = new ComponentLogger(this.logAggregator, 'VideoData', {});

    this.arSetupComplete = false;
    this.video = video;
    this.destroyed = false;
    this.settings = settings;
    this.siteSettings = siteSettings;
    this.pageInfo = pageInfo;
    this.videoStatusOk = false;

    this.vdid = `${ (Math.random() * 421).toFixed(0) }`;

    this.userCssClassName = `uw-fuck-you-and-do-what-i-tell-you_${this.vdid}`;

    this.videoLoaded = false;
    this.videoDimensionsLoaded = true;

    this.validationId = null;

    this.dimensions = {
      width: this.video.offsetWidth,
      height: this.video.offsetHeight,
    };

    if (!pageInfo.eventBus) {
      this.eventBus = new EventBus({name: 'video-data', commsOrigin: CommsOrigin.ContentScript});
    } else {
      this.eventBus = pageInfo.eventBus;
    }

    this.extensionStatus = new ExtensionStatus(siteSettings, pageInfo.eventBus, pageInfo.fsStatus);

    this.eventBus.subscribeMulti(
      this.eventBusCommands,
      this
    );

    this.setupEventListeners();
  }

  async onVideoLoaded() {
    if (!this.videoLoaded) {
      /**
       * video.readyState 101:
       * 0 — no info. Can't play.
       * 1 — we have metadata but nothing else
       * 2 — we have data for current playback position, but not future      <--- meaning current frame, meaning Aard can work here or higher
       * 3 — we have a lil bit for the future
       * 4 — we'll survive to the end
       */
      if (!this.video?.videoWidth || !this.video?.videoHeight || this.video.readyState < 2) {
        return; // onVideoLoaded is a lie in this case
      }
      this.logger.info('onVideoLoaded', '%c ——————————— Initiating phase two of videoData setup ———————————', 'color: #0f9');

      this.hasDrm = hasDrm(this.video);
      this.eventBus.send(
        'uw-config-broadcast', {
        type: 'drm-status',
        hasDrm: this.hasDrm
      });
      this.videoLoaded = true;
      this.videoDimensionsLoaded = true;
      try {
        await this.setupStageTwo();
        this.logger.info('onVideoLoaded', '%c——————————— videoData setup stage two complete ———————————', 'color: #0f9');
      } catch (e) {
        this.logger.error('onVideoLoaded', '%c ——————————— Setup stage two failed. ———————————\n', 'color: #f00', e);
      }
    } else if (!this.videoDimensionsLoaded) {
      this.logger.debug('onVideoLoaded', "%cRecovering from illegal video dimensions. Resetting aspect ratio.", "background: #afd, color: #132");

      this.restoreCrop();
      this.videoDimensionsLoaded = true;
    }
  }

  videoUnloaded() {
    this.videoLoaded = false;
  }

  async injectBaseCss() {
    try {
      if (!this.mutationObserver) {
        this.setupMutationObserver();
      }
      // this.eventBus.send('inject-css', this.baseVideoCss);
    } catch (e) {
      console.error('Failed to inject base css!', e);
    }
  }
  unsetBaseClass() {
    this.mutationObserver.disconnect();
    this.mutationObserver = undefined;
    this.video.classList.remove('uw-ultrawidify-base-wide-screen');
  }

  //#region <video> event handlers
  onLoadedData() {
    this.logger.info('onLoadedData', 'Video fired event "loaded data!"');
    this.onVideoLoaded();
  }
  onLoadedMetadata() {
    this.logger.log('onLoadedData', 'Video fired event "loaded metadata!"');
    this.onVideoLoaded();
  }
  onTimeUpdate() {
    this.onVideoLoaded();
  }
  //#endregion

  //#region lifecycle-ish
  /**
   * Sets up event listeners for this video
   */
  async setupEventListeners() {
    this.logger.info('setupEventListeners', '%c——————————— Starting event listener setup! ———————————', 'color: #0f9');

    // this is in case extension loads before the video
    this.video.addEventListener('loadeddata', this.onLoadedData.bind(this));
    this.video.addEventListener('loadedmetadata', this.onLoadedMetadata.bind(this));

    // this one is in case extension loads after the video is loaded
    this.video.addEventListener('timeupdate', this.onTimeUpdate.bind(this));

    this.logger.info('setupEventListeners', '%c——————————— Event listeners setup complete! ———————————', 'color: #0f9');
  }

  /**
   * Launches the extension for a given video (after the video element is defined well enough
   * for our standards)
   */
  async setupStageTwo() {
    // NOTE: ORDERING OF OBJ INITIALIZATIONS IS IMPORTANT (arDetect needs to go last)
    this.player = new PlayerData(this);

    if (this.player.invalid) {
      this.invalid = true;
      return;
    }
    this.resizer = new Resizer(this);

    try {
      this.aard = this.settings.active.aard.useLegacy ? new AardLegacy(this) : new Aard(this);  // this starts Ar detection. needs optional parameter that prevents ArDetector from starting
    } catch (e) {
      console.error('Failed to start Aard!', e);
    }


    this.logger.info('setupStageTwo', 'Created videoData with vdid', this.vdid);


    // Everything is set up at this point. However, we are still purely "read-only" at this point. Player CSS should not be changed until
    // after we receive a "please crop" or "please stretch".

    // Time to apply any crop from address of crop mode persistence
    const defaultCrop = this.siteSettings.getDefaultOption('crop') as Ar;
    const defaultStretch = this.siteSettings.getDefaultOption('stretch') as Stretch;

    this.resizer.setStretchMode(defaultStretch);
    this.resizer.setAr(defaultCrop);
  }

  /**
   * Must be triggered on first action. TODO
   */
  preparePage() {
    this.injectBaseCss();
    this.pageInfo.initMouseActionHandler(this);

    // start fallback video/player size detection
    this.fallbackChangeDetection();
  }

  initializeObservers() {
    try {
      this.observer = new ResizeObserver(
        _.debounce(
          () => this.onVideoDimensionsChanged,
          250,
          {
            leading: true,
            trailing: true
          }
        )
      );
    } catch (e) {
      console.error('[VideoData] Observer setup failed:', e);
    }
    this.observer.observe(this.video);
  }

  setupMutationObserver() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    try {
      this.mutationObserver = new MutationObserver(
        _.debounce(
          () => this.onVideoMutation(),
          250,
          {
            leading: true,
            trailing: true
          }
        )
      )
    } catch (e) {
      console.error('[VideoData] Observer setup failed:', e);
    }
    this.mutationObserver.observe(this.video, this.mutationObserverConf);
  }

  /**
   * cleans up handlers and stuff when the show is over
   */
  destroy() {
    this.logger.info('destroy', `<vdid:${this.vdid}> received destroy command`);

    // Disconnect observer and set destroyed to 'true' _before_ removing classes from
    // the video element

    this.destroyed = true;
    try {
      this.observer.disconnect();
    } catch (e) {}
    try {
      this.mutationObserver.disconnect();
    } catch (e) {}

    if (this.video) {
      this.video.classList.remove(this.userCssClassName);
      this.video.classList.remove('uw-ultrawidify-base-wide-screen');

      this.video.removeEventListener('onloadeddata', this.onLoadedData);
      this.video.removeEventListener('onloadedmetadata', this.onLoadedMetadata);
      this.video.removeEventListener('ontimeupdate', this.onTimeUpdate);
    }

    this.eventBus.unsubscribeAll(this);

    try {
      this.aard.stop();
      // this.arDetector.destroy();
    } catch (e) {}
    this.aard = undefined;
    try {
      this.resizer.destroy();
    } catch (e) {}
    this.resizer = undefined;
    try {
      this.player.destroy();
    } catch (e) {}
    this.player = undefined;
    this.video = undefined;
  }
  //#endregion

  onEnvironmentChanged() {
    if (!this.player) {
      return;
    }
    if (this.currentEnvironment !== this.player.environment) {
      this.logger.warn('onEnvironmentChanged', 'environment changed from:', this.currentEnvironment, 'to:', this.player.environment);

      this.currentEnvironment = this.player.environment;
      if (this.siteSettings.canRunExtension(this.player.environment)) {
        this.setRunLevel(RunLevel.Off);
      } else {
        this.restoreAr();
      }
    }
  }

  setRunLevel(runLevel: RunLevel, options?: {fromPlayer?: boolean}) {
    this.logger.log('setRunLevel', '%cRUN LEVEL%c', 'background-color: #fff; color: #000;', '');

    if (this.player && !this.siteSettings.canRunExtension(this.player.environment)) {
      this.logger.log('setRunLevel', '%cExtension is not enabled for this environment.', 'color: #d00', {enable: this.siteSettings.data.enable, playerEnv: this.player.environment});
      runLevel = RunLevel.Off;
    }

    if (this.runLevel === runLevel) {
      this.logger.log('setRunLevel', '%crun level did not change — doing nothing.', 'color: #999');
      return; // also no need to propagate to the player
    }

    // Run level decreases towards 'off'
    if (this.runLevel > runLevel) {
      if (runLevel < RunLevel.CustomCSSActive) {
        this.logger.log(
          `setRunLevel`,
          '%cEXTENSION CANNOT RUN IN CURRENT CONDITION — REMOVING CSS CLASSES FROM VIDEO!', 'color: #ffa, background-color: #d00',
          `%c  run level: ${runLevel}`, ''
        );

        this.video.classList.remove(this.baseCssName);
        this.video.classList.remove(this.userCssClassName);
        this.enabled = false;
      }
    } else { // Run level increases towards 'everything runs'*
      if (runLevel >= RunLevel.CustomCSSActive) {
        this.logger.log(`setRunLevel`, '%cAdding CSS classes to the video due to change in run level.', 'color: #77d5c1ff');

        this.video.classList.add(this.baseCssName);
        this.video.classList.add(this.userCssClassName);

        // inject custom CSS classes
        this.preparePage();

        this.enabled = true;
      }
    }

    this.runLevel = runLevel;
    if (!options?.fromPlayer) {
      this.player?.setRunLevel(runLevel);
    }
  }

  /**
   * Disables ultrawidify in general.
   * @param options
   */
  disable(options?: {fromPlayer?: boolean}) {
    this.enabled = false;

    this.aard?.stop();

    this.video.classList.remove(this.baseCssName);
    this.video.classList.remove(this.userCssClassName);

  }

  //#region video status
  isVideoPlaying() {
    return this.video && !!(this.video.currentTime > 0 && !this.video.paused && !this.video.ended && this.video.readyState > 2);
  }

  hasVideoStartedPlaying() {
    return this.video && this.video.currentTime > 0;
  }
  //#endregion

  restoreCrop() {
    if (!this.resizer) {
      this.logger.warn('restoreCrop', 'Resizer has not been initialized yet. Crop will not be restored.');
      return;
    }
    this.logger.info('restoreCrop', 'Attempting to reset aspect ratio.');
    // if we have default crop set for this page, apply this.
    // otherwise, reset crop

    if (this.pageInfo.defaultCrop) {
      this.resizer.setAr(this.pageInfo.defaultCrop);
    } else {
      this.resizer.reset();

      try {
        this.stopArDetection();
        this.startArDetection();
      } catch (e) {
        this.logger.warn('restoreCrop', 'Autodetection not resumed. Reason:', e);
      }
    }
  }

  /**
   * Starts fallback change detection (validates whether currently applied settings are correct)
   */
  async fallbackChangeDetection() {
    const validationId = Date.now();
    this.validationId = validationId;

    while (!this.destroyed && !this.invalid && this.validationId === validationId) {
      await sleep(500);
      this.doPeriodicFallbackChangeDetectionCheck();
    }
  }

  doPeriodicFallbackChangeDetectionCheck() {
    this.validateVideoOffsets();
  }

  onVideoMutation(mutationList?: MutationRecord[], observer?) {
    if (this.destroyed) {
      return;
    }

    // verify that mutation didn't remove our class. Some pages like to do that.
    let confirmAspectRatioRestore = false;

    if (!this.video) {
      if (this.logger) {
        this.logger.error('onVideoMutation', 'mutation was triggered, but video element is missing. Something is fishy. Terminating this uw instance.');
      } else {
        console.error('uw::onVideoMutation', 'mutation was triggered, but neither video nor logger exist. Something is ultra-fishy. UW instance will be terminated. This:', this);
      }
      this.destroy();
      return;
    }

    if (!this.enabled) {
      this.logger.info('onVideoMutation', 'mutation was triggered, but the extension is disabled. Is the player window too small?');
      return;
    }

    for(const mutation of mutationList) {
      if (mutation.type === 'attributes') {
        if( mutation.attributeName === 'class'
            && mutation.oldValue.indexOf(this.baseCssName) !== -1
            && !this.video.classList.contains(this.baseCssName)
        ) {
          // force the page to include our class in classlist, if the classlist has been removed
          // while classList.add() doesn't duplicate classes (does nothing if class is already added),
          // we still only need to make sure we're only adding our class to classlist if it has been
          // removed. classList.add() will _still_ trigger mutation (even if classlist wouldn't change).
          // This is a problem because INFINITE RECURSION TIME, and we _really_ don't want that.

          confirmAspectRatioRestore = true;
          this.video.classList.add(this.userCssClassName);
          this.video.classList.add(this.baseCssName);
        } else if (mutation.attributeName === 'style') {
          confirmAspectRatioRestore = true;
        }
      }
    }

    this.processDimensionsChanged();
  }
  onVideoDimensionsChanged(mutationList, observer) {
    if (!mutationList || this.video === undefined) {  // something's wrong
      if (observer && this.video) {
        this.logger.warn(
          'onVideoDimensionChanged',
          'onVideoDimensionChanged encountered a weird state. video and observer exist, but mutationlist does not.\n\nmutationList:', mutationList,
          '\nobserver:', observer,
          '\nvideo:', this.video,
          '\n\nObserver will be disconnected.'
        );
        observer.disconnect();
      }
      return;
    }

    this.processDimensionsChanged();
  }

  /**
   * Forces Ultrawidify to resotre aspect ratio. You should never call this method directly,
   * instead you should be calling processDimensionChanged() wrapper function.
   */
  private _processDimensionsChanged() {
    if (!this.player) {
      this.logger.warn('_processDimensionsChanged', `Player is not defined. This is super haram.`, this.player);
      return;
    }
    // adding player observer taught us that if element size gets triggered by a class, then
    // the 'style' attributes don't necessarily trigger. This means we also need to trigger
    // restoreAr here, in case video size was changed this way
    this.player.forceRefreshPlayerElement();
    this.eventBus.send('uw-environment-change', {newEnvironment: this.player.environment});

    this.restoreAr();

    // sometimes something fucky wucky happens and mutations aren't detected correctly, so we
    // try to get around that
    setTimeout( () => {
      this.validateVideoOffsets();
    }, 100);
  }

  /**
   * Restores aspect ratio and validates video offsets after the restore. Execution uses
   * debounce to limit how often the function executes.
   */
  private processDimensionsChanged() {
    _.debounce(
      this._processDimensionsChanged,
      250,
      {
        // leading: true,
        trailing: true
      }
    );
  }

  validateVideoOffsets() {
    // validate if current video still exists. If not, we destroy current object
    try {
      if (! document.body.contains(this.video)) {
        this.destroy();
        return;
      }
    } catch (e) {
    }
    // THIS BREAKS PANNING
    const videoComputedStyle = window.getComputedStyle(this.video);
    const playerComputedStyle = window.getComputedStyle(this.player.element);

    try {
      const transformMatrix = videoComputedStyle.transform.split(')')[0].split(',');
      const translateX = +transformMatrix[4];
      const translateY = +transformMatrix[5];
      const vh = +(videoComputedStyle.height.split('px')[0]);
      const vw = +(videoComputedStyle.width.split('px')[0]);
      const ph = +(playerComputedStyle.height.split('px')[0]);
      const pw = +(playerComputedStyle.width.split('px')[0]);

      // TODO: check & account for panning and alignment
      if (transformMatrix[0] !== 'none'
          && this.isWithin(vh, (ph - (translateY * 2)), 2)
          && this.isWithin(vw, (pw - (translateX * 2)), 2)) {
      } else {
        // this.player.forceRefreshPlayerElement();
        // this.restoreAr();
      }

    } catch(e) {
      console.error('Validating video offsets failed:', e)
    }
  }

  isWithin(a, b, diff) {
    return a < b + diff && a > b - diff
  }

  /**
   * Gets the contents of the style attribute of the video element
   * in a form of an object.
   */
  getVideoStyle(): any {
    // This will _always_ give us an array. Empty string gives an array
    // that contains one element. That element is an empty string.
    const styleArray = (this.video.getAttribute('style') || '').split(';');

    const styleObject = {};

    for (const style of styleArray) {
      // not a valid CSS, so we skip those
      if (style.indexOf(':') === -1) {
        continue;
      }

      // let's play _very_ safe
      let [property, value] = style.split('!important')[0].split(':');
      value = value.trim();
      styleObject[property] = value;
    }

    return styleObject;
  }

  /**
   * Some sites try to accommodate ultrawide users by "cropping" videos
   * by setting 'style' attribute of the video element to 'height: X%',
   * where 'X' is something greater than 100.
   *
   * This function gets that percentage and converts it into a factor.
   */
  getHeightCompensationFactor() {
    const heightStyle = this.getVideoStyle()?.height;

    if (!heightStyle || !heightStyle.endsWith('%')) {
      return 1;
    }

    const heightCompensationFactor = heightStyle.split('%')[0] / 100;
    if (isNaN(heightCompensationFactor)) {
      return 1;
    }
    return heightCompensationFactor;
  }

  //#region AARD handlers — TODO: remove, AARD handlers shouldn't be here
  initArDetection() {
    if(this.destroyed || this.invalid) {
      // throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
      return;
    }
    if (! this.aard){
      this.aard = this.settings.active.aard.useLegacy ? new AardLegacy(this): new Aard(this);
    }
  }


  startArDetection() {
    this.logger.info('startArDetection', 'starting AR detection');
    if(this.destroyed || this.invalid) {
      // throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
      return;
    }

    try {
      this.hasDrm = !!hasDrm(this.video);
      this.eventBus.send(
        'uw-config-broadcast', {
        type: 'drm-status',
        hasDrm: this.hasDrm
      });

      if (!this.aard) {
        this.initArDetection();
      }
      this.aard.startCheck();
    } catch (e) {
      this.logger.warn('startArDetection', 'Could not start aard for some reason. Was the function was called too early?', e);
    }
  }

  resumeAutoAr(){
    if(this.aard){
      this.startArDetection();
    }
  }

  stopArDetection() {
    if (this.aard) {
      this.aard.stop();
    }
  }
  //#endregion

  //#region shit that gets propagated to resizer and should be removed. Implement an event bus instead
  restoreAr(){
    if (this.invalid) {
      return;
    }
    this.resizer.restore();
  }
  //#endregion

  checkVideoSizeChange(){
    const videoWidth = this.video.offsetWidth;
    const videoHeight = this.video.offsetHeight;

    {
      if(! this.video) {
        this.logger.warn('checkVideoSizeChange', "player element isn't defined");
      }
      if ( this.video &&
            ( this.dimensions?.width != videoWidth ||
              this.dimensions?.height != videoHeight )
      ) {
        this.logger.debug('checkVideoSizeChange', "player size changed. reason: dimension change. Old dimensions?", this.dimensions.width, this.dimensions.height, "new dimensions:", this.video.offsetWidth, this.video.offsetHeight);
      }
    }

    // if size doesn't match, update & return true
    if (this.dimensions?.width != videoWidth
        || this.dimensions?.height != videoHeight ){
      this.dimensions = {
        width: videoWidth,
        height: videoHeight,
      };
      return true;
    }

    return false;
  }

  /**
   * Returns:
   *    * number of parent elements on route from <video> to <body>
   *    * parent index of automatically detected player element
   *    * index of current player element
   */
  getPageOutline() {

  }
}

export default VideoData;
