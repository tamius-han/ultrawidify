var extraClassAdded = false;
var inFullScreen = false;

var cssmod = "";
var zoomStep = 0.05;

var originalcss;

$(document).ready(function() {
  //   console.log("uw::document.ready | document is ready");
  var serviceArray = [".video-stream" ]; //Youtube 
  
  // To bo naš dinamičen css
  // this will be our dynamic css sheet
  
  $(document).keypress(function (event) {          // Tukaj ugotovimo, katero tipko smo pritisnili
    switch (event.key){
      case 'w':
        changeCSS("fitw");
        break;
      case 'e':
        changeCSS("fith");
        break;
      case 'r':
        changeCSS("reset");
        break;
      case 'z':
        changeCSS("zoom");
        break;
      case 'u':
        changeCSS("unzoom");
    }
  });
  //   console.log("uw::document.ready | loaded shortcuts");
  
  document.addEventListener("mozfullscreenchange", function( event ) {
    inFullScreen = ( window.innerHeight == window.screen.height && window.innerWidth == window.screen.width);
    inFullScreen ? onFullscreenOn() : onFullscreenOff();
  });
  
//   $("<style>")
//   .prop("type", "text/css")
//   .html(".neueVideo{ display: block !important; margin: 0px auto !important; position: relative !important; transform: none !important; left: 0px !important; }").appendTo("head");
//   
  //   console.log("uw::document.ready | created new CSS class");
});

function onFullscreenOn(){
  
// TODO: show buttons
//   var button_row = document.getElementsByClassName("ytp-right-controls")[0];
//   
//   console.log("uw:: Full screen is now on");
//   var t = document.createTextNode("but");
//   
//   var b_fitw = document.createElement('button');
//   
//   b_fitw.appendChild(t);
//   
//   
// //   b_fitw.id = "uw_b_fitw";
//   b_fitw.className = "ytp_button";
//   b_fitw.onclick = function() { changeCSS("fitw"); };
// //   b_fitw.appendChild("<img src='img/fitw.png' height='100%' />");
//   
//   button_row.appendChild(b_fitw);
//   
//   //   var b_fith = document.createElement('button');
//   
//   console.log("uw:: added buttons");
}
function onFullscreenOff(){
  //TODO: hide buttons
}

function changeCSS(what_do){
  
  // Če nismo na Youtube, bodo youtube videi v <iframe> elementu — zato najprej pogledamo, če
  // je element s fokusom iframe
  
  if(inIframe()){
    
    var player = document.getElementById("player");
    changeCSS_nofs(what_do, player);
    
    // to verjetno pomeni, da nismo na Youtube, zato zaključimo kar tukaj.
    // 
    // if we're controlling video in an iframe, that probably means we aren't on youtube
    // so we finish here.
    return;
  }
  
  // Velikost videa spreminjamo samo, če smo v celozaslonskem načinu ALI če NE pišemo komentarja
  // Videa ne spreminjamo tudi, če uporabljamo vrstico za iskanje.
  // 
  // We only change video size when we're in full screen OR if we are NOT writing a comment.
  // We also leave video alone if we're using the search bar
  
  var player = document.getElementById("movie_player");  
  if(inFullScreen || (
    (document.activeElement.getAttribute("role") != "textbox") &&
    (document.activeElement.getAttribute("type") != "text")
    ))
    changeCSS_nofs(what_do, player);
  
  
  
}

function changeCSS_nofs(what_do, player){
  
  var w;
  var h;
  var top;
  var left;
  
//     var player = $('[id*="player"]');
//   var player = document.getElementById("movie_player");
  /*
  if (player = null){
    console.log("uw::Player is null. retrying...");
    player = $('[id*="player"]');
  }*/
  
  var vs = document.getElementsByClassName("video-stream")[0];
  var vidwid = vs.scrollWidth;
  var vidhei = vs.scrollHeight;
  var ar = vidwid/vidhei;
    
  if(what_do == "reset"){
//     $(".video-stream").removeClass("neueVideo");    
    extraClassAdded = false;
    
    // popraviti je treba še širino, višino in top
    // we need to fix width, height and top
    
    var vidwid = document.getElementsByClassName("video-stream")[0].scrollWidth;
    var vidhei = document.getElementsByClassName("video-stream")[0].scrollHeight;
    var vidaspect = vidwid / vidhei;
    var scraspect = player.clientWidth / player.clientHeight;
    
    if( vidaspect > scraspect ){  // Video je širši od okna | video is wider than window
      w = player.clientWidth;
      h = player.clientWidth / vidwid * vidhei;
      
      top = (player.clientHeight - h) / 2;
      left = 0;
    }
    else{
      h = player.clientHeight;
      w = player.clientHeight / vidhei * vidwid;
      
      top = 0;   //itak zasedemo 100% višine
      left = (player.clientWidth - w) / 2;
    }
    
    top = top + "px";
    left = left + "px";
    w = w + "px";
    h = h + "px";
    
    $("video").css({"width": w,"height": h,"top": top, "left":left});
    return;
  }
  
  if(what_do == "fitw"){
    // Ker bi bilo lepo, da atribut 'top' spremenimo hkrati z width in height, moramo najprej naračunati,
    // za kakšen faktor se poviša višina. To potrebujemo, da se pravilno izračuna offset.
    // 
    //        100vw = window.innerWidth
    //    [1] window.innerWidth / videoWidth = x
    // 
    // Če pomnožimo videoHeight z x, dobimo novo višino videa. Nova višina videa je lahko večja ali manjša
    // kot višina ekrana. Če je višina videa manjša kot višina ekrana, bo top pozitiven, drugače negativen:
    // 
    //    [2] nvideoh = x * videoWidth
    //    [3] top = (window.innerHeight - nvideoh) / 2
    //
    // Z 2 delimo, ker hočemo video vertikalno poravnati.
    
    w = player.clientWidth;
    h = player.clientWidth / vidwid * vidhei;
    
    top = (player.clientHeight - h) / 2;
    left = 0;            // Ker zavzamemo vso širino | cos we take up all the width
  }
  
  if(what_do == "fith"){
    h = player.clientHeight;
    w = player.clientHeight / vidhei * vidwid;
    
    top = 0;   //itak zasedemo 100% višine
    left = (player.clientWidth - w) / 2;
  }
  
  if(what_do == "zoom"){    
    // Video povečujemo na tak način, da sta zoom in unzoom povečata oz. zmanjšata video za enak korak
    // We do this so zoom and unzoom steps change video sizes for the same amount
    
    h = vidhei + (player.clientHeight * zoomStep);
    w = vidwid + (player.clientHeight * zoomStep * ar);
    /* Zakaj računamo širino na tak način?
    // 
    // Predstavljajte si, da imamo 2100:900 video v 1600:900 škatli, zoomStep = 0.1. Če bi širino računali po formuli:
    // 
    //     širina = širina_videa + (širina zaslona * zoomStep)
    //     
    // Potem bi bila nova velikost videa 2260 x 990. Razmerje stranic: 2.28 (moglo bi biti 2.33 — video je popačen).
    // Zaradi tega novo širino rajši povečamo za razliko_v_višini * razmerje_stranic
    // 
    //     2100 + (900 * 0.1 * (2100/900)) =
    //                 2100 + (90 * 2.333) = 2310
    //
    // Razmerje stranic (2310x990) je tako 2.333 — tako, kot bi moglo biti.
    // 
    // 
    // ============================================================================================================
    // 
    // Why did we calculate width this way?
    // 
    // Imagine we have a 2100x900 video in a 1600:900 container, zoomStep = 0.1. If we calculated width using this:
    //
    //     width = video_width + (container_width * zoomStep)
    //     
    // then the new size would be 2260 x 990. This gives us an aspect ratio of 2.28 instead of 2.33 (which is what it
    // should be). Because of that we rather increase the width by delta_height * aspect_ratio:
    //
    //     2100 + (900 * 0.1 * (2100/900)) =
    //                 2100 + (90 * 2.333) = 2310 
    //
    // This gives us the correct aspect ratio and prevents video deformations.
    */
    
    top = (player.clientHeight - h)/2
    left = (player.clientWidth - w) / 2;
    
    if (h > player.clientHeight * 4){
      console.log("okay mate you took this shit way too far now. I'm not doing shit");
      return;
    }
  }
  
  if(what_do == "unzoom"){
    // Video povečujemo na tak način, da sta zoom in unzoom povečata oz. zmanjšata video za enak korak
    // We do this so zoom and unzoom steps change video sizes for the same amount
    h = vidhei - (player.clientHeight * zoomStep);
    w = vidwid - (player.clientHeight * zoomStep * ar);
    
    top = (player.clientHeight - h)/2
    left = (player.clientWidth - w) / 2;
    
    if (h < player.clientHeight * 0.25){
      console.log("don't you think this is small enough already? You don't need to resize the video all the way down to the size smaller than your penis.");
      console.log("(if you're a woman, substitute 'penis' with whatever the female equivalent is.)");
      return;
    }
  }
    
  top = top + "px";
  left = left + "px";
  w = w + "px";
  h = h + "px";
  
  $("video").css({"width": w,"height": h,"top": top, "left": left});
}

function inIframe () {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

// // Ta funkcija spreminja CSS v 'full screen' načinu. Is youtube-specific.
// // Včasih smo v fullscreen uporabljali to, zdaj uporabljamo changeCSS_nofs
// // ker je ta napisana za bolj splošen primer (in dela tudi na fullscreen).
// // 
// // This function modifies CSS in full screen. So far works on youtube.
// // We don't use it anymore because changeCSS_nofs also works on fullscreen.
// function changeCSS_fs(what_do){
//   
//   var w;
//   var h;
//   var top;
//   
//   // Če hočemo povrniti nastavitve na privzeto, samo pobrišemo naš css
//   // if we want to restore the default player we just clear our css
//   if(what_do == "reset"){
//     $(".video-stream").removeClass("neueVideo");    
//     extraClassAdded = false;
//     
//     // popraviti je treba še širino, višino in top
//     // we need to fix width, height and top
//     
//     var vidwid = document.getElementsByClassName("video-stream")[0].scrollWidth;
//     var vidhei = document.getElementsByClassName("video-stream")[0].scrollHeight;
//     var vidaspect = vidwid / vidhei;
//     var scraspect = window.innerWidth / window.innerHeight;
//     
//     if( vidaspect > scraspect ){  // Video je širši od okna | video is wider than window
//       w = "100vw";
//       h = "auto";
//       // Razlaga tegale je spodaj | this line of code is explained below
//       top = (window.innerHeight - ((window.innerWidth / vidwid) * vidhei)) / 2;
//       top = top + "px";
//       $("video").css({"width": w,"height": h,"top": top});
//     }
//     else{
//       w = "auto";
//       h = "100vh";
//       top = "0px";
//       $("video").css({"width": w,"height": h,"top": top});
//     }
//     
//     console.log("uw::changeCSS | reseting to default view");
//     return;
//   }
//   
//   if (!extraClassAdded){
//     $(".video-stream").addClass("neueVideo");
//     extraClassAdded = true;
//   }
//   
//   
//   
//   if(what_do == "fitw"){
//     // Ker bi bilo lepo, da atribut 'top' spremenimo hkrati z width in height, moramo najprej naračunati,
//     // za kakšen faktor se poviša višina. To potrebujemo, da se pravilno izračuna offset.
//     // 
//     //        100vw = window.innerWidth
//     //    [1] window.innerWidth / videoWidth = x
//     // 
//     // Če pomnožimo videoHeight z x, dobimo novo višino videa. Nova višina videa je lahko večja ali manjša
//     // kot višina ekrana. Če je višina videa manjša kot višina ekrana, bo top pozitiven, drugače negativen:
//     // 
//     //    [2] nvideoh = x * videoWidth
//     //    [3] top = (window.innerHeight - nvideoh) / 2
//     //
//     // Z 2 delimo, ker hočemo video vertikalno poravnati.
//     
//     w = "100vw";
//     h = "auto";
//     
//     var vidwid = document.getElementsByClassName("video-stream")[0].scrollWidth;
//     var vidhei = document.getElementsByClassName("video-stream")[0].scrollHeight;
//     
//     //    Glej zgornji komentar za pomen [1][2][3] | see above comment for meaning of [1][2][3]
//     //
//     //    ___________________________[3]____________________________________
//     //    |                     __________________[2]__________________    |
//     //    |                     |____________[1]_____________         |    |
//     top = (window.innerHeight - ((window.innerWidth / vidwid) * vidhei)) / 2;
//     
//     top = top + "px";
//     console.log("uw::changeCSS | will try fit to width and center");
//   }
//   
//   if(what_do == "fith"){
//     top = "0";   //itak zasedemo 100% višine
//     w = "auto";
//     h = "100vh";
//     
//     console.log("uw::changeCSS | will try fit to height");
//   }
//   
//   if(what_do == "zoom"){    
//     var vidhei = document.getElementsByClassName("video-stream")[0].scrollHeight;
//     
//     w = "auto";
//     
//     // Video povečujemo na tak način, da sta zoom in unzoom povečata oz. zmanjšata video za enak korak
//     // We do this so zoom and unzoom steps change video sizes for the same amount
//     h = vidhei + (window.innerHeight * zoomStep);
//     
//     top = (window.innerHeight - h)/2
//     
//     if (h > window.innerHeight * 4){
//       console.log("okay mate you took this shit way too far now. I'm not doing shit");
//       return;
//     }
//     console.log("uw::changeCSS | zooming in");
//     
//     h = h + "px";
//     top = top + "px";
//   }
//   
//   if(what_do == "unzoom"){
//     var vidhei = document.getElementsByClassName("video-stream")[0].scrollHeight;
//     
//     w = "auto";
//     
//     // Video povečujemo na tak način, da sta zoom in unzoom povečata oz. zmanjšata video za enak korak
//     // We do this so zoom and unzoom steps change video sizes for the same amount
//     h = vidhei - (window.innerHeight * zoomStep);
//     
//     top = (window.innerHeight - h)/2
//     
//     if (h < window.innerHeight * 0.25){
//       console.log("don't you think this is small enough already? You don't need to resize the video to the size smaller than your penis.");
//       console.log("(if you're a woman, just substitute 'penis' with whatever the female equivalent is)");
//       return;
//     }
//     console.log("uw::changeCSS | unzooming");
//     
//     h = h + "px";
//     top = top + "px";
//   }
//   
//   $("video").css({"width": w,"height": h,"top": top});
//   
//   console.log("uw::changeCSS | applying css");
// }




// console.log("uw | finished loading");






// var fitwbutton = document.createElement('button');
// 
// fitwbutton.appendChild(t);
// fitwbutton.onclick = function(){ changeCSS("fitw"); };
// console.log("testing!3");
// document.getElementsByClassName("ytp-right-controls")[0].appendChild(fitwbutton);
/*
console.log("testing4!");
document.body.appendChild('cssmod');
console.log("testing 4.1");*/
