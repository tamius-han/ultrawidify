import Debug from '../../conf/Debug';
import Scaler from './Scaler';
import Stretcher from './Stretcher';
import Zoom from './Zoom';
import PlayerData from '../video-data/PlayerData';
import ExtensionMode from '../../../common/enums/extension-mode.enum';
import Stretch from '../../../common/enums/stretch.enum';
import VideoAlignment from '../../../common/enums/video-alignment.enum';
import AspectRatio from '../../../common/enums/aspect-ratio.enum';
import CropModePersistance from '../../../common/enums/crop-mode-persistence.enum';
import { sleep } from '../Util';

if(Debug.debug) {
  console.log("Loading: Resizer.js");
}

class Resizer {
  
  constructor(videoData) {
    this.resizerId = (Math.random(99)*100).toFixed(0);
    this.conf = videoData;
    this.logger = videoData.logger;
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
    this.currentPlayerStyleString = "";
    this.currentCssValidFor = {};

    this.lastAr = {type: AspectRatio.Initial};
    this.videoAlignment = this.settings.getDefaultVideoAlignment(window.location.hostname); // this is initial video alignment
    this.destroyed = false;


    if (this.settings.active.pan) {
      this.canPan = this.settings.active.miscSettings.mousePan.enabled;
    } else {
      this.canPan = false;
    }

    this.userCss = '';
    this.userCssClassName = videoData.userCssClassName; 
  }
  
  injectCss(css) {
    this.conf.pageInfo.injectCss(css);
  }
  
  ejectCss(css) {
    this.conf.pageInfo.ejectCss(css);
  }
  
  replaceCss(oldCss, newCss) {
    this.conf.pageInfo.replaceCss(oldCss, newCss);
  }

  prepareCss(css) {
    return `.${this.userCssClassName} {${css}}`;
  }

  destroy(){
    this.logger.log('info', ['debug', 'init'], `[Resizer::destroy] <rid:${this.resizerId}> received destroy command.`);
    this.destroyed = true;
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
      this.logger.log('info', 'debug', "[Scaler.js::modeToAr] No video??",this.conf.video, "killing videoData");
      this.conf.destroy();
      return null;
    }

    
    if (! this.conf.player.dimensions) {
      ratioOut = screen.width / screen.height;
    } else {
      this.logger.log('info', 'debug', `[Resizer::calculateRatioForLegacyOptions] <rid:${this.resizerId}> Player dimensions:`, this.conf.player.dimensions.width ,'x', this.conf.player.dimensions.height,'aspect ratio:', this.conf.player.dimensions.width / this.conf.player.dimensions.height)
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
      this.logger.log('info', 'debug', "[Scaler.js::modeToAr] Using original aspect ratio -", fileAr);
      ar.ratio = fileAr;
    } else {
      return null;
    }

    return ar;
  }


  updateAr(ar) {
    if (!ar) {
      return;
    }

    // Some options require a bit more testing re: whether they make sense
    // if they don't, we refuse to update aspect ratio until they do
    if (ar.type === AspectRatio.Automatic || ar.type === AspectRatio.Fixed) {
      if (!ar.ratio || isNaN(ar.ratio)) {
        return;
      }
    }

    // Only update aspect ratio if there's a difference between the old and the new state
    if (!this.lastAr || ar.type !== this.lastAr.type || ar.ratio !== this.lastAr.ratio) {
      this.setAr(ar);
    }
  }

  async setAr(ar, lastAr) {
    if (this.destroyed) {
      return;
    }
  
    this.logger.log('info', 'debug', '[Resizer::setAr] <rid:'+this.resizerId+'> trying to set ar. New ar:', ar)

    if (ar == null) {
      return;
    }

    const siteSettings = this.settings.active.sites[window.location.host];

    // reset zoom, but only on aspect ratio switch. We also know that aspect ratio gets converted to
    // AspectRatio.Fixed when zooming, so let's keep that in mind
    if (ar.type !== AspectRatio.Fixed) {
      this.zoom.reset();
      this.resetPan();
    } else if (ar.ratio !== this.lastAr.ratio) {
      // we must check against this.lastAR.ratio because some calls provide same value for ar and lastAr
      this.zoom.reset();
      this.resetPan();
    }

    // most everything that could go wrong went wrong by this stage, and returns can happen afterwards
    // this means here's the optimal place to set or forget aspect ratio. Saving of current crop ratio
    // is handled in pageInfo.updateCurrentCrop(), which also makes sure to persist aspect ratio if ar
    // is set to persist between videos / through current session / until manual reset.
    if (ar.type === AspectRatio.Automatic || 
        ar.type === AspectRatio.Reset ||
        ar.type === AspectRatio.Initial ) {
      // reset/undo default 
      this.conf.pageInfo.updateCurrentCrop(undefined);
    } else {
      this.conf.pageInfo.updateCurrentCrop(ar);
    }

    if (ar.type === AspectRatio.Automatic || 
        ar.type === AspectRatio.Reset && this.lastAr.type === AspectRatio.Initial) {
      // some sites do things that interfere with our site (and aspect ratio setting in general)
      // first, we check whether video contains anything we don't like
      if (siteSettings?.autoarPreventConditions?.videoStyleString) {
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
                    this.logger.log('error', 'debug', "%c[Resizer::setAr] video style contains forbidden css property/value combo: ", "color: #900, background: #100", prop, " — we aren't allowed to start autoar.")
                    return;
                  }
                } else {
                  // no allowed values, no problem. We have forbidden property
                  // and this means aard can't start.
                  this.logger.log('info', 'debug', "%c[Resizer::setAr] video style contains forbidden css property: ", "color: #900, background: #100", prop, " — we aren't allowed to start autoar.")
                  return;
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
        this.logger.log('info', 'resizer', `[Resizer::setAr] <${this.resizerId}> Something wrong with ar or the player. Doing nothing.`);
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
      this.conf.destroy();
    }

    // pause AR on basic stretch, unpause when using other modes
    // for sine reason unpause doesn't unpause. investigate that later
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
    if (this.stretcher.mode === Stretch.NoStretch 
        || this.stretcher.mode === Stretch.Conditional 
        || this.stretcher.mode === Stretch.FixedSource){
      var stretchFactors = this.scaler.calculateCrop(ar);

      this.logger.log('error', 'debug', `[Resizer::setAr] <rid:${this.resizerId}> failed to set AR due to problem with calculating crop. Error:`, stretchFactors && stretchFactors.error);

      if(! stretchFactors || stretchFactors.error){
        if (stretchFactors?.error === 'no_video'){
          this.conf.destroy();
          return;
        }

        // we could have issued calculate crop too early. Instead of spending 30 minutes trying to fix this the proper way by
        // reading documentation, let's fix it in 30 seconds with some brute force code
        if (stretchFactors?.error === 'illegal_video_dimensions') {
          let timeout = 10; // ms
          let iteration = 0;
          let maxIterations = 15;
          do {
            if (iteration > maxIterations) {
              this.logger.log('error', 'debug', `[Resizer::setAr] <rid:${this.resizerId}> Video dimensions remain illegal after ${maxIterations} retries`);
              return;
            }
            // fire first few rechecks in quick succession, but start increasing timeout 
            // later down the line.
            if (iteration > 0 && iteration % 0 == 0) {
              timeout = Math.min(2 * timeout, 1000);
            }
            this.logger.log('info', 'debug', `[Resizer::setAr] <rid:${this.resizerId}> Sleeping for ${timeout} ms`);
            await sleep(timeout);
            stretchFactors = this.scaler.calculateCrop(ar);
            iteration++;
          } while (stretchFactors.error === 'illegal_video_dimensions');
          this.logger.log('info', 'debug', `[Resizer::setAr] <rid:${this.resizerId}> Video dimensions have corrected themselves after retrying.`);
        }
      }

      if (this.stretcher.mode === Stretch.Conditional){
        this.stretcher.applyConditionalStretch(stretchFactors, ar.ratio);
      } else if (this.stretcher.mode === Stretch.FixedSource) {
        this.stretcher.applyStretchFixedSource(stretchFactors);
      }
      this.logger.log('info', 'debug', "[Resizer::setAr] Processed stretch factors for ",
                      this.stretcher.mode === Stretch.NoStretch ? 'stretch-free crop.' : 
                        this.stretcher.mode === Stretch.Conditional ? 'crop with conditional stretch.' : 'crop with fixed stretch',
                      'Stretch factors are:', stretchFactors
      );

    } else if (this.stretcher.mode === Stretch.Hybrid) {
      var stretchFactors = this.stretcher.calculateStretch(ar.ratio);
      this.logger.log('info', 'debug', '[Resizer::setAr] Processed stretch factors for hybrid stretch/crop. Stretch factors are:', stretchFactors);
    } else if (this.stretcher.mode === Stretch.Fixed) {
      var stretchFactors = this.stretchFactors.calculateStretchFixed(ar.ratio)
    } else if (this.stretcher.mode === Stretch.Basic) {
      var stretchFactors = this.stretcher.calculateBasicStretch();
      this.logger.log('info', 'debug', '[Resizer::setAr] Processed stretch factors for basic stretch. Stretch factors are:', stretchFactors);
    } else {
      var stretchFactors = {xFactor: 1, yFactor: 1}
      this.logger.log('error', 'debug', '[Resizer::setAr] Okay wtf happened? If you see this, something has gone wrong', stretchFactors,"\n------[ i n f o   d u m p ]------\nstretcher:", this.stretcher);
    }

    this.zoom.applyZoom(stretchFactors);

    //TODO: correct these two
    var translate = this.computeOffsets(stretchFactors);
    this.applyCss(stretchFactors, translate);

  }

  toFixedAr() {
    this.lastAr.type = AspectRatio.Fixed;
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

  setStretchMode(stretchMode, fixedStretchRatio){
    this.stretcher.setStretchMode(stretchMode, fixedStretchRatio);
    this.restore();
  }

  panHandler(event, forcePan) {
    if (this.canPan || forcePan) {
      if(!this.conf.player || !this.conf.player.element) {
        return;
      }
      // dont allow weird floats
      this.videoAlignment = VideoAlignment.Center;

      // because non-fixed aspect ratios reset panning:
      this.toFixedAr();

      const player = this.conf.player.element;

      const relativeX = (event.pageX - player.offsetLeft) / player.offsetWidth;
      const relativeY = (event.pageY - player.offsetTop) / player.offsetHeight;
      
      this.logger.log('info', 'mousemove', "[Resizer::panHandler] mousemove.pageX, pageY:", event.pageX, event.pageY, "\nrelativeX/Y:", relativeX, relativeY)

      this.setPan(relativeX, relativeY);
    }
  }

  resetPan() {
    this.pan = {};
    this.videoAlignment = this.settings.getDefaultVideoAlignment(window.location.host);
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
    this.restore();
  }

  setVideoAlignment(videoAlignment) {
    this.videoAlignment = videoAlignment;
    this.restore();
  }

  restore() {
    this.logger.log('info', 'debug', "[Resizer::restore] <rid:"+this.resizerId+"> attempting to restore aspect ratio", {'a_lastAr': this.lastAr} );
    
    // this is true until we verify that css has actually been applied
    if(this.lastAr.type === AspectRatio.Initial){
      this.setAr({type: AspectRatio.Reset});
    }
    else {
      if (this.lastAr?.ratio === null) {
        // if this is the case, we do nothing as we have the correct aspect ratio
        // throw "Last ar is null!"
        return;
      }
      this.setAr(this.lastAr, this.lastAr)
    }
  }

  reset(){
    this.setStretchMode(this.settings.active.sites[window.location.hostname]?.stretch ?? this.settings.active.sites['@global'].stretch);
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
    this.logger.log('info', 'debug', "[Resizer::computeOffsets] <rid:"+this.resizerId+"> video will be aligned to ", this.settings.active.sites['@global'].videoAlignment);

    const wdiff = this.conf.player.dimensions.width - this.conf.video.offsetWidth;
    const hdiff = this.conf.player.dimensions.height - this.conf.video.offsetHeight;

    if (wdiff < 0 && hdiff < 0 && this.zoom.scale > 1) {
      this.conf.player.re
    }

    const wdiffAfterZoom = this.conf.video.offsetWidth * stretchFactors.xFactor - this.conf.player.dimensions.width;
    const hdiffAfterZoom = this.conf.video.offsetHeight * stretchFactors.yFactor - this.conf.player.dimensions.height;
    
    const translate = {
      x: wdiff * 0.5,
      y: hdiff * 0.5,
    };

    
    

    if (this.pan) {
      // don't offset when video is smaller than player
      if(wdiffAfterZoom >= 0 || hdiffAfterZoom >= 0) {
        translate.x += wdiffAfterZoom * this.pan.relativeOffsetX * this.zoom.scale;
        translate.y += hdiffAfterZoom * this.pan.relativeOffsetY * this.zoom.scale;
      }
    } else {
      if (this.videoAlignment == VideoAlignment.Left) {
        translate.x += wdiffAfterZoom * 0.5;
      }
      else if (this.videoAlignment == VideoAlignment.Right) {
        translate.x -= wdiffAfterZoom * 0.5;
      }
    }
  
    this.logger.log('info', ['debug', 'resizer'], "[Resizer::_res_computeOffsets] <rid:"+this.resizerId+"> calculated offsets:\n\n",
                    '---- data in ----',
                    '\nplayer dimensions:    ', {w: this.conf.player.dimensions.width, h: this.conf.player.dimensions.height},
                    '\nvideo dimensions:     ', {w: this.conf.video.offsetWidth, h: this.conf.video.offsetHeight},
                    '\nstretch factors:      ', stretchFactors,
                    '\npan & zoom:           ', this.pan, this.zoom.scale,
                    '\nwdiff, hdiff:         ', wdiff, 'x', hdiff,
                    '\nwdiff, hdiffAfterZoom:', wdiffAfterZoom, 'x', hdiffAfterZoom, 
                    '\n\n---- data out ----\n',
                    'translate:', translate);
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
        styleString += styleArray[i] + " !important; ";
      }
    }

    return styleString;
  }

  applyCss(stretchFactors, translate){
    // apply extra CSS here. In case of duplicated properties, extraCss overrides 
    // default styleString
    if (! this.video) {
      this.logger.log('warn', 'debug', "[Resizer::applyCss] <rid:"+this.resizerId+"> Video went missing, doing nothing.");

      this.conf.destroy();
      return;
    }

    this.logger.log('info', ['debug', 'resizer'], "[Resizer::applyCss] <rid:"+this.resizerId+"> will apply css.", {stretchFactors, translate});
    
    // save stuff for quick tests (before we turn numbers into css values):
    this.currentVideoSettings = {
      validFor:  this.conf.player.dimensions,
      // videoWidth: dimensions.width,
      // videoHeight: dimensions.height
    }

    let extraStyleString;
    try {
      extraStyleString = this.settings.active.sites[window.location.host].DOM.video.additionalCss;
    } catch (e) {
      // do nothing. It's ok if no special settings are defined for this site, we'll just do defaults
    }

    const styleArray = this.buildStyleArray('', extraStyleString)

    // add remaining elements
    if (stretchFactors) {
      styleArray.push(`transform: translate(${translate.x}px, ${translate.y}px) scale(${stretchFactors.xFactor}, ${stretchFactors.yFactor})`);

      // important — guarantees video will be properly aligned
      styleArray.push("top: 0px !important; left: 0px !important; bottom: 0px !important; right: 0px;"); 

      // important — some websites (cough reddit redesign cough) may impose some dumb max-width and max-height
      // restrictions. If site has dumb shit like 'max-width: 100%' and 'max-height: 100vh' in their CSS, that
      // shit will prevent us from applying desired crop. This means we need to tell websites to fuck off with
      // that crap. We know better.
      styleArray.push("max-width: none !important; max-height: none !important;");
    }
    const styleString = `${this.buildStyleString(styleArray)}${extraStyleString || ''}`; // string returned by buildStyleString() should end with ; anyway

    // build style string back
    this.setStyleString(styleString);
  }

  setStyleString (styleString) {
    this.currentCssValidFor = this.conf.player.dimensions;
    const newCssString = this.prepareCss(styleString);

    // inject new CSS or replace existing one
    if (!this.userCss) {
      this.logger.log('info', ['debug', 'resizer'], "[Resizer::setStyleString] <rid:"+this.resizerId+"> Setting new css: ", newCssString);

      this.injectCss(newCssString);
      this.userCss = newCssString;
    } else if (newCssString !== this.userCss) {
      this.logger.log('info', ['debug', 'resizer'], "[Resizer::setStyleString] <rid:"+this.resizerId+"> Replacing css.\nOld string:", this.userCss, "\nNew string:", newCssString);
      // we only replace css if it
      this.replaceCss(this.userCss, newCssString);
      this.userCss = newCssString;
    } else {
      this.logger.log('info', ['debug', 'resizer'], "[Resizer::setStyleString] <rid:"+this.resizerId+"> Existing css is still valid, doing nothing.");
    }
  }
}

export default Resizer;
