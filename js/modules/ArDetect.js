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

var localSettings = {};

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
  
  
  _ard_resetBlackLevel();
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
  var baseTimeout = Settings.arDetect.timer_playing;
  var triggerTimeout;
  
  var guardLineResult = true;         // true if success, false if fail. true by default
  var imageDetectResult = false;      // true if we detect image along the way. false by default
  
  var sampleCols = _ard_sampleCols;
  
  var how_far_treshold = 8; // how much can the edge pixel vary (*4)
  
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
 
  var cols = []; 

  for(var i = 0; i < sampleCols.length; i++){
    //where-x, where-y, how wide, how tall
    //random col, first y, 1 pix wide, all pixels tall 
    cols[i] = context.getImageData(sampleCols[i], 0, 1, h).data;
  }

  // fast test to see if aspect ratio is correct. If we detect anything darker than blackLevel, we modify 
  // blackLevel to the new lowest value
  var isLetter=true;
  var currentMaxVal;
  var currentMax_a, currentMax_b;
  
  var bottom_r = cols[0].length - 4;
  var bottom_g = bottom_r + 1;
  var bottom_b = bottom_r + 2;
  
  for(var i in cols){
    // get biggest brightness in the top and bottom row across all three RGB components
    currentMax_a = cols[i][0] > cols[i][1] ? cols[i][0] : cols[i][1];
    currentMax_b = cols[i][bottom_r] > cols[i][bottom_g] ? cols[i][bottom_r] : cols[i][bottom_g];
    currentMaxVal = cols[i][2] > cols[i][bottom_b] ? cols[i][2] : cols[i][bottom_b];
    
    currentMax_a = currentMax_a > currentMax_b ? currentMax_a : currentMax_b;
    currentMaxVal = currentMaxVal > currentMax_a ? currentMaxVal : currentMax_a;
    
    // if any of those points fails this check, we aren't letterboxed
    isLetter &= currentMaxVal <= (GlobalVars.arDetect.blackLevel + Settings.arDetect.blackbarTreshold);
    
    // any single point on that list could be the darkest black, so we still check if we can lower blackLevel
    if(currentMaxVal < GlobalVars.arDetect.blackLevel){
      GlobalVars.arDetect.blackLevel = currentMaxVal;
    }
  }
  cols = null;

  if(!isLetter){
    // Če ne zaznamo letterboxa, kličemo reset. Lahko, da je bilo razmerje stranic popravljeno na roke. Možno je tudi,
    // da je letterbox izginil.
    // If we don't detect letterbox, we reset aspect ratio to aspect ratio of the video file. The aspect ratio could
    // have been corrected manually. It's also possible that letterbox (that was there before) disappeared.
    if(Debug.debug){
      console.log("%c[ArDetect::_ard_vdraw] no edge detected. canvas has no edge.", "color: #aaf");
    }
    
    Resizer.reset();
    GlobalVars.lastAr = {type: "auto", ar: null};
    
    
    triggerTimeout = _ard_getTimeout(baseTimeout, startTime);
    _ard_timer = setTimeout(_ard_vdraw, triggerTimeout , vid, context, w, h); //no letterbox, no problem
    return;
  }
  
  // let's do a quick test to see if we're on a black frame
  // TODO: reimplement but with less bullshit
  
  
  // poglejmo, če obrežemo preveč.
  // let's check if we're cropping too much (or whatever)
  var guardLineOut;
  var imageDetectOut;
  
  if(Settings.arDetect.guardLine.enabled){
    guardLineOut = _ard_guardLineCheck(context);
    guardLineResult = guardLineOut.success;
    
    if(! guardLineResult ){ // add new ssamples to our sample columns
      for(var col of guardLineOut.offenders){
        sampleCols.push(col)
      }
    }
    
    imageDetectOut = _ard_guardLineImageDetect(context);
    imageDetectResult = imageDetectOut.success;
    
    // če sta obe funkciji uspeli, potem se razmerje stranic ni spremenilo.
    // if both succeed, then aspect ratio hasn't changed.    
    if(imageDetectResult && guardLineResult){
      triggerTimeout = _ard_getTimeout(baseTimeout, startTime);
      _ard_timer = setTimeout(_ard_vdraw, triggerTimeout , vid, context, w, h); //no letterbox, no problem
      return;
    }
  }
  
  // pa poglejmo, kje se končajo črne letvice na vrhu in na dnu videa.
  // let's see where black bars end.
  GlobalVars.sampleCols_current = sampleCols.length;
  var blackbarSamples = _ard_findBlackbarLimits(context, sampleCols);
  var edgeCandidates = _ard_edgeDetect(context, blackbarSamples);
  var edgePost = _ard_edgePostprocess(edgeCandidates, context.canvas.height);
  
  if(edgePost.status == "ar_known"){
    _ard_processAr(vid, w, h, edgePost.blackbarWidth, null, fallbackMode);
    
    // we also know edges for guardline, so set them
    GlobalVars.arDetect.guardLine.top = edgePost.guardLineTop;
    GlobalVars.arDetect.guardLine.bottom = edgePost.guardLineBottom;
    
    triggerTimeout = _ard_getTimeout(baseTimeout, startTime);
    _ard_timer = setTimeout(_ard_vdraw, triggerTimeout , vid, context, w, h); //no letterbox, no problem
    return;
  }
  else{
    triggerTimeout = _ard_getTimeout(baseTimeout, startTime);
    _ard_timer = setTimeout(_ard_vdraw, triggerTimeout , vid, context, w, h); //no letterbox, no problem
    return;
  }
  
  }
  catch(e){
    if(Debug.debug)
      console.log("%c[ArDetect::_ard_vdraw] vdraw has crashed for some reason ???. Error here:", "color: #000; background: #f80", e);
    
    _ard_timer = setTimeout(_ard_vdraw, Settings.arDetect.timer_playing, vid, context, w, h);
  }
}

function _ard_guardLineCheck(context){
  // this test tests for whether we crop too aggressively
  
  // if this test is passed, then aspect ratio probably didn't change from wider to narrower. However, further
  // checks are needed to determine whether aspect ratio got wider.
  // if this test fails, it returns a list of offending points.
  
  // if the upper edge is null, then edge hasn't been detected before. This test is pointless, therefore it
  // should succeed by default. Also need to check bottom, for cases where only one edge is known
  
  try{
    if(GlobalVars.arDetect.guardLine.top == null || GlobalVars.arDetect.guardLine.bottom == null)
      return { success: true };
    
    var blackbarTreshold = GlobalVars.arDetect.blackLevel + Settings.arDetect.blackbarTreshold;
    var edges = GlobalVars.arDetect.guardLine;  
    var start = parseInt(_ard_canvasWidth * Settings.arDetect.guardLine.ignoreEdgeMargin);
    var width = _ard_canvasWidth - (start << 1);
    
    var offenders = [];
    var firstOffender = -1;
    var offenderCount = -1; // doing it this way means first offender has offenderCount==0. Ez index.
  }
  catch(e){
    console.log("%c[ArDetect::_ard_guardLineCheck] guardline crashed for some reason??\n----\n", "color: #000; background: #f62", e, "%c\n----");
    return {success: false};
  }
  // TODO: implement logo check.
  
  
  // preglejmo obe vrstici
  // check both rows
  
  var rows = [];
  
  var ytolerance = Settings.arDetect.guardLine.edgeTolerancePx;
  if(edges.top - ytolerance > 0){
    rows.push(context.getImageData(start, edges.top - ytolerance, width, 1).data);
  }
  if(edges.bottom + ytolerance < context.canvas.height){
    rows.push(context.getImageData(start, edges.bottom + ytolerance, width, 1).data);
  }
  
//   context.font = "16px Overpass Mono";
//   
//   context.fillStyle = 'rgb(255, 192, 32)'; 
//   context.fillText(("UPPER EDGE: "+edges.top ), 16, 12)
//   
//   context.fillStyle = 'rgb(32, 64, 255)'; 
//   context.fillText(("LOWER EDGE: "+edges.bottom ), 16, 32)
// 
//   
//   context.fillStyle = 'rgb(255, 192, 32)'; 
//   context.fillRect(0,0,10,edges.top);
//   
//   context.fillStyle = 'rgb(32, 64, 255)'; 
//   context.fillRect(0,edges.bottom, 10, edges.bottom);
//   
//   
//   console.log("guardline - rows:", rows);
  
  for(var row of rows){
    for(var i = 0; i < row.length; i+=4){

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
  
  if(offenderCount == -1){
    console.log("guardline - no black line violations detected.");
    return {success: true};
  }
  
  console.log("guardline failed.");
  
  var ret = new Array(offenders.length);
  for(var o in offenders){
    ret[o] = offenders[o].x + (offenders[o].width >> 2);
  }
  
  return {success: false, offenders: ret};
}

function _ard_guardLineImageDetect(context){  
  if(GlobalVars.arDetect.guardLine.top == null)
    return { success: false };
  
  var blackbarTreshold = GlobalVars.arDetect.blackLevel + Settings.arDetect.blackbarTreshold;
  var edges = GlobalVars.arDetect.guardLine;  
  var start = parseInt(_ard_canvasWidth * Settings.arDetect.guardLine.ignoreEdgeMargin);
  var width = _ard_canvasWidth - (start << 1);
  
  // TODO: implement logo check.
  
  
  // preglejmo obe vrstici
  // check both rows
  
  var complyingCount = 0;
  var complyingTreshold = (context.canvas.width * Settings.arDetect.guardLine.imageTestTreshold) << 1;
  
  for(var edge of [ edges.top, edges.bottom ]){
    var row = context.getImageData(start, edges.top, width, 1).data;
    for(var i = 0; i < row.length; i+=4){
      
      // we track sections that go over what's supposed to be a black line, so we can suggest more 
      // columns to sample
      if(row[i] > blackbarTreshold || row[i+1] > blackbarTreshold || row[i+2] > blackbarTreshold){
        complyingCount++;
        if(complyingCount > complyingTreshold){
          return {success: true}
        }
      }
    }
  }
  
  return {success: false};
}

function _ard_findBlackbarLimits(context, cols){
  var data = [];
  var middle, bottomStart, blackbarTreshold, top, bottom;
  var res = [];
  
  middle = context.canvas.height << 1 // x2 = middle of data column 
  bottomStart = (context.canvas.height - 1) << 2; // (height - 1) x 4 = bottom pixel
  blackbarTreshold = GlobalVars.arDetect.blackLevel + Settings.arDetect.blackbarTreshold;
  
  var found; 
  
  for(var col of cols){
    found = false;
    
    data = context.getImageData(col, 0, 1, context.canvas.height).data;
    
    for(var i = 0; i < middle; i+=4){
      if(data[i] > blackbarTreshold || data[i+1] > blackbarTreshold || data[i+2] > blackbarTreshold){
        top = (i >> 2) - 1;
        found = true;
        break;
      }
    }
    if(!found)
      top = -1; // universal "not found" mark. We don't break because the bottom side can still give good info
    
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
    
    res.push({col: col, bottom: bottom, top: top, bottomRelative: context.canvas.height - bottom});
  }
  
  if(Debug.debug && Debug.debugArDetect)
    console.log("[ArDetect::_ard_findBlackbarLimits] found some candidates for black bar limits", res);
  
  return res;
}


function _ard_edgeDetect(context, samples){
  var edgeCandidatesTop = {};
  var edgeCandidatesBottom = {};
  
  var sampleWidthBase = Settings.arDetect.edgeDetection.sampleWidth;
  var halfSample = sampleWidthBase >> 1;
  var detections;
  var detectionTreshold = Settings.arDetect.edgeDetection.detectionTreshold;
  var canvasWidth = context.canvas.width;
  var canvasHeight = context.canvas.height;
  
  var sampleStart, sampleWidth;
  
  var imageData = [];
  var blackEdgeViolation = false;
  var blackbarTreshold = GlobalVars.arDetect.blackLevel + Settings.arDetect.blackbarTreshold;
  
  var topEdgeCount = 0;
  var bottomEdgeCount = 0;
  
  
  for(sample of samples){
    // determine size of the square
    
    sampleStart = sample.col - halfSample;
    
    if(sampleStart < 0)
      sampleStart = 0;
    
    sampleWidth = (sample.col + halfSample >= canvasWidth) ? 
              (sample.col - canvasWidth + sampleWidthBase) : sampleWidthBase;

    // sample.top - 1 -> should be black (we assume a bit of margin in case of rough edges)
    // sample.top + 2 -> should be color
    // we must also check for negative values, which mean something went wrong.
    if(sample.top > 1){  
      // check whether black edge gets any non-black values. non-black -> insta fail      
      imageData = context.getImageData(sampleStart, sample.top - 1, sampleWidth, 1).data;
      
      for(var i = 0; i < imageData.length; i+= 4){
        if (imageData[i]   > blackbarTreshold ||
            imageData[i+1] > blackbarTreshold ||
            imageData[i+2] > blackbarTreshold ){
          blackEdgeViolation = true;
          
          if(Debug.debug && Debug.debugArDetect && Debug.arDetect.edgeDetect)
            console.log(("[ArDetect::_ard_edgeDetect] detected black edge violation at i="+i+"; sample.top="+sample.top + "\n--")/*, imageData, context.getImageData(sampleStart, sample.top - 2, sampleWidth, 1)*/);
          
          break;
        }
      }
      // if black edge isn't black, we don't check the image part either
      if(!blackEdgeViolation){
        imageData = context.getImageData(sampleStart, sample.top + 2, sampleWidth, 1).data;
        detections = 0;
        
        for(var i = 0; i < imageData.length; i+= 4){
          if (imageData[i]   > blackbarTreshold ||
              imageData[i+1] > blackbarTreshold ||
              imageData[i+2] > blackbarTreshold ){
            detections++;
          }
        }
        
        console.log("detections:",detections, imageData,  context.getImageData(sampleStart, sample.top - 2, sampleWidth, 1));
        
        if(detections >= detectionTreshold){
          console.log("detection!");
          
          if(edgeCandidatesTop[sample.top] != undefined)
            edgeCandidatesTop[sample.top].count++;
          else{
            topEdgeCount++; // only count distinct
            edgeCandidatesTop[sample.top] = {top: sample.top, count: 1};
          }
        }
      }
    }
    
    // sample.bottom -> should be black
    // sample.bottom-2 -> should be non-black
    if(sample.bottom > 0){
      imageData = context.getImageData(sampleStart, sample.bottom, sampleWidth, 1).data;
      
      for(var i = 0; i < imageData.length; i+= 4){
        if (imageData[i]   > blackbarTreshold ||
          imageData[i+1] > blackbarTreshold ||
          imageData[i+2] > blackbarTreshold ){
          blackEdgeViolation = true;
        console.log(("[ArDetect::_ard_edgeDetect] detected black edge violation at i="+i+"; sample.top="+sample.top + "\n--")/*, imageData, context.getImageData(sampleStart, sample.top - 2, sampleWidth, 1)*/);
        
        break;
          }
      }
      // if black edge isn't black, we don't check the image part either
      if(!blackEdgeViolation){
        imageData = context.getImageData(sampleStart, sample.bottom - 2, sampleWidth, 1).data;
        detections = 0;
        
        for(var i = 0; i < imageData.length; i+= 4){
          if (imageData[i]   > blackbarTreshold ||
            imageData[i+1] > blackbarTreshold ||
            imageData[i+2] > blackbarTreshold ){
            detections++;
            }
        }
        
        if(detections >= detectionTreshold){
          // use bottomRelative for ez sort
          
          console.log("detection!");
          
          if(edgeCandidatesBottom[sample.bottomRelative] != undefined)
            edgeCandidatesBottom[sample.bottomRelative].count++;
          else{
            bottomEdgeCount++; // only count distinct edges
            edgeCandidatesBottom[sample.bottomRelative] = {bottom: sample.bottom, bottomRelative: sample.bottomRelative, count: 1};
          }
        }
      }
    }
  }
  
  return {
    edgeCandidatesTop: edgeCandidatesTop,
    edgeCandidatesTopCount: topEdgeCount,
    edgeCandidatesBottom: edgeCandidatesBottom,
    edgeCandidatesBottomCount: bottomEdgeCount
  };
}

function _ard_edgePostprocess(edges, canvasHeight){
  var edgesTop = [];
  var edgesBottom = [];
  var alignMargin = canvasHeight * Settings.arDetect.allowedMisaligned;
  
  var missingEdge = edges.edgeCandidatesTopCount == 0 || edges.edgeCandidatesBottomCount == 0;
  
  // pretvorimo objekt v tabelo
  // convert objects to array
  
  console.log(edges.edgeCandidatesTop);
    
  if( edges.edgeCandidatesTopCount > 0){
    for(var e in edges.edgeCandidatesTop){
      var edge = edges.edgeCandidatesTop[e];
      edgesTop.push({distance: edge.top, count: edge.count});
    }
  }
  
  if( edges.edgeCandidatesBottomCount > 0){
    for(var e in edges.edgeCandidatesBottom){
      var edge = edges.edgeCandidatesBottom[e];
      edgesBottom.push({distance: edge.bottomRelative, absolute: edge.bottom, count: edge.count});
    }
  }
  
  console.log("count top:",edges.edgeCandidatesTopCount, "edges:", edges, "edgesTop[]", edgesTop);
  
  // če za vsako stran (zgoraj in spodaj) poznamo vsaj enega kandidata, potem lahko preverimo nekaj
  // stvari
  
  if(! missingEdge ){
  // predvidevamo, da je logo zgoraj ali spodaj, nikakor pa ne na obeh straneh hkrati.
  // če kanal logotipa/watermarka ni vključil v video, potem si bosta razdaliji (edge.distance) prvih ključev
  // zgornjega in spodnjega roba približno enaki  
  //
  // we'll assume that no youtube channel is rude enough to put channel logo/watermark both on top and the bottom
  // of the video. If logo's not included in the video, distances (edge.distance) of the first two keys should be
  // roughly equal. Let's check for that.
    if( edgesTop[0].distance >= edgesBottom[0].distance - alignMargin &&
        edgesTop[0].distance <= edgesBottom[0].distance + alignMargin ){
      
      var blackbarWidth = edgesTop[0].distance > edgesBottom[0].distance ? 
                          edgesTop[0].distance : edgesBottom[0].distance;
      
      return {status: "ar_known", blackbarWidth: blackbarWidth, guardLineTop: edgesTop[0].distance, guardLineBottom: edgesBottom[0].absolute };
    }
  
    // torej, lahko da je na sliki watermark. Lahko, da je slika samo ornh črna. Najprej preverimo za watermark
    // it could be watermark. It could be a dark frame. Let's check for watermark first.
    if( edgesTop[0].distance < edgesBottom[0].distance &&
        edgesTop[0].count    < edgesBottom[0].count    &&
        edgesTop[0].count    < GlobalVars.arDetect.sampleCols * Settings.arDetect.edgeDetection.logoTreshold){
      // možno, da je watermark zgoraj. Preverimo, če se kateri od drugih potencialnih robov na zgornjem robu
      // ujema s prvim spodnjim (+/- variance). Če je temu tako, potem bo verjetno watermark. Logo mora imeti
      // manj vzorcev kot navaden rob.
      
      if(edgesTop[0].length > 1){
        var lowMargin = edgesBottom[0].distance - alignMargin;
        var highMargin = edgesBottom[0].distance + alignMargin;
        
        for(var i = 1; i < edgesTop.length; i++){
          if(edgesTop[i].distance >= lowMargin && edgesTop[i].distance <= highMargin){
            // dobili smo dejanski rob. vrnimo ga
            // we found the actual edge. let's return that.
            var blackbarWidth = edgesTop[i].distance > edgesBottom[0].distance ? 
                                edgesTop[i].distance : edgesBottom[0].distance;
            
            return  {status: "ar_known", blackbarWidth: blackbarWidth, guardLineTop: edgesTop[i].distance, guardLineBottom: edgesBottom[0].absolute};
          }
        }
      }
    }
    if( edgesBottom[0].distance < edgesTop[0].distance &&
        edgesBottom[0].count    < edgesTop[0].count    &&
        edgesBottom[0].count    < GlobalVars.arDetect.sampleCols * Settings.arDetect.edgeDetection.logoTreshold){
      
      if(edgesBottom[0].length > 1){
        var lowMargin = edgesTop[0].distance - alignMargin;
        var highMargin = edgesTop[0].distance + alignMargin;
        
        for(var i = 1; i < edgesBottom.length; i++){
          if(edgesBottom[i].distance >= lowMargin && edgesTop[i].distance <= highMargin){
            // dobili smo dejanski rob. vrnimo ga
            // we found the actual edge. let's return that.
            var blackbarWidth = edgesBottom[i].distance > edgesTop[0].distance ? 
                                edgesBottom[i].distance : edgesTop[0].distance;
            
            return  {status: "ar_known", blackbarWidth: blackbarWidth, guardLineTop: edgesTop[0].distance, guardLineBottom: edgesBottom[0].absolute};
          }
        }
      }
    }
  }
  else{
    // zgornjega ali spodnjega roba nismo zaznali. Imamo še en trik, s katerim lahko poskusimo 
    // določiti razmerje stranic
    // either the top or the bottom edge remains undetected, but we have one more trick that we
    // can try. It also tries to work around logos.
    
    var edgeDetectionTreshold = GlobalVars.arDetect.sampleCols * Settings.arDetect.edgeDetection.singleSideConfirmationTreshold;
    
    if(edges.edgeCandidatesTopCount == 0 && edges.edgeCandidatesBottomCount != 0){
      for(var edge of edgesBottom){
        if(edge.count >= edgeDetectionTreshold)
          return {status: "ar_known", blackbarWidth: edge.distance, guardLineTop: null, guardLineBottom: edge.bottom}
      }
    }
    if(edges.edgeCandidatesTopCount != 0 && edges.edgeCandidatesBottomCount == 0){
      for(var edge of edgesTop){
        if(edge.count >= edgeDetectionTreshold)
          return {status: "ar_known", blackbarWidth: edge.distance, guardLineTop: edge.top, guardLineBottom: null}
      }
    }
  }
  // če pridemo do sem, nam ni uspelo nič. Razmerje stranic ni znano
  // if we reach this bit, we have failed in determining aspect ratio. It remains unknown.
  return {status: "ar_unknown"}
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

var _ard_resetBlackLevel = function(){
  GlobalVars.arDetect.blackLevel = Settings.arDetect.blackLevel_default;
}

var _ard_isRunning = function(){
  return ! this._halted;
}

function _ard_getTimeout(baseTimeout, startTime){
  baseTimeout -= (performance.now() - startTime);

  return baseTimeout > Settings.arDetect.minimumTimeout ? baseTimeout : Settings.arDetect.minimumTimeout;
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
  isRunning: _ard_isRunning,
  resetBlackLevel: _ard_resetBlackLevel
}
