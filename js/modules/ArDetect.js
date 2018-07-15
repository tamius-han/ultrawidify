class ArDetector {

  constructor(videoData){
    this.conf = videoData;
    this.video = videoData.video;
    
    this.setupTimer = null;
    this.timer = null;

    this.sampleCols = [];

    // todo: dynamically detect the following two
    this.canFallback = true;
    this.fallbackMode = false;

    this.blackLevel = ExtensionConf.arDetect.blackLevel_default;    
  }

  init(){
    if(Debug.debug){
      console.log("[ArDetect::init] Initializing autodetection")
    }
    this.setup(ExtensionConf.arDetect.hSamples, ExtensionConf.arDetect.vSamples);
  }

  destroy(){
    this.debugCanvas.destroy();
  }

  setup(cwidth, cheight, forceStart){
    
    this.guardLine = new GuardLine(this);
    this.edgeDetector = new EdgeDetect(this);
    this.debugCanvas = new DebugCanvas(this);

    if(Debug.debug) {
      console.log("[ArDetect::setup] Starting autodetection setup");
    }

    if (this.fallbackMode || cheight !== ExtensionConf.arDetect.hSamples) {
      if(Debug.debug) {
        console.log("%c[ArDetect::setup] WARNING: CANVAS RESET DETECTED - recalculating guardLine", "background: #000; color: #ff2" )
      }
      // blackbar, imagebar
      this.guardLine.reset();
    }

    if(!cwidth){
      cwidth = ExtensionConf.arDetect.hSamples;
      cheight = ExtensionConf.arDetect.vSamples;
    }

    
    try{
      if(Debug.debug){
        console.log("[ArDetect::setup] Trying to setup automatic aspect ratio detector. Choice config bits:\ncanvas dimensions:",cwidth, "×", cheight, "\nvideoData:", this.conf);
      }
    
      this._halted = false;
      this.detectionTimeoutEventCount = 0;
      
      // // vstavimo začetne stolpce v this.sampleCols.  - NE!
      // // let's insert initial columns to this.sampleCols - NO!!! do it later dow
      // this.sampleCols = [];

      // var samplingIntervalPx = parseInt(cheight / ExtensionConf.arDetect.samplingInterval)
      // for(var i = 1; i < ExtensionConf.arDetect.samplingInterval; i++){
      //   this.sampleCols.push(i * samplingIntervalPx);
      // }
      
      if(this.canvas){
        if(Debug.debug)
          console.log("[ArDetect::setup] existing canvas found. REMOVING KEBAB removing kebab\n\n\n\n(im hungry and you're not authorized to have it)");
        
        this.canvas.remove();
        
        if(Debug.debug)
          console.log("[ArDetect::setup] canvas removed");
      }
      
      // imamo video, pa tudi problem. Ta problem bo verjetno kmalu popravljen, zato setup začnemo hitreje kot prej
      // we have a video, but also a problem. This problem will prolly be fixed very soon, so setup is called with
      // less delay than before

      if(this.video.videoWidth === 0 || this.video.videoHeight === 0 ){

        if(Debug.debug){
          console.log("[ArDetector::setup] video has no width or height!", this.video.videoWidth,"×", this.video.videoHeight)
        }
        this.scheduleInitRestart();
        
        return;
      }
      
      // things to note: we'll be keeping canvas in memory only. 
      this.canvas = document.createElement("canvas");
      this.canvas.width = cwidth;
      this.canvas.height = cheight;

      this.context = this.canvas.getContext("2d");
      
      // do setup once
      // tho we could do it for every frame
      this.canvasScaleFactor = cheight / this.video.videoHeight;

      try{
        // determine where to sample
        var ncol = ExtensionConf.arDetect.staticSampleCols;
        var nrow = ExtensionConf.arDetect.staticSampleRows;
        
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
      }
      catch(ex){
        console.log("%c[ArDetect::_arSetup] something went terribly wrong when calcuating sample colums.", ExtensionConf.colors.criticalFail);
        console.log("settings object:", Settings);
        console.log("error:", ex);
      }
      
      // we're also gonna reset this
      this.guardLine.top = null;
      this.guardLine.bottom = null;
      
      this.resetBlackLevel();
      this._forcehalt = false;
      // if we're restarting ArDetect, we need to do this in order to force-recalculate aspect ratio
      
      this.conf.resizer.setLastAr({type: "auto", ar: null});

      this.canvasImageDataRowLength = cwidth << 2;
      this.noLetterboxCanvasReset = false;
      
      if(forceStart || canStartAutoAr() ) {
        this.start();
      }
    }
    catch(ex){
      console.log(ex);
    }
  
    if(Debug.debugCanvas.enabled){
      this.debugCanvas.init({width: cwidth, height: cheight});
      // DebugCanvas.draw("test marker","test","rect", {x:5, y:5}, {width: 5, height: 5});
    }

    this.conf.arSetupComplete = true;
  }

  start(){
    if (Debug.debug) {
      console.log("%c[ArDetect::setup] Starting automatic aspect ratio detection.", _ard_console_start);
    }
    this._halted = false;
    this.conf.resizer.resetLastAr();
    this.scheduleFrameCheck(0, true);
  }

  unpause() {
    if(this._paused){ // resume only if we explicitly paused
      this._paused = false;
      this.start();
    }
  }

  pause() {
    // pause only if we were running before. Don't pause if we aren't running
    // (we are running when _halted is neither true nor undefined)
    if (this._halted === false) {
      this._paused = true;
      this.stop();
    }
  }

  stop(){
    if(Debug.debug){
      console.log("%c[ArDetect::_ard_stop] Stopping automatic aspect ratio detection", _ard_console_stop);    
    }
    this._forcehalt = true;
    this._halted = true;
    clearTimeout(this.setupTimer);
    clearTimeout(this.timer);
    this.conf.resizer.resetLastAr();
  }

  isRunning(){
    return ! this._halted && ! this._paused;
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
        ths.init();
        }catch(e){console.log("[ArDetector::scheduleInitRestart] Failed to start init(). Error:",e)}
        ths = null;
      },
      timeout
    );
  }

  scheduleFrameCheck(timeout, force_reset){
    if(! timeout){
      this.frameCheck();
      return;
    }
  
    // run anything that needs to be run after frame check
    this.postFrameCheck(); 

    // don't allow more than 1 instance
    if(this.timer){ 
      clearTimeout(this.timer);
    }
    
    var ths = this;

    // console.log(this.video, "this.video | ths.video", ths.video)
    // console.log(this.conf.video, "this.conf | ths.conf", ths.conf.video)
    // console.log("resizer conf&vid", 
    // this.conf.resizer, this.conf.resizer.conf, this.conf.resizer.video, this.conf.resizer.conf.video )
    
    // debugger;

    this.timer = setTimeout(function(){
        ths.timer = null;
        try{
        ths.frameCheck();
        }catch(e){console.log("Frame check failed. Error:",e)}
        ths = null;
      },
      timeout
    );
  }


  postFrameCheck(){
    if(Debug.debugCanvas.enabled){
      this.debugCanvas.update();
    }
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
    if(Debug.debug)
      console.log("%c[ArDetect::_ard_canvasReadyForDrawWindow] (?)", "color: #44f", this.canvas.height == window.innerHeight, "(ard_height:", this.canvas.height, "| window height:", window.innerHeight, ")");
    
    return this.canvas.height == window.innerHeight
  }

  getTimeout(baseTimeout, startTime){
    var execTime = (performance.now() - startTime);
    
    if( execTime > ExtensionConf.arDetect.autoDisable.maxExecutionTime ){
      //  this.detectionTimeoutEventCount++;
  
      if(Debug.debug){
        console.log("[ArDetect::getTimeout] Exec time exceeded maximum allowed execution time. This has now happened " +  this.detectionTimeoutEventCount + " times in a row.");
      }
  
      // if( this.detectionTimeoutEventCount >= ExtensionConf.arDetect.autoDisable.consecutiveTimeoutCount ){
      //   if (Debug.debug){
      //     console.log("[ArDetect::getTimeout] Maximum execution time was exceeded too many times. Automatic aspect ratio detection has been disabled.");
      //   }
  
      //   Comms.sendToBackgroundScript({cmd: 'disable-autoar', reason: 'Automatic aspect ratio detection was taking too much time and has been automatically disabled in order to avoid lag.'});
      //   _ard_stop();
      //   return 999999;
      // }
      
    } else {
       this.detectionTimeoutEventCount = 0;
    } 
  //   return baseTimeout > ExtensionConf.arDetect.minimumTimeout ? baseTimeout : ExtensionConf.arDetect.minimumTimeout;
    
    return baseTimeout;
  }
  //#endregion

  calculateArFromEdges(edges) {
    // if we don't specify these things, they'll have some default values.
    if(edges.top === undefined){
      edges.top = 0;
      edges.bottom = 0;
      edge.left = 0;
      edges.right = 0;
    }

    let zoomFactor = 1;
    var letterbox = edges.top + edges.bottom;
   
    if (this.fallbackMode) {
      // there's stuff missing from the canvas. We need to assume canvas' actual height is bigger by a factor x, where
      //   x = [video.zoomedHeight] / [video.unzoomedHeight]
      //
      // letterbox also needs to be corrected:
      //   letterbox += [video.zoomedHeight] - [video.unzoomedHeight]

      var vbr = this.video.getBoundingClientRect();
      
      zoomFactor = vbr.height / this.video.clientHeight;
      letterbox += vbr.height - this.video.clientHeight;
    }

    var trueHeight = this.canvas.height * zoomFactor - letterbox;

    if(this.fallbackMode){
      if(edges.top > 1 && edges.top <= ExtensionConf.arDetect.fallbackMode.noTriggerZonePx ){
        if(Debug.debug && Debug.debugArDetect) {
          console.log("Edge is in the no-trigger zone. Aspect ratio change is not triggered.")
        }
        return;
      }
      
      // varnostno območje, ki naj ostane črno (da lahko v fallback načinu odkrijemo ožanje razmerja stranic).
      // x2, ker je safetyBorderPx definiran za eno stran.
      // safety border so we can detect aspect ratio narrowing (21:9 -> 16:9).
      // x2 because safetyBorderPx is for one side.
      trueHeight += (ExtensionConf.arDetect.fallbackMode.safetyBorderPx << 1);
    }


    return this.canvas.width * zoomFactor / trueHeight;
  }

  processAr(trueAr){
    let actualHeight = 0; // purely for fallback mode
    this.detectedAr = trueAr;
    
    // poglejmo, če se je razmerje stranic spremenilo
    // check if aspect ratio is changed:
    var lastAr = this.conf.resizer.getLastAr();
    if( lastAr.type == "auto" && lastAr.ar != null){
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
      if(Debug.debug && Debug.debugArDetect)
        console.log("%c[ArDetect::_ard_processAr] new aspect ratio varies from the old one by this much:\n","color: #aaf","old Ar", lastAr.ar, "current ar", trueAr, "arDiff (absolute):",arDiff,"ar diff (relative to new ar)", arDiff_percent);
      
      if (arDiff < trueAr * ExtensionConf.arDetect.allowedArVariance){
        if(Debug.debug && Debug.debugArDetect)
          console.log("%c[ArDetect::_ard_processAr] aspect ratio change denied — diff %:", "background: #740; color: #fa2", arDiff_percent)
          
        return;
      }
      else if(Debug.debug && Debug.debugArDetect){
        console.log("%c[ArDetect::_ard_processAr] aspect ratio change accepted — diff %:", "background: #153; color: #4f9", arDiff_percent)
      }
    }
    
    if(Debug.debug)
      console.log("[ArDetect::_ard_processAr] attempting to fix aspect ratio. New aspect ratio: ", trueAr);
    
    this.conf.resizer.setAr(trueAr, {type: "auto", ar: trueAr});
  }

  frameCheck(){

    // console.log("this.video:", this.video, this.conf.video);
    // debugger;

    if(this._halted)
     return;

    if(! this.video){
      if(Debug.debug || Debug.warnings_critical)
        console.log("[ArDetect::_ard_vdraw] Video went missing. Destroying current instance of videoData.")
      this.conf.destroy();
      return;
    }
    
    var fallbackMode = false;
    var startTime = performance.now();
    var baseTimeout = ExtensionConf.arDetect.timer_playing;
    var triggerTimeout;
    
    var guardLineResult = true;         // true if success, false if fail. true by default
    var imageDetectResult = false;      // true if we detect image along the way. false by default
    

    var sampleCols = this.sampleCols.slice(0);
    
    var how_far_treshold = 8; // how much can the edge pixel vary (*4)
    
    if(this.video.ended ){
      // we slow down if ended. Detecting is pointless.
      
      this.scheduleFrameCheck(ExtensionConf.arDetect.timer_paused);
      return false;
    }
    
    if(this.video.paused){
      // če je video pavziran, še vedno skušamo zaznati razmerje stranic - ampak bolj poredko.
      // if the video is paused, we still do autodetection. We just do it less often.
      baseTimeout = ExtensionConf.arDetect.timer_paused;
    }
    
    try{
      this.context.drawImage(this.video, 0,0, this.canvas.width, this.canvas.height);
    }
    catch(ex){
      if(Debug.debug) {
        console.log("%c[ArDetect::_ard_vdraw] can't draw image on canvas. Trying canvas.drawWindow instead", "color:#000; backgroud:#f51;", ex);
      }

      try{
        if(! ExtensionConf.arDetect.fallbackMode.enabled)
          throw "fallbackMode is disabled.";
        
        if(this.canvasReadyForDrawWindow()){
          this.context.drawWindow(window, this.canvasDrawWindowHOffset, 0, this.canvas.width, this.canvas.height, "rgba(0,0,128,1)");
          
          if(Debug.debug)
            console.log("%c[ArDetect::_ard_vdraw] canvas.drawImage seems to have worked", "color:#000; backgroud:#2f5;");
          this.fallbackMode = true;
        }
        else{
          // canvas needs to be resized, so let's change setup
          this.stop();
          
          var newCanvasWidth = window.innerHeight * (this.video.videoWidth / this.video.videoHeight);
          var newCanvasHeight = window.innerHeight;
          
          if(ExtensionConf.miscFullscreenSettings.videoFloat == "center")
            this.canvasDrawWindowHOffset = Math.round((window.innerWidth - newCanvasWidth) * 0.5);
          else if(ExtensionConf.miscFullscreenSettings.videFloat == "left")
            this.canvasDrawWindowHOffset = 0;
          else
            this.canvasDrawWindowHOffset = window.innerWidth - newCanvasWidth;
          
          this.setup(newCanvasWidth, newCanvasHeight);
          
          return;
        }
        
      }
      catch(ex){
        if(Debug.debug)
          console.log("%c[ArDetect::_ard_vdraw] okay this didnt work either", "color:#000; backgroud:#f51;", ex);
        
        this.scheduleFrameCheck( ExtensionConf.arDetect.timer_error );
        return;  
      }
    }

    if (! this.blackLevel) {
      if(Debug.debugArDetect)
        console.log("[ArDetect::_ard_vdraw] black level undefined, resetting");
      
      this.resetBlackLevel();
    }
    
    // we get the entire frame so there's less references for garbage collection to catch
    var image = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
    
    if(Debug.debugCanvas.enabled){
      this.debugCanvas.setBuffer(image);
    }

    //#region black level detection

    // fast test to see if aspect ratio is correct. If we detect anything darker than blackLevel, we modify 
    // blackLevel to the new lowest value
    var isLetter=true;
    var currentMaxVal = 0;
    var currentMax_a;
    var currentMinVal = 48; // not 255 cos safety, even this is prolly too high
    var currentMin_a;
    
    var rowOffset = 0;
    var colOffset_r, colOffset_g, colOffset_b;
    
    // detect black level. if currentMax and currentMin vary too much, we automatically know that 
    // black level is bogus and that we aren't letterboxed. We still save the darkest value as black level,
    // though — as black bars will never be brighter than that.
    
    for(var i = 0; i < sampleCols.length; ++i){
      colOffset_r = sampleCols[i] << 2;
      colOffset_g = colOffset_r + 1;
      colOffset_b = colOffset_r + 2;
      
      currentMax_a = image[colOffset_r] > image[colOffset_g] ? image[colOffset_r] : image[colOffset_g];
      currentMax_a = currentMax_a > image[colOffset_b] ? currentMax_a : image[colOffset_b];
      
      currentMaxVal = currentMaxVal > currentMax_a ? currentMaxVal : currentMax_a;
      
      currentMin_a = image[colOffset_r] < image[colOffset_g] ? image[colOffset_r] : image[colOffset_g];
      currentMin_a = currentMin_a < image[colOffset_b] ? currentMin_a : image[colOffset_b];
      
      currentMinVal = currentMinVal < currentMin_a ? currentMinVal : currentMin_a;
    }

    // we'll shift the sum. math says we can do this
    rowOffset = this.canvas.width * (this.canvas.height - 1); 
    
    for(var i = 0; i < sampleCols.length; ++i){
      colOffset_r = (rowOffset + sampleCols[i]) << 2;
      colOffset_g = colOffset_r + 1;
      colOffset_b = colOffset_r + 2;
      
      currentMax_a = image[colOffset_r] > image[colOffset_g] ? image[colOffset_r] : image[colOffset_g];
      currentMax_a = currentMax_a > image[colOffset_b] ? currentMax_a : image[colOffset_b];
      
      currentMaxVal = currentMaxVal > currentMax_a ? currentMaxVal : currentMax_a;
      
      currentMin_a = image[colOffset_r] < image[colOffset_g] ? image[colOffset_r] : image[colOffset_g];
      currentMin_a = currentMin_a < image[colOffset_b] ? currentMin_a : image[colOffset_b];
      
      if(currentMinVal == undefined && currenMinVal != undefined)
        currentMinVal = currentMin_a;
      else if(currentMin_a != undefined)
        currentMinVal = currentMinVal < currentMin_a ? currentMinVal : currentMin_a;
      
    }
    
    // save black level only if defined
    if(currentMinVal)
      this.blackLevel = this.blackLevel < currentMinVal ? this.blackLevel : currentMinVal;

    //#endregion

    // this means we don't have letterbox
    if ( currentMaxVal > (this.blackLevel + ExtensionConf.arDetect.blackbarTreshold) || (currentMaxVal - currentMinVal) > ExtensionConf.arDetect.blackbarTreshold*4 ){
      
      // Če ne zaznamo letterboxa, kličemo reset. Lahko, da je bilo razmerje stranic popravljeno na roke. Možno je tudi,
      // da je letterbox izginil.
      // If we don't detect letterbox, we reset aspect ratio to aspect ratio of the video file. The aspect ratio could
      // have been corrected manually. It's also possible that letterbox (that was there before) disappeared.
      if(Debug.debug && Debug.debugArDetect){
        console.log(`%c[ArDetect::_ard_vdraw] ---- NO EDGE DETECTED! — canvas has no edge. ----\ncurrentMaxVal: ${currentMaxVal}\nBlack level (+ treshold):${this.blackLevel} (${this.blackLevel + ExtensionConf.arDetect.blackbarTreshold})\n---diff test---\nmaxVal-minVal: ${ (currentMaxVal - currentMinVal)}\ntreshold: ${ExtensionConf.arDetect.blackbarTreshold}`, "color: #aaf");
      }
      
      // Pogledamo, ali smo že kdaj ponastavili CSS. Če še nismo, potem to storimo. Če smo že, potem ne.
      // Ponastavimo tudi guardline (na null). 
      // let's chec if we ever reset CSS. If we haven't, then we do so. If we did, then we don't.
      // while resetting the CSS, we also reset guardline top and bottom back to null.
      
      if(! this.noLetterboxCanvasReset){
        this.conf.resizer.reset({type: "auto", ar: null});
        this.guardLine.reset();
        this.noLetterboxCanvasReset = true;
      }

      triggerTimeout = this.getTimeout(baseTimeout, startTime);
      this.scheduleFrameCheck(triggerTimeout); //no letterbox, no problem
      return;
    }

    if(Debug.debug && Debug.debugArDetect){
      console.log(`%c[ArDetect::_ard_vdraw] edge was detected. Here are stats:\ncurrentMaxVal: ${currentMaxVal}\nBlack level (+ treshold):${this.blackLevel} (${this.blackLevel + ExtensionConf.arDetect.blackbarTreshold})\n---diff test---\nmaxVal-minVal: ${ (currentMaxVal - currentMinVal)}\ntreshold: ${ExtensionConf.arDetect.blackbarTreshold}`, "color: #afa");
    }
    
    // Če preverjamo naprej, potem moramo postaviti to vrednost nazaj na 'false'. V nasprotnem primeru se bo
    // css resetiral enkrat na video/pageload namesto vsakič, ko so za nekaj časa obrobe odstranejene
    // if we look further we need to reset this value back to false. Otherwise we'll only get CSS reset once
    // per video/pageload instead of every time letterbox goes away (this can happen more than once per vid)
    this.noLetterboxCanvasReset = false;
    
    // let's do a quick test to see if we're on a black frame
    // TODO: reimplement but with less bullshit
      
    // poglejmo, če obrežemo preveč.
    // let's check if we're cropping too much (or whatever)
    var guardLineOut;
    
    guardLineOut = this.guardLine.check(image, this.fallbackMode);
    
    if (guardLineOut.blackbarFail) { // add new ssamples to our sample columns
      for(var col of guardLineOut.offenders){
        sampleCols.push(col)
      }
    }

    // če ni padla nobena izmed funkcij, potem se razmerje stranic ni spremenilo
    // if both succeed, then aspect ratio hasn't changed.    
    
    // if we're in fallback mode and blackbar test failed, we restore CSS
    if (this.fallbackMode && guardLineOut.blackbarFail) {
      this.conf.resizer.reset({type: "auto", ar: null});
      this.guardLine.reset();
      this.noLetterboxCanvasReset = true;
      
      triggerTimeout = this.getTimeout(baseTimeout, startTime);
      this.scheduleFrameCheck(triggerTimeout); //no letterbox, no problem
      return;
    }
    
    if (!guardLineOut.imageFail && !guardLineOut.blackbarFail) {
      if(Debug.debug && Debug.debugArDetect){
        console.log(`%c[ArDetect::_ard_vdraw] guardLine tests were successful. (no imagefail and no blackbarfail)\n`, "color: #afa", guardLineOut);
      }

      triggerTimeout = this.getTimeout(baseTimeout, startTime);
      this.scheduleFrameCheck(triggerTimeout); //no letterbox, no problem
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
        if(this.edgeDetector.findBars(image, null, EdgeDetectPrimaryDirection.HORIZONTAL).status === 'ar_known'){

          if(Debug.debug && guardLineOut.blackbarFail){
            console.log("[ArDetect::_ard_vdraw] Detected blackbar violation and pillarbox. Resetting to default aspect ratio.");
          }

          if(guardLineOut.blackbarFail){
            this.conf.resizer.reset({type: "auto", ar: null});
            this.guardLine.reset();
          }

          
          triggerTimeout = this.getTimeout(baseTimeout, startTime);
          this.scheduleFrameCheck(triggerTimeout);
          return;
        }
      }
    } catch(e) { 
      if(Debug.debug) {
        console.log("[ArDetect.js::frameCheck] something went wrong when checking for pillarbox. Error:\n", e)
      }
    }

    // pa poglejmo, kje se končajo črne letvice na vrhu in na dnu videa.
    // let's see where black bars end.
    this.sampleCols_current = sampleCols.length;
    
    // blackSamples -> {res_top, res_bottom}
   
    var edgePost = this.edgeDetector.findBars(image, sampleCols, EdgeDetectPrimaryDirection.VERTICAL, EdgeDetectQuality.IMPROVED, guardLineOut);
    
    if(Debug.debug && Debug.debugArDetect){
      console.log(`%c[ArDetect::_ard_vdraw] edgeDetector returned this\n`,  "color: #aaf", edgePost);
    }
    //   console.log("SAMPLES:", blackbarSamples, "candidates:", edgeCandidates, "post:", edgePost,"\n\nblack level:",GlobalVars.arDetect.blackLevel, "tresh:", this.blackLevel + ExtensionConf.arDetect.blackbarTreshold);
    
    if(edgePost.status == "ar_known"){

      // zaznali smo rob — vendar pa moramo pred obdelavo še preveriti, ali ni "rob" slučajno besedilo. Če smo kot rob pofočkali
      // besedilo, potem to ni veljaven rob. Razmerja stranic se zato ne bomo pipali.
      // we detected an edge — but before we process it, we need to check if the "edge" isn't actually some text. If the detected
      // edge is actually some text on black background, we shouldn't touch the aspect ratio. Whatever we detected is invalid.
      // var textEdge = false;;

      // if(edgePost.guardLineTop != null){
      //   var row = edgePost.guardLineTop + ~~(this.canvas.height * ExtensionConf.arDetect.textLineTest.testRowOffset);
      //   textEdge |= textLineTest(image, row);
      // }
      // if(edgePost.guardLineTop != null){
      //   var row = edgePost.guardLineTop - ~~(this.canvas.height * ExtensionConf.arDetect.textLineTest.testRowOffset);
      //   textEdge |= textLineTest(image, row);
      // }

      // v nekaterih common-sense izjemah ne storimo ničesar

      var newAr = this.calculateArFromEdges(edgePost);

      if (this.fallbackMode
          && (!guardLineOut.blackbarFail && guardLineOut.imageFail)
          && newAr < this.conf.resizer.getLastAr().ar
      ) {
        // V primeru nesmiselnih rezultatov tudi ne naredimo ničesar.
        // v fallback mode se lahko naredi, da je novo razmerje stranice ožje kot staro, kljub temu da je šel
        // blackbar test skozi. Spremembe v tem primeru ne dovolimo.
        //
        // (Pravilen fix? Popraviti je treba računanje robov. V fallback mode je treba upoštevati, da obrobe,
        // ki smo jih obrezali, izginejo is canvasa)
        //
        // NOTE: pravilen fix je bil implementiran
        triggerTimeout = this.getTimeout(baseTimeout, startTime);
        this.scheduleFrameCheck(triggerTimeout);
        return;
      }
      // if(!textEdge){
        if(Debug.debug && Debug.debugArDetect){
          console.log(`%c[ArDetect::_ard_vdraw] Triggering aspect ration change! new ar: ${newAr}`, "color: #aaf");
        }
        this.processAr(newAr);
      
        // we also know edges for guardline, so set them.
        // we need to be mindful of fallbackMode though
        if (!this.fallbackMode) {
          this.guardLine.setBlackbar({top: edgePost.guardLineTop, bottom: edgePost.guardLineBottom});
        } else {
          if (this.conf.player.dimensions){
            this.guardLine.setBlackbarManual({
              top: ExtensionConf.arDetect.fallbackMode.noTriggerZonePx,
              bottom: this.conf.player.dimensions.height - ExtensionConf.arDetect.fallbackMode.noTriggerZonePx - 1
            },{
              top: edgePost.guardLineTop + ExtensionConf.arDetect.guardLine.edgeTolerancePx,
              bottom: edgePost.guardLineBottom - ExtensionConf.arDetect.guardLine.edgeTolerancePx
            })
          }
        }

      // }
      // else{
      //   console.log("detected text on edges, dooing nothing")
      // }

       
      triggerTimeout = this.getTimeout(baseTimeout, startTime);
      this.scheduleFrameCheck(triggerTimeout);
      return;
    } else {
      triggerTimeout = this.getTimeout(baseTimeout, startTime);
      this.scheduleFrameCheck(triggerTimeout); //no letterbox, no problem
      return;
    }
  }

  resetBlackLevel(){
    this.blackLevel = ExtensionConf.arDetect.blackLevel_default;    
  }

}
if(Debug.debug)
  console.log("Loading: ArDetect");

var _ard_console_stop = "background: #000; color: #f41";
var _ard_console_start = "background: #000; color: #00c399";


var textLineTest = function(image, row){
  // preverimo, če vrstica vsebuje besedilo na črnem ozadju. Če ob pregledu vrstice naletimo na veliko sprememb
  // iz črnega v ne-črno, potem obstaja možnost, da gledamo besedilo. Prisotnost take vrstice je lahko znak, da 
  // zaznano razmerje stranic ni veljavno
  //
  // vrne 'true' če zazna text, 'false' drugače.
  //
  // 
  // check if line contains any text. If line scan reveals a lot of changes from black to non-black there's a 
  // chance we're looking at text on a black background. If we detect text near what we think is an edge of the
  // video, there's a good chance we're about to incorrectly adjust the aspect ratio.
  // 
  // returns 'true' if text is detected, 'false' otherwise

  var blackbarTreshold = this.blackLevel + ExtensionConf.arDetect.blackbarTreshold;
  var nontextTreshold = this.canvas.width * ExtensionConf.arDetect.textLineTest.nonTextPulse;

  var rowStart = (row * this.canvas.width) << 2;
  var rowEnd = rowStart + (this.canvas.width << 2);

  var pulse = false;
  var currentPulseLength = 0, pulseCount = 0;
  var pulses = [];
  var longestBlack = 0;

  // preglejmo vrstico
  // analyse the row
  for(var i = rowStart; i < rowEnd; i+= 4){
    if(pulse){
      if(image[i] < blackbarTreshold || image[i+1] < blackbarTreshold || image[i+2] < blackbarTreshold){
        // pulses.push(currentPulseLength);
        pulseCount++;
        pulse = false;
        currentPulseLength = 0;
      }
      else{
        currentPulseLength++;
        
        // če najdemo dovolj dolgo zaporedje ne-črnih točk, potem vrnemo 'false' — dobili smo legitimen rob
        // if we find long enough uninterrupted line of non-black point, we fail the test. We found a legit edge.
        if(currentPulseLength > nontextTreshold){
          return false;
        }
      }
    }
    else{
      if(image[i] > blackbarTreshold || image[i+1] > blackbarTreshold || image[i+2] > blackbarTreshold){
        if(currentPulseLength > longestBlack){
          longestBlack = currentPulseLength;
        }
        pulse = true;
        currentPulseLength = 0;
      }
      else{
        currentPulseLength++;
      }
    }
  }
  if(pulse){
    pulseCount++;
    // pulses.push(currentPulseLength);
  }

  // pregledamo rezultate:
  // analyse the results
  // console.log("pulse test:\n\npulses:", pulseCount, "longest black:", longestBlack);

  // če smo zaznali dovolj pulzov, potem vrnemo res
  // if we detected enough pulses, we return true
  if(pulseCount > ExtensionConf.arDetect.textLineTest.pulsesToConfirm){
    return true;
  }

  // če je najdaljša neprekinjena črta črnih pikslov širša od polovice širine je merilo za zaznavanje
  // besedila rahlo milejše
  // if the longest uninterrupted line of black pixels is wider than half the width, we use a more
  // forgiving standard for determining if we found text
  if( longestBlack > (this.canvas.width >> 1) && 
      pulseCount   > ExtensionConf.arDetect.textLineTest.pulsesToConfirmIfHalfBlack ){
    return true;
  }

  // če pridemo do sem, potem besedilo ni bilo zaznano
  // if we're here, no text was detected
  return false;
}

