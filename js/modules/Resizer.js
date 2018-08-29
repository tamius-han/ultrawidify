if(Debug.debug)
  console.log("Loading: Resizer.js");

var StretchMode = {
  NO_STRETCH: 0,
  BASIC: 1,
  HYBRID: 2,
  CONDITIONAL: 3
}

class Resizer {
  
  constructor(videoData){
    this.conf = videoData;
    this.video = videoData.video;
    this.settings = videoData.settings;

    this.scaler = new Scaler(this.conf);
    this.stretcher = new Stretcher(this.conf); 
    this.zoom = new Zoom(this.conf);

    // load up default values
    this.correctedVideoDimensions = {};
    this.currentCss = {};
    this.currentStyleString = "";
    this.currentCssValidFor = {};

    // restore watchdog. While true, applyCss() tries to re-apply new css until this value becomes false again
    // value becomes false when width and height of <video> tag match with what we want to set. Only necessary when
    // calling _res_restore() for some weird reason.
    this.restore_wd = false;

    // CSS watcher will trigger _very_ often for this many iterations
    this.cssWatcherIncreasedFrequencyCounter = 0;


    this.lastAr = {type: 'original'};
    this.destroyed = false;

    this.resizerId = (Math.random(99)*100).toFixed(0);
  }
  
  start(){
    this.startCssWatcher();
  }

  stop(){
    this.stopCssWatcher();
  }

  destroy(){
    if(Debug.debug){
      console.log(`[Resizer::destroy] <rid:${this.resizerId}> received destroy command.`);
    }
    this.destroyed = true;
    this.stopCssWatcher();
  }


  setAr(ar, lastAr){
    if (this.destroyed) {
      return;
    }
    this.startCssWatcher();
    this.cssWatcherIncreasedFrequencyCounter = 20;
    
    if(Debug.debug){
      console.log('[Resizer::setAr] <rid:'+this.resizerId+'> trying to set ar. New ar:', ar)
    }

    if(lastAr) {
      this.lastAr = lastAr;
    } else {
      if(isNaN(ar)){
        this.lastAr = {type: 'legacy', ar: ar}
      } else {
        this.lastAr = {type: 'static', ar: ar};
      }
    }

    if (! this.video) {
      // console.log("No video detected.")
      this.videoData.destroy();
    }

    // pause AR on basic stretch, unpause when using other mdoes
    // fir sine reason unpause doesn't unpause. investigate that later
    // if (this.stretcher.mode === StretchMode.BASIC) {
    //   this.conf.arDetector.pause();
    // } else {
    //   this.conf.arDetector.unpause();
    // }

    // do stretch thingy
    if (this.stretcher.mode === StretchMode.NO_STRETCH || this.stretcher.mode === StretchMode.CONDITIONAL){
      var stretchFactors = this.scaler.calculateCrop(ar);

      if(! stretchFactors || stretchFactors.error){
        if(Debug.debug){
          console.log("[Resizer::setAr] <rid:"+this.resizerId+"> failed to set AR due to problem with calculating crop. Error:", (stretchFactors ? stretchFactors.error : stretchFactors));
        }
        if(stretchFactors.error === 'no_video'){
          this.conf.destroy();
        }
        return;
      }
      if(this.stretcher.mode === StretchMode.CONDITIONAL){
         this.stretcher.applyConditionalStretch(stretchFactors, ar);
      }
    } else if (this.stretcher.mode === StretchMode.HYBRID) {
      var stretchFactors = this.stretcher.calculateStretch(ar);
    } else if (this.stretcher.mode === StretchMode.BASIC) {
      var stretchFactors = this.stretcher.calculateBasicStretch();
    }

    this.zoom.applyZoom(stretchFactors);

    //TODO: correct these two
    var translate = this.computeOffsets(stretchFactors);
    this.applyCss(stretchFactors, translate);

  }

  resetLastAr() {
    this.lastAr = {type: 'original'};
  }

  setLastAr(override){
    this.lastAr = override;
  }

  getLastAr(){
    return this.lastAr;
  }

  setStretchMode(stretchMode){
    this.stretcher.mode = stretchMode;
    this.restore();
  }

  setPan(relativeMousePosX, relativeMousePosY){
    // relativeMousePos[X|Y] - on scale from 0 to 1, how close is the mouse to player edges. 
    // use these values: top, left: 0, bottom, right: 1
    if(! this.pan){
      this.pan = {};
    }

    this.pan.relativeOffsetX = relativeMousePosX*2.5 - 1.25;
    this.pan.relativeOffsetY = relativeMousePosY*2.5 - 1.25;
  }

  startCssWatcher(){
    if (this.destroyed) {
      return;
    }
    // this.haltCssWatcher = false;
    if(!this.cssWatcherTimer){
      this.scheduleCssWatcher(1);
    } else {
      clearTimeout(this.cssWatcherTimer);
      this.scheduleCssWatcher(1);
    }
  }
  
  scheduleCssWatcher(timeout, force_reset) {
    if (this.destroyed) {
      return;
    }

    if(timeout === undefined) {
      console.log("?")
      this.cssCheck(); // no timeout = one-off
      return;
    }

    if(this.cssWatcherTimeout) {
      clearTimeout(this.cssWatcherTimer);
    }

    var ths = this;
    this.cssWatcherTimer = setTimeout(function () {
        ths.cssWatcherTimer = null;
        try {
          ths.cssCheck();
        } catch (e) {
          if(Debug.debug) {
            console.log("[Resizer.js::scheduleCssWatcher] Css check failed. Error:", e);
          }
        }
      }, timeout);
  }

  stopCssWatcher() {
    if(Debug.debug) console.log("[Resizer.js] STOPPING CSS WATCHER!")

    clearInterval(this.cssWatcherTimeout);
  }

  restore() {
    if(Debug.debug){
      console.log("[Resizer::restore] <rid:"+this.resizerId+"> attempting to restore aspect ratio. this & settings:", {'this': this, "settings": this.settings} );
    }
    
    // this is true until we verify that css has actually been applied
    this.restore_wd = true;
    
    if(this.lastAr.type === 'original'){
      this.setAr('reset');
    }
    else {
      this.setAr(this.lastAr.ar, this.lastAr)
    }
  }

  reset(){
    this.setStretchMode(StretchMode.NO_STRETCH);
    this.zoom.setZoom(1);
    this.resetPan();
    this.setAr('reset');
  }

  resetPan(){
    this.pan = undefined;
  }

  zoomStep(step){
    this.zoom.zoomStep(step);
  }

  resetZoom(){
    this.zoom.setZoom(1);
    this.restore();
  }

  resetCrop(){
    this.setAr('reset');
  }

  resetStretch(){
    this.stretcher.mode = StretchMode.NO_STRETCH;
    this.restore();
  }


  // mostly internal stuff

  computeOffsets(stretchFactors){

    if(Debug.debug)
      console.log("[Resizer::_res_computeOffsets] <rid:"+this.resizerId+"> video will be aligned to ", this.settings.active.miscFullscreenSettings.videoFloat);
  
    var actualWidth = this.conf.video.offsetWidth * stretchFactors.xFactor;
    var actualHeight = this.conf.video.offsetHeight * stretchFactors.yFactor;

    var translate = {x: 0, y: 0};

    if (this.pan) {
      // todo: calculate translate
    } else {
      if (this.settings.active.miscFullscreenSettings.videoFloat == "left") {
        translate.x = (this.conf.player.dimensions.width - actualWidth) * -0.5;
      }
      else if (this.settings.active.miscFullscreenSettings.videoFloat == "right") {
        translate.x = (this.conf.player.dimensions.width - actualWidth) * 0.5;
      }
    }

    return translate; 
  }
  
  applyCss(stretchFactors, translate){

    if (! this.video) {
      if(Debug.debug)
        console.log("[Resizer::_res_applyCss] <rid:"+this.resizerId+"> Video went missing, doing nothing.");
      this.conf.destroy();
      return;
    }
    
    // save stuff for quick tests (before we turn numbers into css values):
    this.currentVideoSettings = {
      validFor:  this.conf.player.dimensions,
      // videoWidth: dimensions.width,
      // videoHeight: dimensions.height
    }

    var styleArrayStr = this.video.getAttribute('style');
    
    if (styleArrayStr) {
      
      var styleArray = styleArrayStr.split(";");
      for(var i in styleArray){
        
        styleArray[i] = styleArray[i].trim();
        
        if (styleArray[i].startsWith("transform:")){
          delete styleArray[i];
        }
      }
    }
    else{
      var styleArray = [];
    }
    
    // add remaining elements
    
    if(stretchFactors){
      styleArray.push(`transform: scale(${stretchFactors.xFactor}, ${stretchFactors.yFactor}) translate(${translate.x}px, ${translate.y}px)`);
    }

    // build style string back
    var styleString = "";
    for(var i in styleArray)
      if(styleArray[i])
        styleString += styleArray[i] + "; ";
    
    this.setStyleString(styleString);
  }

  setStyleString (styleString, count = 0) {
    this.video.setAttribute("style", styleString);

    this.currentStyleString = this.video.getAttribute('style');
    this.currentCssValidFor = this.conf.player.dimensions;
    
    if(this.restore_wd){
  
      if(! this.video){
        if(Debug.debug)
          console.log("[Resizer::_res_setStyleString] <rid:"+this.resizerId+"> Video element went missing, nothing to do here.")
        return;
      }
      
      // if(
      //   styleString.indexOf("width: " + this.video.style.width) == -1 ||
      //   styleString.indexOf("height: " + this.video.style.height) == -1) {
      //   // css ni nastavljen?
      //   // css not set?
      //   if(Debug.debug)
      //     console.log("[Resizer::_res_setStyleString] Style string not set ???");
        
      //   if(count < settings.active.resizer.setStyleString.maxRetries){
      //     setTimeout( this.setStyleString, settings.active.resizer.setStyleString.retryTimeout, count + 1);
      //   }
      //   else if(Debug.debug){
      //     console.log("[Resizer::_res_setStyleString] we give up. css string won't be set");
      //   }
      // }
      // else{
        this.restore_wd = false;
      // }
    }
    else{
      if(Debug.debug)
        console.log("[Resizer::_res_setStyleString] <rid:"+this.resizerId+"> css applied. Style string:", styleString);
    }
  }

  cssCheck(){
    // this means we haven't set our CSS yet, or that we changed video.
    // if(! this.currentCss.tranform) {
    //   this.scheduleCssWatcher(200);      
    //   return;
    // }
    
    // this means video went missing. videoData will be re-initialized when the next video is found
    if(! this.video){
      if(Debug.debug) {
        console.log("[Resizer::cssCheck] <rid:"+this.resizerId+"> no video detecting, issuing destroy command");
      }
      this.conf.destroy();
      return;
    }
    
    if(this.destroyed) {
      if(Debug.debug) {
        console.log("[Resizer::cssCheck] <rid:"+this.resizerId+"> destroyed flag is set, we shouldnt be running");
      }
      return;
    }

    var styleString = this.video.getAttribute('style');

    // first, a quick test:
    // if (this.currentVideoSettings.validFor == this.conf.player.dimensions ){
    if (this.currentStyleString !== styleString){
      this.restore();
      this.scheduleCssWatcher(10);
      return;
    }
    if (this.cssWatcherIncreasedFrequencyCounter > 0) {
      --this.cssWatcherIncreasedFrequencyCounter;
      this.scheduleCssWatcher(20);
    } else {
      this.scheduleCssWatcher(1000);    
    }
  }
}
