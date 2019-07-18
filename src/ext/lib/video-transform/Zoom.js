import Debug from '../../conf/Debug';

// računa približevanje ter računa/popravlja odmike videa
// calculates zooming and video offsets/panning

class Zoom {
  // functions
  constructor(videoData, logger) {
    this.scale = 1;
    this.logScale = 0;
    this.scaleStep = 0.1;
    this.minScale = -1;  // 50% (log2(0.5) = -1)
    this.maxScale = 3;   // 800% (log2(8) = 3)
    this.conf = videoData;
    this.logger = logger;
  }

  reset(){
    this.scale = 1;
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

    this.logger.log('info', 'debug', "[Zoom::zoomStep] changing zoom by", amount, ". New zoom level:", this.scale);

    this.conf.restoreAr();
    this.conf.announceZoom(this.scale);
  }

  setZoom(scale, no_announce){
    this.logger.log('info', 'debug', "[Zoom::setZoom] Setting zoom to", scale, "!");

    // NOTE: SCALE IS NOT LOGARITHMIC
    if(scale < Math.pow(2, this.minScale)) {
      scale = this.minScale;
    } else if (scale > Math.pow(2, this.maxScale)) {
      scale = this.maxScale;
    }

    this.scale = scale;

    this.conf.restoreAr();
    if (!no_announce) {
      this.conf.announceZoom(this.scale);
    }
  }

  applyZoom(stretchFactors){
    if (!stretchFactors) {
      return;
    }
    this.logger.log('info', 'debug', "[Zoom::setZoom] Applying zoom. Stretch factors pre:", stretchFactors, " —> scale:", this.scale);

    stretchFactors.xFactor *= this.scale;
    stretchFactors.yFactor *= this.scale;

    this.logger.log('info', 'debug', "[Zoom::setZoom] Applying zoom. Stretch factors post:", stretchFactors);
  }
}

export default Zoom;
