// računa velikost videa za približevanje/oddaljevanje
// does video size calculations for zooming/cropping


class Scaler {
  // internal variables

  // functions
  constructor(videoData) {
    this.conf = videoData;
  }

  modeToAr(mode){
    // Skrbi za "stare" možnosti, kot na primer "na širino zaslona", "na višino zaslona" in "ponastavi". 
    // Približevanje opuščeno.
    // handles "legacy" options, such as 'fit to widht', 'fit to height' and 'reset'. No zoom tho
    var ar;

    if (!this.conf.video) {
      if(Debug.debug){
        console.log("[Scaler.js::modeToAr] No video??",this.conf.video, "killing videoData");
      }
      this.conf.destroy();
      return null;
    }

    
    if(! this.conf.player.dimensions ){
      ar = screen.width / screen.height;
    }
    else {
      ar = this.conf.player.dimensions.width / this.conf.player.dimensions.height;
    }
    
    // POMEMBNO: lastAr je potrebno nastaviti šele po tem, ko kličemo _res_setAr(). _res_setAr() predvideva,
    // da želimo nastaviti statično (type: 'static') razmerje stranic — tudi, če funkcijo kličemo tu oz. v ArDetect.
    //
    // IMPORTANT NOTE: lastAr needs to be set after _res_setAr() is called, as _res_setAr() assumes we're
    // setting a static aspect ratio (even if the function is called from here or ArDetect). 
    
    var fileAr = this.conf.video.videoWidth / this.conf.video.videoHeight;
      
    if (mode == "fitw"){
      return ar > fileAr ? ar : fileAr;
    }
    else if(mode == "fith"){
      return ar < fileAr ? ar : fileAr;
    }
    else if(mode == "reset"){
      if(Debug.debug){
        console.log("[Scaler.js::modeToAr] Using original aspect ratio -", fileAr)
      }

      return fileAr;
    }

    return null;
  }

  calculateCrop(mode) {
    
  
    if(!this.conf.video || this.conf.video.videoWidth == 0 || this.conf.video.videoHeight == 0){
      if(Debug.debug)
        console.log("[Scaler::calculateCrop] ERROR — no video detected.");
      
      this.conf.destroy();
      return {error: "no_video"};
    }


    // če je 'ar' string, potem bomo z njim opravili v legacy wrapperju. Seveda obstaja izjema
    // if 'ar' is string, we'll handle that in legacy wrapper, with one exception

    if(mode === 'reset'){
      return {xFactor: 1, yFactor: 1}
    }


    var ar = 0;
    if(isNaN(mode)){
      ar = this.modeToAr(mode);
    } else {
      ar = mode;
    }

    // handle fuckie-wuckies
    if (! ar){
      if(Debug.debug)
        console.log("[Scaler::calculateCrop] no ar?", ar, " -- we were given this mode:", mode);
      return {error: "no_ar", ar: ar};
    }

    if(Debug.debug)
      console.log("[Scaler::calculateCrop] trying to set ar. args are: ar->",ar,"; this.conf.player.dimensions->",this.conf.player.dimensions.width, "×", this.conf.player.dimensions.height, "| obj:", this.conf.player.dimensions);

    if( (! this.conf.player.dimensions) || this.conf.player.dimensions.width === 0 || this.conf.player.dimensions.height === 0 ){
      if(Debug.debug)
        console.log("[Scaler::calculateCrop] ERROR — no (or invalid) this.conf.player.dimensions:",this.conf.player.dimensions);
      return {error: "this.conf.player.dimensions_error"};
    }

    // zdaj lahko končno začnemo računati novo velikost videa
    // we can finally start computing required video dimensions now:


    // Dejansko razmerje stranic datoteke/<video> značke
    // Actual aspect ratio of the file/<video> tag
    var fileAr = this.conf.video.videoWidth / this.conf.video.videoHeight;
    var playerAr = this.conf.player.dimensions.width / this.conf.player.dimensions.height;

    if(mode == "default" || !ar)
      ar = fileAr;

  
    if(Debug.debug)
      console.log("[Scaler::calculateCrop] ar is " ,ar, ", file ar is", fileAr, ", this.conf.player.dimensions are ", this.conf.player.dimensions.width, "×", this.conf.player.dimensions.height, "| obj:", this.conf.player.dimensions);
    
    var videoDimensions = {
      xFactor: 1,
      yFactor: 1,
      actualWidth: 0,   // width of the video (excluding pillarbox) when <video> tag height is equal to width
      actualHeight: 0,  // height of the video (excluding letterbox) when <video> tag height is equal to height
    }
  
    // if(Debug.debug){
    //   console.log("[Scaler::calculateCrop] Player dimensions?", this.conf.player.dimensions.width, "×", this.conf.player.dimensions.height, "| obj:", this.conf.player.dimensions);
    // }
  
    if( fileAr < ar ){
      // imamo letterbox zgoraj in spodaj -> spremenimo velikost videa (a nikoli širše od ekrana)
      // letterbox -> change video size (but never to wider than monitor width)

        videoDimensions.xFactor = Math.min(ar, playerAr) / fileAr;
        videoDimensions.yFactor = videoDimensions.xFactor;
    }
    else {
        videoDimensions.xFactor = fileAr / Math.min(ar, playerAr);
        videoDimensions.yFactor = videoDimensions.xFactor;
    }
    
    if(Debug.debug){
      console.log("[Scaler::calculateCrop] Crop factor calculated — ", videoDimensions.xFactor);
    }

    return videoDimensions;
  }
}