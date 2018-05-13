class VideoData {
  
  constructor(video){
    this.video = video;
    // todo: add ArDetect instance
    this.arDetector = new ArDetector(video);  // this starts Ar detection. needs optional parameter that prevets ardetdctor from starting
    this.resizer = new Resizer(this);
    this.player = new PlayerData(this);

    // player dimensions need to be in:
    // this.player.dimensions
  }

  initAr() {
    this.arDetector.init();
  }

  startAr() {
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