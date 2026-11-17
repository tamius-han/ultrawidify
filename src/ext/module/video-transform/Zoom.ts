import { ComponentLogger } from '../logging/ComponentLogger';
import VideoData from '../video-data/VideoData';

// calculates zooming and video offsets/panning
const MIN_SCALE = 0.5;
const MAX_SCALE = 8;
const LOG_MAX_SCALE = Math.log2(MAX_SCALE);
const LOG_MIN_SCALE = Math.log2(MIN_SCALE);

function finiteZoom(value: unknown): number | undefined {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}


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
  zoomStep(zoom: number | {x?: number, y?: number}, axis?: 'x' | 'y') {
    const zoomX = finiteZoom(typeof zoom === 'object' && zoom !== null ? zoom.x : zoom);
    const zoomY = finiteZoom(typeof zoom === 'object' && zoom !== null ? zoom.y : zoom);
    if ((axis === 'x' || zoomY === undefined) && (axis === 'y' || zoomX === undefined)) {
      return;
    }

    const effectiveX = finiteZoom(this.effectiveZoom?.x) ?? 1;
    const effectiveY = finiteZoom(this.effectiveZoom?.y) ?? 1;
    const logX = Math.log2(effectiveX > 0 ? effectiveX : 1);
    const logY = Math.log2(effectiveY > 0 ? effectiveY : 1);

    this.logScale = Math.min(Math.max(logX + (axis === 'y' ? 0 : zoomX ?? 0), LOG_MIN_SCALE), LOG_MAX_SCALE);
    this.logScaleY = Math.min(Math.max(logY + (axis === 'x' ? 0 : zoomY ?? 0), LOG_MIN_SCALE), LOG_MAX_SCALE);

    this.scale = Math.pow(2, this.logScale);
    this.scaleY = Math.pow(2, this.logScaleY);

    this.processZoom({manualZoom: true});
  }

  /**
   * Sets zoom to specific value
   * @param scale
   */
  setZoom(scale: number | {x?: number, y?: number}){
    const scaleX = finiteZoom(typeof scale === 'object' && scale !== null ? scale.x : scale);
    const scaleY = finiteZoom(typeof scale === 'object' && scale !== null ? scale.y : scale);

    if (scaleX === undefined && scaleY === undefined) {
      return;
    }

    const effectiveX = finiteZoom(this.effectiveZoom?.x) ?? 1;
    const effectiveY = finiteZoom(this.effectiveZoom?.y) ?? 1;
    this.scale = Math.min(Math.max(scaleX ?? effectiveX, MIN_SCALE), MAX_SCALE);
    this.scaleY = Math.min(Math.max(scaleY ?? effectiveY, MIN_SCALE), MAX_SCALE);

    this.processZoom({manualZoom: true});
  }

  processZoom(flags?: {manualZoom?: boolean}) {
    this.conf.resizer?.toFixedAr(flags);
    this.conf.resizer?.applyScaling({xFactor: this.scale, yFactor: this.scaleY}, {noAnnounce: true});
  }
}

export default Zoom;
