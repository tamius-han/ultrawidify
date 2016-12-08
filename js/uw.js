var debugmsg = false;
if(debugmsg){
  console.log(". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . ");
  console.log("\nLoading ultrawidify (uw)\nIf you can see this, extension at least tried to load\n\nRandom number: ",Math.floor(Math.random() * 20) + 1,"\n");
  console.log(". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . ");
}


var extraClassAdded = false;
var inFullScreen = false;

var cssmod = "";
var zoomStep = 0.05;

var whatdo_persistence = true;
var last_whatdo = "reset";
var page_url = window.location.toString();


var ctlbar_classnames = ["ytp-chrome-controls"];
var serviceArray = [".video-stream" ]; //Youtube 

var buttons = [];


//BEGIN ADDING CSS

// Če ponovno naložimo dodatek, potem odstranimo star CSS. Lahko se zgodi, da je Tam spremenil CSS in hoče
// preveriti, če stvari zgledajo tako kot morajo. Če ima en razred/id več nasprotujoćih si definicij, potem
// nam to lahko povzroča težave. Za uporabnike je načeloma odstranjevanje obstoječega CSS brezpredmetno, ker
// uporabnik ponavadi ne bo reloadal razširitve.
// 
// If we reload the extension, then we also remove our old CSS. It can easily happen that Tam changed CSS a bit
// and wants to see if things look roughly the way they should. We do this because if a class/id has multiple
// mutually exclusive definitions, we can get some problems with CSS not working the way it should. People who
// aren't Tam generally don't see the benefit as they won't reload the extension — let alone reload the extension
// after messing with CSS.
var uwcss = document.getElementsByClassName("uw_css");
while(uwcss && uwcss.length > 0)
  uwcss[0].parentNode.removeChild(uwcss[0]);

// funkcija pomagač za ustvarjanje css linkov
// helper function for creating css links
function addLink(css_url){
  var link = document.createElement("link");
  link.className = "uw_css";
  link.setAttribute("rel","stylesheet");
  link.setAttribute("type","text/css");
  link.setAttribute("href", resourceToUrl(css_url));
  $("head").append(link);
}

// Vsaka stran dobi uw_common.css
// We add uw_common.css on every page

addLink("res/css/uw_common.css");

// Če smo na Youtube/youtube popupu, dodamo css za youtube elemente
// If we're on youtube/youtube popup, we add css for youtube elements
if(page_url.indexOf("youtu") != -1){
  addLink("res/css/uw_yt.css");
}

//END ADDING CSS

// Yeah hi /r/badcode.
// Anyway, because nazi localstorage flat out refuses to store arrays:
var DEFAULT_KEYBINDINGS = { 
  0:{ action: "fitw",
    key: 'w',
    modifiers: []
  },
  1:{
    action: "fith", 
    key: 'e',
    modifiers: []
  },
  2: {
    action: "reset",
    key: 'r',
    modifiers: []
  },
  3: {
    action: "zoom",
    key: "z",
    modifiers: []
  },
  4: {
    action: "unzoom",
    key: "u",
    modifiers: []
  },
  5: {
    action: "char",
    targetAR: (21/9),
    key: "d",
    modifiers: []
  },
  6: {
    action: "char",
    targetAR: (16/9),
    key: "s",
    modifiers: []
  },
  7: {
    action: "char",
    targetAR: (16/10),
    key: "x",
    modifiers: []
  },
  8: {
    action: "char",
    targetAR: (4/3),
    key: "a",
    modifiers: []
  }
};

var KEYBINDS = {};
var ask4keybinds = browser.storage.local.get("ultrawidify_keybinds");
ask4keybinds.then( (res) => {
  if(res.length == 1 && jQuery.isEmptyObject(res[0])){
    if(debugmsg)
      console.log("uw::<init keybinds> | No keybindings found. Loading default keybinds as keybinds");
    
    browser.storage.local.set({ultrawidify_keybinds:DEFAULT_KEYBINDINGS});
    KEYBINDS = DEFAULT_KEYBINDINGS;
  }
  else{
    KEYBINDS = res[0].ultrawidify_keybinds;
  }
//   console.log("res. ", res[0].ultrawidify_keybinds);
});




$(document).ready(function() {
  if(debugmsg)
    console.log("=============================================================================================");
  
  $(document).keydown(function (event) {          // Tukaj ugotovimo, katero tipko smo pritisnili
    
    // Tipke upoštevamo samo, če smo v celozaslonskem načinu oz. če ne pišemo komentarja
    // v nasprotnem primeru ne naredimo nič.
    // We only take actions if we're in full screen or not writing a comment
    if( !(inFullScreen || (
         (document.activeElement.getAttribute("role") != "textbox") &&
         (document.activeElement.getAttribute("type") != "text")
    ))){
      if(debugmsg)
        console.log("We're writing a comment or something. Doing nothing");
      return;
    }
    if(debugmsg){
      console.log(KEYBINDS);
      console.log("we pressed a key: ", event.key , " | keydown: ", event.keydown);
    }
    for(i in KEYBINDS){
      if(debugmsg)
        console.log("i: ", i, "keybinds[i]:", KEYBINDS[i]);
      if(event.key == KEYBINDS[i].key){
        if(debugmsg)
          console.log("Key matches!");
        //Tipka se ujema. Preverimo še modifierje:
        //Key matches. Let's check if modifiers match, too:
        var mods = true;
        for(var j = 0; j < KEYBINDS[i].modifiers.length; j++){
          if(KEYBINDS[i].modifiers[j] == "ctrl")
            mods &= event.ctrlKey ;
          else if(KEYBINDS[i].modifiers[j] == "alt")
            mods &= event.altKey ;
          else if(KEYBINDS[i].modifiers[j] == "shift")
            mods &= event.shiftKey ;
        }
        if(debugmsg)
          console.log("we pressed a key: ", event.key , " | mods match?", mods, "keybinding: ", KEYBINDS[i]);
        if(mods){
          if(KEYBINDS[i].action == "char"){
            changeCSS("char", KEYBINDS[i].targetAR);
            return;
          }
          changeCSS("anything goes", KEYBINDS[i].action);
          return;
        }
      }
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

  //UI helpers
// function saveKeybinds(){
//   console.log($('uw_kbshortcuts_form').serializeArray());
// }


  //BEGIN UI

function addCtlButtons(provider_id){
  
  var buttonClass = "ytp-button ytp-settings-button";
  
  // Gumb za nastavitve je bolj kot ne vselej prisoten, zato širino tega gumba uporabimo kot širino naših gumbov
  // Settings button is more or less always there, so we use its width as width of our buttons
  var button_width = document.getElementsByClassName(buttonClass)[0].scrollWidth;
    
  var button_def = [ "fitw", "fith", "reset", "zoom", "uzoom", "settings" ];
  
  if(debugmsg)
    console.log("uw::addCtlButtons | trying to add buttons");
  
  var button_panel;
  
  // Če je ta dodatek že nameščen, potem odstranimo vse elemente. Vsi top-level elementi imajo definiran prazen razred
  // uw_element, prek katerega jih naberemo na kup. Ta del kode je tu bolj ali manj zaradi debugiranja.
  // 
  // If this addon is already installed, we have to remove all prevously added elements (to avoid duplicating).
  // The easiest way to gather all of them is to tack an empty class, 'uw_element,' to each top-level element we add.
  // This is here mostly because debugging, but could also be useful in case of unforseen happenings.
  
  var previousElements = document.getElementsByClassName("uw_element");

  // Uporabimo while loop in vselej odstranimo prvi element. Tabela previousElements se z odstranjevanjem elementov
  // krajša. 
  //
  // Da, to je bil bug.
  // 
  // --------------------------------
  // 
  // As previousElements.length decreases as we remove elements, we use a while loop and remove the first element
  // for as long as the array contains elements. 
  // 
  // Yes, that used to be a bug.
  
  while (previousElements && previousElements.length > 0){
    previousElements[0].parentNode.removeChild(previousElements[0]);
  }
  
  // If we're on youtube:
  if(provider_id == 0){
    
    var e_player;
    
    if(inIframe())
      e_player = document.getElementById("player");
    else
      e_player = document.getElementById("movie_player");
     
    var rctl = document.getElementsByClassName("ytp-right-controls")[0];

    // Tukaj dodamo gumbe na stran
    // Here we add the buttons
    
    for( var i = 5; i >= 0; i--){
      buttons[i] = document.createElement('div');
      buttons[i].style.backgroundImage = 'url(' + resourceToUrl("/res/img/ytplayer-icons/" + button_def[i] + ".png") + ')';
      buttons[i].style.width = (button_width * 0.75) + "px";
//       buttons[i].style.marginLeft = (button_width * 0.3) + "px";
      buttons[i].style.paddingLeft = (button_width *0.15 ) + "px";
      buttons[i].style.paddingRight = (button_width * 0.15) + "px";
      buttons[i].className += " uw-button uw_element";
      $(rctl).prepend(buttons[i]);
    }
    
    // Let's check if we're too wide.
    var rctl_width = rctl.offsetWidth;
    var lctl_width = document.getElementsByClassName("ytp-left-controls")[0].offsetWidth;
    var ctlbar_width = document.getElementsByClassName("ytp-chrome-controls")[0].offsetWidth;
    
    // Če na ctlbar ni prostora za vse knofe, potem skrijemo vse knofe razen tistega, ki ima popup z vsemi možnostmi
    // 
    // If ctlbar doesn't have the space for all the buttons, we hide all except the one that contains the popup
    // with all the options
    
    if( (rctl_width + lctl_width) * 1.1 > ctlbar_width){
      for( var i = 4; i >= 0; i--){
        buttons[i].classList.add("uw_hide");
      }
    }
    
    buttons[0].onclick = function() { changeCSS("fit",   "fitw")   };
    buttons[1].onclick = function() { changeCSS("fit",   "fith")   };
    buttons[2].onclick = function() { changeCSS("reset", "reset")  };
    buttons[3].onclick = function() { changeCSS("fit",   "zoom")   };
    buttons[4].onclick = function() { changeCSS("fit",   "unzoom") };
    
    // Knof za nastavitve ima še vgnezden meni, ki ga dodamo tu (privzeto je ta meni skrit)
    // Settings button contains a menu that's nested in the element. By default, that menu is
    // hidden.
    buttons[5].onclick = function() { toggleMenu("uw-smenu") };
    buttons[5].id = "uw-settings-button";
    
    var settings_menu = document.createElement("div");
    var smenu_ar_menu = document.createElement("div");

    var smenu_el = [];
    for(var i = 0; i < 7; i++){
      smenu_el[i] = document.createElement("div");
    }
    
    var smenu_ar_options = [];
    
    buttons[5].appendChild(settings_menu);

    //Če rabimo skriti gumb za nastavitve, potem mora biti i=1
    //If we need to hide settings button, then we should make i=1
    
    //FIXME: knof za nastavitve ne radi (nastavitve se ne odprejo)
    //FIXME: 'settings' button on the player doesn't work
    
    for(var i = 1; i < smenu_el.length; i++){
      settings_menu.appendChild(smenu_el[i]);
      smenu_el[i].className += "uw-setmenu-item";
    }
    
    
    for(var i = 0; i < 4; i++){
      smenu_ar_options[i] = document.createElement("div");
      smenu_ar_options[i].className = "uw-setmenu-item uw_element";
      smenu_ar_menu.appendChild(smenu_ar_options[i]);
    }
    
    settings_menu.id = "uw-smenu";
    settings_menu.className = "uw-setmenu uw_element";
    
    
    smenu_el[0].id = "uw-smenu_settings";
    smenu_el[6].id = "uw-smenu_ar";
    
    
    smenu_ar_menu.id = "uw-armenu";
    smenu_ar_menu.className = "uw-setmenu uw_element";
    
    // Stvari, ki se spreminjajo, se določijo tukaj
    // 
    // Things that can change are defined here.
    
    var smenu_item_width = (button_width * 7.5);
    var smenu_item_fontSize = (button_width * 0.5);
    var smenu_ar_item_width = (smenu_item_width / 3);
    var smenu_item_height = button_width;
    
    // Popup meni je lahko visok največ 75% višine predvajalnika
    // Popup menu can be at most 75% of the video player tall
    var smenu_max_h = e_player.clientHeight * 0.75;
    
    // Če je popup večji, kot 80% predvajalnika, potem ga pomanjšamo. Višina elementa na popupu je približno enaka
    // višini knofa. Gumbi so načeloma kvadratni, zato je višina enaka širini.
    // If the popup menu is taller than 80% of the player, we resize it. height of an element in the popup is roughly
    // equal to the height of a button. Buttons are generally squares, so width is equal to heigth. (And if it's not,
    // that's still close enough for us!)
    
    var smenu_default_h = button_width * smenu_el.length;
    
    
    if(smenu_max_h < smenu_default_h){
      var scale_factor = smenu_max_h / smenu_default_h;
      
      smenu_item_width *= scale_factor;
      smenu_item_fontSize *= scale_factor;
      smenu_item_height = button_width * scale_factor;
      smenu_ar_item_width *= scale_factor;
      
    }
    
    settings_menu.style.bottom = (button_width * 1.5) + "px";
    settings_menu.style.width = smenu_item_width + "px";
    settings_menu.style.fontSize = smenu_item_fontSize + "px";
    
    smenu_ar_menu.style.right = smenu_item_width + "px";
    smenu_ar_menu.style.width = smenu_ar_item_width + "px";
    smenu_ar_menu.style.bottom = "0px";
    
    for(var i = 0; i < smenu_el.length; i++){
      smenu_el[i].style.width = smenu_item_width + "px";
      smenu_el[i].style.height = smenu_item_height + "px";
      smenu_el[i].style.fontSize = smenu_item_fontSize + "px";
    }
    for(var i = 0; i < smenu_ar_options.length; i++){
      smenu_ar_options[0].height = smenu_item_height + "px";
    }
  
    
    // Tukaj se določa notranji HTML knofov
    // Inner HTML of elements is defined here
    smenu_el[6].innerHTML = "Force aspect ratio";
    smenu_el[6].appendChild(smenu_ar_menu);
    
    smenu_el[0].innerHTML = "Settings";
    
    smenu_ar_options[0].innerHTML = "4:3";
    smenu_ar_options[1].innerHTML = "16:10";    
    smenu_ar_options[2].innerHTML = "16:9";
    smenu_ar_options[3].innerHTML = "21:9";
                            
    smenu_el[5].innerHTML = "Fit width";
    smenu_el[4].innerHTML = "Fit height";
    smenu_el[3].innerHTML = "Reset";
    smenu_el[1].innerHTML = "Zoom in";
    smenu_el[2].innerHTML = "Zoom out";
    
    // Pritisneš gumb, nekej zakon se more narest.
    //                              — Bioware
    //                                ( https://www.youtube.com/watch?v=hMcVZQI6ybw | [NVZD] )
    //                        
    // Press the button, something awesome has to happen.
    //                              — Bioware
    //                                ( https://www.youtube.com/watch?v=hMcVZQI6ybw | [NSFW] )
    
    $(smenu_el[6]).on("mouseenter", function(){showMenu("uw-armenu")});
    $(smenu_el[6]).on("mouseleave", function(){hideMenu("uw-armenu")});
    
    // event.stopPropagation, ker nočemo togglati še funkcij od knofa za popup z nastavitvami
    // event.stopPropagation, because we don't want to trigger onclick functions of the settings popup button in 
    // the player bar
    
    smenu_ar_options[0].onclick = function(event) {event.stopPropagation(); changeCSS("char", ( 4/3 )); };
    smenu_ar_options[1].onclick = function(event) {event.stopPropagation(); changeCSS("char", (16/10)); };
    smenu_ar_options[2].onclick = function(event) {event.stopPropagation(); changeCSS("char", (16/9 )); };
    smenu_ar_options[3].onclick = function(event) {event.stopPropagation(); changeCSS("char", (21/9 )); };
    

//     smenu_el[0].onclick = function (event) {event.stopPropagation(); showSettings() };
    
    smenu_el[5].onclick = function (event) {event.stopPropagation(); changeCSS("fit"  ,"fitw"  ) };
    smenu_el[4].onclick = function (event) {event.stopPropagation(); changeCSS("fit"  ,"fith"  ) };
    smenu_el[3].onclick = function (event) {event.stopPropagation(); changeCSS("reset","reset" ) };
    smenu_el[1].onclick = function (event) {event.stopPropagation(); changeCSS("fit"  ,"zoom"  ) };
    smenu_el[2].onclick = function (event) {event.stopPropagation(); changeCSS("fit"  ,"unzoom") };
    
  }

  
  
  if(debugmsg)
    console.log("uw::addCtlButtons | buttons added");
}

//END UI

function onOpen(){
  if(debugmsg)
    console.log("uw | Options page opened");
}

function onError(err){
  if(debug){
    console.log(`Error: ${error}`);
    console.log("uw | Error opening the page", err);
  }
}

function showSettings(){
  var prettypls = browser.runtime.openOptionsPage();
  prettypls.then(onOpen, onError);
}

// Ta funkcija se proži, ko vstopimo ali izstopimo iz celozaslonskega načina
// This function gets triggered by full screen state change
function onFullScreenChange(){
  // Popravimo velikost gumbov
  // Let's fix the button size:
  var button_width = document.getElementsByClassName("ytp-button ytp-settings-button")[0].scrollWidth;
  for( var i = 5; i >= 0; i--){
    buttons[i].style.width = (button_width * 0.75) + "px";
    buttons[i].style.paddingLeft = (button_width *0.15 ) + "px";
    buttons[i].style.paddingRight = (button_width * 0.15) + "px";
  }
  
  document.getElementById("uw-smenu").style.bottom = (button_width * 1.5) + "px";
  
  //Sedaj poglejmo še, če lahko v nadzorno vrstico spravimo vse gumbe
  //Let's see if we can get all the buttons in the control bar
  var rctl = document.getElementsByClassName("ytp-right-controls")[0];
  
}


// Ta funkcija se proži, ko gremo v celozaslonski način
// This function triggers when we enter fullscreen mode
function onFullscreenOn(){
  
}

// Ta funkcija se proži, ko gremo ven iz celozaslonskega načina
// This function triggers when we leave fullscreen mode
function onFullscreenOff(){

}

function changeCSS(type, what_do){
  hideMenu("uw-armenu");
  hideMenu("uw-smenu");
  
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
  
  if (type == "char"){
    // char = CHange Aspect Ratio
    char(what_do, video, player);
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


function char(new_ar, video, player){
  
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
  
  if(new_ar == (21/9)){
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
        set_video_ar( ar, video, player);
        return;
      }
    }
  }
  
  set_video_ar(new_ar, video, player);
}

/* Tukaj povemo, kakšno razmerje stranic ima video.
// Kaj to pomeni: 
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
function set_video_ar(aspect_ratio, video, player){
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
  
  if(nv.w > (player.width * 1.1) && nv.h > (player.height * 1.1))
    return;
  
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
    h = video.height - (player.height * zoomStep);
    w = video.width - (player.height * zoomStep * ar);
    
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

function resourceToUrl(img){
  return chrome.extension.getURL(img);
}

function showMenu(id){
  if(debugmsg)
    console.log("uw::showMenu | showing menu with id " + id);
  document.getElementById(id).classList.add("show");
}
function toggleMenu(id){
  if(debugmsg)
    console.log("uw::toggleMenu | toggling menu with id " + id);
  document.getElementById(id).classList.toggle("show");
}

function hideMenu(id){
  if(debugmsg)
    console.log("uw::hideMenu | hiding menu with id " + id);
  document.getElementById(id).classList.remove("show");
}
