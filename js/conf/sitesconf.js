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
    ui: {
      uiMode: "native",
      uiconf: {
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
        uiOffset: {
          offsetBy: "10vh",
          offsetType: "css"
        }
      }
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
    ui: {
      uiMode: "native",
      uiconf: {
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
        uiOffset: {
          offsetBy: "0px",
          offsetType: "css"
        }
      }
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
