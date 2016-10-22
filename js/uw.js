var extraClassAdded = false;
var inFullScreen = false;

var cssmod = "";
var zoomStep = 0.05;

var whatdo_persistence = true;
var last_whatdo = "reset";

var debugmsg = true;

var ctlbar_classnames = ["ytp-chrome-controls"];
var serviceArray = [".video-stream" ]; //Youtube 

var buttons = [];

$("<style>")
  .prop("type", "text/css")
  .html("\
    .uw-button{\
      display: inline-block;\
      height: 100% !important; \
      background-size: contain; \
      background-repeat: no-repeat;\
      background-position: center center;\
    }")
  .appendTo("head");
    
$(document).ready(function() {
  if(debugmsg)
    console.log("==========================================================================================");
  
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
        break;
      case 'd':
        changeCSS(0);
        break;
      case 's':
        changeCSS(1);
        break;
      case 'a':
        changeCSS(2);
        break;
      case 'x':
        changeCSS(3);
    }
  });
  
  document.addEventListener("mozfullscreenchange", function( event ) {
    onFullScreenChange();
    inFullScreen = ( window.innerHeight == window.screen.height && window.innerWidth == window.screen.width);
    inFullScreen ? onFullscreenOn() : onFullscreenOff();
  });
  
  // Dodajmo gumbe na video
  // let's add buttons to the video
  
  addCtlButtons(0);

});

function addCtlButtons(provider_id){
  
  // Gumb za nastavitve je bolj kot ne vselej prisoten, zato širino tega gumba uporabimo kot širino naših gumbov
  // Settings button is more or less always there, so we use its width as width of our buttons
  var button_width = document.getElementsByClassName("ytp-button ytp-settings-button")[0].scrollWidth;
  //NOTE: jQuery tu serje da je tole zgoraj nekaj undefined, ampak skript dela pravilno. Zaenkrat nas jQuery problemi
  //zato ne bojo brigal pol kurca
  //
  //NOTE: jQuery sometimes shits a word salat in the console and the above line seems to be the problem. Since
  //everything works just fine, we pretty much ignore that
  
  var button_def = [ "fitw", "fith", "reset", "zoom", "uzoom" ];
  
  if(debugmsg)
    console.log("uw::addCtlButtons | trying to add buttons");
  
  var button_panel;
  
  // If we're on youtube:
  if(provider_id == 0){
    
    var rctl = document.getElementsByClassName("ytp-right-controls")[0];

    for( var i = 4; i >= 0; i--){
      buttons[i] = document.createElement('div');
      buttons[i].style.backgroundImage = 'url(' + imageToUrl("/img/ytplayer-icons/" + button_def[i] + ".png") + ')';
      buttons[i].style.width = (button_width * 0.75) + "px";
      buttons[i].style.marginLeft = (button_width * 0.3) + "px";
      buttons[i].className += " uw-button";
      $(rctl).prepend(buttons[i]);
    }
    
  }

  buttons[0].onclick = function() { changeCSS("fitw")   };
  buttons[1].onclick = function() { changeCSS("fith")   };
  buttons[2].onclick = function() { changeCSS("reset")  };
  buttons[3].onclick = function() { changeCSS("zoom")   };
  buttons[4].onclick = function() { changeCSS("unzoom") };
  
  if(debugmsg)
    console.log("uw::addCtlButtons | buttons added");
}

function onFullScreenChange(){
  // Popravimo velikost gumbov
  // Let's fix the button size:
  var button_width = document.getElementsByClassName("ytp-button ytp-settings-button")[0].scrollWidth;
  for( var i = 4; i >= 0; i--){
    buttons[i].style.width = (button_width * 0.75) + "px";
    buttons[i].style.marginLeft = (button_width * 0.3) + "px";
  }
  
  
}

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
  
  
  var e_video = document.getElementsByClassName("video-stream")[0];
  var video = { "width": e_video.scrollWidth, "height": e_video.scrollHeight }
  var e_player;
  
  if(inIframe())
    e_player = document.getElementById("player")
  else
    e_player = document.getElementById("movie_player");
  
  var player = { "width": e_player.clientWidth, "height": e_player.clientHeight }
  
  // Youtube predvajalnik privzeto resetira CSS ob prehodu v/iz fullscreen. Tukaj shranimo zadnje dejanje,
  // da ga lahko onFullscreenOff/onFullscreenOn uveljavita.
  // 
  // Youtube player resets CSS on fullscreen state change. Here we save the last action taken, so 
  // onFullscreenOff/onFullscreenOn are able to preserve it (if we want).
  last_whatdo = what_do;
  
  // -----------------------------------------------------------------------------------------
  //  Handlanje dejanj se zgodi pod to črto
  //  
  //  Handling actions happens below this line
  // -----------------------------------------------------------------------------------------
  
  if (what_do >= 0 && what_do < 5){   
    if( what_do == 0)
      set_video_ar((2560/1080), video, player);
    if(what_do == 1)
      set_video_ar((1920/1080), video, player);
    if(what_do == 2)
      set_video_ar((16/10), video, player);
    if(what_do == 3)
      set_video_ar((4/3), video, player);
    return;
  }
  
  if (what_do == "reset"){
    if(debugmsg)
      console.log("uw::changeCSS | issuing reset.");
    
    resetCSS(video, player); 
    return;
  }
  
  // Velikost videa spreminjamo samo, če smo v celozaslonskem načinu ALI če NE pišemo komentarja
  // Videa ne spreminjamo tudi, če uporabljamo vrstico za iskanje.
  // 
  // We only change video size when we're in full screen OR if we are NOT writing a comment.
  // We also leave video alone if we're using the search bar
  
  if(inFullScreen || (
    (document.activeElement.getAttribute("role") != "textbox") &&
    (document.activeElement.getAttribute("type") != "text")
    ))
    changeCSS_nofs(what_do, video, player);
  
  
  
}

/* Tukaj povemo, kakšno razmerje stranic ima video.
// Kaj to pomeni: 
//    Mi rečemo, da ima video razmerje stranic 16:9. Dejanski video
//    ima razmerje 4:3. To pomeni, da ima video zgoraj in spodaj črno
//    obrobo, ki je nočemo, zato video povečamo toliko, da se ta obroba odreže.
// 
// With this function, we specify the aspect ratio of the video. 
// What does this mean?
//    If we specify that the aspect ratio of a video is 16:9 when video is
//    actually 4:3, that means the video has black bars above and below.
//    We zoom the video just enough for the black lines to disappear.
*/
function set_video_ar(aspect_ratio, video, player){
  var video_ar = video.width / video.height;
  var display_ar = player.width / player.height;
  
  if(debugmsg)
    console.log("uw::set_video_ar | aspect ratio: " + aspect_ratio + "; video_ar: " + video_ar + "; display_ar: " + display_ar);
  
  if( aspect_ratio*1.1 > video_ar && video_ar > aspect_ratio*0.9 ){
    // Ta hack nas reši problema, ki ga predstavlja spodnji if stavek — če se legit 21:9 videu na 16:9 monitorju
    // obreže na 16:9, potem ga s klicem te funkcije ne moremo spremeniti nazaj na 21:9. Vendar pa bi za tak primer
    // radi imeli izjemo.
    // 
    // This hack solves the problem that the bottom if statement presents. If we crop a 21:9 video on a 16:9 monitor,
    // we can't change it back to 21:9 in this function, even though we kinda want that to happen — so we add an
    // exception.
    if( debugmsg)
      console.log("uw::set_video_ar | ar matches our display ar. resetting");
    
    resetCSS(video, player);
    return;
  }
  
  if( display_ar*1.1 < aspect_ratio && aspect_ratio > 1){
    /* Ker tukaj video obrežemo tako, da ga povečamo, dokler neželjen del videa gleda čez rob prikazovalnika,
    // tako obrezovanje ne bo delovalo, če hočemo nastaviti razmerje stranic na nekaj širšega, kot je naš zaslon.
    // Če je temu tako, ne naredimo ničesar. 
    // 
    // display_ar*1.1 — zato, da imamo nekaj meje, če se razmerje stranic zaslona ne ujema popolnoma natančno z
    // razmerjem stranic, ki smo ga dobili kot argument.
    // 
    // && aspect_ratio > 1 zato, če se zgodi, da se kdaj odločimo podpirati ultraozke zaslone (9/16, itd).
    // 
    // -----------------------------------------------------------------------------------------------------------
    // 
    // Because we crop the video by enlarging it until the unwanted parts of it are over the edges of the display,
    // this function obviously won't work if we want to set our aspect ratio to something that's wider than the
    // aspect ratio of our display. In such cases we do nothing at all. 
    // 
    // display_ar*1.1 — some tolerance for cases where display aspect ratio and the aspect ratio we get as an
    // argument differ by a slim margin. (see: 1920x1080 isn't exactly 16:9. 2560x1080 is slightly wider than
    // 21:9)
    // 
    // && aspect_ratio > 1 is here in case we decide to support ultrathin monitors (9/16, etc).
    */
    if( debugmsg)
      console.log("uw::set_video_ar | ar is wider than our monitor. not doing a thing");
    return;
  }
  
  
  //Širina, višina, top, left za nov video
  //Width, height, top and left for the new video
  var nv = { "w":0, "h":0, "top":0, "left":0 }; 
  
  /*
  // Video hočemo pretvoriti v video z drugačnim razmerjem stranic.
  // To storimo tako, da širino videa nastavimo relativno na višino prikazovalnika, torej:
  // 
  //     širina = višina_prikazovalnika * razmerje_stranic
  //     višina = širina / video_ar
  //     
  // 
  // 
  // ----------------------------------------------------------------------------------------------
  // 
  // In this case, the video is narrower than we want (think 4:3, which we want to make into 16:9)
  // We achieve this by setting video width relative to the display width, so:
  // 
  //     width = display_height * aspect_ratio
  //    height = width / video_ar
  //     
  */
  
  if( video_ar <= aspect_ratio ){
    if(debugmsg){
      console.log("uw::set_video_ar | reached pre-calc. Video is taller than ar. target ar: " + aspect_ratio );
    }    
    
    nv.w = player.height * aspect_ratio;
    nv.h = nv.w / video_ar;
    
    nv.top = (player.height - nv.h)/2;
    nv.left = (player.width - nv.w)/2;
  }
  else{
    if(debugmsg){
      console.log("uw::set_video_ar | reached pre-calc. Video is wider than ar. target ar: " + aspect_ratio );
    }  
    nv.h = player.width / aspect_ratio;
    nv.w = nv.h * video_ar;
    
    nv.top = (player.height - nv.h)/2;
    nv.left = (player.width - nv.w)/2;
  }
  
  applyCSS(nv);
}

function resetCSS(video, player){
  if(debugmsg)
    console.log("uw::resetCSS | resetting video size");
  
  
  var nv = {"w": 0, "h": 0, "top": 0, "left": 0};
  
  var vidaspect = video.width / video.height;
  var scraspect = player.width / player.height;
  
  if( vidaspect > scraspect ){  // Video je širši od okna | video is wider than window
    nv.w = player.width;
    nv.h = player.width / video.width * video.height;
    
    // Lahko se zgodi, da je prišlo do zaokroževalne napake ter da je dejanska višina videa le nekaj pikslov drugačna,
    // kot višina predvajalnika. V tem primeru zavržemo prej dobljeni rezultat in namesto tega privzamemo, da je višina
    // videa enaka višini predvajalnika.
    // 
    // It's possible to have a rounding error where calculated height of the video is only a few pixels different from
    // the player height. In such cases, we discard the calculated video height and use player height instead.
    
    if( player.height - 4 < nv.h && nv.h < player.height + 4 )
      nv.h = player.height;
    
    nv.top = (player.height - nv.h) / 2;
    nv.left = 0;
  }
  else{
    nv.h = player.height;
    nv.w = player.height / video.height * video.width;
    
    if( player.width - 4 < nv.w && nv.w < player.width + 4)
      nv.w = player.width;
    
    nv.top = 0;   //itak zasedemo 100% višine
    nv.left = (player.width - nv.w) / 2;
  }
  
  applyCSS(nv);
}

function changeCSS_nofs(what_do, video, player){
  
  var w;
  var h;
  var top;
  var left;
  
  var ar = video.width/video.height;
  
  if(what_do == "fitw"){
    // Ker bi bilo lepo, da atribut 'top' spremenimo hkrati z width in height, moramo najprej naračunati,
    // za kakšen faktor se poviša višina. To potrebujemo, da se pravilno izračuna offset.
    // 
    //        100vw = window.innerWidth
    //        window.innerWidth / videoWidth = x
    // 
    // Če pomnožimo videoHeight z x, dobimo novo višino videa. Nova višina videa je lahko večja ali manjša
    // kot višina ekrana. Če je višina videa manjša kot višina ekrana, bo top pozitiven, drugače negativen:
    // 
    //        nvideoh = x * videoWidth
    //        top = (window.innerHeight - nvideoh) / 2
    //
    // Z 2 delimo, ker hočemo video vertikalno poravnati.
    
    w = player.width;
    h = player.width / video.width * video.height;
    
    top = (player.height - h) / 2;
    left = 0;            // Ker zavzamemo vso širino | cos we take up all the width
  }
  
  if(what_do == "fith"){
    h = player.height;
    w = player.height / video.height * video.width;
    
    top = 0;   //itak zasedemo 100% višine
    left = (player.width - w) / 2;
  }
  
  if(what_do == "zoom"){    
    // Video povečujemo na tak način, da sta zoom in unzoom povečata oz. zmanjšata video za enak korak
    // We do this so zoom and unzoom steps change video sizes for the same amount
    
    h = video.height + (player.height * zoomStep);
    w = video.width + (player.height * zoomStep * ar);
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
    
    top = (player.height - h)/2
    left = (player.width - w) / 2;
    
    if (h > player.height * 4){
      console.log("okay mate you took this shit way too far now. I'm not doing shit");
      return;
    }
  }
  
  if(what_do == "unzoom"){
    // Video povečujemo na tak način, da sta zoom in unzoom povečata oz. zmanjšata video za enak korak
    // We do this so zoom and unzoom steps change video sizes for the same amount
    h = video.height - (player.height * zoomStep);
    w = video.width - (player.height * zoomStep * ar);
    
    top = (player.height - h)/2
    left = (player.width - w) / 2;
    
    if (h < player.height * 0.25){
      console.log("don't you think this is small enough already? You don't need to resize the video all the way down to the size smaller than your penis.");
      console.log("(if you're a woman, substitute 'penis' with whatever the female equivalent is.)");
      return;
    }
  }
  var dimensions = { h: h, w: w, top: top, left: left };
  applyCSS(dimensions);
}

function applyCSS(dimensions){
  dimensions.top += "px";
  dimensions.left += "px";
  dimensions.w += "px";
  dimensions.h += "px";
  
  $("video").css({"width": dimensions.w,"height": dimensions.h,"top": dimensions.top, "left": dimensions.left});
  
  if(debugmsg)
    console.log("uw::applycss | css applied");
}

function inIframe(){
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

function imageToUrl(img){
  return chrome.extension.getURL(img);
}
