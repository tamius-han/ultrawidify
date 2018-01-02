if(Debug.debug)
  console.log("Loading: ArDetect");

var _ard_console_stop = "background: #000; color: #f41";
var _ard_console_start = "background: #000; color: #00c399";


// global-ish variables
var _ard_oldAr;
var _ard_currentAr;


var _ard_setup_timer;
var _ard_timer

// kjer vzemamo vzorce za blackbox/stuff. 9 vzorcev. Če spremenimo velikost vzorca, moramo spremeniti tudi vrednosti v tej tabeli
// vrednosti v tabeli so na osminskih intervalih od [0, <sample height * 4> - 4].
// we sample these lines in blackbox/stuff. 9 samples. If we change the canvas sample size, we have to correct these values as well
// samples are every eighth between [0, <sample height * 4> - 4].
var _ard_sampleLines = [ 0, 360, 720, 1080, 1440, 1800, 2160, 2520, 2876];
var _ard_sampleCols = [ 128, 256, 384, 512, 640, 768, 896, 1024, 1125 ];

var _ard_canvasWidth;
var _ard_canvasHeight;
var _ard_canvasDrawWindowHOffset = 0;

// **** FUNCTIONS **** //

var _arSetup = function(cwidth, cheight){
  if(Debug.debug)
    console.log("%c[ArDetect::_ard_setup] Starting automatic aspect ratio detection", _ard_console_start);

  this._halted = false;
  
  var existingCanvas = document.getElementById("uw_ArDetect_canvas");
  if(existingCanvas){
    if(Debug.debug)
      console.log("[ArDetect::_ard_setup] existing canvas found. REMOVING KEBAB removing kebab\n\n\n\n(im hungry and you're not authorized to have it)");
    
    existingCanvas.remove();
    
    if(Debug.debug)
      console.log("[ArDetect::_ard_setup] canvas removed");
  }
  
    var vid = document.getElementsByTagName("video")[0];
  
  if(vid === undefined){
    _ard_setup_timer = setTimeout(_arSetup, 1000);
    return;
  }
  
  // imamo video, pa tudi problem. Ta problem bo verjetno kmalu popravljen, zato setup začnemo hitreje kot prej
  // we have a video, but also a problem. This problem will prolly be fixed very soon, so setup is called with
  // less delay than before
  if(vid.videoWidth === 0 || vid.videoHeight === 0){
    _ard_setup_timer = setTimeout(_arSetup, 100);
    return;
  }
  
  
  var canvas = document.createElement("canvas");
  canvas.style.position = "absolute";
  
  //todo: change those values to push canvas off-screen
  
  _ard_canvasWidth = cwidth ? cwidth : Settings.arDetect.hSamples;
  _ard_canvasHeight = cheight ? cheight : Settings.arDetect.vSamples;
  
  if(Debug.showArDetectCanvas){
    canvas.style.left = "200px";
    canvas.style.top = "780px";
    canvas.style.zIndex = 10000;
  }
  else{
    canvas.style.left = "-20000px";
    canvas.style.top = "-1080px";
    canvas.style.zIndex = -10000;
  }
  canvas.id = "uw_ArDetect_canvas";
  
  var test = document.getElementsByTagName("body")[0];
  test.appendChild(canvas);
  
  var context = canvas.getContext("2d");
  
  // do setup once
  // tho we could do it for every frame
  if(cwidth && cheight){
    var canvasWidth = cwidth;
    var canvasHeight = cheight;
    var canvasScaleFactor = cheight / vid.videoHeight;
  }
  else{
    var canvasScaleFactor =  _ard_canvasWidth / vid.videoWidth;
    var canvasWidth = vid.videoWidth * canvasScaleFactor;
    var canvasHeight = vid.videoHeight * canvasScaleFactor;
  }
  
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  
  // init oldAr to physical <video> aspect ratio
  
  _ard_oldAr = vid.videoWidth / vid.videoHeight;
  _ard_currentAr = _ard_oldAr;
  
  try{
    // determine where to sample
    var ncol = Settings.arDetect.staticSampleCols;
    var nrow = Settings.arDetect.staticSampleRows;
    
    var colSpacing = _ard_canvasWidth / ncol;
    var rowSpacing = (_ard_canvasHeight * 4) / nrow;
    
    _ard_sampleLines = [];
    _ard_sampleCols = [];

    for(var i = 0; i < ncol; i++){
      if(i < ncol - 1)
        _ard_sampleCols.push(Math.round(colSpacing * i));
      else{
        _ard_sampleCols.push(Math.round(colSpacing * i) - 1);
      }
    }
    
    for(var i = 0; i < nrow; i++){
      if(i < ncol - 5)
        _ard_sampleLines.push(Math.round(rowSpacing * i));
      else{
        _ard_sampleLines.push(Math.round(rowSpacing * i) - 4);
      }
    }
  }
  catch(ex){
    console.log("%c[ArDetect::_arSetup] something went terribly wrong when calcuating sample colums.", Settings.colors.criticalFail);
    console.log("settings object:", Settings);
    console.log("error:", ex);
  }
  
  this._forcehalt = false;
  _ard_vdraw(vid, context, canvasWidth, canvasHeight, false);
};

var _ard_canvasReadyForDrawWindow = function(){
  if(Debug.debug)
    console.log("%c[ArDetect::_ard_canvasReadyForDrawWindow] (?)", "color: #44f", _ard_canvasHeight == window.innerHeight, "(ard_height:", _ard_canvasHeight, "| window height:", window.innerHeight, ")");
  
  return _ard_canvasHeight == window.innerHeight
}

var _ard_processAr = function(video, width, height, edge_h, edge_w, fallbackMode){
  // width, height —> canvas/sample
  
  //edge_w -—> null/undefined, because we don't autocorrect pillarbox yet
  
  if(Debug.debug){
    console.log("[ArDetect::_ard_processAr] processing ar. width:", width, "; height:", height, "; edge top:", edge_h);
  }
  // if we don't specify these things, they'll have some default values.
  if(edge_h === undefined){
    edge_h = 0;
    edge_w = 0;
  }
  
  var letterbox = 2 * edge_h;
  var trueHeight = height - letterbox;
  
  if(fallbackMode){
    if(edge_h > 1 && edge_h < 20)
      return;
    
    // let's add some safety border to avoid automatic ar toggling between 21:9 and 16:9
    
    trueHeight += 6;
  }
  
  
  var trueAr = width / trueHeight;
  ArDetect.detectedAr = trueAr;
  
  // poglejmo, če se je razmerje stranic spremenilo
  // check if aspect ratio is changed:
  var arDiff = trueAr - _ard_oldAr;
  if (arDiff < 0)
    arDiff = -arDiff;
  
  var arDiff_percent = arDiff / trueAr;
  
  // ali je sprememba v mejah dovoljenega? Če da -> fertik
  // is ar variance within acceptable levels? If yes -> we done
  if(Debug.debug && Debug.debugArDetect)
    console.log("%c[ArDetect::_ard_processAr] new aspect ratio varies from the old one by this much:\n","color: #aaf","old Ar", _ard_oldAr, "current ar", trueAr, "arDiff (absolute):",arDiff,"ar diff (relative to new ar)", arDiff_percent);
  
  if (arDiff < trueAr * Settings.arDetect.allowedArVariance){
    if(Debug.debug && Debug.debugArDetect)
      console.log("%c[ArDetect::_ard_processAr] aspect ratio change denied — diff %:", "background: #740; color: #fa2", arDiff_percent)
    return;
  }
  else if(Debug.debug && Debug.debugArDetect){
    console.log("%c[ArDetect::_ard_processAr] aspect ratio change accepted — diff %:", "background: #153; color: #4f9", arDiff_percent)
  }
  // če je sprememba več od dovoljenega, spremeni razmerje stranic. Stvari se razlikujejo glede na to, ali smo v fullscreen ali ne
  // if change is greater than allowed, change the aspect ratio.  Whether we do that depends on whether we're in fullscreen.
  if( FullScreenDetect.isFullScreen() ){
    if(Debug.debug)
      console.log("[ArDetect::_ard_processAr] attempting to fix aspect ratio. New aspect ratio: ", trueAr);
      
    _ard_oldAr = trueAr;
    Resizer.setAr_fs(trueAr);
  }
  else{
    // če nismo v fullscreen, potem preverimo, ali naša stran dovoljuje ne-fs?
    // first, we'll check if our site allows for non-fs autoar detection
    if( SitesConf.nonfsArDetectEnabled() ){
      _ard_oldAr = trueAr;
      Resizer.setAr_nonfs(trueAr);
    }
  }
  
  
}

var _ard_vdraw = function (vid, context, w, h, conf){
  if(this._forcehalt)
    return;
  
  var fallbackMode = false;
  var blackbar_tresh = 10;  // how non-black can the bar be
  var how_far_treshold = 8; // how much can the edge pixel vary (*4)
  
//   if(Debug.debug)
//     Settings.arDetect.timer_playing = 1000;     // how long is the pause between two executions — 33ms ~ 30fps
  
  if(vid === undefined || vid.paused || vid.ended || Status.arStrat != "auto"){
    // we slow down if paused, no detection
    _ard_timer = setTimeout(_ard_vdraw, Settings.arDetect.timer_paused, vid, context, w, h);
    return false;
  }
  
  try{
    context.drawImage(vid, 0,0, w, h);
  }
  catch(ex){
    if(Debug.debug)
      console.log("%c[ArDetect::_ard_vdraw] can't draw image on canvas. Trying canvas.drawWindow instead", "color:#000; backgroud:#f51;", ex);
    
    try{
      if(_ard_canvasReadyForDrawWindow()){
        context.drawWindow(window, _ard_canvasDrawWindowHOffset, 0, w, h, "rgba(0,0,0,1)");
        if(Debug.debug)
          console.log("%c[ArDetect::_ard_vdraw] canvas.drawImage seems to have worked", "color:#000; backgroud:#2f5;");
        fallbackMode = true;
      }
      else{
        // canvas needs to be resized, so let's change setup
        _ard_stop();
        
        var newCanvasWidth = window.innerHeight * 1.77;
        var newCanvasHeight = window.innerHeight;
        
        if(Settings.miscFullscreenSettings.videoFloat == "center")
          _ard_canvasDrawWindowHOffset = Math.round((window.innerWidth - newCanvasWidth) * 0.5);
        else if(Settings.miscFullscreenSettings.videFloat == "left")
          _ard_canvasDrawWindowHOffset = 0;
        else
          _ard_canvasDrawWindowHOffset = window.innerWidth - newCanvasWidth;
        
        _arSetup(newCanvasWidth, newCanvasHeight);
        return;
      }
      
    }
    catch(ex){
      if(Debug.debug)
        console.log("%c[ArDetect::_ard_vdraw] okay this didnt work either", "color:#000; backgroud:#f51;", ex);
      
      _ard_timer = setTimeout(_ard_vdraw, Settings.arDetect.timer_error, vid, context, w, h);
      return;  
    }
    
//     _ard_timer = setTimeout(_ard_vdraw, Settings.arDetect.timer_error, vid, context, w, h);
//     return;
  }
  // "random" columns — todo: randomly pick some more
  var rc = _ard_sampleCols;


  var cimg = [];
  var cols = []; 

  for(var i = 0; i < rc.length; i++){
    //where-x, where-y, how wide, how tall
    //random col, first y, 1 pix wide, all pixels tall 
    cols[i] = context.getImageData(rc[i], 0, 1, h).data;
  }

  // fast test to see if aspect ratio is correct
  isLetter=true;
  for(var i in cols){
    // if any of those points fails this check, we aren't letterboxed
    isLetter &= (cols[i][0] <= blackbar_tresh && cols[i][1] <= blackbar_tresh && cols[i][2] <= blackbar_tresh);
    // should also check bottom
  }

  if(!isLetter){
    // tudi če ne zaznamo letterboxa, še vedno poženemo processAr. Lahko, da smo v preteklosti popravili letterbox, to pa moramo
    // sedaj razveljaviti
    // even if we don't deect letterbox, we still issue processAr in case we adjusted for letterbox earlier and need to exit
    // corrected mode.
    if(Debug.debug){
      console.log("%c[ArDetect::_ard_vdraw] no edge detected. canvas has no edge.", "color: #aaf");
    }
    
    _ard_processAr(vid, w, h);
    
    _ard_timer = setTimeout(_ard_vdraw, Settings.arDetect.timer_playing, vid, context, w, h); //no letterbox, no problem
    return;
  }

  // let's do a quick test to see if we're on a black frame
  // let's also pick all points in advance (assuming canvas will always be 1280x720)

  
  var blackPoints = 0;
  var blackPointsMax = cols.length * 9; // 9 we sample each col at 9 different places

  
  // indexes in _ard_sampleLines
  var color_uppermost = 10;          
  var color_lowermost = 0;
  
  // stolpca, v katerih smo našli zgornji številki
  // columns, in which the values above were found
  var cl_col = [];
  var cu_col = [];
  
  // if (pixel is black) 
  for(var i in cols){
    
    // --- piksli na zgornji polovici -----------------//
    // --- pixels from the top ------------------------//
    if( cols[i][_ard_sampleLines[0]] < blackbar_tresh &&
        cols[i][_ard_sampleLines[0] + 1] < blackbar_tresh &&
        cols[i][_ard_sampleLines[0] + 2] < blackbar_tresh )
      blackPoints++;
    else if(color_uppermost > 0){
      color_uppermost = 0;
      cu_col = [i];
    }
    
    if( cols[i][_ard_sampleLines[1]] < blackbar_tresh && 
        cols[i][_ard_sampleLines[1] + 1] < blackbar_tresh &&
        cols[i][_ard_sampleLines[1] + 2] < blackbar_tresh )
      blackPoints++;
    else if(color_uppermost > 1){
      color_uppermost = 1;
      cu_col = [i];
    }
    else if(color_uppermost == 1){
      cu_col.push(i);
    }
    
    if( cols[i][_ard_sampleLines[2]] < blackbar_tresh &&
        cols[i][_ard_sampleLines[2] + 1] < blackbar_tresh &&
        cols[i][_ard_sampleLines[1] + 2] < blackbar_tresh )
      blackPoints++;
    else if(color_uppermost > 2){
      color_uppermost = 2;
      cu_col = [i];
    }
    else if(color_uppermost == 2){
      cu_col.push(i);
    }
    
    if( cols[i][_ard_sampleLines[3]] < blackbar_tresh &&
        cols[i][_ard_sampleLines[3] + 1] < blackbar_tresh &&
        cols[i][_ard_sampleLines[3] + 2] < blackbar_tresh )
      blackPoints++;
    else if(color_uppermost > 3){
      color_uppermost = 3;
      cu_col = [i];
    }
    else if(color_uppermost == 3){
      cu_col.push(i);
    }
    
    
    // --- piksli na spodnji polovici ---------------//
    // tukaj gremo v obratni smeri, drugače bo v tabeli lahko napačen piksel 
    // --- pixels on the bottom ---------------------//
    // searching in the other direction, otherwise we could get incorrect results
    
    if( cols[i][_ard_sampleLines[8]] < blackbar_tresh &&
        cols[i][_ard_sampleLines[8] + 1] < blackbar_tresh &&
        cols[i][_ard_sampleLines[8] + 2] < blackbar_tresh )
      blackPoints++;
    else if(color_lowermost < 8){
      color_lowermost = 8;
      cl_col = [i];
    }
    
    if( cols[i][_ard_sampleLines[7]] < blackbar_tresh && 
        cols[i][_ard_sampleLines[7] + 1] < blackbar_tresh &&
        cols[i][_ard_sampleLines[7] + 2] < blackbar_tresh )
      blackPoints++;
    else if(color_lowermost < 7){
      color_lowermost = 7;
      cl_col = [i];
    }
    else if(color_lowermost == 7){
      cl_col.push(i);
    }
    
    if( cols[i][_ard_sampleLines[6]] < blackbar_tresh &&
        cols[i][_ard_sampleLines[6] + 1] < blackbar_tresh &&
        cols[i][_ard_sampleLines[6] + 2] < blackbar_tresh )
      blackPoints++;
    else if(color_lowermost < 6){
      color_lowermost = 6;
      cl_col = [i];
    }
    else if(color_lowermost == 6){
      cl_col.push(i);
    }
    
    if( cols[i][_ard_sampleLines[5]] < blackbar_tresh &&
        cols[i][_ard_sampleLines[5] + 1] < blackbar_tresh &&
        cols[i][_ard_sampleLines[5] + 2] < blackbar_tresh )
      blackPoints++;
    else if(color_lowermost < 5){
      color_lowermost = 5;
      cl_col = [i];
    }
    else if(color_lowermost == 5){
      cl_col.push(i);
    }
    // --- piksli na sredini ------------------------//
    // na sredini ne preverjamo za color_lowermost in color_uppermost. Če bo color_lowermost in color_uppermost relevanten na tem
    // nivoju, potem bo a) dovolj črnih točk za blackframe oz b) barvasta točka na višjem nivoju
    // --- pixels in the center ---------------------//
    // we don't check for color_lowermost and color_uppermost here, because it's pointless.
    
    if( cols[i][1440] < blackbar_tresh && cols[i][1441] < blackbar_tresh && cols[i][1442] < blackbar_tresh )
      blackPoints++;    
    
  }

  
  
  if(blackPoints > (blackPointsMax >> 1)){
    // if more than half of those points are black, we consider the entire frame black (or too dark to get anything useful
    // out of it, anyway)
    if(Debug.debug && Debug.debugArDetect)
      console.log("%c[ArDetect::_ard_vdraw] Frame too dark, doing nothing. (Over 50% of the points are black)", "color: #99f");
    
    _ard_timer = setTimeout(_ard_vdraw, Settings.arDetect.timer_playing, vid, context, w, h); //no letterbox, no problem
    return;
  }

  if( color_lowermost == 8 || color_uppermost == 0){
    // zakaj smo potem sploh tukaj?
    // why exactly are we here again?
    
    if(Debug.debug && Debug.debugArDetect){
      console.log("%c[ArDetect::_ard_vdraw] aspect ratio change is being triggered by an event we thought shouldn't be triggering it. Strange.\n\n","color: #4af", "color_lowermost (8=bad):", color_lowermost, "color_uppermost (0=bad):", color_uppermost);
    }
    
//     _ard_processAr(vid, w, h);
    _ard_timer = setTimeout(_ard_vdraw, Settings.arDetect.timer_playing, vid, context, w, h); //no letterbox, no problem
    return;
  }
  
  
  
  // pa poglejmo, kje se končajo črne letvice na vrhu in na dnu videa.
  // let's see where black bars end. We only need to check in the columns where we detected uppermost and lowermost color. 

  var endPixelTop = [];
  var endPixelBottom = [];
  
  for(var i in cu_col){
    var tmpEndPixel = _ard_sampleLines[color_uppermost] >> 2; // this would be the value if loop fails to quit with proper pixel
    
    var j = _ard_sampleLines[color_uppermost-1];
    
    while(j < _ard_sampleLines[color_uppermost]){
      if(cols[  cu_col[i]  ][ j   ] > blackbar_tresh &&
         cols[  cu_col[i]  ][ j+1 ] > blackbar_tresh &&
         cols[  cu_col[i]  ][ j+2 ] > blackbar_tresh ){
        
        tmpEndPixel = j >> 2;
        break;
      }
      j += 4;
    }
    
    endPixelTop.push(tmpEndPixel);
  }
  
  for(var i in cl_col){
    var tmpEndPixel = _ard_sampleLines[color_lowermost] >> 2;
    var j = _ard_sampleLines[color_lowermost];
    
    while(j < _ard_sampleLines[color_lowermost+1]){
      if(cols[  cl_col[i]  ][ j   ] < blackbar_tresh &&
         cols[  cl_col[i]  ][ j+1 ] < blackbar_tresh &&
         cols[  cl_col[i]  ][ j+2 ] < blackbar_tresh ){
        
        tmpEndPixel = j >> 2;
        break;
      }
      j += 4;
    }
    
    endPixelBottom.push(tmpEndPixel);
  }
  
  // dobi najvišji in najnižji piksel
  var bottomPixel = 0;
  var topPixel = 222222;
  
  for(var i in endPixelTop){
    if( endPixelTop[i] < topPixel )
      topPixel = endPixelTop[i];
  }
  
  for(var i in endPixelBottom){
    if( endPixelBottom[i] > bottomPixel )
      bottomPixel = endPixelBottom[i];
  }
  
  
  
  // preveri, če sta odmika zgoraj in spodaj podobno velika. Če nista, potem gledamo objekt, ne letterboxa
  // check if black borders match; if the line isn't horizontal we could be looking at an object in
  // the actual video that shouldn't be cropped out.
  
  var letterDiff = topPixel - (h - bottomPixel);
  if(letterDiff < 0)
    letterDiff = -letterDiff;
  
  isLetter = (letterDiff < h * Settings.arDetect.allowedMisaligned);
  
  if(isLetter)
    _ard_processAr(vid, w, h, topPixel, null, fallbackMode);
  else if(Debug.debug && Debug.debugArDetect)
      console.log("%c[ArDetect::_ard_vdraw] Black bars at the top and at the bottom differ in size more than we allow", "color: #99f");
  
  
  _ard_timer = setTimeout(_ard_vdraw, Settings.arDetect.timer_playing, vid, context, w, h);
}

var _ard_stop = function(){
  if(Debug.debug){
    console.log("%c[ArDetect::_ard_stop] Stopping automatic aspect ratio detection", _ard_console_stop);    
  }
  this._forcehalt = true;
  this._halted = true;
  clearTimeout(_ard_timer);
  clearTimeout(_ard_setup_timer);
}

var _ard_isRunning = function(){
  return ! this._halted;
}

var ArDetect = {
  _forcehalt: false,
  _halted: false,
  arSetup: _arSetup,
  init: _arSetup,
  vdraw: _ard_vdraw,
  detectedAr: 1,
  arChangedCallback: function() {},
  stop: _ard_stop,
  isRunning: _ard_isRunning
}
