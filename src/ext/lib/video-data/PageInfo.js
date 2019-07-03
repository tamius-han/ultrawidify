import Debug from '../../conf/Debug';
import VideoData from './VideoData';
import RescanReason from './enums/RescanReason';
import AspectRatio from '../../../common/enums/aspect-ratio.enum';

if(Debug.debug)
  console.log("Loading: PageInfo.js");



class PageInfo {
  constructor(comms, settings, extensionMode, readOnly = false){
    this.hasVideos = false;
    this.siteDisabled = false;
    this.videos = [];
    this.settings = settings;
    this.actionHandlerInitQueue = [];

    this.lastUrl = window.location.href;
    this.extensionMode = extensionMode;
    this.readOnly = readOnly;

    if (comms){ 
      this.comms = comms;
    }

    this.rescan(RescanReason.PERIODIC);
    this.scheduleUrlCheck();

    this.currentZoomScale = 1;

    console.log("PAGEINFO: STARTING IN READ ONLY MODE?", readOnly)
  }

  destroy() {
    if(Debug.debug || Debug.init){
      console.log("[PageInfo::destroy] destroying all videos!")
    }
    if(this.rescanTimer){
      clearTimeout(this.rescanTimer);
    }
    for (var video of this.videos) {
      this.comms.unregisterVideo(video.id)
      video.destroy();
    }

    try {
      playerStyleString = this.settings.active.sites[window.location.host].css;
      if (playerStyleString) {
        this.comms.sendMessage({
          cmd: 'remove-css',
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
    if (this.settings.active.sites[host]
        && this.settings.active.sites[host].DOM
        && this.settings.active.sites[host].DOM.video
        && this.settings.active.sites[host].DOM.video.manual
        && this.settings.active.sites[host].DOM.video.querySelector){
      const videos = document.querySelectorAll(this.settings.active.sites[host].DOM.video.querySelector);

      if (videos.length) {
        return videos;
      }
    }
    return document.getElementsByTagName('video');
  }

  hasVideo() {
    console.log("DO WE HAVE VIDEO?", this.readOnly ? this.hasVideos : this.videos.length)
    return this.readOnly ? this.hasVideos : this.videos.length;
  }

  rescan(rescanReason){
    const oldVideoCount = this.videos.length;

    try{
    var vids = this.getVideos(window.location.host);

    if(!vids || vids.length == 0){
      this.hasVideos = false;
  
      if(rescanReason == RescanReason.PERIODIC){
        if (Debug.debug && Debug.videoRescan && Debug.periodic) {
          console.log("[PageInfo::rescan] Scheduling normal rescan:")
        }
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
          console.log("FOUDN A VIDEO")
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
        if (Debug.debug && Debug.periodic && Debug.videoRescan) {
          console.log("[PageInfo::rescan] found new video candidate:", video, "NOTE:: Video initialization starts here:\n--------------------------------\n")
        }
        
        v = new VideoData(video, this.settings, this);
        // console.log("[PageInfo::rescan] v is:", v)
        v.initArDetection();
        this.videos.push(v);

        if(Debug.debug && Debug.periodic && Debug.videoRescan){
          console.log("[PageInfo::rescan] END VIDEO INITIALIZATION\n\n\n-------------------------------------\nvideos[] is now this:", this.videos,"\n\n\n\n\n\n\n\n")
        }
      }
    }

    this.removeDestroyed();

    // če smo ostali brez videev, potem odregistriraj stran. 
    // če nismo ostali brez videev, potem registriraj stran.
    //
    // if we're left withotu videos on the current page, we unregister the page.
    // if we have videos, we call register.
    // if(Debug.debug) {
    //   console.log("[PageInfo::rescan] Comms:", this.comms, "\nvideos.length:", this.videos.length, "\nold video count:", oldVideoCount)
    // }
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
      if (Debug.debug) {
        console.log("rescan error: — destroying all videoData objects",e);
      }
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
      if(Debug.debug){
        console.log("[PageInfo::scheduleRescan] scheduling rescan failed. Here's why:",e)
      }
    }
  }

  scheduleUrlCheck() {
    try{
    if(this.urlCheckTimer){
      clearTimeout(this.urlCheckTimer);
    }

    var ths = this;
        
    this.rescanTimer = setTimeout(function(){
      ths.rescanTimer = null;
      ths.ghettoUrlCheck();
      ths = null;
    }, this.settings.active.pageInfo.timeouts.urlCheck)
    } catch(e){
      if(Debug.debug){
        console.error("[PageInfo::scheduleUrlCheck] scheduling URL check failed. Here's why:",e)
      }
    }
  }

  ghettoUrlCheck() {
    if (this.lastUrl != window.location.href){
      if(Debug.debug && Debug.periodic){
        console.log("[PageInfo::ghettoUrlCheck] URL has changed. Triggering a rescan!");
      }
      
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
      console.log('[PageInfo::startArDetection()] starting automatic ar detection!')
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
    if (Debug.debug) {
      console.log('[PageInfo::setAr] aspect ratio:', ar, "playing only?", playingOnly)
    }

    if (ar.type !== AspectRatio.Automatic) {
      this.stopArDetection(playingOnly);
    } else {
      if (Debug.debug) {
        console.log('[PageInfo::setAr] aspect ratio is auto');
      }

      try {
        for (var vd of this.videos) {
          if (!playingOnly || vd.isPlaying()) {
            vd.resetLastAr();
          }
        }
      } catch (e) {
        console.log("???", e);
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
  
  setvideoAlignment(videoAlignment, playingOnly) {
    if (playingOnly) {
      for(var vd of this.videos) {
        if (vd.isPlaying()) { 
          vd.setvideoAlignment(videoAlignment)
        }
      }
    } else {
      for(var vd of this.videos) {
        vd.setvideoAlignment(videoAlignment)
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

  setStretchMode(sm, playingOnly){
    // TODO: find a way to only change aspect ratio for one video

    if (playingOnly) {
      for(var vd of this.videos){
        if (vd.isPlaying()) {
          vd.setStretchMode(sm)
        }
      }
    } else {
      for(var vd of this.videos){
        vd.setStretchMode(sm)
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
}

export default PageInfo;
