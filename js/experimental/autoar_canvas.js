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



function vdraw(vid, context, w, h){
  var blackbar_tresh = 10;  // how non-black can the bar be
  var how_far_treshold = 8; // how much can the edge pixel vary (*4)
  var msec_pause = 333;     // how long is the pause between two executions — 33ms ~ 30fps
  
  console.log("1");
  if(vid === undefined || vid.paused || vid.ended){
    // we slow down if paused
    setTimeout(vdraw, 300, vid, context, w, h);
    return false;
  }
  
  console.log("2");
  context.drawImage(vid, 0,0, canvas.width, canvas.height);
  console.log("3");
  // "random" columns — todo: randomly pick about 10 of those
  var rc = [ 4, 9, 42, 69 ];
  
  
  var cimg = [];
  var cols = []; 
  
  for(var i = 0; i < rc.length; i++){
                                  //where-x, where-y, how wide, how tall
                                  //random col, first y, 1 pix wide, all pixels tall 
    cols[i] = context.getImageData(rc[i], 0, 1, canvas.height).data;
  }
  console.log("4");
  // fast test to see if video is full screen
  isLetter=true;
  for(var i in cols){
    // if any of those points fails this check, we aren't letterboxed
    isLetter &= (cols[i][4] <= blackbar_tresh && cols[i][5] <= blackbar_tresh && cols[i][6] <= blackbar_tresh);
    // should also check bottom
  }
  
  console.log("letterbox " + (isLetter?"potentially detected, making further tests":"not detected (there's pixels on upper edge!)"));
  console.log("5");
  if(!isLetter){
    setTimeout(vdraw, msec_pause, vid, context, w, h); //no letterbox, no problem
    return;
  }
  
  // let's do a quick test to see if we're on a black frame
  // let's also pick all points in advance (assuming canvas will always be 1280x720)
  
  
  var blackPoints = 0;
  var blackPointsMax = cols.length * 8; // 8 we sample each col at 8 different places
  
  for(var i in cols){                                          // 360
    if( cols[i][0] < blackbar_tresh && cols[i][2] < blackbar_tresh && cols[i][1] < blackbar_tresh )
      blackPoints++;
    if( cols[i][360] < blackbar_tresh && cols[i][361] < blackbar_tresh && cols[i][362] < blackbar_tresh )
      blackPoints++;
    if( cols[i][720] < blackbar_tresh && cols[i][721] < blackbar_tresh && cols[i][722] < blackbar_tresh )
      blackPoints++;
    if( cols[i][1080] < blackbar_tresh && cols[i][1081] < blackbar_tresh && cols[i][1082] < blackbar_tresh )
      blackPoints++;
    if( cols[i][1440] < blackbar_tresh && cols[i][1441] < blackbar_tresh && cols[i][1442] < blackbar_tresh )
      blackPoints++;
    if( cols[i][1800] < blackbar_tresh && cols[i][1801] < blackbar_tresh && cols[i][1802] < blackbar_tresh )
      blackPoints++;
    if( cols[i][2160] < blackbar_tresh && cols[i][2162] < blackbar_tresh && cols[i][2163] < blackbar_tresh )
      blackPoints++;
    if( cols[i][2876] < blackbar_tresh && cols[i][2877] < blackbar_tresh && cols[i][2878] < blackbar_tresh )
      blackPoints++;
  }
  
  if(blackPoints > (blackPointsMax >> 2) ){
    // if more than half of those points are black, we consider the entire frame black (or too dark to get anything useful
    // out of it, anyway)
    console.log("black frame detected, doing nothing");
    setTimeout(vdraw, msec_pause, vid, context, w, h); //no letterbox, no problem
    return;
  }
  
  
  // let's see where black bars end
  
  var endPixelTop    = [];  // where the black bar ends.
  var endPixelBottom = [];
  
  var bottomLimit = 0;
  
  
  for(var i in cols){
    bottomLimit = cols[i].length - 1;

    // define default value for both
    endPixelTop[i] = -1;
    endPixelBottom[i] = -1;
    
    // check the top pixel
    var cls = cols[i].length - 4;
    var cls_quarter = cls >> 2;
    for(var j = 0; j < cls_quarter - 4; j += 4){
      if(cols[i][j] > blackbar_tresh && cols[i][j+1] > blackbar_tresh && cols[i][j+2] > blackbar_tresh){
        endPixelTop[i] = j >> 2; // equal to division by 4
        break;
      }
    }
    
    if(endPixelTop[i] == -1)  // this means we must have a really exotic apect ratio, or the entire column is black
      continue;               // we'll go with a black column.
    
    
    // check for bottom pixel
//     cls_quarter = bottomLimit - cls_quarter;
    
    // NOTE: this sometimes causes browser to crash, keep commented. We'll assume some basic competence by the video
    //       makers and assume letterbox is always vertically centered.
//     for(bottomLimit -= 5; bottomLimit => cls_quarter; bottomLimit -= 4){
//       if(cols[i][bottomLimit] > blackbar_tresh && cols[i][bottomLimit+1] > blackbar_tresh && cols[i][bottomLimit+2] > blackbar_tresh ){
//         endPixelBottom[i] = j >> 2;
//         break;
//       }
//     }
  }
  console.log("7");

  
  // check if black borders match; if the line isn't horizontal we could be looking at an object in
  // the actual video that shouldn't be cropped out.
  // TODO: disregard values with -1 in case of pillarbox
  isLetter = true;
  sampleLength = endPixelTop.length - 1;
  for(var i = 0; i < sampleLength; i++){
    isLetter &= endPixelTop[i] == endPixelTop[i+1];
//     isLetter &= endPixelBottom[i] == endPixelBottom[i+1];
  }
  console.log("9");
  console.log("letterbox " + (isLetter?("detected — upper bar width: " + endPixelTop[0] + "px"):"cannot be confirmed — uneven edge (do nothing)"));
  setTimeout(vdraw, msec_pause, vid, context, w, h);
}

vdraw(vid, context, 1280, 720, false);
