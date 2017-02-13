var usebrowser = "chrome";
var browser_autodetect = true;

var debugmsg = true;
var debugmsg_click = false;
var debugmsg_message = false;
var debugmsg_autoar = false;
var debugmsg_periodic = false;
var debugmsg_ui = true;
if(debugmsg || debugmsg_click || debugmsg_message || debugmsg_autoar){
  console.log(". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . ");
  console.log("\nLoading ultrawidify (uw)\nIf you can see this, extension at least tried to load\n\nRandom number: ",Math.floor(Math.random() * 20) + 1,"\n");
  
  if(debugmsg)
    console.log("Logging all");
  
  if(debugmsg_click)
    console.log("Logging debugmsg_click");
  
  if(debugmsg_message)
    console.log("Logging debugmsg_message");
  
  if(debugmsg_autoar)
    console.log("Logging autoar");
  
  console.log(". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . ");
}

var UW_UI_BUTTONS = {
  fitw: {
    native_bar: true,
    has_submenu: false,
    button: true,
    icon: "/res/img/ytplayer-icons/fitw.png",
    text: "Fit to width",
    onclick: function(){ changeCSS("fit",   "fitw") }
  },
  fith: {
    native_bar: true,
    has_submenu: false,
    button: true,
    icon: "/res/img/ytplayer-icons/fith.png",
    text: "Fit to height",
    onclick: function(){ changeCSS("fit",   "fith") }
  },
  reset: {
    native_bar: true,
    has_submenu: false,
    button: true,
    icon: "/res/img/ytplayer-icons/reset.png",
    text: "Reset",
    onclick: function(){ changeCSS("reset", "reset") }
  },
  zoom: {
    native_bar: true,
    has_submenu: false,
    button: true,
    icon: "/res/img/ytplayer-icons/zoom.png",
    text: "Reset",
    onclick: function(){ changeCSS("fit", "zoom") }
  },
  unzoom: {
    native_bar: true,
    has_submenu: false,
    button: true,
    icon: "/res/img/ytplayer-icons/unzoom.png",
    text: "Reset",
    onclick: function(){ changeCSS("fit", "unzoom")  }
  },
  zoom: {
    native_bar: true,
    has_submenu: false,
    button: true,
    icon: "/res/img/ytplayer-icons/zoom.png",
    text: "Reset",
    onclick: function(){ changeCSS("fit", "zoom")  }
  },
  autoar: {
    native_bar: false,
    has_submenu: false,
    button: false,
    text: "Detect aspect ratio via 3rd party",
    onclick: function(){ manual_autoar()}
  },
  settings: {
    native_bar: true,
    button: true,
    icon: "/res/img/ytplayer-icons/settings.png",
    text: "Settings",
    has_submenu: true,
    submenu: [ "fitw","fith","reset","zoom","unzoom","autoar","ar" ],
    submenu_id: "uw_settings_menu",
    onclick: function(){ showMenu("uw_settings_menu"); }
  },
  ar: {
    native_bar: false,
    button: false,
    text: "Force aspect ratio",
    has_submenu: true,
    submenu: [ "ar219", "ar169", "ar1610", "ar43" ],
    submenu_id: "uw_force_ar_menu",
    onclick: function(){ showMenu("uw_force_ar_menu") }
  },
  ar219: {
    native_bar: false,
    button: false,
    text: "21:9",
    has_submenu: false,
    onclick: function(){ changeCSS("char", ( 21/9 )); }
  },
  ar169: {
    native_bar: false,
    button: false,
    text: "16:9",
    has_submenu: false,
    onclick: function(){ changeCSS("char", ( 16/9 )); }
  },
  ar1610: {
    native_bar: false,
    button: false,
    text: "16:10",
    has_submenu: false,
    onclick: function(){ changeCSS("char", ( 1.6 )); }
  },
  ar43: {
    native_bar: false,
    button: false,
    text: "4:3",
    has_submenu: false,
    onclick: function(){ changeCSS("char", ( 4/3 )); }
  }
}

if(browser_autodetect){
  if(typeof browser === "undefined"){ // This means we're probably not on Firefox.
    if(chrome){
      browser = chrome;
      usebrowser = "chrome";
    }
  }
  else
    usebrowser = "firefox";
}


const playercheck_recursion_depth_limit = 3;

var uw_autoar_default = true; // true - autoar enabled. False - autoar disabled

var extraClassAdded = false;
var inFullScreen = false;

var cssmod = "";
var zoomStep = 0.05;

var whatdo_persistence = true;
var last_whatdo = {type: "autoar", what_do:"reset"};
var page_url = window.location.toString();


var ctlbar_classnames = ["ytp-chrome-controls"];
var serviceArray = [".video-stream"]; //Youtube 

var buttons = [];

//BEGIN determining which site we're on and the associated names

var control_bar;
var ui_anchor;
var player;
var vid_el;
var sample_button_class;     // Class of a sample button
var sample_button_index = 0; // index of a sample button
var button_size_base = "x";  // Determines if size of extension buttons is defined by width or height of sample button

var char_strat = "contain";
var char_got_ar = false;
var char_arx;
var char_ary;
var autoar_enabled;

var video_wrap;

// Here we store the window size, so we know when to trigger css change.
var winsize = {w: window.innerWidth, h: window.innerHeight};

// Video title for third party 
var title = "";

// provider-specific variables

var netflix_cltbar_visibility = -1;  // -1 for invisible, anything non-negative for visible
var netflix_periodic_timer;

// Stuff for other browsers
if(usebrowser == "chrome"){
  browser = chrome;
}

function init(force_reload){
  
  if(debugmsg)
    console.log("uw::init | starting init");
  
  //Youtube:
  if(page_url.indexOf("youtu") != -1){
    if(debugmsg)
      console.log("uw::init | we're on youtube. Page url:", page_url);
    
    control_bar = "ytp-chrome-controls";
    sample_button_class = "ytp-button ytp-settings-button";
    
    if(inIframe())
      player = document.getElementById("player")
    else
      player = document.getElementById("movie_player");
    
    video_wrap = "video-stream";
    return true; 
  }
  
  //Netflix:
  if(page_url.indexOf("netflix.com") != -1){
    if(debugmsg)
      console.log("uw::init | we're on netflix. Page url:", page_url);
    
    player = document.getElementById("playerContainer");
    var tmp = document.getElementsByClassName("player-status")[0];
    if(!tmp)
      return false;
    
//     tmp.id = "uw_buttons_go_after_this";
    
    if(force_reload)
      ui_anchor.parentNode.remove(ui_anchor);
    
//     ui_anchor = document.getElementsByClassName("uw-button-row")[0];
    
//     var container = document.getElementsByClassName("player-control-bar")[0];
//     if(! container || ! container.childNodes)
//       return false;
    
//     for(var i = 1; i < container.childNodes.length; i++){
//       if(debugmsg || debugmsg_click){
//         console.log("child node",i,"has next sibling",container.childNodes[i].nextSibling);
//       }
//       if(container.childNodes[i].className == "player-status"){
//         console.log("a");
//         var nnode = container.childNodes[i].parentNode.insertBefore(ui_anchor, container.childNodes[i].nextSibling);
//         console.log("b", nnode, container.childNodes[i].nextSibling.nodeValue);
//         break;
//       }
//         
//     }
    
//     if(!ui_anchor){
//       ui_anchor = document.createElement("div");
//       ui_anchor.className = "uw-button-row";
//       ui_anchor.id = "uw_anchor";
//     }
//     
//     
//     if(debugmsg)
//       console.log("uw::init | we're on netflix. ui anchor: ",ui_anchor, "; ui anchor parent:", tmp);
//     
//     tmp.appendChild(ui_anchor);
    
//     document.querySelector(".player-control-bar").appendChild(ui_anchor);
//     console.log(document.querySelector(".player-control-bar"))
//     console.log("trying insert-after trick", $("#uw_anchor"), $("uw_buttons_go_after_this"), tmp);
//     $("#ui_anchor").insertAfter(".player-control-bar");
//     console.log(
    
    vid_el = document.getElementsByTagName("video")[0];
    
    sample_button_class = "player-control-button player-fill-screen";
    video_wrap = "player-video-wrapper";
    button_size_base = "y";
    
    return true;
  }
  
  return false;
}


//END 

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
if(page_url.indexOf("netflix.com") != -1){
  addLink("res/css/uw_netflix.css");
}

//END ADDING CSS


//BEGIN keybind-related stuff
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
    key: "c",
    modifiers: []
  },
  9: {
    action: "autoar",
    key: "a",
    modifiers: []
  }
};

var last_location = "";

var KEYBINDS = {};

browser.storage.onChanged.addListener(function(){console.log("storage has been updated!"); extSetup() } );

//END keybind-related stuff

//BEGIN comms with uw-bg
if(debugmsg)
  console.log("uw | Setting up comms with background scripts");

var num_of_msg = 0;
browser.runtime.onMessage.addListener(function (message, sender, stuff ) {
  if(debugmsg || debugmsg_message)
    console.log("uw::onMessage | message number: ", num_of_msg++  , "; message:", message );
  
  if(message.message && message.message == "page-change"){
    if(document.getElementsByClassName("uw_element").length === 0){
      if(debugmsg)
        console.log("uw::onMessage | page was updated but control buttons aren't there. Trying to readd.")
      
      init();
      addCtlButtons(0);
    }
    
    
    // We don't do that if we zoomed or unzoomed
    if(last_whatdo.what_do != "zoom" && last_whatdo.what_do != "unzoom")
      changeCSS(last_whatdo.type, last_whatdo.what_do);
    
    // Velikost gumbov posodobimo v vsakem primeru
    // We update the button size in any case
    updateCtlButtonSize();
    
    if(debugmsg)
      console.log("uw::onMessage | message number:",num_of_msg," »» everything is done. Buttons: ", document.getElementsByClassName("uw-button"));
  }
  
  if(message.type && message.type == "arInfo"){
    char_got_ar = true;
    char_arx = message.arx;
    char_ary = message.ary;
    if(debugmsg || debugmsg_message || debugmsg_autoar)
      console.log("uw::onMessage | got aspect ratio (",char_arx,"/",char_ary,"), launching autochar");
    autochar();
  }
  
});

// browser.runtime.onMessage.addListener(request => {
//   console.log("Message from the background script:");
//   console.log(request.greeting);
//   return Promise.resolve({response: "Hi from content script"});
// });

if(debugmsg)
  console.log("uw | Comms with background scripts: done");
//END comms with uw-bg

//BEGIN periodic functions
//Because onUpdated event isn't reliable enough for what we're doing on netflix.
function periodic() {
  if(debugmsg_periodic)
    console.log("uw::periodic started!");
  
  if(document.getElementsByClassName("uw_element").length === 0){
    if(debugmsg)
      console.log("uw::periodic | no buttons detected. Readding.");
    
    init();
    addCtlButtons(0);
    updateCtlButtonSize();
  }
  var w = window.innerWidth;
  var h = window.innerHeight;
  if(winsize.w != w && winsize.h != h){
    console.log("uw::periodic | detected change in window size. Triggering css change");
    winsize.w = w;
    winsize.h = h;
    
    // We don't do that if we zoomed or unzoomed
    if(last_whatdo.what_do != "zoom" && last_whatdo.what_do != "unzoom"/* && last_whatdo.type != "autoar"*/){
      changeCSS(last_whatdo.type, last_whatdo.what_do);
    }
      
    updateCtlButtonSize();
  }
  var controls = document.getElementsByClassName("player-controls-wrapper")[0];
  if(controls){
    if(debugmsg_periodic)
      console.log("uw::periodic | we found controls!");
      
    var ind = controls.className.indexOf("display-none");
    if(debugmsg_periodic)
      console.log("uw::periodic | ind:",ind,"last ind:",netflix_cltbar_visibility);
    // controls must be visible. We must have not called updateCtlButtonSize before.   
    if( ind != netflix_cltbar_visibility ){
      if(debugmsg)
        console.log("uw::periodic | toggled visibility");
      netflix_cltbar_visibility = ind;
      if(ind == -1)
        updateCtlButtonSize();
    }
  }
    
  if(page_url.indexOf("netflix.com") != -1 && autoar_enabled){
    //Netflix-specific stuff
    var qntitle = document.querySelector(".player-status-main-title");
    var ntitle = "";
    
    //querySelector lahko vrne null, zato moramo preveriti, kaj smo dobili — drugače se .textContent pritožuje.
    //querySelector can return null, in which case .textContent will complain.
    if(qntitle)
      ntitle = qntitle.textContent;
    else{
      char_got_ar = false;
      return;
    }
    if(qntitle && ntitle && ntitle != title){
      if(debugmsg || debugmsg_message || debugmsg_autoar)
        console.log("uw::periodic | title changed. New title:",ntitle,"Old title:",title);
      
      char_got_ar = false;
      
      title = ntitle;
      var sending = browser.runtime.sendMessage({
        type: "gibAspectRatio",
        title: title
      });
//       sending.then( function(){}, function(err1, err2){console.log("uw::periodic: there was an error while sending a message", err1, err2)} );
    }
  }
  
}
//END periodic functions



$(document).ready(function() {
  if(debugmsg)
    console.log("uw::document.ready | document is ready. Starting extension setup ...");
  extSetup();
});

//BEGIN EXTENSION SETUP

function extSetup(){
  if(debugmsg)
    console.log("==============================================================================================");
  
  last_location = window.location;
  
  
  if(debugmsg){
    console.log("uw::extSetup | our current location is:", last_location);
    console.log("uw::extSetup | initiating extension");
  }
  var ini = init();
  
  if(debugmsg){
    console.log("uw::extSetup | init exited with", ini);
    console.log("uw::extSetup | removing existing keydown event from document (useful if extension was previously loaded and we navigated to a different video)");
  }
  $(document).off("keydown");
  
  if(debugmsg)
    console.log("uw::extSetup | setting up keyboard shortcuts");
  
  loadFromStorage();
  keydownSetup();  
//   addCtlButtons(0);
  buildUInative();
//   updateCtlButtonSize();
  updateUICSS();
  
  if(page_url.indexOf("netflix.com") != -1){
    console.log("uw::extSetup | starting netflix-specific setup steps");
    if(netflix_periodic_timer)
      clearInterval(netflix_periodic_timer);
    netflix_periodic_timer = setInterval(function(){ periodic(); }, 100);
  }
  
  if(debugmsg)
    console.log("======================================[ setup finished ]======================================");
}

function loadFromStorage(){
  if(debugmsg || debugmsg_autoar)
    console.log("uw::loadFromStorage | loading stuff from storage.");
  
  if(usebrowser == "chrome"){
    browser.storage.local.get("ultrawidify_autoar", function(data){ extsetup_autoar(data)});
    browser.storage.local.get("ultrawidify_keybinds", function(data){ extsetup_keybinds(data)});
  }
  else{
    browser.storage.local.get("ultrawidify_autoar").then(function(opt){
      if(debugmsg || debugmsg_autoar)
        console.log("uw::loadFromStorage | setting up autoar. opt:",opt)
      extsetup_autoar(opt);
      if(debugmsg || debugmsg_autoar)
        console.log("autoar_enabled:",autoar_enabled);
    });
    var ask4keybinds = browser.storage.local.get("ultrawidify_keybinds").then(extsetup_keybinds);
  }
}

function keydownSetup(){
  if(debugmsg)
    console.log("uw::keydownSetup | starting keybord shortcut setup");
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
    if(debugmsg || debugmsg_message){
//       console.log(KEYBINDS);
      console.log("we pressed a key: ", event.key , " | keydown: ", event.keydown);
      if(event.key == 'p'){
        console.log("uw/keydown: attempting to send message")
        var sending = browser.runtime.sendMessage({
          type: "debug",
          message: "Test message, please ignore"
        });
        sending.then( function(){}, function(){console.log("uw/keydown: there was an error while sending a message")} );
        console.log("uw/keydown: test message sent! (probably)");
        return;
      }
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
          event.stopPropagation();
          
          console.log("uw::keydown | keys match. Taking action.");
          if(KEYBINDS[i].action == "char"){
            changeCSS("char", KEYBINDS[i].targetAR);
            return;
          }
          if(KEYBINDS[i].action == "autoar"){
            manual_autoar();
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
}

function extsetup_autoar(opt){
  if(usebrowser == "chrome")
    obj = opt;
  else
    obj = opt[0];
  
  //Naslov resetiramo v vsakem primeru
  //We always reset the title
  title = "";
  if(obj === undefined)
    return;
  if(obj.ultrawidify_autoar === undefined){
    if(debugmsg || debugmsg_autoar)
      console.log("uw::extsetup_autoar | autoar setting unavailavle in storage. Setting defaults.");
      browser.storage.local.set({ultrawidify_autoar: uw_autoar_default});
    autoar_enabled = uw_autoar_default;
  }
  else 
    autoar_enabled = obj.ultrawidify_autoar;
  
  if(debugmsg || debugmsg_autoar)
    console.log("uw::extsetup_autoar | autoar",(autoar_enabled ? "enabled":"disabled"),"opt: ",opt);
  
  if(!autoar_enabled)
    last_whatdo = {type: "reset", what_do:"reset"};
}

function extsetup_keybinds(res){
  if(usebrowser == "chrome")
    obj = res;
  else
    obj = res[0];
  
  if(typeof uw_keybinds_storage_set === "undefined" && (jQuery.isEmptyObject(obj) || jQuery.isEmptyObject(obj.ultrawidify_keybinds)) ){
    if(debugmsg)
      console.log("uw::<init keybinds> | No keybindings found. Loading default keybinds as keybinds");
    
    browser.storage.local.set({ultrawidify_keybinds:DEFAULT_KEYBINDINGS});
    KEYBINDS = DEFAULT_KEYBINDINGS;
    uw_keybinds_storage_set = true;
  }
  else{
    if(Object.keys(obj.ultrawidify_keybinds).length == Object.keys(DEFAULT_KEYBINDINGS).length)
      KEYBINDS = obj.ultrawidify_keybinds;
    else{
      KEYBINDS = obj.ultrawidify_keybinds;
      
      // remap 4:3 keybind from 'a' to 'c', but only if the keybind wasn't changed
      var old_keybinds = Object.keys(obj.ultrawidify_keybinds);
      if(KEYBINDS[old_keybinds-1].key == "a" && KEYBINDS[old_keybinds-1].modifiers == []){
        KEYBINDS[old_keybinds-1].key == "c";
      }
      KEYBINDS[old_keybinds] = {action: "autoar", key: "a", modifiers: []};
    }
  }
  //   console.log("res. ", obj.ultrawidify_keybinds);
}

  //BEGIN UI

function check4player(recursion_depth){
  try{
    var button_width = document.getElementsByClassName(sample_button_class)[sample_button_index].scrollWidth;
    return true;
  }
  catch(e){
    // Zato, ker predvajalnik ni vselej prisoten. Če predvajalnik ni prisoten,
    // potem tudi knofov ni. Kar pomeni problem.
    // 
    // Because the player isn't always there, and when the player isn't there the buttons aren't, either.
    // In that case, the above statement craps out, throws an exception and trashes the extension.
    if(debugmsg)
      console.log("uw::addCtlButtons | seems there was a fuckup and no buttons were found on this page. No player (and therefore no buttons) found.");
    
    if(!recursion_depth)
      recursion_depth = 0;
    
    // If buttons weren't found, we relaunch init() just
    init();
    return recursion_depth < playercheck_recursion_depth_limit ? check4player(++recursion_depth) : false;
  }
  return false;
}

function mkanchor(){
  // Youtube
  if(page_url.indexOf("youtube") != -1 || page_url.indexOf("youtu.be") != 1){
    ui_anchor = document.createElement("div");
    ui_anchor.className = "uw_ui_anchor";
    ui_anchor.id = "uw_ui_anchor";
    $(document.getElementsByClassName("ytp-right-controls")[0]).prepend(ui_anchor);
  }
  
}
 
function buildUInative(){
  /** This function builds UI in the native bar.
   * 
   */
  
  if(!ui_anchor)
    mkanchor();
  
  if(debugmsg || debugmsg_ui )
    console.log("uw::buildUInative | starting to build UI");
  
  var el;
  for(key in UW_UI_BUTTONS){
    el = UW_UI_BUTTONS[key];
    
    if(!el.native_bar)
      continue;
    
    var uiel; //ui element
    
    if(el.button){
      uiel = mkbutton(el);
    }
    
    if(!uiel)
      continue;
    
    ui_anchor.appendChild(uiel);
    
    if(el.has_submenu){
      uiel.appendChild(mksubmenu(el));
    }
  }
  
  if(debugmsg || debugmsg_ui )
    console.log("uw::buildUInative | ui finished");
}

function mksubmenu(el){
  var submenu = document.createElement("div");
  submenu.id = el.submenu_id;
  submenu.className = "uw_element uw_submenu";
  
  for(var i = 0; i < el.submenu.length; i++){
    submenu.appendChild(mkmenuitem(el.submenu[i]));
  }
  
  return submenu;
}

function mkmenuitem(key){
  var el = UW_UI_BUTTONS[key];
  var item = document.createElement("div");
  item.textContent = el.text;
  item.className = "uw-setmenu-item uw_element";
  item.onclick = function(event){ event.stopPropagation(); el.onclick(); hideAllMenus(); };
  
  if(el.has_submenu){
    item.appendChild(mksubmenu(el)); 
    $(item).on("mouseenter", function(){showMenu(el.submenu_id)});
    $(item).on("mouseleave", function(){hideMenu(el.submenu_id)});
  }
  
  return item;
}

function mkbutton(el){
  if(debugmsg | debugmsg_ui)
    console.log("uw::mkbutton | trying to make a button", el.text);
  
  var button = document.createElement("div");
  button.style.backgroundImage = 'url(' + resourceToUrl(el.icon) + ')';
//   button.style.width = (button_width * 0.75) + "px";
//   button.style.height = (button_width) + "px";
//   button.style.width = 0;
//   button.style.marginLeft = (button_width * 0.3) + "px";
//   button.style.paddingLeft = (button_width *0.15 ) + "px";
//   button.style.paddingRight = (button_width * 0.15) + "px";
  button.className += " uw_button uw_element";
  button.onclick = function(event) { event.stopPropagation(); el.onclick };
  
  if(debugmsg | debugmsg_ui)
    console.log("uw::mkbutton | button completed");
  
  return button;
}

function updateUICSS(){
  //BEGIN update buttons
  var buttons = document.getElementsByClassName("uw_button");
  
  var button_width = getBaseButtonWidth();
  
  if(debugmsg)
    console.log("uw::updateUICSS | resizing buttons. This are our buttons:",buttons," | a button is this wide:", button_width);
  
  if(button_width == -1 || buttons.length == 0){ //this means there's no ui
    if(debugmsg)
      console.log("uw::updateUICSS | UI wasn't detected, stopping");
    return;
  }
  
  if(debugmsg){
    console.log("uw::updateUICSS | checks passed. Starting to resize ...");
    console.log("uw::updateUICSS | we have this many elements:",buttons.length, buttons);
  }
  for (var i = 0; i < buttons.length; i++){
    buttons[i].style.width = (button_width * 0.75) + "px";
    buttons[i].style.height = (button_width) + "px";
//     buttons[i].style.width = 0;
    buttons[i].style.marginLeft = (button_width * 0.3) + "px";
    buttons[i].style.paddingLeft = (button_width *0.15 ) + "px";
    buttons[i].style.paddingRight = (button_width * 0.15) + "px";
  }
  
  
  //END update buttons
  
}

function getBaseButtonWidth(){
  try{
    // Na različnih straneh širino gumba poberemo na različne načine.
    if(button_size_base == "y")
      return document.getElementsByClassName(sample_button_class)[sample_button_index].scrollHeight;
    else
      return document.getElementsByClassName(sample_button_class)[sample_button_index].scrollWidth;
  }
  catch(e){
    // Zato, ker predvajalnik ni vselej prisoten. Če predvajalnik ni prisoten,
    // potem tudi knofov ni. Kar pomeni problem.
    // 
    // Because the player isn't always there, and when the player isn't there the buttons aren't, either.
    // In that case, the above statement craps out, throws an exception and trashes the extension.
    if(debugmsg)
      console.log("uw::getBaseButtonWidth | seems there was a fuckup and no buttons were found on this page. No player (and therefore no buttons) found.");
    return -1;
  }
}

var align_to = "bottom"; //TODO — unhardcode
function alignToBottom(){
  return align_to == "bottom";
}

function addCtlButtons(recursion_depth){
  return;
  if(debugmsg)
    console.log("uw::addCtlButtons | function started");
  
  // Gumb za nastavitve je bolj kot ne vselej prisoten, zato širino tega gumba uporabimo kot širino naših gumbov
  // Settings button is more or less always there, so we use its width as width of our buttons
  try{
    // Na različnih straneh širino gumba poberemo na različne načine.
    if(button_size_base == "y")
      var button_width = document.getElementsByClassName(sample_button_class)[sample_button_index].scrollHeight;
    else
      var button_width = document.getElementsByClassName(sample_button_class)[sample_button_index].scrollWidth;
    
    if(debugmsg)
      console.log("uw::addCtlButtons | width of the element is ", button_width , "and is based on the height of this element:", document.getElementsByClassName(sample_button_class)[sample_button_index], " <extra tags: onMessage>")
  }
  catch(e){
    // Zato, ker predvajalnik ni vselej prisoten. Če predvajalnik ni prisoten,
    // potem tudi knofov ni. Kar pomeni problem.
    // 
    // Because the player isn't always there, and when the player isn't there the buttons aren't, either.
    // In that case, the above statement craps out, throws an exception and trashes the extension.
    
    if(recursion_depth === undefined)
      recursion_depth = 0;
    
    if(debugmsg)
      console.log("uw::addCtlButtons | seems there was a fuckup and no buttons were found on this page. No player (and therefore no buttons) found. Recursion depth:",recursion_depth);
    
    // If buttons weren't found, we relaunch init() just in case
    init();
    return recursion_depth < playercheck_recursion_depth_limit ? addCtlButtons(++recursion_depth) : false;
    
    return false;
  }
  var button_def = [];
  if(page_url.indexOf("netflix.com") != -1)
    button_def = [ "fitw", "fith", "reset", "zoom", "uzoom"/*, "settings" */];  // No settings button on netflix until further notice
  else
    button_def = [ "fitw", "fith", "reset", "zoom", "uzoom", "settings" ];
  
  if(debugmsg)
    console.log("uw::addCtlButtons | trying to add buttons");
  
  /* Če je ta dodatek že nameščen, potem odstranimo vse elemente. Vsi top-level elementi imajo definiran prazen razred
  // uw_element, prek katerega jih naberemo na kup. Ta del kode je tu bolj ali manj zaradi debugiranja.
  // 
  // If this addon is already installed, we have to remove all prevously added elements (to avoid duplicating).
  // The easiest way to gather all of them is to tack an empty class, 'uw_element,' to each top-level element we add.
  // This is here mostly because debugging, but could also be useful in case of unforseen happenings.
  */
  var previousElements = document.getElementsByClassName("uw_element");

  /* Uporabimo while loop in vselej odstranimo prvi element. Tabela previousElements se z odstranjevanjem elementov
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
  */
  if(!debugmsg && !debugmsg_click){
    /* Če je debugmsg false, potem verjetno ne dodajamo nobenih novih funkcionalnosti, zaradi katerih bi bilo potrebno
    // ponovno naložiti vmesnik. Zato tega ne storimo, temveč ohranimo stare gumbe. Ker so ok.
    // 
    // If debugging is false, then we aren't adding any new features that would require us to reload UI. So we leave
    // the old UI in place, because it should be good enough.
    */
    
    if(previousElements && previousElements.length > 0){
      return;
    }
  }
  
  while (previousElements && previousElements.length > 0){
    previousElements[0].parentNode.removeChild(previousElements[0]);
  }
  
  var check_width = false;
  
  // If we're on youtube:
  if(page_url.indexOf("youtu") != -1){
    check_width = true;
    
    var rctl;
    var rctl_width;
    var lctl_width;
    var ctlbar_width;
    
    if(inIframe())
      player = document.getElementById("player");
    else
      player = document.getElementById("movie_player");
     
    rctl = document.getElementsByClassName("ytp-right-controls")[0];
    rctl_width = rctl.offsetWidth;
    lctl_width = document.getElementsByClassName("ytp-left-controls")[0].offsetWidth;
    ctlbar_width = document.getElementsByClassName("ytp-chrome-controls")[0].offsetWidth;
    
  }
  
  // Ker na različne strani knofe dodajamo na različne načine, določanje lastnosti in dodajanje gumbov na
  // vmesnik izvedemo posebej
  // Because different pages require adding buttons to the UI in a different order, we handle defining button
  // properties and adding buttons to the UI in different loops.
  
  var btns = button_def.length;
  var settings_menu_mid = document.createElement("div");
  
  for(var i = 0; i < btns; i++){
    buttons[i] = document.createElement('div');
    buttons[i].style.backgroundImage = 'url(' + resourceToUrl("/res/img/ytplayer-icons/" + button_def[i] + ".png") + ')';
    buttons[i].style.width = (button_width * 0.75) + "px";
    buttons[i].style.height = (button_width) + "px";
    buttons[i].style.width = 0;
    //       buttons[i].style.marginLeft = (button_width * 0.3) + "px";
    buttons[i].style.paddingLeft = (button_width *0.15 ) + "px";
    buttons[i].style.paddingRight = (button_width * 0.15) + "px";
    buttons[i].className += " uw-button uw_element";
  }
    
  // Tukaj dodamo gumbe na stran
  // Here we add the buttons
    
  if(page_url.indexOf("netflix.com") != -1){
    for( var i = 0; i < btns; i++){
      ui_anchor.appendChild(buttons[i]);
    }
  }
  else{  
    for( var i = (btns - 1); i >= 0; i--){
      $(rctl).prepend(buttons[i]);
    }
  }
  
  // Če na ctlbar ni prostora za vse knofe, potem skrijemo vse knofe razen tistega, ki ima popup z vsemi možnostmi
  // 
  // If ctlbar doesn't have the space for all the buttons, we hide all except the one that contains the popup
  // with all the options
  
  if(check_width && (rctl_width + lctl_width) * 1.1 > ctlbar_width){  //TODO: don't hardcode that 4
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
  if(btns > 5){
    buttons[5].onclick = function() { 
      if(debugmsg || debugmsg_click)
        console.log("uw::kbm <button[5] onclick> | we clicked the button 5 with id ‘uw-smenu’. Button:",document.getElementById("uw-smenu"));
      toggleMenu("uw-smenu");
    };
    buttons[5].id = "uw-settings-button";
  }
  var settings_menu = document.createElement("div");
//   settings_menu_mid.appendChild(settings_menu);
  var smenu_ar_menu = document.createElement("div");
  
  var smenu_el = [];
  for(var i = 0; i < 7; i++){
    smenu_el[i] = document.createElement("div");
  }
  
  var smenu_ar_options = [];
  
  if(buttons[5])
    buttons[5].appendChild(settings_menu);

  //Če rabimo skriti gumb za nastavitve, potem mora biti i=1
  //If we need to hide settings button, then we should make i=1
  
  //FIXME: knof za nastavitve ne radi (nastavitve se ne odprejo)
  //FIXME: 'settings' button on the player doesn't work
  
  for(var i = 1; i < smenu_el.length; i++){
    settings_menu.appendChild(smenu_el[i]);
    smenu_el[i].className += "uw-setmenu-item uw_setmenu_main uw_element";
  }
  
  
  for(var i = 0; i < 4; i++){
    smenu_ar_options[i] = document.createElement("div");
    smenu_ar_options[i].className = "uw-setmenu-item uw_setmenu_ar uw_element";
    smenu_ar_menu.appendChild(smenu_ar_options[i]);
  }
  
  settings_menu.id = "uw-smenu";
//   settings_menu_mid.className = "uw-setmenu uw_element";
  settings_menu.className = "uw-setmenu uw_element";
//   settings_menu.className = "uw_element";
  
  
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
  var smenu_max_h = player.clientHeight * 0.75;
  
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
    smenu_ar_options[i].height = smenu_item_height + "px";
    smenu_ar_options[i].width = smenu_ar_item_width + "px";
  }

  
  // Tukaj se določa notranji HTML knofov
  // Inner HTML of elements is defined here
  smenu_el[6].textContent = "Force aspect ratio";
  smenu_el[6].appendChild(smenu_ar_menu);
  
  smenu_el[0].textContent = "Settings";
  
  smenu_ar_options[0].textContent = "4:3";
  smenu_ar_options[1].textContent = "16:10";    
  smenu_ar_options[2].textContent = "16:9";
  smenu_ar_options[3].textContent = "21:9";
                          
  smenu_el[5].textContent = "Fit width";
  smenu_el[4].textContent = "Fit height";
  smenu_el[3].textContent = "Reset";
  smenu_el[1].textContent = "Zoom in";
  smenu_el[2].textContent = "Zoom out";
  
  // Pritisneš gumb, nekej zakon se more narest.
  //                              — Bioware
  //                                ( https://www.youtube.com/watch?v=hMcVZQI6ybw | [NVZD] )
  //                        
  // Press the button, something awesome has to happen.
  //                              — Bioware
  //                                ( https://www.youtube.com/watch?v=hMcVZQI6ybw | [NSFW] )
  if(smenu_el[6]){
    $(smenu_el[6]).on("mouseenter", function(){showMenu("uw-armenu")});
    $(smenu_el[6]).on("mouseleave", function(){hideMenu("uw-armenu")});
    smenu_el[6].onclick = function(event){event.stopPropagation(); showMenu("uw-armenu")};
  }
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
  


  
  
  if(debugmsg)
    console.log("uw::addCtlButtons | buttons added");
  
  return true;
}

function updateCtlButtonSize(){
  // Gumb za nastavitve je bolj kot ne vselej prisoten, zato širino tega gumba uporabimo kot širino naših gumbov
  // Settings button is more or less always there, so we use its width as width of our buttons
  try{
    // Na različnih straneh širino gumba poberemo na različne načine.
    if(button_size_base == "y")
      var button_width = document.getElementsByClassName(sample_button_class)[sample_button_index].scrollHeight;
    else
      var button_width = document.getElementsByClassName(sample_button_class)[sample_button_index].scrollWidth;
  }
  catch(e){
    // Zato, ker predvajalnik ni vselej prisoten. Če predvajalnik ni prisoten,
    // potem tudi knofov ni. Kar pomeni problem.
    // 
    // Because the player isn't always there, and when the player isn't there the buttons aren't, either.
    // In that case, the above statement craps out, throws an exception and trashes the extension.
    if(debugmsg)
      console.log("uw::updateCtlButtonSize | seems there was a fuckup and no buttons were found on this page. No player (and therefore no buttons) found.");
    return;
  }
  var buttons = document.getElementsByClassName("uw-button");
  
  for(var i = 0; i < buttons.length; i++){
    buttons[i].style.width = (button_width * 0.75) + "px";
    buttons[i].style.height = (button_width) + "px";
    buttons[i].style.paddingLeft = (button_width *0.15 ) + "px";
    buttons[i].style.paddingRight = (button_width * 0.15) + "px";
  }
  
  var smenu_item_width = (button_width * 7.5);
  var smenu_item_fontSize = (button_width * 0.5);
  var smenu_ar_item_width = (smenu_item_width / 3);
  var smenu_item_height = button_width;
  
  if(debugmsg || debugmsg_click)
    console.log("uw::updateCtlButtonSize | changing css of menu items");
  
  var settings_menu = document.getElementById("uw-smenu");
  if(settings_menu != null){
    settings_menu.style.bottom = (button_width * 1.5) + "px";
    settings_menu.style.width = smenu_item_width + "px";
    settings_menu.style.fontSize = smenu_item_fontSize + "px";
  }
//   smenu_ar_menu.style.right = smenu_item_width + "px";
//   smenu_ar_menu.style.width = smenu_ar_item_width + "px";
//   smenu_ar_menu.style.bottom = "0px";
//   smenu_ar_men
  
  document.getElementById("uw-smenu_ar").right = smenu_item_width;
  
  buttons = document.getElementsByClassName("uw_setmenu_main");
  for(var i = 0; i < buttons.length; i++){
    buttons[i].style.width = smenu_item_width + "px";
    buttons[i].style.height = smenu_item_height + "px";
    buttons[i].style.fontSize = smenu_item_fontSize + "px";
  }
  buttons = document.getElementsByClassName("uw_setmenu_ar");
  for(var i = 0; i < buttons.length; i++){
    buttons[i].style.width = smenu_ar_item_width + "px";
    buttons[i].style.height = smenu_item_height + "px";
    buttons[i].style.fontSize = smenu_item_fontSize + "px";
    buttons[i].style.right = smenu_item_width + "px";
  }
}

//END UI
//END EXTENSION SETUP

function onOpen(){
  if(debugmsg)
    console.log("uw | Options page opened");
}

function onError(err){
  if(debugmsg){
    console.log(`Error: ${error}`);
    console.log("uw | Error opening the page", err);
  }
}

function showSettings(){
  
}

// Ta funkcija se proži, ko vstopimo ali izstopimo iz celozaslonskega načina
// This function gets triggered by full screen state change
function onFullScreenChange(){
  // Popravimo velikost gumbov
  // Let's fix the button size:
  var button_width = document.getElementsByClassName(sample_button_class)[sample_button_index].scrollWidth;
  for( var i = 5; i >= 0; i--){
    buttons[i].style.width = (button_width * 0.75) + "px";
    buttons[i].style.paddingLeft = (button_width *0.15 ) + "px";
    buttons[i].style.paddingRight = (button_width * 0.15) + "px";
  }
  
  document.getElementById("uw-smenu").style.bottom = (button_width * 1.5) + "px";
  
  //Sedaj poglejmo še, če lahko v nadzorno vrstico spravimo vse gumbe
  //Let's see if we can get all the buttons in the control bar
//   var rctl = document.getElementsByClassName("ytp-right-controls")[0];
  
}


// Ta funkcija se proži, ko gremo v celozaslonski način
// This function triggers when we enter fullscreen mode
function onFullscreenOn(){
  
}

// Ta funkcija se proži, ko gremo ven iz celozaslonskega načina
// This function triggers when we leave fullscreen mode
function onFullscreenOff(){

}

function manual_autoar(){
  if(page_url.indexOf("netflix.com") != -1){
    var ntitle = document.querySelector(".player-status-main-title");
    
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
  
}

function changeCSS(type, what_do){
  if(debugmsg)
    console.log("uw::changeCSS | starting function. type:", type, "; what_do:",what_do);
//   hideMenu("uw-armenu");
//   hideMenu("uw-smenu");
  
  
  var evideo = $("video")[0];
  
  if(!evideo){
    if(debugmsg)
      console.log("uw::changeCSS | no video element found. Doing nothing.");
    
    return;
  }
  
  var video = { width: evideo.videoWidth, height: evideo.videoHeight };
  
  var nplayer = { width: player.clientWidth, height: player.clientHeight };
  
  if(debugmsg)
    console.log("uw::changeCSS | video dimensions:",video.width,"x",video.height,"; player:",nplayer.width,"x",nplayer.height);
  
  // Youtube predvajalnik privzeto resetira CSS ob prehodu v/iz fullscreen. Tukaj shranimo zadnje dejanje,
  // da ga lahko onFullscreenOff/onFullscreenOn uveljavita.
  // 
  // Youtube player resets CSS on fullscreen state change. Here we save the last action taken, so 
  // onFullscreenOff/onFullscreenOn are able to preserve it (if we want).
  last_whatdo = {type:type, what_do:what_do};
  
  // -----------------------------------------------------------------------------------------
  //  Handlanje dejanj se zgodi pod to črto
  //  
  //  Handling actions happens below this line
  // -----------------------------------------------------------------------------------------
  
  if (type == "autoar"){
    autochar();
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
  
  if(inFullScreen || (
    (document.activeElement.getAttribute("role") != "textbox") &&
    (document.activeElement.getAttribute("type") != "text")
    )){
    if(debugmsg)
      console.log("uw::changeCSS | trying to fit width or height");
    
    changeCSS_nofs(what_do, video, nplayer);
  }
  
  
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

function autochar(){
  
  if(debugmsg || debugmsg_autoar)
    console.log("uw::autochar | starting. Did we get ar?",char_got_ar,"What about arx and ary?",char_arx,char_ary);
  
  if(!char_got_ar)
    return;
  
  if(!char_arx || !char_ary)
    return;
  
  var ar = char_arx / char_ary;
  if(ar){
    set_best_fit(ar);
    last_whatdo = {type: "autoar", what_do: "autoar"};
  }
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

// Ta funkcija ugotovi, kako se kvadrat s podanim razmerjem stranic najbolj prilega ekranu
// Predpostavimo, da so ćrne obrobe vselej zgoraj in spodaj, nikoli levo in desno.
// 
// This function determines how a rectangle with a given aspect ratio best fits the monitor
// We assume letterbox is always letterbox, never pillarbox.
function set_best_fit(ar){
  if(debugmsg || debugmsg_autoar)
    console.log("uw::set_best_fit | got ar:",ar);
  
  var player = {width: this.player.clientWidth, height: this.player.clientHeight};
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
    console.log("uw::set_best_fit | here's all we got. ar:",ar,"player:",player,"video:",video);
  
  var tru_width = player.height * ar;
  var tru_height = player.width / ar;
  
  var nv = {w: "", h: "", top: "", left: ""};
  
  if(ar >= video_ar){
    if(ar >= player_ar){
      if(debugmsg || debugmsg_autoar)
        console.log("uw::set_best_fit | aspect ratio is wider than player ar.")
      nv.h = player.width / video_ar;
      nv.w = nv.h * ar;
    }
    else{
      if(debugmsg || debugmsg_autoar)
        console.log("uw::set_best_fit | aspect ratio is narrower than player ar.", (player.height * ar), nv)
      nv.w = player.height * ar;
      nv.h = nv.w / video_ar;
    }
  }
  else{
    if(ar >= player_ar){
      if(debugmsg || debugmsg_autoar)
        console.log("uw::set_best_fit | aspect ratio is wider than player ar.")
      nv.h = player.width / ar;
      nv.w = nv.h * video_ar;
    }
    else{
      if(debugmsg || debugmsg_autoar)
        console.log("uw::set_best_fit | aspect ratio is narrower than player ar.", (player.height * ar), nv)
        nv.w = player.height * video_ar;
      nv.h = nv.w / ar;
    }
  }
  if(debugmsg || debugmsg_autoar)
    console.log("uw::set_best_fit | new video width and height processed. nv so far:", nv)
  
  nv.top = (player.height - nv.h)/2;
  nv.left = (player.width - nv.w)/2;
  
  if(debugmsg || debugmsg_autoar)
    console.log("uw::set_best_fit | tru width:",tru_width,"(player width:",player.width,"); new video size:",nv);
  
  applyCSS(nv);
  console.log("uw::set_best_fit | css applied");
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
  applyCSS(dimensions);
}

function applyCSS(dimensions){
  dimensions.top = Math.round(dimensions.top) + "px";
  dimensions.left = Math.round(dimensions.left) + "px";
  dimensions.w = Math.round(dimensions.w) + "px";
  dimensions.h = Math.round(dimensions.h) + "px";
  
  $("video").css({"width": dimensions.w,"height": dimensions.h,"top": dimensions.top, "left": dimensions.left});
  
  if(debugmsg)
    console.log("uw::applycss | css applied. Dimensions/pos: w:",dimensions.w,"; h:",dimensions.h,"; top:",dimensions.top,"; left:",dimensions.left);
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
  if(debugmsg){
    console.log("uw::showMenu | showing menu with id ", id, "\n\n", document.getElementById(id));
  }
  document.getElementById(id).classList.add("show");
}
function toggleMenu(id){
  if(debugmsg || debugmsg_click)
    console.log("uw::toggleMenu | toggling menu with id", id, "\n\n", document.getElementById(id));
  document.getElementById(id).classList.toggle("show");
}

function hideMenu(id){
  if(debugmsg)
    console.log("uw::hideMenu | hiding menu with id " + id);
  if(document.getElementById(id)) //Safety check in case there's no element with such id
    document.getElementById(id).classList.remove("show");
}
