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
var _ard_sampleCols = [];

var _ard_canvasWidth;
var _ard_canvasHeight;
var _ard_canvasDrawWindowHOffset = 0;

var localSettings = {};


// **** FUNCTIONS **** //

var _arSetup = function(cwidth, cheight){
  try{
  if(Debug.debug)
    console.log("%c[ArDetect::_ard_setup] Starting automatic aspect ratio detection", _ard_console_start);

  this._halted = false;
  
  // vstavimo začetne stolpce v _ard_sampleCols. 
  // let's insert initial columns to _ard_sampleCols
  _ard_sampleCols = [];
  var samplingIntervalPx = parseInt(GlobalVars.canvas.height / Settings.arDetect.samplingInterval)
  for(var i = 1; i < Settings.arDetect.samplingInterval; i++){
    _ard_sampleCols.push(i * samplingIntervalPx);
  }
  
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
  
  // things to note: we'll be keeping canvas in memory only. 
  GlobalVars.arDetect.canvas = document.createElement("canvas");
  
  _ard_canvasWidth = cwidth ? cwidth : Settings.arDetect.hSamples;
  _ard_canvasHeight = cheight ? cheight : Settings.arDetect.vSamples;
  
  if(Debug.showArDetectCanvas){
    GlobalVars.arDetect.canvas.style.position = "absolute";
    GlobalVars.arDetect.canvas.style.left = "200px";
    GlobalVars.arDetect.canvas.style.top = "1000px";
    GlobalVars.arDetect.canvas.style.zIndex = 10000;
    GlobalVars.arDetect.canvas.id = "uw_ArDetect_canvas";
    
    var test = document.getElementsByTagName("body")[0];
    test.appendChild(GlobalVars.arDetect.canvas);
  }
  
  
  
  var context = GlobalVars.arDetect.canvas.getContext("2d");
  
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
  
  GlobalVars.arDetect.canvas.width = canvasWidth;
  GlobalVars.arDetect.canvas.height = canvasHeight;
  
  
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
  GlobalVars.canvas.context = context;
  GlobalVars.canvas.width = canvasWidth;
  GlobalVars.canvas.height = canvasHeight;
  GlobalVars.canvas.imageDataRowLength = canvasWidth * 4;
  _ard_vdraw(0);
  }
  catch(ex){
    console.log(ex);
  }
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
















var _ard_vdraw = function (timeout){
  _ard_timer = setTimeout(function(){
    _ard_vdraw_but_for_reals();
  },
  timeout);
}

var executions = 0;

setInterval(function(){
  console.log("this many executions in last second:", executions);
  executions = 0;
}, 1000);

var _ard_vdraw_but_for_reals = function() {
  // thanks dude:
  // https://www.reddit.com/r/iiiiiiitttttttttttt/comments/80qnss/i_tried_to_write_something_that_would/duyfg53/
  // except this method stops working as soon as I try to do something with the image :/
  
  ++executions;
  
  if(this._forcehalt)
    return;
  
  var fallbackMode = false;
  var startTime = performance.now();
  var baseTimeout = Settings.arDetect.timer_playing;
  var triggerTimeout;
  
  var guardLineResult = true;         // true if success, false if fail. true by default
  var imageDetectResult = false;      // true if we detect image along the way. false by default
  
  var sampleCols = [];
  for(var i in  _ard_sampleCols){
    sampleCols[i] = _ard_sampleCols[i];
  }
  
  var how_far_treshold = 8; // how much can the edge pixel vary (*4)
  
  if(GlobalVars.video == null || GlobalVars.video.paused || GlobalVars.video.ended || Status.arStrat != "auto"){
    // we slow down if paused, no detection
    _ard_vdraw(Settings.arDetect.timer_paused);
    return false;
  }
  
  try{
    GlobalVars.canvas.context.drawImage(GlobalVars.video, 0,0, GlobalVars.canvas.width, GlobalVars.canvas.height);
  }
  catch(ex){
    if(Debug.debug)
      console.log("%c[ArDetect::_ard_vdraw] can't draw image on canvas. Trying canvas.drawWindow instead", "color:#000; backgroud:#f51;", ex);
    
    try{
      if(_ard_canvasReadyForDrawWindow()){
        context.drawWindow(window, _ard_canvasDrawWindowHOffset, 0, GlobalVars.canvas.width, GlobalVars.canvas.height, "rgba(0,0,0,1)");
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
      
      _ard_vdraw( Settings.arDetect.timer_error );
      return;  
    }
    
//     _ard_timer = setTimeout(_ard_vdraw, Settings.arDetect.timer_error, vid, context, w, h);
//     return;
  }

  // we get the entire frame so there's less references for garbage collection to catch
  var image = GlobalVars.canvas.context.getImageData(0,0,GlobalVars.canvas.width,GlobalVars.canvas.height).data;
  
  // fast test to see if aspect ratio is correct. If we detect anything darker than blackLevel, we modify 
  // blackLevel to the new lowest value
  var isLetter=true;
  var currentMaxVal = 0;
  var currentMax_a;
  var currentMinVal = 48; // not 255 cos safety, even this is prolly too high
  var currentMin_a;
  
  var rowOffset = 0;
  var colOffset_r, colOffset_g, colOffset_b;
  
  // detect black level. if currentMax and currentMin vary too much, we automatically know that 
  // black level is bogus and that we aren't letterboxed. We still save the darkest value as black level,
  // though — as black bars will never be brighter than that.
  
  for(var i = 0; i < sampleCols.length; ++i){
    colOffset_r = sampleCols[i] * 4;
    colOffset_g = colOffset_r + 1;
    colOffset_b = colOffset_r + 2;
    
    currentMax_a = image[colOffset_r] > image[colOffset_g] ? image[colOffset_r] : image[colOffset_g];
    currentMax_a = currentMax_a > image[colOffset_b] ? currentMax_a : image[colOffset_b];
    
    currentMaxVal = currentMaxVal > currentMax_a ? currentMaxVal : currentMax_a;
    
    currentMin_a = image[colOffset_r] < image[colOffset_g] ? image[colOffset_r] : image[colOffset_g];
    currentMin_a = currentMin_a < image[colOffset_b] ? currentMin_a : image[colOffset_b];
    
    currentMinVal = currentMinVal < currentMin_a ? currentMinVal : currentMin_a;
  }

  // we'll shift the sum. math says we can do this
  rowOffset = GlobalVars.canvas.width * (GlobalVars.canvas.height - 1); 
  
  for(var i = 0; i < sampleCols.length; ++i){
    colOffset_r = (rowOffset + sampleCols[i]) * 4;
    colOffset_g = colOffset_r + 1;
    colOffset_b = colOffset_r + 2;
    
    currentMax_a = image[colOffset_r] > image[colOffset_g] ? image[colOffset_r] : image[colOffset_g];
    currentMax_a = currentMax_a > image[colOffset_b] ? currentMax_a : image[colOffset_b];
    
    currentMaxVal = currentMaxVal > currentMax_a ? currentMaxVal : currentMax_a;
    
    currentMin_a = image[colOffset_r] < image[colOffset_g] ? image[colOffset_r] : image[colOffset_g];
    currentMin_a = currentMin_a < image[colOffset_b] ? currentMin_a : image[colOffset_b];
    
    currentMinVal = currentMinVal < currentMin_a ? currentMinVal : currentMin_a;
  }
  
  // save black level
  GlobalVars.arDetect.blackLevel = GlobalVars.arDetect.blackLevel < currentMinVal ? GlobalVars.arDetect.blackLevel : currentMinVal;

  // this means we don't have letterbox
  if ( currentMaxVal > (GlobalVars.arDetect.blackLevel + Settings.arDetect.blackbarTreshold) || (currentMaxVal - currentMinVal) > Settings.arDetect.blackbarTreshold ){
    
    // Če ne zaznamo letterboxa, kličemo reset. Lahko, da je bilo razmerje stranic popravljeno na roke. Možno je tudi,
    // da je letterbox izginil.
    // If we don't detect letterbox, we reset aspect ratio to aspect ratio of the video file. The aspect ratio could
    // have been corrected manually. It's also possible that letterbox (that was there before) disappeared.
    if(Debug.debug){
      console.log("%c[ArDetect::_ard_vdraw] no edge detected. canvas has no edge.", "color: #aaf");
    }
    
    
    image = null;
    
    Resizer.reset();
    GlobalVars.lastAr = {type: "auto", ar: null};
    
    triggerTimeout = _ard_getTimeout(baseTimeout, startTime);
    _ard_vdraw(triggerTimeout); //no letterbox, no problem
    return;
  }
  
  
  // let's do a quick test to see if we're on a black frame
  // TODO: reimplement but with less bullshit
    
  // poglejmo, če obrežemo preveč.
  // let's check if we're cropping too much (or whatever)
  var guardLineOut;
  var imageDetectOut;
  
  if(Settings.arDetect.guardLine.enabled){
    guardLineOut = _ard_guardLineCheck(image);
    guardLineResult = guardLineOut.success;
    
    if(! guardLineResult ){ // add new ssamples to our sample columns
      for(var col of guardLineOut.offenders){
        sampleCols.push(col)
      }
    }
    
    imageDetectOut = _ard_guardLineImageDetect(image);
    imageDetectResult = imageDetectOut.success;
    
    // če sta obe funkciji uspeli, potem se razmerje stranic ni spremenilo.
    // if both succeed, then aspect ratio hasn't changed.    
    if(imageDetectResult && guardLineResult){
      delete image;
      triggerTimeout = _ard_getTimeout(baseTimeout, startTime);
      _ard_vdraw(triggerTimeout); //no letterbox, no problem
      return;
    }
  }
  
  // pa poglejmo, kje se končajo črne letvice na vrhu in na dnu videa.
  // let's see where black bars end.
  GlobalVars.sampleCols_current = sampleCols.length;
  
  // blackSamples -> {res_top, res_bottom}
  var blackbarSamples = _ard_findBlackbarLimits(image, sampleCols, guardLineResult, imageDetectResult);
  
  var edgeCandidates = _ard_edgeDetect(image, blackbarSamples);
  var edgePost = _ard_edgePostprocess(edgeCandidates, GlobalVars.canvas.height);
  
//   console.log("SAMPLES:", blackbarSamples, "candidates:", edgeCandidates, "post:", edgePost,"\n\nblack level:",GlobalVars.arDetect.blackLevel, "tresh:", GlobalVars.arDetect.blackLevel + Settings.arDetect.blackbarTreshold);
  
  if(edgePost.status == "ar_known"){
    _ard_processAr(GlobalVars.video, GlobalVars.canvas.width, GlobalVars.canvas.height, edgePost.blackbarWidth, null, fallbackMode);
    
    // we also know edges for guardline, so set them
    GlobalVars.arDetect.guardLine.top = edgePost.guardLineTop;
    GlobalVars.arDetect.guardLine.bottom = edgePost.guardLineBottom;
    
    delete image;
    triggerTimeout = _ard_getTimeout(baseTimeout, startTime);
    _ard_vdraw(triggerTimeout); //no letterbox, no problem
    return;
  }
  else{
    delete image;
    triggerTimeout = _ard_getTimeout(baseTimeout, startTime);
    _ard_vdraw(triggerTimeout); //no letterbox, no problem
    return;
  }
  
  delete image;
}




var _ard_guardLineCheck = function(image){
  // this test tests for whether we crop too aggressively
  
  // if this test is passed, then aspect ratio probably didn't change from wider to narrower. However, further
  // checks are needed to determine whether aspect ratio got wider.
  // if this test fails, it returns a list of offending points.
  
  // if the upper edge is null, then edge hasn't been detected before. This test is pointless, therefore it
  // should succeed by default. Also need to check bottom, for cases where only one edge is known
  
  if(GlobalVars.arDetect.guardLine.top == null || GlobalVars.arDetect.guardLine.bottom == null)
    return { success: true };
  
  var blackbarTreshold = GlobalVars.arDetect.blackLevel + Settings.arDetect.blackbarTreshold;
  var edges = GlobalVars.arDetect.guardLine;  
  
  
  var offset = parseInt(GlobalVars.canvas.width * Settings.arDetect.guardLine.ignoreEdgeMargin) * 4;
  
  var offenders = [];
  var firstOffender = -1;
  var offenderCount = -1; // doing it this way means first offender has offenderCount==0. Ez index.
  
  // TODO: implement logo check.
  
  
  // preglejmo obe vrstici
  // check both rows
  
  var edge_upper = edges.top - Settings.arDetect.guardLine.edgeTolerancePx;
  if(edge_upper < 0)
    return {success: true}; // if we go out of bounds here, the black bars are negligible
    
    var edge_lower = edges.bottom + Settings.arDetect.guardLine.edgeTolerancePx;
  if(edge_lower > GlobalVars.canvas.height - 1)
    return {success: true}; // if we go out of bounds here, the black bars are negligible
    
    var rowStart, rowEnd;
  
  
  // <<<=======| checking upper row |========>>>
  
  rowStart = ((edge_upper * GlobalVars.canvas.width) * 4) + offset;
  rowEnd = rowStart + ( GlobalVars.canvas.width * 4 ) - (offset * 2);
  
  for(var i = rowStart; i < rowEnd; i+=4){
    
    // we track sections that go over what's supposed to be a black line, so we can suggest more 
    // columns to sample
    if(image[i] > blackbarTreshold || image[i+1] > blackbarTreshold || image[i+2] > blackbarTreshold){
      if(firstOffender < 0){
        firstOffender = (i * 0.25) - rowStart;
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
  
  
  // <<<=======| checking lower row |========>>>
  
  rowStart = ((edge_lower * GlobalVars.canvas.width) * 4) + offset;
  rowEnd = rowStart + ( GlobalVars.canvas.width * 4 ) - (offset * 2);
  
  for(var i = rowStart; i < rowEnd; i+=4){    
    // we track sections that go over what's supposed to be a black line, so we can suggest more 
    // columns to sample
    if(image[i] > blackbarTreshold || image[i+1] > blackbarTreshold || image[i+2] > blackbarTreshold){
      if(firstOffender < 0){
        firstOffender = (i * 0.25) - rowStart;
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
var _ard_edgeDetect = function(image, samples){
  var edgeCandidatesTop = {};
  var edgeCandidatesBottom = {};
  
  var sampleWidthBase = Settings.arDetect.edgeDetection.sampleWidth * 4; // corrected so we can work on imagedata
  var halfSample = sampleWidthBase * 0.5;
  var detections;
  var detectionTreshold = Settings.arDetect.edgeDetection.detectionTreshold;
  var canvasWidth = GlobalVars.canvas.width;
  var canvasHeight = GlobalVars.canvas.height;
  
  var sampleStart, sampleEnd, loopEnd;
  var sampleRow_black, sampleRow_color;
  
  var blackEdgeViolation = false;
  var blackbarTreshold = GlobalVars.arDetect.blackLevel + Settings.arDetect.blackbarTreshold;
  
  var topEdgeCount = 0;
  var bottomEdgeCount = 0;
  
  
  for(sample of samples.res_top){
    blackEdgeViolation = false; // reset this
    
    // determine our bounds. Note that sample.col is _not_ corrected for imageData, but halfSample is
    sampleStart = (sample.col * 4) - halfSample;
    
    if(sampleStart < 0)
      sampleStart = 0;
    
    sampleEnd = sampleStart + sampleWidthBase;
    if(sampleEnd > GlobalVars.canvas.imageDataRowLength)
      sampleEnd = GlobalVars.canvas.imageDataRowLength;
    
    // calculate row offsets for imageData array
    sampleRow_black = (sample.top - Settings.arDetect.edgeDetection.edgeTolerancePx) * GlobalVars.canvas.imageDataRowLength;
    sampleRow_color = (sample.top + 1 + Settings.arDetect.edgeDetection.edgeTolerancePx) * GlobalVars.canvas.imageDataRowLength;
    
    // že ena kršitev črnega roba pomeni, da kandidat ni primeren
    // even a single black edge violation means the candidate is not an edge
    loopEnd = sampleRow_black + sampleEnd;
    for(var i = sampleRow_black + sampleStart; i < loopEnd; i += 4){
      if( image[i  ] > blackbarTreshold ||
          image[i+1] > blackbarTreshold ||
          image[i+2] > blackbarTreshold ){
        blackEdgeViolation = true;
      break;
        }
    }
    
    // če je bila črna črta skrunjena, preverimo naslednjega kandidata
    // if we failed, we continue our search with the next candidate
    if(blackEdgeViolation)
      continue;
    
    detections = 0;
    loopEnd = sampleRow_color + sampleEnd;
    for(var i = sampleRow_color + sampleStart; i < loopEnd; i += 4){
      if( image[i  ] > blackbarTreshold ||
        image[i+1] > blackbarTreshold ||
        image[i+2] > blackbarTreshold ){
        ++detections;
        }
    }
    if(detections >= detectionTreshold){
      if(edgeCandidatesTop[sample.top] != undefined)
        edgeCandidatesTop[sample.top].count++;
      else{
        topEdgeCount++; // only count distinct
        edgeCandidatesTop[sample.top] = {top: sample.top, count: 1};
      }
    }
  }
  
  for(sample of samples.res_bottom){
    blackEdgeViolation = false; // reset this
    
    // determine our bounds. Note that sample.col is _not_ corrected for imageData, but halfSample is
    sampleStart = (sample.col * 4) - halfSample;
    
    if(sampleStart < 0)
      sampleStart = 0;
    
    sampleEnd = sampleStart + sampleWidthBase;
    if(sampleEnd > GlobalVars.canvas.imageDataRowLength)
      sampleEnd = GlobalVars.canvas.imageDataRowLength;
    
    // calculate row offsets for imageData array
    sampleRow_black = (sample.bottom + Settings.arDetect.edgeDetection.edgeTolerancePx) * GlobalVars.canvas.imageDataRowLength;
    sampleRow_color = (sample.bottom - 1 - Settings.arDetect.edgeDetection.edgeTolerancePx) * GlobalVars.canvas.imageDataRowLength;
    
    // že ena kršitev črnega roba pomeni, da kandidat ni primeren
    // even a single black edge violation means the candidate is not an edge
    loopEnd = sampleRow_black + sampleEnd;
    for(var i = sampleRow_black + sampleStart; i < loopEnd; i += 4){
      if( image[i  ] > blackbarTreshold ||
        image[i+1] > blackbarTreshold ||
        image[i+2] > blackbarTreshold ){
        blackEdgeViolation = true;
      break;
        }
    }
    
    // če je bila črna črta skrunjena, preverimo naslednjega kandidata
    // if we failed, we continue our search with the next candidate
    if(blackEdgeViolation)
      continue;
    
    detections = 0;
    loopEnd = sampleRow_color + sampleEnd;
    for(var i = sampleRow_color + sampleStart; i < loopEnd; i += 4){
      if( image[i  ] > blackbarTreshold ||
        image[i+1] > blackbarTreshold ||
        image[i+2] > blackbarTreshold ){
        ++detections;
        }
    }
    if(detections >= detectionTreshold){
      if(edgeCandidatesBottom[sample.bottom] != undefined)
        edgeCandidatesBottom[sample.bottom].count++;
      else{
        bottomEdgeCount++; // only count distinct
        edgeCandidatesBottom[sample.bottom] = {bottom: sample.bottom, bottomRelative: sample.bottomRelative, count: 1};
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





var _ard_findBlackbarLimits = function(image, cols, guardLineResult, imageDetectResult){
  
  var upper_top, upper_bottom, lower_top, lower_bottom;
  var blackbarTreshold;
  
  var cols_a = cols;
  var cols_b = []
  
  for(var i in cols){
    cols_b[i] = cols_a[i] + 0;
  }
  
  var res_top = [];
  var res_bottom = [];
  
  var colsTreshold = cols.length * Settings.arDetect.edgeDetection.minColsForSearch;
  if(colsTreshold == 0)
    colsTreshold = 1;
  
  blackbarTreshold = GlobalVars.arDetect.blackLevel + Settings.arDetect.blackbarTreshold;
  
  // if guardline didn't fail and imageDetect did, we don't have to check the upper few pixels
  // but only if upper and lower edge are defined. If they're not, we need to check full height
  //   if(GlobalVars.arDetect.guardLine.top != null || GlobalVars.arDetect.guardLine.bottom != null){
  //     if(guardLineResult && !imageDetectResult){
  //       upper_top = GlobalVars.arDetect.guardline.top;
  //       upper_bottom = (GlobalVars.canvas.height * 0.5) - parseInt(GlobalVars.canvas.height * Settings.arDetect.edgeDetection.middleIgnoredArea);
  //       
  //       lower_top = (GlobalVars.canvas.height * 0.5) + parseInt(GlobalVars.canvas.height * Settings.arDetect.edgeDetection.middleIgnoredArea);
  //       lower_bottom = GlobalVars.arDetect.guardline.bottom;
  //     }
  //     else if(!guardLineResult && imageDetectResult){
  //       upper_top = 0;
  //       upper_bottom = GlobalVars.arDetect.guardline.top;
  //       
  //       lower_top = GlobalVars.arDetect.guardline.bottom;
  //       lower_bottom = GlobalVars.canvas.height;
  //     }
  //     else{
  //       // if they're both false or true (?? they shouldn't be, but let's handle it anyway because dark frames
  //       // could get confusing enough for that to happen), we go for default 
  //       upper_top = 0;
  //       upper_bottom = (GlobalVars.canvas.height * 0.5) - parseInt(GlobalVars.canvas.height * Settings.arDetect.edgeDetection.middleIgnoredArea);
  //       
  //       lower_top = (GlobalVars.canvas.height * 0.5) + parseInt(GlobalVars.canvas.height * Settings.arDetect.edgeDetection.middleIgnoredArea);
  //       lower_bottom = GlobalVars.canvas.height;
  //     }
  //   }
  //   else{
  upper_top = 0;
  upper_bottom = (GlobalVars.canvas.height * 0.5) /*- parseInt(GlobalVars.canvas.height * Settings.arDetect.edgeDetection.middleIgnoredArea);*/
  
  lower_top = (GlobalVars.canvas.height * 0.5) /*+ parseInt(GlobalVars.canvas.height * Settings.arDetect.edgeDetection.middleIgnoredArea);*/
  lower_bottom = GlobalVars.canvas.height - 1;
  //   }
  
  
  var upper_top_corrected = upper_top * GlobalVars.canvas.imageDataRowLength;
  var upper_bottom_corrected = upper_bottom * GlobalVars.canvas.imageDataRowLength;
  var lower_top_corrected = lower_top * GlobalVars.canvas.imageDataRowLength;
  var lower_bottom_corrected = lower_bottom * GlobalVars.canvas.imageDataRowLength;
  
  
  var tmpI;
  for(var i = upper_top_corrected; i < upper_bottom_corrected; i+= GlobalVars.canvas.imageDataRowLength){
    for(var col of cols_a){
      tmpI = i + (col * 4);
      
      if( image[tmpI]     > blackbarTreshold || 
        image[tmpI + 1] > blackbarTreshold ||
        image[tmpI + 2] > blackbarTreshold ){
        res_top.push({
          col: col,
          top: (i / GlobalVars.canvas.imageDataRowLength) - 1
        });
      cols_a.splice(cols_a.indexOf(col), 1);
        }
    }
    if(cols_a.length < colsTreshold)
      break;
  }
  
  
  for(var i = lower_bottom_corrected - GlobalVars.canvas.imageDataRowLength; i >= lower_top_corrected; i-= GlobalVars.canvas.imageDataRowLength){
    for(var col of cols_b){
      tmpI = i + (col * 4);
      
      
      if( image[tmpI]     > blackbarTreshold || 
        image[tmpI + 1] > blackbarTreshold ||
        image[tmpI + 2] > blackbarTreshold ){
        var bottom = (i / GlobalVars.canvas.imageDataRowLength) + 1;
      res_bottom.push({
        col: col,
        bottom: bottom,
        bottomRelative: GlobalVars.canvas.height - bottom
      });
      cols_b.splice(cols_a.indexOf(col), 1);
        }
    }
    if(cols_b.length < colsTreshold)
      break;
  }
  
  return {res_top: res_top, res_bottom: res_bottom};
}

var _ard_guardLineImageDetect = function(image){  
  if(GlobalVars.arDetect.guardLine.top == null || GlobalVars.arDetect.guardLine.bottom == null)
    return { success: false };
  
  var blackbarTreshold = GlobalVars.arDetect.blackLevel + Settings.arDetect.blackbarTreshold;
  var edges = GlobalVars.arDetect.guardLine;  
  
  
  var offset = parseInt(GlobalVars.canvas.width * Settings.arDetect.guardLine.ignoreEdgeMargin) * 4;
  
  var offenders = [];
  var firstOffender = -1;
  var offenderCount = -1; // doing it this way means first offender has offenderCount==0. Ez index.
  
  // TODO: implement logo check.
  
  
  // preglejmo obe vrstici - tukaj po pravilih ne bi smeli iti prek mej platna. ne rabimo preverjati
  // check both rows - by the rules and definitions, we shouldn't go out of bounds here. no need to check, then
  
  var edge_upper = edges.top + Settings.arDetect.guardLine.edgeTolerancePx;
  var edge_lower = edges.bottom - Settings.arDetect.guardLine.edgeTolerancePx;

  // koliko pikslov rabimo zaznati, da je ta funkcija uspe. Tu dovoljujemo tudi, da so vsi piksli na enem
  // robu (eden izmed robov je lahko v celoti črn)
  // how many non-black pixels we need to consider this check a success. We only need to detect enough pixels
  // on one edge (one of the edges can be black as long as both aren't)
  var successTreshold = parseInt(GlobalVars.canvas.width * Settings.arDetect.guardLine.imageTestTreshold);
  var rowStart, rowEnd;
  
  
  // <<<=======| checking upper row |========>>>
  
  rowStart = ((edge_upper * GlobalVars.canvas.width) * 4) + offset;
  rowEnd = rowStart + ( GlobalVars.canvas.width * 4 ) - (offset * 2);
  
  
  
  for(var i = rowStart; i < rowEnd; i+=4){
    if(image[i] > blackbarTreshold || image[i+1] > blackbarTreshold || image[i+2] > blackbarTreshold){
      if(successTreshold --<= 0){
        return {success: true}
      }
    }    
  }
  
  
  // <<<=======| checking lower row |========>>>
  
  rowStart = ((edge_lower * GlobalVars.canvas.width) * 4) + offset;
  rowEnd = rowStart + ( GlobalVars.canvas.width * 4 ) - (offset * 2);
  
  for(var i = rowStart; i < rowEnd; i+=4){
    if(image[i] > blackbarTreshold || image[i+1] > blackbarTreshold || image[i+2] > blackbarTreshold){
      if(successTreshold --<= 0){
        return {success: true}
      }
    }
    
  }
  
  return {success: false};
}

var _ard_edgePostprocess = function(edges, canvasHeight){
  var edgesTop = [];
  var edgesBottom = [];
  var alignMargin = canvasHeight * Settings.arDetect.allowedMisaligned;
  
  var missingEdge = edges.edgeCandidatesTopCount == 0 || edges.edgeCandidatesBottomCount == 0;
  
  // pretvorimo objekt v tabelo
  // convert objects to array
  
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
  
//   console.log("count top:",edges.edgeCandidatesTopCount, "edges:", edges, "edgesTop[]", edgesTop);
  
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
//   baseTimeout -= (performance.now() - startTime);

//   return baseTimeout > Settings.arDetect.minimumTimeout ? baseTimeout : Settings.arDetect.minimumTimeout;
  
  return baseTimeout;
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
