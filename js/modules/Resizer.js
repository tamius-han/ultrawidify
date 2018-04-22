if(Debug.debug)
  console.log("Loading: Resizer.js");

// restore watchdog. While true, _res_applyCss() tries to re-apply new css until this value becomes false again
// value becomes false when width and height of <video> tag match with what we want to set. Only necessary when
// calling _res_restore() for some weird reason.
var _res_restore_wd = false;  

var _res_char = function(newAr, video, player){
  
  // Kot vhodni argument dobimo razmerje stranic. Problem je, ker pri nekaterih ločljivostih lahko razmerje stranic
  // videa/našega zaslona minimalno odstopa od idealnega razmerja — npr 2560x1080 ni natanko 21:9, 1920x1080 ni 
  // natanko 16:9. Zato ob podanem razmerju stranic izračunamo dejansko razmerje stranic.
  // 
  // The aspect ratio we get as an argument is an ideal aspect ratio. Some (most) resolutions' aspect ratios differ
  // from that ideal aspect ratio (by a minimal amount) — e.g. 2560x1080 isn't exactly 21:9, 1920x1080 isn't exactly
  // 16:9. What is more, both 3440x1440 and 2560x1080 are considered "21:9", but their aspect ratios are slightly 
  // different. This has the potential to result in annoying black bars, so we correct the aspect ratio we're given
  // to something that's slightly more correct.
  
  var ar;
  var res_219 = [ [2560,1080], [3440,1440] ];
  var res_169 = [ [1920,1080], [1280,720], [1366,768] ];
  
  if(newAr == (21/9)){
    for (var i = 0; i < res_219.length; i++){
      if( player.height == res_219[i][1]){
        ar = res_219[i][0]/res_219[i][1];
        set_video_ar( ar, video, player);
        return;
      }
    }
  }
  else if(new_ar == (16/9)){
    for (var i = 0; i < res_169.length; i++){
      if( player.height == res_169[i][1]){
        ar = res_169[i][0]/res_169[i][1];
        setVideoAr( ar, video, player);
        return;
      }
    }
  }
  
  _res_setVideoAr(new_ar, video, player);
}

// Skrbi za "stare" možnosti, kot na primer "na širino zaslona", "na višino zaslona" in "ponastavi". 
// Približevanje opuščeno.
// handles "legacy" options, such as 'fit to widht', 'fit to height' and 'reset'. No zoom tho
var _res_legacyAr = function(action){  
  var vid = GlobalVars.video;
  var ar;
  
  if(! GlobalVars.playerDimensions ){
    ar = screen.width / screen.height;
  }
  else{
    ar = GlobalVars.playerDimensions.width / GlobalVars.playerDimensions.height;
  }
  
  // POMEMBNO: GlobalVars.lastAr je potrebno nastaviti šele po tem, ko kličemo _res_setAr(). _res_setAr() predvideva,
  // da želimo nastaviti statično (type: 'static') razmerje stranic — tudi, če funkcijo kličemo tu oz. v ArDetect.
  //
  // IMPORTANT NOTE: GlobalVars.lastAr needs to be set after _res_setAr() is called, as _res_setAr() assumes we're
  // setting a static aspect ratio (even if the function is called from here or ArDetect). 
  
  var fileAr = vid.videoWidth / vid.videoHeight;
    
  if (action == "fitw"){
    _res_setAr( ar > fileAr ? ar : fileAr);
  }
  else if(action == "fith"){
    _res_setAr( ar < fileAr ? ar : fileAr);
  }
  else if(action == "reset"){
    _res_setAr(fileAr);
    GlobalVars.lastAr = {type: "original"};
    return;
  }
  else if(action == "autoar" || action == "auto"){
    GlobalVars.lastAr = {type: "auto", ar: null};
    ArDetect.init();
  }
  
  GlobalVars.lastAr = {type: "legacy", action: action};
}

var _res_setAr = function(ar){
  if(Debug.debug)
    console.log("[Resizer::_res_setAr] trying to set ar. args are: ar->",ar,"; playerDimensions->",GlobalVars.playerDimensions);

  GlobalVars.lastAr = {type: "static", ar: ar};
    
  var vid = GlobalVars.video;
  if(vid == null || vid==undefined || vid.videoWidth == 0 || vid.videoHeight == 0){
    vid =  document.getElementsByTagName("video")[0];
    GlobalVars.video = vid;
    
    if(vid == null || vid==undefined || vid.videoWidth == 0 || vid.videoHeight == 0){
      if(Debug.debug)
        console.log("[Resizer::_res_setAr] I lied. Tricked you! You thought there's gonna be a video, didn't you? Never would be.", vid);   // of course that's thorin reference -> https://youtu.be/OY5gGkeQn1c?t=1m20s
      return;
    }
  }
  
  if(Debug.debug)
    console.log("[Resizer::_res_setAr] video:",vid,"width:", vid.videoWidth, "height:", vid.videoHeight);
  
//   // Dejansko razmerje stranic datoteke/<video> značke
  // Actual aspect ratio of the file/<video> tag
  var fileAr = vid.videoWidth / vid.videoHeight;
  
  if(ar == "default")
    ar = fileAr;

  
  if(Debug.debug)
    console.log("[Resizer::_res_setAr] ar is " ,ar, ", file ar is", fileAr, ", playerDimensions are ", GlobalVars.playerDimensions);
  
  var videoDimensions = {
    width: 0,
    height: 0
  }
  
  
  if(GlobalVars.playerDimensions === undefined){
    GlobalVars.playerDimensions = PlayerDetect.getPlayerDimensions(vid);
    
    if(Debug.debug)
      console.log("[Resizer::_res_setAr] playerDimensions are undefined, trying to determine new ones ... new dimensions:",GlobalVars.playerDimensions);
  }
  
  if(Debug.debug){
    console.log("[Resizer::_res_setAr] Player dimensions?",GlobalVars.playerDimensions);
  }
  
  if( fileAr < ar ){
    // imamo letterbox zgoraj in spodaj -> spremenimo velikost videa (ampak nikoli na več, kot je širina zaslona)
    // letterbox -> change video size (but never to wider than monitor width)
    videoDimensions.width = Math.min(GlobalVars.playerDimensions.height * ar, GlobalVars.playerDimensions.width);
    videoDimensions.height = videoDimensions.width * (1/fileAr);
  }
  else{
    videoDimensions.height = Math.min(GlobalVars.playerDimensions.width * (1/ar), GlobalVars.playerDimensions.height);
    videoDimensions.width = videoDimensions.height * fileAr;
  }
  
  if(Debug.debug){
    console.log("[Resizer::_res_setAr] Video dimensions: ",videoDimensions, "playerDimensions:",GlobalVars.playerDimensions);
  }
  
  var cssValues = _res_computeOffsets(videoDimensions, GlobalVars.playerDimensions);
  
  if(Debug.debug){
    console.log("[Resizer::_res_setAr] Offsets for css are: ",cssValues);
  }
  
  _res_applyCss(cssValues);
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
  
  var styleArrayStr = GlobalVars.video.getAttribute('style');
  
  if (styleArrayStr !== null && styleArrayStr !== undefined){
    var styleArray = styleArrayStr.split(";");

    var stuffChecked = 0;
    var stuffToCheck = 2;
    
    for(var i in styleArray){
      styleArray[i] = styleArray[i].trim();
      
      if (styleArray[i].startsWith("top:")){
        if(styleArray[i] != GlobalVars.currentCss.top){
          if(Debug.debug){
            console.log("[Resizer::_res_antiCssOverride] SOMEBODY TOUCHED MA SPAGHETT (our CSS got overriden, restoring our css)");
          }
          _res_restore();
          return;
        }
        stuffChecked++;
      }
      else if(styleArray[i].startsWith("left:")){
        if(styleArray[i] != GlobalVars.currentCss.left){
          if(Debug.debug){
            console.log("[Resizer::_res_antiCssOverride] SOMEBODY TOUCHED MA SPAGHETT (our CSS got overriden, restoring our css)");
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
