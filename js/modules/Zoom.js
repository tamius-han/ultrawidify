// računa približevanje ter računa/popravlja odmike videa


class Zoom {
  // internal variables


  // functions
  constructor(videoData) {
    this.scale = 1;
    this.scaleStep = 1.2;
    this.minScale = 0.5;  // not accurate, actually slightly less
    this.maxScale = 8;    // not accurate, actually slightly more
    this.conf = videoData;
  }

  reset(){
    this.scale = 1;
  }

  zoomIn(){
    if(this.scale >= this.maxScale)
      return;
    this.scale *= this.scaleStep;
  }

  zoomOut(){
    if(this.scale <= this.minScale)
      return;
    this.scale *= (1/this.scaleStep);
  }

  setZoom(scale){
    if(scale < this.minScale) {
      this.scale = this.minScale;
    } else if (scale > this.maxScale) {
      this.scale = this.maxScale;
    } else {
      this.scale = scale;
    }
  }

  applyZoom(videoDimensions){
    videoDimensions.width *= this.scale;
    videoDimensions.height *= this.scale;
  }
}