if(Debug.debug)
  console.log("Loading: ExtensionConf.js");

var ExtensionConf = {
  extensionMode: "whitelist", // how should this extension work? 
                              //       'blacklist' - work everywhere except blacklist
                              //       'whitelist' - only work on whitelisted sites
                              //       'disabled'  - work nowhere
  arDetect: {
    mode: "blacklist",        // how should autodetection work?
                              //       'blacklist' - work by default, problem sites need to be blocked
                              //       'whitelist' - only work if site has been specifically approved
                              //       'disabled'  - don't work at all 
    disabledReason: "",       // if automatic aspect ratio has been disabled, show reason
    allowedMisaligned: 0.05,  // top and bottom letterbox thickness can differ by this much. 
                              // Any more and we don't adjust ar.
    allowedArVariance: 0.075, // amount by which old ar can differ from the new (1 = 100%)
    timer_playing: 666,       // we trigger ar this often (in ms) under this conditions
    timer_paused: 3000,
    timer_error: 3000,
    timer_minimumTimeout: 5,  // but regardless of above, we wait this many msec before retriggering
    autoDisable: {            // settings for automatically disabling the extension
      maxExecutionTime: 6000, // if execution time of main autodetect loop exceeds this many milliseconds,
                              // we disable it.
      consecutiveTimeoutCount: 5,  // we only do it if it happens this many consecutive times

      // FOR FUTURE USE
      consecutiveArResets: 5       // if aspect ratio reverts immediately after AR change is applied, we disable everything
    },
    hSamples: 640,
    vSamples: 360,
    // samplingInterval: 10,     // we sample at columns at (width/this) * [ 1 .. this - 1] 
    blackLevel_default: 10,   // everything darker than 10/255 across all RGB components is considered black by
                              // default. GlobalVars.blackLevel can decrease if we detect darker black.
    blackbarTreshold: 16,     // if pixel is darker than blackLevel + blackbarTreshold, we count it as black
                              // on 0-255. Needs to be fairly high (8 might not cut it) due to compression
                              // artifacts in the video itself
    variableBlackbarTresholdOptions: {    // In case of poor bitrate videos, jpeg artifacts may cause us issues
      // FOR FUTURE USE
      enabled: true,                      // allow increasing blackbar threshold
      disableArDetectOnMax: true,         // disable autodetection when treshold goes over max blackbar treshold
      maxBlackbarTreshold: 48,            // max threshold (don't increase past this)
      thresholdStep: 8,                   // when failing to set aspect ratio, increase treshold by this much
      increaseAfterConsecutiveResets: 2   // increase if AR resets this many times in a row
    },
    staticSampleCols: 9,      // we take a column at [0-n]/n-th parts along the width and sample it
    randomSampleCols: 0,      // we add this many randomly selected columns to the static columns
    staticSampleRows: 9,      // forms grid with staticSampleCols. Determined in the same way. For black frame checks
    guardLine: {              // all pixels on the guardline need to be black, or else we trigger AR recalculation 
                              // (if AR fails to be recalculated, we reset AR)
      enabled: true,
      ignoreEdgeMargin: 0.20, // we ignore anything that pokes over the black line this close to the edge
                              // (relative to width of the sample)
      imageTestTreshold: 0.1, // when testing for image, this much pixels must be over blackbarTreshold
      edgeTolerancePx: 2,         // black edge violation is performed this far from reported 'last black pixel'
      edgeTolerancePercent: null  // unused. same as above, except use % of canvas height instead of pixels
    },
    fallbackMode: {
      enabled: true,
      safetyBorderPx: 5,        // determines the thickness of safety border in fallback mode
      noTriggerZonePx: 8        // if we detect edge less than this many pixels thick, we don't correct.
    },
    arSwitchLimiter: {          // to be implemented 
      switches: 2,              // we can switch this many times
        period: 2.0             // per this period
    },
    edgeDetection: {
      sampleWidth: 8,        // we take a sample this wide for edge detection
      detectionTreshold: 4,  // sample needs to have this many non-black pixels to be a valid edge
      singleSideConfirmationTreshold: 0.3,   // we need this much edges (out of all samples, not just edges) in order
                                             // to confirm an edge in case there's no edges on top or bottom (other
                                            // than logo, of course)
      logoTreshold: 0.15,     // if edge candidate sits with count greater than this*all_samples, it can't be logo
                              // or watermark.
      edgeTolerancePx: 2,          // we check for black edge violation this far from detection point
      edgeTolerancePercent: null,  // we check for black edge detection this % of height from detection point. unused
      middleIgnoredArea: 0.2,      // we ignore this % of canvas height towards edges while detecting aspect ratios
      minColsForSearch: 0.5,       // if we hit the edge of blackbars for all but this many columns (%-wise), we don't
                                   // continue with search. It's pointless, because black edge is higher/lower than we
                                   // are now. (NOTE: keep this less than 1 in case we implement logo detection)
      edgeTolerancePx: 1,          // tests for edge detection are performed this far away from detected row 
    },
    pillarTest: {
      ignoreThinPillarsPx: 5, // ignore pillars that are less than this many pixels thick. 
      allowMisaligned: 0.05   // left and right edge can vary this much (%)
    },
    textLineTest: {
      nonTextPulse: 0.10,     // if a single continuous pulse has this many non-black pixels, we aren't dealing 
                              // with text. This value is relative to canvas width (%)
      pulsesToConfirm: 10,    // this is a treshold to confirm we're seeing text.
      pulsesToConfirmIfHalfBlack: 5, // this is the treshold to confirm we're seeing text if longest black pulse
                                     // is over 50% of the canvas width
      testRowOffset: 0.02     // we test this % of height from detected edge
    }
  },
  arChange: {
    samenessTreshold: 0.025,  // if aspect ratios are within 2.5% within each other, don't resize
  },
  miscFullscreenSettings: {
    videoFloat: "center"
  },
  stretch: {
    initialMode: 0,                     // 0 - no stretch, 1 - basic, 2 - hybrid, 3 - conditional
    conditionalDifferencePercent: 0.05  // black bars less than this wide will trigger stretch
                                        // if mode is set to '1'. 1.0=100%
  },
  resizer: {
    setStyleString: {
      maxRetries: 3,
      retryTimeout: 200
    }
  },
  pageInfo: {
    timeouts: {
      urlCheck: 200,
      rescan: 1500
    }
  },
  colors:{
    //     criticalFail: "background: #fa2; color: #000"
  },
  keyboard: {
    shortcuts: {
      // automatic
      "a": {
        action: "auto-ar",
      },
      //#region crop
      "r": {
        action: "crop",
        arg: "reset"
      },
      "w": {
        action: "crop",
        arg: "fitw"
      },
      "e": {
        action: "crop",
        arg: "fith"
      },
      "s": {
        action: "crop",
        arg: 1.78 
      },
      "d": {
        action: "crop",
        arg: 2.39
      },
      "x": {
        action: "crop",
        arg: 2.0
      },
      "q": {
        action: "crop",
        arg: 2.35
      },
      //#endregion
      //#region zoom
      "z": {
        action: "zoom",
        arg: 0.1
      },
      "u": {
        action: "zoom",
        arg: -0.1
      }
      //#endregion
    },
    modKeys: ["ctrlKey", "shiftKey", "altKey"]
  },
  // -----------------------------------------
  //       ::: SITE CONFIGURATION :::
  // -----------------------------------------
  // Nastavitve za posamezno stran
  // Config for a given page:
  // 
  // <hostname> : {
  //    status: <option>              // should extension work on this site?
  //    arStatus: <option>            // should we do autodetection on this site?
  //    statusEmbedded: <option>      // reserved for future... maybe
  // } 
  //  
  // Veljavne vrednosti za možnosti 
  // Valid values for options:
  //
  //     status, arStatus, statusEmbedded:
  //    
  //    * enabled     — always allow
  //    * default     — allow if default is to allow, block if default is to block
  //    * disabled    — never allow
  // 
  sites: {
    "www.youtube.com" : {
      status: "enabled",                // should extension work on this site?
      arStatus: "default",              // should we enable autodetection
      statusEmbedded: "enabled",        // should extension work for this site when embedded on other sites?
      override: false                   // ignore value localStorage in favour of this
    },
    "www.netflix.com" : {
      status: "enabled",
      arStatus: BrowserDetect.firefox ? "default" : "disabled",
      statusEmbedded: "enabled",
      override: false
    },
  }
}
