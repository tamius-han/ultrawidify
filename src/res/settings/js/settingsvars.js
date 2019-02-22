var ui = {
  general: {
    extensionSettings: {
      buttonContainer: BaseElement.fromExisting(document.getElementById('_general_extension_global_settings')),
      buttons: [],
      whitelistTextbox: document.getElementById('_general_extension_whitelist'),
      blacklistTextbox: document.getElementById('_general_extension_blacklist')
    },
    autoarSettings: {
      buttonContainer: BaseElement.fromExisting(document.getElementById('_general_extension_global')),
      buttons: []
    },
    alignmentSettings: {
      buttonsContainer: BaseElement.fromExisting(document.getElementById('_general_extension_global_alignment')),
      buttons: []
    },
    stretchSettings: {
      buttonContainer: BaseElement.fromExisting(document.getElementById('_general_extension_global_stretch')),
      buttons: [],
      thinBordersThresholdInput: document.getElementById('_general_extension_global_stretch_thin_borders_threshold_input')
    }
  },


  // Automatic detection settings:
  autoar: {
    autoarSettings: {
      buttonContainer: BaseElement.fromExisting(document.getElementById('_autoar_global_settings')),
      buttons: [],
      whitelistTextbox: document.getElementById('_autoar_whitelist'),
      blacklistTextbox: document.getElementById('_autoar_blacklist')
    },
    checkFrequency: {
      playingCheckFrequencyInput: document.getElementById('_autoar_checkFrequency_playing'),
      pausedCheckFrequencyInput: document.getElementById('_autoar_checkFrequency_paused'),
      errorCheckFrequencyInput: document.getElementById('_autoar_checkFrequency_error')
    }
  },


  // Customization settings
  customization: {
    actionList: BaseElement.fromExisting(document.getElementById('_customization_action_list')),
    actionItems: [],
  }
}
