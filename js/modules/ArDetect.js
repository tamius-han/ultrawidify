if(Debug.debug)
  console.log("Loading: ArDetect");

var _ard_console_stop = "background: #000; color: #f41";
var _ard_console_start = "background: #000; color: #00c399";

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
  // if we're restarting ArDetect, we need to do this in order to force-recalculate aspect ratio
  GlobalVars.lastAr = {type: "auto", ar: null};
  _ard_vdraw(vid, context, canvasWidth, canvasHeight, false);
};

var _ard_canvasReadyForDrawWindow = function(){
  if(Debug.debug)
    console.log("%c[ArDetect::_ard_canvasReadyForDrawWindow] (?)", "color: #44f", _ard_canvasHeight == window.innerHeight, "(ard_height:", _ard_canvasHeight, "| window height:", window.innerHeight, ")");
  
  return _ard_canvasHeight == window.innerHeight
}

var _ard_processAr = function(video, width, height, edge_h, edge_w, fallbackMode){
  // width, height —> canvas/sample
  
  // edge_w -—> null/undefined, because we don't autocorrect pillarbox yet
  
  if(Debug.debug && Debug.debugArDetect){
    console.log("[ArDetect::_ard_processAr] processing ar. sample width:", width, "; sample height:", height, "; edge top:", edge_h);
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
  
  if(GlobalVars.lastAr.type == "auto" && GlobalVars.lastAr.ar != null){
    // spremembo lahko zavrnemo samo, če uporabljamo avtomatski način delovanja in če smo razmerje stranic
    // že nastavili.
    //
    // we can only deny aspect ratio changes if we use automatic mode and if aspect ratio was set from here.
    
    var arDiff = trueAr - GlobalVars.lastAr.ar;
    if (arDiff < 0)
      arDiff = -arDiff;
    
    var arDiff_percent = arDiff / trueAr;
    
    // ali je sprememba v mejah dovoljenega? Če da -> fertik
    // is ar variance within acceptable levels? If yes -> we done
    if(Debug.debug && Debug.debugArDetect)
      console.log("%c[ArDetect::_ard_processAr] new aspect ratio varies from the old one by this much:\n","color: #aaf","old Ar", GlobalVars.lastAr.ar, "current ar", trueAr, "arDiff (absolute):",arDiff,"ar diff (relative to new ar)", arDiff_percent);
    
    if (arDiff < trueAr * Settings.arDetect.allowedArVariance){
      if(Debug.debug && Debug.debugArDetect)
        console.log("%c[ArDetect::_ard_processAr] aspect ratio change denied — diff %:", "background: #740; color: #fa2", arDiff_percent)
        
      return;
    }
    else if(Debug.debug && Debug.debugArDetect){
      console.log("%c[ArDetect::_ard_processAr] aspect ratio change accepted — diff %:", "background: #153; color: #4f9", arDiff_percent)
    }
  }
  
  if(Debug.debug)
    console.log("[ArDetect::_ard_processAr] attempting to fix aspect ratio. New aspect ratio: ", trueAr);
  
  
  // POMEMBNO: GlobalVars.lastAr je potrebno nastaviti šele po tem, ko kličemo _res_setAr(). _res_setAr() predvideva,
  // da želimo nastaviti statično (type: 'static') razmerje stranic — tudi, če funkcijo kličemo tu oz. v ArDetect.
  //
  // IMPORTANT NOTE: GlobalVars.lastAr needs to be set after _res_setAr() is called, as _res_setAr() assumes we're
  // setting a static aspect ratio (even if the function is called from here or ArDetect). 
  
  Resizer.setAr(trueAr);
  GlobalVars.lastAr = {type: "auto", ar: trueAr};
}

var _ard_vdraw = function (vid, context, w, h, conf){
  try{
  
  if(this._forcehalt)
    return;
  
  var fallbackMode = false;
  var startTime = performance.now();
  var guardLineResult = true;         // true if success, false if fail. true by default
  
  GlobalVars.arDetect.blackbarTreshold = 10;  // how non-black can the bar be, should be dynamically determined
  var how_far_treshold = 8; // how much can the edge pixel vary (*4)
  
//   if(Debug.debug)
//     Settings.arDetect.timer_playing = 1000;     // how long is the pause between two executions — 33ms ~ 30fps
  
  if(vid == null || vid.paused || vid.ended || Status.arStrat != "auto"){
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

//   for(var i = 0; i < rc.length; i++){
//     //where-x, where-y, how wide, how tall
//     //random col, first y, 1 pix wide, all pixels tall 
//     cols[i] = context.getImageData(rc[i], 0, 1, h).data;
//   }

  // fast test to see if aspect ratio is correct
  isLetter=true;
  for(var i in cols){
    // if any of those points fails this check, we aren't letterboxed
    isLetter &= (cols[i][0] <= blackbar_tresh && cols[i][1] <= blackbar_tresh && cols[i][2] <= blackbar_tresh);
    // should also check bottom
  }

  if(!isLetter){
    // Če ne zaznamo letterboxa, kličemo reset. Lahko, da je bilo razmerje stranic popravljeno na roke. Možno je tudi,
    // da je letterbox izginil.
    // If we don't detect letterbox, we reset aspect ratio to aspect ratio of the video file. The aspect ratio could
    // have been corrected manually. It's also possible that letterbox (that was there before) disappeared.
    if(Debug.debug){
      console.log("%c[ArDetect::_ard_vdraw] no edge detected. canvas has no edge.", "color: #aaf");
    }
    
//     _ard_processAr(vid, w, h);
    Resizer.reset();
    GlobalVars.lastAr = {type: "auto", ar: null};
    
    _ard_timer = setTimeout(_ard_vdraw, Settings.arDetect.timer_playing, vid, context, w, h); //no letterbox, no problem
    return;
  }
  
  // let's do a quick test to see if we're on a black frame
  // TODO: reimplement but with less bullshit
  
  
  // poglejmo, če obrežemo preveč.
  // let's check if we're cropping too much
  var guardLineOut;
  if(Settings.arDetect.guardLine.enabled){
    guardLineOut = _ard_guardLineCheck()
    guardLineResult = guardLineOut.success;
  }
  
  // pa poglejmo, kje se končajo črne letvice na vrhu in na dnu videa.
  // let's see where black bars end.

  _ard_findBlackbarLimits(context);
  
  
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
  catch(e){
    if(Debug.debug)
      console.log("%c[ArDetect::_ard_vdraw] vdraw has crashed for some reason ???. Error here:", "color: #000; background: #f80", e);
    
    _ard_timer = setTimeout(_ard_vdraw, Settings.arDetect.timer_playing, vid, context, w, h);
  }
}

var _ard_guardLineCheck(context){
  // this test tests for whether we crop too aggressively
  
  // if this test is passed, then aspect ratio probably didn't change from wider to narrower. However, further
  // checks are needed to determine whether aspect ratio got wider.
  // if this test fails, it returns a list of offending points.
  
  // if the upper edge is null, then edge hasn't been detected before. This test is pointless, therefore it
  // should succeed by default.
  if(GlobalVars.arDetect.guardLine.top == null)
    return { success: true };
  
  var blackbarTreshold = GlobalVars.arDetect.blackbarTreshold;
  var edges = GlobalVars.arDetect.guardLine;  
  var start = parseInt(_ard_canvasWidth * Settings.arDetect.guardLine.ignoreEdgeMargin);
  var width = _ard_canvasWidth - (start << 1);
  
  var offenders = [];
  var firstOffender = -1;
  var offenderCount = -1;
  
  // TODO: implement logo check.
  
  
  // preglejmo obe vrstici
  // check both rows
  for(var edge of [ edges.top, edges.bottom ]){
    var row = context.getImageData(start, edges.top, width, 1).data;
    for(var i = 0; i < row.length, i+=4){

      // we track sections that go over what's supposed to be a black line, so we can suggest more 
      // columns to sample
      if(row[i] > blackbarTreshold || row[i+1] > blackbarTreshold || row[i+2] > blackbarTreshold){
        if(firstOffender < 0){
          firstOffender = i >> 2;
          offenderCount++;
          offenders.push({x: firstOffender, width: 1})
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
  }
  
  // če nismo našli nobenih prekrškarjev, vrnemo uspeh. Drugače vrnemo seznam prekrškarjev
  // vrnemo tabelo, ki vsebuje sredinsko točko vsakega prekrškarja (x + width*0.5)
  //
  // if we haven't found any offenders, we return success. Else we return list of offenders
  // we return array of middle points of offenders (x + (width >> 1) for every offender)
  
  if(offenderCount == -1)
    return {success: true};
  
  var ret = new Array(offenders.length);
  for(var o in offenders){
    ret[o] = offenders[o].x + (offenders[o].width >> 2);
  }
  
  return {success: false, offenders: ret};0
}

var _ard_findBlackbarLimits(context, cols){
  var data = [];
  var middle, bottomStart, blackbarTreshold, top, bottom;
  var res = [];
  
  middle = context.canvas.height << 1 // x2 = middle of data column 
  bottomStart = context.canvas.height - 1 << 2; // (height - 1) x 4 = bottom pixel
  blackbarTreshold = GlobalVars.arDetect.blackbarTreshold;

  var found = false;
  
  for(var col of cols){
    data = context.getImageData(start, edges.top, 1, context.canvas.height).data;
    for(var i = 0; i < middle; i+=4){
      if(data[i] > blackbarTreshold || data[i+1] > blackbarTreshold || data[i+2] > blackbarTreshold){
        top = (i >> 2) - 1;
        found = true;
        break;
      }
    }
    if(!found)
      top = -1; // universal "not found" mark. We don't break because the bottom side can still give good info
    else
      found = false; // reset
    
    for(var i = bottomStart; i > middle; i-=4){
      if(data[i] > blackbarTreshold || data[i+1] > blackbarTreshold || data[i+2] > blackbarTreshold){
        bottom = (i >> 2) + 1;
        found = true;
        break;
      }
    }
    
    if(!found)
      bottom = -1;
    
    res.push({col: col, bottom: bottom, top: top});
  }
  
  return res;
}

var _ard_preprocessPoints(samples){
  // if the frame is black, some detected "edges" will be further towards the middle than they should actually be
  // on the other hand, we need to have some watermark protection as well.
  // 
  // We will assume that a video will have a watermark at most in one corner/quarter.
  // we will also assume that black bars are actually centered
  
  // TODO: assume position of the watermark doesn't change by much.
  

  
  for(sample of samples){
    
  }
}

var _ard_edgeDetect(context, samples){
  
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
