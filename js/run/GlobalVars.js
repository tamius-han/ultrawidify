var GlobalVars = {
  video: null,
  player: null,
  playerDimensions: null,
  lastAr: null,
  lastUrl: "",
  currentCss: {
    top: null,
    left: null
  },
  arDetect: {
    blackbarTreshold: 10,
    guardLine: {
      top: null,
      bottom: null,
      logo: {
        detected: false,
        top_left: null,
        top_right: null,
        bottom_left: null,
        bottom_right: null
      }
      start: null,
      end: null
    }
  }
}
