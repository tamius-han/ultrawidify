class VideoData {
  
  constructor(video){
    this.video = video;
    // todo: add ArDetect instance
    this.arDetector = new ArDetector(video);
    this.resizer = new Resizer();
  }

  destroy() {
    this.arDetector.stop();
  }

  setLastAr(lastAr){
    this.resizer.setLastAr(lastAr);
  }

}