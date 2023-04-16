import Debug from './Debug';
import currentBrowser from './BrowserDetect';
import VideoAlignmentType from '../../common/enums/VideoAlignmentType.enum';
import StretchType from '../../common/enums/StretchType.enum';
import ExtensionMode from '../../common/enums/ExtensionMode.enum';
import AntiGradientMode from '../../common/enums/AntiGradientMode.enum';
import AspectRatioType from '../../common/enums/AspectRatioType.enum';
import CropModePersistence from '../../common/enums/CropModePersistence.enum';
import SettingsInterface from '../../common/interfaces/SettingsInterface';
import BrowserDetect from './BrowserDetect';
import { Extension } from 'typescript';

if(Debug.debug)
  console.log("Loading: ExtensionConf.js");

const ExtensionConf: SettingsInterface = {
  arDetect: {
    disabledReason: "",       // if automatic aspect ratio has been disabled, show reason
    allowedMisaligned: 0.05,  // top and bottom letterbox thickness can differ by this much.
                              // Any more and we don't adjust ar.
    allowedArVariance: 0.075, // amount by which old ar can differ from the new (1 = 100%)
    timers: {                 // autodetection frequency
      playing: 333,           // while playing
      paused: 3000,           // while paused
      error: 3000,            // after error
      minimumTimeout: 5,
      tickrate: 10,          // 1 tick every this many milliseconds
    },
    autoDisable: {            // settings for automatically disabling the extension
      maxExecutionTime: 6000, // if execution time of main autodetect loop exceeds this many milliseconds,
                              // we disable it.
      consecutiveTimeoutCount: 5,  // we only do it if it happens this many consecutive times

      // FOR FUTURE USE
      consecutiveArResets: 5       // if aspect ratio reverts immediately after AR change is applied, we disable everything
    },
    canvasDimensions: {
      blackframeCanvas: {   // smaller than sample canvas, blackframe canvas is used to recon for black frames
                            // it's not used to detect aspect ratio by itself, so it can be tiny af
        width: 16,
        height: 9,
      },
      sampleCanvas: {   // size of image sample for detecting aspect ratio. Bigger size means more accurate results,
                            // at the expense of performance
        width: 640,
        height: 360,
      },
    },

    // samplingInterval: 10,     // we sample at columns at (width/this) * [ 1 .. this - 1]
    blackframe: {
      sufficientColorVariance: 0.10,  // calculate difference between average intensity and pixel, for every pixel for every color
                                      // component. Average intensity is normalized to where 0 is black and 1 is biggest value for
                                      // that component. If sum of differences between normalized average intensity and normalized
                                      // component varies more than this % between color components, we can afford to use less strict
                                      // cumulative threshold.
      cumulativeThresholdLax: 1600,
      cumulativeThresholdStrict: 2560,// if we add values of all pixels together and get more than this, the frame is bright enough.
                                 // (note: blackframe is 16x9 px -> 144px total. cumulative threshold can be reached fast)
      blackPixelsCondition: 0.6, // How much pixels must be black (1 all, 0 none) before we consider frame as black. Takes
                                 // precedence over cumulative threshold: if blackPixelsCondition is met, the frame is dark
                                 // regardless of whether cumulative threshold has been reached.
    },
    blackbar: {
      blackLevel: 10,         // everything darker than 10/255 across all RGB components is considered black by
                              // default. blackLevel can decrease if we detect darker black.
      threshold: 16,          // if pixel is darker than the sum of black level and this value, we count it as black
                              // on 0-255. Needs to be fairly high (8 might not cut it) due to compression
                              // artifacts in the video itself
      frameThreshold: 4,      // threshold, but when doing blackframe test
      imageThreshold: 16,     // in order to detect pixel as "not black", the pixel must be brighter than
                              // the sum of black level, threshold and this value.
      gradientThreshold: 2,   // When trying to determine thickness of the black bars, we take 2 values: position of
                              // the last pixel that's darker than our threshold, and position of the first pixel that's
                              // brighter than our image threshold. If positions are more than this many pixels apart,
                              // we assume we aren't looking at letterbox and thus don't correct the aspect ratio.
      gradientSampleSize: 16, // How far do we look to find the gradient
      maxGradient: 6,         // if two neighboring pixels in gradientSampleSize differ by more than this, then we aren't
                              // looking at a gradient
      gradientNegativeTreshold: -2,
      gradientMaxSD: 6,    // reserved for future use
      antiGradientMode: AntiGradientMode.Lax,
    },
    variableBlackbarThresholdOptions: {    // In case of poor bitrate videos, jpeg artifacts may cause us issues
      // FOR FUTURE USE
      enabled: true,                      // allow increasing blackbar threshold
      disableArDetectOnMax: true,         // disable autodetection when threshold goes over max blackbar threshold
      maxBlackbarThreshold: 48,            // max threshold (don't increase past this)
      thresholdStep: 8,                   // when failing to set aspect ratio, increase threshold by this much
      increaseAfterConsecutiveResets: 2   // increase if AR resets this many times in a row
    },
    sampling: {
      staticCols: 9,      // we take a column at [0-n]/n-th parts along the width and sample it
      randomCols: 0,      // we add this many randomly selected columns to the static columns
      staticRows: 9,      // forms grid with staticSampleCols. Determined in the same way. For black frame checks
    },
    guardLine: {              // all pixels on the guardline need to be black, or else we trigger AR recalculation
                              // (if AR fails to be recalculated, we reset AR)
      enabled: true,
      ignoreEdgeMargin: 0.20, // we ignore anything that pokes over the black line this close to the edge
                              // (relative to width of the sample)
      imageTestThreshold: 0.1, // when testing for image, this much pixels must be over blackbarThreshold
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
      detectionThreshold: 4,  // sample needs to have this many non-black pixels to be a valid edge
      confirmationThreshold: 1,  //
      singleSideConfirmationThreshold: 3,    // we need this much edges (out of all samples, not just edges) in order
                                             // to confirm an edge in case there's no edges on top or bottom (other
                                            // than logo, of course)
      logoThreshold: 0.15,     // if edge candidate sits with count greater than this*all_samples, it can't be logo
                              // or watermark.
      edgeTolerancePx: 1,          // we check for black edge violation this far from detection point
      edgeTolerancePercent: null,  // we check for black edge detection this % of height from detection point. unused
      middleIgnoredArea: 0.2,      // we ignore this % of canvas height towards edges while detecting aspect ratios
      minColsForSearch: 0.5,       // if we hit the edge of blackbars for all but this many columns (%-wise), we don't
                                   // continue with search. It's pointless, because black edge is higher/lower than we
                                   // are now. (NOTE: keep this less than 1 in case we implement logo detection)
    },
    pillarTest: {
      ignoreThinPillarsPx: 5, // ignore pillars that are less than this many pixels thick.
      allowMisaligned: 0.05   // left and right edge can vary this much (%)
    },
    textLineTest: {
      nonTextPulse: 0.10,     // if a single continuous pulse has this many non-black pixels, we aren't dealing
                              // with text. This value is relative to canvas width (%)
      pulsesToConfirm: 10,    // this is a threshold to confirm we're seeing text.
      pulsesToConfirmIfHalfBlack: 5, // this is the threshold to confirm we're seeing text if longest black pulse
                                     // is over 50% of the canvas width
      testRowOffset: 0.02     // we test this % of height from detected edge
    }
  },
  crop: {
    default: {
      type: AspectRatioType.Automatic,
    }
  },
  zoom: {
    minLogZoom: -1,
    maxLogZoom: 3,
    announceDebounce: 200     // we wait this long before announcing new zoom
  },
  kbm: {
    enabled: true,
    keyboardEnabled: true,
    mouseEnabled: true
  },
  miscSettings: {
    mousePan: {
      enabled: false
    },
    mousePanReverseMouse: false,
  },
  stretch: {
    default: {
      type: StretchType.NoStretch
    },
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
  commands: {
    crop: [{
      action: 'set-ar',
      label: 'Automatic',
      comment: 'Automatically detect aspect ratio',
      arguments: {
        type: AspectRatioType.Automatic
      },
      shortcut: {
        key: 'a',
        code: 'KeyA',
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        onKeyUp: true,
        onKeyDown: false,
      }
    }, {
      action: 'set-ar',
      label: 'Reset',
      arguments: {
        type: AspectRatioType.Reset
      },
      shortcut: {
        key: 'r',
        code: 'KeyR',
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        onKeyUp: true,
        onKeyDown: false,
      }
    }, {
      action: 'set-ar',
      label: 'Fit width',
      comment: 'Make the video fit the entire width of the player, crop top and bottom if necessary',
      arguments: {
        type: AspectRatioType.FitWidth
      },
      shortcut: {
        key: 'w',
        code: 'KeyW',
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        onKeyUp: true,
        onKeyDown: false,
      }
    }, {
      action: 'set-ar',
      label: 'Fit height',
      comment: 'Make the video fit the entire height of the player, crop left and right if necessary',
      arguments: {
        type: AspectRatioType.FitHeight
      },
      shortcut: {
        key: 'e',
        code: 'KeyE',
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        onKeyUp: true,
        onKeyDown: false,
      }
    },{
      action: 'set-ar',
      label: 'Cycle',
      comment: 'Cycle through crop options',
      arguments: {
        type: AspectRatioType.Cycle
      },
      shortcut: {
        key: 'c',
        code: 'KeyC',
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        onKeyUp: true,
        onKeyDown: false,
      }
    }, {
      action: 'set-ar',
      label: '21:9',
      comment: 'Crop for 21:9 aspect ratio (1:2.39)',
      arguments: {
        type: AspectRatioType.Fixed,
        ratio: 2.39
      },
      shortcut: {
        key: 'd',
        code: 'KeyD',
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        onKeyUp: false,
        onKeyDown: true,
      }
    }, {
      action: 'set-ar',
      label: '18:9',
      comment: 'Crop for 18:9 aspect ratio (1:2)',
      arguments: {
        type: AspectRatioType.Fixed,
        ratio: 1.78
      },
      shortcut: {
        key: 's',
        code: 'KeyS',
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        onKeyUp: false,
        onKeyDown: true,
      }
    }, {
      action: 'set-ar',
      label: '32:9',
      comment: 'Crop for 32:9 aspect ratio',
      arguments: {
        type: AspectRatioType.Fixed,
        ratio: 3.56
      },
    }],
    stretch: [{
      action: 'set-stretch',
      label: 'Don\'t stretch',
      arguments: {
        type: StretchType.NoStretch
      }
    }, {
      action: 'set-stretch',
      label: 'Basic stretch',
      comment: 'There\'s literally no legitimate reason to use this option',
      arguments: {
        type: StretchType.Basic
      }
    }, {
      action: 'set-stretch',
      label: 'Hybrid stretch',
      comment: 'Applies crop first, then stretches to fill the remainder of the screen',
      arguments: {
        type: StretchType.Hybrid
      }
    }, {
      action: 'set-stretch',
      label: 'On thin borders',
      comment: 'Applies crop first. If only narrow black borders exist, the video will be stretched to cover the remainder of the screen. However, if stretching would be substantial, the video will NOT be stretched.',
      arguments: {
        type: StretchType.Conditional,
        limit: 0.1,
      },
    }, {
      action: 'set-stretch',
      label: 'Stretch to 16:9',
      comment: 'Applies crop first, then stretches video to 16:9.',
      arguments: {
        type: StretchType.FixedSource,
        ratio: 1.77,
      }
    }, {
      action: 'set-stretch',
      label: 'Stretch to 4:3',
      comment: 'Applies crop first, then stretches video to 4:3',
      arguments: {
        type: StretchType.FixedSource,
        ratio: 1.33
      }
    }, {
      action: 'set-stretch',
      label: 'Default',
      comment: 'Uses the default stretch mode',
      arguments: {
        type: StretchType.Default
      }
    }],
    zoom: [{
      action: 'change-zoom',
      label: 'Zoom +10%',
      arguments: {
        zoom: 0.1
      },
      shortcut: {
        key: 'z',
        code: 'KeyY',
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        onKeyUp: true,
        onKeyDown: false,
      },
      internalOnly: true,
      actionId: 'change-zoom-10in'
    }, {
      action: 'change-zoom',
      label: 'Zoom -10%',
      arguments: {
        zoom: -0.1
      },
      shortcut: {
        key: 'u',
        code: 'KeyU',
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        onKeyUp: true,
        onKeyDown: false,
      },
      internalOnly: true,
      actionId: 'change-zoom-10out'
    }, {
      action: 'set-zoom',
      label: 'Reset zoom',
      arguments: {
        zoom: 1,
      },
      internalOnly: true,
      actionId: 'set-zoom-reset'
    }],
    pan: [{
      action: 'set-alignment',
      label: 'Set alignment: top left',
      arguments: {
        x: VideoAlignmentType.Left,
        y: VideoAlignmentType.Top
      },
      internalOnly: true,
      actionId: 'set-alignment-top-left'
    }, {
      action: 'set-alignment',
      label: 'Set alignment: top center',
      arguments: {
        x: VideoAlignmentType.Center,
        y: VideoAlignmentType.Top
      },
      internalOnly: true,
      actionId: 'set-alignment-top-center',
    }, {
      action: 'set-alignment',
      label: 'Set alignment: top right',
      arguments: {
        x: VideoAlignmentType.Right,
        y: VideoAlignmentType.Top
      },
      internalOnly: true,
      actionId: 'set-alignment-top-right'
    }, {
      action: 'set-alignment',
      label: 'Set alignment: center left',
      arguments: {
        x: VideoAlignmentType.Left,
        y: VideoAlignmentType.Center
      },
      internalOnly: true,
      actionId: 'set-alignment-center-left'
    }, {
      action: 'set-alignment',
      label: 'Set alignment: center',
      arguments: {
        x: VideoAlignmentType.Center,
        y: VideoAlignmentType.Center
      },
      internalOnly: true,
      actionId: 'set-alignment-center'
    }, {
      action: 'set-alignment',
      label: 'Set alignment: center right',
      arguments: {
        x: VideoAlignmentType.Right,
        y: VideoAlignmentType.Center
      },
      internalOnly: true,
      actionId: 'set-alignment-center-right'
    }, {
      action: 'set-alignment',
      label: 'Set alignment: bottom left',
      arguments: {
        x: VideoAlignmentType.Left,
        y: VideoAlignmentType.Bottom
      },
      internalOnly: true,
      actionId: 'set-alignment-bottom-left'
    }, {
      action: 'set-alignment',
      label: 'Set alignment: bottom center',
      arguments: {
        x: VideoAlignmentType.Center,
        y: VideoAlignmentType.Bottom
      },
      internalOnly: true,
      actionId: 'set-alignment-bottom-center'
    }, {
      action: 'set-alignment',
      label: 'Set alignment: bottom right',
      arguments: {
        x: VideoAlignmentType.Right,
        y: VideoAlignmentType.Bottom
      },
      internalOnly: true,
      actionId: 'set-alignment-bottom-right'
    }, {
      action: 'set-alignment',
      label: 'Set alignment: default',
      arguments: {
        x: VideoAlignmentType.Default,
        y: VideoAlignmentType.Default
      }
    }],
    internal: [{
      action: 'set-ar-persistence',
      label: 'AR resets for every video',
      arguments: {
        arPersistence: CropModePersistence.Disabled
      }
    }, {
      action: 'set-ar-persistence',
      label: 'AR changes persist until changed or until next page reload',
      arguments: {
        arPersistence: CropModePersistence.UntilPageReload
      }
    }, {
      action: 'set-ar-persistence',
      label: 'AR changes persist until changed or until next browser restart',
      arguments: {
        arPersistence: CropModePersistence.CurrentSession
      }
    }, {
      action: 'set-ar-persistence',
      label: 'AR changes persist until changed',
      arguments: {
        arPersistence: CropModePersistence.Forever
      }
    }, {
      action: 'set-ar-persistence',
      label: 'Use default options',
      arguments: {
        arPersistence: CropModePersistence.Default
      }
    }, {
      action: 'set-extension-enabled',
      label: 'Enable extension',
      arguments: {
        mode: ExtensionMode.Enabled,
      },
      internalOnly: true,
    }, {
      action: 'set-extension-enabled',
      label: 'Whitelist',
      arguments: {
        mode: ExtensionMode.Whitelist,
      },
      internalOnly: true,
    }, {
      action: 'set-extension-enabled',
      label: 'Disable',
      arguments: {
        mode: ExtensionMode.Disabled
      },
      internalOnly: true,
    }, {
      action: 'set-extension-enabled',
      label: 'Use default option',
      arguments: {
        mode: ExtensionMode.Default
      },
      internalOnly: true
    }, {
      action: 'set-autoar-enabled',
      label: 'Enabled',
      comment: 'Enable automatic aspect ratio detection if possible',
      arguments: {
        mode: ExtensionMode.Enabled
      },
      internalOnly: true
    }, {
      action: 'set-autoar-enabled',
      label: 'Whitelist',
      comment: 'Enable automatic aspect ratio detection if possible, but only on whitelisted sites',
      arguments: {
        mode: ExtensionMode.Whitelist,
      },
      internalOnly: true,
    }, {
      action: 'set-autoar-enabled',
      label: 'Disable',
      comment: 'Disable aspect ratio detection',
      arguments: {
        mode: ExtensionMode.Disabled
      },
      internalOnly: true,
    }, {
      action: 'set-autoar-enabled',
      label: 'Use default option',
      arguments: {
        mode: ExtensionMode.Default
      },
      internalOnly: true
    }]
  },
  // -----------------------------------------
  //             ::: ACTIONS :::
  // -----------------------------------------
  actions: [{
    name: 'Trigger automatic detection',    // name displayed in settings
    label: 'Automatic',                     // name displayed in ui (can be overridden in scope/playerUi)
    cmd: [{
      action: 'set-ar',
      arg: AspectRatioType.Automatic,
      persistent: false, // optional, false by default. If true, change doesn't take effect immediately.
                         // Instead, this action saves stuff to settings
    }],
    scopes: {
      global: {          // if 'global' is undefined, 'show' is presumed to be 'false'
        show: false,
      },
      site: {
        show: false,
      },
      page: {
        show: true,
        label: 'Automatic',   // example override, takes precedence over default label
        shortcut: [{
          key: 'a',
          code: 'KeyA',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
          onKeyUp: true,
          onKeyDown: false,
        }],
      }
    },
    playerUi: {
      show: true,
      path: 'crop',
    },
  }, {
    name: 'Reset to default',
    label: 'Reset',
    cmd: [{
      action: 'set-ar',
      arg: AspectRatioType.Reset,
    }],
    scopes: {
      page: {
        show: true,
        shortcut: [{
          key: 'r',
          code: 'KeyR',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
          onKeyUp: true,
          onKeyDown: false,
        }],
      }
    },
    playerUi: {
      show: true,
      path: 'crop'
    },
  }, {
    name: 'Fit to width',
    label: 'Fit width',
    cmd: [{
      action: 'set-ar',
      arg: AspectRatioType.FitWidth,
    }],
    scopes: {
      page: {
        show: true,
        shortcut: [{
          key: 'w',
          code: 'KeyW',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
          onKeyUp: true,
          onKeyDown: false,
        }],
      }
    },
    playerUi: {
      show: true,
      path: 'crop'
    }
  }, {
    name: 'Fit to height',
    label: 'Fit height',
    cmd: [{
      action: 'set-ar',
      arg: AspectRatioType.FitHeight
    }],
    scopes: {
      page: {
        show: true,
        shortcut: [{
          key: 'e',
          code: 'KeyE',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
          onKeyUp: true,
          onKeyDown: false,
        }]
      }
    },
    playerUi: {
      show: true,
      path: 'crop'
    }
  }, {
    name: 'Cycle aspect ratio',
    label: 'Cycle',
    cmd: [{
      action: 'set-ar',
      arg: AspectRatioType.Cycle
    }]
  },{
    userAdded: true,
    name: 'Set aspect ratio to 16:9',
    label: '16:9',
    cmd: [{
      action: 'set-ar',
      arg: AspectRatioType.Fixed,
      customArg: 1.78,
    }],
    scopes: {
      page: {
        show: true,
        shortcut:  [{
          key: 's',
          code: 'KeyS',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
          onKeyUp: false,
          onKeyDown: true,
        }],
      }
    },
    playerUi: {
      show: true,
      path: 'crop'
    }
  }, {
    userAdded: true,
    name: 'Set aspect ratio to 21:9 (2.39:1)',
    label: '21:9',
    cmd: [{
      action: 'set-ar',
      arg: AspectRatioType.Fixed,
      customArg: 2.39
    }],
    scopes: {
      page: {
        show: true,
        shortcut: [{
          key: 'd',
          code: 'KeyD',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
          onKeyUp: false,
          onKeyDown: true,
        }]
      }
    },
    playerUi: {
      show: true,
      path: 'crop'
    }
  }, {
    userAdded: true,
    name: 'Set aspect ratio to 18:9',
    label: '18:9',
    cmd: [{
      action: 'set-ar',
      arg: AspectRatioType.Fixed,
      customArg: 2.0,
    }],
    scopes: {
      page: {
        show: true,
        shortcut: [{
          key: 'x',
          code: 'KeyX',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
          onKeyUp: true,
          onKeyDown: false,
        }]
      }
    },
    playerUi: {
      show: true,
      path: 'crop',
    }
  }, {
    name: 'Don\'t persist crop',
    label: 'Never persist',
    cmd: [{
      action: 'set-ar-persistence',
      arg: CropModePersistence.Disabled,
    }],
    scopes: {
      site: {
        show: true,
      },
      global: {
        show: true,
      }
    },
    playerUi: {
      show: true,
    }
  }, {
    name: 'Persist crop while on page',
    label: 'Until page load',
    cmd: [{
      action: 'set-ar-persistence',
      arg: CropModePersistence.UntilPageReload,
    }],
    scopes: {
      site: {
        show: true,
      },
      global: {
        show: true,
      }
    },
    playerUi: {
      show: true,
    }
  }, {
    name: 'Persist crop for current session',
    label: 'Current session',
    cmd: [{
      action: 'set-ar-persistence',
      arg: CropModePersistence.CurrentSession,
    }],
    scopes: {
      site: {
        show: true,
      },
      global: {
        show: true,
      }
    },
    playerUi: {
      show: true,
    }
  }, {
    name: 'Persist until manually reset',
    label: 'Always persist',
    cmd: [{
      action: 'set-ar-persistence',
      arg: CropModePersistence.Forever,
    }],
    scopes: {
      site: {
        show: true,
      },
      global: {
        show: true,
      }
    },
    playerUi: {
      show: true,
    }
  }, {
    name: 'Default crop persistence',
    label: 'Default',
    cmd: [{
      action: 'set-ar-persistence',
      arg: CropModePersistence.Default,
    }],
    scopes: {
      site: {
        show: true,
      },
    },
    playerUi: {
      show: true,
    }
  }, {
    name: 'Zoom in',
    label: 'Zoom',
    cmd: [{
      action: 'change-zoom',
      arg: 0.1
    }],
    scopes: {
      page: {
        show: false,
        shortcut: [{
          key: 'z',
          code: 'KeyY',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
          onKeyUp: true,
          onKeyDown: false,
        }],
      }
    },
    playerUi: {
      show: false,
    }
  }, {
    name: 'Zoom out',
    label: 'Unzoom',
    cmd: [{
      action: 'change-zoom',
      arg: -0.1
    }],
    scopes: {
      page: {
        show: false,
        shortcut: [{
          key: 'u',
          code: 'KeyU',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
          onKeyUp: true,
          onKeyDown: false,
        }],
      }
    },
    playerUi: {
      show: false
    }
  }, {
    name: 'Toggle panning mode',
    label: 'Toggle pan',
    cmd: [{
      action: 'toggle-pan',
      arg: 'toggle'
    }],
    playerUi: {
      show: true,
      path: 'zoom'
    },
    scopes: {
    }
  }, {
    name: 'Hold to pan',
    cmd: [{
      action: 'pan',
      arg: 'toggle',
    }],
    scopes: {
      page: {
        show: false,
        shortcut: [{
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: true,
          onKeyDown: false,
          onKeyUp: false,
          onMouseMove: true,
        }],
      }
    }
  },
  //
  //   S T R E T C H I N G
  //
  {
    name: 'Set stretch to "none"',
    label: 'Don\'t stretch',
    cmd: [{
      action: 'set-stretch',
      arg: StretchType.NoStretch,
    }],
    scopes: {
      global: {
        show: true,
        label: 'Normal'
      },
      site: {
        show: true,
        label: 'Normal'
      },
      page: {
        show: true,
        label: 'Normal'
      }
    },
    playerUi: {
      show: true,
      path: 'stretch'
    }
  }, {
    name: 'Set stretch to "basic"',
    label: 'Basic stretch',
    cmd: [{
      action: 'set-stretch',
      arg: StretchType.Basic,
    }],
    scopes: {
      global: {
        show: true,
        label: 'Basic'
      },
      site: {
        show: true,
        label: 'Basic'
      },
      page: {
        show: true,
        label: 'Basic'
      }
    },
    playerUi: {
      show: true,
      path: 'stretch'
    }
  }, {
    name: 'Set stretch to "hybrid"',
    label: 'Hybrid stretch',
    cmd: [{
      action: 'set-stretch',
      arg: StretchType.Hybrid,
    }],
    scopes: {
      global: {
        show: true,
        label: 'Hybrid'
      },
      site: {
        show: true,
        label: 'Hybrid'
      },
      page: {
        show: true,
        label: 'Hybrid'
      }
    },
    playerUi: {
      show: true,
      path: 'stretch'
    }
  }, {
    name: 'Stretch only to hide thin borders',
    label: 'Thin borders only',
    cmd: [{
      action: 'set-stretch',
      arg: StretchType.Conditional,
    }],
    scopes: {
      global: {
        show: true,
        label: 'Thin borders'
      },
      site: {
        show: true,
        label: 'Thin borders'
      },
      page: {
        show: true,
        label: 'Thin borders'
      }
    },
    playerUi: {
      show: true,
      path: 'stretch'
    }
  }, {
    name: 'Set stretch to default value',
    label: 'Default',
    cmd: [{
      action: 'set-stretch',
      arg: StretchType.Default,
    }],
    scopes: {
      site: {
        show: true,
      }
    }
  }, {
    name: 'Stretch source to 4:3',
    label: '4:3 stretch (src)',
    cmd: [{
      action: 'set-stretch',
      arg: StretchType.FixedSource,
      customArg: 1.33,
    }],
    scopes: {
      page: {
        show: true,
      }
    },
    playerUi: {
      show: true,
      path: 'crop'
    }
  }, {
    name: 'Stretch source to 16:9',
    label: '16:9 stretch (src)',
    cmd: [{
      action: 'set-stretch',
      arg: StretchType.FixedSource,
      customArg: 1.77,
    }],
    scopes: {
      page: {
        show: true,
      }
    },
    playerUi: {
      show: true,
      path: 'crop'
    }
  },
  //
  //    A L I G N M E N T
  //
  {
    name: 'Align video to the left',
    label: 'Left',
    cmd: [{
      action: 'set-alignment',
      arg: VideoAlignmentType.Left,
    }],
    scopes: {
      global: {
        show: true,
      },
      site: {
        show: true,
      },
      page: {
        show: true,
      }
    },
    playerUi: {
      show: true,
      path: 'align'
    }
  }, {
    name: 'Align video to center',
    label: 'Center',
    cmd: [{
      action: 'set-alignment',
      arg: VideoAlignmentType.Center,
    }],
    scopes: {
      global: {
        show: true,
      },
      site: {
        show: true,
      },
      page: {
        show: true,
      }
    },
    playerUi: {
      show: true,
      path: 'align'
    }
  }, {
    name: 'Align video to the right',
    label: 'Right',
    cmd: [{
      action: 'set-alignment',
      arg: VideoAlignmentType.Right
    }],
    scopes: {
      global: {
        show: true,
      },
      site: {
        show: true,
      },
      page: {
        show: true,
      }
    },
    playerUi: {
      show: true,
      path: 'align'
    }
  }, {
    name: 'Use default alignment',
    label: 'Default',
    cmd: [{
      action: 'set-alignment',
      arg: VideoAlignmentType.Default
    }],
    scopes: {
      site: {
        show: true,
      }
    }
  },
  //
  //    E N A B L E   E X T E N S I O N / A U T O A R
  //    (for sites/extension tab in the popup)
  //
  {
    name: 'Enable extension',
    label: 'Enable',
    cmd: [{
      action: 'set-extension-mode',
      arg: ExtensionMode.Enabled,
      persistent: true,
    }],
    scopes: {
      global: {
        show: true,
      },
      site: {
        show: true,
      }
    }
  }, {
    name: 'Enable extension on whitelisted sites only',
    label: 'On whitelist only',
    cmd: [{
      action: 'set-extension-mode',
      arg: ExtensionMode.Whitelist,
      persistent: true,
    }],
    scopes: {
      global: {
        show: true
      }
    }
  }, {
    name: 'Extension mode: use default settings',
    label: 'Default',
    cmd: [{
      action: 'set-extension-mode',
      arg: ExtensionMode.Default,
      persistent: true,
    }],
    scopes: {
      site: {
        show: true
      }
    }
  }, {
    name: 'Disable extension',
    label: 'Disable',
    cmd: [{
      action: 'set-extension-mode',
      arg: ExtensionMode.Disabled,
      persistent: true,
    }],
    scopes: {
      global: {
        show: true,
      },
      site: {
        show: true,
      }
    }
  }, {
    name: 'Enable automatic aspect ratio detection',
    label: 'Enable',
    cmd: [{
      action: 'set-autoar-mode',
      arg: ExtensionMode.Enabled,
      persistent: true,
    }],
    scopes: {
      global: {
        show: true
      },
      site: {
        show: true
      }
    }
  }, {
    name: 'Enable automatic aspect ratio detection on whitelisted sites only',
    label: 'On whitelist only',
    cmd: [{
      action: 'set-autoar-mode',
      arg: ExtensionMode.Whitelist,
      persistent: true,
    }],
    scopes: {
      global: {
        show: true,
      }
    }
  }, {
    name: 'Use default settings for automatic aspect ratio detection',
    label: 'Default',
    cmd: [{
      action: 'set-autoar-mode',
      arg: ExtensionMode.Default,
      persistent: true,
    }],
    scopes: {
      site: {
        show: true,
      }
    }
  }, {
    name: 'Disable automatic aspect ratio detection',
    label: 'Disable',
    cmd: [{
      action: 'set-autoar-mode',
      arg: ExtensionMode.Disabled,
      persistent: true,
    }],
    scopes: {
      global: {
        show: true,
      },
      site: {
        show: true,
      }
    }
  },
  //
  //
  // Enable/disable keyboard shortcuts
  //
  {
    name: 'Enable keyboard shortcuts',
    label: 'Enable',
    cmd: [{
      action: 'set-keyboard',
      arg: ExtensionMode.Enabled,
    }],
    scopes: {
      global: {
        show: true,
      },
      site: {
        show: true,
      },
      page: {
        show: true,
      }
    }
  }, {
    name: 'Enable keyboard shortcuts on whitelisted sites only',
    label: 'On whitelist only',
    cmd: [{
      action: 'set-keyboard',
      arg: ExtensionMode.Whitelist,
    }],
    scopes: {
      global: {
        show: true
      },
    }
  }, {
    name: 'Keyboard shortcuts mode: use default settings',
    label: 'Default',
    cmd: [{
      action: 'set-keyboard',
      arg: ExtensionMode.Default,
    }],
    scopes: {
      site: {
        show: true
      }
    }
  }, {
    name: 'Disable keyboard shortcuts',
    label: 'Disable',
    cmd: [{
      action: 'set-keyboard',
      arg: ExtensionMode.Disabled,
    }],
    scopes: {
      global: {
        show: true,
      },
      site: {
        show: true,
      },
      page: {
        show: true,
      }
    }
  },
  ],
  mitigations: {
    zoomLimit: {
      enabled: true,
      limit: 0.997,
      fullscreenOnly: true
    }
  },
  whatsNewChecked: true,
  // -----------------------------------------
  //       ::: SITE CONFIGURATION :::
  // -----------------------------------------
  // Config for a given page:
  //
  // <hostname> : {
  //    status: <option>              // should extension work on this site?
  //    arStatus: <option>            // should we do autodetection on this site?
  //
  //    defaultAr?: <ratio>          // automatically apply this aspect ratio on this side. Use extension defaults if undefined.
  //    stretch? <stretch mode>       // automatically stretch video on this site in this manner
  //    videoAlignment? <left|center|right>
  //
  //    type: <official|community|user-added>  // 'official' — blessed by Tam.
  //                                           // 'community' — blessed by people sending me messages.
  //                                           // 'user-added' — user-defined (not here)
  //    override: <true|false>                 // override user settings for this site on update
  // }
  //
  // Valid values for options:
  //
  //     status, arStatus, statusEmbedded:
  //
  //    * enabled     — always allow, full
  //    * basic       — allow, but only the basic version without playerData
  //    * default     — allow if default is to allow, block if default is to block
  //    * disabled    — never allow
  //
  sites: {
    "@global": {                            // global defaults. Possible options will state site-only options in order
                                            // to avoid writing this multiple times. Tags:
                                            //      #g — only available in @global
                                            //      #s   — only available for specific site
      enable: {                             //  How should extension work:
        fullscreen: ExtensionMode.Enabled,  //       'enabled'   - work everywhere except blacklist
        theater: ExtensionMode.Enabled,     //       'whitelist' - only work on whitelisted sites (#g)
        normal: ExtensionMode.Disabled,     //       'disabled'  - work nowhere
      },                                    //       'default'   - follow global rules (#s)
      enableAard: {                         //  Should we try to automatically detect aspect ratio?
        fullscreen: ExtensionMode.Enabled,  //  Options: 'enabled', 'whitelist' (#g), 'default' (#s), 'disabled'
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Disabled,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Disabled
      },

      persistCSA: CropModePersistence.Disabled,

      defaults: {
        crop: {type: AspectRatioType.Reset},  // does NOT override Aard
        stretch: StretchType.NoStretch,
        alignment: {x: VideoAlignmentType.Center, y: VideoAlignmentType.Center},
      }
    },
    "@empty": {                             // placeholder settings object with fallbacks to @global
      enable: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default,
      },
      enableAard: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default
      },
      type: 'user-defined',
      persistCSA: CropModePersistence.Default,
      defaults: {
        crop: null,
        stretch: StretchType.Default,
        alignment: {x: VideoAlignmentType.Default, y: VideoAlignmentType.Default},
      }
    },
    "www.youtube.com" : {
      enable: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default,
      },
      enableAard: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default
      },
      override: false,                  // ignore value localStorage in favour of this
      type: 'official',                 // is officially supported? (Alternatives are 'community' and 'user-defined')

      activeDOMConfig: 'official',
      DOMConfig: {
        'official': {
          type: 'official',
          elements: {
            player: {
              manual: true,
              querySelectors: "#movie_player, #player, #c4-player",
            }
          }
        }
      }
    },
    "www.netflix.com" : {
      enable: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default,
      },
      enableAard: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Disabled
      },
      override: false,
      type: 'community',
    },
    "www.disneyplus.com" : {
      enable: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default,
      },
      enableAard: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default
      },
      type: 'community',
      activeDOMConfig: 'community-mstefan99',
      DOMConfig: {
        'community-mstefan99': {
          type: 'official',
          elements: {
            player: {
              manual: true,
              querySelectors: ".btm-media-player",
            },
            video: {
              manual: true,
              querySelectors: ".btm-media-client-element"
            }
          },
          customCss: ".hudson-container { height: 100%; }"
        }
      }
    },
    "www.twitch.tv": {
      enable: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default,
      },
      enableAard: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default
      },
      type: 'official',
    },
    "streamable.com": {
      enable: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default,
      },
      enableAard: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default
      },
      type: 'official',
      activeDOMConfig: 'official',
      DOMConfig: {
        'official': {
          type: 'official',
          customCss: ".player {text-align: left}"
        }
      }
    },
    "vimeo.com": {
      enable: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default,
      },
      enableAard: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default
      },
      type: 'official',
      activeDOMConfig: 'official',
      DOMConfig: {
        'official': {
          type: 'official',
          customCss: ".player_outro_area {\n  width: 100% !important;\n  display: flex !important;\n  justify-content: center !important;\n}\n\n.player_container, .player {\n  width: 100% !important; \n}",
          elements: {
            player: {
              manual: true,
              querySelectors: ".player_outro_area",
            }
          }
        }
      },
    },
    "old.reddit.com" : {
      enable: {
        fullscreen: ExtensionMode.Disabled,
        theater: ExtensionMode.Disabled,
        normal: ExtensionMode.Disabled,
      },
      enableAard: {
        fullscreen: ExtensionMode.Disabled,
        theater: ExtensionMode.Disabled,
        normal: ExtensionMode.Disabled,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Disabled,
        theater: ExtensionMode.Disabled,
        normal: ExtensionMode.Disabled,
      },
      type: 'officially-disabled',
      activeDOMConfig: 'official',
      DOMConfig: {
        'official': {
          type: 'official',
          customCss:  'video {\n  width: 100% !important;\n  height: 100% !important;\n}',
          elements: {
            player: {
              manual: false,
              querySelectors: '.reddit-video-player-root, .media-preview-content'
            }
          }
        }
      },
    },
    "www.reddit.com" : {
      enable: {
        fullscreen: ExtensionMode.Disabled,
        theater: ExtensionMode.Disabled,
        normal: ExtensionMode.Disabled,
      },
      enableAard: {
        fullscreen: ExtensionMode.Disabled,
        theater: ExtensionMode.Disabled,
        normal: ExtensionMode.Disabled,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Disabled,
        theater: ExtensionMode.Disabled,
        normal: ExtensionMode.Disabled,
      },
      type: 'officially-disabled',
      activeDOMConfig: 'official',
      DOMConfig: {
        'official': {
          type: 'official',
          customCss:  'video {\n  width: 100% !important;\n  height: 100% !important;\n}',
          elements: {
            player: {
              manual: false,
              querySelectors: '.reddit-video-player-root, .media-preview-content'
            }
          }
        }
      },
    },
    "imgur.com": {
      enable: {
        fullscreen: ExtensionMode.Disabled,
        theater: ExtensionMode.Disabled,
        normal: ExtensionMode.Disabled,
      },
      enableAard: {
        fullscreen: ExtensionMode.Disabled,
        theater: ExtensionMode.Disabled,
        normal: ExtensionMode.Disabled,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Disabled,
        theater: ExtensionMode.Disabled,
        normal: ExtensionMode.Disabled,
      },
      type: 'officially-disabled',
    },
    "gfycat.com": {
      enable: {
        fullscreen: ExtensionMode.Disabled,
        theater: ExtensionMode.Disabled,
        normal: ExtensionMode.Disabled,
      },
      enableAard: {
        fullscreen: ExtensionMode.Disabled,
        theater: ExtensionMode.Disabled,
        normal: ExtensionMode.Disabled,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Disabled,
        theater: ExtensionMode.Disabled,
        normal: ExtensionMode.Disabled,
      },
      type: 'officially-disabled',
    },
    "giant.gfycat.com": {
      enable: {
        fullscreen: ExtensionMode.Disabled,
        theater: ExtensionMode.Disabled,
        normal: ExtensionMode.Disabled,
      },
      enableAard: {
        fullscreen: ExtensionMode.Disabled,
        theater: ExtensionMode.Disabled,
        normal: ExtensionMode.Disabled,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Disabled,
        theater: ExtensionMode.Disabled,
        normal: ExtensionMode.Disabled,
      },
      type: 'officially-disabled',
    },
    "www.wakanim.tv": {
      enable: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default,
      },
      enableAard: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default
      },
      type: 'community',
      activeDOMConfig: 'community',
      DOMConfig: {
        'community': {
          type: 'community',
          elements: {
            player: {
              manual: true,
              querySelectors: "#jwplayer-container"
            }
          }
        }
      },
    },
    "app.plex.tv": {
      enable: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default,
      },
      enableAard: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default
      },
      type: 'community',
      activeDOMConfig: 'community',
      DOMConfig: {
        'community': {
          type: 'community',
          customCss: "body {\n  background-color: #000;\n}\n\n.application {\n  background-color: #000;\n}"
        }
      }
    },
    "metaivi.com": {
      enable: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default,
      },
      enableAard: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default
      },
      type: "community",
      activeDOMConfig: 'community',
      DOMConfig: {
        'community': {
          type: 'community',
          elements: {
            video: {
              nodeCss: {'position': 'absolute !important'}
            }
          }
        }
      },
    },
    "piped.kavin.rocks": {
      enable: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default,
      },
      enableAard: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default
      },
      type: "community",
      activeDOMConfig: 'community',
      DOMConfig: {
        'community': {
          type: 'community',
          customCss: ".shaka-video-container {\n  flex-direction: column !important;\n}"
        }
      }
    },
  }
}

export default ExtensionConf;
