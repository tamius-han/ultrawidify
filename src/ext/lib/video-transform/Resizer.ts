import Debug from '../../conf/Debug';
import Scaler, { CropStrategy, VideoDimensions } from './Scaler';
import Stretcher from './Stretcher';
import Zoom from './Zoom';
import PlayerData from '../video-data/PlayerData';
import ExtensionMode from '../../../common/enums/ExtensionMode.enum';
import StretchType from '../../../common/enums/StretchType.enum';
import VideoAlignmentType from '../../../common/enums/VideoAlignmentType.enum';
import AspectRatioType from '../../../common/enums/AspectRatioType.enum';
import CropModePersistance from '../../../common/enums/CropModePersistence.enum';
import { sleep } from '../Util';
import Logger from '../Logger';
import Settings from '../Settings';
import VideoData from '../video-data/VideoData';
import EventBus from '../EventBus';

if(Debug.debug) {
  console.log("Loading: Resizer.js");
}

class Resizer {
  //#region flags
  canPan: boolean = false;
  destroyed: boolean = false;
  manualZoom: boolean = false;
  //#endregion

  //#region helper objects
  logger: Logger;
  settings: Settings;
  scaler: Scaler;
  stretcher: Stretcher;
  zoom: Zoom;
  conf: VideoData;
  eventBus: EventBus;
  //#endregion

  //#region HTML elements
  video: any;
  //#endregion

  //#region data
  correctedVideoDimensions: any;
  currentCss: any;
  currentStyleString: string;
  currentPlayerStyleString: any;
  currentCssValidFor: any;
  currentVideoSettings: any;

  _lastAr: {type: any, ratio?: number} = {type: AspectRatioType.Initial};
  set lastAr(x: {type: any, ratio?: number}) {
    this._lastAr = x;
    // emit updates for UI when setting lastAr
    this.eventBus.send('uw-config-broadcast', {type: 'ar', config: x})
  }
  get lastAr() {
    return this._lastAr;
  }

  resizerId: any;
  videoAlignment: {x: VideoAlignmentType, y: VideoAlignmentType};
  userCss: string;
  userCssClassName: any;
  pan: any = null;
  //#endregion

  //#region event bus configuration
  private eventBusCommands = {
    'set-ar': [{
      function: (config: any) => {
        this.manualZoom = false; // this only gets called from UI or keyboard shortcuts, making this action safe.
        this.setAr(config);
      }
    }],
    'set-alignment': [{
      function: (config: any) => {
        this.setVideoAlignment(config.x, config.y);
      }
    }],
    'set-stretch': [{
      function: (config: any) => {
        this.manualZoom = false; // we also need to unset manual aspect ratio when doing this
        this.setStretchMode(config.type, config.ratio)
      }
    }],
    'set-zoom': [{
      function: (config: any) => this.setZoom(config.zoom, config.axis, config.noAnnounce)
    }],
    'change-zoom': [{
      function: (config: any) => this.zoomStep(config.step)
    }],
    'get-ar': [{
      function: () => this.eventBus.send('uw-config-broadcast', {type: 'ar', config: this.lastAr})
    }]
  }
  //#endregion

  constructor(videoData) {
    this.resizerId = (Math.random()*100).toFixed(0);
    this.conf = videoData;
    this.logger = videoData.logger;
    this.video = videoData.video;
    this.settings = videoData.settings;
    this.eventBus = videoData.eventBus;
    this.initEventBus();

    this.scaler = new Scaler(this.conf);
    this.stretcher = new Stretcher(this.conf);
    this.zoom = new Zoom(this.conf);

    this.videoAlignment = {
      x: this.settings.getDefaultVideoAlignment(window.location.hostname),
      y: VideoAlignmentType.Center
    }; // this is initial video alignment

    this.destroyed = false;

    if (this.settings.active.pan) {
      this.canPan = this.settings.active.miscSettings.mousePan.enabled;
    } else {
      this.canPan = false;
    }

    this.userCssClassName = videoData.userCssClassName;
  }

  initEventBus() {
    for (const action in this.eventBusCommands) {
      for (const command of this.eventBusCommands[action]) {
        this.eventBus.subscribe(action, command);
      }
    }
  }

  injectCss(css) {
    this.conf.pageInfo.injectCss(css);
  }

  ejectCss(css) {
    this.conf.pageInfo.ejectCss(css);
  }

  replaceCss(oldCss, newCss) {
    this.conf.pageInfo.replaceCss(oldCss, newCss);
  }

  prepareCss(css) {
    return `.${this.userCssClassName} {${css}}`;
  }

  destroy(){
    this.logger.log('info', ['debug', 'init'], `[Resizer::destroy] <rid:${this.resizerId}> received destroy command.`);
    this.destroyed = true;
  }

  calculateRatioForLegacyOptions(ar){
    // also present as modeToAr in Scaler.js
    if (ar.type !== AspectRatioType.FitWidth && ar.type !== AspectRatioType.FitHeight && ar.ratio) {
      return ar;
    }
    // handles "legacy" options, such as 'fit to widht', 'fit to height' and AspectRatioType.Reset. No zoom tho
    let ratioOut;

    if (!this.conf.video) {
      this.logger.log('info', 'debug', "[Scaler.js::modeToAr] No video??",this.conf.video, "killing videoData");
      this.conf.destroy();
      return null;
    }


    if (! this.conf.player.dimensions) {
      ratioOut = screen.width / screen.height;
    } else {
      this.logger.log('info', 'debug', `[Resizer::calculateRatioForLegacyOptions] <rid:${this.resizerId}> Player dimensions:`, this.conf.player.dimensions.width ,'x', this.conf.player.dimensions.height,'aspect ratio:', this.conf.player.dimensions.width / this.conf.player.dimensions.height)
      ratioOut = this.conf.player.dimensions.width / this.conf.player.dimensions.height;
    }

    // IMPORTANT NOTE: lastAr needs to be set after _res_setAr() is called, as _res_setAr() assumes we're
    // setting a static aspect ratio (even if the function is called from here or ArDetect).

    let fileAr = this.conf.video.videoWidth / this.conf.video.videoHeight;

    if (ar.type === AspectRatioType.FitWidth){
      ar.ratio = ratioOut > fileAr ? ratioOut : fileAr;
    }
    else if(ar.type === AspectRatioType.FitHeight){
      ar.ratio = ratioOut < fileAr ? ratioOut : fileAr;
    }
    else if(ar.type === AspectRatioType.Reset){
      this.logger.log('info', 'debug', "[Scaler.js::modeToAr] Using original aspect ratio -", fileAr);
      ar.ratio = fileAr;
    } else {
      return null;
    }

    return ar;
  }

  updateAr(ar) {
    if (!ar) {
      return;
    }

    // Some options require a bit more testing re: whether they make sense
    // if they don't, we refuse to update aspect ratio until they do
    if (ar.type === AspectRatioType.AutomaticUpdate || ar.type === AspectRatioType.Fixed) {
      if (!ar.ratio || isNaN(ar.ratio)) {
        return;
      }
    }

    // Only update aspect ratio if there's a difference between the old and the new state
    if (!this.lastAr || ar.type !== this.lastAr.type || ar.ratio !== this.lastAr.ratio) {
      this.setAr(ar);
    }
  }

  async setAr(ar: {type: any, ratio?: number}, lastAr?: {type: any, ratio?: number}) {
    if (this.destroyed) {
      return;
    }

    // handle autodetection stuff
    if (ar.type === AspectRatioType.Automatic) {
      this.conf.arDetector.start();
      return;
    } else if (ar.type !== AspectRatioType.AutomaticUpdate) {
      this.conf.arDetector.stop();
    }

    // unless we're trying to reset aspect ratio, we need to tell VideoData that this would
    // be a good time to start injecting CSS modifications into the page.
    //
    // CSS, et. al. initialization is deferred in order to avoid breaking wonky sites by default.
    if (ar.type !== AspectRatioType.Reset && ar.type !== AspectRatioType.Initial) {
      await this.conf.preparePage();
    }

    if (ar.type !== AspectRatioType.AutomaticUpdate) {
      this.manualZoom = false;
    }

    if (!this.video.videoWidth || !this.video.videoHeight) {
      this.logger.log('warning', 'debug', '[Resizer::setAr] <rid:'+this.resizerId+'> Video has no width or no height. This is not allowed. Aspect ratio will not be set, and videoData will be uninitialized.');
      this.conf.videoUnloaded();
    }

    this.logger.log('info', 'debug', '[Resizer::setAr] <rid:'+this.resizerId+'> trying to set ar. New ar:', ar);

    if (ar == null) {
      return;
    }

    const siteSettings = this.settings.active.sites[window.location.hostname];
    let stretchFactors: {xFactor: number, yFactor: number, arCorrectionFactor?: number, ratio?: number} | any;

    // reset zoom, but only on aspect ratio switch. We also know that aspect ratio gets converted to
    // AspectRatioType.Fixed when zooming, so let's keep that in mind
    if (
      (ar.type !== AspectRatioType.Fixed && ar.type !== AspectRatioType.Manual) // anything not these two _always_ changes AR
      || ar.type !== this.lastAr.type                                   // this also means aspect ratio has changed
      || ar.ratio !== this.lastAr.ratio                                 // this also means aspect ratio has changed
      ) {
      this.zoom.reset();
      this.resetPan();
    }

    // most everything that could go wrong went wrong by this stage, and returns can happen afterwards
    // this means here's the optimal place to set or forget aspect ratio. Saving of current crop ratio
    // is handled in pageInfo.updateCurrentCrop(), which also makes sure to persist aspect ratio if ar
    // is set to persist between videos / through current session / until manual reset.
    if (ar.type === AspectRatioType.Automatic ||
        ar.type === AspectRatioType.Reset ||
        ar.type === AspectRatioType.Initial ) {
      // reset/undo default
      this.conf.pageInfo.updateCurrentCrop(undefined);
    } else {
      this.conf.pageInfo.updateCurrentCrop(ar);
    }

    if (lastAr) {
      this.lastAr = this.calculateRatioForLegacyOptions(lastAr);
      ar = this.calculateRatioForLegacyOptions(ar);
    } else {
      // NOTE: "fitw" "fith" and "reset" should ignore ar.ratio bit, but
      // I'm not sure whether they do. Check that.
      ar = this.calculateRatioForLegacyOptions(ar);
      if (! ar) {
        this.logger.log('info', 'resizer', `[Resizer::setAr] <${this.resizerId}> Something wrong with ar or the player. Doing nothing.`);
        return;
      }
      this.lastAr = {type: ar.type, ratio: ar.ratio};
    }

    if (! this.video) {
      this.conf.destroy();
    }

    // pause AR on:
    // * ar.type NOT automatic
    // * ar.type is auto, but stretch is set to basic basic stretch
    //
    // unpause when using other modes
    if (ar.type !== AspectRatioType.Automatic || this.stretcher.mode === StretchType.Basic) {
      this.conf?.arDetector?.pause();
    } else {
      if (this.lastAr.type === AspectRatioType.Automatic) {
        this.conf?.arDetector?.unpause();
      }
    }

    // do stretch thingy
    if (this.stretcher.mode === StretchType.NoStretch
        || this.stretcher.mode === StretchType.Conditional
        || this.stretcher.mode === StretchType.FixedSource){

      stretchFactors = this.scaler.calculateCrop(ar);

      if(! stretchFactors || stretchFactors.error){
        this.logger.log('error', 'debug', `[Resizer::setAr] <rid:${this.resizerId}> failed to set AR due to problem with calculating crop. Error:`, stretchFactors?.error);
        if (stretchFactors?.error === 'no_video'){
          this.conf.destroy();
          return;
        }

        // we could have issued calculate crop too early. Let's tell VideoData that there's something wrong
        // and exit this function. When <video> will receive onloadeddata or ontimeupdate (receiving either
        // of the two means video is loaded or playing, and that means video has proper dimensions), it will
        // try to reset or re-apply aspect ratio when the video is finally ready.
        if (stretchFactors?.error === 'illegal_video_dimensions') {
          this.conf.videoDimensionsLoaded = false;
          return;
        }
      }

      if (this.stretcher.mode === StretchType.Conditional){
        this.stretcher.applyConditionalStretch(stretchFactors, ar.ratio);
      } else if (this.stretcher.mode === StretchType.FixedSource) {
        this.stretcher.applyStretchFixedSource(stretchFactors);
      }
      this.logger.log('info', 'debug', "[Resizer::setAr] Processed stretch factors for ",
                      this.stretcher.mode === StretchType.NoStretch ? 'stretch-free crop.' :
                        this.stretcher.mode === StretchType.Conditional ? 'crop with conditional StretchType.' : 'crop with fixed stretch',
                      'Stretch factors are:', stretchFactors
      );

    } else if (this.stretcher.mode === StretchType.Hybrid) {
      stretchFactors = this.stretcher.calculateStretch(ar.ratio);
      this.logger.log('info', 'debug', '[Resizer::setAr] Processed stretch factors for hybrid stretch/crop. Stretch factors are:', stretchFactors);
    } else if (this.stretcher.mode === StretchType.Fixed) {
      stretchFactors = this.stretcher.calculateStretchFixed(ar.ratio)
    } else if (this.stretcher.mode === StretchType.Basic) {
      stretchFactors = this.stretcher.calculateBasicStretch();
      this.logger.log('info', 'debug', '[Resizer::setAr] Processed stretch factors for basic StretchType. Stretch factors are:', stretchFactors);
    } else {
      stretchFactors = this.scaler.calculateCrop(ar);
      this.logger.log(
        'error', 'debug',
        '[Resizer::setAr] Okay wtf happened? If you see this, something has gone wrong. Pretending stretchMode is set tu NoStretch. Stretch factors are:', stretchFactors,
        "\n------[ i n f o   d u m p ]------\nstretcher:", this.stretcher,
        '\nargs: ar (corrected for legacy):', ar, 'last ar (optional argument):', lastAr
      );
    }

    this.applyScaling(stretchFactors);
  }

  applyScaling(stretchFactors, options?: {noAnnounce?: boolean}) {
    this.stretcher.chromeBugMitigation(stretchFactors);

    // let the UI know
    if(!options?.noAnnounce) {
      this.conf.eventBus.send('announce-zoom', {x: stretchFactors.xFactor, y: stretchFactors.yFactor});
    }

    let translate = this.computeOffsets(stretchFactors);
    this.applyCss(stretchFactors, translate);
  }

  toFixedAr() {
    // converting to fixed AR means we also turn off autoAR
    this.setAr({
      ratio: this.lastAr.ratio,
      type: AspectRatioType.Fixed
    });
  }

  resetLastAr() {
    this.lastAr = {type: AspectRatioType.Initial};
  }

  setLastAr(override){
    this.lastAr = override;
  }

  getLastAr(){
    return this.lastAr;
  }

  setStretchMode(stretchMode, fixedStretchRatio?){
    this.stretcher.setStretchMode(stretchMode, fixedStretchRatio);
    this.restore();
  }

  panHandler(event, forcePan) {
    if (this.canPan || forcePan) {
      if(!this.conf.player || !this.conf.player.element) {
        return;
      }
      // dont allow weird floats
      this.videoAlignment.x = VideoAlignmentType.Center;

      // because non-fixed aspect ratios reset panning:
      if (this.lastAr.type !== AspectRatioType.Fixed) {
        this.toFixedAr();
      }

      const player = this.conf.player.element;

      const relativeX = (event.pageX - player.offsetLeft) / player.offsetWidth;
      const relativeY = (event.pageY - player.offsetTop) / player.offsetHeight;

      this.logger.log('info', 'mousemove', "[Resizer::panHandler] mousemove.pageX, pageY:", event.pageX, event.pageY, "\nrelativeX/Y:", relativeX, relativeY)

      this.setPan(relativeX, relativeY);
    }
  }

  resetPan() {
    this.pan = {x: 0, y: 0};
    // this.videoAlignment = {x: this.settings.getDefaultVideoAlignment(window.location.hostname), y: VideoAlignmentType.Center};
  }

  setPan(relativeMousePosX, relativeMousePosY){
    // relativeMousePos[X|Y] - on scale from 0 to 1, how close is the mouse to player edges.
    // use these values: top, left: 0, bottom, right: 1
    if(! this.pan){
      this.pan = {x: 0, y: 0};
    }

    if (this.settings.active.miscSettings.mousePanReverseMouse) {
      this.pan.relativeOffsetX = (relativeMousePosX * 1.1) - 0.55;
      this.pan.relativeOffsetY = (relativeMousePosY * 1.1) - 0.55;
    } else {
      this.pan.relativeOffsetX = -(relativeMousePosX * 1.1) + 0.55;
      this.pan.relativeOffsetY = -(relativeMousePosY * 1.1) + 0.55;
    }
    this.restore();
  }

  setVideoAlignment(videoAlignmentX: VideoAlignmentType, videoAlignmentY?: VideoAlignmentType) {
    this.videoAlignment = {
      x: videoAlignmentX ?? VideoAlignmentType.Default,
      y: videoAlignmentY ?? VideoAlignmentType.Default
    };
    this.restore();
  }

  restore() {
    if (!this.manualZoom) {
      this.logger.log('info', 'debug', "[Resizer::restore] <rid:"+this.resizerId+"> attempting to restore aspect ratio", {'lastAr': this.lastAr} );

      // this is true until we verify that css has actually been applied
      if(this.lastAr.type === AspectRatioType.Initial){
        this.setAr({type: AspectRatioType.Reset});
      }
      else {
        if (this.lastAr?.ratio === null) {
          // if this is the case, we do nothing as we have the correct aspect ratio
          // throw "Last ar is null!"
          return;
        }
        this.setAr(this.lastAr, this.lastAr)
      }
    } else {
      this.applyScaling({xFactor: this.zoom.scale, yFactor: this.zoom.scaleY});
    }

  }

  reset(){
    this.setStretchMode(this.settings.active.sites[window.location.hostname]?.stretch ?? this.settings.active.sites['@global'].stretch);
    this.zoom.setZoom(1);
    this.resetPan();
    this.setAr({type: AspectRatioType.Reset});
  }

  setPanMode(mode) {
    if (mode === 'enable') {
      this.canPan = true;
    } else if (mode === 'disable') {
      this.canPan = false;
    } else if (mode === 'toggle') {
      this.canPan = !this.canPan;
    }
  }

  setZoom(zoomLevel: number, axis?: 'x' | 'y', noAnnounce?) {
    this.manualZoom = true;
    this.zoom.setZoom(zoomLevel, axis, noAnnounce);
  }

  zoomStep(step){
    this.manualZoom = true;
    this.zoom.zoomStep(step);
  }

  resetZoom(){
    this.zoom.setZoom(1);
    this.manualZoom = false;
    this.restore();
  }

  resetCrop(){
    this.setAr({type: AspectRatioType.Reset});
  }

  resetStretch(){
    this.stretcher.setStretchMode(StretchType.NoStretch);
    this.restore();
  }


  // mostly internal stuff

  /**
   * Returns the size of the video file _as displayed_ on the screen.
   * Consider the following example:
   *
   *   * player dimensions are 2560x1080
   *   * <video> is child of player
   *   * <video> has the following css: {width: 100%, height: 100%}
   *   * video file dimensions are 1280x720
   *
   * CSS will ensure that the dimensions of <video> tag are equal to the dimension of the
   * player element — that is, 2560x1080px. This is no bueno, because the browser will upscale
   * the video file to take up as much space as it can (without stretching it). This means
   * we'll get a 1920x1080 video (as displayed) and a letterbox.
   *
   * We can't get that number out of anywhere: video.videoWidth will return 1280 (video file
   * dimensions) and .offsetWidth (and the likes) will return the <video> tag dimension. Neither
   * will return the actual size of video as displayed, which we need in order to calculate the
   * extra space to the left and right of the video.
   *
   * We make the assumption of the
   */
  computeVideoDisplayedDimensions() {
    const offsetWidth = this.conf.video.offsetWidth;
    const offsetHeight = this.conf.video.offsetHeight;

    const scaleX = offsetWidth / this.conf.video.videoWidth;
    const scaleY = offsetHeight / this.conf.video.videoHeight;

    // if differences between the scale factors are minimal, we presume offsetWidth and
    // offsetHeight are the accurate enough for our needs
    if (Math.abs(scaleX - scaleY) < 0.02) {
      return {
        realVideoWidth: offsetWidth,
        realVideoHeight: offsetHeight,
        marginX: 0,
        marginY: 0,
      }
    }

    // if we're still here, we need to calculate real video dimensions
    const diffX = Math.abs(scaleY * this.conf.video.videoWidth - offsetWidth);
    const diffY = Math.abs(scaleX * this.conf.video.videoHeight - offsetHeight);

    // in this case, we want to base our real dimensions off scaleX
    // otherwise, we want to base it off scaleY
    if (diffX < diffY) {
      const realHeight = this.conf.video.videoHeight * scaleX;
      return {
        realVideoWidth: offsetWidth,
        realVideoHeight: realHeight,
        marginX: 0,
        marginY: (offsetHeight - realHeight) * 0.5
      }
    } else {
      const realWidth = this.conf.video.videoWidth * scaleY;
      return {
        realVideoWidth: realWidth,
        realVideoHeight: offsetHeight,
        marginX: (offsetWidth - realWidth) * 0.5,
        marginY: 0
      }
    }
  }

  computeCroppedAreas(stretchFactors) {
    // PSA: offsetWidth and offsetHeight DO NOT INCLUDE
    // ZOOM APPLIED THROUGH THE MAGIC OF CSS TRANSFORMS
    const sourceWidth = this.conf.video.offsetWidth;
    const sourceHeight = this.conf.video.offsetHeight;

    // this is the size of the video AFTER zooming was applied but does
    // not account for cropping. It may be bigger than the player in
    // both dimensions. It may be smaller than player in both dimensions
    const postZoomWidth = sourceWidth * stretchFactors.xFactor;
    const postZoomHeight = sourceHeight * stretchFactors.yFactor;

    // this is the size of the video after crop is applied
    const displayedWidth = Math.min(this.conf.player.dimensions.width, postZoomWidth);
    const displayedHeight = Math.min(this.conf.player.dimensions.height, postZoomHeight);

    // these two are cropped areas. Negative values mean additional
    // letterboxing or pillarboxing. We assume center alignment for
    // the time being - we will correct that later if need be
    const croppedX = (postZoomWidth - displayedWidth) * 0.5;
    const croppedY = (postZoomHeight - displayedHeight) * 0.5;

    return {
      sourceVideoDimensions: {width: sourceWidth, height: sourceHeight},
      postZoomVideoDimensions: {width: postZoomWidth, height: postZoomHeight},
      displayedVideoDimensions: {width: displayedWidth, height: displayedHeight},
      crop: {left: croppedX, top: croppedY},
    };
  }

  /**
   * Sometimes, sites (e.g. new reddit) will guarantee that video fits width of its container
   * and let the browser figure out the height through the magic of height:auto. This is bad,
   * because our addon generally relies of videos always being 100% of the height of the
   * container.
   *
   * This sometimes leads to a situation where realVideoHeight and realVideoWidth — at least
   * one of which should be roughly equal to the player width or hight with the other one being
   * either smaller or equal — are both smaller than player width or height; and sometimes
   * rather substantially. Fortunately for us, realVideo[Width|Height] and player dimensions
   * never lie, which allows us to calculate the extra scale factor we need.
   *
   * Returned factor for this function should do fit:contain, not fit:cover.
   * @param realVideoWidth real video width
   * @param realVideoHeight real video height
   * @param playerWidth player width
   * @param playerHeight player height
   * @param mode whether to
   */
  computeAutoHeightCompensationFactor(realVideoWidth: number, realVideoHeight: number, playerWidth: number, playerHeight: number, mode: 'height' | 'width'): number {
    const widthFactor = playerWidth / realVideoWidth;
    const heightFactor = playerHeight / realVideoHeight;

    return mode === 'height' ? heightFactor : widthFactor;
  }

  private _computeOffsetsRecursionGuard: boolean = false;
  computeOffsets(stretchFactors: VideoDimensions){
    this.logger.log('info', 'debug', "[Resizer::computeOffsets] <rid:"+this.resizerId+"> video will be aligned to ", this.settings.active.sites['@global'].videoAlignment);

    const {realVideoWidth, realVideoHeight, marginX, marginY} = this.computeVideoDisplayedDimensions();

    const {postZoomVideoDimensions, displayedVideoDimensions, crop} = this.computeCroppedAreas(stretchFactors);

    // correct any remaining element size discrepencies (applicable only to certain crop strategies!)
    // NOTE: it's possible that we might also need to apply a similar measure for CropPillarbox strategy
    // (but we'll wait for bug reports before doing so).
    // We also don't compensate for height:auto if height is provided via element style
    let autoHeightCompensationFactor;
    if (
      stretchFactors.cropStrategy === CropStrategy.CropLetterbox
      && (!stretchFactors.styleHeightCompensationFactor || stretchFactors.styleHeightCompensationFactor === 1)
    ) {
      autoHeightCompensationFactor = this.computeAutoHeightCompensationFactor(realVideoWidth, realVideoHeight, this.conf.player.dimensions.width, this.conf.player.dimensions.height, 'height');
      stretchFactors.xFactor *= autoHeightCompensationFactor;
      stretchFactors.yFactor *= autoHeightCompensationFactor;
    }

    const offsetWidth = this.conf.video.offsetWidth;
    const offsetHeight = this.conf.video.offsetHeight;

    const wdiff = this.conf.player.dimensions.width - realVideoWidth;
    const hdiff = this.conf.player.dimensions.height - realVideoHeight;

    const wdiffAfterZoom = realVideoWidth * stretchFactors.xFactor - this.conf.player.dimensions.width;
    const hdiffAfterZoom = realVideoHeight * stretchFactors.yFactor - this.conf.player.dimensions.height;

    const translate = {
      x: wdiff * 0.5,
      y: hdiff * 0.5,
    };


    if (this.pan.relativeOffsetX || this.pan.relativeOffsetY) {
      // don't offset when video is smaller than player
      if(wdiffAfterZoom >= 0 || hdiffAfterZoom >= 0) {
        translate.x += wdiffAfterZoom * this.pan.relativeOffsetX * this.zoom.scale;
        translate.y += hdiffAfterZoom * this.pan.relativeOffsetY * this.zoom.scale;
      }
    } else {
      // correct horizontal alignment according to the settings
      if (this.videoAlignment.x == VideoAlignmentType.Left) {
        translate.x += wdiffAfterZoom * 0.5;
      } else if (this.videoAlignment.x == VideoAlignmentType.Right) {
        translate.x -= wdiffAfterZoom * 0.5;
      }

      // correct vertical alignment according to the settings
      if (this.videoAlignment.y == VideoAlignmentType.Top) {
        translate.y += hdiffAfterZoom * 0.5;
      } else if (this.videoAlignment.y == VideoAlignmentType.Bottom) {
        translate.y -= hdiffAfterZoom * 0.5;
      }
    }

    this.logger.log(
      'info', ['debug', 'resizer'], "[Resizer::_res_computeOffsets] <rid:"+this.resizerId+"> calculated offsets:",
      '\n\n---- elements ----',
      '\nplayer element:       ', this.conf.player.element,
      '\nvideo element:        ', this.conf.video,
      '\n\n---- data in ----',
      '\nplayer dimensions:    ', {w: this.conf.player.dimensions.width, h: this.conf.player.dimensions.height},
      '\nvideo dimensions:     ', {w: this.conf.video.offsetWidth, h: this.conf.video.offsetHeight},
      '\nreal video dimensions:', {w: realVideoWidth, h: realVideoHeight},
      '\nauto compensation:    ', 'x', autoHeightCompensationFactor,
      '\nstretch factors:      ', stretchFactors,
      '\npan & zoom:           ', this.pan, this.zoom.scale,
      '\nwdiff, hdiff:         ', wdiff, 'x', hdiff,
      '\nwdiff, hdiffAfterZoom:', wdiffAfterZoom, 'x', hdiffAfterZoom,
      '\n\n---- data out ----\n',
      'translate:', translate
    );

    // by the way, let's do a quick sanity check whether video player is doing any fuckies wuckies
    // fucky wucky examples:
    //
    //       * video width is bigger than player width AND video height is bigger than player height
    //       * video width is smaller than player width AND video height is smaller than player height
    //
    // In both examples, at most one of the two conditions can be true at the same time. If both
    // conditions are true at the same time, we need to go 'chiny reckon' and recheck our player
    // element. Chances are our video is not getting aligned correctly
    if (
      (this.conf.video.offsetWidth > this.conf.player.dimensions.width && this.conf.video.offsetHeight > this.conf.player.dimensions.height) ||
      (this.conf.video.offsetWidth < this.conf.player.dimensions.width && this.conf.video.offsetHeight < this.conf.player.dimensions.height)
    ) {
      this.logger.log('warn', ['debugger', 'resizer'], `[Resizer::_res_computeOffsets] <rid:${this.resizerId}> We are getting some incredibly funny results here.\n\n`,
        `Video seems to be both wider and taller (or shorter and narrower) than player element at the same time. This is super duper not supposed to happen.\n\n`,
        `Player element needs to be checked.`
      )

      // sometimes this appears to randomly recurse.
      // There seems to be no way to reproduce it.
      if (! this._computeOffsetsRecursionGuard) {
        this._computeOffsetsRecursionGuard = true;
        this.conf.player.trackDimensionChanges();
        this._computeOffsetsRecursionGuard = false;
      }
    }

    return translate;
  }

  //#region css handling
  buildStyleArray(existingStyleString, extraStyleString) {
    if (existingStyleString) {
      const styleArray = existingStyleString.split(";");

      if (extraStyleString) {
        const extraCss = extraStyleString.split(';');
        let dup = false;

        for (const ecss of extraCss) {
          for (let i in styleArray) {
            if (ecss.split(':')[0].trim() === styleArray[i].split(':')[0].trim()) {
              dup = true;
              styleArray[i] = ecss;
            }
            if (dup) {
              dup = false;
              continue;
            }
            styleArray.push(ecss);
          }
        }
      }

      for (let i in styleArray) {
        styleArray[i] = styleArray[i].trim();
        // some sites do 'top: 50%; left: 50%; transform: <transform>' to center videos.
        // we dont wanna, because we already center videos on our own
        if (styleArray[i].startsWith("transform:")
            || styleArray[i].startsWith("top:")
            || styleArray[i].startsWith("left:")
            || styleArray[i].startsWith("right:")
            || styleArray[i].startsWith("bottom:")
            || styleArray[i].startsWith("margin")
          ){
          delete styleArray[i];
        }
      }
      return styleArray;
    }

    return [];
  }

  buildStyleString(styleArray) {
    let styleString = '';

    for(let i in styleArray) {
      if(styleArray[i]) {
        styleString += styleArray[i] + " !important; ";
      }
    }

    return styleString;
  }

  applyCss(stretchFactors, translate){
    // apply extra CSS here. In case of duplicated properties, extraCss overrides
    // default styleString
    if (! this.video) {
      this.logger.log('warn', 'debug', "[Resizer::applyCss] <rid:"+this.resizerId+"> Video went missing, doing nothing.");

      this.conf.destroy();
      return;
    }

    this.logger.log('info', ['debug', 'resizer'], "[Resizer::applyCss] <rid:"+this.resizerId+"> will apply css.", {stretchFactors, translate});

    // save stuff for quick tests (before we turn numbers into css values):
    this.currentVideoSettings = {
      validFor:  this.conf.player.dimensions,
      // videoWidth: dimensions.width,
      // videoHeight: dimensions.height
    }

    let extraStyleString;
    try {
      extraStyleString = this.settings.active.sites[window.location.hostname].DOM.video.additionalCss;
    } catch (e) {
      // do nothing. It's ok if no special settings are defined for this site, we'll just do defaults
    }

    const styleArray = this.buildStyleArray('', extraStyleString)

    // add remaining elements
    if (stretchFactors) {
      styleArray.push(`transform: translate(${translate.x}px, ${translate.y}px) scale(${stretchFactors.xFactor}, ${stretchFactors.yFactor}) !important;`);

      // important — guarantees video will be properly aligned
      // Note that position:absolute cannot be put here, otherwise old.reddit /w RES breaks — videos embedded
      // from certain hosts will get a height: 0px. This is bad.
      styleArray.push("top: 0px !important; left: 0px !important; bottom: 0px !important; right: 0px;");

      // important — some websites (cough reddit redesign cough) may impose some dumb max-width and max-height
      // restrictions. If site has dumb shit like 'max-width: 100%' and 'max-height: 100vh' in their CSS, that
      // shit will prevent us from applying desired crop. This means we need to tell websites to fuck off with
      // that crap. We know better.
      styleArray.push("max-width: none !important; max-height: none !important;");
    }
    const styleString = `${this.buildStyleString(styleArray)}${extraStyleString || ''}`; // string returned by buildStyleString() should end with ; anyway

    // build style string back
    this.setStyleString(styleString);
  }

  setStyleString (styleString) {
    this.currentCssValidFor = this.conf.player.dimensions;
    const newCssString = this.prepareCss(styleString);

    // inject new CSS or replace existing one
    if (!this.userCss) {
      this.logger.log('info', ['debug', 'resizer'], "[Resizer::setStyleString] <rid:"+this.resizerId+"> Setting new css: ", newCssString);

      this.injectCss(newCssString);
      this.userCss = newCssString;
    } else if (newCssString !== this.userCss) {
      this.logger.log('info', ['debug', 'resizer'], "[Resizer::setStyleString] <rid:"+this.resizerId+"> Replacing css.\nOld string:", this.userCss, "\nNew string:", newCssString);
      // we only replace css if it
      this.replaceCss(this.userCss, newCssString);
      this.userCss = newCssString;
    } else {
      this.logger.log('info', ['debug', 'resizer'], "[Resizer::setStyleString] <rid:"+this.resizerId+"> Existing css is still valid, doing nothing.");
    }
  }
  //#endregion
}

export default Resizer;
