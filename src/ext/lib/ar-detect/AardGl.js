
import Debug from '../../conf/Debug';
import EdgeDetect from './edge-detect/EdgeDetect';
import EdgeStatus from './edge-detect/enums/EdgeStatusEnum';
import EdgeDetectPrimaryDirection from './edge-detect/enums/EdgeDetectPrimaryDirectionEnum';
import EdgeDetectQuality from './edge-detect/enums/EdgeDetectQualityEnum';
import GuardLine from './GuardLine';
import DebugCanvas from './DebugCanvas';
import VideoAlignment from '../../../common/enums/video-alignment.enum';
import AspectRatio from '../../../common/enums/aspect-ratio.enum';
import { generateHorizontalAdder } from './gllib/shader-generators/HorizontalAdderGenerator';
import { getBasicVertexShader } from './gllib/shaders/vertex-shader';
import { sleep } from '../Util';

/**
 * AardGl: Hardware accelerated aspect ratio detection script, based on WebGL
 */
class AardGl {

  constructor(videoData){
    this.logger = videoData.logger;
    this.conf = videoData;
    this.video = videoData.video;
    this.settings = videoData.settings;
    
    this.setupTimer = null;

    this.sampleCols = [];

    this.canFallback = true;
    this.fallbackMode = false;

    this.blackLevel = this.settings.active.aard.blackbar.blackLevel;

    this.arid = (Math.random()*100).toFixed();

    // ar detector starts in this state. running main() sets both to false
    this._halted = true;
    this._exited = true;

    // we can tick manually, for debugging
    this._manualTicks = false;
    this._nextTick = false;

    this.canDoFallbackMode = false; 
    this.logger.log('info', 'init', `[AardGl::ctor] creating new AardGl. arid: ${this.arid}`);
  }

  /**
   * 
   *  HELPER FUNCTIONS
   *  
   */
  //#region helpers

  canTriggerFrameCheck(lastFrameCheckStartTime) {
    if (this._paused) {
      return false;
    }
    if (this.video.ended || this.video.paused){
      // we slow down if ended or pausing. Detecting is pointless.
      // we don't stop outright in case seeking happens during pause/after video was 
      // ended and video gets into 'playing' state again
      return Date.now() - lastFrameCheckStartTime > this.settings.active.aard.timers.paused;
    }
    if (this.video.error){
      // če je video pavziran, še vedno skušamo zaznati razmerje stranic - ampak bolj poredko.
      // if the video is paused, we still do autodetection. We just do it less often.
      return Date.now() - lastFrameCheckStartTime > this.settings.active.aard.timers.error;
    }
    
    return Date.now() - lastFrameCheckStartTime > this.settings.active.aard.timers.playing;
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
          this.logger('error', 'debug', `[AardGl::scheduleInitRestart] <@${this.arid}> Failed to start main(). Error:`,e);
        }
        ths = null;
      },
      timeout
    );
  }

  getTimeout(baseTimeout, startTime){
    var execTime = (performance.now() - startTime);
    
    return baseTimeout;
  }

  async nextFrame() {
    return new Promise(resolve => window.requestAnimationFrame(resolve));
  }

  getDefaultAr() {
    return this.video.videoWidth / this.video.videoHeight;
  }

  resetBlackLevel(){
    this.blackLevel = this.settings.active.aard.blackbar.blackLevel;    
  }

  clearImageData(id) {
    if (ArrayBuffer.transfer) {
      ArrayBuffer.transfer(id, 0);
    }
    id = undefined;
  }
  //#endregion
  //#region canvas management
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
    this.logger.log('info', 'debug', `%c[AardGl::canvasReadyForDrawWindow] <@${this.arid}> canvas is ${this.canvas.height === window.innerHeight ? '' : 'NOT '}ready for drawWindow(). Canvas height: ${this.canvas.height}px; window inner height: ${window.innerHeight}px.`)

    return this.canvas.height == window.innerHeight
  }
  //#endregion
  //#region aard control

  start() {
    this.logger.log('info', 'debug', `"%c[AardGl::start] <@${this.arid}>  Starting automatic aspect ratio detection`, _ard_console_start);

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

  stop(){
    this.logger.log('info', 'debug', `"%c[AardGl::stop] <@${this.arid}>  Stopping automatic aspect ratio detection`, _ard_console_stop);
    this._halted = true;
    // this.conf.resizer.setArLastAr();
  }
  
  pause() {
    // pause only if we were running before. Don't pause if we aren't running
    // (we are running when _halted is neither true nor undefined)
    if (this._halted === false) {
      this._paused = true;
    }
  }

  unpause() {
    // pause only if we were running before. Don't pause if we aren't running
    // (we are running when _halted is neither true nor undefined)
    if (this._paused && this._halted === false) {
      this._paused = true;
    }
  }

  setManualTick(manualTick) {
    this._manualTicks = manualTick;
  }

  tick() {
    this._nextTick = true;
  }
  //#endregion
  //#region WebGL helpers
  glSetRectangle(glContext, width, height) {
    glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array([
      0, 0,
      width, 0,
      0, height,
      0, height,
      width, 0,
      width, height
    ]), glContext.STATIC_DRAW);
  }

  /**
   * Creates shader
   * @param {*} glContext    — gl context
   * @param {*} shaderSource — shader code (as returned by a shader generator, for example)
   * @param {*} shaderType   — shader type (gl[context].FRAGMENT_SHADER or gl[context].VERTEX_SHADER)
   */
  compileShader(glContext, shaderSource, shaderType) {
    const shader = glContext.createShader(shaderType);

    // load source and compile shader
    glContext.shaderSource(shader, shaderSource);
    glContext.compileShader(shader);

    // check if shader was compiled successfully
    if (! glContext.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      glContext.deleteShader(shader);
      this.logger.log('error', ['init', 'debug', 'arDetect'], `%c[AardGl::setupShader] <@${this.arid}> Failed to setup shader.`, _ard_console_stop);
      return null;
    }

    return shader;
  }

  /**
   * Creates gl program
   * @param {*} glContext — gl context 
   * @param {*} shaders   — shaders (previously compiled with setupShader())
   */
  compileProgram(glContext, shaders) {
    console.log(glContext, shaders);
    const program = glContext.createProgram();
    for (const shader of shaders) {
      glContext.attachShader(program, shader);
    }
    glContext.linkProgram(program);
    if (! glContext.getProgramParameter(program, glContext.LINK_STATUS)) {
      glContext.deleteShader(shader);
      this.logger.log('error', ['init', 'debug', 'arDetect'], `%c[AardGl::setupProgram] <@${this.arid}> Failed to setup program.`, _ard_console_stop);
      return null;
    }

    return program;
  }
  //#endregion

  /*
   * --------------------
   * SETUP AND CLEANUP
   * --------------------
   */

  //#region init and destroy
  init(){
    this.logger.log('info', 'init', `[AardGl::init] <@${this.arid}> Initializing autodetection.`);

    try {
      if (this.settings.canStartAutoAr()) {
        this.setup();
      } else {
        throw "Settings prevent autoar from starting"
      }
    } catch (e) {
      this.logger.log('error', 'init', `%c[AardGl::init] <@${this.arid}> Initialization failed.`, _ard_console_stop, e);
    }
  }

  destroy(){
    this.logger.log('info', 'init', `%c[AardGl::destroy] <@${this.arid}> Destroying aard.`, _ard_console_stop, e);
    // this.debugCanvas.destroy();
    this.stop();
  }
  //#endregion

  setup(cwidth, cheight){
    this.logger.log('info', 'init', `[AardGl::setup] <@${this.arid}> Starting autodetection setup.`);
    //
    // [-1] check for zero-width and zero-height videos. If we detect this, we kick the proverbial
    //      can some distance down the road. This problem will prolly fix itself soon. We'll also
    //      not do any other setup until this issue is fixed
    //
    if(this.video.videoWidth === 0 || this.video.videoHeight === 0 ){
      this.logger.log('warn', 'debug', `[AardGl::setup] <@${this.arid}> This video has zero width or zero height. Dimensions: ${this.video.videoWidth} × ${this.video.videoHeight}`);

      this.scheduleInitRestart();
      return;
    }

    //
    // [0] initiate "dependencies" first
    //

    // This is space for EdgeDetector and GuardLine init
    
    //
    // [1] initiate canvases
    //

    if (!cwidth) {
      cwidth = this.settings.active.aardGl.canvasDimensions.sampleCanvas.width;
      cheight = this.settings.active.aardGl.canvasDimensions.sampleCanvas.height;
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
    this.blackframeCanvas.width = this.settings.active.aard.canvasDimensions.blackframeCanvas.width;
    this.blackframeCanvas.height = this.settings.active.aard.canvasDimensions.blackframeCanvas.height;

    // this.context = this.canvas.getContext("2d");

    this.pixelBuffer = new Uint8Array(cwidth * cheight * 4);

    //
    // [2] SETUP WEBGL STUFF —————————————————————————————————————————————————————————————————————————————————
    //#region webgl setup
    this.gl = this.canvas.getContext("webgl");

    // load shaders and stuff. PixelSize for horizontalAdder should be 1/sample canvas width
    const vertexShaderSrc = getBasicVertexShader();
    const horizontalAdderShaderSrc = generateHorizontalAdder(10, 1 / cwidth); // todo: unhardcode 10 as radius

    // compile shaders
    const vertexShader = this.compileShader(this.gl, vertexShaderSrc, this.gl.VERTEX_SHADER);
    const horizontalAdderShader = this.compileShader(this.gl, horizontalAdderShaderSrc, this.gl.FRAGMENT_SHADER);

    // link shaders to program
    const glProgram = this.compileProgram(this.gl, [vertexShader, horizontalAdderShader]);

    // look up where the vertex data needs to go
    // const positionLocation = this.gl.getAttributeLocation(glProgram, 'a_position');
    // const textureCoordsLocation = this.gl.getAttributeLocation(glProgram, 'a_textureCoords');

    // create buffers and bind them
    const positionBuffer = this.gl.createBuffer();
    const textureCoordsBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl, positionBuffer);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, textureCoordsBuffer);

    // create a texture
    this.texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);

    // set some parameters
    // btw we don't need to set gl.TEXTURE_WRAP_[S|T], because it's set to repeat by default — which is what we want
    this.gl.texParameteri(this.gl, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);

    // we need a rectangle. This is output data, not texture. This means that the size of the rectangle should be
    // [sample count] x height of the sample, as shader can sample frame at a different resolution than what gets
    // rendered here. We don't need all horizontal pixels on our output. We do need all vertical pixels, though)
    this.glSetRectangle(this.gl, this.settings.active.aard.sampleCols, cheight);

    // do setup once
    // tho we could do it for every frame
    this.canvasScaleFactor = cheight / this.video.videoHeight;

    //#endregion

    //
    // [3] detect if we're in the fallback mode and reset guardline
    //

    if (this.fallbackMode) {
      this.logger.log('warn', 'debug', `[AardGl::setup] <@${this.arid}>  WARNING: CANVAS RESET DETECTED/we're in fallback mode - recalculating guardLine`, "background: #000; color: #ff2");
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

    // if we're restarting AardGl, we need to do this in order to force-recalculate aspect ratio
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
    console.log("DRAWING BUFFER SIZE:", this.gl.drawingBufferWidth, '×', this.gl.drawingBufferHeight);
  }

  drawFrame() {
    const level = 0;
    const internalFormat = this.gl.RGBA;
    const sourceFormat = this.gl.RGBA;
    const sourceType = this.gl.UNSIGNED_BYTE;

    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);

    // if (this.resizeInput) {
      // TODO: check if 'width' and 'height' mean the input gets resized
      // this.gl.texImage2D(gl.TEXTURE_2D, level, internalformat, width, height, border, format, type, pixels)
    // } else {
      this.gl.texImage2D(gl.TEXTURE_2D, level, internalformat, sourceFormat, sourceType, this.video);
    // }

    // get the pixels back out:
    this.gl.readPixels(0, 0, width, height, format, type, pixels)
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
      this.logger.log('warn', 'debug', `[AardGl::main] <@${this.arid}>  We are trying to start another instance of autodetection on current video, but the previous instance hasn't exited yet. Waiting for old instance to exit ...`);
      await sleep(this.settings.active.aard.timers.tickrate);
    }
    if (!this._exited) {
      this.logger.log('error', 'debug', `[AardGl::main] <@${this.arid}>  Previous instance didn't exit in time. Not starting a new one.`);
      return;
    }

    this.logger.log('info', 'debug', `%c[AardGl::main] <@${this.arid}>  Previous instance didn't exit in time. Not starting a new one.`);

    // we need to unhalt:
    this._halted = false;
    this._exited = false;

    // set initial timestamps so frame check will trigger the first time we run the loop
    let lastFrameCheckStartTime = Date.now() - (this.settings.active.aardGl.timers.playing << 1);

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
          this.logger.log('error', 'debug', `%c[AardGl::main] <@${this.arid}>  Frame check failed:`,  "color: #000, background: #f00", e);
        }

        if (Debug.performanceMetrics) {
          fctime = performance.now() - fcstart;
          frameCheckTimes[frameCheckBufferIndex % frameCheckTimes.length] = fctime;
          this.conf.pageInfo.sendPerformanceUpdate({frameCheckTimes: frameCheckTimes, lastFrameCheckTime: fctime});
          ++frameCheckBufferIndex;
        }
      }

      await this.nextFrame();
    }

    this.logger.log('info', 'debug', `%c[AardGl::main] <@${this.arid}>  Main autodetection loop exited. Halted? ${this._halted}`,  _ard_console_stop);
    this._exited = true;
  }

  frameCheck(){
    if(! this.video){
      this.logger.log('error', 'debug', `%c[AardGl::frameCheck] <@${this.arid}>  Video went missing. Destroying current instance of videoData.`);
      this.conf.destroy();
      return;
    }

    if (!this.blackframeContext) {
      this.init();
    }
    
    var startTime = performance.now();

    //
    // [0] try drawing image to canvas
    //
    let imageData;

    try {
      this.drawFrame();


      this.fallbackMode = false;
    } catch (e) {
      this.logger.log('error', 'arDetect', `%c[AardGl::frameCheck] <@${this.arid}>  %c[AardGl::frameCheck] can't draw image on canvas. ${this.canDoFallbackMode ? 'Trying canvas.drawWindow instead' : 'Doing nothing as browser doesn\'t support fallback mode.'}`, "color:#000; backgroud:#f51;", e);
    }

    // [1]



    
    this.clearImageData(imageData);
  }

  /**
   * -------------------------
   * DATA PROCESSING HELPERS
   * -------------------------
   */
  //#region result processing
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

      if(edges.top > 1 && edges.top <= this.settings.active.aard.fallbackMode.noTriggerZonePx ){
        this.logger.log('info', 'arDetect', `%c[AardGl::calculateArFromEdges] <@${this.arid}>  Edge is in the no-trigger zone. Aspect ratio change is not triggered.`)
        return;
      }
      
      // varnostno območje, ki naj ostane črno (da lahko v fallback načinu odkrijemo ožanje razmerja stranic).
      // x2, ker je safetyBorderPx definiran za eno stran.
      // safety border so we can detect aspect ratio narrowing (21:9 -> 16:9).
      // x2 because safetyBorderPx is for one side.
      trueHeight += (this.settings.active.aard.fallbackMode.safetyBorderPx << 1);

      return this.canvas.width * zoomFactor / trueHeight;
    }
  }

  processAr(trueAr){
    this.detectedAr = trueAr;
    
    // poglejmo, če se je razmerje stranic spremenilo
    // check if aspect ratio is changed:
    var lastAr = this.conf.resizer.getLastAr();
    if (lastAr.type === AspectRatio.Automatic && lastAr.ratio !== null){
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
      this.logger.log('info', 'arDetect', `%c[AardGl::processAr] <@${this.arid}>  New aspect ratio varies from the old one by this much:\n`,"color: #aaf","old Ar", lastAr.ar, "current ar", trueAr, "arDiff (absolute):",arDiff,"ar diff (relative to new ar)", arDiff_percent);

      if (arDiff < trueAr * this.settings.active.aard.allowedArVariance){
        this.logger.log('info', 'arDetect', `%c[AardGl::processAr] <@${this.arid}>  Aspect ratio change denied — diff %: ${arDiff_percent}`, "background: #740; color: #fa2");
        return;
      }
      this.logger.log('info', 'arDetect', `%c[AardGl::processAr] <@${this.arid}>  aspect ratio change accepted — diff %: ${arDiff_percent}`, "background: #153; color: #4f9");
    }
    this.logger.log('info', 'debug', `%c[AardGl::processAr] <@${this.arid}>  Triggering aspect ratio change. New aspect ratio: ${trueAr}`, _ard_console_change);
    
    this.conf.resizer.updateAr({type: AspectRatio.Automatic, ratio: trueAr}, {type: AspectRatio.Automatic, ratio: trueAr});
  }
  //#endregion
  //#region data processing / frameCheck helpers

  //#endregion
}

var _ard_console_stop = "background: #000; color: #f41";
var _ard_console_start = "background: #000; color: #00c399";
var _ard_console_change = "background: #000; color: #ff8";

export default AardGl;
