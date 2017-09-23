var UICONF;

function uinit(){
  if(debugmsg)
    console.log("player_ui::uinit | initializing elements from the webpage");
  
  var site = UW_SITES[SITE];
  
  if(debugmsg)
    console.log("player_ui::uinit | site data:",site,"\n\n\nsite.player.name:", site.player.name,"\nsite.player.isClass:", site.player.isClass);
  
  SITE_ENABLED = site.enabled;
  SITE_TYPE = site.type;
  SITE_URL_RULES = site.urlRules;
  SITE_PROPS = site;
  
  if(debugmsg)
    console.log("player_ui::uinit | are we in iframe?", inIframe(), "does the site have a separate config for iframe?", site.iframe ? true : false );
  
  if(inIframe() && site.iframe){
    console.log("player_ui::uinit | we're in iframe.");
    PLAYER = site.iframe.isClass ? document.getElementsByClassName(site.iframe.name)[0] : document.getElementById(site.iframe.name);
  }
  else{
    PLAYER = site.player.isClass ? document.getElementsByClassName(site.player.name)[0] : document.getElementById(site.player.name);
  }
  
  // 
  if( site.ui.uiMode == "native")
    NATIVE_UI = true;
  else
    NATIVE_UI = false;
  
  UICONF = site.ui.uiconf;
  
  console.log("player_ui::uinit |\nsite.ui.uiMode: ", site.ui.uiMode,"\nsite.ui.uiMode.uiconf:",site.ui.uiconf,"\nUICONF: ", UICONF);
    
  IMDB_AUTOAR_ALLOWED = site.autoar_imdb.enabled;
  
  if(debugmsg)
    console.log("player_ui::uinit | initializing elements from the webpage");
}

function buildUInative(){
  /** This function builds UI in the native bar.
  * 
  */
  if(debugmsg || debugmsg_ui)
    console.log("player_ui::buildUInative | starting ...");
  
  if(ui_anchor){
    console.log("player_ui::buildUInative | anchor found, doing nothing");
    return;
  
  }
  if(!ui_anchor)
    mkanchor();
  
  if(UW_UI_MODE == "none"){
    if(debugmsg || debugmsg_ui)
      console.log("player_ui::buildUInative | usersettings say UI shouldn't be displayed. UI will not be built.");
    return;
  }
  if(UW_UI_MODE == "compact"){
    if(debugmsg || debugmsg_ui)
      console.log("player_ui::buildUInative | usersettings say UI should be compact if possible. Checking if possible.");
    
    if(UW_UI_BANLIST[SITE].settings !== undefined && UW_UI_BANLIST[SITE].settings != "noban"){
      if(debugmsg || debugmsg_ui)
        console.log("player_ui::buildUInative | compact ui is not possible on this site. Reverting to full.");
      UW_UI_MODE == "all";
    }
  }
  
  if(debugmsg || debugmsg_ui )
    console.log("player_ui::buildUInative | starting to build UI");
  
  var el;
  
  if(UW_UI_MODE == "compact"){       // no need for loop if all we add is the 'settings' buton
    el = UW_UI_BUTTONS.settings;
    uiel = mkbutton(el);
    uiel.appendChild(mksubmenu(el));
    ui_anchor.appendChild(uiel);
  }
  else{
    for(key in UW_UI_BUTTONS){
      
      el = UW_UI_BUTTONS[key];
      
      if(UW_UI_BANLIST[SITE][key]){
        if(debugmsg)
          console.log("player_ui::buildUInative | we don't show", key, "on site", SITE, ". Doing nothing.");
        
        continue;
      }
      
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
  }
  
  if(debugmsg || debugmsg_ui )
    console.log("player_ui::buildUInative | ui finished");
}

function mksubmenu(el){
  var submenu = document.createElement("div");
  submenu.id = el.submenu_id;
  submenu.className = "uw_element uw_submenu";
  
  for(var i = 0; i < el.submenu.length; i++){
    if(UW_UI_BANLIST[SITE][el.submenu[i]]){
      if(debugmsg)
        console.log("player_ui::mksubmenu | we don't show", el.submenu[i], "on site", SITE, ". Doing nothing.");
      
      continue;
    }
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
    
    if(debugmsg){
      console.log("player_ui::mkmenuitem | we are:", el, "; do we have parent?",el.parent,"parent id:",UW_UI_BUTTONS[el.parent].submenu_id, UW_UI_BUTTONS[el.parent].submenu_id === "uw_settings_menu");
    }
    
    if(el.parent)
      $(item).on("mouseenter", function(){
        // We determine where the submenu goes - to the left or to the right. showMenu handles position,
        // this function gets sizes of all objects
        var div = document.getElementById(UW_UI_BUTTONS[el.parent].submenu_id);
        var supmenusize = div.getBoundingClientRect();
        div = document.getElementById(el.submenu_id);
        var submenusize = div.getBoundingClientRect();
        var playersize = player.getBoundingClientRect();
        
        if(debugmsg)
          console.log("player_ui::mouseenter | parent menu size:",supmenusize,"submenu size:",submenusize,"player size:",playersize);
        
        showMenu(el.submenu_id, {parent:supmenusize, submenu:submenusize, player:playersize});
      });
      else
        $(item).on("mouseenter", function(){showMenu(el.submenu_id)});
      
      $(item).on("mouseleave", function(){hideMenu(el.submenu_id)});
  }
  
  return item;
}

function mkanchor(){
  
  if (debugmsg || debugmsg_ui)
    console.log("player_ui::mkanchor | starting.\nNATIVE_UI: ",NATIVE_UI);
  
  
  if( NATIVE_UI !== true ){
    if(debugmsg || debugmsg_ui)
      console.log("player_ui::mkanchor | we don't use native UI, calling mkanchor_notify(common=true) to take over");
    
    mkanchor_notify(true);
    return;
  }
  else{
    if(debugmsg || debugmsg_ui)
      console.log("player_ui::mkanchor | will make anchor for notifications, calling mkanchor_notify(common=false)");
    
    mkanchor_notify(false);
  }
  
  if (debugmsg || debugmsg_ui)
    console.log("player_ui::mkanchor | anchor for notifications created.");
  
  
  ui_anchor = document.createElement("div");
  ui_anchor.className = "uw_ui_anchor";
  ui_anchor.id = "uw_ui_anchor";
  
  if(UICONF.uiParent.insertStrat == "prepend"){
    $(document.getElementsByClassName(UICONF.uiParent.name)[0]).prepend(ui_anchor);
  }
  else{
    document.getElementsByClassName(UICONF.uiParent.name)[0].appendChild(ui_anchor);
  }
  
  if (debugmsg || debugmsg_ui)
    console.log("player_ui::mkanchor | anchor created.");
  
}

function mkanchor_notify(common){
  
  if (debugmsg || debugmsg_ui)
    console.log("player_ui::mkanchor_common | starting.\n\ncommon anchor: ",common,"\nUICONF: ",UICONF,"\nUICONF.uiOffset: ",UICONF.uiOffset);
  
  if( document.getElementById("uw_common_anchor") )
    return;
  
  
  var anchor = document.createElement("div");
  anchor.className = "uw_common_anchor";
  anchor.id = "uw_common_anchor";
  
  // Izračunamo zamik zaradi drugih elementov na zaslonu
  // Let's calculate offset due to other elements on the screen
  
  var offsetTop = "0px";
  
  if ( UICONF.uiOffset.offsetType == "element_id" || UICONF.uiOffset.offsetType == "element_class"){
    
    var blockingElement;
    if( UICONF.uiOffset.offsetType == "element_id" )
      blockingElement = document.getElementById(UICONF.uiOffset.offsetBy);
    else
      blockingElement = document.getElementsByClassName(UICONF.uiOffset.offsetBy)[0];
    
    offsetTop = blockingElement.offsetTop + blockingElement.offsetHeight + "px";
  }
  else if( UICONF.uiOffset.offsetType == "css" )
    offsetTop = UICONF.uiOffset.offsetBy;
  
  if(debugmsg || debugmsg_ui)
    console.log("player_ui::mkanchor_notify | notification box will be offset by this much:", offsetTop);
  
  
  var padding = document.createElement("div");
  padding.style.width = "100%";
  padding.style.height = offsetTop;
  
  anchor.appendChild(padding);
  
  var notification_box = document.createElement("div");
  notification_box.style.width = "50%";
  notification_box.style.height = "25%";
  notification_box.textContent = "test box";
  
  if(debugmsg)
    console.log("player_ui::mkanchor_notify | this is our notification box: ", notification_box);
  
  anchor.appendChild(notification_box);
    
  PLAYER.appendChild(anchor);
  
  
}

function mkbutton(el){
  if(debugmsg | debugmsg_ui)
    console.log("player_ui::mkbutton | trying to make a button", el.text);
  
  var button = document.createElement("div");
  button.style.backgroundImage = 'url(' + resourceToUrl(el.icon) + ')';
  button.className += " uw_button uw_element";
  button.onclick = function(event) {event.stopPropagation(); el.onclick() };
  
  if(debugmsg | debugmsg_ui)
    console.log("player_ui::mkbutton | button completed");
  
  return button;
}
