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
     text: "Zoom",
     onclick: function(){ changeCSS("fit", "zoom") }
   },
   unzoom: {
     native_bar: true,
     has_submenu: false,
     button: true,
     icon: "/res/img/ytplayer-icons/unzoom.png",
     text: "Unzoom",
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
     top_level: true,
     submenu_id: "uw_settings_menu",
     onclick: function(){ toggleMenu("uw_settings_menu") }
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

 var UW_UI_BANLIST = {
   youtube: {
     autoar: "all"
   },
   netflix: {
     settings: "all"
   }
 }
 
 
