var UW_SITES = {
  youtube: {
    enabled: true,
    type: "official",
    urlRules: ["youtu"],
    player: {
      name: "movie_player",
      isClass: false,
    },
    iframe: {
      name: "player",
      isClass: false
    },
    sampleButton: {
      class: "ytp-button ytp-settings-button",
      index: 0,
      buttonSizeBase: "x",
    },
    uiParent: {
      name: "ytp-right-controls",
      isClass: true,
      insertStrat: "prepend",
    },
    autoar_imdb:{
      enabled: false
    }
  },
  netflix: {
    enabled: true,
    type: "official",
    urlRules: ["netflix"],
    player: {
      name: "placeholder",
      isClass: true,
    },
    sampleButton: {
      class: "ytp-button ytp-settings-button",
      index: 0,
      buttonSizeBase: "x",
    },
    uiParent: {
      name: "player-controls-wrapper",
      isClass: true,
      insertStrat: "append"
    },
    autoar_imdb:{
      enabled: true,
      title: "player-status-main-title",
      isClass: true
    }
  },
  dummy: {
    type: "add new site",
    urlRules: [""],
    player: {
      name: "",
      isClass: false,
    },
    sampleButton: {
      class: "ytp-button ytp-settings-button",
      index: 0,
      buttonSizeBase: "x",
    },
    uiParent: {
      name: "",
      isClass: false,
      insertStrat: "prepend",
    },
    autoar_imdb:{
      enabled: false
    }
  }
} 
