import Debug from '../../conf/Debug';

class GuardLine {
  
  // ardConf — reference to ArDetector that has current GuardLine instance
  constructor(ardConf){
    this.blackbar = {top: undefined, bottom: undefined};
    this.imageBar = {top: undefined, bottom: undefined};
    
    this.conf = ardConf;
    this.settings = ardConf.settings;
  }

  reset() {
    this.blackbar = {top: undefined, bottom: undefined};
    this.imageBar = {top: undefined, bottom: undefined};
  }

  setBlackbarManual(blackbarConf, imagebarConf){
    // ni lepo uporabljat tega, ampak pri fallback mode nastavljamo blackbar stuff na roke
    // it's not nice to use this, but we're setting these values manually in fallbackMode
    if (blackbarConf) {
      this.blackbar = blackbarConf;
    }
    if (imagebarConf) {
      this.imageBar = imagebarConf;
    }
  }

  setBlackbar(bbconf){
    var bbTop = bbconf.top - this.settings.activeaard.guardLine.edgeTolerancePx;
    var bbBottom = bbconf.bottom + this.settings.activeaard.guardLine.edgeTolerancePx;

    // to odstrani vse neveljavne nastavitve in vse možnosti, ki niso smiselne
    // this removes any configs with invalid values or values that dont make sense
    if (bbTop < 0 || bbBottom >= this.conf.canvas.height ){
      throw {error: "INVALID_SETTINGS_IN_GUARDLINE", bbTop, bbBottom}
    }

    this.blackbar = {
      top: bbTop,
      bottom: bbBottom
    }

    this.imageBar = {
      top: bbconf.top + 1 + this.settings.activeaard.guardLine.edgeTolerancePx,
      bottom: bbconf.bottom - 1 - this.settings.activeaard.guardLine.edgeTolerancePx
    }
  }

  check(image, fallbackMode){
    // izračunaj enkrat in shrani na objekt
    // calculate once and save object-instance-wide
    this.blackbarThreshold = this.conf.blackLevel + this.settings.activeaard.blackbar.threshold;
    this.imageThreshold = this.blackbarThreshold + this.settings.activeaard.blackbar.imageThreshold;

    // dejansko testiranje
    // actual checks
    var guardLineResult = this.guardLineCheck(image, fallbackMode);

    // Zaznali smo kršitev črnega dela, zato nam ni treba preveriti, ali je slika
    // prisotna. Vemo namreč, da se je razmerje stranic zmanjšalo.
    //
    // blackbar violation detected. We don't even need to check for presence of image
    // as aspect ratio just decreased
    if(! guardLineResult.success) {
      return {
        blackbarFail: true,
        offenders: guardLineResult.offenders,
        imageFail: false
      }
    }

    var imageCheckResult = this.imageCheck(image, fallbackMode);

    return {
      blackbarFail: false,
      imageFail: ! imageCheckResult.success
    }
  }

  
  // don't use methods below this line outside this class
  guardLineCheck(image, fallbackMode){
    // this test tests for whether we crop too aggressively
    
    // if this test is passed, then aspect ratio probably didn't change from wider to narrower. However, further
    // checks are needed to determine whether aspect ratio got wider.
    // if this test fails, it returns a list of offending points.
    
    // if the upper edge is null, then edge hasn't been detected before. This test is pointless, therefore it
    // should succeed by default. Also need to check bottom, for cases where only one edge is known
    
    if(! fallbackMode && (! this.blackbar.top || ! this.blackbar.bottom)) {
      return { success: true };
    }

    var offset = parseInt(this.conf.canvas.width * this.settings.activeaard.guardLine.ignoreEdgeMargin) << 2;
    
    var offenders = [];
    var offenderCount = -1; // doing it this way means first offender has offenderCount==0. Ez index.
    
    // TODO: implement logo check.
    
    // preglejmo obe vrstici
    // check both rows
    
    if(! fallbackMode){
      var edge_upper = this.blackbar.top;
      var edge_lower = this.blackbar.bottom;
    }
    else{
      // fallback mode is a bit different
      edge_upper = 0;
      edge_lower = this.conf.canvas.height - 1;
    }
    
    var rowStart, rowEnd;
    
    // <<<=======| checking upper row |========>>>
    
    rowStart = ((edge_upper * this.conf.canvas.width) << 2) + offset;
    rowEnd = rowStart + ( this.conf.canvas.width << 2 ) - (offset * 2);
    
    if (Debug.debugCanvas.enabled && Debug.debugCanvas.guardLine) {
      offenderCount = this._gl_debugRowCheck(image, rowStart, rowEnd, offenders, offenderCount);
    } else {
      offenderCount = this._gl_rowCheck(image, rowStart, rowEnd, offenders, offenderCount);    
    }
    // <<<=======| checking lower row |========>>>
    
    rowStart = ((edge_lower * this.conf.canvas.width) << 2) + offset;
    rowEnd = rowStart + ( this.conf.canvas.width << 2 ) - (offset * 2);
    
    if (Debug.debugCanvas.enabled && Debug.debugCanvas.guardLine) {
      offenderCount = this._gl_debugRowCheck(image, rowStart, rowEnd, offenders, offenderCount);
    } else {
      offenderCount = this._gl_rowCheck(image, rowStart, rowEnd, offenders, offenderCount);    
    }
    
    // če nismo našli nobenih prekrškarjev, vrnemo uspeh. Drugače vrnemo seznam prekrškarjev
    // vrnemo tabelo, ki vsebuje sredinsko točko vsakega prekrškarja (x + width*0.5)
    //
    // if we haven't found any offenders, we return success. Else we return list of offenders
    // we return array of middle points of offenders (x + (width * 0.5) for every offender)
    
    if(offenderCount == -1){
      return {success: true};
    }
    
    var ret = new Array(offenders.length);
    for(var o in offenders){
      ret[o] = offenders[o].x + (offenders[o].width * 0.25);
    }
    
    return {success: false, offenders: ret};
  }

  imageCheck(image){  
    if(!this.imageBar.top || !this.imageBar.bottom)
      return { success: false };
        
    var offset = (this.conf.canvas.width * this.settings.activeaard.guardLine.ignoreEdgeMargin) << 2;
      
    // TODO: implement logo check.
    
    
    // preglejmo obe vrstici - tukaj po pravilih ne bi smeli iti prek mej platna. ne rabimo preverjati
    // check both rows - by the rules and definitions, we shouldn't go out of bounds here. no need to check, then
    
    //   if(fallbackMode){
    //     var edge_upper = this.settings.activeaard.fallbackMode.noTriggerZonePx;
    //     var edge_lower = this.conf.canvas.height - this.settings.activeaard.fallbackMode.noTriggerZonePx - 1;
    //   }
    //   else{
        var edge_upper = this.imageBar.top;
        var edge_lower = this.imageBar.bottom;
    //   }
    
    // koliko pikslov rabimo zaznati, da je ta funkcija uspe. Tu dovoljujemo tudi, da so vsi piksli na enem
    // robu (eden izmed robov je lahko v celoti črn)
    // how many non-black pixels we need to consider this check a success. We only need to detect enough pixels
    // on one edge (one of the edges can be black as long as both aren't)
    var successThreshold = (this.conf.canvas.width * this.settings.activeaard.guardLine.imageTestThreshold);
    var rowStart, rowEnd;
    
    
    // <<<=======| checking upper row |========>>>
    
    rowStart = ((edge_upper * this.conf.canvas.width) << 2) + offset;
    rowEnd = rowStart + ( this.conf.canvas.width << 2 ) - (offset * 2);
    
    var res = false;
    
    if(Debug.debugCanvas.enabled && Debug.debugCanvas.guardLine){
      res = this._ti_debugCheckRow(image, rowStart, rowEnd, successThreshold);
    } else {
      res = this._ti_checkRow(image, rowStart, rowEnd,successThreshold);
    }
    
    if(res)
      return {success: true};
    
    
    // <<<=======| checking lower row |========>>>
    
    rowStart = ((edge_lower * this.conf.canvas.width) << 2) + offset;
    // rowEnd = rowStart + ( this.conf.canvas.width << 2 ) - (offset * 2);
    

    if(Debug.debugCanvas.enabled && Debug.debugCanvas.guardLine){
      res = this._ti_debugCheckRow(image, rowStart, rowEnd, successThreshold);
    } else {
      res = this._ti_checkRow(image, rowStart, rowEnd,successThreshold);
    }
    
    return {success: res};
  }

  // pomožne metode
  // helper methods


  _gl_rowCheck(image, rowStart, rowEnd, offenders, offenderCount){
    var firstOffender = -1;
    for(var i = rowStart; i < rowEnd; i+=4){
      
      // we track sections that go over what's supposed to be a black line, so we can suggest more 
      // columns to sample
      if(image[i] > this.blackbarThreshold || image[i+1] > this.blackbarThreshold || image[i+2] > this.blackbarThreshold){
        if(firstOffender < 0){
          firstOffender = (i - rowStart) >> 2;
          offenderCount++;
          offenders.push({x: firstOffender, width: 1});
        }
        else{
          offenders[offenderCount].width++
        }
      }
      else{
        // is that a black pixel again? Let's reset the 'first offender' 
        firstOffender = -1;
      }
    }
  
    return offenderCount;
  }

  _gl_debugRowCheck(image, rowStart, rowEnd, offenders, offenderCount){
    var firstOffender = -1;
    for(var i = rowStart; i < rowEnd; i+=4){
      
      // we track sections that go over what's supposed to be a black line, so we can suggest more 
      // columns to sample
      if(image[i] > this.blackbarThreshold || image[i+1] > this.blackbarThreshold || image[i+2] > this.blackbarThreshold){
        this.conf.debugCanvas.trace(i, DebugCanvasClasses.VIOLATION);      
        if(firstOffender < 0){
          firstOffender = (i - rowStart) >> 2;
          offenderCount++;
          offenders.push({x: firstOffender, width: 1});
        }
        else{
          offenders[offenderCount].width++
        }
      }
      else{
        this.conf.debugCanvas.trace(i, DebugCanvasClasses.GUARDLINE_BLACKBAR);              
        // is that a black pixel again? Let's reset the 'first offender' 
        firstOffender = -1;
      }
      
    }
  
    return offenderCount;
  }

  _ti_checkRow(image, rowStart, rowEnd, successThreshold) {
    for(var i = rowStart; i < rowEnd; i+=4){
      if(image[i] > this.imageThreshold || image[i+1] > this.imageThreshold || image[i+2] > this.imageThreshold){
        if(successThreshold --<= 0){
          return true;
        }
      }    
    }
  
    return false;
  }

  _ti_debugCheckRow(image, rowStart, rowEnd, successThreshold) {
    for(var i = rowStart; i < rowEnd; i+=4){
      if(image[i] > this.imageThreshold || image[i+1] > this.imageThreshold || image[i+2] > this.imageThreshold){
        this.conf.debugCanvas.trace(i, DebugCanvasClasses.GUARDLINE_IMAGE);
        if(successThreshold --<= 0){
          return true;
        }
      } else {
        this.conf.debugCanvas.trace(i, DebugCanvasClasses.WARN);
      }   
    }
  
    return false;
  }
}

export default GuardLine;
