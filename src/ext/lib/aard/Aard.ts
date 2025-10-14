import AspectRatioType from '@src/common/enums/AspectRatioType.enum';
import ExtensionMode from '@src/common/enums/ExtensionMode.enum';
import { ArVariant } from '@src/common/interfaces/ArInterface';
import { ExtensionEnvironment } from '@src/common/interfaces/SettingsInterface';
import EventBus from '../EventBus';
import Settings from '../settings/Settings';
import { SiteSettings } from '../settings/SiteSettings';
import VideoData from '../video-data/VideoData';
import { AardDebugUi } from './AardDebugUi';
import { AardTimer } from './AardTimers';
import { Corner } from './enums/corner.enum';
import { VideoPlaybackState } from './enums/video-playback-state.enum';
import { FallbackCanvas } from './gl/FallbackCanvas';
import { GlCanvas } from './gl/GlCanvas';
import { GlDebugCanvas, GlDebugType } from './gl/GlDebugCanvas';
import { AardCanvasStore } from './interfaces/aard-canvas-store.interface';
import { AardDetectionSample, generateSampleArray, resetSamples } from './interfaces/aard-detection-sample.interface';
import { AardStatus, initAardStatus } from './interfaces/aard-status.interface';
import { AardTestResult_SubtitleRegion, AardTestResults, initAardTestResults, resetAardTestResults, resetGuardLine, resetSubtitleScanResults } from './interfaces/aard-test-results.interface';
import { AardTimers, initAardTimers } from './interfaces/aard-timers.interface';
import { ComponentLogger } from '../logging/ComponentLogger';
import { AardPollingOptions } from './enums/aard-polling-options.enum';
import { AardSubtitleCropMode } from './enums/aard-subtitle-crop-mode.enum';
import { LetterboxOrientation } from './enums/letterbox-orientation.enum';
import { Edge } from './enums/edge.enum';
import { AardUncertainReason } from './enums/aard-letterbox-uncertain-reason.enum';
import { result } from 'lodash';


/**
 *           /\
 *          //\\         Automatic
 *         //  \\         Aspect
 *        //    \\         Ratio
 *               \\         Detector
 *      //XXXX    \\
 *     //          \\    (Totes not a Witcher reference)
 *    //            \\       (Witcher 2 best Witcher)
 *   //XXXXXXXXXXXXXX\\
 *
 */

const PIXEL_SIZE = 4;
const PIXEL_SIZE_FRACTION = 0.25;
let ROW_SIZE = -1;

export class Aard {
  //#region configuration parameters
  private logger: ComponentLogger;
  private videoData: VideoData;
  private settings: Settings;
  private siteSettings: SiteSettings;
  private eventBus: EventBus;
  private arid: string;
  private arVariant: ArVariant;

  private eventBusCommands = {
    'uw-environment-change': {
      function: (newEnvironment: ExtensionEnvironment) => {
        // console.log('received extension environment:', newEnvironment, 'player env:', this.videoData?.player?.environment);
        this.startCheck();
      }
    },
    'aard-enable-debug': {
      function: (enabled: boolean) => {
        if (enabled) {
          this.showDebugCanvas();
        } else {
          this.hideDebugCanvas();
        }
      }
    },
    'url-changed': {
      function: () => {
        this.clearAutoDisabled();
      }
    }
    //   'get-aard-timing': {
    //     function: () => this.handlePerformanceDataRequest()
      // }
  };
  //#endregion

  private video: HTMLVideoElement;

  private animationFrame: number;

  //#region internal state
  public status: AardStatus = initAardStatus();
  private timers: AardTimers = initAardTimers();
  private inFallback: boolean = false;
  private fallbackReason: any;
  private canvasStore: AardCanvasStore;
  private testResults: AardTestResults;
  private verticalTestResults: AardTestResults;
  private canvasSamples: AardDetectionSample;


  private forceFullRecheck: boolean = true;

  private debugConfig: any = {};
  private timer: AardTimer;
  private lastAnimationFrameTime: number = Infinity;
  //#endregion

  //#region getters
  get defaultAr() {
    if (!this.video) {
      return undefined;
    }

    this.video.setAttribute('crossOrigin', 'anonymous');

    const ratio = this.video.videoWidth / this.video.videoHeight;
    if (isNaN(ratio)) {
      return undefined;
    }
    return ratio;
  }

  //#endregion getters

  //#region lifecycle
  constructor(videoData: VideoData){
    this.logger = new ComponentLogger(videoData.logAggregator, 'Aard', {});
    this.videoData = videoData;
    this.video = videoData.video;
    this.settings = videoData.settings;
    this.siteSettings = videoData.siteSettings;
    this.eventBus = videoData.eventBus;

    this.eventBus.subscribeMulti(this.eventBusCommands, this);

    this.arid = (Math.random()*100).toFixed();

    // we can tick manually, for debugging
    this.logger.log('ctor', `creating new ArDetector. arid: ${this.arid}`);

    this.timer = new AardTimer();
    this.init();
  }

  /**
   * Initializes Aard with default values and starts autodetection loop.
   * This method should only ever be called from constructor.
   */
  private init() {
    this.canvasStore = {
      main: this.createCanvas('main-gl')
    };


    this.canvasSamples = {
      top: generateSampleArray(
        this.settings.active.aard.sampling.staticCols,
        this.settings.active.aard.canvasDimensions.sampleCanvas.width
      ),
      bottom: generateSampleArray(
        this.settings.active.aard.sampling.staticCols,
        this.settings.active.aard.canvasDimensions.sampleCanvas.width
      ),
      left: generateSampleArray(
        this.settings.active.aard.sampling.staticCols,
        this.settings.active.aard.canvasDimensions.sampleCanvas.height
      ),
      right: generateSampleArray(
        this.settings.active.aard.sampling.staticCols,
        this.settings.active.aard.canvasDimensions.sampleCanvas.height
      )
    };


    // try {
    //   this.showDebugCanvas();
    // } catch (e) {
    //   console.error('FALIED TO CREATE DEBUGG CANVAS', e);
    // }

    try {
      if (this.settings.active.ui.dev?.aardDebugOverlay?.showOnStartup) {
        this.showDebugCanvas();
      }
    } catch (e) {
      console.error(`[uw::aard] failed to create debug UI:`, e);
    }

    this.startCheck();
  }

  private createCanvas(canvasId: string, canvasType?: 'webgl' | 'legacy') {
    ROW_SIZE = this.settings.active.aard.canvasDimensions.sampleCanvas.width * PIXEL_SIZE;

    if (canvasType) {
      if (canvasType === this.settings.active.aard.aardType || this.settings.active.aard.aardType === 'auto') {
        if (canvasType === 'webgl') {
          return new GlCanvas({...this.settings.active.aard.canvasDimensions.sampleCanvas, id: 'main-gl'});
        } else if (canvasType === 'legacy') {
          return new FallbackCanvas({...this.settings.active.aard.canvasDimensions.sampleCanvas, id: 'main-legacy'});
        } else {
          // TODO: throw error
        }
      } else {
        // TODO: throw error
      }

    }

    if (['auto', 'webgl'].includes(this.settings.active.aard.aardType)) {
      try {
        return new GlCanvas({...this.settings.active.aard.canvasDimensions.sampleCanvas, id: 'main-gl'});
      } catch (e) {
        if (this.settings.active.aard.aardType !== 'webgl') {
          return new FallbackCanvas({...this.settings.active.aard.canvasDimensions.sampleCanvas, id: 'main-legacy'});
        }
        this.logger.error('createCanvas', 'could not create webgl canvas:', e);
        this.eventBus.send('uw-config-broadcast', {type: 'aard-error', aardErrors: {webglError: true}});
        throw e;
      }
    } else if (this.settings.active.aard.aardType === 'legacy') {
      return new FallbackCanvas({...this.settings.active.aard.canvasDimensions.sampleCanvas, id: 'main-legacy'});
    } else {
      this.logger.error('createCanvas', 'invalid value in settings.arDetect.aardType:', this.settings.active.aard.aardType);
      this.eventBus.send('uw-config-broadcast', {type: 'aard-error', aardErrors: {invalidSettings: true}});
      throw 'AARD_INVALID_SETTINGS';
    }
  }

  /**
   * Creates and shows debug canvas
   * @param canvasId
   */
  private showDebugCanvas() {
    if (!this.canvasStore.debug) {
      this.canvasStore.debug = new GlDebugCanvas({...this.settings.active.aard.canvasDimensions.sampleCanvas, id: 'uw-debug-gl'});
    }
    this.canvasStore.debug.enableFx();
    if (!this.debugConfig.debugUi) {
      this.debugConfig.debugUi = new AardDebugUi(this);
      this.debugConfig.debugUi.initContainer();
      this.debugConfig.debugUi.attachCanvases(this.canvasStore.main.canvas, this.canvasStore.debug.canvas);

      // if we don't draw a dummy frame from _real_ sources, we can't update buffer later
      this.canvasStore.debug.drawVideoFrame(this.canvasStore.main.canvas);
    }
  }

  private hideDebugCanvas() {
    if (this.debugConfig.debugUi) {
      this.debugConfig?.debugUi.destroyContainer();
      this.debugConfig.debugUi = undefined;
    }
  }
  //#endregion

  /**
   * Checks whether autodetection can run
   */
  startCheck(arVariant?: ArVariant) {
    this.arVariant = arVariant;

    if (!this.videoData.player) {
      // console.warn('Player not detected!');
      // console.log('--- video data: ---\n', this.videoData);
      return;
    }
    if (this.siteSettings.data.enableAard[this.videoData.player.environment] === ExtensionMode.Enabled) {
      this.start();
    } else {
      this.stop();
    }
  }

  /**
   * Clears autoDisable flag
   */
  clearAutoDisabled() {
    this.status.autoDisabled = false;
    this.timers.autoDisableAt = undefined;
  }

  /**
   * Starts autodetection loop.
   */
  start() {
    this.clearAutoDisabled();
    this.forceFullRecheck = true;
    if (this.videoData.resizer.lastAr.type === AspectRatioType.AutomaticUpdate) {
      // ensure first autodetection will run in any case
      this.videoData.resizer.lastAr = {type: AspectRatioType.AutomaticUpdate, ratio: this.defaultAr};
    }

    // do full reset of test samples
    this.testResults = initAardTestResults(this.settings.active.aard);
    this.verticalTestResults = initAardTestResults(this.settings.active.aard);

    if (this.animationFrame) {
      window.cancelAnimationFrame(this.animationFrame);
    }

    this.status.aardActive = true;
    this.animationFrame = window.requestAnimationFrame( (ts: DOMHighResTimeStamp) => this.onAnimationFrame(ts));

    // set auto-disable timer if detection timeout is set
    if (this.settings.active.aard.autoDisable.ifNotChanged) {
      this.timers.autoDisableAt = Date.now() + this.settings.active.aard.autoDisable.ifNotChangedTimeout;
    }
  }

  /**
   * Runs autodetection ONCE.
   * If autodetection loop is running, this will also stop autodetection loop.
   */
  step(options?: {noCache?: boolean}) {
    this.stop();

    if (options?.noCache) {
      this.testResults = initAardTestResults(this.settings.active.aard);
      this.verticalTestResults = initAardTestResults(this.settings.active.aard);
    }

    this.main();
  }

  /**
   * Stops autodetection.
   */
  stop() {
    if (this.animationFrame) {
      window.cancelAnimationFrame(this.animationFrame);
    }
  }

  //#region animationFrame, scheduling, and other shit
  /**
   * Checks whether conditions for granting a frame check are fulfilled
   * @returns
   */
  private canTriggerFrameCheck() {

    // console.log('ard check status:', this.status);

    // if video was paused & we know that we already checked that frame,
    // we will not check it again.
    const videoState = this.getVideoPlaybackState();
    const polling = this.settings.active.aard.polling;
    const now = Date.now();

    if (videoState !== VideoPlaybackState.Playing) {
      if (this.status.lastVideoStatus === videoState) {
        return false;
      }
    }
    if (this.status.autoDisabled) {
      return false;
    }
    if (this.timers.autoDisableAt < now) {
      this.status.autoDisabled = true;
      return false;
    }
    this.status.lastVideoStatus = videoState;

    const tabVisible = document.visibilityState === 'visible';
    if (!tabVisible && polling.runInBackgroundTabs === AardPollingOptions.No) {
      return false;
    }
    if (this.videoData.player.isTooSmall && polling.runOnSmallVideos === AardPollingOptions.No) {
      return false;
    }

    const isActive = (tabVisible || polling.runInBackgroundTabs !== AardPollingOptions.Reduced)
       && (!this.videoData.player.isTooSmall || polling.runOnSmallVideos !== AardPollingOptions.Reduced);
    const nextCheck = isActive ? this.timers.nextFrameCheckTime : this.timers.reducedPollingNextCheckTime;

    if (now < nextCheck) {
      return false;
    }

    this.timers.nextFrameCheckTime = now + this.settings.active.aard.timers.playing;
    this.timers.reducedPollingNextCheckTime = now + this.settings.active.aard.timers.playingReduced;
    return true;
  }

  /**
   * Bootstraps the main loop.
   *
   * Honestly this doesn't need description, but I want to put some green
   * between two adjacent functions.
   */
  private onAnimationFrame(ts: DOMHighResTimeStamp) {
    if (this.canTriggerFrameCheck()) {
      resetAardTestResults(this.testResults);
      resetSamples(this.canvasSamples);
      resetSubtitleScanResults(this.testResults);
      this.main();
      this.forceFullRecheck = false;
    } else {
    }
    this.animationFrame = window.requestAnimationFrame( (ts: DOMHighResTimeStamp) => this.onAnimationFrame(ts));
  }
  //#endregion

  /**
   * Main loop for scanning aspect ratio changes
   */
  private async main() {
    const arConf =  this.settings.active.aard;

    try {
      this.timer.next();

      let imageData: Uint8Array;
      this.timer.current.start = performance.now();

      // We abuse a do-while loop to eat our cake (get early returns)
      // and have it, too (if we return early, we still execute code
      // at the end of this function)
      scanFrame:
      {
        imageData = await new Promise<Uint8Array>(
          resolve => {
            try {
              this.canvasStore.main.drawVideoFrame(this.video);
              this.timer.current.draw = performance.now() - this.timer.current.start;
              resolve(this.canvasStore.main.getImageData());
            } catch (e) {
              if (e.name === 'SecurityError') {
                this.eventBus.send('uw-config-broadcast', {type: 'aard-error', aardErrors: {cors: true}});
                this.stop();
              }
              if (this.canvasStore.main instanceof FallbackCanvas) {
                if (this.inFallback) {
                  this.eventBus.send('uw-config-broadcast', {type: 'aard-error', aardErrors: this.fallbackReason});
                  this.stop();
                } else {
                  this.eventBus.send('uw-config-broadcast', {type: 'aard-error', aardErrors: {fallbackCanvasError: true}});
                  this.stop();
                }
              } else {
                if (arConf.aardType === 'auto') {
                  this.canvasStore.main.destroy();
                  this.canvasStore.main = this.createCanvas('main-gl', 'legacy');
                }
                this.inFallback = true;
                this.fallbackReason = {cors: true};

                if (arConf.aardType !== 'auto') {
                  this.stop();
                }
              }
            }
          }
        );
        this.timer.current.getImage = performance.now() - this.timer.current.start;

        // STEP 1:
        // Test if corners are black. If they're not, we can immediately quit the loop.
        // For performances of measurements, checking orientation of letterbox is part of fastBlackLevel
        const lastValidLetterboxOrientation = this.testResults.lastValidLetterboxOrientation;

        orientationCheck:
        {
          this.getBlackLevelFast(
            imageData, 3, 1,
            arConf.canvasDimensions.sampleCanvas.width,
            arConf.canvasDimensions.sampleCanvas.height
          );

          if (this.testResults.letterboxOrientation === LetterboxOrientation.NotLetterbox) {
            break orientationCheck;
          }

          this.letterboxOrientationScan(
            imageData,
            arConf.canvasDimensions.sampleCanvas.width,
            arConf.canvasDimensions.sampleCanvas.height
          );
        }


        this.timer.current.fastBlackLevel = performance.now() - this.timer.current.start;

        // if we detect no letterbox, we don't test anything — instead, we immediately reset
        if (this.testResults.letterboxOrientation === LetterboxOrientation.NotLetterbox) {
          // TODO: reset aspect ratio to "AR not applied"
          this.testResults.lastStage = 1;
          this.testResults.letterboxSize = 0;
          this.testResults.letterboxOffset = 0;
          resetGuardLine(this.testResults);

          break scanFrame;
        }

        // If we detect both letterbox and pillarbox, we keep things as they are but avoid scanning further
        if (this.testResults.letterboxOrientation === LetterboxOrientation.Both) {
          this.testResults.lastStage = 1;

          break scanFrame;
        }

        // If lastValidLetterboxOrientation changed, we reset guard line (& gang), but continue processing
        if (lastValidLetterboxOrientation !== this.testResults.lastValidLetterboxOrientation) {
          this.forceFullRecheck = true;
        }

        // We only do subtitle check when orientation is letterbox
        if (this.testResults.letterboxOrientation === LetterboxOrientation.Letterbox) {
          this.subtitleScan(
            imageData,
            arConf.canvasDimensions.sampleCanvas.width,
            arConf.canvasDimensions.sampleCanvas.height,
            false,
          );
        }

      }

      // Note that subtitle check should reset aspect ratio outright, regardless of what other tests revealed.
      // Also note that subtitle check should run on newest aspect ratio data, rather than lag one frame behind
      // But implementation details are something for future Tam to figure out

      // If forceFullRecheck is set, then 'not letterbox' should always force-reset the aspect ratio
      // (as aspect ratio may have been set manually while autodetection was off)

      // If debugging is enable,
      this.canvasStore.debug?.drawBuffer(imageData);

      processUpdate:
      {
        if (this.testResults.letterboxOrientation === LetterboxOrientation.NotLetterbox) {
          // console.warn('DETECTED NOT LETTERBOX! (resetting)')
          this.timer.arChanged();
          this.updateAspectRatio(this.defaultAr, {forceReset: true});
          break processUpdate;
        }

        if (this.testResults.subtitleDetected && arConf.subtitles.subtitleCropMode !== AardSubtitleCropMode.CropSubtitles) {
          if (arConf.subtitles.subtitleCropMode === AardSubtitleCropMode.ResetAR) {
            this.updateAspectRatio(this.defaultAr, {forceReset: true});
            this.timers.pauseUntil = Date.now() + arConf.subtitles.resumeAfter;

          } else if (arConf.subtitles.subtitleCropMode === AardSubtitleCropMode.ResetAndDisable) {
            this.updateAspectRatio(this.defaultAr, {forceReset: true});
            this.status.autoDisabled = true;
          }

          break processUpdate;
        }

        // if detection is uncertain, we don't do anything at all (unless if guardline was broken, in which case we reset)
        if (this.testResults.aspectRatioUncertain) {
          // this.timer.arChanged();

          // if (
          //   this.testResults.aspectRatioCheck.frontCandidate < this.testResults.guardLine.front
          //   || this.testResults.aspectRatioCheck.backCandidate > this.testResults.guardLine.back
          //   || this.testResults.aspectRatioCheck.frontCandidate === -1
          //   || this.testResults.aspectRatioCheck.backCandidate === -1
          // ) {
          //   this.updateAspectRatio(this.defaultAr, {uncertainDetection: true, forceReset: true});
          // }

          break processUpdate;
        }

        // TODO: emit debug values if debugging is enabled
        this.testResults.isFinished = true;

        this.testResults.guardLine.front = this.testResults.aspectRatioCheck.frontCandidate;
        this.testResults.guardLine.back = this.testResults.aspectRatioCheck.backCandidate;


        const finalAr = this.getAr();
        if (finalAr > 0) {
          this.updateAspectRatio(finalAr);
        } else {
          this.testResults.aspectRatioInvalid = true;
          this.testResults.aspectRatioInvalidReason = finalAr.toFixed(3);
        }
        // }

        // if we got "no letterbox" OR aspectRatioUpdated
      }

      if (this.canvasStore.debug) {
        // this.canvasStore.debug.drawBuffer(imageData);
        this.timer.getAverage();
        this.debugConfig?.debugUi?.updateTestResults(this.testResults, this.timers);
      }
    } catch (e) {
      console.warn('[Ultrawidify] Aspect ratio autodetection crashed for some reason.\n\nsome reason:', e);
      this.videoData.resizer.setAr({type: AspectRatioType.AutomaticUpdate, ratio: this.defaultAr, variant: this.arVariant});
    }
  }

  private getVideoPlaybackState(): VideoPlaybackState {
    try {
      if (this.video.ended) {
        return VideoPlaybackState.Ended;
      } else if (this.video.paused) {
        return VideoPlaybackState.Paused;
      } else if (this.video.error) {
        return VideoPlaybackState.Error;
      } else {
        return VideoPlaybackState.Playing;
      }
    } catch (e) {
      this.logger.warn('getVideoPlaybackState]', `There was an error while determining video playback state.`, e);
      return VideoPlaybackState.Error;
    }
  }


  //#region buffer tests
  /**
   * Get black level of a given frame. We sample black level on very few
   * positions — just the corners of the frame. If letterboxing or pillarboxing
   * exists, then pixels in the corners of the frame should be the blackest
   * it gets.
   *
   * Sampling pattern are four lines, each shooting from its respective corner.
   * Value of 'sample' parameter determines how many pixels along this line we
   * are going to sample. Offset means how many pixels of those four lines we
   * are going to skip before we start sampling.
   *
   *    x→ 0 1 ...                 ... x-1
   *  y↓ × ------------... ...------------ ×
   *   0 | 1                             1 |
   *   1 |   2                         2   |
   *   : |     .                     .     :
   *     :       .                 .
   *
   *     :       .                 .       :
   *     |     .                     .     |
   *     |   2                         2   |
   * h-1 | 1                             1 |
   *     × ------------... ...------------ ×
   *
   *
   *                              IMPORTANT NOTES
   *  <> imageData is one-dimensional array, so we need to account for that.
   *  <> blackLevel is the darkest brightest subpixel detected
   *  <> If image has no crop, then this function WILL NOT get the true black level.
   *     In that case, we don't get an accurate black level, but we know straight
   *     away that the image is uncropped. If image is uncropped, we can skip other,
   *     more expensive tests.
   *
   * @param imageData array of pixels (4 bytes/fields per pixel)
   * @param samples number of samples per corner
   * @param width width of the frame
   * @param height height of the frame
   */
  private getBlackLevelFast(imageData: Uint8Array, samples: number, offset: number, width: number, height: number) {
    // there's 4 points for each sample, and 3 components for each of the sampling points.
    const pixelValues = new Array<number>(samples * 12);
    let pvi = 0;

    /**
     * We should ensure we are accessing pixels in ordered manner in order to
     * take advantage of data locality.
     */
    const end = offset + samples;
    for (let i = offset; i < end; i++) {
      const px_r = (i * ROW_SIZE) + (i * PIXEL_SIZE);    // red component starts here
      pixelValues[pvi++] = imageData[px_r];
      pixelValues[pvi++] = imageData[px_r + 1];
      pixelValues[pvi++] = imageData[px_r + 2];
      imageData[px_r + 3] = GlDebugType.BlackLevelSample;

      const endpx_r = px_r + ROW_SIZE - (i * PIXEL_SIZE * 2) - PIXEL_SIZE;  // - twice the offset to mirror the diagonal
      pixelValues[pvi++] = imageData[endpx_r];
      pixelValues[pvi++] = imageData[endpx_r + 1];
      pixelValues[pvi++] = imageData[endpx_r + 2];
      imageData[endpx_r + 3] = GlDebugType.BlackLevelSample;
    }

    // now let's populate the bottom two corners
    for (let i = end; i --> offset;) {
      const row = height - i - 1;  // since first row is 0, last row is height - 1

      const px_r = (row * ROW_SIZE) + (i * PIXEL_SIZE);
      pixelValues[pvi++] = imageData[px_r];
      pixelValues[pvi++] = imageData[px_r + 1];
      pixelValues[pvi++] = imageData[px_r + 2];
      imageData[px_r + 3] = GlDebugType.BlackLevelSample;

      const endpx_r = px_r + (ROW_SIZE) - (i * PIXEL_SIZE * 2) - PIXEL_SIZE;  // - twice the offset to mirror the diagonal
      pixelValues[pvi++] = imageData[endpx_r];
      pixelValues[pvi++] = imageData[endpx_r + 1];
      pixelValues[pvi++] = imageData[endpx_r + 2];
      imageData[endpx_r + 3] = GlDebugType.BlackLevelSample;
    }

    let min = 255;
    let avg = 0;
    let p = 0;

    for (let i = 0; i < pixelValues.length; i++) {
      p = pixelValues[i];
      i++;

      if (p < pixelValues[i]) {
        p = pixelValues[i];
      }
      i++;

      if (p < pixelValues[i]) {
        p = pixelValues[i];
      }

      avg += p;
      if (p < min) {
        min = p;
      }
    }

    // While there's 4 bytes / 3 values per pixel, a
    // avg only contains highest subpixel ... so we really
    // only take one sample per pixel instead of 3/4
    avg = avg / samples;

    if (avg > this.testResults.blackThreshold) {
      this.testResults.letterboxOrientation = LetterboxOrientation.NotLetterbox;
    }

    // only update black level if not letterbox.
    // NOTE: but maybe we could, if blackLevel can only get lower than
    // the default value.
    if (this.testResults.letterboxOrientation === LetterboxOrientation.NotLetterbox) {
      this.testResults.aspectRatioUncertain = false;
    }

    if (min < this.testResults.blackLevel) {
      this.testResults.blackLevel = min;
      this.testResults.blackThreshold = min + 16;
    }
  }

  /**
   * Checks orientation of black bars.
   * @param imageData
   * @param width
   * @param height
   */
  private letterboxOrientationScan(imageData: Uint8Array, width: number, height: number) {
    const lastPixelOffset = ROW_SIZE - PIXEL_SIZE;
    const imageSize = ROW_SIZE * height;

    const xLimit = this.settings.active.aard.letterboxOrientationScan.letterboxLimit;
    const yLimit = this.settings.active.aard.letterboxOrientationScan.pillarboxLimit;

    let letterbox = true, pillarbox = true;
    let xCount = 0, yCount = 0;

    // scan top row
    for (let i = 0; i < ROW_SIZE; i += PIXEL_SIZE) {
      if (
           imageData[i  ] > this.testResults.blackThreshold
        || imageData[i+1] > this.testResults.blackThreshold
        || imageData[i+2] > this.testResults.blackThreshold
      ) {
        imageData[i + 3] = GlDebugType.LetterboxOrientationScanImageDetection
        if (++xCount > xLimit) {
          letterbox = false;
          break;
        }
      } else {
        imageData[i+3] = GlDebugType.LetterboxOrientationScanTrace
      }
    }

    // scan sides
    for (let i = 0; i < imageSize; i += ROW_SIZE) {
      const lastPx = i + lastPixelOffset;

      // left side
      if (
           imageData[i  ] > this.testResults.blackThreshold
        || imageData[i+1] > this.testResults.blackThreshold
        || imageData[i+2] > this.testResults.blackThreshold
      ) {
        imageData[i+3] = GlDebugType.LetterboxOrientationScanImageDetection;
        if (++yCount > yLimit) {
          pillarbox = false;
          break;
        }
      } else {
        imageData[i+3] = GlDebugType.LetterboxOrientationScanTrace;
      }

      // right side
      if (
           imageData[lastPx  ] > this.testResults.blackThreshold
        || imageData[lastPx+1] > this.testResults.blackThreshold
        || imageData[lastPx+2] > this.testResults.blackThreshold
      ) {
        imageData[lastPx+3] = GlDebugType.LetterboxOrientationScanImageDetection;
        if (++yCount > yLimit) {
          pillarbox = false;
          break;
        }
      } else {
        imageData[lastPx+3] = GlDebugType.LetterboxOrientationScanTrace;
      }
    }

    // scan bottom row
    if (letterbox) {
      for (let i = ROW_SIZE * (height - 1); i < imageSize; i += PIXEL_SIZE) {
        if ( imageData[i  ] > this.testResults.blackThreshold
          || imageData[i+1] > this.testResults.blackThreshold
          || imageData[i+2] > this.testResults.blackThreshold
        ) {
          imageData[i + 3] = GlDebugType.LetterboxOrientationScanImageDetection
          if (++xCount > xLimit) {
            letterbox = false;
            break;
          }
        } else {
          imageData[i+3] = GlDebugType.LetterboxOrientationScanTrace
        }
      }
    }

    // determine result
    if (letterbox && pillarbox) {
      this.testResults.letterboxOrientation = LetterboxOrientation.Both;
    } else if (letterbox) {
      this.testResults.letterboxOrientation = LetterboxOrientation.Letterbox;
      this.testResults.lastValidLetterboxOrientation = LetterboxOrientation.Letterbox;
    } else if (pillarbox) {
      this.testResults.letterboxOrientation = LetterboxOrientation.Pillarbox;
      this.testResults.lastValidLetterboxOrientation = LetterboxOrientation.Pillarbox;
    } else {
      this.testResults.letterboxOrientation = LetterboxOrientation.NotLetterbox;
    }
  }

  /**
   * Updates letterbox edge (updates imageLine and guardLine)
   * @param crossDimension height of the sample frame (or width, if pillarbox)
   * @param topCandidate First line of image data on the top of  the frame
   * @param bottomCandidate First line with image data on the bottom of the frame
   * @returns
   */
  private updateLetterboxEdgeCandidates(crossDimension: number, topCandidate: number, bottomCandidate: number) {
    const bottomDistance = (crossDimension - bottomCandidate);
    const maxOffset = ~~(crossDimension * this.settings.active.aard.edgeDetection.maxLetterboxOffset);
    const diff = Math.abs(topCandidate - bottomDistance);
    const candidateAvg = ~~((topCandidate + bottomDistance) * 0.5);

    this.testResults.aspectRatioCheck.frontCandidate = topCandidate;
    this.testResults.aspectRatioCheck.backCandidate = bottomCandidate;

    if (diff > maxOffset) {
      this.testResults.aspectRatioUncertain = true;
      this.testResults.aspectRatioUncertainReason = AardUncertainReason.LetterboxNotCenteredEnough;
    }

    this.testResults.letterboxSize = candidateAvg;
    this.testResults.letterboxOffset = diff;
  }


  /**
   * Scans for subtitles
   * @param imageData
   * @param width
   * @param height
   * @returns
   */
   private subtitleScan(imageData: Uint8Array, width: number, height: number, skipAdvancedScan: boolean) {
    const scanConf = this.settings.active.aard.subtitles;

    this.testResults.subtitleDetected = false;

    // SubtitleScanResult Regions
    const ssrRegions = this.testResults.subtitleScan.regions;
    const halfHeight = Math.floor(height / 2);

    resetSubtitleScanResults(this.testResults);

    this.subtitleScanRegionIterative(
      imageData, height,
      2, halfHeight,
      scanConf.refiningScanSpacing, scanConf.minDetections,
      ssrRegions.top,
    )

    this.subtitleScanRegionIterative(
      imageData, height,
      height - 3, halfHeight,
      -scanConf.refiningScanSpacing, scanConf.minDetections,
      ssrRegions.bottom,
    )


    if (ssrRegions.top.uncertain || ssrRegions.bottom.uncertain) {
      this.testResults.aspectRatioUncertain = true;
    } else {
      this.testResults.aspectRatioUncertain = false;
    }
    if (ssrRegions.top.firstSubtitle !== -1 || ssrRegions.bottom.firstSubtitle !== -1) {
      this.testResults.subtitleDetected = true;
    }

    this.updateLetterboxEdgeCandidates(
      height,
      ssrRegions.top.firstImage,
      ssrRegions.bottom.firstImage
    );

    this.timer.current.subtitleScan = performance.now() - this.timer.current.start;
  }

  /**
   * Scans region of video frame for presence of subtitles
   * @param imageData
   * @param startRow
   * @param endRow
   * @param minDetections
   * @param results
   */
  private subtitleScanRegionLinear(
    imageData: Uint8Array,
    height: number,
    startRow: number,
    endRow: number,
    scanSpacing: number,
    minDetections: number,
    results: AardTestResult_SubtitleRegion,
  ) {
    results.uncertain = false;

    const scanConf = this.settings.active.aard.subtitles;
    const arConf = this.settings.active.aard;

    let letterCount, imageSegmentCount, potentialFadedLetterCount, potentialFadedLetterCountInvalidated, nonGradientPixelCount, letterSize, imageSize, imageSegmentSize, imageWeightedSize, segmentWeights, imageSegmentAlignment, imageSegmentAlignmentSamples,
      isOnLetter, isOnImage, isBlank,
      gradientRowOffset_before, gradientRowOffset_after;
    let rowStart, rowEnd, rowMid, rowGTA, rowGTB; // GT = gradient test
    let imageConfirmPass = false, subtitleConfirmPass = false;

    let outerIteration = 0;

    const rowMargin = Math.floor(scanConf.scanMargin * ROW_SIZE);
    const imageThreshold = Math.floor((ROW_SIZE - (rowMargin * 2)) * arConf.edgeDetection.minValidImage * PIXEL_SIZE_FRACTION);


    // search in top letterbox
    outerLoop:
    for (
      let searchRow = startRow;
      (scanSpacing > 0 && searchRow < endRow) || (scanSpacing < 0 && searchRow > endRow);
      searchRow += scanSpacing
    ) {
      if (++outerIteration > height) {
        console.warn('[ultrawidify|aard::subtitleScanRegionLinear] — scan got stuck in an infinite loop. This shouldn\'t happen.');
        results.uncertain;
        break outerLoop;
      }

      letterCount = 0;
      potentialFadedLetterCount = 0;
      imageSegmentCount = 0;
      imageSegmentSize = 0;
      nonGradientPixelCount = 0;

      imageSize = 0;
      imageWeightedSize = 0;
      segmentWeights = 0;

      letterSize = 0;
      isOnLetter = false;
      isOnImage = false;
      isBlank = true;
      potentialFadedLetterCountInvalidated = false;

      imageSegmentAlignment = 0;
      imageSegmentAlignmentSamples = 0;

      // Scan region is centered,
      rowStart = (searchRow * ROW_SIZE) + rowMargin;

      if (scanSpacing > 0) {
        gradientRowOffset_before = (Math.max(searchRow - 2, 0)      * ROW_SIZE);
        gradientRowOffset_after  = (Math.min(searchRow + 2, height) * ROW_SIZE);
      } else {
        gradientRowOffset_before = (Math.max(searchRow - 2, 0)      * ROW_SIZE);
        gradientRowOffset_after  = (Math.min(searchRow + 2, height) * ROW_SIZE);
      }

      // exact row doesn't matter ... unless scanMargin is 0
      rowEnd = ((searchRow + 1) * ROW_SIZE) - rowMargin;
      rowMid = (rowStart + rowEnd) * 0.5;

      const resetSubtitlePass =() => {
        if (subtitleConfirmPass) {
          subtitleConfirmPass = false;
          searchRow -= (scanSpacing > 0 ? + 1 : -1);
        }
      }

      const updateImage = (candidate: number) => {
        if (scanSpacing > 0) {
          if (results.firstImage === -1 || candidate < results.firstImage) {
            results.firstImage = candidate;
          }
        } else {
          if (results.firstImage === -1 || candidate > results.firstImage) {
            results.firstImage = candidate;
          }
        }
      }

      /**
       * This function can break or return early only in the following situations:
       *
       *     * we have enough letters to detect subtitles — continue outerLoop
       *     * Single "letter" is too wide — immediate return, as we found where the image starts
       *
       * Other instances require a bit more complex analysis.
       */

      while (rowStart < rowEnd) {
        const r = imageData[rowStart], g = imageData[rowStart + 1], b = imageData[rowStart + 2];

        const on = r > scanConf.subtitleSubpixelThresholdOn
                    || g > scanConf.subtitleSubpixelThresholdOn
                    || b > scanConf.subtitleSubpixelThresholdOn;
        const off = r < scanConf.subtitleSubpixelThresholdOff
                    && g < scanConf.subtitleSubpixelThresholdOff
                    && b < scanConf.subtitleSubpixelThresholdOff;

        if (off) {
          imageData[rowStart + 3] = GlDebugType.SubtitleThresholdOff;


          // if isOnLetter was set, that means we've just concluded a letter segment
          if (isOnLetter) {
            letterCount++;

            if (letterCount > minDetections) {
              if (results.firstSubtitle === -1) {
                results.firstSubtitle = searchRow;

                // if detecting subtitles only resets AR, we can return immediately
                if (scanConf.subtitleCropMode !== AardSubtitleCropMode.CropSubtitles) {
                  break outerLoop;
                }
              }
              results.lastSubtitle = searchRow;
              isBlank = false;

              imageConfirmPass = false;
              continue outerLoop;
            }
          }
          if (isOnImage) {
            if (imageSegmentSize < scanConf.maxValidLetter) {
              potentialFadedLetterCount++;

              // track potential letter alignment
              imageSegmentAlignment += (rowStart - rowMid) * imageSegmentSize * PIXEL_SIZE_FRACTION;
              imageSegmentAlignmentSamples += imageSegmentSize;
            } else {
              potentialFadedLetterCountInvalidated = true;
            }

            if (imageSegmentSize > arConf.edgeDetection.minEdgeSegmentSize) {
              imageSegmentCount++;
              imageWeightedSize += imageSegmentSize * imageSegmentSize; // longer segments should have bigger weight
              segmentWeights += imageSegmentSize;
              imageSegmentSize = 0;
            }
          }

          isOnLetter = false;
          isOnImage = false;
          letterSize = 0;
          imageSegmentSize = 0;
        } else {
          imageData[rowStart + 3] = GlDebugType.SubtitleThresholdNone;
          isOnImage = true;
          isBlank = false;
          imageSegmentSize++;
          imageSize++;

          // let's see if we're accidentally detecting gradient.
          // We only need to run these tests when pixels are dark.
          // We keep track of number of pixels that pass the test, or don't
          // need the test to begin with.
          if (!on && (
               imageData[rowStart    ] < arConf.edgeDetection.gradientThreshold
            && imageData[rowStart + 1] < arConf.edgeDetection.gradientThreshold
            && imageData[rowStart + 2] < arConf.edgeDetection.gradientThreshold
          )) {
            rowGTB = rowStart - gradientRowOffset_before;
            rowGTA = rowStart + gradientRowOffset_after;

            // if true, then gradient.
            // The first row gives technically incorrect answers for pixels directly under subtitles, but since
            // "nonGradientPixelCount" is a shorthand for "we're relatively confident in this detection", potentially
            // mistaking non-black pixels under subtitles for gradient isn't too problematic
            if ( (imageData[rowStart    ] - imageData[rowGTB    ]) < arConf.edgeDetection.gradientTestMinDelta
              && (imageData[rowStart + 1] - imageData[rowGTB + 1]) < arConf.edgeDetection.gradientTestMinDelta
              && (imageData[rowStart + 2] - imageData[rowGTB + 2]) < arConf.edgeDetection.gradientTestMinDelta
              && imageData[rowGTA    ] - imageData[rowStart    ] > arConf.edgeDetection.gradientTestMinDeltaAfter
              && imageData[rowGTA + 1] - imageData[rowStart + 1] > arConf.edgeDetection.gradientTestMinDeltaAfter
              && imageData[rowGTA + 2] - imageData[rowStart + 2] > arConf.edgeDetection.gradientTestMinDeltaAfter
              && imageData[rowGTA    ] - imageData[rowStart    ] < arConf.edgeDetection.gradientTestMaxDeltaAfter
              && imageData[rowGTA + 1] - imageData[rowStart + 1] < arConf.edgeDetection.gradientTestMaxDeltaAfter
              && imageData[rowGTA + 2] - imageData[rowStart + 2] < arConf.edgeDetection.gradientTestMaxDeltaAfter
            ) {
              // we do nothing (at this moment)
            } else {
              nonGradientPixelCount++;
            }
          } else {
            nonGradientPixelCount++;
          }
        }
        if (on) {   // used to detect subtitles specifically
          imageData[rowStart + 3] = GlDebugType.SubtitleThresholdOn;
          isOnLetter = true;
          letterSize++;

          // bail on invalid letter sizes — this means we're seeing image.
          // in this case, we do not need image confirmation step
          if (letterSize > scanConf.maxValidLetter) {
            updateImage(searchRow);
            isBlank = false;

            return;
          }
        }

        rowStart += PIXEL_SIZE;
      }


      // we need to do this once more, otherwise imageSegmentCount can be 0 & bugs happen
      if (isOnImage) {
        if (imageSegmentSize < scanConf.maxValidLetter) {
          potentialFadedLetterCount++;

          // track potential letter alignment
          imageSegmentAlignment += (rowStart - rowMid) * imageSegmentSize * PIXEL_SIZE_FRACTION;
          imageSegmentAlignmentSamples += imageSegmentSize;
        } else {
          potentialFadedLetterCountInvalidated = true;
        }

        if (imageSegmentSize > arConf.edgeDetection.minEdgeSegmentSize) {
          imageSegmentCount++;
          imageWeightedSize += imageSegmentSize * imageSegmentSize; // longer segments should have bigger weight
          segmentWeights += imageSegmentSize;
          imageSegmentSize = 0;
        }
      }


      if (!imageSegmentCount || isBlank) {
        isBlank = true;
        imageConfirmPass = false;

        if (results.firstBlank === -1) {
          results.firstBlank = searchRow;
        }
        results.lastBlank = searchRow;

        resetSubtitlePass();
        continue outerLoop;
      }

      const averageImageSegmentSize = segmentWeights > 0 ? imageWeightedSize / segmentWeights : 0;
      const gradientDetectionFrequency = 1 - (nonGradientPixelCount / imageSize);

      // That's probably a subtitle as well. If subs are fading in and out,
      // then there's a good chance that they won't meet the "yes, this is a letter" threshold.
      if (
        !potentialFadedLetterCountInvalidated
        && potentialFadedLetterCount > scanConf.minDetections
        // FOR SOME REASON THIS CONDITION CAUSES EVERYTHING TO HANG:
        // && (imageSegmentAlignmentSamples && imageSegmentAlignment && Math.abs(imageSegmentAlignment / imageSegmentAlignmentSamples) > scanConf.maxPotentialSubtitleMisalignment)
        && averageImageSegmentSize < scanConf.maxValidLetter
      ) {
        if (subtitleConfirmPass) {
          if (results.firstSubtitle === -1) {
            results.firstSubtitle = searchRow;

            // if detecting subtitles only resets AR, we can return immediately
            if (scanConf.subtitleCropMode !== AardSubtitleCropMode.CropSubtitles) {
              break outerLoop;
            }
          }
          results.lastSubtitle = searchRow;
          isBlank = false;

          resetSubtitlePass();
        }
        subtitleConfirmPass = true;
        searchRow -= scanSpacing + (scanSpacing > 0 ? - 1 : 1);
        continue outerLoop;
      }

      // If we are here, subtitles weren't confirmed
      resetSubtitlePass();


      // If we detect gradient, that's instant fail.
      // We still save uncertain detection to firstImage, because iterative scan uses that
      // in order to determine which region to scan further
      if (gradientDetectionFrequency > arConf.edgeDetection.gradientThreshold) {
        results.uncertain = true;
        updateImage(searchRow);
        break outerLoop;
      }

      // Cases which require confirmation
      if (
        imageSegmentCount > arConf.edgeDetection.maxEdgeSegments // we need to confirm if there's too many segments
        || averageImageSegmentSize < arConf.edgeDetection.averageEdgeThreshold // we also need to confirm if segments are too small
      ) {
        if (imageConfirmPass) {
          results.uncertain = true;
          updateImage(searchRow - 1);
          break outerLoop;
        }

        imageConfirmPass = true;
        // imageConfirmPass must happen on the next row, but it's possible that we aren't
        // checking row-by-row. Hence, we need to modify our scan a bit
        searchRow -= scanSpacing + (scanSpacing > 0 ? - 1 : 1);

        continue outerLoop;
      }

      if (averageImageSegmentSize > arConf.edgeDetection.averageEdgeThreshold || imageSize > imageThreshold) {
        updateImage(searchRow);
        break outerLoop;
      }

      // we can only reach this far if we detected image
      if (imageConfirmPass) {
        updateImage(searchRow - 1);
      } else {
        updateImage(searchRow);
      }
      break outerLoop;
    } // end of outer loop
  }

  /**
   * Tries to determine letterbox through subtitles
   * @param imageData
   * @param startRow
   * @param endRow
   * @param ROW_SIZE
   * @param scanSpacing
   * @param minDetections
   * @param results
   * @param ssrRegionName
   * @returns
   */
  private subtitleScanRegionIterative(
    imageData: Uint8Array,
    height: number,
    startRow: number,
    endRow: number,
    scanSpacing: number,
    minDetections: number,
    results: AardTestResult_SubtitleRegion,
  ): boolean {
    while (true) {
      if (scanSpacing > -1 && scanSpacing < 1) {
        break;
      }
      this.subtitleScanRegionLinear(
        imageData, height,
        startRow, endRow,
        scanSpacing, minDetections, results
      );

      if (results.firstImage === -1) {
        return false;
      }

      // We need to ensure small amount of overlap, in case we landed on a sus row
      if (scanSpacing > 0) {
        startRow = Math.max(results.firstImage - Math.floor(scanSpacing * 2), 0);
        endRow = Math.min(results.firstImage + Math.floor(scanSpacing * 2), height - 1);
      } else {
        startRow = Math.min(results.firstImage + Math.floor(-scanSpacing * 2), height - 1);
        endRow = Math.max(results.firstImage - Math.floor(-scanSpacing * 2), 0);
      }

      scanSpacing = scanSpacing / 2;
    }

    return true;
  }



  /**
   * Updates aspect ratio if new aspect ratio is different enough from the old one
   */
  private updateAspectRatio(ar: number, options?: {uncertainDetection?: boolean, forceReset?: boolean}) {
    // Calculate difference between two ratios

    // We need to detect updates even if subtitles are detected — we just don't trigger
    // the actual aspect ratio change if everything is paused.
    if (this.timers.pauseUntil > Date.now() && !options?.forceReset) {
      return false;
    }

    const maxRatio = Math.max(ar, this.testResults.activeAspectRatio);
    const diff = Math.abs(ar - this.testResults.activeAspectRatio);

    if ((diff / maxRatio) > this.settings.active.aard.allowedArVariance || options?.forceReset) {
      this.videoData.resizer.updateAr({
        type: AspectRatioType.AutomaticUpdate,
        ratio: ar,
        offset: this.testResults.letterboxOffset,
        variant: this.arVariant
      });
      this.testResults.activeAspectRatio = ar;

      if (!options?.uncertainDetection) {
        if (this.settings.active.aard.autoDisable.onFirstChange) {
          this.status.autoDisabled = true;
        }
        if (this.settings.active.aard.autoDisable.ifNotChanged) {
          this.timers.autoDisableAt = Date.now() + this.settings.active.aard.autoDisable.ifNotChangedTimeout;
        }
      }

      this.testResults.aspectRatioUpdated = true;
    }
  }

  /**
   * Calculates video's current aspect ratio based on data in testResults.
   * @returns
   */
  private getAr(): number {
    const fileAr = this.video.videoWidth / this.video.videoHeight;
    const canvasAr = this.canvasStore.main.width / this.canvasStore.main.height;

    const compensatedWidth = fileAr === canvasAr ? this.canvasStore.main.width : this.video.videoWidth * this.canvasStore.main.height / (this.video.videoHeight);

    // console.log(`
    //   ———— ASPECT RATIO CALCULATION: —————

    //   canvas size: ${this.canvasStore.main.width} x ${this.canvasStore.main.height} (1:${this.canvasStore.main.width / this.canvasStore.main.height})
    //   file size: ${this.video.videoWidth} x ${this.video.videoHeight} (1:${this.video.videoWidth / this.video.videoHeight})

    //   compensated size: ${compensatedWidth} x ${this.canvasStore.main.height} (1:${compensatedWidth / this.canvasStore.main.height})

    //   letterbox height: ${this.testResults.letterboxWidth}
    //   net video height: ${this.canvasStore.main.height - (this.testResults.letterboxWidth * 2)}

    //   calculated aspect ratio -----

    //          ${compensatedWidth}               ${compensatedWidth}         ${compensatedWidth}
    //     ——————————————— = —————————————— = —————— =  ${compensatedWidth / (this.canvasStore.main.height - (this.testResults.letterboxWidth * 2))}
    //      ${this.canvasStore.main.height} - 2 x ${this.testResults.letterboxWidth}       ${this.canvasStore.main.height} - ${2 * this.testResults.letterboxWidth}       ${this.canvasStore.main.height - (this.testResults.letterboxWidth * 2)}
    // `);

    if (this.testResults.letterboxOrientation === LetterboxOrientation.Pillarbox) {
      const compensationFactor = compensatedWidth / this.canvasStore.main.width;
      const pillarboxCompensated = (this.testResults.letterboxSize * 2 * compensationFactor);
      return (compensatedWidth - pillarboxCompensated) / this.canvasStore.main.height;
    } else {
      const heightWithoutLetterbox = this.canvasStore.main.height - (this.testResults.letterboxSize * 2);
      return compensatedWidth / heightWithoutLetterbox;
    }
  }

  //#endregion

}
