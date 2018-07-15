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


    this.scaler = new Scaler(this.conf);
    this.stretcher = new Stretcher(this.conf); 
    this.zoom = new Zoom(this.conf);

    // load up default values
    this.correctedVideoDimensions = {};
    this.currentCss = {};

    // restore watchdog. While true, applyCss() tries to re-apply new css until this value becomes false again
    // value becomes false when width and height of <video> tag match with what we want to set. Only necessary when
    // calling _res_restore() for some weird reason.
    this.restore_wd = false;

    this.lastAr = {type: 'original'};
    this.destroyed = false;
  }
  
  start(){
    this.startCssWatcher();
  }

  stop(){
    this.stopCssWatcher();
  }

  destroy(){
    this.destroyed = true;
    this.stopCssWatcher();
  }


  setAr(ar, lastAr){
    if(Debug.debug){
      console.log('[Resizer::setAr] trying to set ar. New ar:', ar)
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
          console.log("[Resizer::setAr] failed to set AR due to problem with calculating crop. Error:", (stretchFactors ? stretchFactors.error : stretchFactors));
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
    // this.haltCssWatcher = false;
    if(!this.cssWatcherTimeout){
      // if(Debug.debug)
        // console.log("[Resizer.js] STARTING CSS WATCHER")
  
      // this.cssWatcherTimeout = setInterval(this.cssWatcher, 200, this);
    }
  }

  stopCssWatcher() {
    if(Debug.debug) console.log("[Resizer.js] STOPPING CSS WATCHER!")

    clearInterval(this.cssWatcherTimeout);
  }

  restore() {
    if(Debug.debug){
      console.log("[Resizer::restore] attempting to restore aspect ratio. this & settings:", {'this': this, "settings": Settings} );
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
      console.log("[Resizer::_res_computeOffsets] video will be aligned to ", ExtensionConf.miscFullscreenSettings.videoFloat);
  
    var actualWidth = this.conf.video.offsetWidth * stretchFactors.xFactor;
    var actualHeight = this.conf.video.offsetHeight * stretchFactors.yFactor;

    var translate = {x: 0, y: 0};

    if (this.pan) {
      // todo: calculate translate
    } else {
      if (ExtensionConf.miscFullscreenSettings.videoFloat == "left") {
        translate.x = (this.conf.player.dimensions.width - actualWidth) * -0.5;
      }
      else if (ExtensionConf.miscFullscreenSettings.videoFloat == "right") {
        translate.x = (this.conf.player.dimensions.width - actualWidth) * 0.5;
      }
    }

    return translate; 
  }
  
  applyCss(stretchFactors, translate){

    if (! this.video) {
      if(Debug.debug)
        console.log("[Resizer::_res_applyCss] Video went missing, doing nothing.");
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
    
    if(this.restore_wd){
  
      if(! this.video){
        if(Debug.debug)
          console.log("[Resizer::_res_setStyleString] Video element went missing, nothing to do here.")
        return;
      }
      
      // if(
      //   styleString.indexOf("width: " + this.video.style.width) == -1 ||
      //   styleString.indexOf("height: " + this.video.style.height) == -1) {
      //   // css ni nastavljen?
      //   // css not set?
      //   if(Debug.debug)
      //     console.log("[Resizer::_res_setStyleString] Style string not set ???");
        
      //   if(count < ExtensionConf.resizer.setStyleString.maxRetries){
      //     setTimeout( this.setStyleString, ExtensionConf.resizer.setStyleString.retryTimeout, count + 1);
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
        console.log("[Resizer::_res_setStyleString] css applied. Style string:", styleString);
    }
  }

  cssWatcher(ths){
    // this means we haven't set our CSS yet, or that we changed video.
    if(! ths.currentCss.top)
      return;
    
    // this means video went missing. videoData will be re-initialized when the next video is found
    if(! ths.video){
      ths.conf.destroy();
      return;
    }
    console.log("css watcher running. video?", ths.video)
    
    // // our current css is fucky? Null, undefined and 0 are invalid values.
    // if(! GlobalVars.currentCss.width || ! GlobalVars.currentCss.height )
    //   return;

    // first, a quick test:
    if (ths.currentVideoSettings.validFor == ths.conf.player.dimensions ){
      if (ths.currentVideoSettings.videoWidth != ths.video.offsetWidth  ||
          ths.currentVideoSettings.videoHeight != ths.video.offsetHeight){
        ths.restore();
        return;
      }
    }
  
    var styleArrayStr = ths.video.getAttribute('style');
    
    if (styleArrayStr){
      var styleArray = styleArrayStr.split(";");
  
      var stuffChecked = 0;
      var stuffToCheck = 2;
      
      for(var i in styleArray){
        styleArray[i] = styleArray[i].trim();
        
        if (styleArray[i].startsWith("top:")){
          // don't force css restore if currentCss.top is not defined
          if(ths.currentCss.top && styleArray[i] != ths.currentCss.top){
            if(Debug.debug){
              console.log("[Resizer::_res_antiCssOverride] SOMEBODY TOUCHED MA SPAGHETT (our CSS got overriden, restoring our css)");
              console.log("[Resizer::_res_antiCssOverride] MA SPAGHETT: top:", ths.currentCss.top, "left:", ths.currentCss.left, "thing that touched ma spaghett", styleArrayStr);
            }
            ths.restore();
            return;
          }
          stuffChecked++;
        }
        else if(styleArray[i].startsWith("left:")){
          // don't force css restore if currentCss.left is not defined        
          if(ths.currentCss.left && styleArray[i] != ths.currentCss.left){
            if(Debug.debug){
              console.log("[Resizer::_res_antiCssOverride] SOMEBODY TOUCHED MA SPAGHETT (our CSS got overriden, restoring our css)");
              console.log("[Resizer::_res_antiCssOverride] MA SPAGHETT: width:", ths.currentCss.width, "height:", ths.currentCss.height, "thing that touched ma spaghett", styleArrayStr);            
            }
            ths.restore();
            return;
          }
          stuffChecked++;
        }
        
        if(stuffChecked == stuffToCheck){
    //         if(Debug.debug){
    //           console.log("[Resizer::_res_antiCssOverride] My spaghett rests untouched. (nobody overrode our CSS, doing nothing)");
    //         }
          return;
        }
      }
    }
  }
}
