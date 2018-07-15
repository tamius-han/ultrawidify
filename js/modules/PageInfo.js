if(Debug.debug)
  console.log("Loading: PageInfo.js");

class PageInfo {
  constructor(comms){
    this.keybinds = new Keybinds(this);
    this.keybinds.setup();
    this.hasVideos = false;
    this.siteDisabled = false;
    this.videos = [];

    this.lastUrl = window.location.href;

    this.rescan(RescanReason.PERIODIC);
    this.scheduleUrlCheck();

    if(comms){ 
      this.comms = comms;
      if(this.videos.length > 0){
        comms.registerVideo();
      }
    }
  }


  reset(){
    for(video of this.videos) {
      video.destroy();
    }
    this.rescan(RescanReason.MANUAL);
  }

  rescan(rescanReason){
    try{
    var vids = document.getElementsByTagName('video');

    if(!vids || vids.length == 0){
      this.hasVideos = false;
  
      if(rescanReason == RescanReason.PERIODIC){
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
        if(Debug.debug && Debug.periodic && Debug.videoRescan){
          console.log("[PageInfo::rescan] found new video candidate:", video)
        }
        v = new VideoData(video);
        // console.log("[PageInfo::rescan] v is:", v)
        // debugger;
        v.initArDetection();
        this.videos.push(v);

        if(Debug.debug && Debug.periodic && Debug.videoRescan){
          console.log("[PageInfo::rescan] — videos[] is now this:", this.videos,"\n\n\n\n\n\n\n\n")
        }
      }
    }

    this.removeDestroyed();
    
    // console.log("Rescan complete. Total videos?", this.videos.length)
    }catch(e){
      console.log("rescan error:",e)
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
      
      
      this.rescanTimer = setTimeout(function(rr){
        ths.rescanTimer = null;
        ths.rescan(rr);
        ths = null;
      }, rescanReason === ExtensionConf.pageInfo.timeouts.rescan, RescanReason.PERIODIC)
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
    }, ExtensionConf.pageInfo.timeouts.urlCheck)
    }catch(e){
      if(Debug.debug){
        console.log("[PageInfo::scheduleUrlCheck] scheduling URL check failed. Here's why:",e)
      }
    }
  }

  ghettoUrlCheck() {
    if (this.lastUrl != window.location.href){
      if(Debug.debug){
        console.log("[PageInfo::ghettoUrlCheck] URL has changed. Triggering a rescan!");
      }
      
      this.rescan(RescanReason.URL_CHANGE);
      this.lastUrl = window.location.href;
    }

    this.scheduleUrlCheck();
  }

  initArDetection(){
    for(var vd of this.videos){
      vd.initArDetection();
    }
  }


  // to je treba klicat ob menjavi zavihkov
  // these need to be called on tab switch
  pauseProcessing(){
    for(var vd of this.videos){
      vd.pause();
    }
  }

  resumeProcessing(resumeAutoar = false){
    for(var vd of this.videos){
      vd.resume();
      if(resumeAutoar){
        vd.resumeAutoAr();
      }
    }
  }



  startArDetection(){
    for(var vd of this.videos){
      vd.startArDetection();
    }
  }

  stopArDetection(){
    for(var vd of this.videos){
      vd.stopArDetection();
    }
  }

  setAr(ar){
    if(ar !== 'auto') {
      this.stopArDetection();
    }
    // TODO: find a way to only change aspect ratio for one video
    for(var vd of this.videos){
      vd.setAr(ar)
    }
  }
  
  restoreAr() {
    for(var vd of this.videos){
      vd.restoreAr()
    }
  }

  setStretchMode(sm){
    // TODO: find a way to only change aspect ratio for one video
    
    for(var vd of this.videos){
      vd.setStretchMode(sm)
    }
  }

  zoomStep(step){
    for(var vd of this.videos){
      vd.zoomStep(step);
    }
  }
}

var RescanReason = {
  PERIODIC: 0,
  URL_CHANGE: 1,
  MANUAL: 2
}