import Debug from '../../conf/Debug';
import Scaler from './Scaler';
import Stretcher from './Stretcher';
import Zoom from './Zoom';
import PlayerData from '../video-data/PlayerData';
import ExtensionMode from '../../../common/enums/extension-mode.enum';
import Stretch from '../../../common/enums/stretch.enum';
import VideoAlignment from '../../../common/enums/video-alignment.enum';

if(Debug.debug)
  console.log("Loading: Resizer.js");

class Resizer {
  
  constructor(videoData) {
    this.conf = videoData;
    this.video = videoData.video;
    this.settings = videoData.settings;
    this.extensionMode = videoData.extensionMode;

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

    
    // this.lastAr = this.settings.getDefaultAr();                 // this is the aspect ratio we start with
    this.lastAr = {type: 'original'};
    this.videoAlignment = this.settings.getDefaultVideoAlignment(window.location.hostname); // this is initial video alignment
    this.destroyed = false;

    this.resizerId = (Math.random(99)*100).toFixed(0);

    if (this.settings.active.pan) {
      console.log("can pan:", this.settings.active.miscSettings.mousePan.enabled, "(default:", this.settings.active.miscSettings.mousePan.enabled, ")")
      this.canPan = this.settings.active.miscSettings.mousePan.enabled;
    } else {
      this.canPan = false;
    }
  }
  
  start(){
    if(!this.destroyed) {
      this.startCssWatcher();
    }
  }

  stop(){
    this.stopCssWatcher();
  }

  destroy(){
    if(Debug.debug || Debug.init){
      console.log(`[Resizer::destroy] <rid:${this.resizerId}> received destroy command.`);
    }
    this.destroyed = true;
    this.stopCssWatcher();
  }


  setAr(ar, lastAr){
    if (this.destroyed) {
      return;
    }
  
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

    if (this.extensionMode === ExtensionMode.Basic && !PlayerData.isFullScreen() && ar !== 'reset') {
      // don't actually apply or calculate css when using basic mode if not in fullscreen
      //  ... unless we're resetting the aspect ratio to original
      return; 
    }

    if (! this.video) {
      // console.log("No video detected.")
      this.videoData.destroy();
    }

    if (this.extensionMode === ExtensionMode.Enabled || PlayerData.isFullScreen()) {
      this.startCssWatcher();
    }
    this.cssWatcherIncreasedFrequencyCounter = 20;

    // // pause AR on basic stretch, unpause when using other mdoes
    // fir sine reason unpause doesn't unpause. investigate that later
    try {
      if (this.stretcher.mode === Stretch.Basic) {
        this.conf.arDetector.pause();
      } else {
        if (this.lastAr.type === 'auto') {
          this.conf.arDetector.unpause();
        }
      }
    } catch (e) {   // resizer starts before arDetector. this will do nothing but fail if arDetector isn't setup

    }

    // do stretch thingy
    if (this.stretcher.mode === Stretch.NoStretch || this.stretcher.mode === Stretch.Conditional){
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
      if(this.stretcher.mode === Stretch.Conditional){
         this.stretcher.applyConditionalStretch(stretchFactors, ar);
      }

      if (Debug.debug) {
        console.log("[Resizer::setAr] Processed stretch factors for ", this.stretcher.mode === Stretch.NoStretch ? 'stretch-free crop.' : 'crop with conditional stretch.', 'Stretch factors are:', stretchFactors);
      }

    } else if (this.stretcher.mode === Stretch.Hybrid) {
      var stretchFactors = this.stretcher.calculateStretch(ar);
      if (Debug.debug) {
        console.log('[Resizer::setAr] Processed stretch factors for hybrid stretch/crop. Stretch factors are:', stretchFactors);
      }
    } else if (this.stretcher.mode === Stretch.Basic) {
      var stretchFactors = this.stretcher.calculateBasicStretch();
      if (Debug.debug) {
        console.log('[Resizer::setAr] Processed stretch factors for basic stretch. Stretch factors are:', stretchFactors);
      }
    } else {
      var stretchFactors = {xFactor: 1, yFactor: 1}
      if (Debug.debug) {
        console.log('[Resizer::setAr] Okay wtf happened? If you see this, something has gone wrong', stretchFactors,"\n------[ i n f o   d u m p ]------\nstretcher:", this.stretcher);
      }
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
    this.stretcher.setStretchMode(stretchMode);
    this.restore();
  }

  panHandler(event, forcePan) {
    // console.log("this.conf.canPan:", this.conf.canPan)
    if (this.canPan || forcePan) {
      if(!this.conf.player || !this.conf.player.element) {
        return;
      }
      // dont allow weird floats
      this.videoAlignment = VideoAlignment.Center;

      const player = this.conf.player.element;

      const relativeX = (event.pageX - player.offsetLeft) / player.offsetWidth;
      const relativeY = (event.pageY - player.offsetTop) / player.offsetHeight;
      
      if (Debug.debug && Debug.mousemove) {
        console.log("[Resizer::panHandler] mousemove.pageX, pageY:", event.pageX, event.pageY,
        "\nrelativeX/Y:", relativeX, relativeY)
      }

      this.setPan(relativeX, relativeY);
    }
  }

  setPan(relativeMousePosX, relativeMousePosY){
    // relativeMousePos[X|Y] - on scale from 0 to 1, how close is the mouse to player edges. 
    // use these values: top, left: 0, bottom, right: 1
    if(! this.pan){
      this.pan = {};
    }

    if (this.settings.active.miscSettings.mousePanReverseMouse) {
      this.pan.relativeOffsetX = (relativeMousePosX * 1.1) - 0.55;
      this.pan.relativeOffsetY = (relativeMousePosY * 1.1) - 0.55;
    } else {
      this.pan.relativeOffsetX = -(relativeMousePosX * 1.1) + 0.55;
      this.pan.relativeOffsetY = -(relativeMousePosY * 1.1) + 0.55;
    }
    // if(Debug.debug){
    //   console.log("[Resizer::setPan] relative cursor pos:", relativeMousePosX, ",",relativeMousePosY, " | new pan obj:", this.pan)
    // }
    this.restore();
  }

  setvideoAlignment(videoAlignment) {
    this.videoAlignment = videoAlignment;
    this.restore();
  }

  startCssWatcher(){
    if(Debug.debug) {
      console.log("[Resizer.js::startCssWatcher] starting css watcher. Is resizer destroyed?", this.destroyed);
    }
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
    if (this.destroyed || (this.extensionMode !== ExtensionMode.Enabled && !PlayerData.isFullScreen())) {
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
      console.log("[Resizer::restore] <rid:"+this.resizerId+"> attempting to restore aspect ratio. this & settings:", {'a_lastAr': this.lastAr, 'this': this, "settings": this.settings} );
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
    this.setStretchMode(this.settings.active.sites[window.location.hostname] ? this.settings.active.sites[window.location.hostname].stretch : this.settings.active.sites['@global'].stretch);
    this.zoom.setZoom(1);
    this.resetPan();
    this.setAr('reset');
  }

  setPanMode(mode) {
    if (mode === 'enable') {
      this.canPan = true;
    } else if (mode === 'disable') {
      this.canPan = false;
    } else if (mode === 'toggle') {
      this.canPan = !this.canPan;
    }
  }

  resetPan(){
    this.pan = undefined;
  }

  setZoom(zoomLevel, no_announce) {
    this.zoom.setZoom(zoomLevel, no_announce);
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
    this.stretcher.setStretchMode(Stretch.NoStretch);
    this.restore();
  }


  // mostly internal stuff

  computeOffsets(stretchFactors){

    if (Debug.debug) {
      console.log("[Resizer::computeOffsets] <rid:"+this.resizerId+"> video will be aligned to ", this.settings.active.sites['@global'].videoAlignment);
    }

    const wdiff = this.conf.player.dimensions.width - this.conf.video.offsetWidth;
    const hdiff = this.conf.player.dimensions.height - this.conf.video.offsetHeight;

    const wdiffAfterZoom = this.conf.video.offsetWidth * stretchFactors.xFactor - this.conf.player.dimensions.width;
    const hdiffAfterZoom = this.conf.video.offsetHeight * stretchFactors.yFactor - this.conf.player.dimensions.height;
    
    var translate = {
      x: wdiff * 0.5,
      y: hdiff * 0.5,
    };

    if (this.pan) {
      // don't offset when video is smaller than player
      if(wdiffAfterZoom < 0 && hdiffAfterZoom < 0) {
        return translate;
      }
      translate.x += wdiffAfterZoom * this.pan.relativeOffsetX * this.zoom.scale;
      translate.y += hdiffAfterZoom * this.pan.relativeOffsetY * this.zoom.scale;
    } else {
      if (this.videoAlignment == VideoAlignment.Left) {
        translate.x += wdiffAfterZoom * 0.5;
      }
      else if (this.videoAlignment == VideoAlignment.Right) {
        translate.x -= wdiffAfterZoom * 0.5;
      }
    }

    if(Debug.debug) {
      console.log("[Resizer::_res_computeOffsets] <rid:"+this.resizerId+"> calculated offsets:", translate);
    }

    return translate; 
  }
  
  applyCss(stretchFactors, translate){

    if (! this.video) {
      if(Debug.debug) {
        console.log("[Resizer::applyCss] <rid:"+this.resizerId+"> Video went missing, doing nothing.");

      }

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
    var styleArrayObj = window.getComputedStyle(this.video);


    if (styleArrayStr) {
      var styleArray = styleArrayStr.split(";");
      for(var i in styleArray){
        
        styleArray[i] = styleArray[i].trim();
        
        // some sites do 'top: 50%; left: 50%; transform: <transform>' to center videos. 
        // we dont wanna, because we already center videos on our own
        if (styleArray[i].startsWith("transform:") ||
            styleArray[i].startsWith("top:") ||
            styleArray[i].startsWith("left:") ||
            styleArray[i].startsWith("right:") ||
            styleArray[i].startsWith("bottom:") ){
          delete styleArray[i];
        }
      }
    }else {
      var styleArray = [];
    }
    

    // add remaining elements
    
    if(stretchFactors){
      styleArray.push(`transform: translate(${translate.x}px, ${translate.y}px) scale(${stretchFactors.xFactor}, ${stretchFactors.yFactor})`);
      styleArray.push("top: 0px; left: 0px; bottom: 0px; right: 0px");
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
      if(Debug.debug && Debug.debugResizer) {
        console.log("[Resizer::cssCheck] <rid:"+this.resizerId+"> no video detecting, issuing destroy command");
      }
      this.conf.destroy();
      return;
    }
    
    if(this.destroyed) {
      if(Debug.debug && Debug.debugResizer) {
        console.log("[Resizer::cssCheck] <rid:"+this.resizerId+"> destroyed flag is set, we shouldnt be running");
      }
      this.stopCssWatcher();
      return;
    }

    var styleString = this.video.getAttribute('style');

    // first, a quick test:
    // if (this.currentVideoSettings.validFor == this.conf.player.dimensions ){
    if (this.currentStyleString !== styleString){
      if(Debug.debug && Debug.debugResizer) {
        console.log(`%c[Resizer::cssCheck] <rid:${this.resizerId}> something touched our style string. We need to re-apply the style.`, {background: '#ddf', color: '#007'});
      }
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

export default Resizer;
