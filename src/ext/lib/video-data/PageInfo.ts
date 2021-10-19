import Debug from '../../conf/Debug';
import VideoData from './VideoData';
import RescanReason from './enums/RescanReason.enum';
import AspectRatioType from '../../../common/enums/AspectRatioType.enum';
import CropModePersistence from '../../../common/enums/CropModePersistence.enum';
import Logger from '../Logger';
import Settings from '../Settings';
import ExtensionMode from '../../../common/enums/ExtensionMode.enum';
import CommsClient from '../comms/CommsClient';

if (process.env.CHANNEL !== 'stable'){
  console.info("Loading PageInfo");
}

class PageInfo {
  //#region flags
  readOnly: boolean = false;
  hasVideos: boolean = false;
  siteDisabled: boolean = false;
  //#endregion

  //#region timers and timeouts
  rescanTimer: any;
  urlCheckTimer: any;
  announceZoomTimeout: any;
  //#endregion

  //#region helper objects
  logger: Logger;
  settings: Settings;
  comms: CommsClient;
  videos: {videoData: VideoData, element: HTMLVideoElement}[] = [];
  //#endregion

  //#region misc stuff
  lastUrl: string;
  extensionMode: ExtensionMode;
  defaultCrop: any;
  currentCrop: any;
  actionHandlerInitQueue: any[] = [];
  currentZoomScale: number = 1;
  
  actionHandler: any;
  //#endregion

  constructor(comms, settings, logger, extensionMode, readOnly = false){
    this.logger = logger;
    this.settings = settings;

    this.lastUrl = window.location.href;
    this.extensionMode = extensionMode;
    this.readOnly = readOnly;

    if (comms){ 
      this.comms = comms;
    }

    try {
      // request inject css immediately
      const playerStyleString = this.settings.active.sites[window.location.hostname].css.replace('\\n', '');
      this.comms.sendMessage({
        cmd: 'inject-css',
        cssString: playerStyleString
      });
    } catch (e) {
      // do nothing. It's ok if there's no special settings for the player element or crop persistence
    }

    // try getting default crop immediately.
    // const cropModePersistence = this.settings.getDefaultCropPersistenceMode(window.location.hostname);

    // try {
    //   if (cropModePersistence === CropModePersistence.Forever) {
    //     this.defaultCrop = this.settings.active.sites[window.location.hostname].defaultCrop;
    //   } else if (cropModePersistence === CropModePersistence.CurrentSession) {
    //     this.defaultCrop = JSON.parse(sessionStorage.getItem('uw-crop-mode-session-persistence'));
    //   }
    // } catch (e) {
    //   // do nothing. It's ok if there's no special settings for the player element or crop persistence
    // }
    this.currentCrop = this.defaultCrop;

    this.rescan(RescanReason.PERIODIC);
    this.scheduleUrlCheck();
  }

  async injectCss(cssString) {
    await this.comms.sendMessage({
      cmd: 'inject-css',
      cssString: cssString
    });
  }

  async ejectCss(cssString) {
    await this.comms.sendMessage({
      cmd: 'eject-css',
      cssString: cssString
    });
  }

  async replaceCss(oldCssString, newCssString) {
    await this.comms.sendMessage({
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
    for (let video of this.videos) {
      try {
        (this.comms.unregisterVideo as any)(video.videoData.vdid)
        video.videoData.destroy();
      } catch (e) {
        this.logger.log('error', ['debug', 'init'], '[PageInfo::destroy] unable to destroy video! Error:', e);
      }
    }

    try {
      const playerStyleString = this.settings.active.sites[window.location.hostname].css;
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
    for(let video of this.videos) {
      video.videoData.destroy();
      video.videoData = null;
    }
    this.videos = [];
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
    for (let item of this.actionHandlerInitQueue) {
      this.actionHandler.registerHandleMouse(item);
    }
    this.actionHandlerInitQueue = [];
  }

  getVideos(host) {
    if (this.settings.active.sites[host]?.DOM?.video?.manual
        && this.settings.active.sites[host]?.DOM?.video?.querySelectors){
      const videos = document.querySelectorAll(this.settings.active.sites[host].DOM.video.querySelectors) as NodeListOf<HTMLVideoElement>;

      if (videos.length) {
        return videos;
      }
    }
    return document.getElementsByTagName('video');
  }

  hasVideo() {
    return this.readOnly ? this.hasVideos : this.videos.length;
  }

  /**
   * Re-scans the page for videos. Removes any videos that no longer exist from our list
   * of videos. Destroys all videoData objects for all the videos that don't have their
   * own <video> html element on the page.
   * @param rescanReason Why was the rescan triggered. Mostly used for logging.
   * @returns 
   */
  rescan(rescanReason?: RescanReason){
    // is there any video data objects that had their HTML elements removed but not yet 
    // destroyed? We clean that up here.
    const orphans = this.videos.filter(x => !document.body.contains(x.element));
    for (const orphan of orphans) {
      orphan.videoData.destroy();
    }

    // remove all destroyed videos.
    this.videos = this.videos.filter(x => !x.videoData.destroyed);

    // add new videos
    try{
      let vids = this.getVideos(window.location.hostname);

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
      let videoExists = false;

      for (const videoElement of vids) {
        // do not re-add videos that we already track:
        if (this.videos.find(x => x.element.isEqualNode(videoElement))) {
          continue;
        }

        // if we find even a single video with width and height, that means the page has valid videos
        // if video lacks either of the two properties, we skip all further checks cos pointless
        if(!videoElement.offsetWidth || !videoElement.offsetHeight) {
          continue;
        }
        
        // at this point, we're certain that we found new videos. Let's update some properties:
        this.hasVideos = true;

        // if PageInfo is marked as "readOnly", we actually aren't adding any videos to anything because
        // that's super haram. We're only interested in whether 
        if (this.readOnly) {
          // in lite mode, we're done. This is all the info we want, but we want to actually start doing 
          // things that interfere with the website. We still want to be running a rescan, tho.

          if(rescanReason == RescanReason.PERIODIC){
            this.scheduleRescan(RescanReason.PERIODIC);
          }
          return;
        }

        this.logger.log('info', 'videoRescan', "[PageInfo::rescan] found new video candidate:", videoElement, "NOTE:: Video initialization starts here:\n--------------------------------\n")

        try {
          const newVideo = new VideoData(videoElement, this.settings, this);
          this.videos.push({videoData: newVideo, element: videoElement});      
        } catch (e) {
          this.logger.log('error', 'debug', "rescan error: failed to initialize videoData. Skipping this video.",e);
        }
        
        this.logger.log('info', 'videoRescan', "END VIDEO INITIALIZATION\n\n\n-------------------------------------\nvideos[] is now this:", this.videos,"\n\n\n\n\n\n\n\n")
      }

      this.removeDestroyed();

      // if we're left without videos on the current page, we unregister the page.
      // if we have videos, we call register.
      if (this.comms) {
        // We used to send "register video" requests only on the first load, or if the number of 
        // videos on the page has changed. However, since Chrome Web Store started to require every
        // extension requiring "broad permissions" to undergo manual review
        // ... and since Chrome Web Store is known for taking their sweet ass time reviewing extensions,
        // with review times north of an entire fucking month
        // ... and since the legacy way of checking whether our frames-with-videos cache in background 
        // script contains any frames that no longer exist required us to use webNavigation.getFrame()/
        // webNavigation.getAllFrames(), which requires a permission that triggers a review. 
        //
        // While the extension uses some other permissions that trigger manual review, it's said that
        // less is better / has a positive effect on your manual review times ... So I guess we'll do 
        // things in the less-than-optimal. more-than-retarded way.
        //
        // no but honestly fuck Chrome.

        // if (this.videos.length != oldVideoCount) {
        // } 
        
        if (this.videos.length > 0) {
          // this.comms.registerVideo({host: window.location.hostname, location: window.location});
          this.comms.registerVideo();
        } else {
          // this.comms.unregisterVideo({host: window.location.hostname, location: window.location});
          this.comms.unregisterVideo();
        }
      }

    } catch(e) {
      // if we encounter a fuckup, we can assume that no videos were found on the page. We destroy all videoData
      // objects to prevent multiple initialization (which happened, but I don't know why). No biggie if we destroyed
      // videoData objects in error — they'll be back in the next rescan
      this.logger.log('error', 'debug', "rescan error: — destroying all videoData objects",e);
      for (const v of this.videos) {
        v.videoData.destroy();
      }
      this.videos = [];
      return;
    }
    if(rescanReason == RescanReason.PERIODIC){
      this.scheduleRescan(RescanReason.PERIODIC);
    }
  }

  removeDestroyed(){
    this.videos = this.videos.filter( vid => vid.videoData.destroyed === false);
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

      let ths = this;
      
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

    let ths = this;
        
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
      for(let vd of this.videos){
        if(vd.videoData.isPlaying()) {
          vd.videoData.initArDetection();
        }
      }
      return;
    } else {
      for(let vd of this.videos){
        vd.videoData.initArDetection();
      }
    }
  }


  // to je treba klicat ob menjavi zavihkov
  // these need to be called on tab switch
  pauseProcessing(playingOnly){
    if (playingOnly) {
      for(let vd of this.videos){
        if (vd.videoData.isPlaying()) {
          vd.videoData.pause();
        }
      }  
    } else {
      for(let vd of this.videos){
        vd.videoData.pause();
      }
    }
  }

  resumeProcessing(resumeAutoar = false, playingOnly = false){
    if (playingOnly) {
      for(let vd of this.videos){
        if (vd.videoData.isPlaying()) {
          vd.videoData.resume();
          if(resumeAutoar){
            vd.videoData.resumeAutoAr();
          }
        }
      }
    } else {
      for(let vd of this.videos){
        vd.videoData.resume();
        if(resumeAutoar){
          vd.videoData.resumeAutoAr();
        }
      }
    }
  }


  startArDetection(playingOnly){
    if (Debug.debug) {
      this.logger.log('info', 'debug', '[PageInfo::startArDetection()] starting automatic ar detection!')
    }
    if (playingOnly) {
      for(let vd of this.videos){
        if (vd.videoData.isPlaying()) {
          vd.videoData.startArDetection();
        }
      }
    } else {
      for(let vd of this.videos){
        vd.videoData.startArDetection();
      }
    }
  }

  stopArDetection(playingOnly){
    if (playingOnly) {
      for(let vd of this.videos){
        if (vd.videoData.isPlaying()) { 
          vd.videoData.stopArDetection();
        }
      }
    } else {
      for(let vd of this.videos){
        vd.videoData.stopArDetection();
      }
    }
  }

  setAr(ar, playingOnly?: boolean){
    this.logger.log('info', 'debug', '[PageInfo::setAr] aspect ratio:', ar, "playing only?", playingOnly)

    if (ar.type !== AspectRatioType.Automatic) {
      this.stopArDetection(playingOnly);
    } else {
      this.logger.log('info', 'debug', '[PageInfo::setAr] aspect ratio is auto');

      try {
        for (let vd of this.videos) {
          if (!playingOnly || vd.videoData.isPlaying()) {
            vd.videoData.resetLastAr();
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
    if (ar === AspectRatioType.Reset) {
      for (let vd of this.videos) {
        if (!playingOnly || vd.videoData.isPlaying()) {
          vd.videoData.resetAr();
        }
      }
    } else {
      for (let vd of this.videos) {
        if (!playingOnly || vd.videoData.isPlaying()) {
          vd.videoData.setAr(ar)
        }
      }
    }
  }
  
  setVideoAlignment(videoAlignment, playingOnly) {
    if (playingOnly) {
      for(let vd of this.videos) {
        if (vd.videoData.isPlaying()) { 
          vd.videoData.setVideoAlignment(videoAlignment)
        }
      }
    } else {
      for(let vd of this.videos) {
        vd.videoData.setVideoAlignment(videoAlignment)
      }
    }
  }

  setPanMode(mode, playingOnly?: boolean) {
    if (playingOnly) {
      for(let vd of this.videos) {
        if (vd.videoData.isPlaying()) {
          vd.videoData.setPanMode(mode);
        }
      }
    } else {
      for(let vd of this.videos) {
        vd.videoData.setPanMode(mode);
      }
    }
  }

  restoreAr(playingOnly?: boolean) {
    if (playingOnly) {
      for(let vd of this.videos){
        if (vd.videoData.isPlaying()) {
          vd.videoData.restoreAr();
        }
      }
    } else {
      for(let vd of this.videos){
        vd.videoData.restoreAr();
      }
    }
  }

  setStretchMode(stretchMode, playingOnly?: boolean, fixedStretchRatio?: boolean){
    // TODO: find a way to only change aspect ratio for one video

    if (playingOnly) {
      for(let vd of this.videos){
        if (vd.videoData.isPlaying()) {
          vd.videoData.setStretchMode(stretchMode, fixedStretchRatio)
        }
      }
    } else {
      for(let vd of this.videos){
        vd.videoData.setStretchMode(stretchMode, fixedStretchRatio)
      }
    }
  }

  setZoom(zoomLevel, no_announce?: boolean, playingOnly?: boolean) {
    if (playingOnly) {
      for(let vd of this.videos) {
        if (vd.videoData.isPlaying()) {
          vd.videoData.setZoom(zoomLevel, no_announce);
        }
      }
    } else {
      for(let vd of this.videos) {
        vd.videoData.setZoom(zoomLevel, no_announce);
      }
    }
  }

  zoomStep(step, playingOnly?: boolean) {
    for(let vd of this.videos){
      if (!playingOnly || vd.videoData.isPlaying()) {
        vd.videoData.zoomStep(step);
      }
    }
  }

  markPlayer(name, color) { 
    for (let vd of this.videos) {
      vd.videoData.markPlayer(name,color);
    }
  }
  unmarkPlayer() {
    for (let vd of this.videos) {
      vd.videoData.unmarkPlayer();
    }
  }

  announceZoom(scale) {
    if (this.announceZoomTimeout) {
      clearTimeout(this.announceZoomTimeout);
    }
    this.currentZoomScale = scale;
    const ths = this;
    this.announceZoomTimeout = setTimeout(() => ths.comms.announceZoom(scale), this.settings.active.zoom.announceDebounce);
  }

  setManualTick(manualTick) {
    for(let vd of this.videos) {
      vd.videoData.setManualTick(manualTick);
    }
  }

  tick() {
    for(let vd of this.videos) {
      vd.videoData.tick();
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
    this.actionHandler.setKeyboardLocal(state);
  }

  setArPersistence(persistenceMode) {
    // name of this function is mildly misleading — we don't really _set_ ar persistence. (Ar persistence
    // mode is set and saved via popup or keyboard shortcuts, if user defined them) We just save the current
    // aspect ratio whenever aspect ratio persistence mode changes. 
    if (persistenceMode === CropModePersistence.CurrentSession) {
      sessionStorage.setItem('uw-crop-mode-session-persistence', JSON.stringify(this.currentCrop));
    } else if (persistenceMode === CropModePersistence.Forever) {
      if (this.settings.active.sites[window.location.hostname]) {
        //                                              | key may be missing, so we do this
        this.settings.active.sites[window.location.hostname]['defaultAr'] = this.currentCrop;
      } else {
        this.settings.active.sites[window.location.hostname] = this.settings.getDefaultOption();
        this.settings.active.sites[window.location.hostname]['defaultAr'] = this.currentCrop;
      }
      
      this.settings.saveWithoutReload();
    }
  }

  updateCurrentCrop(ar) {
    this.currentCrop = ar;
    // This means crop persistance is disabled. If crop persistance is enabled, then settings for current
    // site MUST exist (crop persistence mode is disabled by default)

    const cropModePersistence = this.settings.getDefaultCropPersistenceMode(window.location.hostname);

    if (cropModePersistence === CropModePersistence.Disabled) {
      return;
    }

    this.defaultCrop = ar;
    
    if (cropModePersistence === CropModePersistence.CurrentSession) {
      sessionStorage.setItem('uw-crop-mode-session-persistence', JSON.stringify(ar));
    } else if (cropModePersistence === CropModePersistence.Forever) {
      if (this.settings.active.sites[window.location.hostname]) {
        //                                              | key may be missing, so we do this
        this.settings.active.sites[window.location.hostname]['defaultAr'] = ar;
      } else {
        this.settings.active.sites[window.location.hostname] = this.settings.getDefaultOption();
        this.settings.active.sites[window.location.hostname]['defaultAr'] = ar;
      }
      
      this.settings.saveWithoutReload();
    }
  }
}

if (process.env.CHANNEL !== 'stable'){
  console.info("PageInfo loaded!");
}

export default PageInfo;
