class VideoData {
  
  constructor(video){
    this.arSetupComplete = false;
    this.video = video;
    this.destroyed = false;

    // POZOR: VRSTNI RED JE POMEMBEN (arDetect mora bit zadnji)
    // NOTE: ORDERING OF OBJ INITIALIZATIONS IS IMPORTANT (arDetect needs to go last)    
    this.player = new PlayerData(this);
    this.resizer = new Resizer(this);

    this.arDetector = new ArDetector(this);  // this starts Ar detection. needs optional parameter that prevets ardetdctor from starting
    // player dimensions need to be in:
    // this.player.dimensions
  }

  firstTimeArdInit(){
    if(! this.arSetupComplete){
      this.arDetector = new ArDetector(this);
    }
  }

  initArDetection() {
    if(this.arDetector){
      this.arDetector.init();
    }
    else{
      this.arDetector = new ArDetector(this);
      this.arDetector.init();
    }
  }
  
  startArDetection() {
    this.arDetector.start();
  }

  stopArDetection() {
    this.arDetector.stop();
  }

  destroy() {
    this.destroyed = true;
    if(this.arDetector){
      this.arDetector.stop();
      this.arDetector.destroy();
    }
    this.arDetector = null;
    if(this.resizer){
      this.resizer.destroy();
    }
    if(this.player){
      player.destroy();
    }
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

  restoreAr(){
    this.resizer.restore();
  }

  setStretchMode(stretchMode){
    this.resizer.setStretchMode(stretchMode);
  }

  zoomStep(step){
    this.resizer.zoomStep();
  }

}