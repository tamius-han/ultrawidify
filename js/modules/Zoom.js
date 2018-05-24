// računa približevanje ter računa/popravlja odmike videa


class Zoom {
  // internal variables


  // functions
  constructor(videoData) {
    this.scale = 1;
    this.scaleStep = 0.1;
    this.minScale = 0.5;  // not accurate, actually slightly less
    this.maxScale = 8;    // not accurate, actually slightly more
    this.conf = videoData;
  }

  reset(){
    this.scale = 1;
  }

  zoomIn(){
    this.scale += this.scaleStep;

    if (this.scale >= this.maxScale) {
      this.scale = this.maxScale;
    }
  }

  zoomOut(){
    this.scale -= this.scaleStep;

    if (this.scale <= this.minScale) {
      this.scale = this.minScale;
    }
    
  }

  zoomStep(amount){
    this.scale += amount;

    if (this.scale <= this.minScale) {
      this.scale = this.minScale;
    }
    if (this.scale >= this.maxScale) {
      this.scale = this.maxScale;
    }
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
    videoDimensions.xFactor *= this.scale;
    videoDimensions.yFactor *= this.scale;
  }
}