import AspectRatioType from '../../../common/enums/AspectRatioType.enum';
import VideoData from '../video-data/VideoData';
import { Ar, ArVariant } from '../../../common/interfaces/ArInterface';
import { ComponentLogger } from '../logging/ComponentLogger';


export enum CropStrategy {
  /**
   * Nomenclature explained:
   *
   * SP - stream AR < player AR
   * PS - the opposite of ↑
   *
   * ArDominant - given aspect ratio is bigger than stream AR and player AR
   * PSDominant - stream AR or player AR are bigger than given aspect ratio
   */
  CropLetterbox = 1,
  NoCropPillarbox = 2,
  NoCropLetterbox = 3,
  CropPillarbox = 4
}

export type VideoDimensions = {
  xFactor?: number;
  yFactor?: number;
  cropStrategy?: number;
  arCorrectionFactor?: number;
  styleHeightCompensationFactor?: number;
  actualWidth?: number;
  actualHeight?: number;
  relativeCropLimits?: {
    top: number;
    left: number;
  },
  preventAlignment?: {
    x: boolean,
    y: boolean
  }
}

// does video size calculations for zooming/cropping


class Scaler {
  //#region helper objects
  conf: VideoData;
  logger: ComponentLogger;
  //#endregion

  // functions
  constructor(videoData) {
    this.conf = videoData;
    this.logger = new ComponentLogger(videoData.logAggregator, 'Scaler', {});
  }


  // handles "legacy" options, such as 'fit to width', 'fit to height' and AspectRatioType.Reset. No zoom tho
  modeToAr (ar) {
    if (ar.type !== AspectRatioType.FitWidth && ar.type !== AspectRatioType.FitHeight && ar.ratio) {
      return ar.ratio;
    }

    let ratioOut;

    if (!this.conf.video) {
      this.logger.error('modeToAr', "No video??",this.conf.video, "killing videoData");
      this.conf.destroy();
      return null;
    }


    if (!this.conf.player.dimensions) {
      ratioOut = screen.width / screen.height;
    } else {
      ratioOut = this.conf.player.dimensions.width / this.conf.player.dimensions.height;
    }

    // IMPORTANT NOTE: lastAr needs to be set after _res_setAr() is called, as _res_setAr() assumes we're
    // setting a static aspect ratio (even if the function is called from here or ArDetect).

    let fileAr = this.conf.video.videoWidth / this.conf.video.videoHeight;

    if (ar.type === AspectRatioType.FitWidth) {
      ratioOut > fileAr ? ratioOut : fileAr
      ar.ratio = ratioOut;
      return ratioOut;
    }
    else if (ar.type === AspectRatioType.FitHeight) {
      ratioOut < fileAr ? ratioOut : fileAr
      ar.ratio = ratioOut;
      return ratioOut;
    }
    else if (ar.type === AspectRatioType.Reset) {
      this.logger.info('modeToAr', "Using original aspect ratio -", fileAr)
      ar.ar = fileAr;
      return fileAr;
    }

    return null;
  }

  calculateCrop(ar: Ar): VideoDimensions | {error: string, [x: string]: any} {
    /**
     * STEP 1: NORMALIZE ASPECT RATIO
     *
     * Video width is normalized based on 100% of the parent. That means if the player AR
     * is narrower than video ar, we need to pre-downscale the video. This scaling already
     * undoes any zoom that style="height:123%" on the video element adds.
     *
     * There are few exceptions and additional caveats:
     *   * AspectRatioType.FitHeight: we don't want to pre-downscale the video at all, as things
     *     will be scaled to fit height as-is.
     *   * When player is wider than stream, we want to undo any height compensations site
     *     tacks on the video tag.
     *
     * Quick notes:
     *   * when I say 'video AR', I actually mean aspect ratio after we've compensated for
     *     any possible 'height:' stuffs in the style attribute of the video tag
     *   * because video width is normalized on 100% of the parent, we don't need to correct
     *     anything when the player is wider than the video.
     */
    const streamAr = this.conf.aspectRatio;
    const playerAr = this.conf.player.aspectRatio;
    const heightCompensationFactor = this.conf.getHeightCompensationFactor();
    const compensatedStreamAr = streamAr * heightCompensationFactor;

    let arCorrectionFactor = 1;

    if (ar.type !== AspectRatioType.FitHeight) {
      if (playerAr < compensatedStreamAr) {
        arCorrectionFactor = this.conf.player.dimensions.width / this.conf.video.offsetWidth;
      } else if (ar.type !== AspectRatioType.Reset) {
        arCorrectionFactor /= heightCompensationFactor;
      }
    }

    if(!this.conf.video){
      this.logger.info('calculateCrop', "ERROR — no video detected. Conf:", this.conf, "video:", this.conf.video, "video dimensions:", this.conf.video && this.conf.video.videoWidth, '×', this.conf.video && this.conf.video.videoHeight);

      this.conf.destroy();
      return {error: "no_video"};
    }
    if (this.conf.video.videoWidth == 0 || this.conf.video.videoHeight == 0) {
      // that's illegal, but not illegal enough to just blast our shit to high hell
      // mr officer will let you go with a warning this time around
      this.logger.error('calculateCrop', "Video has illegal dimensions. Video dimensions:", this.conf.video && this.conf.video.videoWidth, '×', this.conf.video && this.conf.video.videoHeight);

      return {error: "illegal_video_dimensions"};
    }

    if (ar.type === AspectRatioType.Reset){
      return {
        xFactor: arCorrectionFactor,
        yFactor: arCorrectionFactor,
        arCorrectionFactor: arCorrectionFactor,

        relativeCropLimits: {
          top: 0,
          left: 0,
        }
      };
    }

    // handle fuckie-wuckies
    if (!ar.ratio){
      this.logger.error('calculateCrop', "no ar?", ar.ratio, " -- we were given this mode:", ar);
      return {error: "no_ar", ratio: ar.ratio};
    }

    this.logger.info('calculateCrop', "trying to set ar. args are: ar->",ar.ratio,"; this.conf.player.dimensions->",this.conf.player.dimensions.width, "×", this.conf.player.dimensions.height, "| obj:", this.conf.player.dimensions);

    // If we encounter invalid players, we try to update its dimensions
    // ONCE before throwing an error
    if( (! this.conf.player.dimensions) || this.conf.player.dimensions.width === 0 || this.conf.player.dimensions.height === 0 ){
      this.logger.error('calculateCrop', "ERROR — no (or invalid) this.conf.player.dimensions:",this.conf.player.dimensions);
      (this.conf.player as any)._requestTick(true);

      if( (! this.conf.player.dimensions) || this.conf.player.dimensions.width === 0 || this.conf.player.dimensions.height === 0 ){
        return {error: "this.conf.player.dimensions_error"};
      }
    }

    // we can finally start computing required video dimensions now:

    // Actual aspect ratio of the file/<video> tag

    if (ar.type === AspectRatioType.Initial || !ar.ratio) {
      ar.ratio = streamAr;
    }


    this.logger.info('calculateCrop', "ar is " ,ar.ratio, ", file ar is", streamAr, ",ar variant", ar.variant ,"\nthis.conf.player.dimensions are ", this.conf.player.dimensions.width, "×", this.conf.player.dimensions.height, "| obj:", this.conf.player.dimensions, this.conf.player.element);

    const videoDimensions: VideoDimensions = {
      xFactor: 1,
      yFactor: 1,
      actualWidth: 0,   // width of the video (excluding pillarbox) when <video> tag height is equal to width
      actualHeight: 0,  // height of the video (excluding letterbox) when <video> tag height is equal to height
      arCorrectionFactor: arCorrectionFactor,
      styleHeightCompensationFactor: heightCompensationFactor,
      relativeCropLimits: {
        top: 0,
        left: 0
      }
    }

    this.calculateCropCore(videoDimensions, ar.ratio, streamAr, playerAr, ar.variant)

    return videoDimensions;
  }


  /**
   * Calculates crop factors, such that the video fits within the player element.
   * This mode preserves black bars, if removing black bars would cause video to be cropped.
   * @param videoDimensions
   * @param ar
   * @param streamAr
   * @param playerAr
   * @param variant
   */
  private calculateFitContain(videoDimensions: VideoDimensions, ar: number, streamAr: number, playerAr: number) {
    if (streamAr < playerAr) {  // video file is narrower than the player — default scenario on ultrawide
      if (streamAr < ar){
        // in this situation we have to crop letterbox on top/bottom of the player
        // we cut it, but never more than the player
        videoDimensions.xFactor = Math.min(ar, playerAr) / streamAr;
        videoDimensions.yFactor = videoDimensions.xFactor;
        videoDimensions.cropStrategy = CropStrategy.CropLetterbox;
      } else {
        // in this situation, we would be cutting pillarbox. Inside horizontal player.
        // I don't think so. Except exceptions, we'll wait for bug reports.
        videoDimensions.xFactor = 1;
        videoDimensions.yFactor = 1;
        videoDimensions.cropStrategy = CropStrategy.NoCropPillarbox;
      }
    } else { // Video file is wider than the player
      // video is narrower than the aspect ratio, which implies letterbox ??
      if (streamAr < ar){
        // in this situation, we need to add extra letterbox on top of our letterbox
        // this means we simply don't crop anything _at all_
        videoDimensions.xFactor = 1;
        videoDimensions.yFactor = 1;
        videoDimensions.cropStrategy = CropStrategy.NoCropLetterbox;
      } else {
        videoDimensions.xFactor = streamAr / Math.max(ar, playerAr);
        videoDimensions.yFactor = videoDimensions.xFactor;
        videoDimensions.cropStrategy = CropStrategy.CropPillarbox;
      }
    }
  }

  /**
   * Calculates crop factors, such that the video covers the player element completely.
   * This mode ensures no black bars are visible, even if it means cropping parts of the video.
   * @param videoDimensions
   * @param ar
   * @param streamAr
   * @param playerAr
   * @param variant
   */
  private calculateFitCover(videoDimensions: VideoDimensions, ar: number, streamAr: number, playerAr: number) {
    if (streamAr < playerAr) { // Video file is narrower than the player — NATIVE PILLARBOX
      if (streamAr < ar){
        // in this situation we have to crop letterbox on top/bottom of the player
        // we cut it, but never more than the player
        videoDimensions.xFactor = Math.max(ar, playerAr) / streamAr;
        videoDimensions.yFactor = videoDimensions.xFactor;
        videoDimensions.cropStrategy = CropStrategy.CropLetterbox;
      } else {
        videoDimensions.xFactor = Math.max(streamAr, playerAr) / ar;
        videoDimensions.yFactor = videoDimensions.xFactor;
        videoDimensions.cropStrategy = CropStrategy.CropPillarbox;
      }
    } else { // Video file is wider than the player — NATIVE LETTERBOX
      if (streamAr < ar){   // Video is narrower than AR — STREAM LETTERBOX
        // in this situation, we need to add extra letterbox on top of our letterbox
        // this means we simply don't crop anything _at all_
        videoDimensions.xFactor = Math.max(ar, playerAr) / streamAr;
        videoDimensions.yFactor = videoDimensions.xFactor;
        videoDimensions.cropStrategy = CropStrategy.CropLetterbox;
      } else {  // Video is wider than AR — STREAM PILLARBOX
        videoDimensions.xFactor = streamAr / Math.min(ar, playerAr);
        videoDimensions.yFactor = videoDimensions.xFactor;
        videoDimensions.cropStrategy = CropStrategy.CropPillarbox;
      }
    }
  }

  /**
   * The act of calculating aspect ratio is separated due to reuse elsewhere in the extension.
   * We are doing that to avoid surprise recursions.
   * @param {*} videoDimensions
   * @param {*} ar
   * @param {*} streamAr
   * @param {*} playerAr
   */
  calculateCropCore(videoDimensions: VideoDimensions, ar: number, streamAr: number, playerAr: number, variant?: ArVariant) {
    /**
     * We could "optimize" this by not repeating code between two functions, but trying to keep in mind what numbers mean
     * and how they relate to each-other is causing too many headaches. Present-day LLMs can't figure out what's going on,
     * either (yes, I did try using them for debugging why crop wasn't cropping in pillarbox or zoom mode)
     */
    if (variant === ArVariant.Zoom) {
      this.calculateFitCover(videoDimensions, ar, streamAr, playerAr);
    } else {
      this.calculateFitContain(videoDimensions, ar, streamAr, playerAr);
    }

    // correct the scale factor
    if (videoDimensions.arCorrectionFactor) {
      videoDimensions.xFactor! *= videoDimensions.arCorrectionFactor;
      videoDimensions.yFactor! *= videoDimensions.arCorrectionFactor;
    }

    // Add crop limits — needed for vertical alignment in order to
    const letterboxRatio = (1 - (playerAr / ar));

    videoDimensions.relativeCropLimits = {
      top:  ar > streamAr ? ( ar >= playerAr ? (letterboxRatio * -0.5) : 0) : 0,
      left: ar < streamAr ? ( ar <= playerAr ? (-0.5 / letterboxRatio) : 0) : 0,
    }
    videoDimensions.preventAlignment = {
      x: ar > playerAr, // video is wider than player, so it's full width already
      y: ar < playerAr, // video is narrower than player, so it's full height already
    }

    return videoDimensions;
  }
}

export default Scaler;
