import Debug from '../../conf/Debug';
import PlayerData from './PlayerData';
import Resizer from '../video-transform/Resizer';
import ArDetector from '../ar-detect/ArDetector';
import AspectRatioType from '../../../common/enums/AspectRatioType.enum';
import * as _ from 'lodash';
import BrowserDetect from '../../conf/BrowserDetect';
import Logger from '../Logger';
import Settings from '../Settings';
import PageInfo from './PageInfo';
import { sleep } from '../../../common/js/utils';
import { hasDrm } from '../ar-detect/DrmDetecor';

class VideoData {
  //#region flags
  arSetupComplete: boolean = false;
  destroyed: boolean = false;
  invalid: boolean = false;
  videoStatusOk: boolean = false;
  videoLoaded: boolean = false;
  videoDimensionsLoaded: boolean = false;
  paused: boolean = false;
  //#endregion

  //#region misc stuff
  vdid: string;
  video: any;
  observer: MutationObserver;
  extensionMode: any;
  userCssClassName: string;
  validationId: number;
  dimensions: any;
  //#endregion

  //#region helper objects
  logger: Logger;
  settings: Settings;
  pageInfo: PageInfo;
  player: PlayerData;
  resizer: Resizer;
  arDetector: ArDetector;
  //#endregion


  constructor(video, settings, pageInfo){
    window.ultrawidify.addVideo(this);
    
    this.logger = pageInfo.logger;
    this.arSetupComplete = false;
    this.video = video;
    this.destroyed = false;
    this.settings = settings;
    this.pageInfo = pageInfo;
    this.extensionMode = pageInfo.extensionMode;
    this.videoStatusOk = false;

    this.userCssClassName = `uw-fuck-you-and-do-what-i-tell-you_${this.vdid}`;

    this.videoLoaded = false;
    this.videoDimensionsLoaded = true;

    this.validationId = null;

    this.dimensions = {
      width: this.video.offsetWidth,
      height: this.video.offsetHeight,
    };

    this.setupStageOne();
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
      this.logger.log('info', 'init', '%c[VideoData::onVideoLoaded] ——————————— Initiating phase two of videoData setup ———————————', 'color: #0f9');

      this.videoLoaded = true;
      this.videoDimensionsLoaded = true;
      try {
        await this.setupStageTwo();
        this.logger.log('info', 'init', '%c[VideoData::onVideoLoaded] ——————————— videoData setup stage two complete ———————————', 'color: #0f9');
      } catch (e) {
        this.logger.log('error', 'init', '%c[VideoData::onVideoLoaded] ——————————— Setup stage two failed. ———————————\n', 'color: #f00', e);
      }
    } else if (!this.videoDimensionsLoaded) {
      this.logger.log('info', 'debug', "%c[VideoData::restoreCrop] Recovering from illegal video dimensions. Resetting aspect ratio.", "background: #afd, color: #132");

      this.restoreCrop();
      this.videoDimensionsLoaded = true;
    }
  }

  videoUnloaded() {
    this.videoLoaded = false;
  }

  async injectBaseCss() {
    try {
    await this.pageInfo.injectCss(`
      .uw-ultrawidify-base-wide-screen {
        margin: 0px 0px 0px 0px !important;
        width: initial !important;
        align-self: start !important;
        justify-self: start !important;
      }
    `);
    } catch (e) {
      console.error('Failed to inject base css!', e);
    }
  }

  unsetBaseClass() {
    this.video.classList.remove('uw-ultrawidify-base-wide-screen');
  }

  //#region <video> event handlers
  onLoadedData() {
    this.logger.log('info', 'init', '[VideoData::ctor->video.onloadeddata] Video fired event "loaded data!"');
    this.onVideoLoaded();
  }
  onLoadedMetadata() {
    this.logger.log('info', 'init', '[VideoData::ctor->video.onloadedmetadata] Video fired event "loaded metadata!"');
    this.onVideoLoaded();
  }
  onTimeUpdate() {
    this.onVideoLoaded();
  }
  //#endregion


  //#region lifecycle-ish
  /**
   * Injects base CSS and sets up handlers for <video> tag events
   */
  async setupStageOne() {
    this.logger.log('info', 'init', '%c[VideoData::setupStageOne] ——————————— Starting setup stage one! ———————————', 'color: #0f9');
    // ensure base css is loaded before doing anything
    this.injectBaseCss();

    // this is in case extension loads before the video
    this.video.addEventListener('loadeddata', this.onLoadedData.bind(this));
    this.video.addEventListener('loadedmetadata', this.onLoadedMetadata.bind(this));

    // this one is in case extension loads after the video is loaded
    this.video.addEventListener('timeupdate', this.onTimeUpdate.bind(this));

    this.logger.log('info', 'init', '%c[VideoData::setupStageOne] ——————————— Setup stage one complete! ———————————', 'color: #0f9');
  }

  /**
   * Launches the extension for a given video (after the video element is defined well enough
   * for our standards)
   */
  async setupStageTwo() {
    // POZOR: VRSTNI RED JE POMEMBEN (arDetect mora bit zadnji)
    // NOTE: ORDERING OF OBJ INITIALIZATIONS IS IMPORTANT (arDetect needs to go last)

    // NOTE: We only init observers once player is confirmed valid
    const observerConf = {
      attributes: true,
      // attributeFilter: ['style', 'class'],
      attributeOldValue: true,
    };

    this.player = new PlayerData(this);
    if (this.player.invalid) {
      this.invalid = true;
      return;
    }

    this.resizer = new Resizer(this);

    // INIT OBSERVERS
    try {
      if (BrowserDetect.firefox) {
        this.observer = new MutationObserver( 
          _.debounce(
            this.onVideoDimensionsChanged,
            250,
            {
              leading: true,
              trailing: true
            }
          )
        );
      } else {
        // Chrome for some reason insists that this.onPlayerDimensionsChanged is not a function
        // when it's not wrapped into an anonymous function
        this.observer = new MutationObserver( 
          _.debounce(
            (m, o) => {
              this.onVideoDimensionsChanged(m, o)
            }, 
            250,
            {
              leading: true,
              trailing: true
            }
          )
        );
      }
    } catch (e) {
      console.error('[VideoData] Observer setup failed:', e);
    }
    this.observer.observe(this.video, observerConf);

    // INIT AARD
    this.arDetector = new ArDetector(this);  // this starts Ar detection. needs optional parameter that prevets ardetdctor from starting
    // player dimensions need to be in:
    // this.player.dimensions

    // apply default align and stretch
    this.logger.log('info', 'debug', "%c[VideoData::ctor] Initial resizer reset!", "background: #afd, color: #132");
    this.resizer.reset();

    this.logger.log('info', ['debug', 'init'], '[VideoData::ctor] Created videoData with vdid', this.vdid, '\nextension mode:', this.extensionMode)

    this.pageInfo.initMouseActionHandler(this);
    
    // NOTE — since base class for our <video> element depends on player aspect ratio,
    // we handle it in PlayerData class.
    this.video.classList.add('uw-ultrawidify-base-wide-screen'); 
    this.video.classList.add(this.userCssClassName); // this also needs to be applied BEFORE we initialize resizer!


    // start fallback video/player size detection
    this.fallbackChangeDetection();

    // force reload last aspect ratio (if default crop ratio exists), but only after the video is 
    if (this.pageInfo.defaultCrop) {
      this.resizer.setAr(this.pageInfo.defaultCrop);
    }

    try {
      if (!this.pageInfo.defaultCrop) {
        if (!this.invalid) {
          this.initArDetection();
        } else {
          this.logger.log('error', 'debug', '[VideoData::secondStageSetup] Video is invalid. Aard not started.', this.video);
        }
      } else {
        this.logger.log('info', 'debug', '[VideoData::secondStageSetup] Default crop is specified for this site. Not starting aard.');
      }
    } catch (e) {
      this.logger.log('error', 'init', `[VideoData::secondStageSetup] Error with aard initialization (or error with default aspect ratio application)`, e)
    }
  }

  /**
   * cleans up handlers and stuff when the show is over
   */
  destroy() {
    this.logger.log('info', ['debug', 'init'], `[VideoData::destroy] <vdid:${this.vdid}> received destroy command`);

    if (this.video) {
      this.video.classList.remove(this.userCssClassName);
      this.video.classList.remove('uw-ultrawidify-base-wide-screen'); 

      this.video.removeEventListener('onloadeddata', this.onLoadedData);
      this.video.removeEventListener('onloadedmetadata', this.onLoadedMetadata);
      this.video.removeEventListener('ontimeupdate', this.onTimeUpdate);
    }

    this.pause();
    this.destroyed = true;
    try {
      this.arDetector.stop();
      this.arDetector.destroy();
    } catch (e) {}
    this.arDetector = undefined;
    try {
      this.resizer.destroy();
    } catch (e) {}
    this.resizer = undefined;
    try {
      this.player.destroy();
    } catch (e) {}
    try {
      this.observer.disconnect();
    } catch (e) {}
    this.player = undefined;
    this.video = undefined;
  }
  //#endregion

  //#region video status
  isVideoPlaying() {
    return this.video && !!(this.video.currentTime > 0 && !this.video.paused && !this.video.ended && this.video.readyState > 2);
  }

  hasVideoStartedPlaying() {
    return this.video && this.video.currentTime > 0;
  }
  //#endregion

  restoreCrop() {  
    this.logger.log('info', 'debug', '[VideoData::restoreCrop] Attempting to reset aspect ratio.')
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
        this.logger.log('warn', 'debug', '[VideoData::restoreCrop] Autodetection not resumed. Reason:', e);
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

  onVideoDimensionsChanged(mutationList, observer) {
    if (!mutationList || this.video === undefined) {  // something's wrong
      if (observer && this.video) {
        observer.disconnect();
      }
      return;
    }
    let confirmAspectRatioRestore = false;

    for (let mutation of mutationList) {
      if (mutation.type === 'attributes') {
        if (mutation.attributeName === 'class') {
          if(!this.video.classList.contains(this.userCssClassName) ) {
            // force the page to include our class in classlist, if the classlist has been removed
            // while classList.add() doesn't duplicate classes (does nothing if class is already added),
            // we still only need to make sure we're only adding our class to classlist if it has been
            // removed. classList.add() will _still_ trigger mutation (even if classlist wouldn't change).
            // This is a problem because INFINITE RECURSION TIME, and we _really_ don't want that.
            this.video.classList.add(this.userCssClassName);
            this.video.classList.add('uw-ultrawidify-base-wide-screen'); 
          }
          // always trigger refresh on class changes, since change of classname might trigger change 
          // of the player size as well.
          confirmAspectRatioRestore = true;
        }
        if (mutation.attributeName === 'style') {
          confirmAspectRatioRestore = true;
        }
      }
    }

    if (!confirmAspectRatioRestore) {
      return;
    }

    // adding player observer taught us that if element size gets triggered by a class, then
    // the 'style' attributes don't necessarily trigger. This means we also need to trigger
    // restoreAr here, in case video size was changed this way
    this.player.forceRefreshPlayerElement();
    this.restoreAr();

    // sometimes something fucky wucky happens and mutations aren't detected correctly, so we
    // try to get around that
    setTimeout( () => {
      this.validateVideoOffsets();
    }, 100);
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
    const cs = window.getComputedStyle(this.video);
    const pcs = window.getComputedStyle(this.player.element);

    try {
      const transformMatrix = cs.transform.split(')')[0].split(',');
      const translateX = +transformMatrix[4];
      const translateY = +transformMatrix[5];
      const vh = +(cs.height.split('px')[0]);
      const vw = +(cs.width.split('px')[0]);
      const ph = +(pcs.height.split('px')[0]);
      const pw = +(pcs.width.split('px')[0]);

      // TODO: check & account for panning and alignment
      if (transformMatrix[0] !== 'none'
          && this.isWithin(vh, (ph - (translateY * 2)), 2)
          && this.isWithin(vw, (pw - (translateX * 2)), 2)) {
      } else {
        this.player.forceDetectPlayerElementChange();
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
   * Some sites try to accomodate ultrawide users by "cropping" videos
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


  firstTimeArdInit(){
    if(this.destroyed || this.invalid) {
      // throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
      return;
    }
    if(! this.arSetupComplete){
      this.arDetector = new ArDetector(this);
    }
  }

  initArDetection() {
    if(this.destroyed || this.invalid) {
      // throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
      return;
    }
    if (this.arDetector){
      this.arDetector.init();
    }
    else{
      this.arDetector = new ArDetector(this);
      this.arDetector.init();
    }
  }
  
  startArDetection() {
    this.logger.log('info', 'debug', "[VideoData::startArDetection] starting AR detection")
    if(this.destroyed || this.invalid) {
      // throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
      return;
    }

    if (hasDrm(this.video)) {
      this.player.showNotification('AARD_DRM');
    }

    if (!this.arDetector) {
      this.initArDetection();
    }
    this.arDetector.start();
  }

  rebootArDetection() {
    if(this.destroyed || this.invalid) {
      // throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
      return;
    }
    this.arDetector.init();
  }

  stopArDetection() {
    if (this.arDetector) {
      this.arDetector.stop();
    }
  }

  pause(){
    this.paused = true;
    if(this.arDetector){
      this.arDetector.stop();
    }
    if(this.player){
      this.player.stop();
    }
  }

  resume(){
    if(this.destroyed || this.invalid) {
      // throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
      return;
    }
    this.paused = false;
    try {
      // this.resizer.start();
      if (this.player) {
        this.player.start();
      }
    } catch (e) {
      this.logger.log('error', 'debug', "[VideoData.js::resume] cannot resume for reasons. Will destroy videoData. Error here:", e);
      this.destroy();
    }
  }

  resumeAutoAr(){
    if(this.arDetector){
      this.startArDetection();
    }
  }

  setManualTick(manualTick) {
    if(this.arDetector){
      this.arDetector.setManualTick(manualTick);
    }
  }

  tick() {
    if(this.arDetector){
      this.arDetector.tick();
    }
  }

  setLastAr(lastAr){
    if (this.invalid) {
      return;
    }
    this.resizer.setLastAr(lastAr);
  }

  setAr(ar, lastAr?){
    if (this.invalid) {
      return;
    }
    
    if (ar.type === AspectRatioType.Fixed || ar.type === AspectRatioType.FitHeight || ar.type === AspectRatioType.FitHeight) {
      this.player.forceRefreshPlayerElement();
    }

    this.resizer.setAr(ar, lastAr);
  }

  resetAr() {
    if (this.invalid) {
      return;
    }
    this.resizer.reset();
  }

  resetLastAr() {
    if (this.invalid) {
      return;
    }
    this.resizer.setLastAr('original');
  }

  panHandler(event, forcePan?: boolean) {
    if (this.invalid) {
      return;
    }
    if(this.destroyed) {
      // throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
      return;
    }
    if(!this.resizer) {
      this.destroy();
      return;
    }
    this.resizer.panHandler(event, forcePan);
  }

  setPanMode(mode) {
    if (this.invalid) {
      return;
    }
    this.resizer.setPanMode(mode);
  }

  setVideoAlignment(videoAlignment) {
    if (this.invalid) {
      return;
    }
    this.resizer.setVideoAlignment(videoAlignment);
  }

  restoreAr(){
    if (this.invalid) {
      return;
    }
    this.resizer.restore();
  }

  setStretchMode(stretchMode, fixedStretchRatio){
    if (this.invalid) {
      return;
    }
    this.resizer.setStretchMode(stretchMode, fixedStretchRatio);
  }

  setZoom(zoomLevel, no_announce){
    if (this.invalid) {
      return;
    }
    this.resizer.setZoom(zoomLevel, no_announce);
  }

  zoomStep(step){
    if (this.invalid) {
      return;
    }
    this.resizer.zoomStep(step);
  }

  announceZoom(scale){
    if (this.invalid) {
      return;
    }
    this.pageInfo.announceZoom(scale);
  }

  markPlayer(name, color) {
    if (this.invalid) {
      return;
    }
    if (this.player) {
      this.player.markPlayer(name, color)
    }
  }
  unmarkPlayer() {
    this.player.unmarkPlayer();
  }

  isPlaying() {
    return this.video && this.video.currentTime > 0 && !this.video.paused && !this.video.ended;
  }

  checkVideoSizeChange(){
    const videoWidth = this.video.offsetWidth;
    const videoHeight = this.video.offsetHeight;
    // this 'if' is just here for debugging — real code starts later. It's safe to collapse and
    // ignore the contents of this if (unless we need to change how logging works)
    if (this.logger.canLog('debug')){
      if(! this.video) {
        this.logger.log('info', 'videoDetect', "[VideoDetect] player element isn't defined");
      }
      if ( this.video &&
           ( this.dimensions?.width != videoWidth ||
             this.dimensions?.height != videoHeight )
      ) {
        this.logger.log('info', 'debug', "[VideoDetect] player size changed. reason: dimension change. Old dimensions?", this.dimensions.width, this.dimensions.height, "new dimensions:", this.video.offsetWidth, this.video.offsetHeight);
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
}

export default VideoData;
