if(Debug.debug)
  console.log("Loading: Resizer.js");

var _res_manual_autoar = function(siteProps){
  if(! siteProps.autoar_imdb.enabled)
    return;
  
  if(siteProps.autoar_imdb.isClass)
    var ntitle = document.querySelector("."+ siteProps.autoar_imdb.title); // NOTE: needs to be tested
    else
      var ntitle = document.querySelector("#"+ siteProps.autoar_imdb.title); // NOTE: needs to be tested
      
      //querySelector lahko vrne null, zato moramo preveriti, kaj smo dobili — drugače se .textContent pritožuje.
      //querySelector can return null, in which case .textContent will complain.
      if(!ntitle)
        return;
      
      var title = ntitle.textContent;
    
    char_got_ar = false;
    last_whatdo = {type: "autoar", what_do:"autoar"};
    
    var sending = browser.runtime.sendMessage({
      type: "gibAspectRatio",
      title: title
    });
    //     sending.then( function(){}, function(err1, err2){console.log("uw::periodic: there was an error while sending a message", err1, err2)} );
}

var _res_changeCSS = function(type, action, lastAction, conf, debugmsg){
  if(debugmsg)
    console.log("uw::changeCSS | starting function. type:", type, "; what_do:",what_do,"\nPlayer element is this:",PLAYER);
  //   hideMenu("uw-armenu");
  //   hideMenu("uw-smenu");
  
  var evideo = $("video")[0];
  
  if(!evideo){
    if(debugmsg)
      console.log("uw::changeCSS | no video element found. Doing nothing.");
    
    return;
  }
  
  var video = { width: evideo.videoWidth, height: evideo.videoHeight };
  var nplayer = { width: PLAYER.clientWidth, height: PLAYER.clientHeight };
  
  if(debugmsg)
    console.log("uw::changeCSS | video dimensions:",video.width,"x",video.height,"; player:",nplayer.width,"x",nplayer.height);
  
  // Youtube predvajalnik privzeto resetira CSS ob prehodu v/iz fullscreen. Tukaj shranimo zadnje dejanje,
  // da ga lahko onFullscreenOff/onFullscreenOn uveljavita.
  // 
  // Youtube player resets CSS on fullscreen state change. Here we save the last action taken, so 
  // onFullscreenOff/onFullscreenOn are able to preserve it (if we want).
  lastAction = {type:type, what_do:what_do};
  
  // -----------------------------------------------------------------------------------------
  //  Handlanje dejanj se zgodi pod to črto
  //  
  //  Handling actions happens below this line
  // -----------------------------------------------------------------------------------------
  
  if (type == "autoar"){
    this.autochar();
    return;
  }
  
  if (type == "char"){      
    if(debugmsg)
      console.log("uw::changeCSS | trying to change aspect ratio.");
    
    // char = CHange Aspect Ratio
    char(what_do, video, nplayer);
    return;
  }
  
  if (what_do == "reset"){
    if(debugmsg)
      console.log("uw::changeCSS | issuing reset.");
    
    resetCSS(video, nplayer); 
    return;
  }
  
  // Velikost videa spreminjamo samo, če smo v celozaslonskem načinu ALI če NE pišemo komentarja
  // Videa ne spreminjamo tudi, če uporabljamo vrstico za iskanje.
  // 
  // We only change video size when we're in full screen OR if we are NOT writing a comment.
  // We also leave video alone if we're using the search bar
  
  if(FullScreenDetect.isFullScreen() || (
    (document.activeElement.getAttribute("role") != "textbox") &&
    (document.activeElement.getAttribute("type") != "text")
  )){
    if(debugmsg)
      console.log("uw::changeCSS | trying to fit width or height");
    
    changeCSS_nofs(what_do, video, nplayer);
  }
  
  
}


var _res_char = function(newAr, video, player){
  
  // Kot vhodni argument dobimo razmerje stranic. Problem je, ker pri nekaterih ločljivostih lahko razmerje stranic
  // videa/našega zaslona minimalno odstopa od idealnega razmerja — npr 2560x1080 ni natanko 21:9, 1920x1080 ni 
  // natanko 16:9. Zato ob podanem razmerju stranic izračunamo dejansko razmerje stranic.
  // 
  // The aspect ratio we get as an argument is an ideal aspect ratio. Some (most) resolutions' aspect ratios differ
  // from that ideal aspect ratio (by a minimal amount) — e.g. 2560x1080 isn't exactly 21:9, 1920x1080 isn't exactly
  // 16:9. What is more, both 3440x1440 and 2560x1080 are considered "21:9", but their aspect ratios are slightly 
  // different. This has the potential to result in annoying black bars, so we correct the aspect ratio we're given
  // to something that's slightly more correct.
  
  var ar;
  var res_219 = [ [2560,1080], [3440,1440] ];
  var res_169 = [ [1920,1080], [1280,720], [1366,768] ];
  
  if(newAr == (21/9)){
    for (var i = 0; i < res_219.length; i++){
      if( player.height == res_219[i][1]){
        ar = res_219[i][0]/res_219[i][1];
        set_video_ar( ar, video, player);
        return;
      }
    }
  }
  else if(new_ar == (16/9)){
    for (var i = 0; i < res_169.length; i++){
      if( player.height == res_169[i][1]){
        ar = res_169[i][0]/res_169[i][1];
        setVideoAr( ar, video, player);
        return;
      }
    }
  }
  
  _res_setVideoAr(new_ar, video, player);
}

//     autochar: function(){
//       
//       if(debugmsg || debugmsg_autoar)
//         console.log("uw::autochar | starting. Did we get ar?",char_got_ar,"What about arx and ary?",char_arx,char_ary);
//       
//       if(!char_got_ar)
//         return;
//       
//       if(!char_arx || !char_ary)
//         return;
//       
//       var ar = char_arx / char_ary;
//       if(ar){
//         setBestFit(ar);
//         last_whatdo = {type: "autoar", what_do: "autoar"};
//       }
//     }





/* Tukaj povemo, kakšno razmerje stranic ima video.
/  Kaj to pomeni: 
//    Mi rečemo, da ima video razmerje stranic 16:9. Dejanski video
//    ima razmerje 4:3. To pomeni, da ima video zgoraj in spodaj črno
//    obrobo, ki je nočemo, zato video povečamo toliko, da se ta obroba odreže.
//    
//    OBROB TUKAJ NE DODAJAMO.
// 
// With this function, we specify the aspect ratio of the video. 
// What does this mean?
//    If we specify that the aspect ratio of a video is 16:9 when video is
//    actually 4:3, that means the video has black bars above and below.
//    We zoom the video just enough for the black lines to disappear.
//    
//    WE DO NOT ADD ANY BLACK BORDERS. If we get to a scenario when we'd have to add 
//    black borders, we do nothing instead.
*/

var setVideoAr = function(aspect_ratio, video, player){
  var video_ar = video.width / video.height;
  var display_ar = player.width / player.height;
  
  if(debugmsg){
    console.log("uw::set_video_ar | aspect ratio: " + aspect_ratio + "; video_ar: " + video_ar + "; display_ar: " + display_ar);
    console.log("uw::set_video_ar | player dimensions: " + player.width + "x" + player.height + "; video dimensions: " + video.width + "x" + video.height);
  }
  
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
  
  // Širina, višina, top, left za nov video
  // Width, height, top and left for the new video
  var nv = { "w":0, "h":0, "top":0, "left":0 }; 
  
  /*
  * // Video hočemo pretvoriti v video z drugačnim razmerjem stranic.
  * // To storimo tako, da širino videa nastavimo relativno na višino prikazovalnika, torej:
  * // 
  * //     širina = višina_prikazovalnika * razmerje_stranic
  * //     višina = širina / video_ar
  * //     
  * // 
  * // 
  * // ----------------------------------------------------------------------------------------------
  * // 
  * // In this case, the video is narrower than we want (think 4:3, which we want to make into 16:9)
  * // We achieve this by setting video width relative to the display width, so:
  * // 
  * //     width = display_height * aspect_ratio
  * //    height = width / video_ar
  * //     
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
  
  if(nv.w > (player.width * 1.1) && nv.h > (player.height * 1.1))
    return;
  
  this._res_applyCss(nv);
}



// Ta funkcija ugotovi, kako se kvadrat s podanim razmerjem stranic najbolj prilega ekranu
// Predpostavimo, da so ćrne obrobe vselej zgoraj in spodaj, nikoli levo in desno.
// 
// This function determines how a rectangle with a given aspect ratio best fits the monitor
// We assume letterbox is always letterbox, never pillarbox.
var _res_setBestFit = function(ar){
  if(debugmsg || debugmsg_autoar)
    console.log("uw::setBestFit | got ar:",ar);
  
  var player = {width: PLAYER.clientWidth, height: PLAYER.clientHeight};
  var player_ar = player.width / player.height;
  
  var evideo =  $("video")[0];
  var video = {width: evideo.videoWidth, height: evideo.videoHeight};
  var video_ar = video.width / video.height;
  
  // Ob predpostavki, da je argument 'ar' pravilen, naračunamo dimenzije videa glede na širino in višino predvajalnika
  // Kot rezultat laho dobimo dve možnosti:
  //     A: naračunana širina je širša, kot naš zaslon —> za računanje uporabimo širino (letterbox zgoraj/spodaj,
  //        levo/desno pa ne)
  //     B: naračunana širina je ožja, kot naš zaslon —> za računanje uporabimo višino (letterbox levo/desno,
  //        zgoraj/spodaj pa ne)
  
  if(debugmsg || debugmsg_autoar)
    console.log("uw::setBestFit | here's all we got. ar:",ar,"player:",player,"video:",video);
  
  var tru_width = player.height * ar;
  var tru_height = player.width / ar;
  
  var nv = {w: "", h: "", top: "", left: ""};
  
  if(ar >= video_ar){
    if(ar >= player_ar){
      if(debugmsg || debugmsg_autoar)
        console.log("uw::setBestFit | aspect ratio is wider than player ar.")
        nv.h = player.width / video_ar;
      nv.w = nv.h * ar;
    }
    else{
      if(debugmsg || debugmsg_autoar)
        console.log("uw::setBestFit | aspect ratio is narrower than player ar.", (player.height * ar), nv)
        nv.w = player.height * ar;
      nv.h = nv.w / video_ar;
    }
  }
  else{
    if(ar >= player_ar){
      if(debugmsg || debugmsg_autoar)
        console.log("uw::setBestFit | aspect ratio is wider than player ar.")
        nv.h = player.width / ar;
      nv.w = nv.h * video_ar;
    }
    else{
      if(debugmsg || debugmsg_autoar)
        console.log("uw::setBestFit | aspect ratio is narrower than player ar.", (player.height * ar), nv)
        nv.w = player.height * video_ar;
      nv.h = nv.w / ar;
    }
  }
  if(debugmsg || debugmsg_autoar)
    console.log("uw::setBestFit | new video width and height processed. nv so far:", nv)
    
    nv.top = (player.height - nv.h)/2;
  nv.left = (player.width - nv.w)/2;
  
  if(debugmsg || debugmsg_autoar)
    console.log("uw::setBestFit | tru width:",tru_width,"(player width:",player.width,"); new video size:",nv);
  
  _res_applyCss(nv);
  console.log("uw::setBestFit | css applied");
}

var _res_setArFs = function(ar){
  var vid = $("video")[0];
  
  // Dejansko razmerje stranic datoteke/<video> značke
  // Actual aspect ratio of the file/<video> tag
  var fileAr = vid.videoWidth / vid.videoHeight;
  
  // Če sta razmerja stranic preveč podobna, ne spreminjaj velikosti
  // we don't change ar if the target AR and actual AR are too similar
  var arDiff = ar - fileAr;
  if (arDiff < 0 )
    arDiff = -arDiff;
  
  if( arDiff < ar * Settings.arChange.samenessTreshold )
    return;
  
  // Zabavno dejstvo: ta funkcija se kliče samo v fullscreen. Za ne-fs verzijo bo posebna funkcija, ker bo včasih verjetno treba 
  // spremeniti velikost predvajalnika
  // 
  
  var videoDimensions = {
    width: 0,
    height: 0
  }
  
  var playerDimensions = {
    width: screen.width,
    height: screen.height
  }
  
  if( fileAr < ar ){
    // imamo letterbox zgoraj in spodaj -> spremenimo velikost videa (ampak nikoli na več, kot je širina zaslona)
    // letterbox -> change video size (but never to wider than monitor width)
    videoDimensions.width = Math.min(screen.height * ar, screen.width);
    videoDimensions.height = videoDimensions.width * (1/fileAr);
  }
  else{
    // TODO: implement for pillarbox
    return;
  }
  
  var cssValues = _res_computeOffsets(videoDimensions, playerDimensions);
  
  _res_applyCss(cssValues);
}

var _res_computeOffsets = function(vidDim, playerDim){
  var offsets = {
    width: vidDim.width,
    height: vidDim.height,
    left: 0,
    top: ((playerDim.height - vidDim.height) / 2)
  }
  
  if( Settings.miscFullscreenSettings.videoFloat == "center" ){
    offsets.left = (playerDim.width - vidDim.width ) / 2;
    
  }
  else if( Settings.miscFullscreenSettings.videoFloat == "right" ){
    offsets.left = (playerDim.width - vidDim.width);
  }
  
  return offsets;
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
  
  _res_applyCss(nv);
}

function changeCSS_nofs(what_do, video, player){
  if(debugmsg){
    console.log("uw::changeCSS_nofs | arguments: what_do:",what_do,"; video:", video,"; player:", player);
  }
  
  var w;
  var h;
  var top;
  var left;
  
  var evideo = $("video")[0];
  var video = {width: evideo.videoWidth, height: evideo.videoHeight, scrollw: evideo.scrollWidth, scrollh: evideo.scrollWidth};
  
  var ar = video.width / video.height;
  
  if(debugmsg){
    console.log("uw::changeCSS_nofs | video dimensions:", video.width, "x", video.height, "; ar:",ar);
  }
  
  if(what_do == "fitw" || what_do == "fit-width"){
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
    
    if(debugmsg)
      console.log("uw::changeCSS_nofs | w:",w,"; h:",h);
    
    top = (player.height - h) / 2;
    left = 0;            // Ker zavzamemo vso širino | cos we take up all the width
  }
  
  if(what_do == "fith" || what_do == "fit-height"){
    h = player.height;
    w = player.height / video.height * video.width;
    
    top = 0;   //itak zasedemo 100% višine
    left = (player.width - w) / 2;
  }
  
  if(what_do == "zoom"){    
    // Video povečujemo na tak način, da sta zoom in unzoom povečata oz. zmanjšata video za enak korak
    // We do this so zoom and unzoom steps change video sizes for the same amount
    
    h = video.scrollh + (player.height * zoomStep);
    w = video.scrollw + (player.height * zoomStep * ar);
    /* Zakaj računamo širino na tak način?
    *   // 
    *   // Predstavljajte si, da imamo 2100:900 video v 1600:900 škatli, zoomStep = 0.1. Če bi širino računali po formuli:
    *   // 
    *   //     širina = širina_videa + (širina zaslona * zoomStep)
    *   //     
    *   // Potem bi bila nova velikost videa 2260 x 990. Razmerje stranic: 2.28 (moglo bi biti 2.33 — video je popačen).
    *   // Zaradi tega novo širino rajši povečamo za razliko_v_višini * razmerje_stranic
    *   // 
    *   //     2100 + (900 * 0.1 * (2100/900)) =
    *   //                 2100 + (90 * 2.333) = 2310
    *   //
    *   // Razmerje stranic (2310x990) je tako 2.333 — tako, kot bi moglo biti.
    *   // 
    *   // 
    *   // ============================================================================================================
    *   // 
    *   // Why did we calculate width this way?
    *   // 
    *   // Imagine we have a 2100x900 video in a 1600:900 container, zoomStep = 0.1. If we calculated width using this:
    *   //
    *   //     width = video_width + (container_width * zoomStep)
    *   //     
    *   // then the new size would be 2260 x 990. This gives us an aspect ratio of 2.28 instead of 2.33 (which is what it
    *   // should be). Because of that we rather increase the width by delta_height * aspect_ratio:
    *   //
    *   //     2100 + (900 * 0.1 * (2100/900)) =
    *   //                 2100 + (90 * 2.333) = 2310 
    *   //
    *   // This gives us the correct aspect ratio and prevents video deformations.
    */
    
    top = (player.height - h)/2
    left = (player.width - w) / 2;
    
    if (h > player.height * 4){
      if(debugmsg){
        console.log("But this video is ... I mean, it's fucking huge. This is bigger than some rooms, this is bigger than some people's flats!");
        // Insert obligatory omnishambles & coffee machine quote here
        console.log("(No really, mate, you took this way too far already. Can't let you do that, Dave.)");
      }
      return;
    }
  }
  
  if(what_do == "unzoom"){
    // Video povečujemo na tak način, da sta zoom in unzoom povečata oz. zmanjšata video za enak korak
    // We do this so zoom and unzoom steps change video sizes for the same amount
    h = video.scrollh - (player.height * zoomStep);
    w = video.scrollw - (player.height * zoomStep * ar);
    
    top = (player.height - h)/2
    left = (player.width - w) / 2;
    
    if (h < player.height * 0.25){
      if(debugmsg){
        console.log("don't you think this is small enough already? You don't need to resize the video all the way down to the size smaller than your penis.");
        console.log("(if you're a woman, substitute 'penis' with whatever the female equivalent is.)");
      }
      return;
    }
  }
  var dimensions = { h: h, w: w, top: top, left: left };
  _res_applyCss(dimensions);
}

function _res_applyCss(dimensions){
  dimensions.top = Math.round(dimensions.top) + "px";
  dimensions.left = Math.round(dimensions.left) + "px";
  dimensions.width = Math.round(dimensions.width) + "px";
  dimensions.height = Math.round(dimensions.height) + "px";
  
  $("video").css({"position": "absolute", "width": dimensions.width,"height": dimensions.height,"top": dimensions.top, "left": dimensions.left});
  
  if(Debug.debug)
    console.log("[Resizer::_res_applyCss] css applied. Dimensions/pos: w:",dimensions.width,"; h:",dimensions.height,"; top:",dimensions.top,"; left:",dimensions.left);
}

var Resizer = {
  setAr_fs: _res_setArFs  
}
