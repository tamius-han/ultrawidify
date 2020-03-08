
import Debug from '../../conf/Debug';
import EdgeDetect from './edge-detect/EdgeDetect';
import EdgeStatus from './edge-detect/enums/EdgeStatusEnum';
import EdgeDetectPrimaryDirection from './edge-detect/enums/EdgeDetectPrimaryDirectionEnum';
import EdgeDetectQuality from './edge-detect/enums/EdgeDetectQualityEnum';
import GuardLine from './GuardLine';
// import DebugCanvas from './DebugCanvas';
import VideoAlignment from '../../../common/enums/video-alignment.enum';
import AspectRatio from '../../../common/enums/aspect-ratio.enum';

class ArDetector {

  constructor(videoData){
    this.logger = videoData.logger;
    this.conf = videoData;
    this.video = videoData.video;
    this.settings = videoData.settings;
    
    this.setupTimer = null;

    this.sampleCols = [];

    this.canFallback = true;
    this.fallbackMode = false;

    this.blackLevel = this.settings.active.arDetect.blackbar.blackLevel;

    this.arid = (Math.random()*100).toFixed();

    // ar detector starts in this state. running main() sets both to false
    this._halted = true;
    this._exited = true;

    // we can tick manually, for debugging
    this._manualTicks = false;
    this._nextTick = false;

    this.canDoFallbackMode = false; 
    this.logger.log('info', 'init', `[ArDetector::ctor] creating new ArDetector. arid: ${this.arid}`);
  }

  setManualTick(manualTick) {
    this._manualTicks = manualTick;
  }

  tick() {
    this._nextTick = true;
  }

  init(){
    this.logger.log('info', 'init', `[ArDetect::init] <@${this.arid}> Initializing autodetection.`);

    try {
      if (this.settings.canStartAutoAr()) {
        this.setup();
      } else {
        throw "Settings prevent autoar from starting"
      }
    } catch (e) {
      this.logger.log('error', 'init', `%c[ArDetect::init] <@${this.arid}> Initialization failed.`, _ard_console_stop, e);
    }
  }

  destroy(){
    this.logger.log('info', 'init', `%c[ArDetect::destroy] <@${this.arid}> Destroying aard.`, _ard_console_stop, e);
    // this.debugCanvas.destroy();
    this.stop();
  }

  setup(cwidth, cheight){
    this.logger.log('info', 'init', `[ArDetect::setup] <@${this.arid}> Starting autodetection setup.`);
    //
    // [-1] check for zero-width and zero-height videos. If we detect this, we kick the proverbial
    //      can some distance down the road. This problem will prolly fix itself soon. We'll also
    //      not do any other setup until this issue is fixed
    //
    if(this.video.videoWidth === 0 || this.video.videoHeight === 0 ){
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

    var ncol = this.settings.active.arDetect.sampling.staticCols;
    var nrow = this.settings.active.arDetect.sampling.staticRows;
    
    var colSpacing = this.canvas.width / ncol;
    var rowSpacing = (this.canvas.height << 2) / nrow;
    
    this.sampleLines = [];
    this.sampleCols = [];

    for(var i = 0; i < ncol; i++){
      if(i < ncol - 1)
        this.sampleCols.push(Math.round(colSpacing * i));
      else{
        this.sampleCols.push(Math.round(colSpacing * i) - 1);
      }
    }

    for(var i = 0; i < nrow; i++){
      if(i < ncol - 5)
        this.sampleLines.push(Math.round(rowSpacing * i));
      else{
        this.sampleLines.push(Math.round(rowSpacing * i) - 4);
      }
    }

    //
    // [3] detect if we're in the fallback mode and reset guardline
    //

    if (this.fallbackMode) {
      this.logger.log('warn', 'debug', `[ArDetect::setup] <@${this.arid}>  WARNING: CANVAS RESET DETECTED/we're in fallback mode - recalculating guardLine`, "background: #000; color: #ff2");
      // blackbar, imagebar
      this.guardLine.reset();
    }

    //
    // [4] see if browser supports "fallback mode" by drawing a small portion of our window
    //

    try {
      this.blackframeContext.drawWindow(window,0, 0, this.blackframeCanvas.width, this.blackframeCanvas.height, "rgba(0,0,128,1)");
      this.canDoFallbackMode = true;
    } catch (e) {
      this.canDoFallbackMode = false;
    }
    
    //
    // [5] do other things setup needs to do
    //

    this.detectionTimeoutEventCount = 0;
    this.resetBlackLevel();

    // if we're restarting ArDetect, we need to do this in order to force-recalculate aspect ratio
    this.conf.resizer.setLastAr({type: AspectRatio.Automatic, ratio: this.getDefaultAr()});

    this.canvasImageDataRowLength = cwidth << 2;
    this.noLetterboxCanvasReset = false;
    
    if (this.settings.canStartAutoAr() ) {
      this.start();
    }
  
    if(Debug.debugCanvas.enabled){
      // this.debugCanvas.init({width: cwidth, height: cheight});
      // DebugCanvas.draw("test marker","test","rect", {x:5, y:5}, {width: 5, height: 5});
    }

    this.conf.arSetupComplete = true;
  }

  start() {
    this.logger.log('info', 'debug', `"%c[ArDetect::start] <@${this.arid}>  Starting automatic aspect ratio detection`, _ard_console_start);

    if (this.conf.resizer.lastAr.type === AspectRatio.Automatic) {
      // ensure first autodetection will run in any case
      this.conf.resizer.setLastAr({type: AspectRatio.Automatic, ratio: this.getDefaultAr()});
    }


    
    // launch main() if it's currently not running:
    this.main();
    // automatic detection starts halted. If halted=false when main first starts, extension won't run
    // this._paused is undefined the first time we run this function, which is effectively the same thing
    // as false. Still, we'll explicitly fix this here.
    this._paused = false;  
    this._halted = false;
    this._paused = false;
  }

  unpause() {
    // pause only if we were running before. Don't pause if we aren't running
    // (we are running when _halted is neither true nor undefined)
    if (this._paused && this._halted === false) {
      this._paused = true;
    }
  }

  pause() {
    // pause only if we were running before. Don't pause if we aren't running
    // (we are running when _halted is neither true nor undefined)
    if (this._halted === false) {
      this._paused = true;
    }
  }

  stop(){
    this.logger.log('info', 'debug', `"%c[ArDetect::stop] <@${this.arid}>  Stopping automatic aspect ratio detection`, _ard_console_stop);
    this._halted = true;
    // this.conf.resizer.setArLastAr();
  }

  async main() {
    if (this._paused) {
      // unpause if paused
      this._paused = false;
      return; // main loop still keeps executing. Return is needed to avoid a million instances of autodetection
    }
    if (!this._halted) { 
      // we are already running, don't run twice
      // this would have handled the 'paused' from before, actually.
      return;
    }

    let exitedRetries = 10;

    while (!this._exited && exitedRetries --> 0) {
      this.logger.log('warn', 'debug', `[ArDetect::main] <@${this.arid}>  We are trying to start another instance of autodetection on current video, but the previous instance hasn't exited yet. Waiting for old instance to exit ...`);
      await this.sleep(this.settings.active.arDetect.timers.tickrate);
    }
    if (!this._exited) {
      this.logger.log('error', 'debug', `[ArDetect::main] <@${this.arid}>  Previous instance didn't exit in time. Not starting a new one.`);
      return;
    }

    this.logger.log('info', 'debug', `%c[ArDetect::main] <@${this.arid}>  Previous instance didn't exit in time. Not starting a new one.`);

    // we need to unhalt:
    this._halted = false;
    this._exited = false;

    // set initial timestamps so frame check will trigger the first time we run the loop
    let lastFrameCheckStartTime = Date.now() - (this.settings.active.arDetect.timers.playing << 1);

    const frameCheckTimes = new Array(10).fill(-1);
    let frameCheckBufferIndex = 0;
    let fcstart, fctime;

    while (this && !this._halted) {
      // NOTE: we separated tickrate and inter-check timeouts so that when video switches
      // state from 'paused' to 'playing', we don't need to wait for the rest of the longer
      // paused state timeout to finish.

      if ( (!this._manualTicks && this.canTriggerFrameCheck(lastFrameCheckStartTime)) || this._nextTick) {
        this._nextTick = false;

        lastFrameCheckStartTime = Date.now();
        fcstart = performance.now();
        
        try {
          this.frameCheck();
        } catch (e) {
          this.logger.log('error', 'debug', `%c[ArDetect::main] <@${this.arid}>  Frame check failed:`,  "color: #000, background: #f00", e);
        }

        if (Debug.performanceMetrics) {
          fctime = performance.now() - fcstart;
          frameCheckTimes[frameCheckBufferIndex % frameCheckTimes.length] = fctime;
          this.conf.pageInfo.sendPerformanceUpdate({frameCheckTimes: frameCheckTimes, lastFrameCheckTime: fctime});
          ++frameCheckBufferIndex;
        }
      }

      await this.sleep(this.settings.active.arDetect.timers.tickrate);
    }

    this.logger.log('info', 'debug', `%c[ArDetect::main] <@${this.arid}>  Main autodetection loop exited. Halted? ${this._halted}`,  _ard_console_stop);
    this._exited = true;
  }

  async sleep(timeout) {
    return new Promise( (resolve, reject) => setTimeout(() => resolve(), timeout));
  }

  canTriggerFrameCheck(lastFrameCheckStartTime) {
    if (this._paused) {
      return false;
    }
    if (this.video.ended || this.video.paused){
      // we slow down if ended or pausing. Detecting is pointless.
      // we don't stop outright in case seeking happens during pause/after video was 
      // ended and video gets into 'playing' state again
      return Date.now() - lastFrameCheckStartTime > this.settings.active.arDetect.timers.paused;
    }
    if (this.video.error){
      // če je video pavziran, še vedno skušamo zaznati razmerje stranic - ampak bolj poredko.
      // if the video is paused, we still do autodetection. We just do it less often.
      return Date.now() - lastFrameCheckStartTime > this.settings.active.arDetect.timers.error;
    }
    
    return Date.now() - lastFrameCheckStartTime > this.settings.active.arDetect.timers.playing;
  }

  isRunning(){
    return ! (this._halted || this._paused || this._exited);
  }


  scheduleInitRestart(timeout, force_reset){
    if(! timeout){
      timeout = 100;
    }
    // don't allow more than 1 instance
    if(this.setupTimer){ 
      clearTimeout(this.setupTimer);
    }
    
    var ths = this;
    this.setupTimer = setTimeout(function(){
        ths.setupTimer = null;
        try{
          ths.main();
        } catch(e) {
          this.logger('error', 'debug', `[ArDetector::scheduleInitRestart] <@${this.arid}> Failed to start main(). Error:`,e);
        }
        ths = null;
      },
      timeout
    );
  }



  //#region helper functions (general)
  attachCanvas(canvas){
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

  canvasReadyForDrawWindow(){
    this.logger.log('info', 'debug', `%c[ArDetect::canvasReadyForDrawWindow] <@${this.arid}> canvas is ${this.canvas.height === window.innerHeight ? '' : 'NOT '}ready for drawWindow(). Canvas height: ${this.canvas.height}px; window inner height: ${window.innerHeight}px.`)

    return this.canvas.height == window.innerHeight
  }

  getTimeout(baseTimeout, startTime){
    var execTime = (performance.now() - startTime);
    
    return baseTimeout;
  }
  //#endregion

  getDefaultAr() {
    const ratio = this.video.videoWidth / this.video.videoHeight;
    if (isNaN(ratio)) {
      return undefined;
    }
    return ratio;
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
    

    if (! this.fallbackMode) {
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
    } else {
      // fallback mode behaves a wee bit differently

      let zoomFactor = 1;
   
      // there's stuff missing from the canvas. We need to assume canvas' actual height is bigger by a factor x, where
      //   x = [video.zoomedHeight] / [video.unzoomedHeight]
      //
      // letterbox also needs to be corrected:
      //   letterbox += [video.zoomedHeight] - [video.unzoomedHeight]

      var vbr = this.video.getBoundingClientRect();
      
      zoomFactor = vbr.height / this.video.clientHeight;
      letterbox += vbr.height - this.video.clientHeight;

      var trueHeight = this.canvas.height * zoomFactor - letterbox;

      if(edges.top > 1 && edges.top <= this.settings.active.arDetect.fallbackMode.noTriggerZonePx ){
        this.logger.log('info', 'arDetect', `%c[ArDetect::calculateArFromEdges] <@${this.arid}>  Edge is in the no-trigger zone. Aspect ratio change is not triggered.`)
        return;
      }
      
      // varnostno območje, ki naj ostane črno (da lahko v fallback načinu odkrijemo ožanje razmerja stranic).
      // x2, ker je safetyBorderPx definiran za eno stran.
      // safety border so we can detect aspect ratio narrowing (21:9 -> 16:9).
      // x2 because safetyBorderPx is for one side.
      trueHeight += (this.settings.active.arDetect.fallbackMode.safetyBorderPx << 1);

      return this.canvas.width * zoomFactor / trueHeight;
    }
  }

  processAr(trueAr){
    this.detectedAr = trueAr;
    
    // poglejmo, če se je razmerje stranic spremenilo
    // check if aspect ratio is changed:
    var lastAr = this.conf.resizer.getLastAr();
    if (lastAr.type === AspectRatio.Automatic && lastAr.ratio !== null && lastAr.ratio !== undefined){
      // spremembo lahko zavrnemo samo, če uporabljamo avtomatski način delovanja in če smo razmerje stranic
      // že nastavili.
      //
      // we can only deny aspect ratio changes if we use automatic mode and if aspect ratio was set from here.
      
      var arDiff = trueAr - lastAr.ar;
      
      if (arDiff < 0)
        arDiff = -arDiff;
      
      var arDiff_percent = arDiff / trueAr;
      
      // ali je sprememba v mejah dovoljenega? Če da -> fertik
      // is ar variance within acceptable levels? If yes -> we done
      this.logger.log('info', 'arDetect', `%c[ArDetect::processAr] <@${this.arid}>  New aspect ratio varies from the old one by this much:\n`,"color: #aaf","old Ar", lastAr.ar, "current ar", trueAr, "arDiff (absolute):",arDiff,"ar diff (relative to new ar)", arDiff_percent);

      if (arDiff < trueAr * this.settings.active.arDetect.allowedArVariance){
        this.logger.log('info', 'arDetect', `%c[ArDetect::processAr] <@${this.arid}>  Aspect ratio change denied — diff %: ${arDiff_percent}`, "background: #740; color: #fa2");
        return;
      }
      this.logger.log('info', 'arDetect', `%c[ArDetect::processAr] <@${this.arid}>  aspect ratio change accepted — diff %: ${arDiff_percent}`, "background: #153; color: #4f9");
    }
    this.logger.log('info', 'debug', `%c[ArDetect::processAr] <@${this.arid}>  Triggering aspect ratio change. New aspect ratio: ${trueAr}`, _ard_console_change);
    
    this.conf.resizer.updateAr({type: AspectRatio.Automatic, ratio: trueAr}, {type: AspectRatio.Automatic, ratio: trueAr});
  }

  clearImageData(id) {
    if (ArrayBuffer.transfer) {
      ArrayBuffer.transfer(id, 0);
    }
    id = undefined;
  }

  frameCheck(){
    if(! this.video){
      this.logger.log('error', 'debug', `%c[ArDetect::frameCheck] <@${this.arid}>  Video went missing. Destroying current instance of videoData.`);
      this.conf.destroy();
      return;
    }

    if (!this.blackframeContext) {
      this.init();
    }
    
    var startTime = performance.now();
    let sampleCols = this.sampleCols.slice(0);

    //
    // [0] blackframe tests (they also determine whether we need fallback mode)
    //
    try {
      this.blackframeContext.drawImage(this.video, 0, 0, this.blackframeCanvas.width, this.blackframeCanvas.height);
      this.fallbackMode = false;
    } catch (e) {
      this.logger.log('error', 'arDetect', `%c[ArDetect::frameCheck] <@${this.arid}>  %c[ArDetect::frameCheck] can't draw image on canvas. ${this.canDoFallbackMode ? 'Trying canvas.drawWindow instead' : 'Doing nothing as browser doesn\'t support fallback mode.'}`, "color:#000; backgroud:#f51;", e);

      // nothing to see here, really, if fallback mode isn't supported by browser
      if (! this.canDoFallbackMode) {
        return;
      }
      if (! this.canvasReadyForDrawWindow()) {
        // this means canvas needs to be resized, so we'll just re-run setup with all those new parameters
        this.stop();
          
        let newCanvasWidth = window.innerHeight * (this.video.videoWidth / this.video.videoHeight);
        let newCanvasHeight = window.innerHeight;
        
        if (this.conf.resizer.videoAlignment === VideoAlignment.Center) {
          this.canvasDrawWindowHOffset = Math.round((window.innerWidth - newCanvasWidth) * 0.5);
        } else if (this.conf.resizer.videoAlignment === VideoAlignment.Left) {
          this.canvasDrawWindowHOffset = 0;
        } else {
          this.canvasDrawWindowHOffset = window.innerWidth - newCanvasWidth;
        }

        this.setup(newCanvasWidth, newCanvasHeight);
        
        return;
      } 
      // if this is the case, we'll first draw on canvas, as we'll need intermediate canvas if we want to get a
      // smaller sample for blackframe check
      this.fallbackMode = true;

      try {
        this.context.drawWindow(window, this.canvasDrawWindowHOffset, 0, this.canvas.width, this.canvas.height, "rgba(0,0,128,1)");
      } catch (e) {
        this.logger.log('error', 'arDetect', `%c[ArDetect::frameCheck] can't draw image on canvas with fallback mode either. This error is prolly only temporary.`, "color:#000; backgroud:#f51;", e);
        return; // it's prolly just a fluke, so we do nothing special here
      }
      // draw blackframe sample from our main sample:
      this.blackframeContext.drawImage(this.canvas, this.blackframeCanvas.width, this.blackframeCanvas.height)

      this.logger.log('info', 'arDetect_verbose', `%c[ArDetect::frameCheck] canvas.drawImage seems to have worked`, "color:#000; backgroud:#2f5;");
    }

    const bfanalysis = this.blackframeTest();
    if (bfanalysis.isBlack) {
      // we don't do any corrections on frames confirmed black
      this.logger.log('info', 'arDetect_verbose', `%c[ArDetect::frameCheck] Black frame analysis suggests this frame is black or too dark. Doing nothing.`, "color: #fa3", bfanalysis);
      return;
    }

    

    // if we are in fallback mode, then frame has already been drawn to the main canvas.
    // if we are in normal mode though, the frame has yet to be drawn
    if (!this.fallbackMode) {
      this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    }
    const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height).data;

    if (! this.fastLetterboxPresenceTest(imageData, sampleCols) ) {
      // Če ne zaznamo letterboxa, kličemo reset. Lahko, da je bilo razmerje stranic popravljeno na roke. Možno je tudi,
      // da je letterbox izginil.
      // If we don't detect letterbox, we reset aspect ratio to aspect ratio of the video file. The aspect ratio could
      // have been corrected manually. It's also possible that letterbox (that was there before) disappeared.
      this.conf.resizer.updateAr({type: AspectRatio.Automatic, ratio: this.getDefaultAr()});
      this.guardLine.reset();
      this.noLetterboxCanvasReset = true;

      this.logger.log('info', 'arDetect_verbose', `%c[ArDetect::frameCheck] Letterbox not detected in fast test. Letterbox is either gone or we manually corrected aspect ratio. Nothing will be done.`, "color: #fa3");

      this.clearImageData(imageData);
      return;
    }

    // Če preverjamo naprej, potem moramo postaviti to vrednost nazaj na 'false'. V nasprotnem primeru se bo
    // css resetiral enkrat na video/pageload namesto vsakič, ko so za nekaj časa obrobe odstranejene
    // if we look further we need to reset this value back to false. Otherwise we'll only get CSS reset once
    // per video/pageload instead of every time letterbox goes away (this can happen more than once per vid)
    this.noLetterboxCanvasReset = false;
    
    // poglejmo, če obrežemo preveč.
    // let's check if we're cropping too much
    const guardLineOut = this.guardLine.check(imageData, this.fallbackMode);
    
    // če ni padla nobena izmed funkcij, potem se razmerje stranic ni spremenilo
    // if both succeed, then aspect ratio hasn't changed.    
    if (!guardLineOut.imageFail && !guardLineOut.blackbarFail) {
      this.logger.log('info', 'arDetect_verbose', `%c[ArDetect::frameCheck] guardLine tests were successful. (no imagefail and no blackbarfail)\n`, "color: #afa", guardLineOut);
      this.clearImageData(imageData);
      return;
    }

    // drugače nadaljujemo, našemu vzorcu stolpcev pa dodamo tiste stolpce, ki so 
    // kršili blackbar (če obstajajo) ter jih razvrstimo
    // otherwise we continue. We add blackbar violations to the list of the cols
    // we'll sample and sort them
    if (guardLineOut.blackbarFail) {
      sampleCols.concat(guardLineOut.offenders).sort((a, b) => a > b);
    }
  
    // if we're in fallback mode and blackbar test failed, we restore CSS and quit
    // (since the new letterbox edge isn't present in our sample due to technical
    // limitations)
    if (this.fallbackMode && guardLineOut.blackbarFail) {
      this.conf.resizer.setAr({type: AspectRatio.Automatic, ratio: this.getDefaultAr()});
      this.guardLine.reset();
      this.noLetterboxCanvasReset = true;

      this.clearImageData(imageData);
      return;
    }
         
    // će se razmerje stranic spreminja iz ožjega na širšega, potem najprej poglejmo za prisotnostjo navpičnih črnih obrob.
    // če so prisotne navpične obrobe tudi na levi in desni strani, potlej obstaja možnost, da gre za logo na črnem ozadju.
    // v tem primeru obstaja nevarnost, da porežemo preveč. Ker obstaja dovolj velika možnost, da bi porezali preveč, rajši
    // ne naredimo ničesar.
    //
    // če je pillarbox zaznan v primeru spremembe iz ožjega na širše razmerje stranice, razmerje povrnemo na privzeto vrednost.
    //
    // If aspect ratio changes from narrower to wider, we first check for presence of pillarbox. Presence of pillarbox indicates
    // a chance of a logo on black background. We could cut easily cut too much. Because there's a somewhat significant chance
    // that we will cut too much, we rather avoid doing anything at all. There's gonna be a next chance.
    try{
      if(guardLineOut.blackbarFail || guardLineOut.imageFail){
        if(this.edgeDetector.findBars(imageData, null, EdgeDetectPrimaryDirection.HORIZONTAL).status === 'ar_known'){


          if(guardLineOut.blackbarFail){
            this.logger.log('info', 'arDetect', `[ArDetect::frameCheck] Detected blackbar violation and pillarbox. Resetting to default aspect ratio.`);
            this.conf.resizer.setAr({type: AspectRatio.Automatic, ratio: this.getDefaultAr()});
            this.guardLine.reset();
          }

          triggerTimeout = this.getTimeout(baseTimeout, startTime);
          this.scheduleFrameCheck(triggerTimeout);
          this.clearImageData(imageData);
          return;
        }
      }
    } catch(e) { 
      this.logger.log('info', 'arDetect', `[ArDetect::frameCheck] something went wrong while checking for pillarbox. Error:\n`, e);
    }

    // pa poglejmo, kje se končajo črne letvice na vrhu in na dnu videa.
    // let's see where black bars end.
    this.sampleCols_current = sampleCols.length;
    
    // blackSamples -> {res_top, res_bottom}
   
    var edgePost = this.edgeDetector.findBars(imageData, sampleCols, EdgeDetectPrimaryDirection.VERTICAL, EdgeDetectQuality.IMPROVED, guardLineOut, bfanalysis);
    
    this.logger.log('info', 'arDetect_verbose', `%c[ArDetect::frameCheck] edgeDetector returned this\n`,  "color: #aaf", edgePost);
    
    if (edgePost.status !== EdgeStatus.AR_KNOWN){
      // rob ni bil zaznan, zato ne naredimo ničesar.
      // no edge was detected. Let's leave things as they were
      this.logger.log('info', 'arDetect_verbose', `%c[ArDetect::frameCheck] Edge wasn't detected with findBars`, "color: #fa3", edgePost, "EdgeStatus.AR_KNOWN:", EdgeStatus.AR_KNOWN);

      this.clearImageData(imageData);
      return;
    }

    var newAr = this.calculateArFromEdges(edgePost);
      
    this.logger.log('info', 'arDetect_verbose', `%c[ArDetect::frameCheck] Triggering aspect ration change! new ar: ${newAr}`, "color: #aaf");

    // we also know edges for guardline, so set them.
    // we need to be mindful of fallbackMode though
    // if edges are okay and not invalid, we also 
    // allow automatic aspect ratio correction. If edges
    // are bogus, we remain aspect ratio unchanged.
    try {
      if (!this.fallbackMode) {
        // throws error if top/bottom are invalid
        this.guardLine.setBlackbar({top: edgePost.guardLineTop, bottom: edgePost.guardLineBottom});
      } else {
        if (this.conf.player.dimensions){
          this.guardLine.setBlackbarManual({
            top: this.settings.active.arDetect.fallbackMode.noTriggerZonePx,
            bottom: this.conf.player.dimensions.height - this.settings.active.arDetect.fallbackMode.noTriggerZonePx - 1
          },{
            top: edgePost.guardLineTop + this.settings.active.arDetect.guardLine.edgeTolerancePx,
            bottom: edgePost.guardLineBottom - this.settings.active.arDetect.guardLine.edgeTolerancePx
          })
        }
      }

      this.processAr(newAr);
    } catch (e) {
      // edges weren't gucci, so we'll just reset 
      // the aspect ratio to defaults
      this.logger.log('error', 'arDetect', `%c[ArDetect::frameCheck] There was a problem setting blackbar. Doing nothing. Error:`, e);
      
      this.guardline.reset();
      // WE DO NOT RESET ASPECT RATIO HERE IN CASE OF PROBLEMS, CAUSES UNWARRANTED RESETS: 
      // (eg. here: https://www.youtube.com/watch?v=nw5Z93Yt-UQ&t=410)
      //
      // this.conf.resizer.setAr({type: AspectRatio.Automatic, ratio: this.getDefaultAr()});
    }

    this.clearImageData(imageData);
  }

  resetBlackLevel(){
    this.blackLevel = this.settings.active.arDetect.blackbar.blackLevel;    
  }

  blackLevelTest_full() {

  }

  blackframeTest() {
    if (this.blackLevel === undefined) {
      this.logger.log('info', 'arDetect_verbose', "[ArDetect::blackframeTest] black level undefined, resetting");
      this.resetBlackLevel();
    }

    const rows = this.blackframeCanvas.height;
    const cols = this.blackframeCanvas.width;
    const pixels = rows * cols;
    let cumulative_r = 0, cumulative_g = 0, cumulative_b = 0;
    let max_r = 0, max_g = 0, max_b = 0;
    let avg_r, avg_g, avg_b;
    let var_r = 0, var_g = 0, var_b = 0;

    let pixelMax = 0;
    let cumulativeValue = 0;
    let blackPixelCount = 0;
    const bfImageData = this.blackframeContext.getImageData(0, 0, cols, rows).data;
    const blackTreshold = this.blackLevel + this.settings.active.arDetect.blackbar.frameTreshold;
    

    // we do some recon for letterbox and pillarbox. While this can't determine whether letterbox/pillarbox exists
    // with sufficient level of certainty due to small sample resolution, it can still give us some hints for later
    let rowMax = new Array(rows).fill(0);
    let colMax = new Array(cols).fill(0);

    let r, c;


    for (let i = 0; i < bfImageData.length; i+= 4) {
      pixelMax = Math.max(bfImageData[i], bfImageData[i+1], bfImageData[i+2]);
      bfImageData[i+3] = pixelMax;

      if (pixelMax < blackTreshold) {
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
    return {
      isBlack: isBlack,
      rowMax: rowMax,
      colMax: colMax,
    };
  }

  fastLetterboxPresenceTest(imageData, sampleCols) {
    // fast test to see if aspect ratio is correct.
    // returns 'true'  if presence of letterbox is possible.
    // returns 'false' if we found a non-black edge pixel. 

    // If we detect anything darker than blackLevel, we modify blackLevel to the new lowest value
    const rowOffset = this.canvas.width * (this.canvas.height - 1);
    let currentMin = 255, currentMax = 0, colOffset_r, colOffset_g, colOffset_b, colOffset_rb, colOffset_gb, colOffset_bb, blthreshold = this.settings.active.arDetect.blackbar.threshold;
  
    // detect black level. if currentMax comes above blackbar + blackbar threshold, we know we aren't letterboxed

    for (var i = 0; i < sampleCols.length; ++i){
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

    if (currentMin < this.blackLevel)
      this.blackLevel = currentMin

    return true;
  }

}

var _ard_console_stop = "background: #000; color: #f41";
var _ard_console_start = "background: #000; color: #00c399";
var _ard_console_change = "background: #000; color: #ff8";

export default ArDetector;
