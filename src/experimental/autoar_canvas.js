// this script should work but it crashes firefox instead.

var vid = document.getElementsByTagName("video")[0];
var canvas = document.createElement("canvas");
canvas.style.position = "absolute";
canvas.style.top = "1080px";
canvas.style.width = "1280";
canvas.style.height = "720";
canvas.style.zIndex = 10000;
canvas.width = 1280;
canvas.height = 720;

test = document.getElementsByClassName("content style-scope ytd-video-secondary-info-renderer")[0]
test.appendChild(canvas);
var context = canvas.getContext("2d");



function vdraw(vid, context, w, h, bb){
  var blackbar_tresh = 10;  // how non-black can the bar be
  var how_far_treshold = 8; // how much can the edge pixel vary (*4)
  var msec_pause = 333;     // how long is the pause between two executions — 33ms ~ 30fps
  
  if(vid.paused || vid.ended){
    // we slow down if paused
    setTimeout(vdraw, 300, vid, context, w, h);
    return false;
  }
  
  context.drawImage(vid, 0,0, 1280, 720, 0, 0, canvas.width, canvas.height);
  
  // "random" columns — todo: randomly pick about 10 of those
  var rc = [ 4, 9, 42, 69 ];
  
  
  var cimg = [];
  var cols = []; 
  
  for(var i = 0; i < rc.length; i++){
                                  //where-x, where-y, how wide, how tall
                                  //random col, first y, 1 pix wide, all pixels tall 
    cimg[i] = context.getImageData(rc[i], 0, 1, canvas.height);
    cols[i] = context.getImageData(rc[i], 0, 1, canvas.height).data;
  }
  
  // fast test to see if video is full screen
  isLetter=true;
  for(var i in cols){
    // if any of those points fails this check, we aren't letterboxed
    isLetter &= (cols[i][4] <= blackbar_tresh && cols[i][5] <= blackbar_tresh && cols[i][6] <= blackbar_tresh);
    // should also check bottom
  }
  
  console.log("letterbox " + (isLetter?"potentially detected, making further tests":"not detected"));
  
  if(!isLetter){
    setTimeout(vdraw, msec_pause, vid, context, w, h, isLetter); //no letterbox, no problem
    return;
  }
  
  // let's see where black bars end
  
  var endPixelTop    = [];  // where the black bar ends.
  var endPixelBottom = [];
  
  var bottomLimit = 0;
  
  for(var i in cols){
    bottomLimit = cols[i].length - 1;
    
    // check the top pixel
    endPixelTop[i] = -1;
    
    var cls = cols[i].length - 4;
    var cls_quarter = cls >> 2;
    for(var j = 0; j < cls_quarter; j += 4){
      if(cols[i][j] > blackbar_tresh && cols[i][j+1] > blackbar_tresh && cols[i][j+2] > blackbar_tresh){
        endPixelTop[i] = j >> 2; // equal to division by 4
        break;
      }
    }
    
    if(endPixelTop[i] == -1) // this pretty much means we've reached the bottom while still not detecting
      continue;              // picture, so we get out.
    
    // check for bottom pixel
    
    cls_quarter = bottomLimit - cls_quarter;
    
    for(bottomLimit -= 5; bottomLimit => cls_quarter; bottomLimit -= 4){
      if(cols[i][bottomLimit] > blackbar_tresh && cols[i][bottomLimit+1] > blackbar_tresh && cols[i][bottomLimit+2] > blackbar_tresh ){
        endPixelBottom[i] = j >> 2;
        break;
      }
    }
  }
  
  // debug only — set test cols to red:
  //for(var i in cols){
  //  for(var j = 0; j < cols[i].length; j+=4){
  //    cols[i][j] = 255;
  //  }
  //  //context.putImageData(cols[i], rc[i], 0);
  //}

  var blackFrame = true;
  for(var i in endPixelTop){
    blackFrame &= endPixelTop[i] == -1;
  }
  
  if(blackFrame){
    console.log("black frame detected, doing nothing");
    setTimeout(vdraw, msec_pause, vid, context, w, h, blackFrame); //no letterbox, no problem
    return;
  }
  
  // check if black borders match; if the line isn't horizontal we could be looking at an object in
  // the actual video that shouldn't be cropped out.
  // TODO: disregard values with -1 in case of pillarbox
  isLetter = true;
  sampleLength = endPixelTop.length - 1;
  for(var i = 0; i < sampleLength; i++){
    isLetter &= endPixelTop[i] == endPixelTop[i+1];
    isLetter &= endPixelBottom[i] == endPixelBottom[i+1];
  }
  
  console.log("letterbox " + (isLetter?("detected — upper bar width: " + endPixelTop[0] + "px"):"not detected"));
  setTimeout(vdraw, msec_pause, vid, context, w, h, isLetter);
}

vdraw(vid, context, 1280, 720, false);
