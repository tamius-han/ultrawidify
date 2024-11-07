import AspectRatioType from '../../../common/enums/AspectRatioType.enum';
import EventBus from '../EventBus';
import Logger from '../Logger';
import Settings from '../Settings';
import VideoData from '../video-data/VideoData';
import { Corner } from './enums/corner.enum';
import { VideoPlaybackState } from './enums/video-playback-state.enum';
import { GlCanvas } from './gl/GlCanvas';
import { AardCanvasStore } from './interfaces/aard-canvas-store.interface';
import { AardDetectionSample, generateSampleArray, resetSamples } from './interfaces/aard-detection-sample.interface';
import { AardStatus, initAardStatus } from './interfaces/aard-status.interface';
import { AardTestResults, initAardTestResults, resetAardTestResults } from './interfaces/aard-test-results.interface';
import { AardTimers, initAardTimers } from './interfaces/aard-timers.interface';


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
  private logger: Logger;
  private videoData: VideoData;
  private settings: Settings;
  private eventBus: EventBus;
  private arid: string;

  private eventBusCommands = {
    //   'get-aard-timing': [{
    //     function: () => this.handlePerformanceDataRequest()
      // }]
  };
  //#endregion

  private video: HTMLVideoElement;

  private animationFrame: number;

  //#region internal state
  public status: AardStatus = initAardStatus();
  private timers: AardTimers = initAardTimers();
  private canvasStore: AardCanvasStore;
  private testResults: AardTestResults;
  private canvasSamples: AardDetectionSample;
  //#endregion

  //#region getters
  get defaultAr() {
    if (!this.video) {
      return undefined;
    }

    const ratio = this.video.videoWidth / this.video.videoHeight;
    if (isNaN(ratio)) {
      return undefined;
    }
    return ratio;
  }

  //#endregion getters

  //#region lifecycle
  constructor(videoData: VideoData){
    this.logger = videoData.logger;
    this.videoData = videoData;
    this.video = videoData.video;
    this.settings = videoData.settings;
    this.eventBus = videoData.eventBus;

    this.testResults = initAardTestResults(this.settings.active.arDetect)

    this.initEventBus();

    // this.sampleCols = [];
    // this.blackLevel = this.settings.active.arDetect.blackbar.blackLevel;

    this.arid = (Math.random()*100).toFixed();

    // we can tick manually, for debugging
    this.logger.log('info', 'init', `[ArDetector::ctor] creating new ArDetector. arid: ${this.arid}`);

    this.init();
  }

  private initEventBus() {
    for (const action in this.eventBusCommands) {
      for (const command of this.eventBusCommands[action]) {
        this.eventBus.subscribe(action, command);
      }
    }
  }

  /**
   * Initializes Aard with default values and starts autodetection loop.
   * This method should only ever be called from constructor.
   */
  private init() {
    this.canvasStore = {
      main: new GlCanvas(new GlCanvas({...this.settings.active.arDetect.canvasDimensions.sampleCanvas, id: 'main-gl'})),
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

    this.start();
  }
  //#endregion

  /**
   * Starts autodetection loop.
   */
  start() {
    if (this.videoData.resizer.lastAr.type === AspectRatioType.AutomaticUpdate) {
      // ensure first autodetection will run in any case
      this.videoData.resizer.lastAr = {type: AspectRatioType.AutomaticUpdate, ratio: this.defaultAr};
    }

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
  step() {
    this.stop();
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

    if (Date.now() < this.timers.nextFrameCheckTime) {
      return false;
    }

    this.timers.nextFrameCheckTime = Date.now() + this.settings.active.arDetect.timers.playing;
    return true;
  }

  private onAnimationFrame(ts: DOMHighResTimeStamp) {
    if (this.canTriggerFrameCheck()) {
      resetAardTestResults(this.testResults);
      resetSamples(this.canvasSamples);
      this.main();
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
      // We abuse a do-while loop to eat our cake (get early returns)
      // and have it, too (if we return early, we still execute code
      // at the end of this function)
      do {
        const imageData = await new Promise<Uint8Array>(
          resolve => {
            this.canvasStore.main.drawVideoFrame(this.video);
            resolve(this.canvasStore.main.getImageData());
          }
        );

        // STEP 1:
        // Test if corners are black. If they're not, we can immediately quit the loop.
        this.getBlackLevelFast(
          imageData, 3, 1,
          this.settings.active.arDetect.canvasDimensions.sampleCanvas.width,
          this.settings.active.arDetect.canvasDimensions.sampleCanvas.height
        );
        if (this.testResults.notLetterbox) {
          // TODO: reset aspect ratio to "AR not applied"
          this.testResults.lastStage = 1;
          break;
        }

        // STEP 2:
        // Check if previously detected aspect ratio is still gucci. If it is, then
        // we can quit the loop without applying any aspect ratios (unless subtitle
        // detection is enabled, in which case we still run the subtitle test)
        this.checkLetterboxShrink(
          imageData,
          this.settings.active.arDetect.canvasDimensions.sampleCanvas.width,
          this.settings.active.arDetect.canvasDimensions.sampleCanvas.height
        );
        if (! this.testResults.guardLine.invalidated) {
          this.checkLetterboxGrow(
            imageData,
            this.settings.active.arDetect.canvasDimensions.sampleCanvas.width,
            this.settings.active.arDetect.canvasDimensions.sampleCanvas.height
          );
        }
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

      // if detection is uncertain, we don't do anything at all
      if (this.testResults.aspectRatioUncertain) {
        return;
      }

      // TODO: emit debug values if debugging is enabled
      this.testResults.isFinished = true;

      // if edge width changed, emit update event.
      if (this.testResults.aspectRatioUpdated) {
        this.videoData.resizer.updateAr({
          type: AspectRatioType.AutomaticUpdate,
          ratio: this.getAr(),
          offset: this.testResults.letterboxOffset
        });
      }
    } catch (e) {
      console.warn('[Ultrawidify] Aspect ratio autodetection crashed for some reason.\n\nsome reason:', e);
      this.videoData.resizer.setAr({type: AspectRatioType.AutomaticUpdate, ratio: this.defaultAr});
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
      this.logger.log('warn', 'debug', `[ArDetect::getVideoPlaybackState]  There was an error while determining video playback state.`, e);
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

      const endpx_r = px_r + (width * 4) - (i * 8) - 4;  // -4 because 4 bytes per pixel, and - twice the offset to mirror the diagonal
      pixelValues[pvi++] = imageData[endpx_r];
      pixelValues[pvi++] = imageData[endpx_r + 1];
      pixelValues[pvi++] = imageData[endpx_r + 2];
    }

    // now let's populate the bottom two corners
    for (let i = end; i --> offset;) {
      const row = height - i - 1;  // since first row is 0, last row is height - 1

      const px_r = (row * width * 4) + (i * 4);
      pixelValues[pvi++] = imageData[px_r];
      pixelValues[pvi++] = imageData[px_r + 1];
      pixelValues[pvi++] = imageData[px_r + 2];

      const endpx_r = px_r + (width * 4) - (i * 8) - 4;  // -4 because 4 bytes per pixel, and - twice the offset to mirror the diagonal
      pixelValues[pvi++] = imageData[endpx_r];
      pixelValues[pvi++] = imageData[endpx_r + 1];
      pixelValues[pvi++] = imageData[endpx_r + 2];
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

    const cornerViolations = [0,0,0,0];
    let subpixelViolation = false;

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
        subpixelViolation = false;

        if (
          imageData[i] > this.testResults.blackThreshold
          || imageData[i + 1] > this.testResults.blackThreshold
          || imageData[i + 2] > this.testResults.blackThreshold
        ) {
          cornerViolations[Corner.TopLeft]++;
        }
        i += 4;
      }
      while (i < secondSegment) {
        if (
          imageData[i] > this.testResults.blackThreshold
          || imageData[i + 1] > this.testResults.blackThreshold
          || imageData[i + 2] > this.testResults.blackThreshold
        ) {
          return;
        };
        i += 4;
      }
      while (i < rowEnd) {
        if (
          imageData[i] > this.testResults.blackThreshold
          || imageData[i + 1] > this.testResults.blackThreshold
          || imageData[i + 2] > this.testResults.blackThreshold
        ) {
          cornerViolations[Corner.TopRight]++;
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
          cornerViolations[Corner.BottomLeft]++;
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
          return;
        };
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
          cornerViolations[Corner.BottomRight]++;
        }
        i += 4; // skip over alpha channel
      }
    }

    const maxViolations = segmentPixels * 0.20; // TODO: move the 0.2 threshold into settings

    // we won't do a loop for this few elements
    // corners with stuff in them will also be skipped in image test
    this.testResults.guardLine.cornerViolations[0] = cornerViolations[0] > maxViolations;
    this.testResults.guardLine.cornerViolations[1] = cornerViolations[1] > maxViolations;
    this.testResults.guardLine.cornerViolations[2] = cornerViolations[2] > maxViolations;
    this.testResults.guardLine.cornerViolations[3] = cornerViolations[3] > maxViolations;

    const maxInvalidCorners = 1; // TODO: move this into settings — by default, we allow one corner to extend past the
                                 // guard line in order to prevent watermarks/logos from preventing cropping the video

    // this works because +true converts to 1 and +false converts to 0
    const dirtyCount = +this.testResults.guardLine.cornerViolations[0]
      + +this.testResults.guardLine.cornerViolations[1]
      + +this.testResults.guardLine.cornerViolations[2]
      + +this.testResults.guardLine.cornerViolations[3];

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
      if (! this.testResults.guardLine.cornerViolations[Corner.TopLeft]) {
        while (i < firstSegment) {
          imagePixel = false;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;

          if (imagePixel && ++pixelCount > detectionThreshold) {
            return;
          };
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
      if (! this.testResults.guardLine.cornerViolations[Corner.TopRight]) {
        while (i < rowEnd) {
          imagePixel = false;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;

          if (imagePixel && ++pixelCount > detectionThreshold) {
            return;
          };
          i++; // skip over alpha channel
        }
      }

      // we don't run image detection in corners that may contain logos, as such corners
      // may not be representative
      if (! this.testResults.guardLine.cornerViolations[Corner.TopLeft]) {
        while (i < firstSegment) {
          imagePixel = false;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;

          if (imagePixel && ++pixelCount > detectionThreshold) {
            return;
          };
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
      if (! this.testResults.guardLine.cornerViolations[Corner.TopRight]) {
        while (i < rowEnd) {
          imagePixel = false;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;

          if (imagePixel && ++pixelCount > detectionThreshold) {
            return;
          };
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
      if (! this.testResults.guardLine.cornerViolations[Corner.TopLeft]) {
        while (i < firstSegment) {
          imagePixel = false;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;

          if (imagePixel && ++pixelCount > detectionThreshold) {
            return;
          };
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
      if (! this.testResults.guardLine.cornerViolations[Corner.TopRight]) {
        while (i < rowEnd) {
          imagePixel = false;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;

          if (imagePixel && ++pixelCount > detectionThreshold) {
            return;
          };
          i++; // skip over alpha channel
        }
      }

      // we don't run image detection in corners that may contain logos, as such corners
      // may not be representative
      if (! this.testResults.guardLine.cornerViolations[Corner.TopLeft]) {
        while (i < firstSegment) {
          imagePixel = false;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;

          if (imagePixel && ++pixelCount > detectionThreshold) {
            return;
          };
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
      if (! this.testResults.guardLine.cornerViolations[Corner.TopRight]) {
        while (i < rowEnd) {
          imagePixel = false;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;
          imagePixel ||= imageData[i++] > this.testResults.blackThreshold;

          if (imagePixel && ++pixelCount > detectionThreshold) {
            return;
          };
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

    // TODO: _if gradient detection is enabled, then:
    this.sampleForGradient(imageData, width, height);

    this.processScanResults(imageData, width, height);

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
     */
    if (this.testResults.guardLine.top > 0) {
      // if guardLine is invalidated, then the new edge of image frame must be
      // above former guardline. Otherwise, it's below it.
      if (this.testResults.guardLine.invalidated) {
        topEnd = this.testResults.guardLine.top;
        bottomEnd = this.testResults.guardLine.bottom;
      } else {
        topStart = this.testResults.imageLine.top;
        bottomStart = this.testResults.imageLine.bottom;
      }
    }

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
            // TODO: maybe some day mark this pixel as checked by writing to alpha channel
            i++;
            continue;
          }
          if (this.canvasSamples.top[i] === -1) {
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
            // TODO: maybe some day mark this pixel as checked by writing to alpha channel
            i++;
            continue;
          }
          if (this.canvasSamples.bottom[i] === -1) {
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
          this.canvasSamples.top[i + 1] = -1;
          break;
        }
        xs += 4;
      }
      i += 2;
    }

    i = 0;
    let i1 = 0;
    while (i < this.canvasSamples.bottom.length) {
      // calculate row offset:
      i1 = i + 1;
      row = (this.canvasSamples.bottom[i1] - 1) * width * 4;
      xs = row + this.canvasSamples.bottom[i] - slopeTestSample;
      xe = row + this.canvasSamples.bottom[i] + slopeTestSample;

      while (xs < xe) {
        if (
          imageData[xs] > this.testResults.blackThreshold
          || imageData[xs + 1] > this.testResults.blackThreshold
          || imageData[xs + 2] > this.testResults.blackThreshold
        ) {
          this.canvasSamples.bottom[i1] = -1;
          i += 2;
          break;
        }
        xs += 4;
      }

      if (this.canvasSamples.bottom[i1]) {
        this.canvasSamples.bottom[i1] = height - this.canvasSamples.bottom[i1];
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
          if (this.canvasSamples.top[i] <= this.testResults.aspectRatioCheck.topRows[0]) {
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
          if (this.canvasSamples.top[i] <= this.testResults.aspectRatioCheck.topRows[1]) {
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
          if (this.canvasSamples.top[i] <= this.testResults.aspectRatioCheck.topRows[2]) {
            this.testResults.aspectRatioCheck.topRows[2] = this.canvasSamples.top[i];
            this.testResults.aspectRatioCheck.topQuality[2] = 0;
          } else if (this.canvasSamples.top[i] === this.testResults.aspectRatioCheck.topRows[2]) {
            this.testResults.aspectRatioCheck.topQuality[2]++;
          }
        }
        i += 2;
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
          if (this.canvasSamples.bottom[i] <= this.testResults.aspectRatioCheck.bottomRows[0]) {
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
          if (this.canvasSamples.bottom[i] <= this.testResults.aspectRatioCheck.bottomRows[1]) {
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
          if (this.canvasSamples.bottom[i] <= this.testResults.aspectRatioCheck.bottomRows[2]) {
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
    if (
      this.testResults.aspectRatioCheck.topRows[0] === this.testResults.aspectRatioCheck.topRows[1]
      && this.testResults.aspectRatioCheck.topRows[0] === this.testResults.aspectRatioCheck.topRows[2]
    ) {
      // All three detections are the same
      this.testResults.aspectRatioCheck.topCandidate = this.testResults.aspectRatioCheck.topRows[0];
      this.testResults.aspectRatioCheck.topCandidateQuality =
        this.testResults.aspectRatioCheck.topQuality[0]
        + this.testResults.aspectRatioCheck.topQuality[1]
        + this.testResults.aspectRatioCheck.topQuality[2];
    } else if (this.testResults.aspectRatioCheck.topRows[0] === this.testResults.aspectRatioCheck.topRows[2]) {
      // Corners are the same, but different from center
      if (this.testResults.aspectRatioCheck.topRows[0] > this.testResults.aspectRatioCheck.topRows[1]) {
        // Corners are above center.
        this.testResults.aspectRatioCheck.topCandidate = this.testResults.aspectRatioCheck.topRows[0];
        this.testResults.aspectRatioCheck.topCandidateQuality =
          this.testResults.aspectRatioCheck.topQuality[0]
          + this.testResults.aspectRatioCheck.topQuality[2]
      } else {
        // Corners are below center
        this.testResults.aspectRatioCheck.topCandidate = this.testResults.aspectRatioCheck.topRows[1];
        this.testResults.aspectRatioCheck.topCandidateQuality = this.testResults.aspectRatioCheck.topQuality[1]
      }
    } else {
      // Corners are different.
      if (
        this.testResults.aspectRatioCheck.topRows[0] !== this.testResults.aspectRatioCheck.topRows[1]
        && this.testResults.aspectRatioCheck.topRows[2] !== this.testResults.aspectRatioCheck.topRows[1]
      ) {
        // Center and matches neither of the corners.
        // TODO: maybe we can figure out to guess aspect ratio in scenarios like this.
        // But for the time being, just slap it with "inconclusive".
        this.testResults.aspectRatioUncertain = true;
        return;
      } else {
        // center matches one of the corners
        this.testResults.aspectRatioCheck.topCandidate = this.testResults.aspectRatioCheck.topRows[1];
        this.testResults.aspectRatioCheck.topCandidateQuality = this.testResults.aspectRatioCheck.topQuality[1];

        if (this.testResults.aspectRatioCheck.topRows[0] === this.testResults.aspectRatioCheck.topRows[1]) {
          this.testResults.aspectRatioCheck.topCandidateQuality += this.testResults.aspectRatioCheck.topRows[0];
        } else {
          this.testResults.aspectRatioCheck.topCandidateQuality += this.testResults.aspectRatioCheck.topRows[2];
        }
      }
    }

    // BOTTOM:
    if (
      this.testResults.aspectRatioCheck.bottomRows[0] === this.testResults.aspectRatioCheck.bottomRows[1]
      && this.testResults.aspectRatioCheck.bottomRows[0] === this.testResults.aspectRatioCheck.bottomRows[2]
    ) {
      // All three detections are the same
      this.testResults.aspectRatioCheck.bottomCandidate = this.testResults.aspectRatioCheck.bottomRows[0];
      this.testResults.aspectRatioCheck.bottomCandidateQuality =
        this.testResults.aspectRatioCheck.bottomQuality[0]
        + this.testResults.aspectRatioCheck.bottomQuality[1]
        + this.testResults.aspectRatioCheck.bottomQuality[2];
    } else if (this.testResults.aspectRatioCheck.bottomRows[0] === this.testResults.aspectRatioCheck.bottomRows[2]) {
      // Corners are the same, but different from center
      if (this.testResults.aspectRatioCheck.bottomRows[0] > this.testResults.aspectRatioCheck.bottomRows[1]) {
        // Corners are above center.
        this.testResults.aspectRatioCheck.bottomCandidate = this.testResults.aspectRatioCheck.bottomRows[0];
        this.testResults.aspectRatioCheck.bottomCandidateQuality =
          this.testResults.aspectRatioCheck.bottomQuality[0]
          + this.testResults.aspectRatioCheck.bottomQuality[2]
      } else {
        // Corners are below center
        this.testResults.aspectRatioCheck.bottomCandidate = this.testResults.aspectRatioCheck.bottomRows[1];
        this.testResults.aspectRatioCheck.bottomCandidateQuality = this.testResults.aspectRatioCheck.bottomQuality[1]
      }
    } else {
      // Corners are different.
      if (
        this.testResults.aspectRatioCheck.bottomRows[0] !== this.testResults.aspectRatioCheck.bottomRows[1]
        && this.testResults.aspectRatioCheck.bottomRows[2] !== this.testResults.aspectRatioCheck.bottomRows[1]
      ) {
        // Center and matches neither of the corners.
        // TODO: maybe we can figure out to guess aspect ratio in scenarios like this.
        // But for the time being, just slap it with "inconclusive".
        this.testResults.aspectRatioUncertain = true;
        return;
      } else {
        // center matches one of the corners
        this.testResults.aspectRatioCheck.bottomCandidate = this.testResults.aspectRatioCheck.bottomRows[1];
        this.testResults.aspectRatioCheck.bottomCandidateQuality = this.testResults.aspectRatioCheck.bottomQuality[1];

        if (this.testResults.aspectRatioCheck.bottomRows[0] === this.testResults.aspectRatioCheck.bottomRows[1]) {
          this.testResults.aspectRatioCheck.bottomCandidateQuality += this.testResults.aspectRatioCheck.bottomRows[0];
        } else {
          this.testResults.aspectRatioCheck.bottomCandidateQuality += this.testResults.aspectRatioCheck.bottomRows[2];
        }
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
      return;
    }

    const maxOffset = ~~(height * this.settings.active.arDetect.edgeDetection.maxLetterboxOffset)
    const diff = this.testResults.aspectRatioCheck.topCandidate - this.testResults.aspectRatioCheck.bottomCandidate;
    const candidateAvg = ~~((this.testResults.aspectRatioCheck.topCandidate + this.testResults.aspectRatioCheck.bottomCandidate) / 2);

    if (diff > maxOffset) {
      this.testResults.aspectRatioUncertain = true;
      return;
    }
    if (maxOffset > 2) {
      this.testResults.imageLine.top = this.testResults.aspectRatioCheck.topCandidate === Infinity ? -1 : this.testResults.aspectRatioCheck.topCandidate;
      this.testResults.imageLine.bottom = this.testResults.aspectRatioCheck.bottomCandidate === Infinity ? -1 : this.testResults.aspectRatioCheck.bottomCandidate;
      this.testResults.guardLine.top = Math.max(this.testResults.imageLine.top - 2, 0);
      this.testResults.guardLine.bottom = Math.max(this.testResults.imageLine.bottom + 2, this.canvasStore.main.height - 1);
    }
    this.testResults.aspectRatioUncertain = false;
    this.testResults.letterboxWidth = candidateAvg;
    this.testResults.letterboxOffset = diff;
    this.testResults.aspectRatioUpdated = true;
  }

  /**
   * Calculates video's current aspect ratio based on data in testResults.
   * @returns
   */
  private getAr() {
    const fileAr = this.video.videoWidth / this.video.videoHeight;
    const canvasAr = this.canvasStore.main.width / this.canvasStore.main.height;

    const compensatedWidth = fileAr === canvasAr ? this.canvasStore.main.width : this.canvasStore.main.width * fileAr;

    return compensatedWidth / (this.canvasStore.main.height - (this.testResults.letterboxWidth * 2));
  }

  //#endregion

}
