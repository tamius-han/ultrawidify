import { SiteSettings } from './../settings/SiteSettings';
import Debug from '../../conf/Debug';
import Scaler, { CropStrategy, VideoDimensions } from './Scaler';
import Stretcher from './Stretcher';
import Zoom from './Zoom';
import StretchType from '../../../common/enums/StretchType.enum';
import VideoAlignmentType from '../../../common/enums/VideoAlignmentType.enum';
import AspectRatioType from '../../../common/enums/AspectRatioType.enum';
import VideoData from '../video-data/VideoData';
import EventBus from '../EventBus';
import { _cp } from '../../../common/js/utils';
import Settings from '../settings/Settings';
import { Ar, ArVariant } from '../../../common/interfaces/ArInterface';
import { RunLevel } from '../../enum/run-level.enum';
import * as _ from 'lodash';
import getElementStyles from '../../util/getElementStyles';
import { Stretch } from '../../../common/interfaces/StretchInterface';
import { ComponentLogger } from '../logging/ComponentLogger';

if(Debug.debug) {
  console.log("Loading: Resizer.js");
}

enum ResizerMode {
  Crop = 1,
  Zoom = 2
};

/**
 * Resizer is the top class and is responsible for figuring out which component needs to crop, which
 * component needs to zoom, and which component needs to stretch.
 *
 * It also kinda does lots of the work that should prolly be moved to Scaler.
 *
 */
class Resizer {
  //#region flags
  canPan: boolean = false;
  destroyed: boolean = false;
  manualZoom: boolean = false;
  //#endregion

  //#region helper objects
  logger: ComponentLogger;
  settings: Settings;
  siteSettings: SiteSettings;
  scaler: Scaler;
  stretcher: Stretcher;
  zoom: Zoom;
  videoData: VideoData;
  eventBus: EventBus;
  //#endregion

  //#region HTML elements
  video: HTMLVideoElement;
  //#endregion

  //#region data
  correctedVideoDimensions: any;
  currentCss: any;
  currentStyleString: string;
  currentPlayerStyleString: any;
  currentCssValidFor: any;
  currentVideoSettings: any;

  private effectiveZoom: {x: number, y: number} = {x: 1, y: 1};

  _lastAr: Ar = {type: AspectRatioType.Initial};
  set lastAr(x: Ar) {
    // emit updates for UI when setting lastAr, but only if AR really changed
    if (this._lastAr?.type !== x.type || this._lastAr?.ratio !== x.ratio) {
      this.eventBus.send('uw-config-broadcast', {type: 'ar', config: x});
    }
    this._lastAr = x;
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

  cycleableAspectRatios: Ar[];
  cycleableZoomAspectRatios: Ar[];
  nextCycleOptionIndex = 0;

  //#region event bus configuration
  private eventBusCommands = {
    'get-effective-zoom': [{
      function: () => {
        this.eventBus.send('announce-zoom', this.manualZoom ? {x: this.zoom.scale, y: this.zoom.scaleY} : this.zoom.effectiveZoom);
      }
    }],
    'set-ar': [{
      function: (config: any) => {
        this.manualZoom = false; // this only gets called from UI or keyboard shortcuts, making this action safe.

        if (config.type !== AspectRatioType.Cycle) {
          this.setAr({...config, variant: ArVariant.Crop});
        } else {
          // if we manually switched to a different aspect ratio, cycle from that ratio forward
          const lastArIndex = this.cycleableAspectRatios.findIndex(x => x.type === this.lastAr.type && x.ratio === this.lastAr.ratio);
          if (lastArIndex !== -1) {
            this.nextCycleOptionIndex = (lastArIndex + 1) % this.cycleableAspectRatios.length;
          }

          this.setAr({...this.cycleableAspectRatios[this.nextCycleOptionIndex], variant: ArVariant.Crop});
          this.nextCycleOptionIndex = (this.nextCycleOptionIndex + 1) % this.cycleableAspectRatios.length;
        }
      }
    }],
    'set-ar-zoom': [{
      function: (config: any) => {
        this.manualZoom = false; // this only gets called from UI or keyboard shortcuts, making this action safe.

        if (config.type !== AspectRatioType.Cycle) {
          this.setAr({...config, variant: ArVariant.Zoom});
        } else {
          // if we manually switched to a different aspect ratio, cycle from that ratio forward
          const lastArIndex = this.cycleableZoomAspectRatios.findIndex(x => x.type === this.lastAr.type && x.ratio === this.lastAr.ratio);
          if (lastArIndex !== -1) {
            this.nextCycleOptionIndex = (lastArIndex + 1) % this.cycleableZoomAspectRatios.length;
          }

          this.setAr({...this.cycleableZoomAspectRatios[this.nextCycleOptionIndex], variant: ArVariant.Zoom});
          this.nextCycleOptionIndex = (this.nextCycleOptionIndex + 1) % this.cycleableZoomAspectRatios.length;
        }
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
        this.setStretchMode(config)
      }
    }],
    'set-zoom': [{
      function: (config: any) => {
        this.setZoom(config?.zoom ?? {zoom: 1});
      }
    }],
    'change-zoom': [{
      function: (config: any) => this.zoomStep(config.zoom)
    }],
    'get-ar': [{
      function: () => this.eventBus.send('uw-config-broadcast', {type: 'ar', config: this.lastAr})
    }],
    'get-resizer-config': [{
      function: () => this.eventBus.send(
        'uw-resizer-config-broadcast',
        {
          ar: this.lastAr,
          stretchMode: this.stretcher.stretch,
          videoAlignment: this.videoAlignment
        }
      )
    }],
    'restore-ar': [{
      function: () => this.restore()
    }],
    'delayed-restore-ar': [{
      function: () => {
        _.debounce(
          this.restore,
          500,
          {
            leading: true,
            trailing: true
          }
        )
      }
    }]
  }
  //#endregion

  constructor(videoData) {
    this.resizerId = (Math.random()*100).toFixed(0);
    this.videoData = videoData;
    this.logger = new ComponentLogger(videoData.logAggregator, 'Resizer');
    this.video = videoData.video;
    this.settings = videoData.settings;
    this.siteSettings = videoData.siteSettings;
    this.eventBus = videoData.eventBus;
    this.initEventBus();

    this.scaler = new Scaler(this.videoData);
    this.stretcher = new Stretcher(this.videoData);
    this.zoom = new Zoom(this.videoData);

    const defaultCrop = this.siteSettings.getDefaultOption('crop') as {type: AspectRatioType, ratio?: number };
    if (defaultCrop.type !== AspectRatioType.Reset) {
      this.lastAr = defaultCrop;
    }

    this.videoAlignment = this.siteSettings.getDefaultOption('alignment') as {x: VideoAlignmentType, y: VideoAlignmentType} // this is initial video alignment

    this.destroyed = false;

    // if (this.siteSettings.active.pan) {
    //   this.canPan = this.siteSettings.active.miscSettings.mousePan.enabled;
    // } else {
    //   this.canPan = false;
    // }

    this.cycleableAspectRatios =
      (this.settings?.active?.commands?.crop ?? [])
        .filter(x => [AspectRatioType.FitHeight, AspectRatioType.FitWidth, AspectRatioType.Fixed, AspectRatioType.Reset].includes(x?.arguments?.type))
        .map(x => x.arguments) as Ar[];

    this.cycleableZoomAspectRatios =
      (this.settings?.active?.commands?.zoom ?? [])
        .filter(x => x.action === 'set-ar-zoom' && x.arguments?.type !== AspectRatioType.Cycle)
        .map(x => x.arguments) as Ar[];

    this.nextCycleOptionIndex = 0;
    this.userCssClassName = videoData.userCssClassName;
  }

  initEventBus() {
    for (const action in this.eventBusCommands) {
      for (const command of this.eventBusCommands[action]) {
        this.eventBus.subscribe(action, command);
      }
    }
  }


  prepareCss(css: string): string {
    return `.${this.userCssClassName} {${css}}`;
  }

  destroy(){
    this.logger.info('destroy', `<rid:${this.resizerId}> received destroy command.`);
    this.destroyed = true;
  }

  getFileAr(): number {
    return this.videoData.video.videoWidth / this.videoData.video.videoHeight;
  }

  calculateRatioForLegacyOptions(ar: Ar): Ar | null {
    // also present as modeToAr in Scaler.js
    if (ar.type !== AspectRatioType.FitWidth && ar.type !== AspectRatioType.FitHeight && ar.ratio) {
      return ar;
    }
    // handles "legacy" options, such as 'fit to widht', 'fit to height' and AspectRatioType.Reset. No zoom tho
    let ratioOut;

    if (!this.videoData.video) {
      this.logger.info('calculateRatioForLegacyOptions', "No video??", this.videoData.video, "— killing videoData");
      this.videoData.destroy();
      return null;
    }


    if (! this.videoData.player.dimensions) {
      ratioOut = screen.width / screen.height;
    } else {
      this.logger.info('calculateRatioForLegacyOptions', `<rid:${this.resizerId}> Player dimensions:`, this.videoData.player.dimensions.width ,'x', this.videoData.player.dimensions.height,'aspect ratio:', this.videoData.player.dimensions.width / this.videoData.player.dimensions.height)
      ratioOut = this.videoData.player.dimensions.width / this.videoData.player.dimensions.height;
    }

    // IMPORTANT NOTE: lastAr needs to be set after _res_setAr() is called, as _res_setAr() assumes we're
    // setting a static aspect ratio (even if the function is called from here or ArDetect).

    let fileAr = this.getFileAr();

    if (ar.type === AspectRatioType.FitWidth){
      ar.ratio = ratioOut > fileAr ? ratioOut : fileAr;
    }
    else if(ar.type === AspectRatioType.FitHeight){
      ar.ratio = ratioOut < fileAr ? ratioOut : fileAr;
    }
    else if(ar.type === AspectRatioType.Reset){
      this.logger.info('modeToAr', "Using original aspect ratio -", fileAr);
      ar.ratio = fileAr;
    } else {
      return null;
    }

    return ar;
  }

  updateAr(ar: Ar) {
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

  /**
   * Starts and stops Aard as necessary. Returns 'true' if we can
   * stop setting aspect ratio early.
   * @param ar
   * @param resizerMode
   * @returns
   */
  private handleAard(ar: Ar): boolean {
    if (ar.type === AspectRatioType.Automatic) {
      this.videoData.aard?.startCheck(ar.variant);
      return true;
    } else if (ar.type !== AspectRatioType.AutomaticUpdate) {
      this.videoData.aard?.stop();
    } else if (this.stretcher.stretch.type === StretchType.Basic) {
      this.videoData?.aard?.stop();
    }

  }

  async setAr(ar: Ar, lastAr?: Ar) {
    if (this.destroyed || ar == null) {
      return;
    }

    // If no aspect ratio is applied AND if no stretch mode is active,
    // we disable our CSS in order to prevent breaking websites by default,
    // without any human interaction
    if (
      [AspectRatioType.Reset, AspectRatioType.Initial].includes(ar.type) &&
      [StretchType.NoStretch, StretchType.Default].includes(this.stretcher.stretch.type)
    ) {
      this.eventBus.send('set-run-level', RunLevel.UIOnly);
    } else {
      this.eventBus.send('set-run-level', RunLevel.CustomCSSActive);
    }

    // handle autodetection stuff
    if (this.handleAard(ar)) {
      return;
    }

    if (ar.type !== AspectRatioType.AutomaticUpdate) {
      this.manualZoom = false;
    }

    if (!this.video.videoWidth || !this.video.videoHeight) {
      this.logger.warn('setAr', `<rid:${this.resizerId}> Video has no width or no height. This is not allowed. Aspect ratio will not be set, and videoData will be uninitialized.`);
      this.videoData.videoUnloaded();
    }

    this.logger.info('setAr', `<rid:${this.resizerId}> trying to set ar. New ar:`, ar, 'last ar override was', lastAr ? '' : 'NOT', 'provided:', lastAr);

    let stretchFactors: VideoDimensions | any;

    // reset zoom, but only on aspect ratio switch. We also know that aspect ratio gets converted to
    // AspectRatioType.Fixed when zooming, so let's keep that in mind
    if (
      (ar.type !== AspectRatioType.Fixed && ar.type !== AspectRatioType.Manual) // anything not these two _always_ changes AR
      || ar.type !== this.lastAr.type                                   // this also means aspect ratio has changed
      || ar.ratio !== this.lastAr.ratio                                 // this also means aspect ratio has changed
      || ar.variant !== this.lastAr.variant
    ) {
      this.zoom.reset();
      this.resetPan();
    }

    // most everything that could go wrong went wrong by this stage, and returns can happen afterwards
    // this means here's the optimal place to set or forget aspect ratio. Saving of current crop ratio
    // is handled in pageInfo.updateCurrentCrop(), which also makes sure to persist aspect ratio if ar
    // is set to persist between videos / through current session / until manual reset.
    // if (ar.type === AspectRatioType.Reset ||
    //     ar.type === AspectRatioType.Initial
    // ) {
    //   // reset/undo default
    //   this.videoData.pageInfo.updateCurrentCrop(undefined);
    // } else {
      this.videoData.pageInfo.updateCurrentCrop(ar);
    // }

    if (lastAr) {
      this.lastAr = this.calculateRatioForLegacyOptions(lastAr);
      ar = this.calculateRatioForLegacyOptions(ar);
    } else {
      // NOTE: "fitw" "fith" and "reset" should ignore ar.ratio bit, but
      // I'm not sure whether they do. Check that.
      ar = this.calculateRatioForLegacyOptions(ar);
      if (! ar) {
        this.logger.info('setAr', `<rid:${this.resizerId}> Something wrong with ar or the player. Doing nothing.`);
        return;
      }
      this.lastAr = {type: ar.type, ratio: ar.ratio};
    }

    if (! this.video) {
      this.videoData.destroy();
    }

    // do stretch thingy
    if ([StretchType.NoStretch, StretchType.Conditional, StretchType.FixedSource].includes(this.stretcher.stretch.type)) {
      stretchFactors = this.scaler.calculateCrop(ar);

      if (!stretchFactors || stretchFactors.error){
        this.logger.error('setAr', ` <rid:${this.resizerId}> failed to set AR due to problem with calculating crop. Error:`, stretchFactors?.error);
        if (stretchFactors?.error === 'no_video'){
          this.videoData.destroy();
          return;
        }

        // we could have issued calculate crop too early. Let's tell VideoData that there's something wrong
        // and exit this function. When <video> will receive onloadeddata or ontimeupdate (receiving either
        // of the two means video is loaded or playing, and that means video has proper dimensions), it will
        // try to reset or re-apply aspect ratio when the video is finally ready.
        if (stretchFactors?.error === 'illegal_video_dimensions') {
          this.videoData.videoDimensionsLoaded = false;
          return;
        }
      }

      if (this.stretcher.stretch.type === StretchType.Conditional){
        this.stretcher.applyConditionalStretch(stretchFactors, ar.ratio);
      } else if (this.stretcher.stretch.type === StretchType.FixedSource) {
        this.stretcher.applyStretchFixedSource(stretchFactors);
      }
      this.logger.info('setAr', "Processed stretch factors for ",
                      this.stretcher.stretch.type === StretchType.NoStretch ? 'stretch-free crop.' :
                        this.stretcher.stretch.type === StretchType.Conditional ? 'crop with conditional StretchType.' : 'crop with fixed stretch',
                      'Stretch factors are:', stretchFactors
      );
    } else if (this.stretcher.stretch.type === StretchType.Hybrid) {
      stretchFactors = this.stretcher.calculateStretch(ar.ratio);
      this.logger.info('setAr', 'Processed stretch factors for hybrid stretch/crop. Stretch factors are:', stretchFactors);
    } else if (this.stretcher.stretch.type === StretchType.Fixed) {
      stretchFactors = this.stretcher.calculateStretchFixed(ar.ratio);
    } else if (this.stretcher.stretch.type === StretchType.Basic) {
      stretchFactors = this.stretcher.calculateBasicStretch();
      this.logger.log('setAr', 'Processed stretch factors for basic StretchType. Stretch factors are:', stretchFactors);
    } else {
      stretchFactors = this.scaler.calculateCrop(ar);
      this.logger.error(
        'setAr',
        'Okay wtf happened? If you see this, something has gone wrong. Pretending stretchMode is set tu NoStretch. Stretch factors are:', stretchFactors,
        "\n------[ i n f o   d u m p ]------\nstretcher:", this.stretcher,
        '\nargs: ar (corrected for legacy):', ar, 'last ar (optional argument):', lastAr
      );
    }

    this.applyScaling(stretchFactors as VideoDimensions);
  }

  applyScaling(stretchFactors: VideoDimensions, options?: {noAnnounce?: boolean, ar?: Ar}) {
    this.zoom.effectiveZoom = {x: stretchFactors.xFactor, y: stretchFactors.yFactor};

    // announcing zoom somehow keeps incorrectly resetting zoom sliders in UI — UI is now polling for effective zoom while visible
    // if(!options?.noAnnounce) {
    //   this.videoData.eventBus.send('announce-zoom', this.manualZoom ? {x: this.zoom.scale, y: this.zoom.scaleY} : this.zoom.effectiveZoom);
    // }

    let translate = this.computeOffsets(stretchFactors, options?.ar);
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


  setStretchMode(stretch: {type: StretchType, ratio?: number}) {
    this.stretcher.setStretchMode(stretch);
    this.restore();
  }

  panHandler(event, forcePan) {
    if (this.canPan || forcePan) {
      if(!this.videoData.player || !this.videoData.player.element) {
        return;
      }
      // don't allow weird floats
      this.videoAlignment.x = VideoAlignmentType.Center;

      // because non-fixed aspect ratios reset panning:
      if (this.lastAr.type !== AspectRatioType.Fixed) {
        this.toFixedAr();
      }

      const player = this.videoData.player.element;

      const relativeX = (event.pageX - player.offsetLeft) / player.offsetWidth;
      const relativeY = (event.pageY - player.offsetTop) / player.offsetHeight;

      this.logger.info({src: 'panHandler', origin: 'mousemove'}, "mousemove.pageX, pageY:", event.pageX, event.pageY, "\nrelativeX/Y:", relativeX, relativeY);

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
    // if aspect ratio is unset or initial, CSS fixes are inactive by design.
    // because of that, we need to set a manual aspect ratio first.

    if (!this.lastAr?.ratio) {
      this.setAr({
        type: AspectRatioType.AutomaticUpdate,
        ratio: this.getFileAr()
      });
    }

    if ([AspectRatioType.Reset, AspectRatioType.Initial].includes(this.lastAr.type)) {
      if (this.lastAr.ratio) {
        this.lastAr.type = AspectRatioType.Fixed;
      } else {
        this.setAr({
          type: AspectRatioType.Fixed,
          ratio: this.getFileAr()
        });
      }
    }

    this.videoAlignment = {
      x: videoAlignmentX ?? VideoAlignmentType.Default,
      y: videoAlignmentY ?? VideoAlignmentType.Default
    };
    this.restore();
  }

  /**
   * Restores aspect ratio to last known aspect ratio
   * @returns
   */
  restore() {
    if (!this.manualZoom) {
      this.logger.info('restore', `<rid:${this.resizerId}> attempting to restore aspect ratio`, {'lastAr': this.lastAr} );

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
    this.setStretchMode(this.siteSettings.getDefaultOption('stretch') as Stretch);
    this.zoom.setZoom(1);
    this.resetPan();
    this.setAr({type: AspectRatioType.Reset});
    this.unsetStyleString();
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

  private _setZoomTimeout;
  private _latestSetZoomArgs: any | undefined;
  private _SET_ZOOM_RATE_LIMIT_MS = 50;
  /**
   * Sets zoom level. This function is rate limited, because slider may spam the fuck out of this function call
   * @param zoomLevel
   * @param axis
   * @param noAnnounce
   * @returns
   */
  setZoom(zoomLevel: number | {x: number, y: number}, noAnnounce?) {
    if (this._setZoomTimeout) {
      this._latestSetZoomArgs = {zoomLevel, noAnnounce};
      return;
    }
    this.manualZoom = true;
    this.zoom.setZoom(zoomLevel);

    this._setZoomTimeout = setTimeout(
      () => {
        clearTimeout(this._setZoomTimeout);
        this._setZoomTimeout = undefined;

        if (this._latestSetZoomArgs) {
          this.setZoom(this._latestSetZoomArgs.zoomLevel);
        }
        this._latestSetZoomArgs = undefined;
      },
      this._SET_ZOOM_RATE_LIMIT_MS
    );
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
    this.stretcher.setStretchMode({type: StretchType.NoStretch});
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
    const offsetWidth = this.videoData.video.offsetWidth;
    const offsetHeight = this.videoData.video.offsetHeight;

    const scaleX = offsetWidth / this.videoData.video.videoWidth;
    const scaleY = offsetHeight / this.videoData.video.videoHeight;

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
    const diffX = Math.abs(scaleY * this.videoData.video.videoWidth - offsetWidth);
    const diffY = Math.abs(scaleX * this.videoData.video.videoHeight - offsetHeight);

    // in this case, we want to base our real dimensions off scaleX
    // otherwise, we want to base it off scaleY
    if (diffX < diffY) {
      const realHeight = this.videoData.video.videoHeight * scaleX;
      return {
        realVideoWidth: offsetWidth,
        realVideoHeight: realHeight,
        marginX: 0,
        marginY: (offsetHeight - realHeight) * 0.5
      }
    } else {
      const realWidth = this.videoData.video.videoWidth * scaleY;
      return {
        realVideoWidth: realWidth,
        realVideoHeight: offsetHeight,
        marginX: (offsetWidth - realWidth) * 0.5,
        marginY: 0
      }
    }
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
  computeOffsets(stretchFactors: VideoDimensions, ar?: Ar){
    this.logger.info('computeOffsets', `<rid:${this.resizerId}> video will be aligned to `, this.videoAlignment, '— stretch factors before processing:', stretchFactors);

    const {realVideoWidth, realVideoHeight, marginX, marginY} = this.computeVideoDisplayedDimensions();

    // correct any remaining element size discrepancies (applicable only to certain crop strategies!)
    // NOTE: it's possible that we might also need to apply a similar measure for CropPillarbox strategy
    // (but we'll wait for bug reports before doing so).
    // We also don't compensate for height:auto if height is provided via element style
    let autoHeightCompensationFactor;
    if (
      stretchFactors.cropStrategy === CropStrategy.CropLetterbox
      && (!stretchFactors.styleHeightCompensationFactor || stretchFactors.styleHeightCompensationFactor === 1)
    ) {
      autoHeightCompensationFactor = this.computeAutoHeightCompensationFactor(
        realVideoWidth, realVideoHeight,
        this.videoData.player.dimensions.width, this.videoData.player.dimensions.height,
        'height'
      );
      stretchFactors.xFactor *= autoHeightCompensationFactor;
      stretchFactors.yFactor *= autoHeightCompensationFactor;
    }

    // NOTE: transform: scale() is self-centering by default.
    // we only need to compensate if alignment is set to anything other than center center
    // compensation is equal to half the difference between (zoomed) video size and player size.
    const translate = {
      x: 0,
      y: 0
    };

    const problemStats = getElementStyles(this.video, ['top', 'left', 'transform'], ['transform']);
    if (problemStats.left?.css && problemStats.top?.css && problemStats.transform?.css?.includes(`translate(-${problemStats.left.css}, -${problemStats.top.css})`)) {
      translate.x -= ~~problemStats.left.pxValue;
      translate.y -= ~~problemStats.top.pxValue;
    }

    // NOTE: manual panning is probably broken now.
    // TODO: FIXME:
    // (argument could be made that manual panning was also broken before)
    const alignXOffset = (realVideoWidth * stretchFactors.xFactor - this.videoData.player.dimensions.width) * 0.5;
    const alignYOffset = (realVideoHeight * stretchFactors.yFactor - this.videoData.player.dimensions.height) * 0.5;

    if (this.pan?.relativeOffsetX || this.pan?.relativeOffsetY) {
      // don't offset when video is smaller than player
      if(alignXOffset >= 0 || alignYOffset >= 0) {
        translate.x += alignXOffset * this.pan.relativeOffsetX * this.zoom.scale;
        translate.y += alignYOffset * this.pan.relativeOffsetY * this.zoom.scale;
      }
    } else {
      // correct horizontal alignment according to the settings
      if (!stretchFactors.preventAlignment?.x) {
        if (this.videoAlignment.x == VideoAlignmentType.Left) {
          translate.x += stretchFactors?.relativeCropLimits?.left ? (this.videoData.player.dimensions.width * stretchFactors.relativeCropLimits.left): alignXOffset;
        } else if (this.videoAlignment.x == VideoAlignmentType.Right) {
          translate.x -= stretchFactors?.relativeCropLimits?.left ? (this.videoData.player.dimensions.width * stretchFactors.relativeCropLimits.left): alignXOffset
        }
      }

      // correct vertical alignment according to the settings
      if (!stretchFactors.preventAlignment?.y) {
        if (this.videoAlignment.y == VideoAlignmentType.Top) {
          translate.y += stretchFactors?.relativeCropLimits?.top ? (this.videoData.player.dimensions.height * stretchFactors?.relativeCropLimits?.top): alignYOffset;
        } else if (this.videoAlignment.y == VideoAlignmentType.Bottom) {
          translate.y -= stretchFactors?.relativeCropLimits?.top ? (this.videoData.player.dimensions.height * stretchFactors?.relativeCropLimits?.top): alignYOffset;
        }
      }
    }

    this.logger.info(
      'computeOffsets',
      `<rid:${this.resizerId}> calculated offsets:`,
      '\n\n---- elements ----',
      '\nplayer element:       ', this.videoData.player.element,
      '\nvideo element:        ', this.videoData.video,
      '\n\n---- data in ----',
      '\nplayer dimensions:    ', {w: this.videoData.player.dimensions.width, h: this.videoData.player.dimensions.height},
      '\nvideo dimensions:     ', {w: this.videoData.video.offsetWidth, h: this.videoData.video.offsetHeight},
      '\nreal video dimensions:', {w: realVideoWidth, h: realVideoHeight},
      '\nalign. base offset:   ', {alignXOffset, alignYOffset},
      '\nauto compensation:    ', 'x', autoHeightCompensationFactor,
      '\nstretch factors:      ', stretchFactors,
      '\npan & zoom:           ', this.pan, this.zoom.scale,
      // '\nwdiff, hdiff:         ', wdiff, 'x', hdiff,
      // '\nwdiff, hdiffAfterZoom:', wdiffAfterZoom, 'x', hdiffAfterZoom,
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
      (
        (this.videoData.video.offsetWidth > this.videoData.player.dimensions.width && this.videoData.video.offsetHeight > this.videoData.player.dimensions.height) ||
        (this.videoData.video.offsetWidth < this.videoData.player.dimensions.width && this.videoData.video.offsetHeight < this.videoData.player.dimensions.height)
      ) && ar?.variant !== ArVariant.Zoom
    ) {
      this.logger.warn('computeOffsets', `<rid:${this.resizerId}> We are getting some incredibly funny results here.\n\n`,
        `Video seems to be both wider and taller (or shorter and narrower) than player element at the same time. This is super duper not supposed to happen.\n\n`,
        `Player element needs to be checked.`
      );

      // sometimes this appears to randomly recurse.
      // There seems to be no way to reproduce it.
      if (! this._computeOffsetsRecursionGuard) {
        this._computeOffsetsRecursionGuard = true;
        this.videoData.player.trackDimensionChanges();
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
      this.logger.warn('applyCss', `<rid:${this.resizerId}> Video went missing, doing nothing.`);

      this.videoData.destroy();
      return;
    }

    this.logger.info('applyCss', `<rid:${this.resizerId}> will apply css.`, {stretchFactors, translate});

    // save stuff for quick tests (before we turn numbers into css values):
    this.currentVideoSettings = {
      validFor:  this.videoData.player.dimensions,
      // videoWidth: dimensions.width,
      // videoHeight: dimensions.height
    }

    let extraStyleString;
    try {
      extraStyleString = this.siteSettings.data.currentDOMConfig.customCss;
    } catch (e) {
      // do nothing. It's ok if no special settings are defined for this site, we'll just do defaults
    }

    const styleArray = this.buildStyleArray('', extraStyleString)

    // add remaining elements
    if (stretchFactors) {
      styleArray.push(`transform: translate(${Math.round(translate.x)}px, ${Math.round(translate.y)}px) scale(${stretchFactors.xFactor}, ${stretchFactors.yFactor}) !important;`);
    }

    const styleString = `${this.buildStyleString(styleArray)}${extraStyleString || ''}`; // string returned by buildStyleString() should end with ; anyway

    // build style string back
    this.setStyleString(styleString);
  }

  setStyleString (styleString) {
    this.currentCssValidFor = this.videoData.player.dimensions;
    const newCssString = this.prepareCss(styleString);

    // inject new CSS or replace existing one
    if (!this.userCss) {
      this.logger.debug('setStyleString', `<rid:${this.resizerId}> Setting new css: `, newCssString);

      this.eventBus.send('inject-css', {cssString: newCssString});
      this.userCss = newCssString;
    } else if (newCssString !== this.userCss) {
      this.logger.debug('setStyleString', `<rid:${this.resizerId}}> Replacing css.\nOld string:`, this.userCss, "\nNew string:", newCssString)
      // we only replace css if it
      this.eventBus.send('replace-css', {oldCssString: this.userCss, newCssString});

      this.userCss = newCssString;
    } else {
      this.logger.debug('setStyleString', `<rid:${this.resizerId}> Existing css is still valid, doing nothing.`);
    }
  }

  /**
   * If no adjustments to crop or stretch are being made, we remove all CSS
   * that we have previously injected.
   * @param options:
   *   - options.force: remove our CSS regardless of current crop and stretch options
   */
  unsetStyleString(options?: {force: boolean}) {
    // check whether it's safe to remove CSS.
    if (!options?.force) {
      if (
        [AspectRatioType.Reset, AspectRatioType.Initial].includes(this.lastAr.type)
      ) {
        return;
      }
    }
  }
  //#endregion
}

export default Resizer;
