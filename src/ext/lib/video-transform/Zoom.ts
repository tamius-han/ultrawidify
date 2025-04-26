import Debug from '../../conf/Debug';
import Logger from '../Logger';
import VideoData from '../video-data/VideoData';

// calculates zooming and video offsets/panning
const MIN_SCALE = 0.5;
const MAX_SCALE = 8;
const LOG_MAX_SCALE = Math.log2(MAX_SCALE);
const LOG_MIN_SCALE = Math.log2(MIN_SCALE);


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
  logMinScale: number = -1;    // 50% (log2(0.5) = -1)
  logMaxScale: number = 3;     // 800% (log2(8) = 3)
  minScale = 0.5;
  maxScale = 8;
  //#endregion


  constructor(videoData) {
    this.conf = videoData;
    this.logger = videoData.logger;
  }

  reset(){
    this.scale = 1;
    this.scaleY = 1;
    this.logScale = 0;
    this.logScaleY = 0;
  }

  /**
   * Increases zoom by a given amount. Does not allow per-axis zoom.
   * Will set zoom level to x axis (+ given amount) if x and y zooms differ.
   * @param amount
   * @param axis — leave undefined to apply zoom to both axes
   */
  zoomStep(amount: number, axis?: 'x' | 'y') {
    let newLog = axis === 'y' ? this.logScaleY : this.logScale;
    newLog += amount;
    newLog = Math.min(Math.max(newLog, LOG_MIN_SCALE), LOG_MAX_SCALE);

    // if axis is undefined, both of this statements should trigger)
    if (axis !== 'y') {
      this.logScale = newLog;
    }
    if (axis !== 'x') {
      this.logScaleY = newLog;
    }

    this.scale = Math.pow(2, this.logScale);
    this.scaleY = Math.pow(2, this.logScaleY);

    this.logger.log('info', 'debug', "[Zoom::zoomStep] changing zoom by", amount, ". New zoom level:", this.scale);
    this.processZoom();
  }

  /**
   * Sets zoom to specific value
   * @param scale
   */
  setZoom(scale: number | {x: number, y: number}){
    // NOTE: SCALE IS NOT LOGARITHMIC
    const scaleIn = (typeof scale === 'number') ?
      {
        x: scale,
        y: scale
      } : {
        x: scale.x ?? this.scale,
        y: scale.y ?? this.scaleY
      };

    this.scale  = Math.min(Math.max(scaleIn.x, MIN_SCALE), MAX_SCALE);
    this.scaleY = Math.min(Math.max(scaleIn.y, MIN_SCALE), MAX_SCALE);

    this.processZoom();
  }

  processZoom() {
    this.conf.resizer.toFixedAr();
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
