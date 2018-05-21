// računa velikost videa za približevanje/oddaljevanje
// does video size calculations for zooming/cropping


class Scaler {
  // internal variables

  // functions
  constructor(videoData) {
    this.conf = videoData;
  }

  modeToAr(mode, video, playerDimensions){
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

    
    if(! playerDimensions ){
      ar = screen.width / screen.height;
    }
    else {
      ar = playerDimensions.width / playerDimensions.height;
    }
    
    // POMEMBNO: GlobalVars.lastAr je potrebno nastaviti šele po tem, ko kličemo _res_setAr(). _res_setAr() predvideva,
    // da želimo nastaviti statično (type: 'static') razmerje stranic — tudi, če funkcijo kličemo tu oz. v ArDetect.
    //
    // IMPORTANT NOTE: GlobalVars.lastAr needs to be set after _res_setAr() is called, as _res_setAr() assumes we're
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

  calculateCrop(mode, video, playerDimensions) {

  
    if(!this.conf.video || this.conf.video.videoWidth == 0 || this.conf.video.videoHeight == 0){
      if(Debug.debug)
        console.log("[Scaler::calculateCrop] ERROR — no video detected.");
      
      this.conf.destroy();
      return {error: "no_video"};
    }


    // if 'ar' is string, we'll handle that in legacy wrapper
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
      console.log("[Scaler::calculateCrop] trying to set ar. args are: ar->",ar,"; playerDimensions->",playerDimensions.width, "×", playerDimensions.height, "| obj:", playerDimensions);

    if( (! playerDimensions) || playerDimensions.width === 0 || playerDimensions.height === 0 ){
      if(Debug.debug)
        console.log("[Scaler::calculateCrop] ERROR — no (or invalid) playerDimensions:",playerDimensions);
      return {error: "playerDimensions_error"};
    }

    // zdaj lahko končno začnemo računati novo velikost videa
    // we can finally start computing required video dimensions now:


    // Dejansko razmerje stranic datoteke/<video> značke
    // Actual aspect ratio of the file/<video> tag
    var fileAr = this.conf.video.videoWidth / this.conf.video.videoHeight;
    var playerAr = playerDimensions.width / playerDimensions.height;

    if(mode == "default" || !ar)
      ar = fileAr;

  
    if(Debug.debug)
      console.log("[Scaler::calculateCrop] ar is " ,ar, ", file ar is", fileAr, ", playerDimensions are ", playerDimensions.width, "×", playerDimensions.height, "| obj:", playerDimensions);
    
    var videoDimensions = {
      width: 0,
      height: 0,
      actualWidth: 0,   // width of the video (excluding pillarbox) when <video> tag height is equal to width
      actualHeight: 0,  // height of the video (excluding letterbox) when <video> tag height is equal to height
    }
  
    if(Debug.debug){
      console.log("[Scaler::calculateCrop] Player dimensions?", playerDimensions.width, "×", playerDimensions.height, "| obj:", playerDimensions);
    }
  
    if( fileAr < ar ){
      // imamo letterbox zgoraj in spodaj -> spremenimo velikost videa (a nikoli širše od ekrana)
      // letterbox -> change video size (but never to wider than monitor width)

        videoDimensions.width = Math.min(playerDimensions.height * ar, playerDimensions.width);
        videoDimensions.height = videoDimensions.width * (1/fileAr);
    }
    else{
        videoDimensions.height = Math.min(playerDimensions.width / ar, playerDimensions.height);
        videoDimensions.width = videoDimensions.height * fileAr;
    }
    
    // izračunamo, kako visok/širok je video (brez črnih obrob). Če se željeno razmerje stranic
    // ne ujema z razmerjem stranic predvajalnika, potem bomo še vedno videli črno obrobo bodisi
    // zgoraj in spodaj, bodisi levo in desno. Zato v videoDimensions vključimo tudi dejansko
    // velikost videa, da lahko Stretcher.js izračuna faktorje raztegovanja.
    // Če je razmerje stranic predvajalnika širše kot želeno razmerje stranic, potem bosta `height`
    // in `actualHeight` enaka, `actualWidth` pa bo izračunan na podlagi višine (in obratno).
    
    if (ar > playerAr){
      videoDimensions.actualHeight = videoDimensions.height;
      videoDimensions.actualWidth = videoDimensions.height * ar;
    } else {
      videoDimensions.actualWidth = videoDimensions.width;
      videoDimensions.actualHeight = videoDimensions.width / ar;
    }

    if(Debug.debug){
      console.log("[Scaler::calculateCrop] Video dimensions: ", videoDimensions.width, "×", videoDimensions.height, "(obj:", videoDimensions, "); playerDimensions:",playerDimensions.width, "×", playerDimensions.height, "(obj:", playerDimensions, ")");
    }

    return videoDimensions;
  }
}