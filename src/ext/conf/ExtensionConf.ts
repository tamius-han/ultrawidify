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
import EmbeddedContentSettingsOverridePolicy from '../../common/enums/EmbeddedContentSettingsOverridePolicy.enum';

if(Debug.debug)
  console.log("Loading: ExtensionConf.js");

const ExtensionConf: SettingsInterface = {
  dev: {
    loadFromSnapshot: false,
  },

  arDetect: {
    aardType: 'auto',

    earlyStopOptions: {
      stopAfterFirstDetection: false,
      stopAfterTimeout: false,
      stopTimeout: 30,
    },

    disabledReason: "",       // if automatic aspect ratio has been disabled, show reason
    allowedMisaligned: 0.05,  // top and bottom letterbox thickness can differ by this much.
                              // Any more and we don't adjust ar.
    allowedArVariance: 0.0125,// amount by which old ar can differ from the new (1 = 100%)
    timers: {                 // autodetection frequency
      playing: 333,           // while playing
      playingReduced: 5000,   // while playing at small sizes
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

    blackLevels: {
      defaultBlack: 16,
      blackTolerance: 4,
      imageDelta: 16,
    },
    sampling: {
      edgePosition: 0.25,
      staticCols: 16,      // we take a column at [0-n]/n-th parts along the width and sample it
      randomCols: 0,      // we add this many randomly selected columns to the static columns
      staticRows: 9,      // forms grid with staticSampleCols. Determined in the same way. For black frame checks
    },
    edgeDetection: {
      slopeTestWidth: 8,
      gradientTestSamples: 8,
      gradientTestBlackThreshold: 16,
      gradientTestDeltaThreshold: 32,
      gradientTestMinDelta: 8,

      thresholds: {
        edgeDetectionLimit: 12,
        minQualitySingleEdge: 6,
        minQualitySecondEdge: 3,
      },

      maxLetterboxOffset: 0.1,

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

      edgeMismatchTolerancePx: 3,  // corners and center are considered equal if they differ by at most this many px
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

  ui: {
    inPlayer: {
      enabled: true, // enable by default on new installs
      enabledFullscreenOnly: false,
      minEnabledWidth: 0.75,
      minEnabledHeight: 0.75,
      activation: 'player',
      popupAlignment: 'left',
      triggerZoneDimensions: {
        width: 0.5,
        height: 0.5,
        offsetX: -50,
        offsetY: 0
      }
    },
    dev: {
      aardDebugOverlay: {
        showOnStartup: false,
        showDetectionDetails: true
      }
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
      label: 'Zoom +5%',
      arguments: {
        zoom: 0.05
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
      label: 'Zoom -5%',
      arguments: {
        zoom: -0.05
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
      shortcut: {
        key: 'r',
        code: 'KeyR',
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: true,
        onKeyUp: true,
        onKeyDown: false,
      },
      arguments: {
        zoom: 1,
      },
      internalOnly: true,
      actionId: 'set-zoom-reset'
    }, {
      action: 'set-ar-zoom',
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
        shiftKey: true,
        onKeyUp: true,
        onKeyDown: false,
      }
    }, {
      action: 'set-ar-zoom',
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
        shiftKey: true,
        onKeyUp: true,
        onKeyDown: false,
      }
    }, {
      action: 'set-ar-zoom',
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
        shiftKey: true,
        onKeyUp: false,
        onKeyDown: true,
      }
    }, {
      action: 'set-ar-zoom',
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
        shiftKey: true,
        onKeyUp: false,
        onKeyDown: true,
      }
    }, {
      action: 'set-ar-zoom',
      label: '32:9',
      comment: 'Crop for 32:9 aspect ratio',
      arguments: {
        type: AspectRatioType.Fixed,
        ratio: 3.56
      },
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
  mitigations: {
    zoomLimit: {
      enabled: true,
      limit: 0.997,
      fullscreenOnly: true
    }
  },
  whatsNewChecked: true,
  newFeatureTracker: {
    'uw6.ui-popup': {show: 10}
  },
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
        fullscreen: ExtensionMode.Disabled, //       'enabled'   - work everywhere except blacklist
        theater: ExtensionMode.Disabled,    //
        normal: ExtensionMode.Disabled,     //       'disabled'  - work nowhere
      },                                    //       'default'   - follow global rules (#s)
      enableAard: {                         //  Should we try to automatically detect aspect ratio?
        fullscreen: ExtensionMode.Disabled, //  Options: 'enabled', 'default' (#s), 'disabled'
        theater: ExtensionMode.Disabled,
        normal: ExtensionMode.Disabled,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Disabled,
        theater: ExtensionMode.Disabled,
        normal: ExtensionMode.Disabled
      },
      enableUI: {
        fullscreen: ExtensionMode.Disabled,
        theater: ExtensionMode.Disabled,     // Lies! means 'theater-ish'
        normal: ExtensionMode.Disabled       // Not actually used.
      },
      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.Always,

      defaultType: 'unknown',
      persistCSA: CropModePersistence.Disabled,

      defaults: {
        crop: {type: AspectRatioType.Automatic},
        stretch: {type: StretchType.NoStretch},
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
      enableUI: {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Disabled
      },
      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.Always,

      type: 'user-defined',
      defaultType: 'user-defined',
      persistCSA: CropModePersistence.Default,
      defaults: {
        crop: null,
        stretch: {type: StretchType.Default},
        alignment: {x: VideoAlignmentType.Default, y: VideoAlignmentType.Default},
      }
    },
    "www.youtube.com" : {
      enable: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Enabled,
      },
      enableAard: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Enabled,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Enabled
      },
      enableUI: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Disabled
      },
      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.Always,
      overrideWhenEmbedded: true,
      override: false,                  // ignore value localStorage in favour of this
      type: 'official',                 // is officially supported? (Alternatives are 'community' and 'user-defined')
      defaultType: 'official',          // if user mucks around with settings, type changes to 'user-defined'.
                                        // We still want to know what the original type was, hence defaultType

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
    "www.youtube-nocookie.com": {
      enable: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Enabled,
      },
      enableAard: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Enabled,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Enabled
      },
      enableUI: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Disabled
      },
      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.Always,
      overrideWhenEmbedded: true,

      override: false,                  // ignore value localStorage in favour of this
      type: 'official',                 // is officially supported? (Alternatives are 'community' and 'user-defined')
      defaultType: 'official',          // if user mucks around with settings, type changes to 'user-defined'.
                                        // We still want to know what the original type was, hence defaultType

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
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Default,
      },
      enableAard: {
        fullscreen: ExtensionMode.Disabled,
        theater: ExtensionMode.Disabled,
        normal: ExtensionMode.Disabled,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Enabled
      },
      enableUI: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Disabled
      },
      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.Always,
      override: false,
      type: 'community',
      defaultType: 'community',
    },
    "www.disneyplus.com" : {
      enable: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Default,
      },
      enableAard: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Default,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Default
      },
      enableUI: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Default
      },
      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.Always,
      type: 'community',
      defaultType: 'community',
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
          // customCss: ".hudson-container { height: 100%; }"
        }
      }
    },
    "www.twitch.tv": {
      enable: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Enabled,
      },
      enableAard: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Enabled,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Enabled
      },
      enableUI: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Enabled
      },
      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.Always,
      type: 'official',
      defaultType: 'official',
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
      enableUI: {
        fullscreen: ExtensionMode.Disabled,
        theater: ExtensionMode.Disabled,
        normal: ExtensionMode.Disabled
      },
      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.Never,
      type: 'officially-disabled',
      defaultType: 'officially-disabled',
      activeDOMConfig: 'official',
      DOMConfig: {
        'official': {
          type: 'official',
          // customCss:  'video {\n  width: 100% !important;\n  height: 100% !important;\n}',
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
      enableUI: {
        fullscreen: ExtensionMode.Disabled,
        theater: ExtensionMode.Disabled,
        normal: ExtensionMode.Disabled
      },
      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.Never,
      type: 'officially-disabled',
      defaultType: 'officially-disabled',
      activeDOMConfig: 'official',
      DOMConfig: {
        'official': {
          type: 'official',
          // customCss:  'video {\n  width: 100% !important;\n  height: 100% !important;\n}',
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
      enableUI: {
        fullscreen: ExtensionMode.Disabled,
        theater: ExtensionMode.Disabled,
        normal: ExtensionMode.Disabled
      },
      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.Never,
      type: 'officially-disabled',
      defaultType: 'officially-disabled',
    },
    "www.wakanim.tv": {
      enable: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Enabled,
      },
      enableAard: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Enabled,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Enabled
      },
      enableUI: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Enabled
      },
      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.Always,
      type: 'community',
      defaultType: 'community',
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
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Disabled,
      },
      enableAard: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Disabled,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Disabled
      },
      enableUI: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Disabled
      },
      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.Always,
      type: 'community',
      defaultType: 'community',
      activeDOMConfig: 'community',
      DOMConfig: {
        'community': {
          type: 'community',
          // customCss: "body {\n  background-color: #000;\n}\n\n.application {\n  background-color: #000;\n}"
        }
      }
    },
    "metaivi.com": {
      enable: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Disabled,
      },
      enableAard: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Disabled,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Disabled
      },
      enableUI: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Disabled
      },
      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.Always,
      type: "community",
      defaultType: "community",
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
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Disabled,
      },
      enableAard: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Disabled,
      },
      enableKeyboard: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Disabled
      },
      enableUI: {
        fullscreen: ExtensionMode.Enabled,
        theater: ExtensionMode.Enabled,
        normal: ExtensionMode.Disabled
      },
      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.Always,
      type: "community",
      defaultType: "community",
      activeDOMConfig: 'community',
      DOMConfig: {
        'community': {
          type: 'community',
          // customCss: ".shaka-video-container {\n  flex-direction: column !important;\n}"
        }
      }
    },
  }
}

export default ExtensionConf;
