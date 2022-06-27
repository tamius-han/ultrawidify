
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

enum VideoPlaybackState {
  Playing,
  Paused,
  Ended,
  Error
}

class ArDetector {
  logger: Logger;
  conf: VideoData;
  video: HTMLVideoElement;
  settings: Settings;

  guardLine: GuardLine;
  edgeDetector: EdgeDetect;

  setupTimer: any;
  sampleCols: any[];
  sampleLines

  canFallback: boolean = true;

  blackLevel: number;

  arid: string;

  // ar detector starts in this state. running main() sets both to false
  _ready: boolean = false;
  _paused: boolean;
  _halted: boolean = true;
  _exited: boolean = true;

  private manualTickEnabled: boolean;
  _nextTick: boolean;

  // helper objects
  private animationFrameHandle: any;
  private attachedCanvas: HTMLCanvasElement;
  canvas: HTMLCanvasElement;
  private blackframeCanvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private blackframeContext: CanvasRenderingContext2D;
  private canvasScaleFactor: number;
  private detectionTimeoutEventCount: number;
  canvasImageDataRowLength: number;
  private noLetterboxCanvasReset: boolean;
  private detectedAr: any;
  private canvasDrawWindowHOffset: number;
  private sampleCols_current: number;
  private timers = {
    nextFrameCheckTime: Date.now()
  }
  private status = {
    lastVideoStatus: VideoPlaybackState.Playing
  }

  //#region debug variables
  private performanceConfig = {
    sampleCountForAverages: 32
  }
  private performance = {
    animationFrame: {
      lastTime: 0,
      currentIndex: 0,
      sampleTime: []
    },
    drawImage: {
      currentIndex: 0,
      sampleTime: [],
    },
    getImageData: {
      currentIndex: 0,
      sampleTime: [],
    },
    aard: {
      currentIndex: 0,
      sampleTime: [],
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

  /**
   * We get one animation frame per this many ms. This means that our autodetection
   * stuff must run in less than this many ms. This valuz is averaged out over multiple
   * samples for better accuracy.
   *
   * Returns value in ms.
   *
   * A very important caveat: if autodetection takes up too much time, it WILL artificially
   * increase time budget. Therefore, you should use (and firstly even implement) getTimeBudget()
   * that turns off autodetection for a second or so to gather accurate timing info.
   */
   get eyeballedTimeBudget() {
    let sum;
    for (let i = 0; i < this.performance.animationFrame.sampleTime.length; i++) {
      sum += this.performance.animationFrame.sampleTime[i];
    }

    return sum / this.performance.animationFrame.sampleTime.length;
  }

  /**
   * Converts time budget (eyeballed) into actual framerate. Since eyeballed time budget rises
   * if our autodetection takes too long, it's still good enough for calculating framerate
   */
  get fps() {
    return 1000 / this.eyeballedTimeBudget;
  }

  //#endregion

  //#region lifecycle
  constructor(videoData){
    this.logger = videoData.logger;
    this.conf = videoData;
    this.video = videoData.video;
    this.settings = videoData.settings;

    this.sampleCols = [];

    this.blackLevel = this.settings.active.arDetect.blackbar.blackLevel;

    this.arid = (Math.random()*100).toFixed();

    // we can tick manually, for debugging
    this.logger.log('info', 'init', `[ArDetector::ctor] creating new ArDetector. arid: ${this.arid}`);
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
    if (this.blackframeCanvas) {
      this.blackframeCanvas.remove();
    }

    // things to note: we'll be keeping canvas in memory only.
    this.canvas = document.createElement("canvas");
    this.canvas.width = cwidth;
    this.canvas.height = cheight;
    this.blackframeCanvas = document.createElement("canvas");
    this.blackframeCanvas.width = this.settings.active.arDetect.canvasDimensions.blackframeCanvas.width;
    this.blackframeCanvas.height = this.settings.active.arDetect.canvasDimensions.blackframeCanvas.height;

    this.context = this.canvas.getContext("2d");
    this.blackframeContext = this.blackframeCanvas.getContext("2d");


    // do setup once
    // tho we could do it for every frame
    this.canvasScaleFactor = cheight / this.video.videoHeight;


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

    this.detectionTimeoutEventCount = 0;
    this.resetBlackLevel();

    // if we're restarting ArDetect, we need to do this in order to force-recalculate aspect ratio
    this.conf.resizer.setLastAr({type: AspectRatioType.AutomaticUpdate, ratio: this.defaultAr});

    this.canvasImageDataRowLength = cwidth << 2;
    this.noLetterboxCanvasReset = false;

    this._ready = true;
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

    if (!this._ready) {
      this.init();
      return;         // we will return to this function once initialization is complete
    }

    if (this.conf.resizer.lastAr.type === AspectRatioType.AutomaticUpdate) {
      // ensure first autodetection will run in any case
      this.conf.resizer.setLastAr({type: AspectRatioType.AutomaticUpdate, ratio: this.defaultAr});
    }

    // start autodetection
    this.startLoop();

    // automatic detection starts halted. If halted=false when main first starts, extension won't run
    // this._paused is undefined the first time we run this function, which is effectively the same thing
    // as false. Still, we'll explicitly fix this here.
  }

  startLoop() {
    if (this.animationFrameHandle) {
      window.cancelAnimationFrame(this.animationFrameHandle);
    }

    this.animationFrameHandle = window.requestAnimationFrame( (ts) => this.animationFrameBootstrap(ts));
    this.logger.log('info', 'debug', `"%c[ArDetect::startLoop] <@${this.arid}> AARD loop started.`, _ard_console_start);
  }

  stop() {
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
    return ! (this._halted || this._paused || this._exited);
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
    if (this._paused || this._halted || this._exited) {
      return false;
    }

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

  private canvasReadyForDrawWindow(){
    this.logger.log('info', 'debug', `%c[ArDetect::canvasReadyForDrawWindow] <@${this.arid}> canvas is ${this.canvas.height === window.innerHeight ? '' : 'NOT '}ready for drawWindow(). Canvas height: ${this.canvas.height}px; window inner height: ${window.innerHeight}px.`)

    return this.canvas.height == window.innerHeight
  }

  /**
   * Adds execution time sample for performance metrics
   * @param performanceObject
   * @param executionTime
   */
  private addPerformanceTimeMeasure(performanceObject, executionTime) {
    performanceObject.sampleTime[performanceObject.currentIndex] = executionTime;
    performanceObject.currentIndex = (performanceObject.currentIndex + 1) % this.performanceConfig.sampleCountForAverages;
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
  getTimings() {
    let drawWindowTime = 0, getImageDataTime = 0, aardTime = 0;

    // drawImage and getImageData are of same length and use same everything
    for (let i = 0; i < this.performance.drawImage.sampleTime.length; i++) {
      drawWindowTime += this.performance.drawImage.sampleTime[i] ?? 0;
      getImageDataTime += this.performance.getImageData.sampleTime[i] ?? 0;
    }
    drawWindowTime /= this.performance.drawImage.sampleTime.length;
    getImageDataTime /= this.performance.getImageData.sampleTime.length;

    return {
      eyeballedTimeBudget: this.eyeballedTimeBudget,
      fps: this.fps,
      drawWindowTime,
      getImageDataTime
    }
  }
  //#endregion

  /**
   * This is the "main loop" for aspect ratio autodetection
   */
  private async animationFrameBootstrap(timestamp: number) {
    // this.logger.log('info', 'arDetect_verbose', `[ArDetect::animationFrameBootstrap] <@${this.arid}>  New animation frame.\nmanualTickEnabled: ${!this.manualTickEnabled}\ncan trigger frame check? ${this.canTriggerFrameCheck()}\nnext tick? ${this._nextTick}\n => (a&b | c) => Can we do tick? ${ (!this.manualTickEnabled && this.canTriggerFrameCheck()) || this._nextTick}\n\ncan we continue running? ${this && !this._halted && !this._paused}`);

    // do timekeeping first
    this.addPerformanceTimeMeasure(this.performance.animationFrame, timestamp - this.performance.animationFrame.lastTime);
    this.performance.animationFrame.lastTime = timestamp;

    // trigger frame check, if we're allowed to
    if ( (!this.manualTickEnabled && this.canTriggerFrameCheck()) || this._nextTick) {
      this.logger.log('info', 'arDetect_verbose', `[ArDetect::animationFrameBootstrap] <@${this.arid}>  Processing next tick.`);

      this._nextTick = false;

      try {
        const startTime = performance.now();
        await this.frameCheck();
        this.addPerformanceTimeMeasure(this.performance.aard, performance.now() - startTime);
      } catch (e) {
        this.logger.log('error', 'debug', `%c[ArDetect::animationFrameBootstrap] <@${this.arid}>  Frame check failed:`,  "color: #000, background: #f00", e);
      }
    }

    if (this && !this._halted && !this._paused) {
      this.animationFrameHandle = window.requestAnimationFrame( (ts) => this.animationFrameBootstrap(ts));
    } else if (this._halted) {
      this.logger.log('info', 'debug', `%c[ArDetect::animationFrameBootstrap] <@${this.arid}>  Main autodetection loop exited. Halted? ${this._halted}`,  _ard_console_stop);
      this._exited = true;
    } else {
      this.logger.log('info', 'debug', `[ArDetect::animationFrameBootstrap] <@${this.arid}>  Not renewing animation frame for some reason. Paused? ${this._paused}; Halted?: ${this._halted}, Exited?: ${this._exited}`);
    }
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
    this.detectedAr = trueAr;

    // poglejmo, če se je razmerje stranic spremenilo
    // check if aspect ratio is changed:
    let lastAr = this.conf.resizer.getLastAr();
    if (lastAr.type === AspectRatioType.AutomaticUpdate && lastAr.ratio !== null && lastAr.ratio !== undefined){
      // spremembo lahko zavrnemo samo, če uporabljamo avtomatski način delovanja in če smo razmerje stranic
      // že nastavili.
      //
      // we can only deny aspect ratio changes if we use automatic mode and if aspect ratio was set from here.

      let arDiff = trueAr - lastAr.ratio;

      if (arDiff < 0)
        arDiff = -arDiff;

      const arDiff_percent = arDiff / trueAr;

      // ali je sprememba v mejah dovoljenega? Če da -> fertik
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

    if (!this.video) {
      this.logger.log('error', 'debug', `%c[ArDetect::frameCheck] <@${this.arid}>  Video went missing. Destroying current instance of videoData.`);
      this.conf.destroy();
      return;
    }

    if (!this.blackframeContext) {
      this.init();
    }

    let startTime;
    let partialDrawImageTime = 0;
    let sampleCols = this.sampleCols.slice(0);

    //
    // [0] blackframe tests (they also determine whether we need fallback mode)
    //
    const bfAnalysis = await this.blackframeTest();
    if (bfAnalysis.isBlack) {
      // we don't do any corrections on frames confirmed black
      this.logger.log('info', 'arDetect_verbose', `%c[ArDetect::frameCheck] Black frame analysis suggests this frame is black or too dark. Doing nothing.`, "color: #fa3", bfAnalysis);
      return;
    }

    startTime = performance.now();
    await new Promise<void>(
      resolve => {
        this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        resolve();
      }
    )
    const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
    const imageDrawTime = performance.now() - startTime;

    if (! this.fastLetterboxPresenceTest(imageData, sampleCols) ) {
      // If we don't detect letterbox, we reset aspect ratio to aspect ratio of the video file. The aspect ratio could
      // have been corrected manually. It's also possible that letterbox (that was there before) disappeared.
      this.conf.resizer.updateAr({type: AspectRatioType.AutomaticUpdate, ratio: this.defaultAr});
      this.guardLine.reset();
      this.noLetterboxCanvasReset = true;

      this.logger.log('info', 'arDetect_verbose', `%c[ArDetect::frameCheck] Letterbox not detected in fast test. Letterbox is either gone or we manually corrected aspect ratio. Nothing will be done.`, "color: #fa3");

      this.clearImageData(imageData);
      return;
    }

    // if we look further we need to reset this value back to false. Otherwise we'll only get CSS reset once
    // per video/pageload instead of every time letterbox goes away (this can happen more than once per vid)
    this.noLetterboxCanvasReset = false;

    // let's check if we're cropping too much
    const guardLineOut = this.guardLine.check(imageData);

    // if both succeed, then aspect ratio hasn't changed.
    if (!guardLineOut.imageFail && !guardLineOut.blackbarFail) {
      this.logger.log('info', 'arDetect_verbose', `%c[ArDetect::frameCheck] guardLine tests were successful. (no imagefail and no blackbarfail)\n`, "color: #afa", guardLineOut);
      this.clearImageData(imageData);
      return;
    }

    // otherwise we continue. We add blackbar violations to the list of the cols we'll sample and sort them
    if (guardLineOut.blackbarFail) {
      sampleCols.concat(guardLineOut.offenders).sort(
        (a: number, b: number) => a - b
      );
    }

    // If aspect ratio changes from narrower to wider, we first check for presence of pillarbox. Presence of pillarbox indicates
    // a chance of a logo on black background. We could cut easily cut too much. Because there's a somewhat significant chance
    // that we will cut too much, we rather avoid doing anything at all. There's gonna be a next chance.
    try{
      if(guardLineOut.blackbarFail || guardLineOut.imageFail){
        if(this.edgeDetector.findBars(imageData, null, EdgeDetectPrimaryDirection.Horizontal).status === 'ar_known'){
          if(guardLineOut.blackbarFail){
            this.logger.log('info', 'arDetect', `[ArDetect::frameCheck] Detected blackbar violation and pillarbox. Resetting to default aspect ratio.`);
            this.conf.resizer.setAr({type: AspectRatioType.AutomaticUpdate, ratio: this.defaultAr});
            this.guardLine.reset();
          } else {
            this.logger.log('info', 'arDetect_verbose', `[ArDetect::frameCheck] Guardline failed, blackbar didn't, and we got pillarbox. Doing nothing.`);
          }

          this.clearImageData(imageData);
          return;
        }
      }
    } catch(e) {
      this.logger.log('info', 'arDetect', `[ArDetect::frameCheck] something went wrong while checking for pillarbox. Error:\n`, e);
    }

    // let's see where black bars end.
    this.sampleCols_current = sampleCols.length;

    // blackSamples -> {res_top, res_bottom}

    let edgePost = this.edgeDetector.findBars(imageData, sampleCols, EdgeDetectPrimaryDirection.Vertical, EdgeDetectQuality.Improved, guardLineOut, bfAnalysis);

    this.logger.log('info', 'arDetect_verbose', `%c[ArDetect::frameCheck] edgeDetector returned this\n`,  "color: #aaf", edgePost);

    if (edgePost.status !== EdgeStatus.ARKnown){
      // rob ni bil zaznan, zato ne naredimo ničesar.
      // no edge was detected. Let's leave things as they were
      this.logger.log('info', 'arDetect_verbose', `%c[ArDetect::frameCheck] Edge wasn't detected with findBars`, "color: #fa3", edgePost, "EdgeStatus.AR_KNOWN:", EdgeStatus.ARKnown);

      this.clearImageData(imageData);
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
        // no guardline, no bigge
      }
      // WE DO NOT RESET ASPECT RATIO HERE IN CASE OF PROBLEMS, CAUSES UNWARRANTED RESETS:
      // (eg. here: https://www.youtube.com/watch?v=nw5Z93Yt-UQ&t=410)
      //
      // this.conf.resizer.setAr({type: AspectRatioType.AutomaticUpdate, ratio: this.defaultAr});
    }

    this.clearImageData(imageData);
  }

  resetBlackLevel(){
    this.blackLevel = this.settings.active.arDetect.blackbar.blackLevel;
  }

  blackLevelTest_full() {

  }

  async blackframeTest() {
    if (this.blackLevel === undefined) {
      this.logger.log('info', 'arDetect_verbose', "[ArDetect::blackframeTest] black level undefined, resetting");
      this.resetBlackLevel();
    }

    /**
     * Performs a quick black frame test
     */
    const bfDrawStartTime = performance.now();

    await new Promise<void>(
      resolve => {
        this.blackframeContext.drawImage(this.video, 0, 0, this.blackframeCanvas.width, this.blackframeCanvas.height);
        resolve();
      }
    );
    const rows = this.blackframeCanvas.height;
    const cols = this.blackframeCanvas.width;
    const bfImageData = this.blackframeContext.getImageData(0, 0, cols, rows).data;

    const blackFrameDraw = performance.now() - bfDrawStartTime;
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


    // we do some recon for letterbox and pillarbox. While this can't determine whether letterbox/pillarbox exists
    // with sufficient level of certainty due to small sample resolution, it can still give us some hints for later
    let rowMax = new Array(rows).fill(0);
    let colMax = new Array(cols).fill(0);

    let r: number, c: number;


    for (let i = 0; i < bfImageData.length; i+= 4) {
      pixelMax = Math.max(bfImageData[i], bfImageData[i+1], bfImageData[i+2]);
      bfImageData[i+3] = pixelMax;

      if (pixelMax < blackThreshold) {
        if (pixelMax < this.blackLevel) {
          this.blackLevel = pixelMax;
        }
        blackPixelCount++;
      } else {
        cumulativeValue += pixelMax;
        cumulative_r += bfImageData[i];
        cumulative_g += bfImageData[i+1];
        cumulative_b += bfImageData[i+2];

        max_r = max_r > bfImageData[i]   ? max_r : bfImageData[i];
        max_g = max_g > bfImageData[i+1] ? max_g : bfImageData[i+1];
        max_b = max_b > bfImageData[i+2] ? max_b : bfImageData[i+2];
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
    for (let i = 0; i < bfImageData.length; i+= 4) {
      if (bfImageData[i+3] >= this.blackLevel) {
        var_r += Math.abs(avg_r - bfImageData[i] * max_r);
        var_g += Math.abs(avg_g - bfImageData[i+1] * max_g);
        var_b += Math.abs(avg_b - bfImageData[i+1] * max_b);
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
