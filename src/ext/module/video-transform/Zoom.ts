import { ComponentLogger } from '../logging/ComponentLogger';
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
  logger: ComponentLogger;
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

  effectiveZoom: {x: number, y: number}; // we're setting this in Resizer based on Resizer data!

  constructor(videoData) {
    this.conf = videoData;
    this.logger = new ComponentLogger(videoData.logAggregator, 'Zoom', {});
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
    const effectiveLog = {
      x: Math.log2(this.effectiveZoom.x),
      y: Math.log2(this.effectiveZoom.y)
    };

    let newLog = axis === 'y' ? effectiveLog.y : effectiveLog.x;
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
}

export default Zoom;
