
import Debug from '../../conf/Debug';
import EdgeDetect from './edge-detect/EdgeDetect';
import EdgeStatus from './edge-detect/enums/EdgeStatusEnum';
import EdgeDetectPrimaryDirection from './edge-detect/enums/EdgeDetectPrimaryDirectionEnum';
import EdgeDetectQuality from './edge-detect/enums/EdgeDetectQualityEnum';
import GuardLine from './GuardLine';
// import DebugCanvas from './DebugCanvas';
import VideoAlignmentType from '../../../common/enums/VideoAlignmentType.enum';
import AspectRatioType from '../../../common/enums/AspectRatioType.enum';
import {sleep} from '../Util';
import BrowserDetect from '../../conf/BrowserDetect';
import Logger from '../Logger';
import VideoData from '../video-data/VideoData';
import Settings from '../Settings';
import EventBus from '../EventBus';

enum VideoPlaybackState {
  Playing,
  Paused,
  Ended,
  Error
}

export interface AardPerformanceMeasurement {
  sampleCount: number,
  averageTime: number,
  worstTime: number,
  stDev: number,
}

export interface AardPerformanceData {
  total: AardPerformanceMeasurement,
  theoretical: AardPerformanceMeasurement,
  imageDraw: AardPerformanceMeasurement
  blackFrameDraw: AardPerformanceMeasurement,
  blackFrame: AardPerformanceMeasurement,
  fastLetterbox: AardPerformanceMeasurement,
  edgeDetect: AardPerformanceMeasurement,

  imageDrawCount: number,
  blackFrameDrawCount: number,
  blackFrameCount: number,
  fastLetterboxCount: number,
  edgeDetectCount: number,

  aardActive: boolean,    // whether autodetection is currently running or not
}

class ArDetector {

  //#region helper objects
  logger: Logger;
  conf: VideoData;
  video: HTMLVideoElement;
  settings: Settings;
  eventBus: EventBus;

  guardLine: GuardLine;
  edgeDetector: EdgeDetect;
  //#endregion

  private eventBusCommands = {
    'get-aard-timing': [{
      function: () => this.handlePerformanceDataRequest()
    }]
  }

  setupTimer: any;
  sampleCols: any[];
  sampleLines

  canFallback: boolean = true;

  blackLevel: number;

  arid: string;



  private manualTickEnabled: boolean;
  _nextTick: boolean;

  private animationFrameHandle: any;
  private attachedCanvas: HTMLCanvasElement;
  canvas: HTMLCanvasElement;
  private blackframeCanvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private blackframeContext: CanvasRenderingContext2D;
  canvasImageDataRowLength: number;

  private timers = {
    nextFrameCheckTime: Date.now()
  }
  private status = {
    lastVideoStatus: VideoPlaybackState.Playing,
    aardActive: false,
  }

  //#region debug variables
  private performance = {
    samples:  [],
    currentIndex: 0,
    maxSamples: 64,

    lastMeasurements: {
      fastLetterbox: {
        samples: [],
        currentIndex: 0,
      },
      edgeDetect: {
        samples: [],
        currentIndex: 0
      }
    }
  };

  //#endregion

  //#region getters
  get defaultAr() {
    const ratio = this.video.videoWidth / this.video.videoHeight;
    if (isNaN(ratio)) {
      return undefined;
    }
    return ratio;
  }

  //#endregion getters

  //#region debug getters

  //#endregion

  //#region lifecycle
  constructor(videoData){
    this.logger = videoData.logger;
    this.conf = videoData;
    this.video = videoData.video;
    this.settings = videoData.settings;
    this.eventBus = videoData.eventBus;

    this.initEventBus();

    this.sampleCols = [];

    this.blackLevel = this.settings.active.arDetect.blackbar.blackLevel;

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

  init(){
    this.logger.log('info', 'init', `[ArDetect::init] <@${this.arid}> Initializing autodetection.`);
    this.setup();
  }

  setup(cwidth?: number, cheight?: number){
    this.logger.log('info', 'init', `[ArDetect::setup] <@${this.arid}> Starting autodetection setup.`);
    //
    // [-1] check for zero-width and zero-height videos. If we detect this, we kick the proverbial
    //      can some distance down the road. This problem will prolly fix itself soon. We'll also
    //      not do any other setup until this issue is fixed
    //
    if (this.video.videoWidth === 0 || this.video.videoHeight === 0 ){
      this.logger.log('warn', 'debug', `[ArDetect::setup] <@${this.arid}> This video has zero width or zero height. Dimensions: ${this.video.videoWidth} × ${this.video.videoHeight}`);

      this.scheduleInitRestart();
      return;
    }

    //
    // [0] initiate "dependencies" first
    //

    this.guardLine = new GuardLine(this);
    this.edgeDetector = new EdgeDetect(this);
    // this.debugCanvas = new DebugCanvas(this);


    //
    // [1] initiate canvases
    //

    if (!cwidth) {
      cwidth = this.settings.active.arDetect.canvasDimensions.sampleCanvas.width;
      cheight = this.settings.active.arDetect.canvasDimensions.sampleCanvas.height;
    }

    if (this.canvas) {
      this.canvas.remove();
    }
    // if (this.blackframeCanvas) {
    //   this.blackframeCanvas.remove();
    // }

    // things to note: we'll be keeping canvas in memory only.
    this.canvas = document.createElement("canvas");
    this.canvas.width = cwidth;
    this.canvas.height = cheight;
    // this.blackframeCanvas = document.createElement("canvas");
    // this.blackframeCanvas.width = this.settings.active.arDetect.canvasDimensions.blackframeCanvas.width;
    // this.blackframeCanvas.height = this.settings.active.arDetect.canvasDimensions.blackframeCanvas.height;

    this.context = this.canvas.getContext("2d");
    // this.blackframeContext = this.blackframeCanvas.getContext("2d");


    //
    // [2] determine places we'll use to sample our main frame
    //

    let ncol = this.settings.active.arDetect.sampling.staticCols;
    let nrow = this.settings.active.arDetect.sampling.staticRows;

    let colSpacing = this.canvas.width / ncol;
    let rowSpacing = (this.canvas.height << 2) / nrow;

    this.sampleLines = [];
    this.sampleCols = [];

    for(let i = 0; i < ncol; i++){
      if(i < ncol - 1)
        this.sampleCols.push(Math.round(colSpacing * i));
      else{
        this.sampleCols.push(Math.round(colSpacing * i) - 1);
      }
    }

    for(let i = 0; i < nrow; i++){
      if(i < ncol - 5)
        this.sampleLines.push(Math.round(rowSpacing * i));
      else{
        this.sampleLines.push(Math.round(rowSpacing * i) - 4);
      }
    }

    //
    // [3] do other things setup needs to do
    //

    this.resetBlackLevel();

    // if we're restarting ArDetect, we need to do this in order to force-recalculate aspect ratio
    this.conf.resizer.lastAr = {type: AspectRatioType.AutomaticUpdate, ratio: this.defaultAr};

    this.canvasImageDataRowLength = cwidth << 2;

    this.start();

    if(Debug.debugCanvas.enabled){
      // this.debugCanvas.init({width: cwidth, height: cheight});
      // DebugCanvas.draw("test marker","test","rect", {x:5, y:5}, {width: 5, height: 5});
    }

    this.conf.arSetupComplete = true;
  }

  destroy(){
    this.logger.log('info', 'init', `%c[ArDetect::destroy] <@${this.arid}> Destroying aard.`, _ard_console_stop);
    // this.debugCanvas.destroy();
    this.halt();
  }
  //#endregion lifecycle

  //#region AARD control
  start() {
    if (this.conf.resizer.lastAr.type === AspectRatioType.AutomaticUpdate) {
      // ensure first autodetection will run in any case
      this.conf.resizer.lastAr = {type: AspectRatioType.AutomaticUpdate, ratio: this.defaultAr};
    }

    // start autodetection
    this.startLoop();
  }

  startLoop() {
    if (this.animationFrameHandle) {
      window.cancelAnimationFrame(this.animationFrameHandle);
    }

    this.status.aardActive = true;
    this.animationFrameHandle = window.requestAnimationFrame( (ts) => this.animationFrameBootstrap(ts));
    this.logger.log('info', 'debug', `"%c[ArDetect::startLoop] <@${this.arid}> AARD loop started.`, _ard_console_start);
  }

  stop() {
    this.status.aardActive = false;

    if (this.animationFrameHandle) {
      this.logger.log('info', 'debug', `"%c[ArDetect::stop] <@${this.arid}>  Stopping AnimationFrame loop.`, _ard_console_stop);
      window.cancelAnimationFrame(this.animationFrameHandle);
    } else {
      this.logger.log('info', 'debug', `"%c[ArDetect::stop] <@${this.arid}>  AnimationFrame loop is already paused (due to an earlier call of this function).`);
    }
  }

  unpause() {
    this.startLoop();
  }

  pause() {
    this.stop();
  }

  halt(){
    this.logger.log('info', 'debug', `"%c[ArDetect::stop] <@${this.arid}>  Halting automatic aspect ratio detection`, _ard_console_stop);
    this.stop();
  }

  setManualTick(manualTick) {
    this.manualTickEnabled = manualTick;
  }

  tick() {
    this._nextTick = true;
  }
  //#endregion

  //#region helper functions (general)

  isRunning(){
    return this.status.aardActive;
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

  private scheduleInitRestart(timeout?: number, force_reset?: boolean){
    if(! timeout){
      timeout = 100;
    }
    // don't allow more than 1 instance
    if(this.setupTimer){
      clearTimeout(this.setupTimer);
    }

    this.setupTimer = setTimeout( () => {
      this.setupTimer = null;
        try {
          this.start();
        } catch(e) {
          this.logger.log('error', 'debug', `[ArDetector::scheduleInitRestart] <@${this.arid}> Failed to start main(). Error:`, e);
        }
      },
      timeout
    );
  }

  private attachCanvas(canvas){
    if(this.attachedCanvas)
      this.attachedCanvas.remove();

    // todo: place canvas on top of the video instead of random location
    canvas.style.position = "absolute";
    canvas.style.left = "200px";
    canvas.style.top = "1200px";
    canvas.style.zIndex = 10000;

    document.getElementsByTagName("body")[0]
            .appendChild(canvas);
  }

  /**
   * Adds execution time sample for performance metrics
   * @param performanceObject
   * @param executionTime
   */
  private addPerformanceMeasurement(performanceObject) {
    this.performance.samples[this.performance.currentIndex] = performanceObject;
    this.performance.currentIndex = (this.performance.currentIndex + 1) % this.performance.maxSamples;

    if (performanceObject.fastLetterboxTime !== null) {
      const lastMeasurements = this.performance.lastMeasurements.fastLetterbox;
      lastMeasurements.samples[lastMeasurements.currentIndex] = performanceObject.fastLetterboxTime;
      lastMeasurements.currentIndex = (lastMeasurements.currentIndex + 1) % this.performance.maxSamples;
    }
    if (performanceObject.edgeDetectTime !== null) {
      const lastMeasurements = this.performance.lastMeasurements.edgeDetect;
      lastMeasurements.samples[lastMeasurements.currentIndex] = performanceObject.edgeDetectTime;
      lastMeasurements.currentIndex = (lastMeasurements.currentIndex + 1) & this.performance.maxSamples;
    }
  }

  //#endregion

  //#region helper functions (performance measurements)

  /**
   * Returns time ultrawidify spends on certain aspects of autodetection.
   *
   * The returned object contains the following:
   *
   *    eyeballedTimeBudget  — a very inaccurate time budget
   *    fps                  — framerate at which we run
   *    aardTime             — time spent on average frameCheck loop.
   *                           It's a nearly useless metric, because
   *                           frameCheck can exit very early.
   *    drawWindowTime       — how much time browser spends on executing
   *                           drawWindow() calls.
   *    getImageData         — how much time browser spends on executing
   *                           getImageData() calls.
   *
   * Most of these are on "per frame" basis and averaged.
   */
  handlePerformanceDataRequest() {
    let imageDrawCount = 0;
    let blackFrameDrawCount = 0;
    let blackFrameProcessCount = 0;
    let fastLetterboxCount = 0;
    let edgeDetectCount = 0;

    let fastLetterboxExecCount = 0;
    let edgeDetectExecCount = 0;

    let imageDrawAverage = 0;
    let blackFrameDrawAverage = 0;
    let blackFrameProcessAverage = 0;
    let fastLetterboxAverage = 0;
    let edgeDetectAverage = 0;

    let imageDrawWorst = 0;
    let blackFrameDrawWorst = 0;
    let blackFrameProcessWorst = 0;
    let fastLetterboxWorst = 0;
    let edgeDetectWorst = 0;

    let imageDrawStDev = 0;
    let blackFrameDrawStDev = 0;
    let blackFrameProcessStDev = 0;
    let fastLetterboxStDev = 0;
    let edgeDetectStDev = 0;

    let totalAverage = 0;
    let totalWorst = 0;
    let totalStDev = 0;

    let theoreticalAverage = 0;
    let theoreticalWorst = 0;
    let theoreticalStDev = 0;

    for (const sample of this.performance.samples) {
      if (sample.imageDrawTime) {
        imageDrawCount++;
        imageDrawAverage += sample.imageDrawTime;
        if (sample.imageDrawTime > imageDrawWorst) {
          imageDrawWorst = sample.imageDrawTime;
        }
      }
      if (sample.blackFrameDrawTime) {
        blackFrameDrawCount++;
        blackFrameDrawAverage += sample.blackFrameDrawTime;
        if (sample.blackFrameDrawTime > blackFrameDrawWorst) {
          blackFrameDrawWorst = sample.blackFrameDrawTime;
        }
      }
      if (sample.blackFrameProcessTime) {
        blackFrameProcessCount++;
        blackFrameProcessAverage += sample.blackFrameProcessTime;
        if (sample.blackFrameProcessTime > blackFrameProcessWorst) {
          blackFrameProcessWorst = sample.blackFrameProcessTime;
        }
      }
      if (sample.fastLetterboxTime) {
        fastLetterboxExecCount++;
      }
      if (sample.edgeDetectTime) {
        edgeDetectExecCount++;
      }

      const execTime =
        sample.imageDrawTime ?? 0
        + sample.blackFrameDrawTime ?? 0
        + sample.blackFrameProcessTime ?? 0
        + sample.fastLetterboxTime ?? 0
        + sample.edgeDetectTime ?? 0;

      totalAverage += execTime;
      if (execTime > totalWorst) {
        totalWorst = execTime;
      }

      const partialExecTime =
        sample.imageDrawTime ?? 0
        + sample.blackFrameDrawTime ?? 0
        + sample.blackFrameProcessTime ?? 0;

      if (partialExecTime > theoreticalWorst) {
        theoreticalWorst = partialExecTime;
      }
    }

    if (imageDrawCount) {
      imageDrawAverage /= imageDrawCount;
    } else {
      imageDrawAverage = 0;
    }
    if (blackFrameDrawCount) {
      blackFrameDrawAverage /= blackFrameDrawCount;
    } else {
      blackFrameDrawAverage = 0;
    }
    if (blackFrameProcessCount) {
      blackFrameProcessAverage /= blackFrameProcessCount;
    } else {
      blackFrameProcessAverage = 0;
    }
    if (this.performance.samples.length) {
      totalAverage /= this.performance.samples.length;
    } else {
      totalAverage = 0;
    }

    theoreticalAverage = imageDrawAverage + blackFrameDrawAverage + blackFrameProcessAverage;

    for (const sample of this.performance.lastMeasurements.fastLetterbox.samples) {
      fastLetterboxAverage += sample;
      if (sample > fastLetterboxWorst) {
        fastLetterboxWorst = sample;
      }
    }
    for (const sample of this.performance.lastMeasurements.edgeDetect.samples) {
      edgeDetectAverage += sample;
      if (sample > edgeDetectWorst) {
        edgeDetectWorst = sample;
      }
    }
    fastLetterboxCount = this.performance.lastMeasurements.fastLetterbox.samples.length;
    edgeDetectCount = this.performance.lastMeasurements.edgeDetect.samples.length;

    if (fastLetterboxCount) {
      fastLetterboxAverage /= fastLetterboxCount;
    } else {
      fastLetterboxAverage = 0;
    }
    if (edgeDetectCount) {
      edgeDetectAverage /= edgeDetectCount;
    } else {
      edgeDetectAverage = 0;
    }

    theoreticalWorst += fastLetterboxWorst + edgeDetectWorst;
    theoreticalAverage += fastLetterboxAverage + edgeDetectAverage;

    for (const sample of this.performance.samples) {
      if (sample.imageDrawTime) {
        imageDrawStDev += Math.pow((sample.imageDrawTime - imageDrawAverage), 2);
      }
      if (sample.blackFrameDrawTime) {
        blackFrameDrawStDev += Math.pow((sample.blackFrameDrawTime - blackFrameDrawAverage), 2);
      }
      if (sample.blackFrameProcessTime) {
        blackFrameProcessStDev += Math.pow((sample.blackFrameProcessTime - blackFrameProcessAverage), 2);
      }

      const execTime =
        sample.imageDrawTime ?? 0
        + sample.blackFrameDrawTime ?? 0
        + sample.blackFrameProcessTime ?? 0
        + sample.fastLetterboxTime ?? 0
        + sample.edgeDetectTime ?? 0;

      totalStDev += Math.pow((execTime - totalAverage), 2);
    }
    for (const sample of this.performance.lastMeasurements.fastLetterbox.samples) {
      fastLetterboxStDev += Math.pow((sample - fastLetterboxAverage), 2);
    }
    for (const sample of this.performance.lastMeasurements.edgeDetect.samples) {
      edgeDetectStDev += Math.pow((sample - edgeDetectAverage), 2);
    }

    if (imageDrawCount < 2) {
      imageDrawStDev = 0;
    } else {
      imageDrawStDev = Math.sqrt(imageDrawStDev / (imageDrawCount - 1));
    }

    if (blackFrameDrawCount < 2) {
      blackFrameDrawStDev = 0;
    } else {
      blackFrameDrawStDev = Math.sqrt(blackFrameDrawStDev / (blackFrameDrawCount - 1));
    }

    if (blackFrameProcessCount < 2) {
      blackFrameProcessStDev = 0;
    } else {
      blackFrameProcessStDev = Math.sqrt(blackFrameProcessStDev / (blackFrameProcessCount - 1));
    }

    if (fastLetterboxCount < 2) {
      fastLetterboxStDev = 0;
    } else {
      fastLetterboxStDev = Math.sqrt(fastLetterboxStDev / (fastLetterboxCount - 1));
    }

    if (edgeDetectCount < 2) {
      edgeDetectStDev = 0;
    } else {
      edgeDetectStDev = Math.sqrt(edgeDetectStDev / (edgeDetectCount - 1));
    }

    if (this.performance.samples.length < 2) {
      totalStDev = 0;
    } else {
      totalStDev = Math.sqrt(totalStDev / (this.performance.samples.length - 1));
    }


    const res: AardPerformanceData = {
      total: {
        sampleCount: this.performance.samples.length,
        averageTime: totalAverage,
        worstTime: totalWorst,
        stDev: totalStDev,
      },
      theoretical: {
        sampleCount: -1,
        averageTime: theoreticalAverage,
        worstTime: theoreticalWorst,
        stDev: theoreticalStDev
      },
      imageDraw: {
        sampleCount: imageDrawCount,
        averageTime: imageDrawAverage,
        worstTime: imageDrawWorst,
        stDev: imageDrawStDev
      },
      blackFrameDraw: {
        sampleCount: blackFrameDrawCount,
        averageTime: blackFrameDrawAverage,
        worstTime: blackFrameDrawWorst,
        stDev: blackFrameDrawStDev,
      },
      blackFrame: {
        sampleCount: blackFrameProcessCount,
        averageTime: blackFrameProcessAverage,
        worstTime: blackFrameProcessWorst,
        stDev: blackFrameProcessStDev
      },
      fastLetterbox: {
        sampleCount: fastLetterboxCount,
        averageTime: fastLetterboxAverage,
        worstTime: fastLetterboxWorst,
        stDev: fastLetterboxStDev
      },
      edgeDetect: {
        sampleCount: edgeDetectCount,
        averageTime: edgeDetectAverage,
        worstTime: edgeDetectWorst,
        stDev: edgeDetectStDev
      },

      imageDrawCount,
      blackFrameDrawCount,
      blackFrameCount: blackFrameProcessCount,
      fastLetterboxCount,
      edgeDetectCount,
      aardActive: this.status.aardActive,
    }

    this.eventBus.send('uw-config-broadcast', {type: 'aard-performance-data', performanceData: res});
  }
  //#endregion

  /**
   * This is the "main loop" for aspect ratio autodetection
   */
  private async animationFrameBootstrap(timestamp: number) {
    // this.logger.log('info', 'arDetect_verbose', `[ArDetect::animationFrameBootstrap] <@${this.arid}>  New animation frame.\nmanualTickEnabled: ${!this.manualTickEnabled}\ncan trigger frame check? ${this.canTriggerFrameCheck()}\nnext tick? ${this._nextTick}\n => (a&b | c) => Can we do tick? ${ (!this.manualTickEnabled && this.canTriggerFrameCheck()) || this._nextTick}\n\ncan we continue running? ${this && !this._halted && !this._paused}`);

    // do timekeeping first

    // trigger frame check, if we're allowed to
    if ( (!this.manualTickEnabled && this.canTriggerFrameCheck()) || this._nextTick) {
      this.logger.log('info', 'arDetect_verbose', `[ArDetect::animationFrameBootstrap] <@${this.arid}>  Processing next tick.`);

      this._nextTick = false;

      try {
        await this.frameCheck();
      } catch (e) {
        this.logger.log('error', 'debug', `%c[ArDetect::animationFrameBootstrap] <@${this.arid}>  Frame check failed:`,  "color: #000, background: #f00", e);
      }
    }

    // if (this && !this._halted && !this._paused) {
      this.animationFrameHandle = window.requestAnimationFrame( (ts) => this.animationFrameBootstrap(ts));
    // } else {
    //   this.logger.log('info', 'debug', `[ArDetect::animationFrameBootstrap] <@${this.arid}>  Not renewing animation frame for some reason. Paused? ${this._paused}; Halted?: ${this._halted}, Exited?: ${this._exited}`);
    // }
  }

  calculateArFromEdges(edges) {
    // if we don't specify these things, they'll have some default values.
    if(edges.top === undefined){
      edges.top = 0;
      edges.bottom = 0;
      edges.left = 0;     // RESERVED FOR FUTURE — CURRENTLY UNUSED
      edges.right = 0;    // THIS FUNCTION CAN PRESENTLY ONLY HANDLE LETTERBOX
    }

    let letterbox = edges.top + edges.bottom;

    // Since video is stretched to fit the canvas, we need to take that into account when calculating target
    // aspect ratio and correct our calculations to account for that

    const fileAr = this.video.videoWidth / this.video.videoHeight;
    const canvasAr = this.canvas.width / this.canvas.height;
    let widthCorrected;

    if (edges.top && edges.bottom) {
      // in case of letterbox, we take canvas height as canon and assume width got stretched or squished

      if (fileAr != canvasAr) {
        widthCorrected = this.canvas.height * fileAr;
      } else {
        widthCorrected = this.canvas.width;
      }

      return widthCorrected / (this.canvas.height - letterbox);
    }
  }

  processAr(trueAr){
    if (!this.isRunning()) {
      this.logger.log('warn', 'debug', `[ArDetect::processAr] <@${this.arid}> Trying to change aspect ratio while AARD is paused.`);
      return;
    }

    // check if aspect ratio is changed:
    let lastAr = this.conf.resizer.lastAr;
    if (lastAr.type === AspectRatioType.AutomaticUpdate && lastAr.ratio !== null && lastAr.ratio !== undefined){
      // we can only deny aspect ratio changes if we use automatic mode and if aspect ratio was set from here.

      let arDiff = trueAr - lastAr.ratio;

      if (arDiff < 0)
        arDiff = -arDiff;

      const arDiff_percent = arDiff / trueAr;

      // is ar variance within acceptable levels? If yes -> we done
      this.logger.log('info', 'arDetect', `%c[ArDetect::processAr] <@${this.arid}>  New aspect ratio varies from the old one by this much:\n`,"color: #aaf","old Ar", lastAr.ratio, "current ar", trueAr, "arDiff (absolute):",arDiff,"ar diff (relative to new ar)", arDiff_percent);

      if (arDiff < trueAr * this.settings.active.arDetect.allowedArVariance){
        this.logger.log('info', 'arDetect', `%c[ArDetect::processAr] <@${this.arid}>  Aspect ratio change denied — diff %: ${arDiff_percent}`, "background: #740; color: #fa2");
        return;
      }
      this.logger.log('info', 'arDetect', `%c[ArDetect::processAr] <@${this.arid}>  aspect ratio change accepted — diff %: ${arDiff_percent}`, "background: #153; color: #4f9");
    }
    this.logger.log('info', 'debug', `%c[ArDetect::processAr] <@${this.arid}>  Triggering aspect ratio change. New aspect ratio: ${trueAr}`, _ard_console_change);

    this.conf.resizer.updateAr({type: AspectRatioType.AutomaticUpdate, ratio: trueAr});
  }

  clearImageData(id) {
    if ((ArrayBuffer as any).transfer) {
      (ArrayBuffer as any).transfer(id, 0);
    }
    id = undefined;
  }


  async frameCheck(){
    this.logger.log('info', 'arDetect_verbose',  `%c[ArDetect::processAr] <@${this.arid}> Starting frame check.`);

    const timerResults = {
      imageDrawTime: null,
      blackFrameDrawTime: null,
      blackFrameProcessTime: null,
      fastLetterboxTime: null,
      edgeDetectTime: null
    }

    if (!this.video) {
      this.logger.log('error', 'debug', `%c[ArDetect::frameCheck] <@${this.arid}>  Video went missing. Destroying current instance of videoData.`);
      this.conf.destroy();
      return;
    }

    if (!this.blackframeContext) {
      this.init();
    }

    let sampleCols = this.sampleCols.slice(0);



    let startTime = performance.now();
    await new Promise<void>(
      resolve => {
        this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        resolve();
      }
    )
    const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
    timerResults.imageDrawTime = performance.now() - startTime;

    startTime = performance.now();

    const bfAnalysis = await this.blackframeTest(imageData);

    timerResults.blackFrameProcessTime = performance.now() - startTime;

    if (bfAnalysis.isBlack) {
      // we don't do any corrections on frames confirmed black
      this.logger.log('info', 'arDetect_verbose', `%c[ArDetect::frameCheck] Black frame analysis suggests this frame is black or too dark. Doing nothing.`, "color: #fa3", bfAnalysis);
      this.addPerformanceMeasurement(timerResults);
      return;
    }

    const fastLetterboxTestRes = this.fastLetterboxPresenceTest(imageData, sampleCols);
    timerResults.fastLetterboxTime = performance.now() - startTime;

    if (! fastLetterboxTestRes) {
      // If we don't detect letterbox, we reset aspect ratio to aspect ratio of the video file. The aspect ratio could
      // have been corrected manually. It's also possible that letterbox (that was there before) disappeared.
      this.conf.resizer.updateAr({type: AspectRatioType.AutomaticUpdate, ratio: this.defaultAr});
      this.guardLine.reset();

      this.logger.log('info', 'arDetect_verbose', `%c[ArDetect::frameCheck] Letterbox not detected in fast test. Letterbox is either gone or we manually corrected aspect ratio. Nothing will be done.`, "color: #fa3");

      this.clearImageData(imageData);
      this.addPerformanceMeasurement(timerResults);
      return;
    }

    // let's check if we're cropping too much
    const guardLineOut = this.guardLine.check(imageData);

    // if both succeed, then aspect ratio hasn't changed.
    // otherwise we continue. We add blackbar violations to the list of the cols we'll sample and sort them
    if (!guardLineOut.imageFail && !guardLineOut.blackbarFail) {
      this.logger.log('info', 'arDetect_verbose', `%c[ArDetect::frameCheck] guardLine tests were successful. (no imagefail and no blackbarfail)\n`, "color: #afa", guardLineOut);
      this.clearImageData(imageData);
      this.addPerformanceMeasurement(timerResults);
      return;
    } else {
      if (guardLineOut.blackbarFail) {
        sampleCols.concat(guardLineOut.offenders).sort(
          (a: number, b: number) => a - b
        );
      }
    }

    // If aspect ratio changes from narrower to wider, we first check for presence of pillarbox. Presence of pillarbox indicates
    // a chance of a logo on black background. We could cut easily cut too much. Because there's a somewhat significant chance
    // that we will cut too much, we rather avoid doing anything at all. There's gonna be a next chance.
    try{
      if (guardLineOut.blackbarFail || guardLineOut.imageFail) {
        startTime = performance.now();
        const edgeDetectRes = this.edgeDetector.findBars(imageData, null, EdgeDetectPrimaryDirection.Horizontal);
        timerResults.edgeDetectTime = performance.now() - startTime;

        if(edgeDetectRes.status === 'ar_known'){
          if(guardLineOut.blackbarFail){
            this.logger.log('info', 'arDetect', `[ArDetect::frameCheck] Detected blackbar violation and pillarbox. Resetting to default aspect ratio.`);
            this.conf.resizer.setAr({type: AspectRatioType.AutomaticUpdate, ratio: this.defaultAr});
            this.guardLine.reset();
          } else {
            this.logger.log('info', 'arDetect_verbose', `[ArDetect::frameCheck] Guardline failed, blackbar didn't, and we got pillarbox. Doing nothing.`);
          }

          this.clearImageData(imageData);
          this.addPerformanceMeasurement(timerResults);
          return;
        }
      }
    } catch(e) {
      this.logger.log('info', 'arDetect', `[ArDetect::frameCheck] something went wrong while checking for pillarbox. Error:\n`, e);
    }

    startTime = performance.now();
    let edgePost = this.edgeDetector.findBars(imageData, sampleCols, EdgeDetectPrimaryDirection.Vertical, EdgeDetectQuality.Improved, guardLineOut, bfAnalysis);
    timerResults.edgeDetectTime = performance.now() - startTime;

    this.logger.log('info', 'arDetect_verbose', `%c[ArDetect::frameCheck] edgeDetector returned this\n`,  "color: #aaf", edgePost);

    if (edgePost.status !== EdgeStatus.ARKnown){
      // no edge was detected. Let's leave things as they were
      this.logger.log('info', 'arDetect_verbose', `%c[ArDetect::frameCheck] Edge wasn't detected with findBars`, "color: #fa3", edgePost, "EdgeStatus.AR_KNOWN:", EdgeStatus.ARKnown);

      this.clearImageData(imageData);
      this.addPerformanceMeasurement(timerResults);
      return;
    }

    let newAr = this.calculateArFromEdges(edgePost);

    this.logger.log('info', 'arDetect_verbose', `%c[ArDetect::frameCheck] Triggering aspect ration change! new ar: ${newAr}`, "color: #aaf");

    // we also know edges for guardline, so set them. If edges are okay and not invalid, we also
    // allow automatic aspect ratio correction. If edges
    // are bogus, we keep aspect ratio unchanged.
    try {
      // throws error if top/bottom are invalid
      this.guardLine.setBlackbar({top: edgePost.guardLineTop, bottom: edgePost.guardLineBottom});

      this.processAr(newAr);
    } catch (e) {
      // edges weren't gucci, so we'll just reset
      // the aspect ratio to defaults
      this.logger.log('error', 'arDetect', `%c[ArDetect::frameCheck] There was a problem setting blackbar. Doing nothing. Error:`, e);

      try {
        this.guardLine.reset();
      } catch (e) {
        // no guardline, no biggie
      }
      // WE DO NOT RESET ASPECT RATIO HERE IN CASE OF PROBLEMS, CAUSES UNWARRANTED RESETS:
      // (eg. here: https://www.youtube.com/watch?v=nw5Z93Yt-UQ&t=410)
      //
      // this.conf.resizer.setAr({type: AspectRatioType.AutomaticUpdate, ratio: this.defaultAr});
    }

    this.addPerformanceMeasurement(timerResults);
    this.clearImageData(imageData);
  }

  resetBlackLevel(){
    this.blackLevel = this.settings.active.arDetect.blackbar.blackLevel;
  }

  async blackframeTest(imageData) {
    if (this.blackLevel === undefined) {
      this.logger.log('info', 'arDetect_verbose', "[ArDetect::blackframeTest] black level undefined, resetting");
      this.resetBlackLevel();
    }

    /**
     * Performs a quick black frame test
     */
    const bfDrawStartTime = performance.now();

    // await new Promise<void>(
    //   resolve => {
    //     this.blackframeContext.drawImage(this.video, 0, 0, this.blackframeCanvas.width, this.blackframeCanvas.height);
    //     resolve();
    //   }
    // );
    // const rows = this.blackframeCanvas.height;
    // const cols = this.blackframeCanvas.width;
    // const bfImageData = this.blackframeContext.getImageData(0, 0, cols, rows).data;

    const rows = this.settings.active.arDetect.canvasDimensions.blackframeCanvas.width;
    const cols = this.settings.active.arDetect.canvasDimensions.blackframeCanvas.height;
    const samples = rows * cols;

    const blackFrameDrawTime = performance.now() - bfDrawStartTime;
    const bfProcessStartTime = performance.now();

    const pixels = rows * cols;
    let cumulative_r = 0, cumulative_g = 0, cumulative_b = 0;
    let max_r = 0, max_g = 0, max_b = 0;
    let avg_r, avg_g, avg_b;
    let var_r = 0, var_g = 0, var_b = 0;

    let pixelMax = 0;
    let cumulativeValue = 0;
    let blackPixelCount = 0;
    const blackThreshold = this.blackLevel + this.settings.active.arDetect.blackbar.frameThreshold;

    const actualPixels = imageData.length / 4;

    // generate some random points that we'll use for sampling black frame.
    const sampleArray = new Array(samples);
    for (let i = 0; i < samples; i++) {
      sampleArray[i] = Math.round(Math.random() * actualPixels);
    }

    // we do some recon for letterbox and pillarbox. While this can't determine whether letterbox/pillarbox exists
    // with sufficient level of certainty due to small sample resolution, it can still give us some hints for later
    let rowMax = new Array(rows).fill(0);
    let colMax = new Array(cols).fill(0);

    let r: number, c: number;

    for (const i of sampleArray) {
      pixelMax = Math.max(imageData[i], imageData[i+1], imageData[i+2]);
      imageData[i+3] = pixelMax;

      if (pixelMax < blackThreshold) {
        if (pixelMax < this.blackLevel) {
          this.blackLevel = pixelMax;
        }
        blackPixelCount++;
      } else {
        cumulativeValue += pixelMax;
        cumulative_r += imageData[i];
        cumulative_g += imageData[i+1];
        cumulative_b += imageData[i+2];

        max_r = max_r > imageData[i]   ? max_r : imageData[i];
        max_g = max_g > imageData[i+1] ? max_g : imageData[i+1];
        max_b = max_b > imageData[i+2] ? max_b : imageData[i+2];
      }

      r = ~~(i/rows);
      c = i % cols;

      if (pixelMax > rowMax[r]) {
        rowMax[r] = pixelMax;
      }
      if (pixelMax > colMax[c]) {
        colMax[c] = colMax;
      }
    }

    max_r = 1 / (max_r || 1);
    max_g = 1 / (max_g || 1);
    max_b = 1 / (max_b || 1);

    const imagePixels = pixels - blackPixelCount;
    // calculate averages and normalize them
    avg_r = (cumulative_r / imagePixels) * max_r;
    avg_g = (cumulative_g / imagePixels) * max_g;
    avg_b = (cumulative_b / imagePixels) * max_b;

    // second pass for color variance
    for (let i = 0; i < imageData.length; i+= 4) {
      if (imageData[i+3] >= this.blackLevel) {
        var_r += Math.abs(avg_r - imageData[i] * max_r);
        var_g += Math.abs(avg_g - imageData[i+1] * max_g);
        var_b += Math.abs(avg_b - imageData[i+1] * max_b);
      }
    }

    const hasSufficientVariance = Math.abs(var_r - var_g) / Math.max(var_r, var_g, 1) > this.settings.active.arDetect.blackframe.sufficientColorVariance
                                  || Math.abs(var_r - var_b) / Math.max(var_r, var_b, 1) > this.settings.active.arDetect.blackframe.sufficientColorVariance
                                  || Math.abs(var_b - var_g) / Math.max(var_b, var_g, 1) > this.settings.active.arDetect.blackframe.sufficientColorVariance

    let isBlack = (blackPixelCount/(cols * rows) > this.settings.active.arDetect.blackframe.blackPixelsCondition);

    if (! isBlack) {
      if (hasSufficientVariance) {
        isBlack = cumulativeValue < this.settings.active.arDetect.blackframe.cumulativeThresholdLax;
      } else {
        isBlack = cumulativeValue < this.settings.active.arDetect.blackframe.cumulativeThresholdStrict;
      }
    }

    if (Debug.debug) {
      return {
        isBlack: isBlack,
        blackPixelCount: blackPixelCount,
        blackPixelRatio: (blackPixelCount/(cols * rows)),
        cumulativeValue: cumulativeValue,
        hasSufficientVariance: hasSufficientVariance,
        blackLevel: this.blackLevel,
        variances: {
          raw: {
            r: var_r, g: var_g, b: var_b
          },
          relative: {
            rg: Math.abs(var_r - var_g) / Math.max(var_r, var_g, 1),
            rb: Math.abs(var_r - var_b) / Math.max(var_r, var_b, 1),
            gb: Math.abs(var_b - var_g) / Math.max(var_b, var_g, 1),
          },
          relativePercent: {
            rg: Math.abs(var_r - var_g) / Math.max(var_r, var_g, 1) / this.settings.active.arDetect.blackframe.sufficientColorVariance,
            rb: Math.abs(var_r - var_b) / Math.max(var_r, var_b, 1) / this.settings.active.arDetect.blackframe.sufficientColorVariance,
            gb: Math.abs(var_b - var_g) / Math.max(var_b, var_g, 1) / this.settings.active.arDetect.blackframe.sufficientColorVariance,
          },
          varianceLimit: this.settings.active.arDetect.blackframe.sufficientColorVariance,
        },
        cumulativeValuePercent: cumulativeValue / (hasSufficientVariance ? this.settings.active.arDetect.blackframe.cumulativeThresholdLax : this.settings.active.arDetect.blackframe.cumulativeThresholdStrict),
        rowMax: rowMax,
        colMax: colMax,
      };
    }

    const blackFrameProcessTime = performance.now() - bfProcessStartTime;
    // TODO: update processing time statistics

    return {
      isBlack: isBlack,
      rowMax: rowMax,
      colMax: colMax,
      processingTime: {
        blackFrameDrawTime,
        blackFrameProcessTime,
      }
    };
  }

  /**
   * Does a quick test to see if the aspect ratio is correct
   * Returns 'true' if there's a chance of letterbox existing, false if not.
   * @param imageData
   * @param sampleCols
   * @returns
   */
  fastLetterboxPresenceTest(imageData, sampleCols) {
    // fast test to see if aspect ratio is correct.
    // returns 'true'  if presence of letterbox is possible.
    // returns 'false' if we found a non-black edge pixel.

    // If we detect anything darker than blackLevel, we modify blackLevel to the new lowest value
    const rowOffset = this.canvas.width * (this.canvas.height - 1);
    let currentMin = 255, currentMax = 0, colOffset_r, colOffset_g, colOffset_b, colOffset_rb, colOffset_gb, colOffset_bb, blthreshold = this.settings.active.arDetect.blackbar.threshold;

    // detect black level. if currentMax comes above blackbar + blackbar threshold, we know we aren't letterboxed

    for (let i = 0; i < sampleCols.length; ++i){
      colOffset_r = sampleCols[i] << 2;
      colOffset_g = colOffset_r + 1;
      colOffset_b = colOffset_r + 2;
      colOffset_rb = colOffset_r + rowOffset;
      colOffset_gb = colOffset_g + rowOffset;
      colOffset_bb = colOffset_b + rowOffset;

      currentMax = Math.max(
        imageData[colOffset_r],  imageData[colOffset_g],  imageData[colOffset_b],
        // imageData[colOffset_rb], imageData[colOffset_gb], imageData[colOffset_bb],
        currentMax
      );

      if (currentMax > this.blackLevel + blthreshold) {
        // we search no further
        if (currentMin < this.blackLevel) {
          this.blackLevel = currentMin;
        }
        return false;
      }

      currentMin = Math.min(
        currentMax,
        currentMin
      );
    }



    if (currentMin < this.blackLevel) {
      this.blackLevel = currentMin
    }

    return true;
  }

}

let _ard_console_stop = "background: #000; color: #f41";
let _ard_console_start = "background: #000; color: #00c399";
let _ard_console_change = "background: #000; color: #ff8";

export default ArDetector;
