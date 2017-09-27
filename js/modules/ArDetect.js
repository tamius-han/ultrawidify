if(Debug.debug)
  console.log("Loading: ArDetect");

// global-ish variables
var _ard_oldAr;
var _ard_currentAr;

// kjer vzemamo vzorce za blackbox/stuff. 9 vzorcev. Če spremenimo velikost vzorca, moramo spremeniti tudi vrednosti v tej tabeli
// vrednosti v tabeli so na osminskih intervalih od [0, <sample height * 4> - 4].
// we sample these lines in blackbox/stuff. 9 samples. If we change the canvas sample size, we have to correct these values as well
// samples are every eighth between [0, <sample height * 4> - 4].
var _ard_sampleLines = [ 0, 360, 720, 1080, 1440, 1800, 2160, 2520, 2876]




// **** FUNCTIONS **** //

var _arSetup = function(){
  var vid = document.getElementsByTagName("video")[0];
  
  if(vid === undefined){
    setTimeout(_arSetup, 1000);
    return;
  }
  
  var canvas = document.createElement("canvas");
  canvas.style.position = "absolute";
  
  //todo: change those values to push canvas off-screen
  
   
  canvas.style.top = "1080px";
  canvas.style.zIndex = 10000;
  
//   var test = document.getElementsByClassName("content style-scope ytd-video-secondary-info-renderer")[0]
  var test = document.getElementsByTagName("body")[0];
  test.appendChild(canvas);
  
  console.log("test: ", test, "vid: ", vid, "canvas: ", canvas);
  
//       vid.append(canvas);
  var context = canvas.getContext("2d");
  
  
  // do setup once
  // tho we could do it for every frame
  var canvasScaleFactor =  1280 / vid.videoWidth;
  var canvasWidth = vid.videoWidth * canvasScaleFactor;
  var canvasHeight = vid.videoHeight * canvasScaleFactor;
  
  
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  
  // init oldAr to physical <video> aspect ratio
  
  _ard_oldAr = vid.videoWidth / vid.videoHeight;
  _ard_currentAr = _ard_oldAr;
  
  _ard_vdraw(vid, context, canvasWidth, canvasHeight, false);
};




var _ard_processAr = function(video, width, height, edge_h, edge_w){
  // width, height —> canvas/sample
  
  //edge_w -—> null/undefined, because we don't autocorrect pillarbox yet

  // if we don't specify these things, they'll have some default values.
  if(edge_h === undefined){
    edge_h = 0;
    edge_w = 0;
  }
  
  var letterbox = 2 * edge_h;
  var trueHeight = height - letterbox;
  
  
  
  
  var trueAr = width / trueHeight;
  
  
  // poglejmo, če se je razmerje stranic spremenilo
  // check if aspect ratio is changed:
  var arDiff = trueAr - _ard_oldAr;
  if (arDiff < 0)
    arDiff = -arDiff;
  
  // ali je sprememba v mejah dovoljenega? Če da -> fertik
  // is ar variance within acceptable levels? If yes -> we done
  if (arDiff < trueAr * Settings.arDetect.allowedVariance)
    return;
  
  // če je sprememba več od dovoljenega, spremeni razmerje stranic. Stvari se razlikujejo glede na to, ali smo v fullscreen ali ne
  // if change is greater than allowed, change the aspect ratio.  Whether we do that depends on whether we're in fullscreen.
  if( FullScreenDetect.isFullScreen() ){
    if(Debug.debug)
      console.log("[ArDetect::_ard_processAr] attempting to fix aspect ratio. New aspect ratio: ", trueAr);
      
    _ard_oldAr = trueAr;
    Resizer.setAr_fs(trueAr);
  }
  
}

var _ard_vdraw = function (vid, context, w, h, conf){
  var blackbar_tresh = 10;  // how non-black can the bar be
  var how_far_treshold = 8; // how much can the edge pixel vary (*4)
  var msec_pause = 333;     // how long is the pause between two executions — 33ms ~ 30fps
  
  if(vid === undefined || vid.paused || vid.ended){
    // we slow down if paused, no detection
    setTimeout(_ard_vdraw, 3000, vid, context, w, h);
    return false;
  }
  
  
  context.drawImage(vid, 0,0, w, h);
  
  // "random" columns — todo: randomly pick some more
  var rc = [ 128, 256, 384, 512, 640, 768, 896, 1024, 1125 ];


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
    isLetter &= (cols[i][4] <= blackbar_tresh && cols[i][5] <= blackbar_tresh && cols[i][6] <= blackbar_tresh);
    // should also check bottom
  }

  console.log("11");
  
  if(!isLetter){
    // tudi če ne zaznamo letterboxa, še vedno poženemo processAr. Lahko, da smo v preteklosti popravili letterbox, to pa moramo
    // sedaj razveljaviti
    // even if we don't deect letterbox, we still issue processAr in case we adjusted for letterbox earlier and need to exit
    // corrected mode.
    _ard_processAr(vid, w, h);
    
    setTimeout(_ard_vdraw, msec_pause, vid, context, w, h); //no letterbox, no problem
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
  
  console.log("22");
  
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

  console.log("33");
  
  
  if(blackPoints > (blackPointsMax >> 1)){
    // if more than half of those points are black, we consider the entire frame black (or too dark to get anything useful
    // out of it, anyway)
    setTimeout(_ard_vdraw, msec_pause, vid, context, w, h); //no letterbox, no problem
    return;
  }

  console.log("color_uppermost:",color_uppermost,"color_lowermost:",color_lowermost);
  
  if( color_lowermost == 8 || color_uppermost == 0){
    // zakaj smo potem sploh tukaj?
    // why exactly are we here again?
    
    _ard_processAr(vid, w, h);
    setTimeout(_ard_vdraw, msec_pause, vid, context, w, h); //no letterbox, no problem
    return;
  }
  
  console.log("44");
  
  
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
        
        console.log("detecting value higher than blackbar_tresh!");
        
        tmpEndPixel = j >> 2;
        break;
      }
      j += 4;
    }
    
    endPixelTop.push(tmpEndPixel);
  }
  
  console.log("777");
  
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
  
  console.log("888");
  
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
  
  console.log("pixels top: ", topPixel, "pixels bottom:", (h-bottomPixel), " (", bottomPixel,") — difference: ",letterDiff,"max allowed difference:", (h * Settings.arDetect.allowedMisaligned), "(",h,Settings.arDetect.allowedMisaligned,"), isLetter:",isLetter, "\n\n all candidates (top):", endPixelTop, "(bottom):",endPixelBottom);
  
  if(isLetter)
    _ard_processAr(vid, w, h, topPixel);
  
  setTimeout(_ard_vdraw, msec_pause, vid, context, w, h);
}





var ArDetect = {
  arSetup: _arSetup,
  vdraw: _ard_vdraw,
  arChangedCallback: function() {}
}
