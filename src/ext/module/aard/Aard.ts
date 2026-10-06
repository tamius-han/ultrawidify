import AspectRatioType from '@src/common/enums/AspectRatioType.enum';
import ExtensionMode from '@src/common/enums/ExtensionMode.enum';
import { ArVariant } from '@src/common/interfaces/ArInterface';
import { ExtensionEnvironment } from '@src/common/interfaces/SettingsInterface';
import EventBus from '../EventBus';
import Settings from '../settings/Settings';
import { SiteSettings } from '../settings/SiteSettings';
import VideoData from '../video-data/VideoData';
import { AardDebugUi } from './debug/AardDebugUi';
import { AardTimer } from './AardTimers';
import { Corner } from './enums/corner.enum';
import { VideoPlaybackState } from './enums/video-playback-state.enum';
import { FallbackCanvas } from './gl/FallbackCanvas';
import { GlCanvas } from './gl/GlCanvas';
import { GlDebugCanvas, GlDebugType } from './gl/GlDebugCanvas';
import { AardCanvasStore } from './interfaces/aard-canvas-store.interface';
import { AardDetectionSample, generateSampleArray, resetSamples } from './interfaces/aard-detection-sample.interface';
import { AardStatus, initAardStatus } from './interfaces/aard-status.interface';
import { AardTestResult_SubtitleRegion, AardTestResults, initAardTestResults, resetAardTestResults, resetGuardLine, resetSubtitleScanRegionBuffers, resetSubtitleScanResults } from './interfaces/aard-test-results.interface';
import { AardTimers, initAardTimers } from './interfaces/aard-timers.interface';
import { ComponentLogger } from '../logging/ComponentLogger';
import { AardPollingOptions } from './enums/aard-polling-options.enum';
import { AardSubtitleCropMode } from './enums/aard-subtitle-crop-mode.enum';
import { LetterboxOrientation } from './enums/letterbox-orientation.enum';
import { Edge } from './enums/edge.enum';
import { AardUncertainReason } from './enums/aard-letterbox-uncertain-reason.enum';
import { result } from 'lodash';
import { equalish } from '@src/common/utils/comparators';
import { ArConfirmationStrategy } from '@src/common/enums/ArConfirmationStrategy.enum';
import { AardMem, clearSubtitleScanPhaseBuffers, initAardMem } from '@src/ext/module/aard/interfaces/aard-mem.interface.ts';
import { AardSubtitlePhase } from '@src/ext/module/aard/enums/aard-subtitle-phase.enum';


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
  private arVariant?: ArVariant;

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

  private animationFrame?: number;

  //#region internal state
  public status: AardStatus = initAardStatus();
  private timers: AardTimers = initAardTimers();
  private inFallback: boolean = false;
  private fallbackReason: any;
  private canvasStore: AardCanvasStore;
  private testResults: AardTestResults;
  private verticalTestResults: AardTestResults;
  private mem: AardMem;
  private canvasSamples: AardDetectionSample;


  private destroyed: boolean = false;

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
    if (this.siteSettings.canRunAard(this.videoData.player.environment)) {
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
    if (this.destroyed) {
      return;
    }
    this.clearAutoDisabled();
    if (this.videoData.resizer.lastAr.type === AspectRatioType.AutomaticUpdate) {
      // ensure first autodetection will run in any case
      this.videoData.resizer.lastAr = {type: AspectRatioType.AutomaticUpdate, ratio: this.defaultAr};
    }

    // do full reset of test samples
    this.testResults = initAardTestResults(this.settings.active.aard);
    this.verticalTestResults = initAardTestResults(this.settings.active.aard);
    this.mem = initAardMem(this.settings.active.aard);

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
  async step(options?: {noCache?: boolean}) {
    if (this.destroyed) {
      return;
    }
    this.stop();

    if (options?.noCache) {
      this.testResults = initAardTestResults(this.settings.active.aard);
      this.verticalTestResults = initAardTestResults(this.settings.active.aard);
      this.mem = initAardMem(this.settings.active.aard);
    }

    await this.main();

    // this only ever prints to console when when user is actively using debug
    // functionalities of this addon
    console.info(
      '————————— aard step completed —————————\n\ntest results:\n',
      this.testResults, '\n\ntimers:',
      this.timers
    );
  }

  /**
   * Stops autodetection.
   */
  stop() {
    if (this.destroyed) {
      return;
    }

    this.status.aardActive = false;

    if (this.animationFrame) {
      window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = undefined;
    }
  }

  destroy() {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;

    this.stop();

    // VideoData.destroy() unsubscribes its own commands only. Ours were subscribed with
    // Aard as the source, so we need to remove them ourselves.
    this.eventBus.unsubscribeAll(this);

    try {
      this.hideDebugCanvas();
    } catch (e) {
      this.logger.warn('destroy', 'failed to remove debug UI:', e);
    }

    for (const canvas of [this.canvasStore?.main, this.canvasStore?.debug]) {
      try {
        canvas?.destroy();
      } catch (e) {
        this.logger.warn('destroy', 'failed to destroy canvas:', e);
      }
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
    // this frame is now running, so its id is no longer cancellable/meaningful.
    this.animationFrame = undefined;

    if (!this.status.aardActive) {
      return;
    }

    if (this.canTriggerFrameCheck()) {
      resetAardTestResults(this.testResults);
      resetSamples(this.canvasSamples);
      resetSubtitleScanResults(this.testResults);
      this.main();
    }

    if (this.status.aardActive && this.animationFrame === undefined) {
      this.animationFrame = window.requestAnimationFrame( (ts: DOMHighResTimeStamp) => this.onAnimationFrame(ts));
    }
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
              this.logger.error('onAnimationFrame', 'Error while drawing video frame:', e);
              const isCors = e.name === 'SecurityError';

              if (isCors) {
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
                this.fallbackReason = isCors ? {cors: true} : {webglError: true};
                if (arConf.aardType === 'auto') {
                  this.canvasStore.main.destroy();
                  this.canvasStore.main = this.createCanvas('main-gl', 'legacy');
                }
                this.inFallback = true;

                if (arConf.aardType !== 'auto') {
                  if (!isCors) {
                    this.eventBus.send('uw-config-broadcast', {type: 'aard-error', aardErrors: this.fallbackReason});
                  }
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
        orientationCheck:
        {
          this.getBlackLevelFast(
            imageData, 3, 1,
            arConf.canvasDimensions.sampleCanvas.width,
            arConf.canvasDimensions.sampleCanvas.height
          );

          if (this.testResults.letterboxOrientation === LetterboxOrientation.NotLetterbox) {
            this.testResults.flags.noLetterbox = true;
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

          this.testResults.flags.noLetterbox = true;
          break scanFrame;
        }

        // If we detect both letterbox and pillarbox, we keep things as they are but avoid scanning further
        if (this.testResults.letterboxOrientation === LetterboxOrientation.Both) {
          this.testResults.lastStage = 1;

          this.testResults.flags.doubleLetterbox = true;
          break scanFrame;
        }

        console.log('letterbox orientation scan returned orientation:', this.testResults.letterboxOrientation, LetterboxOrientation[this.testResults.letterboxOrientation]);
        // We only do subtitle check when orientation is letterbox
        if (this.testResults.letterboxOrientation === LetterboxOrientation.Letterbox) {
          console.log('performing subtitle scan');
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
          this.updateAspectRatio(this.defaultAr!, {forceReset: true});
          this.testResults.activeLetterbox.width = 0;
          this.testResults.activeLetterbox.offset = 0;
          this.testResults.activeLetterbox.orientation = LetterboxOrientation.NotLetterbox;

          this.testResults.flags.noLetterbox = true;
          clearTimeout(this.testResults.stability.timeDuration);
          break processUpdate;
        }

        // subtitle detection didn't run
        if (this.testResults.letterboxOrientation === LetterboxOrientation.Both) {
          this.testResults.flags.doubleLetterbox = true;
          clearTimeout(this.testResults.stability.timeDuration);
          break processUpdate;
        }

        if (
          this.testResults.subtitleDetected
          && (
            arConf.subtitles.subtitleCropMode === AardSubtitleCropMode.ResetAR
            || arConf.subtitles.subtitleCropMode === AardSubtitleCropMode.ResetAndDisable
          )
        ) {
          if (arConf.subtitles.subtitleCropMode === AardSubtitleCropMode.ResetAR) {
            this.updateAspectRatio(this.defaultAr!, {forceReset: true});
            this.testResults.activeLetterbox.width = 0;
            this.testResults.activeLetterbox.offset = 0;
            this.testResults.activeLetterbox.orientation = LetterboxOrientation.NotLetterbox;
            this.timers.pauseUntil = Date.now() + arConf.subtitles.resumeAfter;

          } else if (arConf.subtitles.subtitleCropMode === AardSubtitleCropMode.ResetAndDisable) {
            this.updateAspectRatio(this.defaultAr!, {forceReset: true});
            this.testResults.activeLetterbox.width = 0;
            this.testResults.activeLetterbox.offset = 0;
            this.testResults.activeLetterbox.orientation = LetterboxOrientation.NotLetterbox;

            this.status.autoDisabled = true;
          }

          clearTimeout(this.testResults.stability.timeDuration);
          break processUpdate;
        }

        // if detection is uncertain, we don't do anything at all (unless if guardline was broken, in which case we reset)
        if (this.testResults.aspectRatioUncertain) {

          this.testResults.flags.cropMaintaining = true;
          break processUpdate;
        }

        // TODO: emit debug values if debugging is enabled
        this.testResults.isFinished = true;

        this.testResults.guardLine.front = this.testResults.aspectRatioCheck.frontCandidate;
        this.testResults.guardLine.back = this.testResults.aspectRatioCheck.backCandidate;

        // TODO: set flag if subtitles are far enough from edge to avoid getting cropped
        const finalAr = this.getAr();
        if (finalAr > 0) {

          if (arConf.stability.confirmationStrategy !== ArConfirmationStrategy.NoConfirming) {
            const lastAr = this.testResults.stability.ratios[this.testResults.stability.ratioIndex];
            this.testResults.stability.ratioIndex = (this.testResults.stability.ratioIndex + 1) % this.testResults.stability.ratios.length;
            this.testResults.stability.ratios[this.testResults.stability.ratioIndex] = finalAr;

            const ratioTolerance = finalAr * arConf.stability.arTolerance;

            // time duration is a special case that doesn't work with stable delta.
            // we also don't care about whether last AR exists or not for this strategy
            if (arConf.stability.confirmationStrategy === ArConfirmationStrategy.TimeDuration) {

              // only clear and set timeout if finalAr is different than currentAr
              if (!equalish(finalAr, lastAr, ratioTolerance)) {
                clearTimeout(this.testResults.stability.timeDuration);

                this.testResults.stability.timeDuration = setTimeout(
                  () => {
                    this.testResults.flags.arStable = true;
                    this.updateAspectRatio(finalAr, {uncertainDetection: false, forceReset: false});
                    // this.testResults.activeLetterbox.width = this.testResults.letterboxSize;
                    // this.testResults.activeLetterbox.offset = this.testResults.letterboxOffset;
                    this.testResults.activeLetterbox.orientation = this.testResults.letterboxOrientation;

                    if (this.canvasStore.debug) {
                      // this.canvasStore.debug.drawBuffer(imageData);
                      this.timer.getAverage();
                      this.debugConfig?.debugUi?.updateTestResults(this.testResults, this.timers);
                    }
                  },
                  arConf.stability.arConfirmationTime
                );
              }

              break processUpdate;
            }

            // on first run, lastAr doesn't exist, so we can't do anything
            if (!lastAr) {
              break processUpdate;
            }

            // calculate and save delta
            const delta = Math.abs(finalAr - lastAr);
            this.testResults.stability.deltas[this.testResults.stability.deltaIndex] = delta;
            this.testResults.stability.deltaIndex = (this.testResults.stability.deltaIndex + 1) % this.testResults.stability.deltas.length;

            let stable = true;
            if (arConf.stability.confirmationStrategy === ArConfirmationStrategy.ConsecutiveScans) {

              for (let i = 1; i < this.testResults.stability.ratios.length; i++) {
                if (
                  !equalish(
                    this.testResults.stability.ratios[i],
                    this.testResults.stability.ratios[0],
                    ratioTolerance
                  )
                ) {
                  stable = false;
                  if (!arConf.stability.applyOnStableDelta) {
                    this.testResults.flags.cropMaintaining = true;
                    break processUpdate;
                  }
                }
              }

              this.testResults.flags.arStable = stable;
            }
            if (
              arConf.stability.confirmationStrategy === ArConfirmationStrategy.StableDelta
              || (!stable && arConf.stability.applyOnStableDelta)
            ) {
              const deltaTolerance = delta * arConf.stability.deltaTolerance;
              for (let i = 1; i < this.testResults.stability.deltas.length; i++) {
                if (
                  !equalish(
                    this.testResults.stability.deltas[i],
                    this.testResults.stability.deltas[0],
                    deltaTolerance
                  )
                ) {
                  this.testResults.flags.cropMaintaining = true;
                  break processUpdate;
                }
              }

              this.testResults.flags.arDeltaStable = true;
            }
          }

          this.testResults.flags.arStable = true;
          this.updateAspectRatio(finalAr);
          // this.testResults.activeLetterbox.width = this.testResults.letterboxSize;
          // this.testResults.activeLetterbox.offset = this.testResults.letterboxOffset;
          this.testResults.activeLetterbox.orientation = this.testResults.letterboxOrientation;
        } else {
          this.testResults.aspectRatioInvalid = true;
          this.testResults.flags.cropInvalidated = true;
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
    // if new topCandidate or bottomCandidate aren't valid,
    // use existing value.
    if (topCandidate < 0) {
      topCandidate = this.testResults.aspectRatioCheck.frontCandidate;
    }
    if (bottomCandidate < 0) {
      bottomCandidate = this.testResults.aspectRatioCheck.backCandidate;
    }

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

    if (this.testResults.letterboxOrientation === LetterboxOrientation.Letterbox && this.testResults.subtitleDetected) {
      const top = this.testResults.subtitleScan.regions.top.firstSubtitle === -1 ? topCandidate : Math.min(topCandidate, this.testResults.subtitleScan.regions.top.firstSubtitle);
      const bottom = Math.max(bottomCandidate, this.testResults.subtitleScan.regions.bottom.firstSubtitle);

      this.testResults.letterboxSizeWithSubtitles = ~~((top + (crossDimension - bottomCandidate)) * 0.5);
    }
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

    // it doesn't matter whether subtitle stability checks run on the first frame,
    // which means we can increment interval frame before doing anything.
    // note that unlike the rest of test results, stability.intervalFrame is not
    // resettable.
    ssrRegions.top.stability.intervalFrame++;
    ssrRegions.bottom.stability.intervalFrame++;

    // don't let the numbers go too high. Note that intervalFrame can be set differently
    // for top and bottom regions, such that subtitle stability is being processed on
    // odd checks for top and even for bottom (or vice versa)
    if (! (ssrRegions.top.stability.intervalFrame % this.settings.active.aard.subtitles.stability.confirmationScanInterval)) {
      ssrRegions.top.stability.intervalFrame = 0;
    }
    if (! (ssrRegions.bottom.stability.intervalFrame % this.settings.active.aard.subtitles.stability.confirmationScanInterval)) {
      ssrRegions.bottom.stability.intervalFrame = 0;
    }

    this.subtitleScanRegionIterative({
      imageData,
      height,
      startRow: 2,
      endRow: halfHeight,
      scanSpacing: scanConf.refiningScanSpacing,
      minDetections: scanConf.minDetections,
      results: ssrRegions.top,
    });

    this.subtitleScanRegionIterative({
      imageData,
      height,
      startRow: height - 3,
      endRow: halfHeight,
      scanSpacing: -scanConf.refiningScanSpacing,
      minDetections: scanConf.minDetections,
      results: ssrRegions.bottom,
    });

    if (ssrRegions.top.uncertain || ssrRegions.bottom.uncertain) {
      this.testResults.aspectRatioUncertain = true;
    } else {
      this.testResults.aspectRatioUncertain = false;
    }

    // if (ssrRegions.top.subtitlesUnstable && ssrRegions.bottom.subtitlesUnstable) {
    //   this.testResults.flags.subtitlesUncertain = true;
    // } else {
    //   this.testResults.flags.subtitlesUncertain = false;
    // }

    // 1. updateLetterboxEdgeCandidates runs regardless of whether we detected subtitles or not.
    // 2. it's also not affected by whether subtitleDetected is set
    // 3. we actually need to only reset letterbox if subtitle is actually outside of the crop area
    this.updateLetterboxEdgeCandidates(
      height,
      ssrRegions.top.firstImage,
      ssrRegions.bottom.firstImage
    );


    if (this.testResults.letterboxOrientation === LetterboxOrientation.Letterbox) {

      const hasTopSubtitle = ssrRegions.top.firstSubtitle !== -1;
      const hasBottomSubtitle = ssrRegions.bottom.firstSubtitle !== -1;

      // subs statistics are processed always, regardless of whether we're resetting AR on subtitles or not
      if (
        (hasTopSubtitle  && !ssrRegions.top.subtitlesUnstable)
        || (hasBottomSubtitle && !ssrRegions.bottom.subtitlesUnstable)
      ) {
        this.testResults.flags.subtitlesConfirmed = true;
        this.testResults.flags.noSubtitles = false;

        // we only reset letterbox if letters are outside the video area, otherwise we risk
        // getting whacked by credits, ppt youtubers, and other shit like that
        const borderTop = this.testResults.activeLetterbox.width;
        const borderBottom = this.settings.active.aard.canvasDimensions.sampleCanvas.height - this.testResults.activeLetterbox.width;
        const actionableSubsTop = hasTopSubtitle && ssrRegions.top.firstSubtitle < borderTop;
        const actionableSubsBottom = hasBottomSubtitle && ssrRegions.bottom.firstSubtitle > borderBottom;

        if (actionableSubsTop || actionableSubsBottom) {
          this.testResults.subtitleDetected = true;
        }
      } else if (hasTopSubtitle || hasBottomSubtitle) {
        this.testResults.flags.noSubtitles = false;
        this.testResults.flags.subtitlesConfirmed = false;
        this.testResults.flags.subtitlesUncertain = true;
      } else {
        this.testResults.flags.noSubtitles = true;
        this.testResults.flags.subtitlesConfirmed = false;
      }
    }

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

    const mem = this.mem.subtitleScan;

    const scanConf = this.settings.active.aard.subtitles;
    const arConf = this.settings.active.aard;

    // If detecting subtitles only resets AR (or disables autodetection), we can stop scanning as soon as
    // we find the first subtitle. In other modes (CropSubtitles, DisableScan) we must keep going, because
    // the scan is also used to find where the image starts.
    const stopOnFirstSubtitle = scanConf.subtitleCropMode === AardSubtitleCropMode.ResetAR
      || scanConf.subtitleCropMode === AardSubtitleCropMode.ResetAndDisable;

    let letterCount, imageSegmentCount, potentialFadedLetterCount, potentialFadedLetterCountInvalidated,
      nonGradientPixelCount, letterSize, imageSize, imageSegmentSize, imageWeightedSize,
      segmentWeights, imageSegmentAlignment, imageSegmentAlignmentSamples,
      isOnLetter, isOnImage, isBlank,
      gradientRowDelta_before, gradientRowDelta_after;


    let likelySubtitle, likelyImage;
    let darkEdgeSamples, darkEdgeDelta, darkEdge_nextRow;

    let rowStart, rowEnd, rowMid, rowGTA, rowGTB; // GT = gradient test
    let imageConfirmPass = false, subtitleConfirmPass = false;

    let outerIteration = 0;

    const rowMargin = Math.floor(scanConf.scanMargin * ROW_SIZE);
    const imageThreshold = Math.floor((ROW_SIZE - (rowMargin * 2)) * arConf.edgeDetection.minValidImage * PIXEL_SIZE_FRACTION);

    // set up stuff for subtitle stability verification
    let scanSlotOffset = results.stability.scanSlot * results.stability.slotSize;
    let lineSlotOffset = 0;        // index of the current line within the current scan slot
    let letterPhaseLengthCountIndex = 0; // how many pixels we spent in letter on / letter off

    const changeCountIndex = scanConf.maxPhasesPerType;
    const combinedPhasesChangeCountIndex = scanConf.maxPhasesTotal;

    const lastScannedLines = [-1, -1];
    // search in top letterbox
    outerLoop:
    for (
      let searchRow = startRow;
      (scanSpacing > 0 && searchRow < endRow) || (scanSpacing < 0 && searchRow > endRow);
      searchRow += scanSpacing
    ) {

      lastScannedLines[1] = lastScannedLines[0];
      lastScannedLines[0] = searchRow;
      if (lastScannedLines[0] === lastScannedLines[1]) {
        console.warn("we are scanning same row as before. This shouldn't happen.");
        continue outerLoop;
      }
      // Code inside here runs ONCE PER ROW

      // Reset phase change counters
      clearSubtitleScanPhaseBuffers(this.mem);
      letterPhaseLengthCountIndex  = 0;

      if (++outerIteration > height) {
        // console.warn('[ultrawidify|aard::subtitleScanRegionLinear] — scan got stuck in an infinite loop. This shouldn\'t happen.');
        results.uncertain = true;
        break outerLoop;
      }

      //#region prepare for inner loop
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

      likelySubtitle = false;
      likelyImage = false;

      darkEdgeSamples = 0;
      darkEdgeDelta = 0;

      // Scan region is centered,
      rowStart = (searchRow * ROW_SIZE) + rowMargin;

      const scanSize = ROW_SIZE - (2 * rowMargin);

      // Gradient test compares current row with a row 'before' it (towards the frame edge) and a row
      // 'after' it (towards the center of the frame). Which direction that is depends on whether we're
      // scanning the top or the bottom letterbox.
      // These are offsets RELATIVE to the current row (negative = rows above, positive = rows below).
      if (scanSpacing > 0) {
        gradientRowDelta_before = (Math.max(searchRow - 2, 0)          - searchRow) * ROW_SIZE;
        gradientRowDelta_after  = (Math.min(searchRow + 2, height - 1) - searchRow) * ROW_SIZE;
      } else {
        gradientRowDelta_before = (Math.min(searchRow + 2, height - 1) - searchRow) * ROW_SIZE;
        gradientRowDelta_after  = (Math.max(searchRow - 2, 0)          - searchRow) * ROW_SIZE;
      }

      // exact row doesn't matter ... unless scanMargin is 0
      rowEnd = ((searchRow + 1) * ROW_SIZE) - rowMargin;
      rowMid = (rowStart + rowEnd) * 0.5;

      const resetSubtitleConfirmPass =() => {
        if (subtitleConfirmPass) {
          subtitleConfirmPass = false;
          // searchRow -= (scanSpacing > 0 ? + 1 : -1);
        }
      }

      const updateImageCandidate = (candidate: number) => {
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

      const updateSubtitleInfo = (searchRow: number) => {
        // when we reach the minDetection threshold, we can set the firstSubtitle row
        // we also want to keep firstSubtitle accurate, which means that we have to set
        // firstSubtitle to the detection that happened closest to the edge (in current
        // implementation, we need this to be accurate)
        // if (letterCount === minDetections) {

          results.hasSubtitle = true;

          // we always set firstSubtitle if it hasn't been set yet
          if (results.firstSubtitle === -1) {
            results.firstSubtitle = searchRow;
            results.lastSubtitle = searchRow;
          } else {
            if (scanSpacing > 0) { // smaller number = closer to the edge
              if (searchRow < results.firstSubtitle) {
                results.firstSubtitle = searchRow;
              }
              if (searchRow > results.lastSubtitle) {
                results.lastSubtitle = searchRow;
              }
            } else {               // bigger number = closer to the edge
              if (searchRow > results.firstSubtitle) {
                results.firstSubtitle = searchRow;
              }
              if (searchRow < results.lastSubtitle) {
                results.lastSubtitle = searchRow;
              }
            }
          }
          isBlank = false;
          imageConfirmPass = false;
        // }
      }
      //#endregion

      /**
       * This function can break or return early only in the following situations:
       *
       *     * we have enough letters to detect subtitles — continue outerLoop
       *     * Single "letter" is too wide — immediate return, as we found where the image starts
       *
       * Other instances require a bit more complex analysis.
       */
      let phase: AardSubtitlePhase = AardSubtitlePhase.Uninitialized, lastPhase: AardSubtitlePhase = AardSubtitlePhase.Uninitialized;
      lineScan:
      while (rowStart < rowEnd) {
        lastPhase = phase;

        const r = imageData[rowStart], g = imageData[rowStart + 1], b = imageData[rowStart + 2];



        phase = 0;  // if pixel is dark, it will stay at 0
        if (        // we detected image -> increase to 1
          r > this.testResults.blackThreshold
          || g > this.testResults.blackThreshold
          || b > this.testResults.blackThreshold
        ) {
          ++phase;
        }
        if (        // increase to 2 once we go aboe "subtitle off" zone
          r > scanConf.subtitleSubpixelThresholdOff
          || g > scanConf.subtitleSubpixelThresholdOff
          || b > scanConf.subtitleSubpixelThresholdOff
        ) {
          ++phase;
        }
        if (        // increase to 3 if subtitle threshold is passed
          r > scanConf.subtitleSubpixelThresholdOn
          || g > scanConf.subtitleSubpixelThresholdOn
          || b > scanConf.subtitleSubpixelThresholdOn
        ) {
          ++phase;
        }

        // some things only run when phase change occurs
        if (phase !== lastPhase) {
          letterPhaseLengthCountIndex++;
          mem.linePhaseLengths[letterPhaseLengthCountIndex] = 0;
          mem.linePhaseLengths[combinedPhasesChangeCountIndex]++;

          // increase phase counter as needed
          switch (phase) {
            case AardSubtitlePhase.Off:
              mem.darkPhases[changeCountIndex]++;
              break;
            case AardSubtitlePhase.Image:
              mem.nonDarkPhases[changeCountIndex]++;
              mem.imagePhases[changeCountIndex]++;
              break;
            case AardSubtitlePhase.SubtitleHalf:
              mem.nonDarkPhases[changeCountIndex]++;
              mem.subtitleHalfPhases[changeCountIndex]++;
              break;
            case AardSubtitlePhase.SubtitleFull:
              mem.nonDarkPhases[changeCountIndex]++;
              mem.subtitleFullPhases[changeCountIndex]++;
              break;
          }

          // check that no phase overran its buffer. If we overran
          // the buffer, we need to stop scanning this line
          if (
            mem.darkPhases[changeCountIndex] >= scanConf.maxPhasesPerType
            || mem.nonDarkPhases[changeCountIndex] >= scanConf.maxPhasesPerType
            || mem.imagePhases[changeCountIndex] >= scanConf.maxPhasesPerType
            || mem.subtitleHalfPhases[changeCountIndex] >= scanConf.maxPhasesPerType
            || mem.subtitleFullPhases[changeCountIndex] >= scanConf.maxPhasesPerType
            || mem.linePhaseLengths[combinedPhasesChangeCountIndex] > scanConf.maxPhasesTotal
          ) {
            break lineScan;
          }

          // Clear the newly entered phase slot. The final array element is its index.
          switch (phase) {
            case AardSubtitlePhase.Off:
              mem.darkPhases[mem.darkPhases[changeCountIndex]] = 0;
              break;
            case AardSubtitlePhase.Image:
              mem.nonDarkPhases[mem.nonDarkPhases[changeCountIndex]] = 0;
              mem.imagePhases[mem.imagePhases[changeCountIndex]] = 0;
              break;
            case AardSubtitlePhase.SubtitleHalf:
              mem.nonDarkPhases[mem.nonDarkPhases[changeCountIndex]] = 0;
              mem.subtitleHalfPhases[mem.subtitleHalfPhases[changeCountIndex]] = 0;
              break;
            case AardSubtitlePhase.SubtitleFull:
              mem.nonDarkPhases[mem.nonDarkPhases[changeCountIndex]] = 0;
              mem.subtitleFullPhases[mem.subtitleFullPhases[changeCountIndex]] = 0;
              break;
          }


          if (phase === AardSubtitlePhase.Off) {   // PIXEL TURNED OFF/DARK
            // if pixel was any sort of non-dark before
            if (lastPhase !== 0) {
              if (imageSegmentSize > arConf.edgeDetection.minEdgeSegmentSize) {
                imageSegmentCount++;
                imageWeightedSize += imageSegmentSize * imageSegmentSize; // longer segments should have bigger weight
                segmentWeights += imageSegmentSize;
                imageSegmentSize = 0;
              }
            }

            // if pixel went from "image but not subtitle" to "dark"
            if (lastPhase === AardSubtitlePhase.SubtitleHalf) {
              if (imageSegmentSize < scanConf.maxValidLetter) {
                potentialFadedLetterCount++;
              } else {
                potentialFadedLetterCountInvalidated = true;
              }
            }

            letterSize = 0;
            imageSegmentSize = 0;
          } else {             // PIXEL TURNED FROM OFF IMAGE OR SUBTITLE



          }


        }

        // save stuff for debug canvas, increase counters as needed
        switch (phase) {
          case AardSubtitlePhase.Off:
            imageData[rowStart + 3] = GlDebugType.SubtitleThresholdOff;
            mem.darkPhases[mem.darkPhases[changeCountIndex]]++;
            break;
          case AardSubtitlePhase.Image:
            imageData[rowStart + 3] = GlDebugType.SubtitleThresholdNone;
            mem.nonDarkPhases[mem.nonDarkPhases[changeCountIndex]]++;
            mem.imagePhases[mem.imagePhases[changeCountIndex]]++;
            break;
          case AardSubtitlePhase.SubtitleHalf:
            imageData[rowStart + 3] = GlDebugType.SubtitleThresholdNone;
            mem.nonDarkPhases[mem.nonDarkPhases[changeCountIndex]]++;
            mem.subtitleHalfPhases[mem.subtitleHalfPhases[changeCountIndex]]++;
            break;
          case AardSubtitlePhase.SubtitleFull:
            imageData[rowStart + 3] = GlDebugType.SubtitleThresholdOn;
            mem.nonDarkPhases[mem.nonDarkPhases[changeCountIndex]]++;
            mem.subtitleFullPhases[mem.subtitleFullPhases[changeCountIndex]]++;
            break;
        }

        // SPECIAL TESTS FOR PHASE 1:
        //    1. Dark edge detection test
        //    2. Gradient test
        if (phase === AardSubtitlePhase.Image) {

          // Dark edge detection test:
          if (
            imageData[rowStart] < this.testResults.blackThreshold
            && imageData[rowStart + 1] < this.testResults.blackThreshold
            && imageData[rowStart + 2] < this.testResults.blackThreshold
          ) {

            darkEdge_nextRow = rowStart + scanSpacing * ROW_SIZE;

            // we penalize negative values a lot, and we clamp positive values to
            // something small so large values don't throw off the average. If the
            // sample is consistent enough to be more than our threshold (which we
            // check later), we found an edge
            let diff, d = -Infinity;
            for (let i = 0; i < 3; i++) {
              diff = imageData[darkEdge_nextRow + i] - imageData[rowStart + i];
              if (diff < 0) {
                diff *= 8;
              }
              if (diff > d) {
                d = diff;
              }
            }
            if (d > 4) {
              d = 4;
            }
            darkEdgeDelta += d;
            darkEdgeSamples++;
          }

          // GRADIENT TEST — ALWAYS DO IN PHASE 1 (regardless of whether phase just changed or not)
          // We only need to test darker but not dark pixels — for subtitle
          // phase, this test will always be false, hence phase === 1 test.
          // We keep track of number of pixels that pass the test, or don't
          // need the test to begin with.
          if (
            imageData[rowStart    ] < arConf.edgeDetection.gradientThreshold
            && imageData[rowStart + 1] < arConf.edgeDetection.gradientThreshold
            && imageData[rowStart + 2] < arConf.edgeDetection.gradientThreshold
          ) {

            rowGTB = rowStart + gradientRowDelta_before;
            rowGTA = rowStart + gradientRowDelta_after;

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

        // we always update counters at the end, regardless of whether phase changed or not
        switch (phase) {
          case AardSubtitlePhase.SubtitleFull:
            isOnLetter = true;
            letterSize++;
            // fall through — case 1 stuff also happens in phase 2
          case AardSubtitlePhase.SubtitleHalf:
          case AardSubtitlePhase.Image:
            imageSegmentSize++;
            imageSize++;
            isOnImage = true;
            isBlank = false;
        }
        mem.linePhaseLengths[letterPhaseLengthCountIndex]++;
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

      /**
       *   LINE SCAN FINISHED, time to process the results
       *
       * If there is no segments with image (if all we see is black),
       * we mark the row as blank.
       *
       * If we are in subtitle confirm pass, we didn't find the subtitles,
       * so we reset subtitle confirmation pass data.
       */
      if (mem.linePhaseLengths[combinedPhasesChangeCountIndex] < 2 || !imageSegmentCount || isBlank) {
        isBlank = true;
        imageConfirmPass = false;

        if (results.firstBlank === -1) {
          results.firstBlank = searchRow;
        }
        results.lastBlank = searchRow;

        resetSubtitleConfirmPass();
        continue outerLoop;
      }

      // Reset phase length frequency array
      const maxf = mem.phaseLengthFrequency.length - 1;
      for (let i = 0; i < mem.phaseLengthFrequency.length; i++) {
        mem.phaseLengthFrequency[i] = 0;
      }

      /**
       * Convert phase lengths into frequency array.
       *
       * Here's the stuff that goes in:
       *   — ALL subtitle phase lengths
       *   — ALL half-subtitle phase lengths
       *   — short dark phase lengths
       *
       * we ignore dark phase lengths, because we want long
       * phases of non-dark pixels to work against subtitle detection
       */
      phaseFrequencyProcessing:
      {
        const subtitlePhaseCount = mem.subtitleFullPhases[changeCountIndex] + 1;
        const subtitleHalfPhaseCount = mem.subtitleHalfPhases[changeCountIndex] + 1;
        const darkPhaseCount = mem.darkPhases[changeCountIndex] + 1;

        for (let i = 0; i < subtitlePhaseCount; i++) {
          const phaseLength = mem.subtitleFullPhases[i];
          if (phaseLength <= maxf) {
            mem.phaseLengthFrequency[phaseLength]++;
          } else {  // we penalize "not a letter" by inflating count of phase lengths longer than max letter width
            mem.phaseLengthFrequency[maxf] += Math.ceil(phaseLength / maxf);
          }
        }
        for (let i = 0; i < subtitleHalfPhaseCount; i++) {
          const phaseLength = mem.subtitleHalfPhases[i];
          if (phaseLength <= maxf) {
            mem.phaseLengthFrequency[phaseLength]++;
          } else {  // we penalize "not a letter" by inflating count of phase lengths longer than max letter width
            mem.phaseLengthFrequency[maxf] += Math.ceil(phaseLength / maxf);
          }
        }
        for (let i = 0; i < darkPhaseCount; i++) {
          const phaseLength = mem.darkPhases[i];
          if (phaseLength <= maxf) {
            mem.phaseLengthFrequency[phaseLength]++;
          }
        }

        // compute average phase length
        let sum = 0, count = 0;
        for (let i = 0; i < mem.phaseLengthFrequency.length; i++) {
          sum += mem.phaseLengthFrequency[i] * i;
          count += mem.phaseLengthFrequency[i];
        }

        // determine whether we're looking at a subtitle based on the
        // heuristics that we've calculated
        const averagePhaseLength = sum / count;

        if (averagePhaseLength < 4) {
          /**
           * time for critical thinking: just because average length is short, that doesn't mean
           * we're looking at a subtitle, otherwise every compression artifact is gonna trigger
           * subtitle detection ... which is less than ideal.
           *
           * If we have very few counts, it _better be dab smack in the middle_
           */

          const quarterScan = scanSize >> 4; // divide by 16, because scanSize is in RGBA subpixels, but phase lengths are in pixels
          const lowCountCriteria = (
            (subtitlePhaseCount > 2 || subtitlePhaseCount > 4)
            && mem.darkPhases[0] > quarterScan
            && mem.darkPhases[darkPhaseCount - 1] > quarterScan
          );
          const highCountCriteria = (subtitlePhaseCount > 4 || subtitlePhaseCount > 8);

          if (lowCountCriteria || highCountCriteria) {
            updateSubtitleInfo(searchRow);
            likelySubtitle = true;
            results.subtitleConfirmations++;
          }
        } else if (averagePhaseLength >= 8) {
          console.log('we detected image maybe', averagePhaseLength, 'in line', searchRow);
          likelyImage = true;
        }
      }

      /**
       * We see if we get to copy candidate line to our buffer. We can run this check
       * AFTER checking for blank rows, as blank rows can never be valid candidates for
       * subtitle stability test (& also default state is already blank row, so no need
       * to copy the buffer unless we found something better)
       *
       * We also allow for sporadic updates of the stability buffer if we want to have
       * "larger temporal spacing (tm)". In that case, verification runs on stale data,
       * but that's no biggie (except for the part where could just cache the scan results as well)
       */
      if (results.stability.intervalFrame === 0) {
        const slotOffset = results.stability.scanSlot * results.stability.slotSize;
        const lineOffset = results.stability.lineSlot * results.stability.lineSize;

        const candidate = mem.linePhaseLengths;
        const buffer = results.stability.buffer;
        const start = slotOffset + lineOffset;
        const stabilityCountIndex = results.stability.lineSize - 1;
        const phaseCount = Math.min(
          candidate[combinedPhasesChangeCountIndex],
          stabilityCountIndex
        );

        // item with most changes gets the slot.
        if (phaseCount >= buffer[start + stabilityCountIndex]) {
          for (let i = 0; i < phaseCount; i++) {
            buffer[start + i] = candidate[i];
          }
          buffer[start + stabilityCountIndex] = phaseCount;

          results.stability.lineSlot++;
          if (results.stability.lineSlot % this.settings.active.aard.subtitles.stability.scanLines === 0) {
            results.stability.lineSlot = 0;
          }
        }
      }

      if (likelyImage) {
        updateImageCandidate(searchRow);
        break outerLoop;
      }


      // const averageImageSegmentSize = segmentWeights > 0 ? imageWeightedSize / segmentWeights : 0;
      const gradientDetectionFrequency = 1 - (nonGradientPixelCount / imageSize);

      // If we detect gradient, that's instant fail.
      // We still save uncertain detection to firstImage, because iterative scan uses that
      // in order to determine which region to scan further
      if (gradientDetectionFrequency > arConf.edgeDetection.gradientThreshold) {
        results.uncertain = true;
        updateImageCandidate(searchRow);
        break outerLoop;
      }

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
    {imageData, height, startRow, endRow, scanSpacing, minDetections, results}: {
      imageData: Uint8Array,
      height: number,
      startRow: number,
      endRow: number,
      scanSpacing: number,
      minDetections: number,
      results: AardTestResult_SubtitleRegion,
    }): boolean {

    if (results.stability.intervalFrame === 0) {
      results.stability.scanSlot++;
      if (results.stability.scanSlot % this.settings.active.aard.subtitles.stability.confirmationScans === 0) {
        results.stability.scanSlot = 0;
      }

      // we also NEED to reset current scan slot in the buffer,
      // because otherwise we're guaranteed to get stale and faulty data.
      // resetting the phase counter should generally be enough
      const scanSlotOffset = results.stability.scanSlot * results.stability.slotSize;
      const phaseCounterOffset = results.stability.lineSize - 1;
      for (let i = 0; i < this.settings.active.aard.subtitles.stability.scanLines; i++) {
        results.stability.buffer[scanSlotOffset + i * results.stability.lineSize + phaseCounterOffset] = 0;
      }
    }
    // line slot resets on each scan, which guarantees that the last _n_ lines that we
    // checked for subtitles always happen in the same order.
    results.stability.lineSlot = 0;

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

    // stability test can set subtitle scan uncertainty to true, but not the other way around
    if (!results.uncertain && this.settings.active.aard.subtitles.stability.confirmationScans > 1) {
      const counterIndexOffset = results.stability.lineSize - 1;
      let lineOffset: number, segmentOffset: number;
      let phaseChangeCount: number;

      // verify that phase change counts are the same between same lines across different scan slots
      for (let li = 0; li < this.settings.active.aard.subtitles.stability.scanLines; li++) {
        lineOffset = li * results.stability.lineSize + counterIndexOffset;

        for (let si = 1; si < this.settings.active.aard.subtitles.stability.confirmationScans; si++) {
          segmentOffset = si * results.stability.slotSize;

          if (results.stability.buffer[lineOffset] !== results.stability.buffer[segmentOffset + lineOffset]) {
            results.subtitlesUnstable = true;
            return true;  // we know subtitles are unstable, so we can bail
          }
        }
      }

      for (let li = 0; li < this.settings.active.aard.subtitles.stability.scanLines; li++) {
        lineOffset = li * results.stability.lineSize;
        phaseChangeCount = results.stability.buffer[lineOffset + counterIndexOffset];

        for (let si = 1; si < this.settings.active.aard.subtitles.stability.confirmationScans; si++) {
          segmentOffset = si * results.stability.slotSize;

          for (let pi = 0; pi < phaseChangeCount; pi++) {
            if (!equalish(
              results.stability.buffer[lineOffset + pi],
              results.stability.buffer[segmentOffset + lineOffset + pi],
              this.settings.active.aard.subtitles.stability.phaseLengthTolerance
            )) {
              results.subtitlesUnstable = true;
              return true;  // we know subtitles are unstable, so we can bail
            }
          }
        }
      }
    }
    results.subtitlesUnstable = false;

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

      // TODO: set flag if subtitles are far enough from edge to avoid getting cropped
      // if (this.testResults.subtitleDetected) {
      //   const hwlWithSubtitles = this.canvasStore.main.height - (this.testResults.letterboxSizeWithSubtitles * 2)
      //   const subtitleRatio = compensatedWidth / hwlWithSubtitles;

      // }
      return compensatedWidth / heightWithoutLetterbox;
    }
  }

  //#endregion

}
