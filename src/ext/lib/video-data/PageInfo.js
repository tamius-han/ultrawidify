import Debug from '../../conf/Debug';
import VideoData from './VideoData';
import RescanReason from './enums/RescanReason';
import AspectRatio from '../../../common/enums/aspect-ratio.enum';
import CropModePersistence from '../../../common/enums/crop-mode-persistence.enum';

if (process.env.CHANNEL !== 'stable'){
  console.log("Loading PageInfo");
}

class PageInfo {
  constructor(comms, settings, logger, extensionMode, readOnly = false){
    this.logger = logger;
    this.hasVideos = false;
    this.siteDisabled = false;
    this.videos = [];
    this.settings = settings;
    this.actionHandlerInitQueue = [];

    this.lastUrl = window.location.href;
    this.extensionMode = extensionMode;
    this.readOnly = readOnly;
    this.defaultCrop = undefined;
    this.currentCrop = undefined;

    if (comms){ 
      this.comms = comms;
    }

    try {
      // request inject css immediately
      const playerStyleString = this.settings.active.sites[window.location.host].css.replace('\\n', '');
      this.comms.sendMessage({
        cmd: 'inject-css',
        cssString: playerStyleString
      });
    } catch (e) {
      // do nothing. It's ok if there's no special settings for the player element or crop persistence
    }

    // try getting default crop immediately.
    // const cropModePersistence = this.settings.getDefaultCropPersistenceMode(window.location.host);

    // try {
    //   if (cropModePersistence === CropModePersistence.Forever) {
    //     this.defaultCrop = this.settings.active.sites[window.location.host].defaultCrop;
    //   } else if (cropModePersistence === CropModePersistence.CurrentSession) {
    //     this.defaultCrop = JSON.parse(sessionStorage.getItem('uw-crop-mode-session-persistence'));
    //   }
    // } catch (e) {
    //   // do nothing. It's ok if there's no special settings for the player element or crop persistence
    // }
    this.currentCrop = this.defaultCrop;

    this.rescan(RescanReason.PERIODIC);
    this.scheduleUrlCheck();

    this.currentZoomScale = 1;
  }

  injectCss(cssString) {
    this.comms.sendMessage({
      cmd: 'inject-css',
      cssString: cssString
    });
  }

  ejectCss(cssString) {
    this.comms.sendMessage({
      cmd: 'eject-css',
      cssString: cssString
    });
  }

  replaceCss(oldCssString, newCssString) {
    this.comms.sendMessage({
      cmd: 'replace-css',
      newCssString,
      oldCssString
    });
  }

  destroy() {
    this.logger.log('info', ['debug', 'init'], "[PageInfo::destroy] destroying all videos!")
    if(this.rescanTimer){
      clearTimeout(this.rescanTimer);
    }
    for (var video of this.videos) {
      try {
        this.comms.unregisterVideo(video.id)
        video.destroy();
      } catch (e) {
        this.logger.log('error', ['debug', 'init'], '[PageInfo::destroy] unable to destroy video! Error:', e);
      }
    }

    try {
      playerStyleString = this.settings.active.sites[window.location.host].css;
      if (playerStyleString) {
        this.comms.sendMessage({
          cmd: 'eject-css',
          cssString: playerStyleString
        });
      }
    } catch (e) {
      // do nothing. It's ok if there's no special settings for the player element
    }
  }

  reset() {
    for(var video of this.videos) {
      video.destroy();
    }
    this.rescan(RescanReason.MANUAL);
  }

  initMouseActionHandler(videoData) {
    if (this.actionHandler) {
      this.actionHandler.registerHandleMouse(videoData);
    } else {
      this.actionHandlerInitQueue.push(videoData);
    }
  }

  setActionHandler(actionHandler) {
    this.actionHandler = actionHandler;
    for (var item of this.actionHandlerInitQueue) {
      this.actionHandler.registerHandleMouse(item);
    }
    this.actionHandlerInitQueue = [];
  }

  getVideos(host) {
    if (this.settings.active.sites[host]?.DOM?.video?.manual
        && this.settings.active.sites[host]?.DOM?.video?.querySelector){
      const videos = document.querySelectorAll(this.settings.active.sites[host].DOM.video.querySelector);

      if (videos.length) {
        return videos;
      }
    }
    return document.getElementsByTagName('video');
  }

  hasVideo() {
    return this.readOnly ? this.hasVideos : this.videos.length;
  }

  rescan(rescanReason){
    const oldVideoCount = this.videos.length;

    try{
      var vids = this.getVideos(window.location.host);

      if(!vids || vids.length == 0){
        this.hasVideos = false;
    
        if(rescanReason == RescanReason.PERIODIC){
          this.logger.log('info', 'videoRescan', "[PageInfo::rescan] Scheduling normal rescan.")
          this.scheduleRescan(RescanReason.PERIODIC);
        }
        return;
      }

      // add new videos
      this.hasVideos = false;
      var videoExists = false;    
      var video, v;

      for (video of vids) {
        // če najdemo samo en video z višino in širino, to pomeni, da imamo na strani veljavne videe
        // če trenutni video nima definiranih teh vrednostih, preskočimo vse nadaljnja preverjanja
        // <===[:::::::]===>
        // if we find even a single video with width and height, that means the page has valid videos
        // if video lacks either of the two properties, we skip all further checks cos pointless
        if(video.offsetWidth && video.offsetHeight){
          this.hasVideos = true;

          if (this.readOnly) {
            // in lite mode, we're done. This is all the info we want, but we want to actually start doing 
            // things that interfere with the website. We still want to be runnig a rescan, tho.

            if(rescanReason == RescanReason.PERIODIC){
              this.scheduleRescan(RescanReason.PERIODIC);
            }
            return;
          }
        } else {
          continue;
        }

        videoExists = false;

        for (v of this.videos) {
          if (v.destroyed) {
            continue; //TODO: if destroyed video is same as current video, copy aspect ratio settings to current video
          }

          if (v.video == video) {
            videoExists = true;
            break;
          }
        }

        if (videoExists) {
          continue;
        } else {
          this.logger.log('info', 'videoRescan', "[PageInfo::rescan] found new video candidate:", video, "NOTE:: Video initialization starts here:\n--------------------------------\n")
          
          try {
            v = new VideoData(video, this.settings, this);

            if (!this.defaultCrop) {
              if (!v.invalid) {
                v.initArDetection();
              } else {
                this.logger.log('error', 'debug', 'Video is invalid. Aard not started.', video);
              }
            } else {
              this.logger.log('info', 'debug', 'Default crop is specified for this site. Not starting aard.');
            }
            
            this.videos.push(v);
          } catch (e) {
            this.logger.log('error', 'debug', "rescan error: failed to initialize videoData. Skipping this video.",e);
          }

          this.logger.log('info', 'videoRescan', "END VIDEO INITIALIZATION\n\n\n-------------------------------------\nvideos[] is now this:", this.videos,"\n\n\n\n\n\n\n\n")
        }
      }

      this.removeDestroyed();

      // če smo ostali brez videev, potem odregistriraj stran. 
      // če nismo ostali brez videev, potem registriraj stran.
      //
      // if we're left without videos on the current page, we unregister the page.
      // if we have videos, we call register.
      if (this.comms) {
        if (this.videos.length != oldVideoCount) { // only if number of videos changed, tho
          if (this.videos.length > 0) {
            this.comms.registerVideo({host: window.location.host, location: window.location});
          } else {
            this.comms.unregisterVideo({host: window.location.host, location: window.location});
          }
        }
      }

    } catch(e) {
      // če pride do zajeba, potem lahko domnevamo da na strani ni nobenega videa. Uničimo vse objekte videoData
      // da preprečimo večkratno inicializacijo. Če smo se z našim ugibom zmotili, potem se bodo vsi videi ponovno
      // našli ob naslednjem preiskovanju
      //
      // if we encounter a fuckup, we can assume that no videos were found on the page. We destroy all videoData
      // objects to prevent multiple initalization (which happened, but I don't know why). No biggie if we destroyed
      // videoData objects in error — they'll be back in the next rescan
      this.logger.log('error', 'debug', "rescan error: — destroying all videoData objects",e);
      for (const v of this.videos) {
        v.destroy();
      }
      return;
    }

    if(rescanReason == RescanReason.PERIODIC){
      this.scheduleRescan(RescanReason.PERIODIC);
    }
  }

  removeDestroyed(){
    this.videos = this.videos.filter( vid => vid.destroyed === false);
  }

  scheduleRescan(rescanReason){
    if(rescanReason != RescanReason.PERIODIC){
      this.rescan(rescanReason);
      return;
    }

    try{
      if(this.rescanTimer){
        clearTimeout(this.rescanTimer);
      }

      var ths = this;
      
      this.rescanTimer = setTimeout(function(rescanReason){
        ths.rescanTimer = null;
        ths.rescan(rescanReason);
        ths = null;
      }, this.settings.active.pageInfo.timeouts.rescan, RescanReason.PERIODIC)
    } catch(e) {
      this.logger.log('error', 'debug', "[PageInfo::scheduleRescan] scheduling rescan failed. Here's why:",e)
    }
  }

  scheduleUrlCheck() {
    try{
    if(this.urlCheckTimer){
      clearTimeout(this.urlCheckTimer);
    }

    var ths = this;
        
    this.urlCheckTimer = setTimeout(function(){
      ths.urlCheckTimer = null;
      ths.ghettoUrlCheck();
      ths = null;
    }, this.settings.active.pageInfo.timeouts.urlCheck)
    } catch(e){
      this.logger.log('error', 'debug', "[PageInfo::scheduleUrlCheck] scheduling URL check failed. Here's why:",e)
    }
  }

  ghettoUrlCheck() {
    if (this.lastUrl != window.location.href){
      this.logger.log('error', 'videoRescan', "[PageInfo::ghettoUrlCheck] URL has changed. Triggering a rescan!");
      
      this.rescan(RescanReason.URL_CHANGE);
      this.lastUrl = window.location.href;
    }

    this.scheduleUrlCheck();
  }

  initArDetection(playingOnly){
    if (playingOnly) {
      for(var vd of this.videos){
        if(vd.isPlaying()) {
          vd.initArDetection();
        }
      }
      return;
    } else {
      for(var vd of this.videos){
        vd.initArDetection();
      }
    }
  }


  // to je treba klicat ob menjavi zavihkov
  // these need to be called on tab switch
  pauseProcessing(playingOnly){
    if (playingOnly) {
      for(var vd of this.videos){
        if (vd.isPlaying()) {
          vd.pause();
        }
      }  
    } else {
      for(var vd of this.videos){
        vd.pause();
      }
    }
  }

  resumeProcessing(resumeAutoar = false, playingOnly = false){
    if (playingOnly) {
      for(var vd of this.videos){
        if (vd.isPlaying()) {
          vd.resume();
          if(resumeAutoar){
            vd.resumeAutoAr();
          }
        }
      }
    } else {
      for(var vd of this.videos){
        vd.resume();
        if(resumeAutoar){
          vd.resumeAutoAr();
        }
      }
    }
  }


  startArDetection(playingOnly){
    if (Debug.debug) {
      this.logger.log('info', 'debug', '[PageInfo::startArDetection()] starting automatic ar detection!')
    }
    if (playingOnly) {
      for(var vd of this.videos){
        if (video.isPlaying()) {
          vd.startArDetection();
        }
      }
    } else {
      for(var vd of this.videos){
        vd.startArDetection();
      }
    }
  }

  stopArDetection(playingOnly){
    if (playingOnly) {
      for(var vd of this.videos){
        if (vd.isPlaying()) { 
          vd.stopArDetection();
        }
      }
    } else {
      for(var vd of this.videos){
        vd.stopArDetection();
      }
    }
  }

  setAr(ar, playingOnly){
    this.logger.log('info', 'debug', '[PageInfo::setAr] aspect ratio:', ar, "playing only?", playingOnly)

    if (ar.type !== AspectRatio.Automatic) {
      this.stopArDetection(playingOnly);
    } else {
      this.logger.log('info', 'debug', '[PageInfo::setAr] aspect ratio is auto');

      try {
        for (var vd of this.videos) {
          if (!playingOnly || vd.isPlaying()) {
            vd.resetLastAr();
          }
        }
      } catch (e) {
        this.logger.log('error', 'debug', "???", e);
      }
      this.initArDetection(playingOnly);
      this.startArDetection(playingOnly);
      return;
    }

    // TODO: find a way to only change aspect ratio for one video
    if (ar === AspectRatio.Reset) {
      for (var vd of this.videos) {
        if (!playingOnly || vd.isPlaying()) {
          vd.resetAr();
        }
      }
    } else {
      for (var vd of this.videos) {
        if (!playingOnly || vd.isPlaying()) {
          vd.setAr(ar)
        }
      }
    }
  }
  
  setVideoAlignment(videoAlignment, playingOnly) {
    if (playingOnly) {
      for(var vd of this.videos) {
        if (vd.isPlaying()) { 
          vd.setVideoAlignment(videoAlignment)
        }
      }
    } else {
      for(var vd of this.videos) {
        vd.setVideoAlignment(videoAlignment)
      }
    }
  }

  setPanMode(mode, playingOnly) {
    if (playingOnly) {
      for(var vd of this.videos) {
        if (vd.isPlaying()) {
          vd.setPanMode(mode);
        }
      }
    } else {
      for(var vd of this.videos) {
        vd.setPanMode(mode);
      }
    }
  }

  restoreAr(playingOnly) {
    if (playingOnly) {
      for(var vd of this.videos){
        if (vd.isPlaying()) {
          vd.restoreAr();
        }
      }
    } else {
      for(var vd of this.videos){
        vd.restoreAr();
      }
    }
  }

  setStretchMode(stretchMode, playingOnly, fixedStretchRatio){
    // TODO: find a way to only change aspect ratio for one video

    if (playingOnly) {
      for(var vd of this.videos){
        if (vd.isPlaying()) {
          vd.setStretchMode(stretchMode, fixedStretchRatio)
        }
      }
    } else {
      for(var vd of this.videos){
        vd.setStretchMode(stretchMode, fixedStretchRatio)
      }
    }
  }

  setZoom(zoomLevel, no_announce, playingOnly) {
    if (playingOnly) {
      for(var vd of this.videos) {
        if (vd.isPlaying()) {
          vd.setZoom(zoomLevel, no_announce);
        }
      }
    } else {
      for(var vd of this.videos) {
        vd.setZoom(zoomLevel, no_announce);
      }
    }
  }

  zoomStep(step, playingOnly) {
    for(var vd of this.videos){
      if (!playingOnly || vd.isPlaying()) {
        vd.zoomStep(step);
      }
    }
  }

  markPlayer(name, color) { 
    for (var vd of this.videos) {
      vd.markPlayer(name,color);
    }
  }
  unmarkPlayer() {
    for (var vd of this.videos) {
      vd.unmarkPlayer();
    }
  }

  announceZoom(scale) {
    if (this.announceZoomTimeout) {
      clearTimeout(this.announceZoom);
    }
    this.currentZoomScale = scale;
    const ths = this;
    this.announceZoomTimeout = setTimeout(() => ths.comms.announceZoom(scale), this.settings.active.zoom.announceDebounce);
  }

  setManualTick(manualTick) {
    for(var vd of this.videos) {
      vd.setManualTick();
    }
  }

  tick() {
    for(var vd of this.videos) {
      vd.tick();
    }
  }

  sendPerformanceUpdate(performanceUpdate) {
    if(this.comms) {
      this.comms.sendPerformanceUpdate(performanceUpdate);
    }
  }

  requestCurrentZoom() {
    this.comms.announceZoom(this.currentZoomScale);
  }

  setKeyboardShortcutsEnabled(state) {
    this.actionHandler.setKeybordLocal(state);
  }

  setArPersistence(persistenceMode) {
    // name of this function is mildly misleading — we don't really _set_ ar persistence. (Ar persistence
    // mode is set and saved via popup or keyboard shortcuts, if user defined them) We just save the current
    // aspect ratio whenever aspect ratio persistence mode changes. 
    if (persistenceMode === CropModePersistence.CurrentSession) {
      sessionStorage.setItem('uw-crop-mode-session-persistence', JSON.stringify(this.currentCrop));
    } else if (persistenceMode === CropModePersistence.Forever) {
      if (this.settings.active.sites[window.location.host]) {
        //                                              | key may be missing, so we do this
        this.settings.active.sites[window.location.host]['defaultAr'] = this.currentCrop;
      } else {
        this.settings.active.sites[window.location.host] = this.settings.getDefaultOption();
        this.settings.active.sites[window.location.host]['defaultAr'] = this.currentCrop;
      }
      
      this.settings.saveWithoutReload();
    }
  }

  updateCurrentCrop(ar) {
    this.currentCrop = ar;
    // This means crop persistance is disabled. If crop persistance is enabled, then settings for current
    // site MUST exist (crop persistence mode is disabled by default)

    const cropModePersistence = this.settings.getDefaultCropPersistenceMode(window.location.host);

    if (cropModePersistence === CropModePersistence.Disabled) {
      return;
    }

    this.defaultCrop = ar;
    
    if (cropModePersistence === CropModePersistence.CurrentSession) {
      sessionStorage.setItem('uw-crop-mode-session-persistence', JSON.stringify(ar));
    } else if (cropModePersistence === CropModePersistence.Forever) {
      if (this.settings.active.sites[window.location.host]) {
        //                                              | key may be missing, so we do this
        this.settings.active.sites[window.location.host]['defaultAr'] = ar;
      } else {
        this.settings.active.sites[window.location.host] = this.settings.getDefaultOption();
        this.settings.active.sites[window.location.host]['defaultAr'] = ar;
      }
      
      this.settings.saveWithoutReload();
    }
  }
}

export default PageInfo;
