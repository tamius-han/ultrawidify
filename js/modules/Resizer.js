if(Debug.debug)
  console.log("Loading: Resizer.js");



var StretchMode = {
  NO_STRETCH = 0,
  CONDITIONAL = 1,
  FULL = 2
}


class Resizer {
  
  constructor(videoData){
    this.conf = videoData;
    this.video = videoData.video;


    this.scaler = new Scaler();
    this.stretcher = new Stretcher(); 
    this.zoom = new Zoom();

    // load up default values
    this.stretch = {mode: ExtensionConf.stretch.initialMode};

    // restore watchdog. While true, applyCss() tries to re-apply new css until this value becomes false again
    // value becomes false when width and height of <video> tag match with what we want to set. Only necessary when
    // calling _res_restore() for some weird reason.
    this.restore_wd = false;
  }
  
  setAr(ar, lastAr){
    if(Debug.debug){
      console.log('[Resizer::setAr] trying to set ar. New ar:', ar)
    }

    if(lastAr) {
      this.lastAr = lastAr;
    } else {
      this.lastAr = {type: 'static', ar: ar};
    }

    if (! this.video) {
      console.log("No video detected.")
      this.videoData.destroy();
    }


    var dimensions = Scaler.calculateCrop(ar, this.video, this.conf.player.dimensions);
    var stretchFactors;

    // if we set stretching, we apply stretching
    if (this.stretch.mode == StretchMode.FULL){
      stretchFactors = Stretcher.calculateStretch(dimensions);
    } else if (this.stretch.mode == StretchMode.CONDITIONAL) {
      stretchFactors = Stretcher.conditionalStretch(dimensions, ExtensionConf.stretch.conditionalDifferencePercent);
    }

    zoom.applyZoom(dimensions);

  }


}



var _res_computeOffsets = function(vidDim, playerDim){

  if(Debug.debug)
    console.log("[Resizer::_res_computeOffsets] video will be aligned to ", ExtensionConf.miscFullscreenSettings.videoFloat);

  var offsets = {
    width: vidDim.width,
    height: vidDim.height,
    left: 0,
    top: ((playerDim.height - vidDim.height) / 2)
  }
  
  if( ExtensionConf.miscFullscreenSettings.videoFloat == "center" ){
    offsets.left = (playerDim.width - vidDim.width ) / 2;
    
  }
  else if( ExtensionConf.miscFullscreenSettings.videoFloat == "right" ){
    offsets.left = (playerDim.width - vidDim.width);
  }
  
  GlobalVars.correctedVideoDimensions.width = parseInt(offsets.width);
  GlobalVars.correctedVideoDimensions.height= parseInt(offsets.height);
  GlobalVars.correctedVideoDimensions.left = parseInt(offsets.left);
  GlobalVars.correctedVideoDimensions.top = parseInt(offsets.top);
  
  return offsets;
}

var _res_align = function(float){
  if(! float)
    float = ExtensionConf.miscFullscreenSettings.videoFloat;
  
  var dimensions = {left: 0};
  
  if(float == "left"){
    _res_applyCss(dimensions);
    return;
  }
  if(float == "center"){
//     dimensions.left = 
//     _res_applyCss(
  }
}

var _res_setStyleString_maxRetries = 3;

var _res_setStyleString = function(vid, styleString, count){
  vid.setAttribute("style", styleString);
  
  if(_res_restore_wd){
    var vid2 = GlobalVars.video;

    if(vid2 == undefined || vid2 == null){
      if(Debug.debug)
        console.log("[Resizer::_res_setStyleString] Video element went missing, nothing to do here.")
      return;
    }
    
    if(
      styleString.indexOf("width: " + vid2.style.width) == -1 ||
      styleString.indexOf("height: " + vid2.style.height) == -1) {
      // css ni nastavljen?
      // css not set?
      if(Debug.debug)
        console.log("[Resizer::_res_setStyleString] Style string not set ???");
      
      if(count++ < _res_setStyleString_maxRetries){
        setTimeout( _res_setStyleString, 200, count);
      }
      else if(Debug.debug){
        console.log("[Resizer::_res_setStyleString] we give up. css string won't be set");
      }
    }
    else{
      _res_restore_wd = false;
    }
  }
  else{
    if(Debug.debug)
      console.log("[Resizer::_res_setStyleString] css applied. Style string:", styleString);
  }
}

function _res_applyCss(dimensions){

  if(GlobalVars.video == undefined || GlobalVars.video == null){
    if(Debug.debug)
      console.log("[Resizer::_res_applyCss] Video went missing, doing nothing.");
    return;
  }
  
  if(Debug.debug)
    console.log("[Resizer::_res_applyCss] Starting to apply css. this is what we're getting in:", dimensions);
  
  if(dimensions.top !== undefined)
    dimensions.top = "top: " + Math.round(dimensions.top) + "px !important";
  
  if(dimensions.left !== undefined)
    dimensions.left = "left: " + Math.round(dimensions.left) + "px !important";
  
  if(dimensions.width !== undefined)
    dimensions.width = "width: " + Math.round(dimensions.width) + "px !important";
  
  if(dimensions.height !== undefined)
    dimensions.height = "height: " + Math.round(dimensions.height) + "px !important";
 
  // misc.
  dimensions.position = "position: absolute !important";
  dimensions.margin = "margin: 0px !important";
  
  // save values for left and top to GlobalVars
  GlobalVars.currentCss.top = dimensions.top;
  GlobalVars.currentCss.left = dimensions.left;
  
  var vid = GlobalVars.video;
  
  if(Debug.debug)
    console.log("[Resizer::_res_applyCss] trying to apply css. Css strings: ", dimensions, "video tag: ", vid);
  
  var styleArrayStr = vid.getAttribute('style');
  
  if (styleArrayStr !== null && styleArrayStr !== undefined){
    
    var styleArray = styleArrayStr.split(";");
    for(var i in styleArray){
      
      styleArray[i] = styleArray[i].trim();
      
      if (styleArray[i].startsWith("top:")){
        styleArray[i] = dimensions.top;
        delete dimensions.top;
      }
      else if(styleArray[i].startsWith("left:")){
        styleArray[i] = dimensions.left;
        delete dimensions.left;
      }
      else if(styleArray[i].startsWith("width:")){
        styleArray[i] = dimensions.width;
        delete dimensions.width;
      }
      else if(styleArray[i].startsWith("height:")){
        styleArray[i] = dimensions.height;
        delete dimensions.height;
      }
      else if(styleArray[i].startsWith("position:")){
        styleArray[i] = dimensions.position;
        delete dimensions.position;
      }
      else if(styleArray[i].startsWith("margin:")){
        styleArray[i] = dimensions.margin;
        delete dimensions.margin;
      }
    }
  }
  else{
    var styleArray = [];
  }
  
  // add remaining elements
  for(var key in dimensions)
    styleArray.push( dimensions[key] );
  
  

  // build style string back
  var styleString = "";
  for(var i in styleArray)
    if(styleArray[i] !== undefined && styleArray[i] !== "")
      styleString += styleArray[i] + "; ";
  
  _res_setStyleString(vid, styleString);
}

var _res_antiCssOverride = function(){
  
  // this means we haven't set our CSS yet, or that we changed video.
  if(GlobalVars.currentCss.top === null)
    return;
  
  // this means video went missing. 
  if(GlobalVars.video == undefined || GlobalVars.video == null)
    return;
  
  // // our current css is fucky? Null, undefined and 0 are invalid values.
  // if(! GlobalVars.currentCss.width || ! GlobalVars.currentCss.height )
  //   return;

  var styleArrayStr = GlobalVars.video.getAttribute('style');
  
  if (styleArrayStr !== null && styleArrayStr !== undefined){
    var styleArray = styleArrayStr.split(";");

    var stuffChecked = 0;
    var stuffToCheck = 2;
    
    for(var i in styleArray){
      styleArray[i] = styleArray[i].trim();
      
      if (styleArray[i].startsWith("top:")){
        // don't force css restore if currentCss.top is not defined
        if(GlobalVars.currentCss.top && styleArray[i] != GlobalVars.currentCss.top){
          if(Debug.debug){
            console.log("[Resizer::_res_antiCssOverride] SOMEBODY TOUCHED MA SPAGHETT (our CSS got overriden, restoring our css)");
            console.log("[Resizer::_res_antiCssOverride] MA SPAGHETT: top:", GlobalVars.currentCss.top, "left:", GlobalVars.currentCss.left, "thing that touched ma spaghett", styleArrayStr);
          }
          _res_restore();
          return;
        }
        stuffChecked++;
      }
      else if(styleArray[i].startsWith("left:")){
        // don't force css restore if currentCss.left is not defined        
        if(GlobalVars.currentCss.left && styleArray[i] != GlobalVars.currentCss.left){
          if(Debug.debug){
            console.log("[Resizer::_res_antiCssOverride] SOMEBODY TOUCHED MA SPAGHETT (our CSS got overriden, restoring our css)");
            console.log("[Resizer::_res_antiCssOverride] MA SPAGHETT: width:", GlobalVars.currentCss.width, "height:", GlobalVars.currentCss.height, "thing that touched ma spaghett", styleArrayStr);            
          }
          _res_restore();
          return;
        }
        stuffChecked++;
      }
      
      if(stuffChecked == stuffToCheck){
  //         if(Debug.debug){
  //           console.log("[Resizer::_res_antiCssOverride] My spaghett rests untouched. (nobody overrode our CSS, doing nothing)");
  //         }
        return;
      }
    }
  }
}

var _res_restore = function(){
  if(! GlobalVars.video)
    return false;
  
  if(Debug.debug){
    console.log("[Resizer::_res_restore] attempting to restore aspect ratio. this & settings:", {'this': this, "settings": Settings} );
  }
  
  // this is true until we verify that css has actually been applied
  _res_restore_wd = true;
  
  if(GlobalVars.lastAr.type == "legacy"){
    _res_legacyAr(GlobalVars.lastAr.action);
  }
  else if(GlobalVars.lastAr.type == "static"){
    _res_setAr(GlobalVars.lastAr.ar);
  }
  else if(GlobalVars.lastAr.type == "original"){
    _res_legacyAr("reset");
  }
  else if(GlobalVars.lastAr.type == "auto"){
    // do same as static, except keep lastAr to 'auto'. If we're here, this means video probably changed
    // and there's something broken that prevents AR from working properly
    var storeLastAr = {type: GlobalVars.lastAr.type, ar: GlobalVars.lastAr.ar};
    _res_setAr(GlobalVars.lastAr.ar);
    GlobalVars.lastAr = storeLastAr;
//     ArDetect.init();
  }

  return true;
}

var _res_reset = function(){
  _res_legacyAr("reset");
}

var Resizer = {
  _currentAr: -1,
  align: _res_align,
  setAr: _res_setAr,
  legacyAr: _res_legacyAr,
  reset: _res_reset,
  restore: _res_restore,
  antiCssOverride: _res_antiCssOverride
}
