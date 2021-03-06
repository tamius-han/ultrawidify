import Debug from '../../conf/Debug';
import Logger from '../Logger';
import VideoData from '../video-data/VideoData';

// računa približevanje ter računa/popravlja odmike videa
// calculates zooming and video offsets/panning

class Zoom {
  //#region flags

  //#endregion

  //#region helper objects
  conf: VideoData;
  logger: Logger;
  //#endregion

  //#region misc data
  scale: number = 1;
  logScale: number = 0;
  scaleStep: number = 0.1; 
  minScale: number = -1;    // 50% (log2(0.5) = -1)
  maxScale: number = 3;     // 800% (log2(8) = 3)
  //#endregion


  constructor(videoData) {
    this.conf = videoData;
    this.logger = videoData.logger;
  }

  reset(){
    this.scale = 1;
    this.logScale = 0;
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

    this.conf.resizer.toFixedAr();

    this.conf.restoreAr();
    this.conf.announceZoom(this.scale);
  }

  setZoom(scale: number, no_announce?){
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
