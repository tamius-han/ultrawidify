import Debug from '../../conf/Debug';
import AspectRatio from '../../../common/enums/aspect-ratio.enum';

// računa velikost videa za približevanje/oddaljevanje
// does video size calculations for zooming/cropping


class Scaler {
  // internal variables

  // functions
  constructor(videoData) {
    this.conf = videoData;
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
      if(Debug.debug){
        console.log("[Scaler.js::modeToAr] No video??",this.conf.video, "killing videoData");
      }
      this.conf.destroy();
      return null;
    }

    
    if(! this.conf.player.dimensions ){
      ratioOut = screen.width / screen.height;
    }
    else {
      ratioOut = this.conf.player.dimensions.width / this.conf.player.dimensions.height;
    }
    
    // POMEMBNO: lastAr je potrebno nastaviti šele po tem, ko kličemo _res_setAr(). _res_setAr() predvideva,
    // da želimo nastaviti statično (type: 'static') razmerje stranic — tudi, če funkcijo kličemo tu oz. v ArDetect.
    //
    // IMPORTANT NOTE: lastAr needs to be set after _res_setAr() is called, as _res_setAr() assumes we're
    // setting a static aspect ratio (even if the function is called from here or ArDetect). 
    
    var fileAr = this.conf.video.videoWidth / this.conf.video.videoHeight;
      
    if (ar.type === AspectRatio.FitWidth){
      ratioOut > fileAr ? ratioOut : fileAr
      ar.ratio = ratioOut;
      return ratioOut;
    }
    else if(ar.type === AspectRatio.FitHeight){
      ratioOut < fileAr ? ratioOut : fileAr
      ar.ratio = ratioOut;
      return ratioOut;
    }
    else if(ar.type === AspectRatio.Reset){
      if(Debug.debug){
        console.log("[Scaler.js::modeToAr] Using original aspect ratio -", fileAr)
      }
      ar.ar = fileAr;
      return fileAr;
    }

    return null;
  }

  calculateCrop(ar) {
    if(!this.conf.video){
      if (Debug.debug) {
        console.log("[Scaler::calculateCrop] ERROR — no video detected. Conf:", this.conf, "video:", this.conf.video, "video dimensions:", this.conf.video && this.conf.video.videoWidth, '×', this.conf.video && this.conf.video.videoHeight);
      }
      
      this.conf.destroy();
      return {error: "no_video"};
    }
    if (this.conf.video.videoWidth == 0 || this.conf.video.videoHeight == 0) {
      // that's illegal, but not illegal enough to just blast our shit to high hell
      // mr officer will let you go with a warning this time around
      if (Debug.debug) {
        console.log("[Scaler::calculateCrop] Video has illegal dimensions. Video dimensions:", this.conf.video && this.conf.video.videoWidth, '×', this.conf.video && this.conf.video.videoHeight);
      }

      return {error: "illegal_video_dimensions"};
    }

    if (ar.type === AspectRatio.Reset){
      return {xFactor: 1, yFactor: 1}
    }

    // handle fuckie-wuckies
    if (!ar.ratio){
      if (Debug.debug && Debug.scaler) {
        console.log("[Scaler::calculateCrop] no ar?", ar.ratio, " -- we were given this mode:", ar);
      }
      return {error: "no_ar", ratio: ar.ratio};
    }

    if (Debug.debug && Debug.scaler) {
      console.log("[Scaler::calculateCrop] trying to set ar. args are: ar->",ar.ratio,"; this.conf.player.dimensions->",this.conf.player.dimensions.width, "×", this.conf.player.dimensions.height, "| obj:", this.conf.player.dimensions);
    }

    if( (! this.conf.player.dimensions) || this.conf.player.dimensions.width === 0 || this.conf.player.dimensions.height === 0 ){
      if (Debug.debug && Debug.scaler) {
        console.log("[Scaler::calculateCrop] ERROR — no (or invalid) this.conf.player.dimensions:",this.conf.player.dimensions);
      }
      return {error: "this.conf.player.dimensions_error"};
    }

    // zdaj lahko končno začnemo računati novo velikost videa
    // we can finally start computing required video dimensions now:

    // Dejansko razmerje stranic datoteke/<video> značke
    // Actual aspect ratio of the file/<video> tag
    var fileAr = this.conf.video.videoWidth / this.conf.video.videoHeight;
    var playerAr = this.conf.player.dimensions.width / this.conf.player.dimensions.height;

    if (ar.type === AspectRatio.Initial || !ar.ratio) {
      ar.ratio = fileAr;
    }

  
    if (Debug.debug && Debug.scaler) {
      console.log("[Scaler::calculateCrop] ar is " ,ar.ratio, ", file ar is", fileAr, ", this.conf.player.dimensions are ", this.conf.player.dimensions.width, "×", this.conf.player.dimensions.height, "| obj:", this.conf.player.dimensions);
    }
    
    var videoDimensions = {
      xFactor: 1,
      yFactor: 1,
      actualWidth: 0,   // width of the video (excluding pillarbox) when <video> tag height is equal to width
      actualHeight: 0,  // height of the video (excluding letterbox) when <video> tag height is equal to height
    }
  
    // if(Debug.debug){
    //   console.log("[Scaler::calculateCrop] Player dimensions?", this.conf.player.dimensions.width, "×", this.conf.player.dimensions.height, "| obj:", this.conf.player.dimensions);
    // }
  
    if (fileAr < ar.ratio){
      // imamo letterbox zgoraj in spodaj -> spremenimo velikost videa (a nikoli širše od ekrana)
      // letterbox -> change video size (but never to wider than monitor width)
        // if (Debug.debug && Debug.scaler) {
        //   console.log(`%c[Scaler::calculateCrop] Trying to determine scaling factors. Aspect ratios:\n      file: ${fileAr.toFixed(3)}\n    player: ${playerAr.toFixed(3)}\n    target: ${ar.ratio.toFixed(3)}\n-----------------------`, "color: #2ba");
        // }
        videoDimensions.xFactor = Math.min(ar.ratio, playerAr) / fileAr;
        videoDimensions.yFactor = videoDimensions.xFactor;
    } else {
        videoDimensions.xFactor = fileAr / Math.min(ar.ratio, playerAr);
        videoDimensions.yFactor = videoDimensions.xFactor;
    }
    
    if (Debug.debug && Debug.scaler) {
      console.log("[Scaler::calculateCrop] Crop factor calculated — ", videoDimensions.xFactor);
    }

    return videoDimensions;
  }
}

export default Scaler;
