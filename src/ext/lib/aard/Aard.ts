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
import { AardTestResults, initAardTestResults, resetAardTestResults, resetGuardLine } from './interfaces/aard-test-results.interface';
import { AardTimers, initAardTimers } from './interfaces/aard-timers.interface';
import { ComponentLogger } from '../logging/ComponentLogger';


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
        console.log('received extension environment:', newEnvironment, 'player env:', this.videoData?.player?.environment);
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
   * Starts autodetection loop.
   */
  start() {
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
    // if (this._paused || this._halted || this._exited) {
    //   return false;
    // }

    // if video was paused & we know that we already checked that frame,
    // we will not check it again.
    const videoState = this.getVideoPlaybackState();

    if (videoState !== VideoPlaybackState.Playing) {
      if (this.status.lastVideoStatus === videoState) {
        return false;
      }
    }
    this.status.lastVideoStatus = videoState;

    const now = Date.now();

    if (now < (this.videoData.player.isTooSmall ? this.timers.reducedPollingNextCheckTime : this.timers.nextFrameCheckTime)) {
      return false;
    }

    this.timers.nextFrameCheckTime = now + this.settings.active.arDetect.timers.playing;
    this.timers.reducedPollingNextCheckTime = now + this.settings.active.arDetect.timers.playingReduced;
    return true;
  }

  private onAnimationFrame(ts: DOMHighResTimeStamp) {
    if (this.canTriggerFrameCheck()) {
      resetAardTestResults(this.testResults);
      resetSamples(this.canvasSamples);
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
    try {
      this.timer.next();

      let imageData: Uint8Array;
      this.timer.current.start = performance.now();

      // We abuse a do-while loop to eat our cake (get early returns)
      // and have it, too (if we return early, we still execute code
      // at the end of this function)
      do {
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
                if (this.settings.active.arDetect.aardType === 'auto') {
                  this.canvasStore.main.destroy();
                  this.canvasStore.main = this.createCanvas('main-gl', 'legacy');
                }
                this.inFallback = true;
                this.fallbackReason = {cors: true};

                if (this.settings.active.arDetect.aardType !== 'auto') {
                  this.stop();
                }
              }
            }
          }
        );
        this.timer.current.getImage = performance.now() - this.timer.current.start;

        // STEP 1:
        // Test if corners are black. If they're not, we can immediately quit the loop.
        this.getBlackLevelFast(
          imageData, 3, 1,
          this.settings.active.arDetect.canvasDimensions.sampleCanvas.width,
          this.settings.active.arDetect.canvasDimensions.sampleCanvas.height
        );
        this.timer.current.fastBlackLevel = performance.now() - this.timer.current.start;

        if (this.testResults.notLetterbox) {
          // TODO: reset aspect ratio to "AR not applied"
          this.testResults.lastStage = 1;

          // we have a few things to do
          // console.log('NOT LETTERBOX - resetting letterbox data')
          this.testResults.letterboxWidth = 0;
          this.testResults.letterboxOffset = 0;
          resetGuardLine(this.testResults);
          break;
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
            this.settings.active.arDetect.canvasDimensions.sampleCanvas.width,
            this.settings.active.arDetect.canvasDimensions.sampleCanvas.height
          );

          // If guardline was invalidated, letterbox width and offset are unreliable.
          // If guardLine is fine but imageLine is invalidated, we still keep last letterbox settings
          if (this.testResults.guardLine.invalidated) {
          // console.log('GUARD LINE INVALIDATED - resetting letterbox data')

            this.testResults.letterboxWidth = 0;
            this.testResults.letterboxOffset = 0;
          } else {
            this.checkLetterboxGrow(
              imageData,
              this.settings.active.arDetect.canvasDimensions.sampleCanvas.width,
              this.settings.active.arDetect.canvasDimensions.sampleCanvas.height
            );
          }
        }
        this.timer.current.guardLine = performance.now() - this.timer.current.start;  // guardLine is for both guardLine and imageLine checks

        // Both need to be checked
        if (! (this.testResults.imageLine.invalidated || this.testResults.guardLine.invalidated)) {
          // TODO: ensure no aspect ratio changes happen
          this.testResults.lastStage = 2;
          break;
        }

        // STEP 3:
        // If we are here, we must do full aspect ratio detection.
        // After aspectRatioCheck is finished, we know how wide the letterbox is.
        this.aspectRatioCheck(
          imageData,
          this.settings.active.arDetect.canvasDimensions.sampleCanvas.width,
          this.settings.active.arDetect.canvasDimensions.sampleCanvas.height
        );

      } while (false);

      // TODO: subtitle check goes here.
      // Note that subtitle check should reset aspect ratio outright, regardless of what other tests revealed.
      // Also note that subtitle check should run on newest aspect ratio data, rather than lag one frame behind
      // But implementation details are something for future Tam to figure out

      // If forceFullRecheck is set, then 'not letterbox' should always force-reset the aspect ratio
      // (as aspect ratio may have been set manually while autodetection was off)

      // If debugging is enable,
      this.canvasStore.debug?.drawBuffer(imageData);

      do {
        if (this.testResults.notLetterbox) {
          // console.log('————not letterbox')
          // console.warn('DETECTED NOT LETTERBOX! (resetting)')
          this.timer.arChanged();
          this.updateAspectRatio(this.defaultAr);
          break;
        }

        // if detection is uncertain, we don't do anything at all (unless if guardline was broken, in which case we reset)
        if (this.testResults.aspectRatioUncertain && this.testResults.guardLine.invalidated) {
          // console.info('aspect ratio not certain:', this.testResults.aspectRatioUncertainReason);
          // console.warn('check finished:', JSON.parse(JSON.stringify(this.testResults)), JSON.parse(JSON.stringify(this.canvasSamples)), '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n');

          // console.warn('ASPECT RATIO UNCERTAIN, GUARD LINE INVALIDATED (resetting)')
          this.timer.arChanged();
          this.updateAspectRatio(this.defaultAr);

          break;
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
      } while (false)

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
      const px_r = (i * width * 4) + (i * 4);    // red component starts here
      pixelValues[pvi++] = imageData[px_r];
      pixelValues[pvi++] = imageData[px_r + 1];
      pixelValues[pvi++] = imageData[px_r + 2];
      imageData[px_r + 3] = GlDebugType.BlackLevelSample;

      const endpx_r = px_r + (width * 4) - (i * 8) - 4;  // -4 because 4 bytes per pixel, and - twice the offset to mirror the diagonal
      pixelValues[pvi++] = imageData[endpx_r];
      pixelValues[pvi++] = imageData[endpx_r + 1];
      pixelValues[pvi++] = imageData[endpx_r + 2];
      imageData[endpx_r + 3] = GlDebugType.BlackLevelSample;
    }

    // now let's populate the bottom two corners
    for (let i = end; i --> offset;) {
      const row = height - i - 1;  // since first row is 0, last row is height - 1

      const px_r = (row * width * 4) + (i * 4);
      pixelValues[pvi++] = imageData[px_r];
      pixelValues[pvi++] = imageData[px_r + 1];
      pixelValues[pvi++] = imageData[px_r + 2];
      imageData[px_r + 3] = GlDebugType.BlackLevelSample;

      const endpx_r = px_r + (width * 4) - (i * 8) - 4;  // -4 because 4 bytes per pixel, and - twice the offset to mirror the diagonal
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

    // Avg only contains highest subpixel,
    // but there's 4 subpixels per sample.
    avg = avg / (samples * 4);

    // TODO: unhardcode these values
    this.testResults.notLetterbox = avg > (this.testResults.blackLevel);

    // only update black level if not letterbox.
    // NOTE: but maybe we could, if blackLevel can only get lower than
    // the default value.
    if (this.testResults.notLetterbox) {
      this.testResults.aspectRatioUncertain = false;

      if (min < this.testResults.blackLevel) {
        this.testResults.blackLevel = min;
        this.testResults.blackThreshold = min + 16;
      }
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
    const edgeSegmentSize = segmentPixels * 4;


    // check the top
    {
      // no use in doing guardline tests if guardline hasn't been measured yet, or if
      // guardline is not defined.
      const rowStart = this.testResults.guardLine.top * width * 4;
      const firstSegment = rowStart + edgeSegmentSize;
      const rowEnd = rowStart + (width * 4) - 4;
      const secondSegment = rowEnd - edgeSegmentSize;

      let i = rowStart;

      while (i < firstSegment) {
        if (
          imageData[i] > this.testResults.blackThreshold
          || imageData[i + 1] > this.testResults.blackThreshold
          || imageData[i + 2] > this.testResults.blackThreshold
        ) {
          imageData[i + 3] = GlDebugType.GuardLineCornerViolation;
          this.testResults.guardLine.cornerPixelsViolated[Corner.TopLeft]++;
        } else {
          imageData[i + 3] = GlDebugType.GuardLineCornerOk;
        }
        i += 4;
      }
      while (i < secondSegment) {
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
          return;
        } else {
          imageData[i + 3] = GlDebugType.GuardLineOk;
        }
        i += 4;
      }
      while (i < rowEnd) {
        if (
          imageData[i] > this.testResults.blackThreshold
          || imageData[i + 1] > this.testResults.blackThreshold
          || imageData[i + 2] > this.testResults.blackThreshold
        ) {
          imageData[i + 3] = GlDebugType.GuardLineCornerViolation;
          this.testResults.guardLine.cornerPixelsViolated[Corner.TopRight]++;
        } else {
          imageData[i + 3] = GlDebugType.GuardLineCornerOk;
        }
        i += 4; // skip over alpha channel
      }
    }
    // check bottom
    {
      const rowStart = this.testResults.guardLine.bottom * width * 4;
      const firstSegment = rowStart + edgeSegmentSize;
      const rowEnd = rowStart + (width * 4) - 4;
      const secondSegment = rowEnd - edgeSegmentSize;

      let i = rowStart;
      if (i % 4) {
        i += 4 - (i % 4);
      }
      while (i < firstSegment) {
        if (
          imageData[i] > this.testResults.blackThreshold
          || imageData[i + 1] > this.testResults.blackThreshold
          || imageData[i + 2] > this.testResults.blackThreshold
        ) {
          imageData[i + 3] = GlDebugType.GuardLineCornerViolation;
          this.testResults.guardLine.cornerPixelsViolated[Corner.BottomLeft]++;
        } else {
          imageData[i + 3] = GlDebugType.GuardLineCornerOk;
        }
        i += 4; // skip over alpha channel
      }
      if (i % 4) {
        i += 4 - (i % 4);
      }
      while (i < secondSegment) {
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
          return;
        } else {
          imageData[i + 3] = GlDebugType.GuardLineOk;
        }
        i += 4;
      }
      if (i % 4) {
        i += 4 - (i % 4);
      }
      while (i < rowEnd) {
        if (
          imageData[i] > this.testResults.blackThreshold
          || imageData[i + 1] > this.testResults.blackThreshold
          || imageData[i + 2] > this.testResults.blackThreshold
        ) {
          imageData[i + 3] = GlDebugType.GuardLineCornerViolation;
          this.testResults.guardLine.cornerPixelsViolated[Corner.BottomRight]++;
        } else {
          imageData[i + 3] = GlDebugType.GuardLineCornerOk;
        }
        i += 4; // skip over alpha channel
      }
    }

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

    let edgePosition = this.settings.active.arDetect.sampling.edgePosition;
    const segmentPixels = width * edgePosition;
    const edgeSegmentSize = segmentPixels * 4;

    const detectionThreshold = width * 0.1; // TODO: unhardcoide and put into settings. Is % of total width.
    let imagePixel = false;
    let pixelCount = 0;

    // check the top
    {
      const rowStart = this.testResults.imageLine.top * width * 4;
      const firstSegment = rowStart + edgeSegmentSize;
      const rowEnd = rowStart + (width * 4) - 4;
      const secondSegment = rowEnd - edgeSegmentSize;

      let i = rowStart;

      // we don't run image detection in corners that may contain logos, as such corners
      // may not be representative
      if (! this.testResults.guardLine.cornerViolated[Corner.TopLeft]) {
        while (i < firstSegment) {
          imagePixel = false;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;

          if (imagePixel && ++pixelCount > detectionThreshold) {
            imageData[i] = GlDebugType.ImageLineThresholdReached;
            return;
          } else {
            imageData[i] = imagePixel ?  GlDebugType.ImageLineOk : GlDebugType.ImageLineFail;
          }
          i++; // skip over alpha channel
        }
      }
      while (i < secondSegment) {
        imagePixel = false;
        imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
        imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
        imagePixel ||= imageData[i++] > this.testResults.blackThreshold;

        if (imagePixel && ++pixelCount > detectionThreshold) {
          imageData[i] = GlDebugType.ImageLineThresholdReached;
          return;
        } else {
          imageData[i] = imagePixel ?  GlDebugType.ImageLineOk : GlDebugType.ImageLineFail;
        }
        i++; // skip over alpha channel
      }
      if (! this.testResults.guardLine.cornerViolated[Corner.TopRight]) {
        while (i < rowEnd) {
          imagePixel = false;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;

          if (imagePixel && ++pixelCount > detectionThreshold) {
            imageData[i] = GlDebugType.ImageLineThresholdReached;
            return;
          } else {
            imageData[i] = imagePixel ?  GlDebugType.ImageLineOk : GlDebugType.ImageLineFail;
          }
          i++; // skip over alpha channel
        }
      }

      // we don't run image detection in corners that may contain logos, as such corners
      // may not be representative
      if (! this.testResults.guardLine.cornerViolated[Corner.TopLeft]) {
        while (i < firstSegment) {
          imagePixel = false;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;

          if (imagePixel && ++pixelCount > detectionThreshold) {
            imageData[i] = GlDebugType.ImageLineThresholdReached;
            return;
          } else {
            imageData[i] = imagePixel ?  GlDebugType.ImageLineOk : GlDebugType.ImageLineFail;
          }
          i++; // skip over alpha channel
        }
      }
      while (i < secondSegment) {
        imagePixel = false;
        imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
        imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
        imagePixel ||= imageData[i++] > this.testResults.blackThreshold;

        if (imagePixel && ++pixelCount > detectionThreshold) {
          return;
        };
        i++; // skip over alpha channel
      }
      if (! this.testResults.guardLine.cornerViolated[Corner.TopRight]) {
        while (i < rowEnd) {
          imagePixel = false;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;

          if (imagePixel && ++pixelCount > detectionThreshold) {
            imageData[i] = GlDebugType.ImageLineThresholdReached;
            return;
          } else {
            imageData[i] = imagePixel ?  GlDebugType.ImageLineOk : GlDebugType.ImageLineFail;
          }
          i++; // skip over alpha channel
        }
      }
    }

    // check the bottom
    {
      const rowStart = this.testResults.imageLine.bottom * width * 4;
      const firstSegment = rowStart + edgeSegmentSize;
      const rowEnd = rowStart + (width * 4) - 4;
      const secondSegment = rowEnd - edgeSegmentSize;

      let i = rowStart;

      // we don't run image detection in corners that may contain logos, as such corners
      // may not be representative
      if (! this.testResults.guardLine.cornerViolated[Corner.TopLeft]) {
        while (i < firstSegment) {
          imagePixel = false;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;

          if (imagePixel && ++pixelCount > detectionThreshold) {
            imageData[i] = GlDebugType.ImageLineThresholdReached;
            return;
          } else {
            imageData[i] = imagePixel ?  GlDebugType.ImageLineOk : GlDebugType.ImageLineFail;
          }
          i++; // skip over alpha channel
        }
      }
      while (i < secondSegment) {
        imagePixel = false;
        imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
        imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
        imagePixel ||= imageData[i++] > this.testResults.blackThreshold;

        if (imagePixel && ++pixelCount > detectionThreshold) {
          imageData[i] = GlDebugType.ImageLineThresholdReached;
          return;
        } else {
          imageData[i] = imagePixel ?  GlDebugType.ImageLineOk : GlDebugType.ImageLineFail;
        }
        i++; // skip over alpha channel
      }
      if (! this.testResults.guardLine.cornerViolated[Corner.TopRight]) {
        while (i < rowEnd) {
          imagePixel = false;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;

          if (imagePixel && ++pixelCount > detectionThreshold) {
            imageData[i] = GlDebugType.ImageLineThresholdReached;
            return;
          } else {
            imageData[i] = imagePixel ?  GlDebugType.ImageLineOk : GlDebugType.ImageLineFail;
          }
          i++; // skip over alpha channel
        }
      }

      // we don't run image detection in corners that may contain logos, as such corners
      // may not be representative
      if (! this.testResults.guardLine.cornerViolated[Corner.TopLeft]) {
        while (i < firstSegment) {
          imagePixel = false;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;

          if (imagePixel && ++pixelCount > detectionThreshold) {
            imageData[i] = GlDebugType.ImageLineThresholdReached;
            return;
          } else {
            imageData[i] = imagePixel ?  GlDebugType.ImageLineOk : GlDebugType.ImageLineFail;
          }
          i++; // skip over alpha channel
        }
      }
      while (i < secondSegment) {
        imagePixel = false;
        imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
        imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
        imagePixel ||= imageData[i++] > this.testResults.blackThreshold;

        if (imagePixel && ++pixelCount > detectionThreshold) {
          imageData[i] = GlDebugType.ImageLineThresholdReached;
          return;
        } else {
          imageData[i] = imagePixel ?  GlDebugType.ImageLineOk : GlDebugType.ImageLineFail;
        }
        i++; // skip over alpha channel
      }
      if (! this.testResults.guardLine.cornerViolated[Corner.TopRight]) {
        while (i < rowEnd) {
          imagePixel = false;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;

          if (imagePixel && ++pixelCount > detectionThreshold) {
            imageData[i] = GlDebugType.ImageLineThresholdReached;
            return;
          } else {
            imageData[i] = imagePixel ?  GlDebugType.ImageLineOk : GlDebugType.ImageLineFail;
          }
          i++; // skip over alpha channel
        }
      }
    }

    // if we came this far, we didn't get enough non-black pixels in order
    // to detect image. imageLine needs to be invalidated.
    this.testResults.imageLine.invalidated = true;
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

    // TODO: _if gradient detection is enabled, then:
    this.sampleForGradient(imageData, width, height);
    this.timer.current.gradient = performance.now() - this.timer.current.start;

    this.processScanResults(imageData, width, height);
    this.timer.current.scanResults = performance.now() - this.timer.current.start;
  }

  /**
   * Detects positions where frame stops being black and begins to contain image.
   * @param imageData
   * @param width
   * @param height
   */
  private edgeScan(imageData: Uint8Array, width: number, height: number) {
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
        rowOffset = row * 4 * width;

        // test the entire row
        while (i < this.canvasSamples.top.length) {
          // read x offset for the row we're testing, after this `i` points to the
          // result location
          x = this.canvasSamples.top[i++];

          // check for image, after we're done `x` points to alpha channel
          isImage =
            imageData[rowOffset + x] > this.testResults.blackLevel
            || imageData[rowOffset + x + 1] > this.testResults.blackLevel
            || imageData[rowOffset + x + 2] > this.testResults.blackLevel;

          if (!isImage) {
            imageData[rowOffset + x + 3] = GlDebugType.EdgeScanProbe;
            // TODO: maybe some day mark this pixel as checked by writing to alpha channel
            i++;
            continue;
          }
          if (this.canvasSamples.top[i] === -1) {
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
        rowOffset = row * 4 * width;

        // test the entire row
        while (i < this.canvasSamples.bottom.length) {
          // read x offset for the row we're testing, after this `i` points to the
          // result location
          x = this.canvasSamples.bottom[i++];

          // check for image, after we're done `x` points to alpha channel
          isImage =
            imageData[rowOffset + x] > this.testResults.blackLevel
            || imageData[rowOffset + x + 1] > this.testResults.blackLevel
            || imageData[rowOffset + x + 2] > this.testResults.blackLevel;

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
    let i = 0;
    let xs: number, xe: number, row: number;
    const slopeTestSample = this.settings.active.arDetect.edgeDetection.slopeTestWidth * 4;

    while (i < this.canvasSamples.top.length) {
      // if (this.canvasSamples.top[i] < 0) {
      //   continue;
      // }
      // calculate row offset:
      row = (this.canvasSamples.top[i + 1] - 1) * width * 4;
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
        xs += 4;
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
      row = (this.canvasSamples.bottom[i1] + 1) * width * 4;
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
        xs += 4;
      }

      if (this.canvasSamples.bottom[i1]) {
        this.canvasSamples.bottom[i1] = this.canvasSamples.bottom[i1];
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

    const realWidth = width * 4;

    upperEdgeCheck:
    for (let i = 1; i < this.canvasSamples.top.length; i += 2) {
      if (this.canvasSamples.top[i] < 0) {
        continue;
      }

      pixelOffset = this.canvasSamples.top[i] * realWidth + this.canvasSamples.top[i - 1] * 4;

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
        pixelOffset -= realWidth;
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
      pixelOffset = (height - this.canvasSamples.bottom[i]) * realWidth + this.canvasSamples.bottom[i - 1] * 4;

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
        pixelOffset -= realWidth;
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
        if (this.canvasSamples.top[i] > -1) {
          if (this.canvasSamples.top[i] < this.testResults.aspectRatioCheck.topRows[0]) {
            this.testResults.aspectRatioCheck.topRows[0] = this.canvasSamples.top[i];
            this.testResults.aspectRatioCheck.topQuality[0] = 0;
          } else if (this.canvasSamples.top[i] === this.testResults.aspectRatioCheck.topRows[0]) {
            this.testResults.aspectRatioCheck.topQuality[0]++;
          }
        }
        i += 2;
      }

      while (i < rightEdgeBoundary) {
        if (this.canvasSamples.top[i] > -1) {
          if (this.canvasSamples.top[i] < this.testResults.aspectRatioCheck.topRows[1]) {
            this.testResults.aspectRatioCheck.topRows[1] = this.canvasSamples.top[i];
            this.testResults.aspectRatioCheck.topQuality[1] = 0;
          } else if (this.canvasSamples.top[i] === this.testResults.aspectRatioCheck.topRows[1]) {
            this.testResults.aspectRatioCheck.topQuality[1]++;
          }
        }
        i += 2;
      }

      while (i < this.canvasSamples.top.length) {
        if (this.canvasSamples.top[i] > -1) {
          if (this.canvasSamples.top[i] < this.testResults.aspectRatioCheck.topRows[2]) {
            this.testResults.aspectRatioCheck.topRows[2] = this.canvasSamples.top[i];
            this.testResults.aspectRatioCheck.topQuality[2] = 0;
          } else if (this.canvasSamples.top[i] === this.testResults.aspectRatioCheck.topRows[2]) {
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
        if (this.canvasSamples.bottom[i] > -1) {
          if (this.canvasSamples.bottom[i] < this.testResults.aspectRatioCheck.bottomRows[0]) {
            this.testResults.aspectRatioCheck.bottomRows[0] = this.canvasSamples.bottom[i];
            this.testResults.aspectRatioCheck.bottomQuality[0] = 0;
          } else if (this.canvasSamples.bottom[i] === this.testResults.aspectRatioCheck.bottomRows[0]) {
            this.testResults.aspectRatioCheck.bottomQuality[0]++;
          }
        }
        i += 2;
      }

      while (i < rightEdgeBoundary) {
        if (this.canvasSamples.bottom[i] > -1) {
          if (this.canvasSamples.bottom[i] < this.testResults.aspectRatioCheck.bottomRows[1]) {
            this.testResults.aspectRatioCheck.bottomRows[1] = this.canvasSamples.bottom[i];
            this.testResults.aspectRatioCheck.bottomQuality[1] = 0;
          } else if (this.canvasSamples.bottom[i] === this.testResults.aspectRatioCheck.bottomRows[1]) {
            this.testResults.aspectRatioCheck.bottomQuality[1]++;
          }
        }
        i += 2;
      }

      while (i < this.canvasSamples.bottom.length) {
        if (this.canvasSamples.bottom[i] > -1) {
          if (this.canvasSamples.bottom[i] < this.testResults.aspectRatioCheck.bottomRows[2]) {
            this.testResults.aspectRatioCheck.bottomRows[2] = this.canvasSamples.bottom[i];
            this.testResults.aspectRatioCheck.bottomQuality[2] = 0;
          } else if (this.canvasSamples.bottom[i] === this.testResults.aspectRatioCheck.bottomRows[2]) {
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
      this.testResults.aspectRatioUncertainReason = 'TOP_AND_BOTTOM_ROW_MISMATCH';
    }

    // Convert bottom candidate to letterbox width
    this.testResults.aspectRatioCheck.bottomCandidateDistance = this.testResults.aspectRatioCheck.bottomCandidate === Infinity ? -1 : height - this.testResults.aspectRatioCheck.bottomCandidate;

    const maxOffset = ~~(height * this.settings.active.arDetect.edgeDetection.maxLetterboxOffset)

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
    let candidateA, candidateB;
    if (this.testResults.aspectRatioCheck.bottomCandidateQuality > this.testResults.aspectRatioCheck.topCandidateQuality) {
      candidateA = this.testResults.aspectRatioCheck.bottomCandidate;
      candidateB = this.testResults.aspectRatioCheck.topCandidate;
    } else {
      candidateA = this.testResults.aspectRatioCheck.topCandidate;
      candidateB = this.testResults.aspectRatioCheck.bottomCandidate;
    }

    if (
      candidateA < this.settings.active.arDetect.edgeDetection.thresholds.minQualitySingleEdge
      || candidateB < this.settings.active.arDetect.edgeDetection.thresholds.minQualitySecondEdge
    ) {
      this.testResults.aspectRatioUncertain = true;
      this.testResults.aspectRatioUncertainReason = 'INSUFFICIENT_EDGE_DETECTION_QUALITY';
      return;
    }

    const diff = this.testResults.aspectRatioCheck.topCandidate - this.testResults.aspectRatioCheck.bottomCandidateDistance;
    const candidateAvg = ~~((this.testResults.aspectRatioCheck.topCandidate + this.testResults.aspectRatioCheck.bottomCandidateDistance) / 2);

    if (diff > maxOffset) {
      this.testResults.aspectRatioUncertain = true;
      this.testResults.aspectRatioUncertainReason = 'LETTERBOX_NOT_CENTERED_ENOUGH';
      return;
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

    this.testResults.aspectRatioUncertain = false;

    this.testResults.letterboxWidth = candidateAvg;
    this.testResults.letterboxOffset = diff;
    this.testResults.aspectRatioUpdated = true;
  }

  /**
   * Updates aspect ratio if new aspect ratio is different enough from the old one
   */
  private updateAspectRatio(overrideAr?: number) {
    const ar = overrideAr ?? this.getAr();

    // Calculate difference between two ratios
    const maxRatio = Math.max(ar, this.testResults.activeAspectRatio);
    const diff = Math.abs(ar - this.testResults.activeAspectRatio);

    if (overrideAr || (diff / maxRatio) > this.settings.active.arDetect.allowedArVariance) {
      this.videoData.resizer.updateAr({
        type: AspectRatioType.AutomaticUpdate,
        ratio: this.getAr(),
        offset: this.testResults.letterboxOffset,
        variant: this.arVariant
      });
      this.testResults.activeAspectRatio = ar;
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


    return compensatedWidth / (this.canvasStore.main.height - (this.testResults.letterboxWidth * 2));
  }

  //#endregion

}
