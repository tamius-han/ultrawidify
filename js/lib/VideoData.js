class VideoData {
  
  constructor(video){
    this.video = video;

    // POZOR: VRSTNI RED JE POMEMBEN (arDetect mora bit zadnji)
    // NOTE: ORDERING OF OBJ INITIALIZATIONS IS IMPORTANT (arDetect needs to go last)    
    this.player = new PlayerData(this);
    this.resizer = new Resizer(this);

    this.arDetector = new ArDetector(this);  // this starts Ar detection. needs optional parameter that prevets ardetdctor from starting

    // player dimensions need to be in:
    // this.player.dimensions
  }

  initArDetection() {
    this.arDetector.init();
  }

  startArDetection() {
    this.arDetector.start();
  }

  destroy() {
    this.arDetector.stop();
  }

  setLastAr(lastAr){
    this.resizer.setLastAr(lastAr);
  }

  setAr(ar, lastAr){
    this.resizer.setAr(ar, lastAr);
  }

  setStretchMode(stretchMode){
    this.resizer.setStretchMode(stretchMode);
  }

}