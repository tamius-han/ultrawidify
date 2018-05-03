var GlobalVars = {
  video: null,
  player: null,
  playerDimensions: null,
  playerElement: null,
  lastAr: null,
  lastUrl: "",
  currentCss: {
    top: null,
    left: null
  },
  canvas: {
    context: null,
    width: null,
    height: null,
    imageDataRowLength: null
  },
  correctedVideoDimensions: {
    width: null,
    height: null,
    top: null,
    left: null
  },
  arDetect: {
    autoDisable: {
      eventCount: 0
    },
    canvas: null,
    blackLevel: 10,
    sampleCols_current: 0,
    noLetterboxCanvasReset: false,
    guardLine: {
      top: null,
      bottom: null,
      logo: {
        detected: false,
        top_left: null,
        top_right: null,
        bottom_left: null,
        bottom_right: null
      },
      start: null,
      end: null
    }
  }
}
