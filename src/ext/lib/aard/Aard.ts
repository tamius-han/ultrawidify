import AspectRatioType from '../../../common/enums/AspectRatioType.enum';
import EventBus from '../EventBus';
import Logger from '../Logger';
import Settings from '../Settings';
import VideoData from '../video-data/VideoData';
import { Corner } from './enums/corner.enum';
import { GlCanvas } from './gl/GlCanvas';
import { AardCanvasStore } from './interfaces/aard-canvas-store.interface';
import { AardStatus, initAardStatus } from './interfaces/aard-status.interface';
import { AardTestResults, initAardTestResults } from './interfaces/aard-test-results.interface';
import { AardTimers, initAardTimers } from './interfaces/aard-timers.interface';

// Automatic Aspect Ratio Detector
// Here's how it works:
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
class Aard {

  //#region configuration parameters
  private logger: Logger;
  private conf: VideoData;
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
  private testResults: AardTestResults = initAardTestResults();
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
    this.conf = videoData;
    this.video = videoData.video;
    this.settings = videoData.settings;
    this.eventBus = videoData.eventBus;

    this.initEventBus();

    // this.sampleCols = [];
    // this.blackLevel = this.settings.active.arDetect.blackbar.blackLevel;

    this.arid = (Math.random()*100).toFixed();

    // we can tick manually, for debugging
    this.logger.log('info', 'init', `[ArDetector::ctor] creating new ArDetector. arid: ${this.arid}`);
  }

  private initEventBus() {
    for (const action in this.eventBusCommands) {
      for (const command of this.eventBusCommands[action]) {
        this.eventBus.subscribe(action, command);
      }
    }
  }

  private init() {
    this.canvasStore = {
      main: new GlCanvas(new GlCanvas(this.settings.active.arDetect.canvasDimensions.sampleCanvas)),
    };

    this.start();
  }

  //#endregion
  start() {
    if (this.conf.resizer.lastAr.type === AspectRatioType.AutomaticUpdate) {
      // ensure first autodetection will run in any case
      this.conf.resizer.lastAr = {type: AspectRatioType.AutomaticUpdate, ratio: this.defaultAr};
    }

    if (this.animationFrame) {
      window.cancelAnimationFrame(this.animationFrame);
    }

    this.status.aardActive = true;
    this.animationFrame = window.requestAnimationFrame( (ts: DOMHighResTimeStamp) => this.onAnimationFrame(ts));
    // this.logger.log('info', 'debug', `"%c[ArDetect::startLoop] <@${this.arid}> AARD loop started.`, _ard_console_start);
  }

  private onAnimationFrame(ts: DOMHighResTimeStamp) {
    if (this.canTriggerFrameCheck()) {
      this.main();
    }
    this.animationFrame = window.requestAnimationFrame( (ts: DOMHighResTimeStamp) => this.onAnimationFrame(ts));
  }

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

        this.checkLetterboxShrink(
          imageData,
          this.settings.active.arDetect.canvasDimensions.sampleCanvas.width,
          this.settings.active.arDetect.canvasDimensions.sampleCanvas.height
        );


      } while (false);

      // TODO: emit debug values if debugging is enabled
      this.testResults.isFinished = true;
    } catch (e) {
      console.warn('[Ultrawidify] Aspect ratio autodetection crashed for some reason.\n\nsome reason:', e);
    }
  }

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

    avg = avg / samples * 4;

    // TODO: unhardcode these values
    this.testResults.notLetterbox = avg > 16;

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
   * Checks if letterbox has shrunk.
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
      this.testResults.guardLine.invalidated = true;
      return;
    }

    const cornerViolations = [0,0,0,0];
    let subpixelViolation = false;

    let edgePosition = 0.25;  // TODO: unhardcode and put into settings. Is % of total width
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
        subpixelViolation ||= imageData[i++] > this.testResults.blackThreshold;
        subpixelViolation ||= imageData[i++] > this.testResults.blackThreshold;
        subpixelViolation ||= imageData[i++] > this.testResults.blackThreshold;

        if (subpixelViolation) {
          cornerViolations[Corner.TopLeft]++;
        }
        i++; // skip over alpha channel
      }
      while (i < secondSegment) {
        if (i % 4 === 3) {
          continue; // don't check alpha
        }
        if (imageData[i] > this.testResults.blackThreshold) {
          this.testResults.guardLine.invalidated = true;
          return; // no need to check further,
        }
      }
      while (i < rowEnd) {
        subpixelViolation = false;
        subpixelViolation ||= imageData[i++] > this.testResults.blackThreshold;
        subpixelViolation ||= imageData[i++] > this.testResults.blackThreshold;
        subpixelViolation ||= imageData[i++] > this.testResults.blackThreshold;

        if (subpixelViolation) {
          cornerViolations[Corner.TopRight]++;
        }
        i++; // skip over alpha channel
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
        subpixelViolation = false;
        subpixelViolation ||= imageData[i++] > this.testResults.blackThreshold;
        subpixelViolation ||= imageData[i++] > this.testResults.blackThreshold;
        subpixelViolation ||= imageData[i++] > this.testResults.blackThreshold;

        if (subpixelViolation) {
          cornerViolations[Corner.BottomLeft]++;
        }
        i++; // skip over alpha channel
      }
      if (i % 4) {
        i += 4 - (i % 4);
      }
      while (i < secondSegment) {
        if (i % 4 === 3) {
          continue; // don't check alpha
        }
        if (imageData[i] > this.testResults.blackThreshold) {
          this.testResults.guardLine.invalidated = true;
          return; // no need to check further,
        }
      }
      if (i % 4) {
        i += 4 - (i % 4);
      }
      while (i < rowEnd) {
        subpixelViolation = false;
        subpixelViolation ||= imageData[i++] > this.testResults.blackThreshold;
        subpixelViolation ||= imageData[i++] > this.testResults.blackThreshold;
        subpixelViolation ||= imageData[i++] > this.testResults.blackThreshold;

        if (subpixelViolation) {
          cornerViolations[Corner.BottomRight]++;
        }
        i++; // skip over alpha channel
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
    } else {
      this.testResults.guardLine.invalidated = false;
    }
  }

  /**
   * Checks if letterbox has grown
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
  }

}
