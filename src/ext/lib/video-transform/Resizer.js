import Debug from '../../conf/Debug';
import Scaler from './Scaler';
import Stretcher from './Stretcher';
import Zoom from './Zoom';
import PlayerData from '../video-data/PlayerData';
import ExtensionMode from '../../../common/enums/extension-mode.enum';
import Stretch from '../../../common/enums/stretch.enum';
import VideoAlignment from '../../../common/enums/video-alignment.enum';
import AspectRatio from '../../../common/enums/aspect-ratio.enum';

if(Debug.debug) {
  console.log("Loading: Resizer.js");
}

class Resizer {
  
  constructor(videoData) {
    this.conf = videoData;
    this.video = videoData.video;
    this.settings = videoData.settings;
    this.extensionMode = videoData.extensionMode;

    this.scaler = new Scaler(this.conf);
    this.stretcher = new Stretcher(this.conf); 
    this.zoom = new Zoom(this.conf);

    this.cssCheckDisabled = false;

    // load up default values
    this.correctedVideoDimensions = {};
    this.currentCss = {};
    this.currentStyleString = "";
    this.currentPlayerStyleString = "";
    this.currentCssValidFor = {};

    // restore watchdog. While true, applyCss() tries to re-apply new css until this value becomes false again
    // value becomes false when width and height of <video> tag match with what we want to set. Only necessary when
    // calling _res_restore() for some weird reason.
    this.restore_wd = false;

    // CSS watcher will trigger _very_ often for this many iterations
    this.cssWatcherIncreasedFrequencyCounter = 0;

    
    // this.lastAr = this.settings.getDefaultAr();                 // this is the aspect ratio we start with
    this.lastAr = {type: AspectRatio.Initial};
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

  calculateRatioForLegacyOptions(ar){
    // also present as modeToAr in Scaler.js
    if (ar.type !== AspectRatio.FitWidth && ar.type !== AspectRatio.FitHeight && ar.ratio) {
      return ar;
    }
    // Skrbi za "stare" možnosti, kot na primer "na širino zaslona", "na višino zaslona" in "ponastavi". 
    // Približevanje opuščeno.
    // handles "legacy" options, such as 'fit to widht', 'fit to height' and AspectRatio.Reset. No zoom tho
    var ratioOut;

    if (!this.conf.video) {
      if (Debug.debug) {
        console.log("[Scaler.js::modeToAr] No video??",this.conf.video, "killing videoData");
      }
      this.conf.destroy();
      return null;
    }

    
    if (! this.conf.player.dimensions) {
      ratioOut = screen.width / screen.height;
    } else {
      if (Debug.debug && Debug.resizer) {
        console.log(`[Resizer::calculateRatioForLegacyOptions] <rid:${this.resizerId}> Player dimensions:`, this.conf.player.dimensions.width ,'x', this.conf.player.dimensions.height,'aspect ratio:', this.conf.player.dimensions.width / this.conf.player.dimensions.height)
      }
      ratioOut = this.conf.player.dimensions.width / this.conf.player.dimensions.height;
    }
    
    // POMEMBNO: lastAr je potrebno nastaviti šele po tem, ko kličemo _res_setAr(). _res_setAr() predvideva,
    // da želimo nastaviti statično (type: 'static') razmerje stranic — tudi, če funkcijo kličemo tu oz. v ArDetect.
    //
    // IMPORTANT NOTE: lastAr needs to be set after _res_setAr() is called, as _res_setAr() assumes we're
    // setting a static aspect ratio (even if the function is called from here or ArDetect). 
    
    var fileAr = this.conf.video.videoWidth / this.conf.video.videoHeight;
      
    if (ar.type === AspectRatio.FitWidth){
      ar.ratio = ratioOut > fileAr ? ratioOut : fileAr;
    }
    else if(ar.type === AspectRatio.FitHeight){
      ar.ratio = ratioOut < fileAr ? ratioOut : fileAr;
    }
    else if(ar.type === AspectRatio.Reset){
      if(Debug.debug){
        console.log("[Scaler.js::modeToAr] Using original aspect ratio -", fileAr);
      }
      ar.ratio = fileAr;
    } else {
      return null;
    }

    return ar;
  }


  setAr(ar, lastAr){
    if (this.destroyed) {
      return;
    }
  
    if(Debug.debug){
      console.log('[Resizer::setAr] <rid:'+this.resizerId+'> trying to set ar. New ar:', ar)
    }

    if (ar == null) {
      return;
    }

    if (ar.type === AspectRatio.Automatic || 
        ar.type === AspectRatio.Reset && this.lastAr.type === AspectRatio.Initial) {
      // some sites do things that interfere with our site (and aspect ratio setting in general)
      // first, we check whether video contains anything we don't like

      const siteSettings = this.settings.active.sites[window.location.host];
      if (siteSettings && siteSettings.autoarPreventConditions) {
        if (siteSettings.autoarPreventConditions.videoStyleString) {
          const styleString = (this.video.getAttribute('style') || '').split(';');

          if (siteSettings.autoarPreventConditions.videoStyleString.containsProperty) {
            const bannedProperties = siteSettings.autoarPreventConditions.videoStyleString.containsProperty;
            for (const prop in bannedProperties) {
              for (const s of styleString) {
                if (s.trim().startsWith(prop)) {

                  // check if css property has a list of allowed values:
                  if (bannedProperties[prop].allowedValues) {
                    const styleValue = s.split(':')[1].trim();

                    // check if property value is on the list of allowed values
                    // if it's not, we aren't allowed to start aard
                    if (bannedProperties[prop].allowedValues.indexOf(styleValue) === -1) {
                      if (Debug.debug) {
                        console.log("%c[Resizer::setAr] video style contains forbidden css property/value combo: ", "color: #900, background: #100", prop, " — we aren't allowed to start autoar.")
                      }
                      return;
                    }
                  } else {
                    // no allowed values, no problem. We have forbidden property
                    // and this means aard can't start.
                    if (Debug.debug) {
                      console.log("%c[Resizer::setAr] video style contains forbidden css property: ", "color: #900, background: #100", prop, " — we aren't allowed to start autoar.")
                    }
                    return;
                  }
                }
              }
            }
          }
        }
      }
    }

    if (lastAr) {
      this.lastAr = this.calculateRatioForLegacyOptions(lastAr);
      ar = this.calculateRatioForLegacyOptions(ar);
    } else {
      // NOTE: "fitw" "fith" and "reset" should ignore ar.ratio bit, but
      // I'm not sure whether they do. Check that.
      ar = this.calculateRatioForLegacyOptions(ar);
      if (! ar) {
        if (Debug.debug && Debug.resizer) {
          console.log(`[Resizer::setAr] <${this.resizerId}> Something wrong with ar or the player. Doing nothing.`);
        }
        return;
      }
      this.lastAr = {type: ar.type, ratio: ar.ratio}
    }

    if (this.extensionMode === ExtensionMode.Basic && !PlayerData.isFullScreen() && ar.type !== AspectRatio.Reset) {
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
        if (this.lastAr.type === AspectRatio.Automatic) {
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
        if (stretchFactors.error === 'no_video'){
          this.conf.destroy();
        }
        if (stretchFactors.error === 'illegal_video_dimensions') {
          if(Debug.debug){
            console.log("[Resizer::setAr] <rid:"+this.resizerId+"> Illegal video dimensions found. We will pause everything.");
          }
          // if we get illegal video dimensions, cssWatcher goes nuts. This is harmful,
          // so we stop it until that sorts itself out
          this.stopCssWatcher();
        }
        return;
      } else {
        this.startCssWatcher();
      }
      if(this.stretcher.mode === Stretch.Conditional){
         this.stretcher.applyConditionalStretch(stretchFactors, ar.ratio);
      }

      if (Debug.debug) {
        console.log("[Resizer::setAr] Processed stretch factors for ", this.stretcher.mode === Stretch.NoStretch ? 'stretch-free crop.' : 'crop with conditional stretch.', 'Stretch factors are:', stretchFactors);
      }

    } else if (this.stretcher.mode === Stretch.Hybrid) {
      var stretchFactors = this.stretcher.calculateStretch(ar.ratio);
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
    this.lastAr = {type: AspectRatio.Initial};
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

    this.cssCheckDisabled = false;

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
      this.cssCheck(); // no timeout = one-off
      return;
    }

    // one extra check to ensure we don't run css checks when we aren't supposed to
    if (this.cssCheckDisabled) {
      return;
    }

    if(this.cssWatcherTimeout) {
      clearTimeout(this.cssWatcherTimer);
    }

    var ths = this;
    this.cssWatcherTimer = setTimeout(function () {
        ths.cssWatcherTimer = null;
        try {
          if (! ths.cssCheckDisabled) {
            ths.cssCheck();
          }
        } catch (e) {
          if(Debug.debug) {
            console.log("[Resizer.js::scheduleCssWatcher] Css check failed. Error:", e);
          }
        }
      }, timeout);
  }

  stopCssWatcher() {
    if (Debug.debug) {
      console.log(`[Resizer.js] <${this.resizerId}> STOPPING CSS WATCHER!`)
    }
    this.cssCheckDisabled = true;
    clearInterval(this.cssWatcherTimeout);
  }

  restore() {
    if(Debug.debug){
      console.log("[Resizer::restore] <rid:"+this.resizerId+"> attempting to restore aspect ratio. this & settings:", {'a_lastAr': this.lastAr, 'this': this, "settings": this.settings} );
    }
    
    // this is true until we verify that css has actually been applied
    this.restore_wd = true;
    
    if(this.lastAr.type === AspectRatio.Initial){
      this.setAr({type: AspectRatio.Reset});
    }
    else {
      if (this.lastAr && this.lastAr.ratio === null) {
        throw "Last ar is null!"
      }
      this.setAr(this.lastAr, this.lastAr)
    }
  }

  reset(){
    this.setStretchMode(this.settings.active.sites[window.location.hostname] ? this.settings.active.sites[window.location.hostname].stretch : this.settings.active.sites['@global'].stretch);
    this.zoom.setZoom(1);
    this.resetPan();
    this.setAr({type: AspectRatio.Reset});
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
    this.setAr({type: AspectRatio.Reset});
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
      console.log("[Resizer::_res_computeOffsets] <rid:"+this.resizerId+"> calculated offsets:\n\n",
      '---- data in ----\n',
      'player dimensions:', {w: this.conf.player.dimensions.width, h: this.conf.player.dimensions.height},
      'video dimensions: ', {w: this.conf.video.offsetWidth, h: this.conf.video.offsetHeight},
      'stretch factors:  ', stretchFactors,
      'pan & zoom:       ', this.pan, this.zoom,
      '\n\n---- data out ----\n',
      'translate:', translate);
    }

    return translate; 
  }
  
  buildStyleArray(existingStyleString, extraStyleString) {
    if (existingStyleString) {
      const styleArray = existingStyleString.split(";");

      if (extraStyleString) {
        const extraCss = extraStyleString.split(';');
        let dup = false;

        for (const ecss of extraCss) {
          for (let i in styleArray) {
            if (ecss.split(':')[0].trim() === styleArray[i].split(':')[0].trim()) {
              dup = true;
              styleArray[i] = ecss;
            }
            if (dup) {
              dup = false;
              continue;
            }
            styleArray.push(ecss);
          }
        }
      }
  
      for (var i in styleArray) {
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
      return styleArray;
    }

    return [];
  }

  buildStyleString(styleArray) {
    let styleString = '';

    for(var i in styleArray) {
      if(styleArray[i]) {
        styleString += styleArray[i] + "; ";
      }
    }

    return styleString;
  }

  applyCss(stretchFactors, translate){
    // apply extra CSS here. In case of duplicated properties, extraCss overrides 
    // default styleString
    if (! this.video) {
      if(Debug.debug) {
        console.log("[Resizer::applyCss] <rid:"+this.resizerId+"> Video went missing, doing nothing.");

      }

      this.conf.destroy();
      return;
    }

    if (Debug.debug && Debug.resizer) {
      console.log("[Resizer::applyCss] <rid:"+this.resizerId+"> will apply css.", {stretchFactors, translate});
    }
    
    // save stuff for quick tests (before we turn numbers into css values):
    this.currentVideoSettings = {
      validFor:  this.conf.player.dimensions,
      // videoWidth: dimensions.width,
      // videoHeight: dimensions.height
    }

    const styleArrayString = this.video.getAttribute('style');
    let extraStyleString;
    try {
      extraStyleString = this.settings.active.sites[window.location.host].DOM.video.additionalCss;
    } catch (e) {
      // do nothing. It's ok if no special settings are defined for this site, we'll just do defaults
    }

    const styleArray = this.buildStyleArray(styleArrayString, extraStyleString)

    // add remaining elements
    
    if (stretchFactors) {
      styleArray.push(`transform: translate(${translate.x}px, ${translate.y}px) scale(${stretchFactors.xFactor}, ${stretchFactors.yFactor})`);
      styleArray.push("top: 0px; left: 0px; bottom: 0px; right: 0px");
    }
    const styleString = this.buildStyleString(styleArray);

    // see if we have any extra css for the player element:
    let playerStyleString;
    try {
      playerStyleString = this.settings.active.sites[window.location.host].DOM.player.additionalCss;
      if (playerStyleString) {
        const playerStyleArrayString = this.player.eleemnt.getAttribute('style');
        const playerStyleArray = this.buildStyleArray(playerStyleString, playerStyleString);
        playerStyleString = this.buildStyleString(playerStyleArray);
      }
    } catch (e) {
      // do nothing. It's ok if there's no special settings for the player element
    }

    // build style string back
    this.setStyleString(styleString, playerStyleString);
  }

  setStyleString (styleString, playerStyleString) {
    this.video.setAttribute("style", styleString);
    this.currentStyleString = styleString;

    if (playerStyleString) {
      this.player.element.setAttribute('style', styleString);
      this.currentPlayerStyleString = playerStyleString;
    }

    this.currentCssValidFor = this.conf.player.dimensions;
    
    if (this.restore_wd) {
      if (!this.video){
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
    if (this.cssCheckDisabled) {
      throw "fucking dont"
      return;
    }
    // this means we haven't set our CSS yet, or that we changed video.
    // if(! this.currentCss.tranform) {
    //   this.scheduleCssWatcher(200);      
    //   return;
    // }
    
    // this means video went missing. videoData will be re-initialized when the next video is found
    if (!this.video){
      if(Debug.debug && Debug.resizer) {
        console.log("[Resizer::cssCheck] <rid:"+this.resizerId+"> no video detecting, issuing destroy command");
      }
      this.conf.destroy();
      return;
    }
    
    if(this.destroyed) {
      if(Debug.debug && Debug.resizer) {
        console.log("[Resizer::cssCheck] <rid:"+this.resizerId+"> destroyed flag is set, we shouldnt be running");
      }
      this.stopCssWatcher();
      return;
    }

    let cssValid = true;

    // first, a quick test:
    cssValid &= this.currentVideoSettings.validFor.width === this.conf.player.dimensions.width;
    cssValid &= this.currentVideoSettings.validFor.height === this.conf.player.dimensions.height;

    if (cssValid) {
      const styleString = this.video.getAttribute('style');
      cssValid &= this.currentStyleString === styleString;
    }
    if (cssValid && this.currentPlayerStyleString) {  // only check for changes to player element if we applied them before
      const playerStyleString = this.player.element.getAttribute('style'); 
      cssValid &= this.currentPlayerStyleString === playerStyleString;
    }
    if (!cssValid){
      if(Debug.debug && Debug.resizer) {
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
