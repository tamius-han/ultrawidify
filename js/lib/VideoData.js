class VideoData {
  
  constructor(video){
    this.video = video;
    // todo: add ArDetect instance
    this.arDetector = new ArDetector(video);
  }

  destroy() {
    this.arDetector.stop();
  }
}