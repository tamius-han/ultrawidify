import Debug from '../../conf/Debug';
import AspectRatio from '../../../common/enums/aspect-ratio.enum';

// računa velikost videa za približevanje/oddaljevanje
// does video size calculations for zooming/cropping


class Scaler {
  // internal variables

  // functions
  constructor(videoData) {
    this.conf = videoData;
    this.logger = videoData.logger;
  }
  

  // Skrbi za "stare" možnosti, kot na primer "na širino zaslona", "na višino zaslona" in "ponastavi". 
  // Približevanje opuščeno.
  // handles "legacy" options, such as 'fit to widht', 'fit to height' and AspectRatio.Reset. No zoom tho
  modeToAr (ar) {
    if (ar.type !== AspectRatio.FitWidth && ar.type !== AspectRatio.FitHeight && ar.ratio) {
      return ar.ratio; 
    }

    var ratioOut;

    if (!this.conf.video) {
      this.logger.log('error', 'debug', "[Scaler.js::modeToAr] No video??",this.conf.video, "killing videoData");
      this.conf.destroy();
      return null;
    }

    
    if (!this.conf.player.dimensions) {
      ratioOut = screen.width / screen.height;
    } else {
      ratioOut = this.conf.player.dimensions.width / this.conf.player.dimensions.height;
    }
    
    // POMEMBNO: lastAr je potrebno nastaviti šele po tem, ko kličemo _res_setAr(). _res_setAr() predvideva,
    // da želimo nastaviti statično (type: 'static') razmerje stranic — tudi, če funkcijo kličemo tu oz. v ArDetect.
    //
    // IMPORTANT NOTE: lastAr needs to be set after _res_setAr() is called, as _res_setAr() assumes we're
    // setting a static aspect ratio (even if the function is called from here or ArDetect). 
    
    var fileAr = this.conf.video.videoWidth / this.conf.video.videoHeight;
      
    if (ar.type === AspectRatio.FitWidth) {
      ratioOut > fileAr ? ratioOut : fileAr
      ar.ratio = ratioOut;
      return ratioOut;
    }
    else if (ar.type === AspectRatio.FitHeight) {
      ratioOut < fileAr ? ratioOut : fileAr
      ar.ratio = ratioOut;
      return ratioOut;
    }
    else if (ar.type === AspectRatio.Reset) {
      this.logger.log('info', 'debug', "[Scaler.js::modeToAr] Using original aspect ratio -", fileAr)
      ar.ar = fileAr;
      return fileAr;
    }

    return null;
  }

  calculateCrop(ar) {
    /**
     * STEP 1: NORMALIZE ASPECT RATIO
     *
     * Video width is normalized based on 100% of the parent. That means if the player AR 
     * is narrower than video ar, we need to pre-downscale the video. This scaling already
     * undoes any zoom that style="height:123%" on the video element adds. 
     * 
     * There are few exceptions and additional caveatss:
     *   * AspectRatio.FitHeight: we don't want to pre-downscale the video at all, as things
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
    const streamAr = this.conf.video.videoWidth / this.conf.video.videoHeight;
    const playerAr = this.conf.player.dimensions.width / this.conf.player.dimensions.height;
    const heightCompensationFactor = this.conf.getHeightCompensationFactor();
    const compensatedStreamAr = streamAr * heightCompensationFactor;

    let arCorrectionFactor = 1;

    if (ar.type !== AspectRatio.FitHeight) {
      if (playerAr < compensatedStreamAr) {
        arCorrectionFactor = this.conf.player.dimensions.width / this.conf.video.offsetWidth;
      } else if (ar.type !== AspectRatio.Reset) {
        arCorrectionFactor /= heightCompensationFactor;
      }
    }

    if(!this.conf.video){
      this.logger.log('info', 'debug', "[Scaler::calculateCrop] ERROR — no video detected. Conf:", this.conf, "video:", this.conf.video, "video dimensions:", this.conf.video && this.conf.video.videoWidth, '×', this.conf.video && this.conf.video.videoHeight);
      
      this.conf.destroy();
      return {error: "no_video"};
    }
    if (this.conf.video.videoWidth == 0 || this.conf.video.videoHeight == 0) {
      // that's illegal, but not illegal enough to just blast our shit to high hell
      // mr officer will let you go with a warning this time around
      this.logger.log('error', 'debug', "[Scaler::calculateCrop] Video has illegal dimensions. Video dimensions:", this.conf.video && this.conf.video.videoWidth, '×', this.conf.video && this.conf.video.videoHeight);

      return {error: "illegal_video_dimensions"};
    }

    if (ar.type === AspectRatio.Reset){
      return {xFactor: arCorrectionFactor, yFactor: arCorrectionFactor}
    }

    // handle fuckie-wuckies
    if (!ar.ratio){
      this.logger.log('error', 'scaler', "[Scaler::calculateCrop] no ar?", ar.ratio, " -- we were given this mode:", ar);
      return {error: "no_ar", ratio: ar.ratio};
    }

    this.logger.log('info', 'scaler', "[Scaler::calculateCrop] trying to set ar. args are: ar->",ar.ratio,"; this.conf.player.dimensions->",this.conf.player.dimensions.width, "×", this.conf.player.dimensions.height, "| obj:", this.conf.player.dimensions);

    if( (! this.conf.player.dimensions) || this.conf.player.dimensions.width === 0 || this.conf.player.dimensions.height === 0 ){
      this.logger.log('error', 'scaler', "[Scaler::calculateCrop] ERROR — no (or invalid) this.conf.player.dimensions:",this.conf.player.dimensions);
      return {error: "this.conf.player.dimensions_error"};
    }

    // zdaj lahko končno začnemo računati novo velikost videa
    // we can finally start computing required video dimensions now:

    // Dejansko razmerje stranic datoteke/<video> značke
    // Actual aspect ratio of the file/<video> tag

    if (ar.type === AspectRatio.Initial || !ar.ratio) {
      ar.ratio = streamAr;
    }

  
    this.logger.log('info', 'scaler', "[Scaler::calculateCrop] ar is " ,ar.ratio, ", file ar is", streamAr, ", this.conf.player.dimensions are ", this.conf.player.dimensions.width, "×", this.conf.player.dimensions.height, "| obj:", this.conf.player.dimensions);
    
    var videoDimensions = {
      xFactor: 1,
      yFactor: 1,
      actualWidth: 0,   // width of the video (excluding pillarbox) when <video> tag height is equal to width
      actualHeight: 0,  // height of the video (excluding letterbox) when <video> tag height is equal to height
    }
  
    if (streamAr < playerAr) {
      if (streamAr < ar.ratio){
        // in this situation we have to crop letterbox on top/bottom of the player
        // we cut it, but never more than the player
        videoDimensions.xFactor = Math.min(ar.ratio, playerAr) / streamAr;
        videoDimensions.yFactor = videoDimensions.xFactor;
      } else {
        // in this situation, we would be cutting pillarbox. Inside horizontal player.
        // I don't think so. Except exceptions, we'll wait for bug reports.
        videoDimensions.xFactor = 1;
        videoDimensions.yFactor = 1;
      }
    } else {
      if (streamAr < ar.ratio || playerAr < ar.ratio){
        // in this situation, we need to add extra letterbox on top of our letterbox
        // this means we simply don't crop anything _at all_
        videoDimensions.xFactor = 1;
        videoDimensions.yFactor = 1;
      } else {
        // meant for handling pillarbox crop. not quite implemented.
        videoDimensions.xFactor = streamAr / Math.min(ar.ratio, playerAr);
        videoDimensions.yFactor = videoDimensions.xFactor;
        // videoDimensions.xFactor = Math.max(ar.ratio, playerAr) * fileAr;
        // videoDimensions.yFactor = videoDimensions.xFactor;
      }
    }
    
    this.logger.log('info', 'scaler', "[Scaler::calculateCrop] Crop factor calculated — ", videoDimensions.xFactor);

    // correct the factors
    videoDimensions.xFactor *= arCorrectionFactor;
    videoDimensions.yFactor *= arCorrectionFactor;

    return videoDimensions;
  }
}

export default Scaler;
