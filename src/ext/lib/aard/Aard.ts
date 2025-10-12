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
 * How it works:
 */
/**
 *  [ ] Draw frame to canvas
 *   |
 *   |
 *   |  0. A few things about the frame.
 *   |     We imagine that the frame is divided in three regions.
 *   |     Edge regions span from left and right edges towards the
 *   |     center of the frame. The border between edge region and
 *   |     center region is user-defined. We trust center region
 *   |     more than we trust the edge regions, because edge regions
 *   |     may contain a watermark that we don't give a single fuck
 *   |     about. To make things simple, we'll assume that each video
 *   |     gets at most one (1) watermark, which appears in at most
 *   |     one (1) of the four edge panels.
 *   |
 *   |     EDGE REGION   %    CENTER REGION    %   EDGE REGION
 *   |                   ↓                     ↓
 *   |  +----------------+---------------------+----------------+
 *   |  |                :                     :                |
 *   |  |                :                     :                |
 *   |  |                :      v i d e o      :                |
 *   |  | . . . . . . . . . . . . . . . . . . . . . . . . . . . |
 *   |  |                :      f r a m e      :                |
 *   |  |                :                     :                |
 *   |  |                :                     :                |
 *   |  +----------------+---------------------+----------------+
 *   |
 *   |
 *   |
 *   |  1. Do some fast tests in order to determine whether
 *   |     we need to run the more expensive tests.
 *   |     (admittedly, letterbox shrink and grow tests might
 *   |     be more expensive than full edge detection, but
 *   |     _probably_ not due to data locality)
 *   |
 *   |
 *   V 🔶 Check pixels in the corner. Are they black?
 *  < > ———— no ————+
 *   |              V
 *  yes          no black bars, nothing to be done ———> 🛑 END
 *   |
 *   V 🔶 Did we detect black bars yet?
 *  < > ———— yes ———+
 *   |              |    Check pixels at the inner edge of the
 *   |              ↓ 🔶 black bar. Are there any non-black pixels?
 *   no            < >——————————— no ———————————————>——————————+
 *   |              |                                          |
 *   |             yes                                         |
 *   |              |                                          |
 *   |              |    Are those non-black pixels near the   |
 *   V              V 🔶 one of the edges & within tolerance?  V
 *   |             < >—— yes, only at one edge —————>——————————+
 *   |              |                                          |
 *   |      no, there's too many non-black pixels /            |
 *   |      non-black pixels are in the center                 |
 *   |              |                                          |
 *   +—<——— Aspect ratio definitely changed                    |
 *   |                                                         |
 *   |                Check pixels at the outer edges of the   |
 *   |                area of the frame we think should con-   |
 *   V                   tain the image. Are at least ??% of   |
 *   |                               those pixels non-black? 🔶V
 *   |                                               no ——————< >
 *   |                                               |         |
 *   +—<—————————<———————— Aspect ratio probably changed      yes
 *   |                                                         |
 *   |                                                         V
 *   |                                           Aspect ratio is same as before
 *   |                                                         |
 *   |  2. If we came this far, we need to run aspect          |
 *   |     ratio detection.                                    |
 *   |                                                         |
 *   |                                                         |
 *   |                                                         |
 *   V                                                         |
 *  SCAN FRAME, COLUMN BY COLUMN                               |
 *  FOR EACH COLUMN:   V                                       |
 *  :                  |                                     : |
 *  :        Check every pixel from the edge towards         : |
 *  :        the center of the frame. Continue until         : |
 *  :        reaching the first non-black pixel.             : |
 *  :                  |                                     : |
 *  :                  |   Did we reach a non-black pixel    : |
 *  :                  V 🔶before reaching center of frame?  : V
 *  :           no ———< >——— yes                             : |
 *  :           V             |                              : |
 *  :   Mark column as        V                              : |
 *  :        invalid     Check pixels to the left and right  : |
 *  :                     of detected pixel within certain   : |
 *  :                      distance                          : |
 *  :                         |                              : |
 *  :                         V 🔶 Are all pixels non-black? : V
 *  :                 yes ———< >——— no                       : |
 *  :                  |             V                       : |
 *  :                  |        Mark column as invalid.      : |
 *  :                  V                                     : |
 *  :   Check pixels to the left and right of detected       : |
 *  :   pixel within certain distance, but in the last       : |
 *  :   row without detection                                : |
 *  :                  |                                     : |
 *  :                  V 🔶 Are all pixels black?      ......  V
 *  :          yes ———< >——— no                        :       |
 *  :           V             |                        :       |
 *  :           |             V                        :       |
 *  :           |            Mark column as invalid    :       |
 *  :           |                                      :       |
 *  :           |    Is pixel significantly brighter   :       |
 *  :           V 🔶 than the black level?             :       V
 *  :   yes —— < > ——— no                              :       |
 *  :    |              |                              :       |
 *  :    |          Run gradient detection.            :       |
 *  :    |              |                              :       |
 *  :    |              V 🔶 Is gradient detected?     :       V
 *  :    |      no ——— < > ——— yes                     :       |
 *  :    V      V               |                      :       |
 *  : Record the detected       V                      :       |
 *  :       position       Mark column as invalid      :       |
 *  -  -  -  -  |  -  -  -  -  -  -  -  -  -  -  -  -  -       |
 *              V                                              |
 *        Process image positions we detected, separately      |
 *        for upper and lower bars.                            |
 *        Topmost detection is considered the only valid       |
 *        option (unless in edge section under certain         |
 *        circumstances). If that position appears more        |
 *        than once, that increases our confidence.            |
 *              |                                              |
 *              V 🔶 Are we confident enough?                  V
 *     yes ——— < > —————————————————————————— no               |
 *      V                                      |               |
 * Aspect ratio is certain      Aspect ratio not certain       |
 *      |                                      |               |
 *      |                                      |               |
 *      |                                      |               |
 *      |                                      |               |
 *      :                                      :               |
 *                                                             |
 *     2. Sometimes, there might be subtitles hardcoded in     |
 *        the black bars. If user enables this feature, then   V
 *        presence of subtitle should invalidate               |
 *        TODO: IMPLEMENT THIS                                 |
 *                                                             |
 *      :                                      :               |
 *      |                                      |               |
 *      |                                      |               |
 *      V 🔶 Is subtitle detection enabled? 🔶 V              \/
 *     < > ——————— no                no —————— < >     Detect  |
 *      |           V                V          |      Sub? 🔶 V
 *      |     Apply aspect        Do nothing <—]|[———— no ——— < >
 *      |        ratio               |          |              |
 *     yes          +———> 🛑 END <———+         yes            yes
 *      |                                       |              |
 *      |                                       |              |
 *      V                                       V              V
 *  RUN SUBTITLE DETECTION                 RUN SUBTITLE DETECTION
 *      V                                       V              V
 *  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 *  :  [ ]                                                      :
 *  :   |                                                       :
 *  :   V                                                       :
 *  : Draw only the letterbox region of the video to            :
 *  : a separate canvas and check a few rows.                   :
 *  :   |                                                       :
 *  :   |    Are there any non-black pixels                     :
 *  :   V 🔶 in sampled rows of letterbox?                      :
 *  :  < > ———— no ——————+                                      :
 *  :   |                |    Were we certain about aspect      :
 *  :  yes               V 🔶 ratio before checking for subs?   :
 *  :   |               < > ———— no ————> Do nothing            :
 *  :   |                |                       V              :
 *  :   |               yes ———> Apply or keep  -+-> 🛑 END     :
 *  :   |                        aspect ratio                   :
 *  :   |                                                       :
 *  :   +———————+    Were we confident enough about             :
 *  :           V 🔶 detected aspect ratio                      :
 *  :   no ——— < > ——— yes                                      :
 *  :   |               |                                       :
 *  :   |       Stop automatic aspect ratio detection           :
 *  :   V               V                                       :
 *  : Reset aspect ratio to original                            :
 *  :             |                                             :
 *  :             V                                             :
 *  :           🛑 END                                          :
 *  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
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
        this.settings.active.arDetect.sampling.staticCols,
        this.settings.active.arDetect.canvasDimensions.sampleCanvas.width
      ),
      bottom: generateSampleArray(
        this.settings.active.arDetect.sampling.staticCols,
        this.settings.active.arDetect.canvasDimensions.sampleCanvas.width
      ),
      left: generateSampleArray(
        this.settings.active.arDetect.sampling.staticCols,
        this.settings.active.arDetect.canvasDimensions.sampleCanvas.height
      ),
      right: generateSampleArray(
        this.settings.active.arDetect.sampling.staticCols,
        this.settings.active.arDetect.canvasDimensions.sampleCanvas.height
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
    ROW_SIZE = this.settings.active.arDetect.canvasDimensions.sampleCanvas.width * PIXEL_SIZE;

    if (canvasType) {
      if (canvasType === this.settings.active.arDetect.aardType || this.settings.active.arDetect.aardType === 'auto') {
        if (canvasType === 'webgl') {
          return new GlCanvas({...this.settings.active.arDetect.canvasDimensions.sampleCanvas, id: 'main-gl'});
        } else if (canvasType === 'legacy') {
          return new FallbackCanvas({...this.settings.active.arDetect.canvasDimensions.sampleCanvas, id: 'main-legacy'});
        } else {
          // TODO: throw error
        }
      } else {
        // TODO: throw error
      }

    }

    if (['auto', 'webgl'].includes(this.settings.active.arDetect.aardType)) {
      try {
        return new GlCanvas({...this.settings.active.arDetect.canvasDimensions.sampleCanvas, id: 'main-gl'});
      } catch (e) {
        if (this.settings.active.arDetect.aardType !== 'webgl') {
          return new FallbackCanvas({...this.settings.active.arDetect.canvasDimensions.sampleCanvas, id: 'main-legacy'});
        }
        this.logger.error('createCanvas', 'could not create webgl canvas:', e);
        this.eventBus.send('uw-config-broadcast', {type: 'aard-error', aardErrors: {webglError: true}});
        throw e;
      }
    } else if (this.settings.active.arDetect.aardType === 'legacy') {
      return new FallbackCanvas({...this.settings.active.arDetect.canvasDimensions.sampleCanvas, id: 'main-legacy'});
    } else {
      this.logger.error('createCanvas', 'invalid value in settings.arDetect.aardType:', this.settings.active.arDetect.aardType);
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
      this.canvasStore.debug = new GlDebugCanvas({...this.settings.active.arDetect.canvasDimensions.sampleCanvas, id: 'uw-debug-gl'});
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
    this.testResults = initAardTestResults(this.settings.active.arDetect);
    this.verticalTestResults = initAardTestResults(this.settings.active.arDetect);

    if (this.animationFrame) {
      window.cancelAnimationFrame(this.animationFrame);
    }

    this.status.aardActive = true;
    this.animationFrame = window.requestAnimationFrame( (ts: DOMHighResTimeStamp) => this.onAnimationFrame(ts));

    // set auto-disable timer if detection timeout is set
    if (this.settings.active.arDetect.autoDisable.ifNotChanged) {
      this.timers.autoDisableAt = Date.now() + this.settings.active.arDetect.autoDisable.ifNotChangedTimeout;
    }
  }

  /**
   * Runs autodetection ONCE.
   * If autodetection loop is running, this will also stop autodetection loop.
   */
  step(options?: {noCache?: boolean}) {
    this.stop();

    if (options?.noCache) {
      this.testResults = initAardTestResults(this.settings.active.arDetect);
      this.verticalTestResults = initAardTestResults(this.settings.active.arDetect);
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
    const polling = this.settings.active.arDetect.polling;
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

    this.timers.nextFrameCheckTime = now + this.settings.active.arDetect.timers.playing;
    this.timers.reducedPollingNextCheckTime = now + this.settings.active.arDetect.timers.playingReduced;
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
    const arConf =  this.settings.active.arDetect;

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

          try {
          this.letterboxOrientationScan(
            imageData,
            arConf.canvasDimensions.sampleCanvas.width,
            arConf.canvasDimensions.sampleCanvas.height
          );
          } catch (e) {
            console.warn('problems:', e);
          }
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


        // STEP 2:
        // Check if previously detected aspect ratio is still gucci. If it is, then
        // we can quit the loop without applying any aspect ratios (unless subtitle
        // detection is enabled, in which case we still run the subtitle test)
        // If we stopped autodetection because of manual aspect ratio input, then
        // checkLetterboxShrink and checkLetterboxGrow may return invalid results.
        // This is why we skip this check and force full recheck if forceFullRecheck
        // flag is set.
        if (this.forceFullRecheck) {
          this.testResults.imageLine.invalidated = true;
          this.testResults.guardLine.invalidated = true;
        } else {
          this.checkLetterboxShrink(
            imageData,
            arConf.canvasDimensions.sampleCanvas.width,
            arConf.canvasDimensions.sampleCanvas.height
          );

          // If guardline was invalidated, letterbox width and offset are unreliable.
          // If guardLine is fine but imageLine is invalidated, we still keep last letterbox settings
          if (this.testResults.guardLine.invalidated) {
            this.testResults.letterboxSize = 0;
            this.testResults.letterboxOffset = 0;
          } else {
            this.checkLetterboxGrow(
              imageData,
              arConf.canvasDimensions.sampleCanvas.width,
              arConf.canvasDimensions.sampleCanvas.height
            );
          }
        }
        this.timer.current.guardLine = performance.now() - this.timer.current.start;  // guardLine is for both guardLine and imageLine checks

        // Both need to be checked
        if (!this.testResults.imageLine.invalidated && !this.testResults.guardLine.invalidated) {
          // check for subtitles here
          if (this.testResults.letterboxOrientation === LetterboxOrientation.Letterbox) {
            this.subtitleScan(
              imageData,
              arConf.canvasDimensions.sampleCanvas.width,
            arConf.canvasDimensions.sampleCanvas.height,
            false
          );

          if (this.testResults.subtitleDetected && arConf.subtitles.subtitleCropMode === AardSubtitleCropMode.DisableScan) {
            // todo: reset
          } else {
              this.testResults.lastStage = 2;
              break scanFrame;
            }
          } else {
            this.testResults.lastStage = 2;
            break scanFrame;
          }
        }

        // STEP 3:
        // If we are here, we must do full aspect ratio detection.
        // After aspectRatioCheck is finished, we know how wide the letterbox is.
        this.aspectRatioCheck(
          imageData,
          arConf.canvasDimensions.sampleCanvas.width,
          arConf.canvasDimensions.sampleCanvas.height
        );

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

        if (this.testResults.subtitleDetected) {
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
        if (this.testResults.aspectRatioUncertain && this.testResults.guardLine.invalidated) {
          // console.info('aspect ratio not certain:', this.testResults.aspectRatioUncertainReason);
          // console.warn('check finished:', JSON.parse(JSON.stringify(this.testResults)), JSON.parse(JSON.stringify(this.canvasSamples)), '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n');

          // console.warn('ASPECT RATIO UNCERTAIN, GUARD LINE INVALIDATED (resetting)')
          this.timer.arChanged();
          this.updateAspectRatio(this.defaultAr, {uncertainDetection: true, forceReset: true});

          break processUpdate;
        }

        // TODO: emit debug values if debugging is enabled
        this.testResults.isFinished = true;

        // console.warn(
        //   `[${(+new Date() % 10000) / 100} | ${this.arid}]`,'check finished — aspect ratio updated:', this.testResults.aspectRatioUpdated,
        //   '\ndetected ar:', this.testResults.activeAspectRatio, '->', this.getAr(),
        //   '\nis video playing?', this.getVideoPlaybackState() === VideoPlaybackState.Playing,
        //   '\n\n', JSON.parse(JSON.stringify(this.testResults)), JSON.parse(JSON.stringify(this.canvasSamples)), '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n');

        // if edge width changed, emit update event.
        // except aspectRatioUpdated doesn't get set reliably, so we just call update every time, and update
        // if detected aspect ratio is different from the current aspect ratio
        // if (this.testResults.aspectRatioUpdated) {
        //   this.timer.arChanged();
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
        this.debugConfig?.debugUi?.updateTestResults(this.testResults);
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

    const xLimit = this.settings.active.arDetect.letterboxOrientationScan.letterboxLimit;
    const yLimit = this.settings.active.arDetect.letterboxOrientationScan.pillarboxLimit;

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
   * Checks if letterbox has shrunk. If letterbox has shrunk (image portion of the frame grows), we invalidate
   * guard line data. Note that this function only sets testResults.guardline.invalidated=true, but does not
   * override current guardline values.
   * NOTE: if guardLine is invalidated, the function will also helpfully invalidate imageLine results. This
   * will happen because invalid blackLine logically implies invalid imageLine.
   * @param imageData
   * @param width
   * @param height
   */
  private checkLetterboxShrink(imageData: Uint8Array, width: number, height: number) {
    // can't check guardline if guardline is not set up (correctly)
    if (
      this.testResults.guardLine.top < 0
      || this.testResults.guardLine.top > height
      || this.testResults.guardLine.bottom < 0
      || this.testResults.guardLine.bottom > height
    ) {
      // we also need to reset guardline if out-of-bounds was detected,
      // otherwise edgeScan might not work correctly
      this.testResults.guardLine.top = -1;
      this.testResults.guardLine.bottom = -1;
      this.testResults.guardLine.invalidated = true;
      return;
    }

    let edgePosition = this.settings.active.arDetect.sampling.edgePosition;
    const segmentPixels = width * edgePosition;
    const edgeSegmentSize = segmentPixels * PIXEL_SIZE;


    // check the top
    {
      // no use in doing guardline tests if guardline hasn't been measured yet, or if
      // guardline is not defined.
      const rowStart = this.testResults.guardLine.top * ROW_SIZE;
      const firstSegment = rowStart + edgeSegmentSize;
      const rowEnd = rowStart + ROW_SIZE - PIXEL_SIZE;
      const secondSegment = rowEnd - edgeSegmentSize;

      let i = rowStart;

      this.checkLetterboxShrinkCornerSegment(imageData, rowStart, firstSegment, Corner.TopLeft);
      if (this.checkLetterboxShrinkCenterSegment(imageData, firstSegment, secondSegment)) {
        return;  // guard line violation in center segment is insta-fail
      }
      this.checkLetterboxShrinkCornerSegment(imageData, secondSegment, rowEnd, Corner.TopRight);
    }
    // check bottom
    {
      const rowStart = this.testResults.guardLine.bottom * ROW_SIZE;
      const firstSegment = rowStart + edgeSegmentSize;
      const rowEnd = rowStart + ROW_SIZE - PIXEL_SIZE;
      const secondSegment = rowEnd - edgeSegmentSize;

      this.checkLetterboxShrinkCornerSegment(imageData, rowStart, firstSegment, Corner.BottomLeft);
      if (this.checkLetterboxShrinkCenterSegment(imageData, firstSegment, secondSegment)) {
        return;  // guard line violation in center segment is insta-fail
      }
      this.checkLetterboxShrinkCornerSegment(imageData, secondSegment, rowEnd, Corner.BottomRight);
    }
    // Check whether violations in corners are within limits

    const maxViolations = segmentPixels * 0.20; // TODO: move the 0.2 threshold into settings

    // we won't do a loop for this few elements
    // corners with stuff in them will also be skipped in image test
    this.testResults.guardLine.cornerViolated[0] = this.testResults.guardLine.cornerPixelsViolated[0] > maxViolations;
    this.testResults.guardLine.cornerViolated[1] = this.testResults.guardLine.cornerPixelsViolated[1] > maxViolations;
    this.testResults.guardLine.cornerViolated[2] = this.testResults.guardLine.cornerPixelsViolated[2] > maxViolations;
    this.testResults.guardLine.cornerViolated[3] = this.testResults.guardLine.cornerPixelsViolated[3] > maxViolations;

    const maxInvalidCorners = 0; // TODO: move this into settings — by default, we allow one corner to extend past the
                                 // guard line in order to prevent watermarks/logos from preventing cropping the video
                                 // .... _except_ this doesn't really work because https://youtu.be/-YJwPXipJbo?t=459

    // this works because +true converts to 1 and +false converts to 0
    const dirtyCount = +this.testResults.guardLine.cornerViolated[0]
      + +this.testResults.guardLine.cornerViolated[1]
      + +this.testResults.guardLine.cornerViolated[2]
      + +this.testResults.guardLine.cornerViolated[3];

    if (dirtyCount > maxInvalidCorners) {
      this.testResults.guardLine.invalidated = true;
      this.testResults.imageLine.invalidated = true;
    } else {
      this.testResults.guardLine.invalidated = false;
    }
  }

  private checkLetterboxShrinkCornerSegment(imageData: Uint8Array, start: number, end: number, corner: Corner) {
    let i = start;
    while (i < end) {
      if (
        imageData[i] > this.testResults.blackThreshold
        || imageData[i + 1] > this.testResults.blackThreshold
        || imageData[i + 2] > this.testResults.blackThreshold
      ) {
        imageData[i + 3] = GlDebugType.GuardLineCornerViolation;
        this.testResults.guardLine.cornerPixelsViolated[corner]++;
      } else {
        imageData[i + 3] = GlDebugType.GuardLineCornerOk;
      }
      i += PIXEL_SIZE;
    }
  }

  private checkLetterboxShrinkCenterSegment(imageData: Uint8Array, start: number, end: number): boolean {
    let i = start;
    while (i < end) {
      if (
        imageData[i] > this.testResults.blackThreshold
        || imageData[i + 1] > this.testResults.blackThreshold
        || imageData[i + 2] > this.testResults.blackThreshold
      ) {
        imageData[i + 3] = GlDebugType.GuardLineViolation;
        // DONT FORGET TO INVALIDATE GUARDL LINE
        this.testResults.guardLine.top = -1;
        this.testResults.guardLine.bottom = -1;
        this.testResults.guardLine.invalidated = true;
        return true;
      } else {
        imageData[i + 3] = GlDebugType.GuardLineOk;
      }
      i += PIXEL_SIZE;
    }

    return false;
  }

  /**
   * Checks if letterbox has grown. This test is super-efficient on frames that aren't dark,
   * but is also rather inefficient if the frame is overly dark. Note that this function merely
   * sets testResults.imageLine.invalidated to `true`. Correcting actual values is done during
   * aspect ratio detection.
   * TODO: maybe consider checking fewer pixels per line
   * @param imageData
   * @param width
   * @param height
   */
  private checkLetterboxGrow(imageData: Uint8Array, width: number, height: number) {
    if (
      this.testResults.imageLine.top < 0
      || this.testResults.imageLine.top > height
      || this.testResults.imageLine.bottom < 0
      || this.testResults.imageLine.bottom > height
    ) {
      this.testResults.imageLine.invalidated = true;
      return;
    }

    const IMAGE_CONFIRMED = -1;

    let edgePosition = this.settings.active.arDetect.sampling.edgePosition;
    const segmentPixels = width * edgePosition;
    const edgeSegmentSize = segmentPixels * PIXEL_SIZE;

    const detectionThreshold = width * 0.1; // TODO: unhardcoide and put into settings. Is % of total width.

    let topInvalidated = false, bottomInvalidated = false;

    // check the top
    topCheck:
    {
      const rowStart = this.testResults.imageLine.top * ROW_SIZE;
      const firstSegment = rowStart + edgeSegmentSize;
      const rowEnd = rowStart + ROW_SIZE - PIXEL_SIZE;
      const secondSegment = rowEnd - edgeSegmentSize;

      let pixelCount = 0;

      // we don't run image detection in corners that may contain logos, as such corners
      // may not be representative
      if (! this.testResults.guardLine.cornerViolated[Corner.TopLeft]) {
        pixelCount = this.checkLetterboxGrowSegment(imageData, rowStart, firstSegment, pixelCount, detectionThreshold);
        if (pixelCount === IMAGE_CONFIRMED) {
          break topCheck;
        }
      }
      pixelCount = this.checkLetterboxGrowSegment(imageData, firstSegment, secondSegment, pixelCount, detectionThreshold);
      if (pixelCount === IMAGE_CONFIRMED) {
        break topCheck;
      }
      if (! this.testResults.guardLine.cornerViolated[Corner.TopRight]) {
        pixelCount = this.checkLetterboxGrowSegment(imageData, secondSegment, rowEnd, pixelCount, detectionThreshold);
        if (pixelCount === IMAGE_CONFIRMED) {
          break topCheck;
        }
      }

      topInvalidated = true;
    }

    // check the bottom
    bottomCheck:
    {
      const rowStart = this.testResults.imageLine.bottom * ROW_SIZE;
      const firstSegment = rowStart + edgeSegmentSize;
      const rowEnd = rowStart + ROW_SIZE - PIXEL_SIZE;
      const secondSegment = rowEnd - edgeSegmentSize;

      let pixelCount = 0;

      // we don't run image detection in corners that may contain logos, as such corners
      // may not be representative
      if (! this.testResults.guardLine.cornerViolated[Corner.BottomLeft]) {
        pixelCount = this.checkLetterboxGrowSegment(imageData, rowStart, firstSegment, pixelCount, detectionThreshold);
        if (pixelCount === IMAGE_CONFIRMED) {
          break bottomCheck;
        }
      }
      pixelCount = this.checkLetterboxGrowSegment(imageData, firstSegment, secondSegment, pixelCount, detectionThreshold);
      if (pixelCount === IMAGE_CONFIRMED) {
        break bottomCheck;
      }
      if (! this.testResults.guardLine.cornerViolated[Corner.BottomRight]) {
        pixelCount = this.checkLetterboxGrowSegment(imageData, secondSegment, rowEnd, pixelCount, detectionThreshold);
        if (pixelCount === IMAGE_CONFIRMED) {
          break bottomCheck;
        }
      }

      bottomInvalidated = true;
    }

    // We invalidate imageLine if any of the two fails to validate
    if (bottomInvalidated || topInvalidated) {
      this.testResults.imageLine.invalidated = true;
    }
  }

  /**
   * Checks row for presence of image. If image is detected, returns -1. Otherwise, returns the amount
   * of non-black pixels.
   * @param imageData
   * @param start
   * @param end
   * @param pixelCount
   * @param imageDetectionThreshold
   * @returns
   */
  private checkLetterboxGrowSegment(imageData: Uint8Array, start: number, end: number, pixelCount: number, imageDetectionThreshold: number) {
    let i = start, imagePixel;

    while (i < end) {
      imagePixel = false;
      imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
      imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
      imagePixel ||= imageData[i++] > this.testResults.blackThreshold;

      if (imagePixel && ++pixelCount > imageDetectionThreshold) {
        imageData[i] = GlDebugType.ImageLineThresholdReached;
        return -1;
      } else {
        imageData[i] = imagePixel ?  GlDebugType.ImageLineOk : GlDebugType.ImageLineFail;
      }
      i++; // skip over alpha channel
    }

    return pixelCount;
  }

  /**
   * Tries to detect aspect ratio.
   *
   *                           ———< FAQ >———
   *                      Why not binary search?
   *
   *    - Binary search is prone to false detections in certain
   *    scenarios where multiple horizontal dark and bright areas
   *    are present in the frame, e.g. window blinds
   *
   *
   *    P.S.:
   *    Future Tam, don't fucking think about that. I did the homework,
   *    you aren't getting paid enough to find a way to make binary
   *    search work. Go and work on a neat mini or an ambitious cosplay,
   *    Chrome Web Store absolutely does not deserve this level of effort,
   *    If you wanna chase imaginary internet approval points, then cosplay
   *    and minis ripped from GW2 and Styx require much less sanity and
   *    provide much more imaginary reddit points.
   *
   *    Also maybe finish that story you're writing since 2009 if you
   *    haven't already. Or learn Godot.
   */
  private aspectRatioCheck(imageData: Uint8Array, width: number, height: number) {

    // this costs us tiny bit of overhead, but it makes code slightly more
    // manageable. We'll be making this tradeoff here, mostly due to the
    // fact that it makes the 'if' statement governing gradient detection
    // bit more nicely visible (instead of hidden among spagheti)
    this.edgeScan(imageData, width, height);
    this.validateEdgeScan(imageData, width, height);
    this.timer.current.edgeScan = performance.now() - this.timer.current.start;

    // We only do gradient detection on letterbox checks for now
    this.sampleForGradient(imageData, width, height);
    this.timer.current.gradient = performance.now() - this.timer.current.start;

    // processScanResults does not care about axis
    if (this.testResults.letterboxOrientation === LetterboxOrientation.Pillarbox) {
      this.canvasSamples.start = this.canvasSamples.left;
      this.canvasSamples.end = this.canvasSamples.right;
    } else {
      this.canvasSamples.start = this.canvasSamples.top;
      this.canvasSamples.end = this.canvasSamples.bottom;
    }

    this.processScanResults(imageData, width, height);
    this.timer.current.scanResults = performance.now() - this.timer.current.start;
  }



  edgeScan(imageData: Uint8Array, width: number, height: number) {
    if (this.testResults.lastValidLetterboxOrientation === LetterboxOrientation.Letterbox) {
      this.scanLetterboxEdge(imageData, width, height);
    } else {
      this.scanPillarboxEdge(imageData, width, height);
    }

  }

  /**
   * Detects positions where frame stops being black and begins to contain image.
   * @param imageData
   * @param width
   * @param height
   */
  private scanLetterboxEdge(imageData: Uint8Array, width: number, height: number) {
    const detectionLimit = this.settings.active.arDetect.edgeDetection.thresholds.edgeDetectionLimit;

    let mid = ~~(height / 2);

    let topStart = 0;
    let topEnd = mid;
    let bottomStart = height;
    let bottomEnd = mid;

    let rowOffset = 0;

    /**
     *  We can use invalidated blackbar and imagebar data to make some inferences
     *  about where to find our letterbox. This test is all the data we need to check
     *  if valid guardLine has ever been set, since guardLine and imageLine are set
     *  in tandem (either both exist, or neither does (-1)).
     *
     *  But maybe we _can't really_, because https://youtu.be/-YJwPXipJbo?t=460 is having problems detecting change
     */
    // if (this.testResults.guardLine.top > 0) {
    //   // if guardLine is invalidated, then the new edge of image frame must be
    //   // above former guardline. Otherwise, it's below it.
    //   if (this.testResults.guardLine.invalidated) {
    //     topEnd = this.testResults.guardLine.top;
    //     bottomEnd = this.testResults.guardLine.bottom;
    //   } else {
    //     topStart = this.testResults.imageLine.top;
    //     bottomStart = this.testResults.imageLine.bottom;
    //   }
    // }

    let row: number, i: number, x: number, isImage: boolean, finishedRows: number;

    // Detect upper edge
    {
      row = Math.max(topStart, 0);
      x = 0;
      isImage = false;
      finishedRows = 0;

      while (row < topEnd) {
        i = 0;
        rowOffset = row * ROW_SIZE;

        // test the entire row
        while (i < this.canvasSamples.top.length) {
          // read x offset for the row we're testing, after this `i` points to the
          // result location
          x = this.canvasSamples.top[i++];

          // check for image, after we're done `x` points to alpha channel
          isImage =
            imageData[rowOffset + x] > this.testResults.blackThreshold
            || imageData[rowOffset + x + 1] > this.testResults.blackThreshold
            || imageData[rowOffset + x + 2] > this.testResults.blackThreshold;

          if (!isImage) {
            imageData[rowOffset + x + 3] = GlDebugType.EdgeScanProbe;
            // TODO: maybe some day mark this pixel as checked by writing to alpha channel
            i++;
            continue;
          }
          if (this.canvasSamples.top[i] === -1) {
            // console.log('is image:', imageData[rowOffset + x], imageData[rowOffset + x + 1], imageData[rowOffset + x + 2], x);
            imageData[rowOffset + x + 3] = GlDebugType.EdgeScanHit;
            this.canvasSamples.top[i] = row;
            finishedRows++;
          }
          i++;
        }

        // quit test early if we can
        if (finishedRows >= detectionLimit) {
          break;
        }

        row++;
      }
    }

    // Detect lower edge
    // NOTE: this part of the frame is checked less efficiently, because testResults
    // array is not oriented in optimal way. It could be fixed but refer to the `P.S.`
    // section of this function's description.
    {
      row = bottomStart;
      i = 0;
      x = 0;
      isImage = false;
      finishedRows = 0;

      while (row --> bottomEnd) {
        i = 0;
        rowOffset = row * ROW_SIZE;

        // test the entire row
        while (i < this.canvasSamples.bottom.length) {
          // read x offset for the row we're testing, after this `i` points to the
          // result location
          x = this.canvasSamples.bottom[i++];

          // check for image, after we're done `x` points to alpha channel
          isImage =
            imageData[rowOffset + x] > this.testResults.blackThreshold
            || imageData[rowOffset + x + 1] > this.testResults.blackThreshold
            || imageData[rowOffset + x + 2] > this.testResults.blackThreshold;

          if (!isImage) {
            imageData[rowOffset + x + 3] = GlDebugType.EdgeScanProbe;
            // console.log('(row:', row, ')', 'val:', imageData[rowOffset + x], 'col', x >> 2, x, 'pxoffset:', rowOffset + x, 'len:', imageData.length)
            // TODO: maybe some day mark this pixel as checked by writing to alpha channel
            i++;
            continue;
          }
          if (this.canvasSamples.bottom[i] === -1) {
            imageData[rowOffset + x + 3] = GlDebugType.EdgeScanHit;
            this.canvasSamples.bottom[i] = row;
            finishedRows++;
          }
          i++;
        }

        // quit test early if we can
        if (finishedRows >= detectionLimit) {
          break;
        }
      }
    }
  }

  /**
   * Detects positions where frame stops being black and begins to contain image, but for pillarbox.
   * When it comes to pillarbox scan, detections don't happen naturally in order from "closest to the edge"
   * to "furthest from the edge", which means pillarbox edge scan can't exit early like letterbox edge scan.
   * @param imageData
   * @param width
   * @param height
   */
  private scanPillarboxEdge(imageData: Uint8Array, width: number, height: number) {
    let mid = ROW_SIZE * 0.5;

    let row, start, end, i, isImage;

    // Detect left edge
    leftEdge:
    {
      i = 0;
      while (i < this.canvasSamples.left.length) {
        row = this.canvasSamples.left[i++];

        start = row * ROW_SIZE;
        end = start + mid;

        rowScan:
        while (start < end) {
          isImage = imageData[start  ] > this.testResults.blackThreshold
                 || imageData[start+1] > this.testResults.blackThreshold
                 || imageData[start+2] > this.testResults.blackThreshold;

          if (isImage) {
            imageData[start+3] = GlDebugType.EdgeScanHit;
            this.canvasSamples.left[i] = (start % ROW_SIZE) * PIXEL_SIZE_FRACTION;
            break rowScan;
          } else {
            imageData[start+3] = GlDebugType.EdgeScanProbe;
          }

          start += PIXEL_SIZE;
        }

        i++;
      }
    }

    // Detect right edge
    rightEdge:
    {
      i = 0;
      while (i < this.canvasSamples.right.length) {
        row = this.canvasSamples.right[i++];

        end = row * ROW_SIZE + mid;
        start = end + mid - PIXEL_SIZE;

        rowScan:
        while (start > end) {
          isImage = imageData[start  ] > this.testResults.blackThreshold
                 || imageData[start+1] > this.testResults.blackThreshold
                 || imageData[start+2] > this.testResults.blackThreshold;

          if (isImage) {
            imageData[start+3] = GlDebugType.EdgeScanHit;
            this.canvasSamples.right[i] = (start % ROW_SIZE) * PIXEL_SIZE_FRACTION;
            break rowScan;
          } else {
            imageData[start+3] = GlDebugType.EdgeScanProbe;
          }

          start -= PIXEL_SIZE;
        }

        i++;
      }
    }
  }

  /**
   * Validates edge scan results.
   *
   * We check _n_ pixels to the left and to the right of detection, one row above
   * the detection (or under, when checking the bottom letterbox). If there's anything
   * non-black in this area, we invalidate the detection by setting the relevant
   * `canvasSample` to -1.
   *
   * For bottom rows, this function also converts row to the offset from the bottom.
   *
   * Note that this function returns nothing — instead it modifies properties of this
   * class. We do this in order to reduce garbage generation. This code runs often,
   * therefore we prefer reusing variables to generating new ones whenever reasonably
   * possible (though not always).
   *
   * @param imageData
   * @param width
   * @param height
   */
  private validateEdgeScan(imageData: Uint8Array, width: number, height: number) {
    if (this.testResults.lastValidLetterboxOrientation === LetterboxOrientation.Letterbox) {
      this.validateLetterboxEdgeScan(imageData, width, height);
    } else {
      this.validatePillarboxEdgeScan(imageData, width, height);
    }
  }

  private validateLetterboxEdgeScan(imageData: Uint8Array, width: number, height: number) {
    let i = 0;
    let xs: number, xe: number, row: number;
    const slopeTestSample = this.settings.active.arDetect.edgeDetection.slopeTestWidth * PIXEL_SIZE;

    while (i < this.canvasSamples.top.length) {
      // if (this.canvasSamples.top[i] < 0) {
      //   continue;
      // }
      // calculate row offset:
      row = (this.canvasSamples.top[i + 1] - 1) * ROW_SIZE;
      xs = row + this.canvasSamples.top[i] - slopeTestSample;
      xe = row + this.canvasSamples.top[i] + slopeTestSample;

      while (xs < xe) {
        if (
          imageData[xs] > this.testResults.blackThreshold
          || imageData[xs + 1] > this.testResults.blackThreshold
          || imageData[xs + 2] > this.testResults.blackThreshold
        ) {
          imageData[xs + 3] = GlDebugType.SlopeTestDarkViolation;
          this.canvasSamples.top[i + 1] = -1;
          break;
        } else {
          imageData[xs + 3] = GlDebugType.SlopeTestDarkOk;
        }
        xs += PIXEL_SIZE;
      }
      i += 2;
    }

    i = 0;
    let i1 = 0;
    while (i < this.canvasSamples.bottom.length) {
      // if (this.canvasSamples.bottom[i] < 0) {
      //   continue;
      // }

      // calculate row offset:
      i1 = i + 1;
      row = (this.canvasSamples.bottom[i1] + 1) * ROW_SIZE;
      xs = row + this.canvasSamples.bottom[i] - slopeTestSample;
      xe = row + this.canvasSamples.bottom[i] + slopeTestSample;

      while (xs < xe) {
        if (
          imageData[xs] > this.testResults.blackThreshold
          || imageData[xs + 1] > this.testResults.blackThreshold
          || imageData[xs + 2] > this.testResults.blackThreshold
        ) {
          imageData[xs + 3] = GlDebugType.SlopeTestDarkViolation;
          this.canvasSamples.bottom[i1] = -1;
          i += 2;
          break;
        }
        imageData[xs + 3] = GlDebugType.SlopeTestDarkOk;
        xs += PIXEL_SIZE;
      }

      if (this.canvasSamples.bottom[i1]) {
        this.canvasSamples.bottom[i1] = this.canvasSamples.bottom[i1];
      }

      i += 2;
    }
  }

  private validatePillarboxEdgeScan(imageData: Uint8Array, width: number, height: number) {
    let i, ci;
    let xs: number, xe: number, row: number;
    const slopeTestSample = this.settings.active.arDetect.edgeDetection.slopeTestWidth * ROW_SIZE;
    const lastRowStart = ROW_SIZE * (height - 1);

    i = 0;
    while (i < this.canvasSamples.top.length) {
      ci = i + 1;

      row = this.canvasSamples.left[i] * ROW_SIZE;
      xs = Math.max(row + this.canvasSamples.left[ci] -1 - slopeTestSample, this.canvasSamples.left[ci] - 1);
      xe = Math.min(row + this.canvasSamples.left[ci] -1 + slopeTestSample, lastRowStart + this.canvasSamples.left[ci] - 1);

      while (xs < xe) {
        if (
          imageData[xs] > this.testResults.blackThreshold
          || imageData[xs + 1] > this.testResults.blackThreshold
          || imageData[xs + 2] > this.testResults.blackThreshold
        ) {
          imageData[xs + 3] = GlDebugType.SlopeTestDarkViolation;
          this.canvasSamples.left[ci] = -1;
          break;
        } else {
          imageData[xs + 3] = GlDebugType.SlopeTestDarkOk;
        }
        xs += ROW_SIZE;
      }
      i += 2;
    }

    i = 0;
    while (i < this.canvasSamples.bottom.length) {
      ci = i + 1;

      row = this.canvasSamples.left[i] * ROW_SIZE;
      xs = Math.max(row + this.canvasSamples.right[ci] + 1 - slopeTestSample, this.canvasSamples.right[ci] + 1);
      xe = Math.min(row + this.canvasSamples.right[ci] + 1 + slopeTestSample, lastRowStart + this.canvasSamples.right[ci] + 1);

      while (xs < xe) {
        if (
          imageData[xs] > this.testResults.blackThreshold
          || imageData[xs + 1] > this.testResults.blackThreshold
          || imageData[xs + 2] > this.testResults.blackThreshold
        ) {
          imageData[xs + 3] = GlDebugType.SlopeTestDarkViolation;
          this.canvasSamples.right[ci] = -1;
          break;
        } else {
          imageData[xs + 3] = GlDebugType.SlopeTestDarkOk;
        }
        xs += ROW_SIZE;
      }
      i += 2;
    }
  }

  /**
   * Tries to detect whether our detection is detecting a hard edge, or a gradient.
   * Gradients shouldn't count as detection.
   * @param imageData
   * @param width
   * @param height
   */
  private sampleForGradient(imageData: Uint8Array, width: number, height: number) {
    let j = 0, maxSubpixel = 0, lastSubpixel = 0, firstSubpixel = 0, pixelOffset = 0;
    const sampleLimit = this.settings.active.arDetect.edgeDetection.gradientTestSamples;
    const blackThreshold = this.testResults.blackLevel + this.settings.active.arDetect.edgeDetection.gradientTestBlackThreshold;

    upperEdgeCheck:
    for (let i = 1; i < this.canvasSamples.top.length; i += 2) {
      if (this.canvasSamples.top[i] < 0) {
        continue;
      }

      pixelOffset = this.canvasSamples.top[i] * PIXEL_SIZE + this.canvasSamples.top[i - 1] * PIXEL_SIZE;

      lastSubpixel = imageData[pixelOffset] > imageData[pixelOffset + 1] ? imageData[pixelOffset] : imageData[pixelOffset + 1];
      lastSubpixel = lastSubpixel > imageData[pixelOffset + 1] ? lastSubpixel : imageData[pixelOffset];
      firstSubpixel = lastSubpixel; // save it

      j = 1;
      while (j < sampleLimit) {
        maxSubpixel = imageData[pixelOffset] > imageData[pixelOffset + 1] ? imageData[pixelOffset] : imageData[pixelOffset + 1];
        maxSubpixel = maxSubpixel > imageData[pixelOffset + 2] ? maxSubpixel : imageData[pixelOffset + 2];

        /**
         * Some assumptions.
         *
         *   * If max subpixel is above max threshold, we probs aren't in a gradient (as it would imply
         *     too sudden of a change in pixel brightness)
         *   * if we are looking at a gradient, then we expect every pixel to be brighter than the
         *     previous one. If it isn't, then we probably aren't in a gradient.
         *   * if delta is too big, we probably aren't looking at a gradient, either
         */
        if (
          maxSubpixel > blackThreshold
          || maxSubpixel < lastSubpixel
          || maxSubpixel - lastSubpixel > this.settings.active.arDetect.edgeDetection.gradientTestDeltaThreshold
        ) {
          continue upperEdgeCheck;
        }

        lastSubpixel = maxSubpixel;
        pixelOffset -= ROW_SIZE;
        j++;
      }
      // if we came this far, we're probably looking at a gradient — unless the last pixel of our sample
      // didn't change meaningfully from the first, in which chance we aren't. If the brightness increased
      // anywhere between 'not enough' and 'too much', we mark the measurement as invalid.
      if (lastSubpixel - firstSubpixel > this.settings.active.arDetect.edgeDetection.gradientTestMinDelta) {
        this.canvasSamples.top[i] = -1;
      }
    }

    lowerEdgeCheck:
    for (let i = 1; i < this.canvasSamples.bottom.length; i += 2) {
      if (this.canvasSamples.bottom[i] < 0) {
        continue;
      }
      pixelOffset = (height - this.canvasSamples.bottom[i]) * ROW_SIZE + this.canvasSamples.bottom[i - 1] * PIXEL_SIZE;

      lastSubpixel = imageData[pixelOffset] > imageData[pixelOffset + 1] ? imageData[pixelOffset] : imageData[pixelOffset + 1];
      lastSubpixel = lastSubpixel > imageData[pixelOffset + 1] ? lastSubpixel : imageData[pixelOffset];
      firstSubpixel = lastSubpixel; // save it

      j = 1;
      while (j < sampleLimit) {
        maxSubpixel = imageData[pixelOffset] > imageData[pixelOffset + 1] ? imageData[pixelOffset] : imageData[pixelOffset + 1];
        maxSubpixel = maxSubpixel > imageData[pixelOffset + 2] ? maxSubpixel : imageData[pixelOffset + 2];

        /**
         * Some assumptions.
         *
         *   * If max subpixel is above max threshold, we probs aren't in a gradient (as it would imply
         *     too sudden of a change in pixel brightness)
         *   * if we are looking at a gradient, then we expect every pixel to be brighter than the
         *     previous one. If it isn't, then we probably aren't in a gradient.
         *   * if delta is too big, we probably aren't looking at a gradient, either
         */
        if (
          maxSubpixel > blackThreshold
          || maxSubpixel < lastSubpixel
          || maxSubpixel - lastSubpixel > this.settings.active.arDetect.edgeDetection.gradientTestDeltaThreshold
        ) {
          continue lowerEdgeCheck;
        }

        lastSubpixel = maxSubpixel;
        pixelOffset -= ROW_SIZE;
        j++;
      }
      // if we came this far, we're probably looking at a gradient — unless the last pixel of our sample
      // didn't change meaningfully from the first, in which chance we aren't. If the brightness increased
      // anywhere between 'not enough' and 'too much', we mark the measurement as invalid.
      if (lastSubpixel - firstSubpixel > this.settings.active.arDetect.edgeDetection.gradientTestMinDelta) {
        this.canvasSamples.bottom[i] = -1;
      }
    }
  }

  /**
   * Processes data gathered by edgeScan, validateEdgeScan, and sampleForGradient.
   * It takes samples and determines how wide the letterbox actually is.
   * @param imageData
   * @param width
   * @param height
   * @returns
   */
  private processScanResults(imageData: Uint8Array, width: number, height: number) {
    /**
     * Few things to note —
     * our canvasSamples are positioned like this:
     *
     * |---0---1---2---3---|
     * 0                   19
     *
     * We need to figure out how many positions lie before and
     * after our cutoff mark (25% and 75% of width, respectively):
     *
     * |---0:--1---2--:3---|
     * |    :         :    |
     * 0    5         15   19
     *
     * In order to accurately determine whether column belongs
     * to edge region or not, we need to invent two extra imaginary
     * sampling position, in order to keep sampling position 0 at
     * 20% of the width.
     *
     * (NOTE: it was too late for me to actually think about whether this
     * holds any water, but it prolly doesn't matter too much anyway)
     */
    const fullFence = this.settings.active.arDetect.sampling.staticCols + 1;
    const edgePosition = this.settings.active.arDetect.sampling.edgePosition;

    // remember: array has two places per sample position — hence x2 on the results
    const leftEdgeBoundary = ~~(fullFence * edgePosition) * 2;
    const rightEdgeBoundary = (this.settings.active.arDetect.sampling.staticCols - leftEdgeBoundary) * 2;
    const edgeTolerance = this.settings.active.arDetect.edgeDetection.edgeMismatchTolerancePx;


    let i: number;
    // Process top edge:
    i = 1;
    {
      // We'll just unroll this loop, too much overhead for 3 items
      this.testResults.aspectRatioCheck.topRows[0] = Infinity;
      this.testResults.aspectRatioCheck.topRows[1] = Infinity;
      this.testResults.aspectRatioCheck.topRows[2] = Infinity;
      this.testResults.aspectRatioCheck.topQuality[0] = 0;
      this.testResults.aspectRatioCheck.topQuality[1] = 0;
      this.testResults.aspectRatioCheck.topQuality[2] = 0;

      while (i < leftEdgeBoundary) {
        if (this.canvasSamples.start[i] > -1) {
          if (this.canvasSamples.start[i] < this.testResults.aspectRatioCheck.topRows[0]) {
            this.testResults.aspectRatioCheck.topRows[0] = this.canvasSamples.start[i];
            this.testResults.aspectRatioCheck.topQuality[0] = 0;
          } else if (this.canvasSamples.start[i] === this.testResults.aspectRatioCheck.topRows[0]) {
            this.testResults.aspectRatioCheck.topQuality[0]++;
          }
        }
        i += 2;
      }

      while (i < rightEdgeBoundary) {
        if (this.canvasSamples.start[i] > -1) {
          if (this.canvasSamples.start[i] < this.testResults.aspectRatioCheck.topRows[1]) {
            this.testResults.aspectRatioCheck.topRows[1] = this.canvasSamples.start[i];
            this.testResults.aspectRatioCheck.topQuality[1] = 0;
          } else if (this.canvasSamples.start[i] === this.testResults.aspectRatioCheck.topRows[1]) {
            this.testResults.aspectRatioCheck.topQuality[1]++;
          }
        }
        i += 2;
      }

      while (i < this.canvasSamples.start.length) {
        if (this.canvasSamples.start[i] > -1) {
          if (this.canvasSamples.start[i] < this.testResults.aspectRatioCheck.topRows[2]) {
            this.testResults.aspectRatioCheck.topRows[2] = this.canvasSamples.start[i];
            this.testResults.aspectRatioCheck.topQuality[2] = 0;
          } else if (this.canvasSamples.start[i] === this.testResults.aspectRatioCheck.topRows[2]) {
            this.testResults.aspectRatioCheck.topQuality[2]++;
          }
        }
        i += 2;
      }

      // remove any stray infinities
      if (this.testResults.aspectRatioCheck.topRows[0] === Infinity) {
        this.testResults.aspectRatioCheck.topRows[0] = 0;
      }
      if (this.testResults.aspectRatioCheck.topRows[1] === Infinity) {
        this.testResults.aspectRatioCheck.topRows[1] = 0;
      }
      if (this.testResults.aspectRatioCheck.topRows[2] === Infinity) {
        this.testResults.aspectRatioCheck.topRows[2] = 0;
      }
    }

    // Process bottom edge
    i = 1;
    {
      // We'll just unroll this loop, too much overhead for 3 items
      this.testResults.aspectRatioCheck.bottomRows[0] = Infinity;
      this.testResults.aspectRatioCheck.bottomRows[1] = Infinity;
      this.testResults.aspectRatioCheck.bottomRows[2] = Infinity;
      this.testResults.aspectRatioCheck.bottomQuality[0] = 0;
      this.testResults.aspectRatioCheck.bottomQuality[1] = 0;
      this.testResults.aspectRatioCheck.bottomQuality[2] = 0;

      while (i < leftEdgeBoundary) {
        if (this.canvasSamples.end[i] > -1) {
          if (this.canvasSamples.end[i] < this.testResults.aspectRatioCheck.bottomRows[0]) {
            this.testResults.aspectRatioCheck.bottomRows[0] = this.canvasSamples.end[i];
            this.testResults.aspectRatioCheck.bottomQuality[0] = 0;
          } else if (this.canvasSamples.end[i] === this.testResults.aspectRatioCheck.bottomRows[0]) {
            this.testResults.aspectRatioCheck.bottomQuality[0]++;
          }
        }
        i += 2;
      }

      while (i < rightEdgeBoundary) {
        if (this.canvasSamples.end[i] > -1) {
          if (this.canvasSamples.end[i] < this.testResults.aspectRatioCheck.bottomRows[1]) {
            this.testResults.aspectRatioCheck.bottomRows[1] = this.canvasSamples.end[i];
            this.testResults.aspectRatioCheck.bottomQuality[1] = 0;
          } else if (this.canvasSamples.end[i] === this.testResults.aspectRatioCheck.bottomRows[1]) {
            this.testResults.aspectRatioCheck.bottomQuality[1]++;
          }
        }
        i += 2;
      }

      while (i < this.canvasSamples.end.length) {
        if (this.canvasSamples.end[i] > -1) {
          if (this.canvasSamples.end[i] < this.testResults.aspectRatioCheck.bottomRows[2]) {
            this.testResults.aspectRatioCheck.bottomRows[2] = this.canvasSamples.end[i];
            this.testResults.aspectRatioCheck.bottomQuality[2] = 0;
          } else if (this.canvasSamples.end[i] === this.testResults.aspectRatioCheck.bottomRows[2]) {
            this.testResults.aspectRatioCheck.bottomQuality[2]++;
          }
        }
        i += 2;
      }
    }

    /**
     * Determining our best edge candidate should, in theory, go
     * something like this:
     *
     *  [ start ]
     *      |
     *     < > Are detections from all three sections on the same row
     *    /   \
     *  yes    no ————> further testing needed
     *   V                    |
     *  valid candidate       |
     *                       < > Are corner sections different?
     *                       / \
     *                     yes  no —————+
     *                      |           |   is center section closer
     * does any section     |          < >  to the edge of the frame?
     * match with center?  < >         / \
     *                     / \       no    yes ——> center gets authority
     *                   yes  no     V
     *                  /     |      Center result is probably bad, regardless
     * Is center above |      |      of score. No logo + edge gets authority.
     * the mismatched  |      |
     *       section? < >     Topmost (closest-to-frame-edge) option wins,
     *               /   \    but detection quality is shit.
     *             yes    no
     *              V       \
     *       Not a logo.   Center authority,
     *              V
     * Center authority.
     *
     *
     * ... however ...
     * In practice: if there's too much mismatch, we just label detection
     * as inconclusive and do nothing. Not paid enough to figure out the
     * worst 5% of cases.
     */

    // TOP:

    // DifferenceMatrix:
    //      0   - center <> left
    //      1   - center <> right
    //      2   - left <> right
    this.testResults.aspectRatioCheck.topRowsDifferenceMatrix[0] = Math.abs(this.testResults.aspectRatioCheck.topRows[1] - this.testResults.aspectRatioCheck.topRows[0]);
    this.testResults.aspectRatioCheck.topRowsDifferenceMatrix[1] = Math.abs(this.testResults.aspectRatioCheck.topRows[1] - this.testResults.aspectRatioCheck.topRows[2]);
    this.testResults.aspectRatioCheck.topRowsDifferenceMatrix[2] = Math.abs(this.testResults.aspectRatioCheck.topRows[0] - this.testResults.aspectRatioCheck.topRows[2]);
    this.testResults.aspectRatioCheck.bottomRowsDifferenceMatrix[0] = Math.abs(this.testResults.aspectRatioCheck.bottomRows[0] - this.testResults.aspectRatioCheck.bottomRows[1]);
    this.testResults.aspectRatioCheck.bottomRowsDifferenceMatrix[1] = Math.abs(this.testResults.aspectRatioCheck.bottomRows[1] - this.testResults.aspectRatioCheck.bottomRows[2]);
    this.testResults.aspectRatioCheck.bottomRowsDifferenceMatrix[2] = Math.abs(this.testResults.aspectRatioCheck.bottomRows[0] - this.testResults.aspectRatioCheck.bottomRows[2]);

    // We need to write if-statements in order of importance.
    if (                                                                                              // BEST: center matches both corners
      this.testResults.aspectRatioCheck.topRowsDifferenceMatrix[0] <= edgeTolerance
      && this.testResults.aspectRatioCheck.topRowsDifferenceMatrix[1] <= edgeTolerance
    ) {
      this.testResults.aspectRatioCheck.topCandidate = this.testResults.aspectRatioCheck.topRows[0];
      this.testResults.aspectRatioCheck.topCandidateQuality =
        this.testResults.aspectRatioCheck.topQuality[0]
        + this.testResults.aspectRatioCheck.topQuality[1]
        + this.testResults.aspectRatioCheck.topQuality[2];
    } else if (                                                                                       // Second best: center matches one of the corners
      this.testResults.aspectRatioCheck.topRowsDifferenceMatrix[0] <= edgeTolerance
      || this.testResults.aspectRatioCheck.topRowsDifferenceMatrix[1] <= edgeTolerance
    ) {
      this.testResults.aspectRatioCheck.topCandidate = this.testResults.aspectRatioCheck.topRows[1];
        this.testResults.aspectRatioCheck.topCandidateQuality = this.testResults.aspectRatioCheck.topQuality[1];

        if (this.testResults.aspectRatioCheck.topRows[0] === this.testResults.aspectRatioCheck.topRows[1]) {
          this.testResults.aspectRatioCheck.topCandidateQuality += this.testResults.aspectRatioCheck.topQuality[0];
        } else {
          this.testResults.aspectRatioCheck.topCandidateQuality += this.testResults.aspectRatioCheck.topQuality[2];
        }
    } else if (this.testResults.aspectRatioCheck.topRowsDifferenceMatrix[2] <= edgeTolerance) {       // Third best: corners match, but are different from center
      if (this.testResults.aspectRatioCheck.topRows[0] < this.testResults.aspectRatioCheck.topRows[1]) {
        // Corners are above center -> corner authority
        this.testResults.aspectRatioCheck.topCandidate = this.testResults.aspectRatioCheck.topRows[0];
        this.testResults.aspectRatioCheck.topCandidateQuality =
          this.testResults.aspectRatioCheck.topQuality[0]
          + this.testResults.aspectRatioCheck.topQuality[2]
      } else {
        // Corners are below center - center authority
        this.testResults.aspectRatioCheck.topCandidate = this.testResults.aspectRatioCheck.topRows[1];
        this.testResults.aspectRatioCheck.topCandidateQuality = this.testResults.aspectRatioCheck.topQuality[1]
      }
    } else {                                                                                          // Worst: no matches, kinda like my tinder
        this.testResults.topRowUncertain = true;
        // we can second-wind this, so no returns yet.
    }

    // BOTTOM
    // Note that bottomRows candidates are measured from the top
    // Well have to invert our candidate after we're done
    if (                                                                                                 // BEST: center matches both corners
      this.testResults.aspectRatioCheck.bottomRowsDifferenceMatrix[0] <= edgeTolerance
      && this.testResults.aspectRatioCheck.bottomRowsDifferenceMatrix[1] <= edgeTolerance
    ) {
      // All three detections are the same
      this.testResults.aspectRatioCheck.bottomCandidate = this.testResults.aspectRatioCheck.bottomRows[0];
      this.testResults.aspectRatioCheck.bottomCandidateQuality =
        this.testResults.aspectRatioCheck.bottomQuality[0]
        + this.testResults.aspectRatioCheck.bottomQuality[1]
        + this.testResults.aspectRatioCheck.bottomQuality[2];
    } else if (                                                                                          // Second best: center matches one of the corners
      this.testResults.aspectRatioCheck.bottomRowsDifferenceMatrix[0] <= edgeTolerance
      || this.testResults.aspectRatioCheck.bottomRowsDifferenceMatrix[1] <= edgeTolerance
    ) {
      this.testResults.aspectRatioCheck.bottomCandidate = this.testResults.aspectRatioCheck.bottomRows[1];
      this.testResults.aspectRatioCheck.bottomCandidateQuality = this.testResults.aspectRatioCheck.bottomQuality[1];

      if (this.testResults.aspectRatioCheck.bottomRows[0] === this.testResults.aspectRatioCheck.bottomRows[1]) {
        this.testResults.aspectRatioCheck.bottomCandidateQuality += this.testResults.aspectRatioCheck.bottomQuality[0];
      } else {
        this.testResults.aspectRatioCheck.bottomCandidateQuality += this.testResults.aspectRatioCheck.bottomQuality[2];
      }
    } else if (this.testResults.aspectRatioCheck.bottomRowsDifferenceMatrix[2] <= edgeTolerance) {       // Third best: corners match, but are different from center
      if (this.testResults.aspectRatioCheck.bottomRows[0] > this.testResults.aspectRatioCheck.bottomRows[1]) {
        // Corners closer to the edges than center. Note that bigger number = closer to edge
        this.testResults.aspectRatioCheck.bottomCandidate = this.testResults.aspectRatioCheck.bottomRows[0];
        this.testResults.aspectRatioCheck.bottomCandidateQuality =
          this.testResults.aspectRatioCheck.bottomQuality[0]
          + this.testResults.aspectRatioCheck.bottomQuality[2]
      } else {
        // Center is closer to the edge than corners
        this.testResults.aspectRatioCheck.bottomCandidate = this.testResults.aspectRatioCheck.bottomRows[1];
        this.testResults.aspectRatioCheck.bottomCandidateQuality = this.testResults.aspectRatioCheck.bottomQuality[1]
      }
    } else {                                                                                             // Worst: nothing matches
      // We'll try to figure out aspect ratio later in second wind
      this.testResults.bottomRowUncertain = true;

      // console.log('BOTTOM ROW MISMATCH:', this.testResults.aspectRatioCheck.bottomRows[0], this.testResults.aspectRatioCheck.bottomRows[1], this.testResults.aspectRatioCheck.bottomRows[2]);
      // return;
    }

    if (this.testResults.topRowUncertain && this.testResults.bottomRowUncertain) {
      this.testResults.aspectRatioUncertain = true;
      this.testResults.aspectRatioUncertainReason = AardUncertainReason.TopAndBottomRowMismatch;
    }

    // Convert bottom candidate to letterbox width
    this.testResults.aspectRatioCheck.bottomCandidateDistance = this.testResults.aspectRatioCheck.bottomCandidate === Infinity ? -1 : height - this.testResults.aspectRatioCheck.bottomCandidate;

    const maxOffset = ~~(height * this.settings.active.arDetect.edgeDetection.maxLetterboxOffset);

    // attempt second-wind:
    // if any of the top candidates matches the best bottom candidate sufficiently,
    // we'll just promote it to the candidate status
    if (this.testResults.topRowUncertain) {
      if (this.testResults.aspectRatioCheck.bottomCandidateDistance - this.testResults.aspectRatioCheck.topRows[0] < edgeTolerance + maxOffset) {
        this.testResults.aspectRatioCheck.topCandidate = this.testResults.aspectRatioCheck.topRows[0];
        this.testResults.aspectRatioCheck.topCandidateQuality = this.testResults.aspectRatioCheck.topQuality[0] + this.testResults.aspectRatioCheck.bottomCandidateQuality;
      } else if (this.testResults.aspectRatioCheck.bottomCandidateDistance - this.testResults.aspectRatioCheck.topRows[1] < edgeTolerance + maxOffset) {
        this.testResults.aspectRatioCheck.topCandidate = this.testResults.aspectRatioCheck.topRows[1];
        this.testResults.aspectRatioCheck.topCandidateQuality = this.testResults.aspectRatioCheck.topQuality[1] + this.testResults.aspectRatioCheck.bottomCandidateQuality;
      } else if (this.testResults.aspectRatioCheck.bottomCandidateDistance - this.testResults.aspectRatioCheck.topRows[2] < edgeTolerance + maxOffset) {
        this.testResults.aspectRatioCheck.topCandidate = this.testResults.aspectRatioCheck.topRows[2];
        this.testResults.aspectRatioCheck.topCandidateQuality = this.testResults.aspectRatioCheck.topQuality[2] + this.testResults.aspectRatioCheck.bottomCandidateQuality;
      }
    } else if (this.testResults.bottomRowUncertain) {
      const bottomEdgeEquivalent = height - this.testResults.aspectRatioCheck.topCandidate;

      if (bottomEdgeEquivalent - this.testResults.aspectRatioCheck.bottomRows[0] < edgeTolerance + maxOffset) {
        this.testResults.aspectRatioCheck.bottomCandidate = this.testResults.aspectRatioCheck.bottomRows[0];
        this.testResults.aspectRatioCheck.bottomCandidateQuality = this.testResults.aspectRatioCheck.bottomQuality[0] + this.testResults.aspectRatioCheck.topCandidateQuality;
      } else if (bottomEdgeEquivalent - this.testResults.aspectRatioCheck.bottomRows[1] < edgeTolerance + maxOffset) {
        this.testResults.aspectRatioCheck.bottomCandidate = this.testResults.aspectRatioCheck.bottomRows[1];
        this.testResults.aspectRatioCheck.bottomCandidateQuality = this.testResults.aspectRatioCheck.bottomQuality[1] + this.testResults.aspectRatioCheck.topCandidateQuality;
      } else if (bottomEdgeEquivalent - this.testResults.aspectRatioCheck.bottomRows[2] < edgeTolerance + maxOffset) {
        this.testResults.aspectRatioCheck.bottomCandidate = this.testResults.aspectRatioCheck.bottomRows[2];
        this.testResults.aspectRatioCheck.bottomCandidateQuality = this.testResults.aspectRatioCheck.bottomQuality[2] + this.testResults.aspectRatioCheck.topCandidateQuality;
      }
    }

    /**
     * Get final results.
     * Let candidateA hold better-quality candidate, and let the candidateB hold the lower-quality candidate.
     * candidateA must match or exceed minQualitySingleEdge and candidateB must match or exceed minQualitySecondEdge.
     */
    let candidateAQuality, candidateBQuality;
    let edgeA, edgeB;
    if (this.testResults.aspectRatioCheck.bottomCandidateQuality > this.testResults.aspectRatioCheck.topCandidateQuality) {
      candidateAQuality = this.testResults.aspectRatioCheck.bottomCandidateQuality;
      candidateBQuality = this.testResults.aspectRatioCheck.topCandidateQuality;

      if (this.testResults.letterboxOrientation === LetterboxOrientation.Pillarbox) {
        edgeA = Edge.Right;
        edgeB = Edge.Left;
      } else {
        edgeA = Edge.Bottom;
        edgeB = Edge.Top;
      }
    } else {
      candidateAQuality = this.testResults.aspectRatioCheck.topCandidateQuality;
      candidateBQuality = this.testResults.aspectRatioCheck.bottomCandidateQuality;

      if (this.testResults.letterboxOrientation === LetterboxOrientation.Pillarbox) {
        edgeA = Edge.Left;
        edgeB = Edge.Right;
      } else {
        edgeA = Edge.Top;
        edgeB = Edge.Bottom;
      }
    }

    if (candidateAQuality < this.settings.active.arDetect.edgeDetection.thresholds.minQualitySingleEdge) {
      this.testResults.aspectRatioUncertainEdges |= edgeA;
    }
    if (candidateBQuality < this.settings.active.arDetect.edgeDetection.thresholds.minQualitySecondEdge) {
      this.testResults.aspectRatioUncertainEdges |= edgeB;
    }

    if (this.testResults.aspectRatioUncertainEdges) {
      this.testResults.aspectRatioUncertain = true;
      this.testResults.aspectRatioUncertainReason = AardUncertainReason.InsufficientEdgeDetectionQuality;

      // note that if we are cropping subtitles, insufficient edge detection isn't a deal breaker
      // It's completely possible that subtitle scan fixes this issue.
      // If subtitle detection is enabled, we run it in any case, because we still need to know if we
      // need to disable autodetection
      if (
        this.settings.active.arDetect.subtitles.subtitleCropMode === AardSubtitleCropMode.DisableScan
        || this.testResults.letterboxOrientation === LetterboxOrientation.Pillarbox // no subtitle scan in pillarbox
      ) {
        return;
      }
    }

    const crossDimension = this.testResults.letterboxOrientation === LetterboxOrientation.Pillarbox ? width : height;
    this.updateLetterboxEdgeCandidates(
      crossDimension,
      this.testResults.aspectRatioCheck.topCandidate,
      this.testResults.aspectRatioCheck.bottomCandidate
    );
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
    const maxOffset = ~~(crossDimension * this.settings.active.arDetect.edgeDetection.maxLetterboxOffset);
    const diff = Math.abs(topCandidate - bottomDistance);
    const candidateAvg = ~~((topCandidate + bottomDistance) * 0.5);


    if (diff > maxOffset) {
      if (!this.testResults.aspectRatioUncertain) {
        this.testResults.aspectRatioUncertain = true;
        this.testResults.aspectRatioUncertainReason = AardUncertainReason.LetterboxNotCenteredEnough;

        if (
          this.settings.active.arDetect.subtitles.subtitleCropMode !== AardSubtitleCropMode.DisableScan
          || this.testResults.letterboxOrientation === LetterboxOrientation.Pillarbox // no subtitle scan in pillarbox
        ) {
          return;
        }
      }
    }
    if (maxOffset > 2) {
      if (this.testResults.aspectRatioCheck.topCandidate === Infinity) {
        this.testResults.imageLine.top = -1;
        this.testResults.guardLine.top = -1;
      } else {
        this.testResults.imageLine.top = this.testResults.aspectRatioCheck.topCandidate = this.testResults.aspectRatioCheck.topCandidate;
        this.testResults.guardLine.top = Math.max(this.testResults.imageLine.top - 2, 0);
      }

      if (this.testResults.aspectRatioCheck.bottomCandidate === Infinity) {
        this.testResults.imageLine.bottom = -1;
        this.testResults.guardLine.bottom = -1;
      } else {
        this.testResults.imageLine.bottom = this.testResults.aspectRatioCheck.bottomCandidate;
        this.testResults.guardLine.bottom = Math.min(this.testResults.imageLine.bottom + 2, this.canvasStore.main.height - 1);
      }
    }

    if (this.testResults.aspectRatioUncertainReason !== AardUncertainReason.InsufficientEdgeDetectionQuality) {
      this.testResults.aspectRatioUncertain = false;
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
    const scanConf = this.settings.active.arDetect.subtitles;
    const shortScan = skipAdvancedScan || scanConf.subtitleCropMode !== AardSubtitleCropMode.CropSubtitles;

    this.testResults.subtitleDetected = false;

    // quit early when letterbox does not exist or is thin
    if (
      this.testResults.letterboxOrientation === LetterboxOrientation.NotLetterbox
      || scanConf.subtitleCropMode === AardSubtitleCropMode.DisableScan
      || this.testResults.guardLine.top < scanConf.scanSpacing
      || (height - this.testResults.guardLine.bottom) < scanConf.scanSpacing
    ) {
      this.testResults.subtitleDetected = false;
      this.timer.current.subtitleScan = 0;
      return;
    }

    const rowSize = width * 4;

    // SubtitleScanResult Regions
    const ssrRegions = this.testResults.subtitleScan.regions;

    shortScan:
    {
      this.subtitleScanRegionLinear(
        imageData,
        scanConf.scanSpacing, this.testResults.guardLine.top,
        scanConf.scanSpacing, scanConf.minDetections,
        ssrRegions.top
      );
      if (ssrRegions.top.firstSubtitle !== -1) {
        this.testResults.subtitleDetected = true;
        if (shortScan) {
          break shortScan;
        }
      }

      // scan one extra line
      this.subtitleScanRegionLinear(
        imageData,
        this.testResults.imageLine.top + 1, this.testResults.imageLine.top + 2,
        scanConf.scanSpacing, scanConf.minImageLineDetections,
        ssrRegions.top
      );
      if (ssrRegions.top.firstSubtitle !== -1) {
        this.testResults.subtitleDetected = true;
        if (shortScan) {
          break shortScan;
        }
      }

      this.subtitleScanRegionLinear(
        imageData,
        height - scanConf.scanSpacing, this.testResults.guardLine.bottom,
        -scanConf.scanSpacing, scanConf.minDetections,
        ssrRegions.bottom
      );
      if (ssrRegions.bottom.firstSubtitle !== -1) {
        this.testResults.subtitleDetected = true;
        if (shortScan) {
          break shortScan;
        }
      }

      // scan one extra line. Direction doesn't matter this time around
      this.subtitleScanRegionLinear(
        imageData,
        this.testResults.imageLine.bottom - 2, this.testResults.imageLine.bottom - 1,
        scanConf.scanSpacing, scanConf.minImageLineDetections,
        ssrRegions.bottom
      );
      if (ssrRegions.bottom.firstSubtitle !== -1) {
        this.testResults.subtitleDetected = true;
        if (shortScan) {
          break shortScan;
        }
      }
    }


    // the real fun begins when we want to explicitly crop subtitles.
    // we quit early if no subtitles were detected
    if (
      shortScan || (ssrRegions.top.firstSubtitle === -1 && ssrRegions.bottom.firstSubtitle === -1)
    ) {
      this.timer.current.subtitleScan = performance.now() - this.timer.current.start;
      return;
    }

    refinement:
    {
      let refinedTop = false, refinedBottom = false;
      const halfHeight = Math.floor(height / 2);

      // we can refine results if firstSubtitle exists
      if (ssrRegions.top.firstSubtitle !== -1) {
        if (ssrRegions.top.lastSubtitle < ssrRegions.top.firstImage) {
          this.subtitleScanRegionLinear(
            imageData,
            ssrRegions.top.lastSubtitle + 1, ssrRegions.top.firstImage - 1,
            1, scanConf.minImageLineDetections,
            ssrRegions.top
          )
          refinedTop = true;
        } else if (ssrRegions.top.firstImage === -1) {
          if (
            this.subtitleScanRegionIterative(
              imageData,
              ssrRegions.top.lastSubtitle,
              Math.min(
                ssrRegions.top.lastSubtitle + (scanConf.refiningScanSpacing * scanConf.refiningScanInitialIterations),
                halfHeight
              ),
              scanConf.refiningScanSpacing, scanConf.minImageLineDetections,
              ssrRegions.top,
            )
          ) {
            refinedBottom = true;
          }
        }
      }

      if (ssrRegions.bottom.firstSubtitle !== -1) {
        if (ssrRegions.bottom.firstImage >= 0 && ssrRegions.bottom.firstImage < ssrRegions.bottom.lastSubtitle) {
          this.subtitleScanRegionLinear(
            imageData,
            ssrRegions.bottom.lastSubtitle - 1, ssrRegions.bottom.firstImage + 1,
            rowSize, -1, scanConf.minImageLineDetections,
            ssrRegions.bottom
          );
          refinedBottom = true;
        } else if (ssrRegions.bottom.firstImage === -1) {
          if (
            this.subtitleScanRegionIterative(
              imageData,
              ssrRegions.bottom.lastSubtitle,
              Math.max(
                ssrRegions.bottom.lastSubtitle - (scanConf.refiningScanSpacing * scanConf.refiningScanInitialIterations),
                halfHeight
              ),
              rowSize, -scanConf.refiningScanSpacing, scanConf.minImageLineDetections,
              ssrRegions.bottom,
            )
          ) {
            refinedBottom = true;
          }
        }
      }

      if (!refinedTop && !refinedBottom) {
        break refinement;
      }

      this.updateLetterboxEdgeCandidates(
        height,
        refinedTop ? ssrRegions.top.firstImage : this.testResults.imageLine.top,
        refinedBottom ? ssrRegions.bottom.firstImage : this.testResults.imageLine.bottom,
      );
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
    startRow: number,
    endRow: number,
    scanSpacing: number,
    minDetections: number,
    results: AardTestResult_SubtitleRegion,
  ) {
    const scanConf = this.settings.active.arDetect.subtitles;

    let valueCount, isOnLetter, isOffLetter, letterSize, imageCount, isBlank;
    let rowStart, rowEnd;
    let imageConfirmPass = false;

    const rowMargin = Math.floor(scanConf.scanMargin * ROW_SIZE);
    const imageThreshold = Math.floor((ROW_SIZE - (rowMargin * 2)) * PIXEL_SIZE_FRACTION * scanConf.maxValidImage);

    // search in top letterbox
    outerLoop:
    for (
      let searchRow = startRow;
      (scanSpacing > 0 && searchRow < endRow) || (scanSpacing < 0 && searchRow > endRow);
      searchRow += scanSpacing
    ) {
      valueCount = 0;
      imageCount = 0;
      letterSize = 0;
      isOnLetter = false;
      isOffLetter = false;
      isBlank = true;

      // 4 values per pixel. Scan region is centered,
      rowStart = (searchRow * rowSize) + rowMargin;

      // exact row doesn't matter ... unless scanMargin is 0
      rowEnd = ((searchRow + 1) * rowSize) - rowMargin;

      while (rowStart < rowEnd) {
        const r = imageData[rowStart], g = imageData[rowStart + 1], b = imageData[rowStart + 2];

        const on = r > scanConf.subtitleSubpixelThresholdOn
                    || g > scanConf.subtitleSubpixelThresholdOn
                    || b > scanConf.subtitleSubpixelThresholdOn;
        const off = r < scanConf.subtitleSubpixelThresholdOff
                    && g < scanConf.subtitleSubpixelThresholdOff
                    && b < scanConf.subtitleSubpixelThresholdOff;

        if (on) {
          imageData[rowStart + 3] = GlDebugType.SubtitleThresholdOn;
          isOnLetter = true;
          letterSize++;

          // bail on invalid letter sizes — this means we're seeing image.
          // in this case, we do not need image confirmation step
          if (letterSize > scanConf.maxValidLetter) {
            if (results.firstImage === -1) {
              results.firstImage = searchRow;
            }
            results.lastImage = searchRow;
            isBlank = false;

            // We can stop here in CropSubtitles mode as well!
            return;
          }
        }
        if (off) {
          imageData[rowStart + 3] = GlDebugType.SubtitleThresholdOff;
          isOffLetter = true;
          letterSize = 0;
        }

        if (!on && !off) {
          imageData[rowStart + 3] = GlDebugType.SubtitleThresholdNone;
          if (++imageCount > imageThreshold) {
            // If we're here, we could be detecting legitimate image, or
            // we could also be detecting text anti-aliasing and/or
            // blur artifacts from image downscaling.
            // Difference between AA/scaling blur is that these two features
            // generally shouldn't appear in two consecutive lines
            if (!imageConfirmPass) {
              imageConfirmPass = true;

              if (scanSpacing > 1) {
                searchRow -= (scanSpacing - 1);
              } else if (scanSpacing < -1) {
                searchRow -= (scanSpacing + 1);
              }

              continue outerLoop;
            } else {
              imageConfirmPass = false;
              const correctedRow = searchRow + (scanSpacing < 0 ? 1 : -1);
              if (results.firstImage === -1) {
                results.firstImage = correctedRow;
              }
              results.lastImage = correctedRow;
            }

            // we don't need condition — if we detect image, that means
            // subtitles and blanks can no longer be detected
            return;
          }
        }

        if (isOnLetter && isOffLetter) {
          valueCount++;

          if (valueCount > minDetections) {
            if (results.firstSubtitle === -1) {
              results.firstSubtitle = searchRow;

              // if detecting subtitles only resets AR, we can return immediately
              if (scanConf.subtitleCropMode !== AardSubtitleCropMode.CropSubtitles) {
                return;
              }
            }
            results.lastSubtitle = searchRow;
            isBlank = false;

            continue outerLoop;
          }

          isOnLetter = false;
          isOffLetter = false;
        }
        rowStart += 4;
      }

      // if we came this far, then the row might be blank
      if (isBlank) {
        if (results.firstBlank === -1) {
          results.firstBlank = searchRow;
        }
        results.lastBlank = searchRow;
      }
    }
  }

  /**
   * Tries to determine letterbox through subtitles
   * @param imageData
   * @param startRow
   * @param endRow
   * @param rowSize
   * @param scanSpacing
   * @param minDetections
   * @param results
   * @param ssrRegionName
   * @returns
   */
  private subtitleScanRegionIterative(
    imageData: Uint8Array,
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
      if (scanSpacing > 0) {
        startRow = results.firstImage - scanSpacing;
        endRow = results.firstImage;
      } else {
        startRow = results.lastImage;
        endRow = results.lastImage + scanSpacing;
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

    if ((diff / maxRatio) > this.settings.active.arDetect.allowedArVariance || options?.forceReset) {
      this.videoData.resizer.updateAr({
        type: AspectRatioType.AutomaticUpdate,
        ratio: ar,
        offset: this.testResults.letterboxOffset,
        variant: this.arVariant
      });
      this.testResults.activeAspectRatio = ar;

      if (!options?.uncertainDetection) {
        if (this.settings.active.arDetect.autoDisable.onFirstChange) {
          this.status.autoDisabled = true;
        }
        if (this.settings.active.arDetect.autoDisable.ifNotChanged) {
          this.timers.autoDisableAt = Date.now() + this.settings.active.arDetect.autoDisable.ifNotChangedTimeout;
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
