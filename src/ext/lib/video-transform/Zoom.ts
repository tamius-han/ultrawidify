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
  scaleY: number = 1;
  logScale: number = 0;
  logScaleY: number = 0;
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

  /**
   * Increases zoom by a given amount. Does not allow per-axis zoom.
   * Will set zoom level to x axis (+ given amount) if x and y zooms differ.
   * @param amount
   */
  zoomStep(amount){
    this.logScale += amount;

    if (this.logScale <= this.minScale) {
      this.logScale = this.minScale;
    }
    if (this.logScale >= this.maxScale) {
      this.logScale = this.maxScale;
    }

    this.logScaleY = this.logScale;

    this.scale = Math.pow(2, this.logScale);

    this.logger.log('info', 'debug', "[Zoom::zoomStep] changing zoom by", amount, ". New zoom level:", this.scale);
    this.processZoom();
  }

  setZoom(scale: number, axis?: 'x' |'y', noAnnounce?){
    this.logger.log('info', 'debug', "[Zoom::setZoom] Setting zoom to", scale, "!");

    // NOTE: SCALE IS NOT LOGARITHMIC
    if(scale < Math.pow(2, this.minScale)) {
      scale = this.minScale;
    } else if (scale > Math.pow(2, this.maxScale)) {
      scale = this.maxScale;
    }

    switch (axis) {
      case 'x':
        this.scale = scale;
        break;
      case 'y':
        this.scaleY = scale;
        break;
      default:
        this.scale = scale;
        this.scaleY = scale;
    }

    this.processZoom();
  }

  processZoom() {
    // this.conf.resizer.toFixedAr();

    this.conf.resizer.applyScaling({xFactor: this.scale, yFactor: this.scaleY}, {noAnnounce: true});
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
