//#region GlobalPanel
var GlobalPanel = {};
GlobalPanel.container = BaseElement.fromExisting(document.getElementById('_menu_settings_global'))
GlobalPanel.elements = {};
GlobalPanel.elements.extensionSettings = {
  buttons: {},
  container: BaseElement.fromExisting(document.getElementById('_menu_settings_global_status')),
  buttonContainer: BaseElement.fromExisting(document.getElementById('_menu_settings_global_status_buttons'))
}
GlobalPanel.elements.autoarSettings = {
  buttons: {},
  container: BaseElement.fromExisting(document.getElementById('_menu_settings_global_autoar')),
  buttonContainer: BaseElement.fromExisting(document.getElementById('_menu_settings_global_autoar_buttons'))
}
GlobalPanel.elements.stretchSettings = {
  buttons: {},
  container: BaseElement.fromExisting(document.getElementById('_menu_settings_global_crop')),
  buttonContainer: BaseElement.fromExisting(document.getElementById('_menu_settings_global_stretch_buttons'))
}
GlobalPanel.elements.alignmentSettings = {
  buttons: {},
  container: BaseElement.fromExisting(document.getElementById('_menu_settings_global_alignment')),
  buttonContainer: BaseElement.fromExisting(document.getElementById('_menu_settings_global_alignment_buttons'))
}
//#endregion

//#region SitePanel
var SitePanel = {};
SitePanel.elements = {};
SitePanel.container = BaseElement.fromExisting(document.getElementById('_menu_settings_site'))
SitePanel.elements.extensionSettings = {
  buttons: {},
  container: BaseElement.fromExisting(document.getElementById('_menu_settings_site_status')),
  buttonContainer: BaseElement.fromExisting(document.getElementById('_menu_settings_site_status_buttons'))
}
SitePanel.elements.autoarSettings = {
  buttons: {},
  container: BaseElement.fromExisting(document.getElementById('_menu_settings_site_autoar')),
  buttonContainer: BaseElement.fromExisting(document.getElementById('_menu_settings_site_autoar_buttons'))
}
SitePanel.elements.stretchSettings = {
  buttons: {},
  container: BaseElement.fromExisting(document.getElementById('_menu_settings_site_stretch')),
  buttonContainer: BaseElement.fromExisting(document.getElementById('_menu_settings_site_stretch_buttons'))
};
SitePanel.elements.alignmentSettings = {
  container: BaseElement.fromExisting(document.getElementById('_menu_settings_site_alignment')),
  buttonContainer: BaseElement.fromExisting(document.getElementById('_menu_settings_site_alignment_buttons'))
};
//#endregion



//#region VideoPanel
var VideoPanel = {};
VideoPanel.elements = {};
VideoPanel.container = BaseElement.fromExisting(document.getElementById('_menu_settings_video'))
VideoPanel.elements.cropSettings = {
  buttons: {},
  container: BaseElement.fromExisting(document.getElementById('_menu_settings_video_crop')),
  buttonContainer: BaseElement.fromExisting(document.getElementById('_menu_settings_video_crop_buttons'))
}
VideoPanel.elements.stretchSettings = {
  buttons: {},
  container: BaseElement.fromExisting(document.getElementById('_menu_settings_video_stretch')),
  buttonContainer: BaseElement.fromExisting(document.getElementById('_menu_settings_video_stretch_buttons'))
}
VideoPanel.elements.alignmentSettings = {
  buttons: {},
  container: BaseElement.fromExisting(document.getElementById('_menu_settings_video_alignment')),
  buttonContainer: BaseElement.fromExisting(document.getElementById('_menu_settings_video_alignment_buttons'))
}

// THE FOLLOWING BUTTONS ARE STILL HANDLED THE OLD-FASHIONED WAY
// DO NOT REMOVE
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


//#region about
var AboutPanel = {};
AboutPanel.container = BaseElement.fromExisting(document.getElementById('_menu_about'))

//#endregion

