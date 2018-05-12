class VideoData {
  
  constructor(video){
    this.video = video;
    // todo: add ArDetect instance
    this.arDetector = new ArDetector(video);
    this.resizer = new Resizer(this);

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

}