if(Debug.debug)
  console.log("Loading: ArDetect");

var _ard_console_stop = "background: #000; color: #f41";
var _ard_console_start = "background: #000; color: #00c399";

var _ard_currentAr;


var _ard_setup_timer;
var _ard_timer

// kjer vzemamo vzorce za blackbox/stuff. 9 vzorcev. Če spremenimo velikost vzorca, moramo spremeniti tudi vrednosti v tej tabeli
// vrednosti v tabeli so na osminskih intervalih od [0, <sample height << 2> - 4].
// we sample these lines in blackbox/stuff. 9 samples. If we change the canvas sample size, we have to correct these values as well
// samples are every eighth between [0, <sample height << 2> - 4].
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
  var samplingIntervalPx = parseInt(GlobalVars.canvas.height / ExtensionConf.arDetect.samplingInterval)
  for(var i = 1; i < ExtensionConf.arDetect.samplingInterval; i++){
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
  
  if(vid === undefined || vid === null){
    _ard_setup_timer = setTimeout(_arSetup, 1000);
    return;
  }
  
  // imamo video, pa tudi problem. Ta problem bo verjetno kmalu popravljen, zato setup začnemo hitreje kot prej
  // we have a video, but also a problem. This problem will prolly be fixed very soon, so setup is called with
  // less delay than before
  if(vid.videoWidth === 0 || vid.videoHeight === 0 ){
    if(! _ard_timer)
      _ard_setup_timer = setTimeout(_arSetup, 100);
    
    return;
  }
  
  // things to note: we'll be keeping canvas in memory only. 
  GlobalVars.arDetect.canvas = document.createElement("canvas");
  
  _ard_canvasWidth = cwidth ? cwidth : ExtensionConf.arDetect.hSamples;
  _ard_canvasHeight = cheight ? cheight : ExtensionConf.arDetect.vSamples;
  
  if(Debug.showArDetectCanvas){
    GlobalVars.arDetect.canvas.style.position = "absolute";
    GlobalVars.arDetect.canvas.style.left = "200px";
    GlobalVars.arDetect.canvas.style.top = "1200px";
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
    var ncol = ExtensionConf.arDetect.staticSampleCols;
    var nrow = ExtensionConf.arDetect.staticSampleRows;
    
    var colSpacing = _ard_canvasWidth / ncol;
    var rowSpacing = (_ard_canvasHeight << 2) / nrow;
    
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
    console.log("%c[ArDetect::_arSetup] something went terribly wrong when calcuating sample colums.", ExtensionConf.colors.criticalFail);
    console.log("settings object:", Settings);
    console.log("error:", ex);
  }
  
  // we're also gonna reset this
  GlobalVars.arDetect.guardLine.top = null;
  GlobalVars.arDetect.guardLine.bottom = null;
  
  _ard_resetBlackLevel();
  this._forcehalt = false;
  // if we're restarting ArDetect, we need to do this in order to force-recalculate aspect ratio
  GlobalVars.lastAr = {type: "auto", ar: null};
  GlobalVars.canvas.context = context;
  GlobalVars.canvas.width = canvasWidth;
  GlobalVars.canvas.height = canvasHeight;
  GlobalVars.canvas.imageDataRowLength = canvasWidth << 2;
  GlobalVars.arDetect.noLetterboxCanvasReset = false;
  
//   GlobalVars.correctedVideoDimensions.height = null;
//   GlobalVars.correctedVideoDimensions.width = null;
//   GlobalVars.correctedVideoDimensions.top = null;
//   GlobalVars.correctedVideoDimensions.left = null;
//   
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
    if(edge_h > 1 && edge_h <= ExtensionConf.arDetect.fallbackMode.noTriggerZonePx )
      return;
    
    // safety border so we can detect aspect ratio widening
    trueHeight += (ExtensionConf.arDetect.fallbackMode.safetyBorderPx << 1);
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
    
    if (arDiff < trueAr * ExtensionConf.arDetect.allowedArVariance){
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














var clearTimeoutCount = 0;

var _ard_vdraw = function (timeout, force_reset){
  // don't allow more than 1 instance
  if(_ard_timer){ 
    ++clearTimeoutCount;
    clearTimeout(_ard_timer);
  }
  
  _ard_timer = setTimeout(function(){
    _ard_timer = null;
    _ard_vdraw_but_for_reals();
  },
  timeout);
}

var executions = 0;

// if(Debug.debug){
//   setInterval(function(){
//     console.log("STATS FOR LAST SECOND\nexecutions:", executions,"; vdraw timeouts cleared:", clearTimeoutCount);
//     executions = 0;
//     clearTimeoutCount = 0;
//   }, 1000);
// }

var _ard_vdraw_but_for_reals = function() {
  // thanks dude:
  // https://www.reddit.com/r/iiiiiiitttttttttttt/comments/80qnss/i_tried_to_write_something_that_would/duyfg53/
  // except this method stops working as soon as I try to do something with the image :/
  
  ++executions;
  
  if(this._forcehalt)
    return;

  if(! GlobalVars.video){
    if(Debug.debug || Debug.warnings_critical)
      console.log("[ArDetect::_ard_vdraw] Video went missing. Stopping current instance of automatic detection and trying to start a new one.")
    _ard_stop();
    this._forcehalt = true;
    _arSetup();
    return;
  }
  
  var fallbackMode = false;
  var startTime = performance.now();
  var baseTimeout = ExtensionConf.arDetect.timer_playing;
  var triggerTimeout;
  
  var guardLineResult = true;         // true if success, false if fail. true by default
  var imageDetectResult = false;      // true if we detect image along the way. false by default
  
  var sampleCols = [];
  for(var i in  _ard_sampleCols){
    sampleCols[i] = _ard_sampleCols[i];
  }
  
  var how_far_treshold = 8; // how much can the edge pixel vary (*4)
  
  if(GlobalVars.video == null || GlobalVars.video.ended || Status.arStrat != "auto"){
    // we slow down if ended, null, or not auto. Detecting is pointless.
    
    _ard_vdraw(ExtensionConf.arDetect.timer_paused);
    return false;
  }
  
  if(GlobalVars.video.paused){
    // if the video is paused, we still do autodetection. We just increase the interval.
    baseTimeout = ExtensionConf.arDetect.timer_paused;
  }
  
  
  
  try{
    GlobalVars.canvas.context.drawImage(GlobalVars.video, 0,0, GlobalVars.canvas.width, GlobalVars.canvas.height);
  }
  catch(ex){
    if(Debug.debug)
      console.log("%c[ArDetect::_ard_vdraw] can't draw image on canvas. Trying canvas.drawWindow instead", "color:#000; backgroud:#f51;", ex);
    
    try{
      if(! ExtensionConf.arDetect.fallbackMode.enabled)
        throw "fallbackMode is disabled.";
      
      if(_ard_canvasReadyForDrawWindow()){
        GlobalVars.canvas.context.drawWindow(window, _ard_canvasDrawWindowHOffset, 0, GlobalVars.canvas.width, GlobalVars.canvas.height, "rgba(0,0,0,1)");
        
        if(Debug.debug)
          console.log("%c[ArDetect::_ard_vdraw] canvas.drawImage seems to have worked", "color:#000; backgroud:#2f5;");
        fallbackMode = true;
      }
      else{
        // canvas needs to be resized, so let's change setup
        _ard_stop();
        
        var newCanvasWidth = window.innerHeight * (GlobalVars.video.videoWidth / GlobalVars.video.videoHeight);
        var newCanvasHeight = window.innerHeight;
        
        if(ExtensionConf.miscFullscreenSettings.videoFloat == "center")
          _ard_canvasDrawWindowHOffset = Math.round((window.innerWidth - newCanvasWidth) * 0.5);
        else if(ExtensionConf.miscFullscreenSettings.videFloat == "left")
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
      
      _ard_vdraw( ExtensionConf.arDetect.timer_error );
      return;  
    }
  }

  if(GlobalVars.arDetect.blackLevel == undefined){
    if(Debug.debugArDetect)
      console.log("[ArDetect::_ard_vdraw] black level undefined, resetting");
    
    _ard_resetBlackLevel();
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
    colOffset_r = sampleCols[i] << 2;
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
    colOffset_r = (rowOffset + sampleCols[i]) << 2;
    colOffset_g = colOffset_r + 1;
    colOffset_b = colOffset_r + 2;
    
    currentMax_a = image[colOffset_r] > image[colOffset_g] ? image[colOffset_r] : image[colOffset_g];
    currentMax_a = currentMax_a > image[colOffset_b] ? currentMax_a : image[colOffset_b];
    
    currentMaxVal = currentMaxVal > currentMax_a ? currentMaxVal : currentMax_a;
    
    currentMin_a = image[colOffset_r] < image[colOffset_g] ? image[colOffset_r] : image[colOffset_g];
    currentMin_a = currentMin_a < image[colOffset_b] ? currentMin_a : image[colOffset_b];
    
    if(currentMinVal == undefined && currenMinVal != undefined)
      currentMinVal = currentMin_a;
    else if(currentMin_a != undefined)
      currentMinVal = currentMinVal < currentMin_a ? currentMinVal : currentMin_a;
    
  }
  
  // save black level only if defined
  if(currentMinVal != undefined)
    GlobalVars.arDetect.blackLevel = GlobalVars.arDetect.blackLevel < currentMinVal ? GlobalVars.arDetect.blackLevel : currentMinVal;

  // this means we don't have letterbox
  if ( currentMaxVal > (GlobalVars.arDetect.blackLevel + ExtensionConf.arDetect.blackbarTreshold) || (currentMaxVal - currentMinVal) > ExtensionConf.arDetect.blackbarTreshold ){
    
    // Če ne zaznamo letterboxa, kličemo reset. Lahko, da je bilo razmerje stranic popravljeno na roke. Možno je tudi,
    // da je letterbox izginil.
    // If we don't detect letterbox, we reset aspect ratio to aspect ratio of the video file. The aspect ratio could
    // have been corrected manually. It's also possible that letterbox (that was there before) disappeared.
    if(Debug.debug){
      console.log("%c[ArDetect::_ard_vdraw] no edge detected. canvas has no edge.", "color: #aaf");
    }
    
    image = null;
    
    // Pogledamo, ali smo že kdaj ponastavili CSS. Če še nismo, potem to storimo. Če smo že, potem ne.
    // Ponastavimo tudi guardline (na null). 
    // let's chec if we ever reset CSS. If we haven't, then we do so. If we did, then we don't.
    // while resetting the CSS, we also reset guardline top and bottom back to null.
    
    if(! GlobalVars.arDetect.noLetterboxCanvasReset){
      Resizer.reset();
      GlobalVars.lastAr = {type: "auto", ar: null};
      GlobalVars.arDetect.guardLine.top = null;
      GlobalVars.arDetect.guardLine.bottom = null;
      GlobalVars.arDetect.noLetterboxCanvasReset = true;
    }
    triggerTimeout = _ard_getTimeout(baseTimeout, startTime);
    _ard_vdraw(triggerTimeout); //no letterbox, no problem
    return;
  }
  
  // Če preverjamo naprej, potem moramo postaviti to vrednost nazaj na 'false'. V nasprotnem primeru se bo
  // css resetiral enkrat na video/pageload namesto vsakič, ko so za nekaj časa obrobe odstranejene
  // if we look further we need to reset this value back to false. Otherwise we'll only get CSS reset once
  // per video/pageload instead of every time letterbox goes away (this can happen more than once per vid)
  GlobalVars.arDetect.noLetterboxCanvasReset = false;
  
  console.log("ping!")


  // let's do a quick test to see if we're on a black frame
  // TODO: reimplement but with less bullshit
    
  // poglejmo, če obrežemo preveč.
  // let's check if we're cropping too much (or whatever)
  var guardLineOut;
  var imageDetectOut;
  
  if(ExtensionConf.arDetect.guardLine.enabled){
  
    guardLineOut = _ard_guardLineCheck(image, fallbackMode);
    
    guardLineResult = guardLineOut.success;    
    if(! guardLineResult ){ // add new ssamples to our sample columns
      for(var col of guardLineOut.offenders){
        sampleCols.push(col)
      }
    }
    
    imageDetectOut = _ard_guardLineImageDetect(image, fallbackMode);
    imageDetectResult = imageDetectOut.success;
    
    // če sta obe funkciji uspeli, potem se razmerje stranic ni spremenilo.
    // if both succeed, then aspect ratio hasn't changed.    
    
    // if we're in fallback mode, we restore CSS
    if(fallbackMode && ! guardLineResult){
      delete image;
      
      Resizer.reset();
      GlobalVars.lastAr = {type: "auto", ar: null};
      GlobalVars.arDetect.guardLine.top = null;
      GlobalVars.arDetect.guardLine.bottom = null;
      GlobalVars.arDetect.noLetterboxCanvasReset = true;
      
      triggerTimeout = _ard_getTimeout(baseTimeout, startTime);
      _ard_vdraw(triggerTimeout); //no letterbox, no problem
      return;
    }
    
    if(imageDetectResult && guardLineResult){
      delete image;
      triggerTimeout = _ard_getTimeout(baseTimeout, startTime);
      _ard_vdraw(triggerTimeout); //no letterbox, no problem
      return;
    }
    
  }
  
  // će se razmerje stranic spreminja iz ožjega na širšega, potem najprej poglejmo za prisotnostjo navpičnih črnih obrob.
  // če so prisotne navpične obrobe tudi na levi in desni strani, potlej obstaja možnost, da gre za logo na črnem ozadju.
  // v tem primeru obstaja nevarnost, da porežemo preveč. Ker obstaja dovolj velika možnost, da bi porezali preveč, rajši
  // ne naredimo ničesar.
  //
  // If aspect ratio changes from narrower to wider, we first check for presence of pillarbox. Presence of pillarbox indicates
  // a chance of a logo on black background. We could cut easily cut too much. Because there's a somewhat significant chance
  // that we will cut too much, we rather avoid doing anything at all. There's gonna be a next chance.
  if(! imageDetectResult){
    if(pillarTest(image)){
      console.log("pillarboxing, doing jack shit")
      delete image;
      triggerTimeout = _ard_getTimeout(baseTimeout, startTime);
      _ard_vdraw(triggerTimeout);
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
  
//   console.log("SAMPLES:", blackbarSamples, "candidates:", edgeCandidates, "post:", edgePost,"\n\nblack level:",GlobalVars.arDetect.blackLevel, "tresh:", GlobalVars.arDetect.blackLevel + ExtensionConf.arDetect.blackbarTreshold);
  
  if(edgePost.status == "ar_known"){
    // zaznali smo rob — vendar pa moramo pred obdelavo še preveriti, ali ni "rob" slučajno besedilo. Če smo kot rob pofočkali
    // besedilo, potem to ni veljaven rob. Razmerja stranic se zato ne bomo pipali.
    // we detected an edge — but before we process it, we need to check if the "edge" isn't actually some text. If the detected
    // edge is actually some text on black background, we shouldn't touch the aspect ratio. Whatever we detected is invalid.
    var textEdge = false;;

    if(edgePost.guardLineTop != null){
      var row = edgePost.guardLineTop + ~~(GlobalVars.canvas.height * ExtensionConf.arDetect.textLineTest.testRowOffset);
      textEdge |= textLineTest(image, row);
    }
    if(edgePost.guardLineTop != null){
      var row = edgePost.guardLineTop - ~~(GlobalVars.canvas.height * ExtensionConf.arDetect.textLineTest.testRowOffset);
      textEdge |= textLineTest(image, row);
    }

    if(!textEdge){
      _ard_processAr(GlobalVars.video, GlobalVars.canvas.width, GlobalVars.canvas.height, edgePost.blackbarWidth, null, fallbackMode);
    
      // we also know edges for guardline, so set them
      GlobalVars.arDetect.guardLine.top = edgePost.guardLineTop;
      GlobalVars.arDetect.guardLine.bottom = edgePost.guardLineBottom;
    }
    else{
      console.log("detected text on edges, dooing nothing")
    }

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

var pillarTest = function(image){
  // preverimo, če na sliki obstajajo navpične črne obrobe. Vrne 'true' če so zaznane (in če so približno enako debele), 'false' sicer.
  // true vrne tudi, če zaznamo preveč črnine.
  //                             <==XX(::::}----{::::)XX==>
  // checks the image for presence of vertical pillars. Less accurate than 'find blackbar limits'. If we find a non-black object that's
  // roughly centered, we return true. Otherwise we return false.
  // we also return true if we detect too much black

  var blackbarTreshold, upper, lower;
  blackbarTreshold = GlobalVars.arDetect.blackLevel + ExtensionConf.arDetect.blackbarTreshold;


  var middleRowStart = (GlobalVars.canvas.height >> 1) * GlobalVars.canvas.width;
  var middleRowEnd = middleRowStart + GlobalVars.canvas.width - 1;

  var rowStart = middleRowStart << 2;
  var midpoint = (middleRowStart + (GlobalVars.canvas.width >> 1)) << 2
  var rowEnd = middleRowEnd << 2;

  var edge_left = -1; edge_right = -1;

  // preverimo na levi strani
  // let's check for edge on the left side
  for(var i = rowStart; i < midpoint; i+=4){
    if(image[i] > blackbarTreshold || image[i+1] > blackbarTreshold || image[i+2] > blackbarTreshold){
      edge_left = (i - rowStart) >> 2;
      break;
    }
  }

  // preverimo na desni strani
  // check on the right
  for(var i = rowEnd; i > midpoint; i-= 4){
    if(image[i] > blackbarTreshold || image[i+1] > blackbarTreshold || image[i+2] > blackbarTreshold){
      edge_right =  GlobalVars.canvas.width - ((i - rowStart) >> 2);
      break;
    }
  }

  // če je katerikoli -1, potem imamo preveč črnine
  // we probably have too much black if either of those two is -1
  if(edge_left == -1 || edge_right == -1){
    return true;
  }

  // če sta oba robova v mejah merske napake, potem vrnemo 'false'
  // if both edges resemble rounding error, we retunr 'false'
  if(edge_left < ExtensionConf.arDetect.pillarTest.ignoreThinPillarsPx && edge_right < ExtensionConf.arDetect.pillarTest.ignoreThinPillarsPx){
    return false;
  }

  var edgeError = ExtensionConf.arDetect.pillarTest.allowMisaligned;
  var error_low = 1 - edgeError;
  var error_hi = 1 + edgeError;

  // če sta 'edge_left' in 'edge_right' podobna/v mejah merske napake, potem vrnemo true — lahko da smo našli logo na sredini zaslona
  // if 'edge_left' and 'edge_right' are similar enough to each other, we return true. If we found a logo in a black frame, we could
  // crop too eagerly 
  if( (edge_left * error_low) < edge_right &&
      (edge_left * error_hi) > edge_right  ){
    return true;
  }

  // če se ne zgodi nič od neštetega, potem nismo našli problemov
  // if none of the above, we haven't found a problem
  return false;
}

var textLineTest = function(image, row){
  // preverimo, če vrstica vsebuje besedilo na črnem ozadju. Če ob pregledu vrstice naletimo na veliko sprememb
  // iz črnega v ne-črno, potem obstaja možnost, da gledamo besedilo. Prisotnost take vrstice je lahko znak, da 
  // zaznano razmerje stranic ni veljavno
  //
  // vrne 'true' če zazna text, 'false' drugače.
  //
  // 
  // check if line contains any text. If line scan reveals a lot of changes from black to non-black there's a 
  // chance we're looking at text on a black background. If we detect text near what we think is an edge of the
  // video, there's a good chance we're about to incorrectly adjust the aspect ratio.
  // 
  // returns 'true' if text is detected, 'false' otherwise

  var blackbarTreshold = GlobalVars.arDetect.blackLevel + ExtensionConf.arDetect.blackbarTreshold;
  var nontextTreshold = GlobalVars.canvas.width * ExtensionConf.arDetect.textLineTest.nonTextPulse;

  var rowStart = (row * GlobalVars.canvas.width) << 2;
  var rowEnd = rowStart + (GlobalVars.canvas.width << 2);

  var pulse = false;
  var currentPulseLength = 0, pulseCount = 0;
  var pulses = [];
  var longestBlack = 0;

  // preglejmo vrstico
  // analyse the row
  for(var i = rowStart; i < rowEnd; i+= 4){
    if(pulse){
      if(image[i] < blackbarTreshold || image[i+1] < blackbarTreshold || image[i+2] < blackbarTreshold){
        // pulses.push(currentPulseLength);
        pulseCount++;
        pulse = false;
        currentPulseLength = 0;
      }
      else{
        currentPulseLength++;
        
        // če najdemo dovolj dolgo zaporedje ne-črnih točk, potem vrnemo 'false' — dobili smo legitimen rob
        // if we find long enough uninterrupted line of non-black point, we fail the test. We found a legit edge.
        if(currentPulseLength > nontextTreshold){
          return false;
        }
      }
    }
    else{
      if(image[i] > blackbarTreshold || image[i+1] > blackbarTreshold || image[i+2] > blackbarTreshold){
        if(currentPulseLength > longestBlack){
          longestBlack = currentPulseLength;
        }
        pulse = true;
        currentPulseLength = 0;
      }
      else{
        currentPulseLength++;
      }
    }
  }
  if(pulse){
    pulseCount++;
    // pulses.push(currentPulseLength);
  }

  // pregledamo rezultate:
  // analyse the results
  console.log("pulse test:\n\npulses:", pulseCount, "longest black:", longestBlack);

  // če smo zaznali dovolj pulzov, potem vrnemo res
  // if we detected enough pulses, we return true
  if(pulseCount > ExtensionConf.arDetect.textLineTest.pulsesToConfirm){
    return true;
  }

  // če je najdaljša neprekinjena črta črnih pikslov širša od polovice širine je merilo za zaznavanje
  // besedila rahlo milejše
  // if the longest uninterrupted line of black pixels is wider than half the width, we use a more
  // forgiving standard for determining if we found text
  if( longestBlack > (GlobalVars.canvas.width >> 1) && 
      pulseCount   > ExtensionConf.arDetect.textLineTest.pulsesToConfirmIfHalfBlack ){
    return true;
  }

  // če pridemo do sem, potem besedilo ni bilo zaznano
  // if we're here, no text was detected
  return false;
}

var _ard_guardLineCheck = function(image, fallbackMode){
  // this test tests for whether we crop too aggressively
  
  // if this test is passed, then aspect ratio probably didn't change from wider to narrower. However, further
  // checks are needed to determine whether aspect ratio got wider.
  // if this test fails, it returns a list of offending points.
  
  // if the upper edge is null, then edge hasn't been detected before. This test is pointless, therefore it
  // should succeed by default. Also need to check bottom, for cases where only one edge is known
  
  if(! fallbackMode){
    if(GlobalVars.arDetect.guardLine.top == null || GlobalVars.arDetect.guardLine.bottom == null)
      return { success: true };
    
    var edges = GlobalVars.arDetect.guardLine;  
  }
  var blackbarTreshold = GlobalVars.arDetect.blackLevel + ExtensionConf.arDetect.blackbarTreshold;
  
  var offset = parseInt(GlobalVars.canvas.width * ExtensionConf.arDetect.guardLine.ignoreEdgeMargin) << 2;
  
  var offenders = [];
  var firstOffender = -1;
  var offenderCount = -1; // doing it this way means first offender has offenderCount==0. Ez index.
  
  // TODO: implement logo check.
  
  
  // preglejmo obe vrstici
  // check both rows
  
  if(! fallbackMode){
    var edge_upper = edges.top - ExtensionConf.arDetect.guardLine.edgeTolerancePx;
    if(edge_upper < 0)
      return {success: true}; // if we go out of bounds here, the black bars are negligible
      
      var edge_lower = edges.bottom + ExtensionConf.arDetect.guardLine.edgeTolerancePx;
    if(edge_lower > GlobalVars.canvas.height - 1)
      return {success: true}; // if we go out of bounds here, the black bars are negligible
  }
  else{
    // fallback mode is a bit different
    edge_upper = 0;
    edge_lower = GlobalVars.canvas.height - 1;
  }
  
  var rowStart, rowEnd;
  
  
  // <<<=======| checking upper row |========>>>
  
  rowStart = ((edge_upper * GlobalVars.canvas.width) << 2) + offset;
  rowEnd = rowStart + ( GlobalVars.canvas.width << 2 ) - (offset * 2);
  
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
  
  rowStart = ((edge_lower * GlobalVars.canvas.width) << 2) + offset;
  rowEnd = rowStart + ( GlobalVars.canvas.width << 2 ) - (offset * 2);
  
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
  
  var sampleWidthBase = ExtensionConf.arDetect.edgeDetection.sampleWidth << 2; // corrected so we can work on imagedata
  var halfSample = sampleWidthBase * 0.5;
  var detections;
  var detectionTreshold = ExtensionConf.arDetect.edgeDetection.detectionTreshold;
  var canvasWidth = GlobalVars.canvas.width;
  var canvasHeight = GlobalVars.canvas.height;
  
  var sampleStart, sampleEnd, loopEnd;
  var sampleRow_black, sampleRow_color;
  
  var blackEdgeViolation = false;
  var blackbarTreshold = GlobalVars.arDetect.blackLevel + ExtensionConf.arDetect.blackbarTreshold;
  
  var topEdgeCount = 0;
  var bottomEdgeCount = 0;
  
  
  for(sample of samples.res_top){
    blackEdgeViolation = false; // reset this
    
    // determine our bounds. Note that sample.col is _not_ corrected for imageData, but halfSample is
    sampleStart = (sample.col << 2) - halfSample;
    
    if(sampleStart < 0)
      sampleStart = 0;
    
    sampleEnd = sampleStart + sampleWidthBase;
    if(sampleEnd > GlobalVars.canvas.imageDataRowLength)
      sampleEnd = GlobalVars.canvas.imageDataRowLength;
    
    // calculate row offsets for imageData array
    sampleRow_black = (sample.top - ExtensionConf.arDetect.edgeDetection.edgeTolerancePx) * GlobalVars.canvas.imageDataRowLength;
    sampleRow_color = (sample.top + 1 + ExtensionConf.arDetect.edgeDetection.edgeTolerancePx) * GlobalVars.canvas.imageDataRowLength;
    
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
    sampleStart = (sample.col << 2) - halfSample;
    
    if(sampleStart < 0)
      sampleStart = 0;
    
    sampleEnd = sampleStart + sampleWidthBase;
    if(sampleEnd > GlobalVars.canvas.imageDataRowLength)
      sampleEnd = GlobalVars.canvas.imageDataRowLength;
    
    // calculate row offsets for imageData array
    sampleRow_black = (sample.bottom + ExtensionConf.arDetect.edgeDetection.edgeTolerancePx) * GlobalVars.canvas.imageDataRowLength;
    sampleRow_color = (sample.bottom - 1 - ExtensionConf.arDetect.edgeDetection.edgeTolerancePx) * GlobalVars.canvas.imageDataRowLength;
    
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
  
  var colsTreshold = cols.length * ExtensionConf.arDetect.edgeDetection.minColsForSearch;
  if(colsTreshold == 0)
    colsTreshold = 1;
  
  blackbarTreshold = GlobalVars.arDetect.blackLevel + ExtensionConf.arDetect.blackbarTreshold;
  
  // if guardline didn't fail and imageDetect did, we don't have to check the upper few pixels
  // but only if upper and lower edge are defined. If they're not, we need to check full height
  //   if(GlobalVars.arDetect.guardLine.top != null || GlobalVars.arDetect.guardLine.bottom != null){
  //     if(guardLineResult && !imageDetectResult){
  //       upper_top = GlobalVars.arDetect.guardline.top;
  //       upper_bottom = (GlobalVars.canvas.height * 0.5) - parseInt(GlobalVars.canvas.height * ExtensionConf.arDetect.edgeDetection.middleIgnoredArea);
  //       
  //       lower_top = (GlobalVars.canvas.height * 0.5) + parseInt(GlobalVars.canvas.height * ExtensionConf.arDetect.edgeDetection.middleIgnoredArea);
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
  //       upper_bottom = (GlobalVars.canvas.height * 0.5) - parseInt(GlobalVars.canvas.height * ExtensionConf.arDetect.edgeDetection.middleIgnoredArea);
  //       
  //       lower_top = (GlobalVars.canvas.height * 0.5) + parseInt(GlobalVars.canvas.height * ExtensionConf.arDetect.edgeDetection.middleIgnoredArea);
  //       lower_bottom = GlobalVars.canvas.height;
  //     }
  //   }
  //   else{
  upper_top = 0;
  upper_bottom = (GlobalVars.canvas.height * 0.5) /*- parseInt(GlobalVars.canvas.height * ExtensionConf.arDetect.edgeDetection.middleIgnoredArea);*/
  
  lower_top = (GlobalVars.canvas.height * 0.5) /*+ parseInt(GlobalVars.canvas.height * ExtensionConf.arDetect.edgeDetection.middleIgnoredArea);*/
  lower_bottom = GlobalVars.canvas.height - 1;
  //   }
  
  
  var upper_top_corrected = upper_top * GlobalVars.canvas.imageDataRowLength;
  var upper_bottom_corrected = upper_bottom * GlobalVars.canvas.imageDataRowLength;
  var lower_top_corrected = lower_top * GlobalVars.canvas.imageDataRowLength;
  var lower_bottom_corrected = lower_bottom * GlobalVars.canvas.imageDataRowLength;
  
  
  var tmpI;
  for(var i = upper_top_corrected; i < upper_bottom_corrected; i+= GlobalVars.canvas.imageDataRowLength){
    for(var col of cols_a){
      tmpI = i + (col << 2);
      
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
      tmpI = i + (col << 2);
      
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

var _ard_guardLineImageDetect = function(image, fallbackMode){  
  if(GlobalVars.arDetect.guardLine.top == null || GlobalVars.arDetect.guardLine.bottom == null)
    return { success: false };
  
  var blackbarTreshold = GlobalVars.arDetect.blackLevel + ExtensionConf.arDetect.blackbarTreshold;
  var edges = GlobalVars.arDetect.guardLine;  
  
  var offset = parseInt(GlobalVars.canvas.width * ExtensionConf.arDetect.guardLine.ignoreEdgeMargin) << 2;
    
  // TODO: implement logo check.
  
  
  // preglejmo obe vrstici - tukaj po pravilih ne bi smeli iti prek mej platna. ne rabimo preverjati
  // check both rows - by the rules and definitions, we shouldn't go out of bounds here. no need to check, then
  
  //   if(fallbackMode){
  //     var edge_upper = ExtensionConf.arDetect.fallbackMode.noTriggerZonePx;
  //     var edge_lower = GlobalVars.canvas.height - ExtensionConf.arDetect.fallbackMode.noTriggerZonePx - 1;
  //   }
  //   else{
      var edge_upper = edges.top + ExtensionConf.arDetect.guardLine.edgeTolerancePx;
      var edge_lower = edges.bottom - ExtensionConf.arDetect.guardLine.edgeTolerancePx;
  //   }
  
  // koliko pikslov rabimo zaznati, da je ta funkcija uspe. Tu dovoljujemo tudi, da so vsi piksli na enem
  // robu (eden izmed robov je lahko v celoti črn)
  // how many non-black pixels we need to consider this check a success. We only need to detect enough pixels
  // on one edge (one of the edges can be black as long as both aren't)
  var successTreshold = parseInt(GlobalVars.canvas.width * ExtensionConf.arDetect.guardLine.imageTestTreshold);
  var rowStart, rowEnd;
  
  
  // <<<=======| checking upper row |========>>>
  
  rowStart = ((edge_upper * GlobalVars.canvas.width) << 2) + offset;
  rowEnd = rowStart + ( GlobalVars.canvas.width << 2 ) - (offset * 2);
  
  
  
  for(var i = rowStart; i < rowEnd; i+=4){
    if(image[i] > blackbarTreshold || image[i+1] > blackbarTreshold || image[i+2] > blackbarTreshold){
      if(successTreshold --<= 0){
        return {success: true}
      }
    }    
  }
  
  
  // <<<=======| checking lower row |========>>>
  
  rowStart = ((edge_lower * GlobalVars.canvas.width) << 2) + offset;
  rowEnd = rowStart + ( GlobalVars.canvas.width << 2 ) - (offset * 2);
  
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
  var alignMargin = canvasHeight * ExtensionConf.arDetect.allowedMisaligned;
  
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
  
  // console.log("count top:",edges.edgeCandidatesTopCount, "edges:", edges, "edgesTop[]", edgesTop);
  
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
        edgesTop[0].count    < GlobalVars.arDetect.sampleCols * ExtensionConf.arDetect.edgeDetection.logoTreshold){
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
        edgesBottom[0].count    < GlobalVars.arDetect.sampleCols * ExtensionConf.arDetect.edgeDetection.logoTreshold){
      
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
    
    var edgeDetectionTreshold = GlobalVars.arDetect.sampleCols * ExtensionConf.arDetect.edgeDetection.singleSideConfirmationTreshold;
    
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
  GlobalVars.arDetect.blackLevel = ExtensionConf.arDetect.blackLevel_default;
}

var _ard_isRunning = function(){
  return ! this._halted;
}

function _ard_getTimeout(baseTimeout, startTime){
//   baseTimeout -= (performance.now() - startTime);

//   return baseTimeout > ExtensionConf.arDetect.minimumTimeout ? baseTimeout : ExtensionConf.arDetect.minimumTimeout;
  
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
