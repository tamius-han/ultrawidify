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