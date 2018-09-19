// računa približevanje ter računa/popravlja odmike videa


class Zoom {
  // internal variables


  // functions
  constructor(videoData) {
    this.scale = 1;
    this.logScale = 0;
    this.scaleStep = 0.1;
    this.minScale = -1;  // 50% (log2(0.5) = -1)
    this.maxScale = 3;   // 800% (log2(8) = 3)
    this.conf = videoData;
  }

  reset(){
    this.scale = 1;
  }

  zoomIn(){
    this.logScale += this.scaleStep;

    if (this.logScale >= this.maxScale) {
      this.logScale = this.maxScale;
    }

    this.scale = Math.pow(2, this.logScale);
  }

  zoomOut(){
    this.logScale -= this.scaleStep;

    if (this.logScale <= this.minScale) {
      this.logScale = this.minScale;
    }
    
    this.scale = Math.pow(2, this.logScale);
  }

  zoomStep(amount){
    this.logScale += amount;

    if (this.logScale <= this.minScale) {
      this.logScale = this.minScale;
    }
    if (this.logScale >= this.maxScale) {
      this.logScale = this.maxScale;
    }
  
    this.scale = Math.pow(2, this.logScale);

    if (Debug.debug) {
      console.log("[Zoom::zoomStep] changing zoom by", amount, ". New zoom level:", this.scale);
    }

    this.conf.restoreAr();
  }

  setZoom(scale){
    // NOTE: SCALE IS NOT LOGARITHMIC
    if(scale < Math.pow(this.minScale)) {
      scale = this.minScale;
    } else if (scale > Math.pow(this.maxScale)) {
      scale = this.maxScale;
    }

    this.scale = scale;

    this.conf.restoreAr();
  }

  applyZoom(videoDimensions){
    videoDimensions.xFactor *= this.scale;
    videoDimensions.yFactor *= this.scale;
  }
}