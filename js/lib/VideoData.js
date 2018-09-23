class VideoData {
  
  constructor(video, settings, pageInfo){
    this.arSetupComplete = false;
    this.video = video;
    this.destroyed = false;
    this.settings = settings;
    // POZOR: VRSTNI RED JE POMEMBEN (arDetect mora bit zadnji)
    // NOTE: ORDERING OF OBJ INITIALIZATIONS IS IMPORTANT (arDetect needs to go last)    
    this.player = new PlayerData(this);
    this.resizer = new Resizer(this);

    this.arDetector = new ArDetector(this);  // this starts Ar detection. needs optional parameter that prevets ardetdctor from starting
    // player dimensions need to be in:
    // this.player.dimensions
    this.pageInfo = pageInfo;
    this.vdid = (Math.random()*100).toFixed();
    if (Debug.init) {
      console.log("[VideoData::ctor] Created videoData with vdid", this.vdid);
    }
  }

  firstTimeArdInit(){
    if(this.destroyed) {
      throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
    }
    if(! this.arSetupComplete){
      this.arDetector = new ArDetector(this);
    }
  }

  initArDetection() {
    if(this.destroyed) {
      throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
    }
    if(this.arDetector){
      this.arDetector.init();
    }
    else{
      this.arDetector = new ArDetector(this);
      this.arDetector.init();
    }
  }
  
  startArDetection() {
    if(this.destroyed) {
      throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
    }
    if(!this.arDetector) {
      this.arDetector.init();
    }
    this.arDetector.start();
  }

  stopArDetection() {
    if (this.arDetector) {
      this.arDetector.stop();
    }
  }

  destroy() {
    if(Debug.debug || Debug.init){ 
      console.log(`[VideoData::destroy] <vdid:${this.vdid}> received destroy command`);
    }

    this.pause();
    this.destroyed = true;
    if(this.arDetector){
      this.arDetector.stop();
      this.arDetector.destroy();
    }
    this.arDetector = null;
    if(this.resizer){
      this.resizer.destroy();
    }
    this.resizer = null;
    if(this.player){
      this.player.destroy();
    }
    this.player = null;
    this.video = null;
  }

  pause(){
    this.paused = true;
    if(this.arDetector){
      this.arDetector.stop();
    }
    if(this.resizer){
      this.resizer.stop();
    }
    if(this.player){
      this.player.stop();
    }
  }

  resume(){
    if(this.destroyed) {
      throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
    }
    this.paused = false;
    try {
      this.resizer.start();
      this.player.start();
    } catch (e) {
      if(Debug.debug){
        console.log("[VideoData.js::resume] cannot resume for reasons. Will destroy videoData. Error here:", e);
      }
      this.destroy();
    }
  }

  resumeAutoAr(){
    if(this.arDetector){
      this.startArDetection();
    }
  }

  setLastAr(lastAr){
    this.resizer.setLastAr(lastAr);
  }

  setAr(ar, lastAr){
    this.resizer.setAr(ar, lastAr);
  }

  resetAr() {
    this.resizer.reset();
  }

  panHandler(event) {
    if(this.destroyed) {
      throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
    }
    if(!this.resizer) {
      this.destroy();
      return;
    }
    this.resizer.panHandler(event);
  }

  setPanMode(mode) {
    this.resizer.setPanMode(mode);
  }

  setVideoFloat(videoFloat) {
    this.resizer.setVideoFloat(videoFloat);
  }

  restoreAr(){
    this.resizer.restore();
  }

  setStretchMode(stretchMode){
    this.resizer.setStretchMode(stretchMode);
  }

  setZoom(zoomLevel, no_announce){
    this.resizer.setZoom(zoomLevel, no_announce);
  }

  zoomStep(step){
    this.resizer.zoomStep(step);
  }

  announceZoom(scale){
    this.pageInfo.announceZoom(scale);
  }
}