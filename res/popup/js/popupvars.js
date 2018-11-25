var Menu = {};
// Menu.noVideo    = document.getElementById("no-videos-display");
Menu.extensionSettings = document.getElementById('_menu_settings_ext');
Menu.siteSettings      = document.getElementById('_menu_settings_site');
Menu.videoSettings     = document.getElementById('_menu_settings_video');
Menu.about             = document.getElementById('_menu_about')

var MenuTab = {};
MenuTab.extensionSettings = document.getElementById('_menu_tab_settings_ext');
MenuTab.siteSettings      = document.getElementById('_menu_tab_settings_site');
MenuTab.videoSettings     = document.getElementById('_menu_tab_settings_video');
MenuTab.about             = document.getElementById('_menu_tab_about')

MenuTab.videoSettings_items = document.getElementById('_menu_tab_settings_video_items');

//#region ExtPanel
var ExtPanel = {};
ExtPanel.extOptions = {};
ExtPanel.extOptions.blacklist = document.getElementById("_ext_global_options_blacklist");
ExtPanel.extOptions.whitelist = document.getElementById("_ext_global_options_whitelist");
ExtPanel.extOptions.disabled  = document.getElementById("_ext_global_options_disabled");
ExtPanel.arOptions = {};
ExtPanel.arOptions.blacklist   = document.getElementById("_ar_global_options_blacklist");
ExtPanel.arOptions.whitelist  = document.getElementById("_ar_global_options_whitelist");
ExtPanel.arOptions.disabled    = document.getElementById("_ar_global_options_disabled");
ExtPanel.alignment = {};
ExtPanel.alignment.left       = document.getElementById("_align_ext_left");
ExtPanel.alignment.center     = document.getElementById("_align_ext_center");
ExtPanel.alignment.right      = document.getElementById("_align_ext_right");
ExtPanel.stretch = {};
ExtPanel.stretch['0']         = document.getElementById("_stretch_global_none");
ExtPanel.stretch['1']         = document.getElementById("_stretch_global_basic");
ExtPanel.stretch['2']         = document.getElementById("_stretch_global_hybrid");
ExtPanel.stretch['3']         = document.getElementById("_stretch_global_conditional");
//#endregion


//#region SitePanel
var SitePanel = {};
SitePanel.extOptions = {};
SitePanel.extOptions.enabled   = document.getElementById("_ext_site_options_whitelist");
SitePanel.extOptions.default   = document.getElementById("_ext_site_options_default");
SitePanel.extOptions.disabled  = document.getElementById("_ext_site_options_blacklist");
SitePanel.arOptions = {};
SitePanel.arOptions.disabled   = document.getElementById("_ar_site_options_disabled");
SitePanel.arOptions.enabled    = document.getElementById("_ar_site_options_enabled");
SitePanel.arOptions.default    = document.getElementById("_ar_site_options_default");
SitePanel.alignment = {};
SitePanel.alignment.left       = document.getElementById("_align_site_left");
SitePanel.alignment.center     = document.getElementById("_align_site_center");
SitePanel.alignment.right      = document.getElementById("_align_site_right");
SitePanel.alignment.default    = document.getElementById("_align_site_default");
SitePanel.stretch = {};
SitePanel.stretch['-1']        = document.getElementById("_stretch_site_default")
SitePanel.stretch['0']         = document.getElementById("_stretch_site_none")
SitePanel.stretch['1']         = document.getElementById("_stretch_site_basic")
SitePanel.stretch['2']         = document.getElementById("_stretch_site_hybrid")
SitePanel.stretch['3']         = document.getElementById("_stretch_site_conditional")
//#endregion

//#region GlobalPanel
var GlobalPanel = {};
GlobalPanel.elements = {};
GlobalPanel.elements.extensionSettings = {
  container: BaseElement.fromExisting(document.getElementById('_menu_settings_global_status')),
  buttonContainer: BaseElement.fromExisting(document.getElementById('_menu_settings_global_status_buttons'))
}
GlobalPanel.elements.autoarSettings = {
  container: BaseElement.fromExisting(document.getElementById('_menu_settings_global_autoar')),
  buttonContainer: BaseElement.fromExisting(document.getElementById('_menu_settings_global_autoar_buttons'))
}
GlobalPanel.elements.stretchSettings = {
  container: BaseElement.fromExisting(document.getElementById('_menu_settings_global_crop')),
  buttonContainer: BaseElement.fromExisting(document.getElementById('_menu_settings_global_stretch_buttons'))
}
GlobalPanel.elements.alignmentSettings = {
  container: BaseElement.fromExisting(document.getElementById('_menu_settings_global_alignment')),
  buttonContainer: BaseElement.fromExisting(document.getElementById('_menu_settings_global_alignment_buttons'))
}
//#endregion

//#region SitePanel
var SitePanel = {};
GlobalPanel.elements = {};
GlobalPanel.elements.extensionSettings = {
  container: BaseElement.fromExisting(document.getElementById('_menu_settings_site_status')),
  buttonContainer: BaseElement.fromExisting(document.getElementById('_menu_settings_site_status_buttons'))
}
GlobalPanel.elements.autoarSettings = {
  container: BaseElement.fromExisting(document.getElementById('_menu_settings_site_autoar')),
  buttonContainer: BaseElement.fromExisting(document.getElementById('_menu_settings_site_autoar_buttons'))
}
GlobalPanel.elements.stretchSettings = {
  container: BaseElement.fromExisting(document.getElementById('_menu_settings_site_crop')),
  buttonContainer: BaseElement.fromExisting(document.getElementById('_menu_settings_site_crop_buttons'))
};
GlobalPanel.elements.alignmentSettings = {
  container: BaseElement.fromExisting(document.getElementById('_menu_settings_site_alignment')),
  buttonContainer: BaseElement.fromExisting(document.getElementById('_menu_settings_site_alignment_buttons'))
};
//#endregion



//#region VideoPanel
var VideoPanel = {};
VideoPanel.elements = {};
VideoPanel.elements.cropSettings = {
  container: BaseElement.fromExisting(document.getElementById('_menu_settings_video_crop')),
  buttonContainer: BaseElement.fromExisting(document.getElementById('_menu_settings_video_crop_buttons'))
}
VideoPanel.elements.stretchSettings = {
  container: BaseElement.fromExisting(document.getElementById('_menu_settings_video_stretch')),
  buttonContainer: BaseElement.fromExisting(document.getElementById('_menu_settings_video_stretch_buttons'))
}
VideoPanel.elements.alignmentSettings = {
  container: BaseElement.fromExisting(document.getElementById('_menu_settings_video_alignment')),
  buttonContainer: BaseElement.fromExisting(document.getElementById('_menu_settings_video_alignment_buttons'))
}

// buttons: for toggle, select
VideoPanel.buttons = {};
VideoPanel.buttons.zoom = {};
VideoPanel.buttons.zoom.showShortcuts = document.getElementById("_zoom_b_show_shortcuts");
VideoPanel.buttons.zoom.hideShortcuts = document.getElementById("_zoom_b_hide_shortcuts");
VideoPanel.buttons.changeAr = {};
VideoPanel.buttons.changeAr.showCustomAr = document.getElementById("_changeAr_b_show_customAr");
VideoPanel.buttons.changeAr.hideCustomAr = document.getElementById("_changeAr_b_hide_customAr");

// inputs (getting values)
VideoPanel.inputs = {};
VideoPanel.inputs.zoomSlider       = document.getElementById("_input_zoom_slider");
VideoPanel.inputs.allowPan         = document.getElementById("_input_zoom_site_allow_pan");

// various labels
VideoPanel.labels = {};
VideoPanel.labels.zoomLevel        = document.getElementById("_label_zoom_level");

// misc stuff
VideoPanel.misc = {};
VideoPanel.misc.zoomShortcuts      = document.getElementById("_zoom_shortcuts");
//#endregion