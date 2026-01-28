import AspectRatioType from '@src/common/enums/AspectRatioType.enum';
import CropModePersistence from '@src/common/enums/CropModePersistence.enum';
import EmbeddedContentSettingsOverridePolicy from '@src/common/enums/EmbeddedContentSettingsOverridePolicy.enum';
import ExtensionMode from '@src/common/enums/ExtensionMode.enum';
import { InputHandlingMode } from '@src/common/enums/InputHandlingMode.enum';
import { PlayerDetectionMode } from '@src/common/enums/PlayerDetectionMode.enum';
import { SiteSupportLevel } from '@src/common/enums/SiteSupportLevel.enum';
import StretchType from '@src/common/enums/StretchType.enum';
import VideoAlignmentType from '@src/common/enums/VideoAlignmentType.enum';
import { MenuPosition } from '@src/common/interfaces/ClientUiMenu.interface';
import SettingsInterface from '@src/common/interfaces/SettingsInterface';
import Debug from '@src/ext/conf/Debug';
import { AardPollingOptions } from '@src/ext/module/aard/enums/aard-polling-options.enum';
import { AardSubtitleCropMode } from '@src/ext/module/aard/enums/aard-subtitle-crop-mode.enum';

if(Debug.debug)
  console.log("Loading: ExtensionConf.js");

const ExtensionConf: SettingsInterface = {
  dev: {
    loadFromSnapshot: false,
  },

  aardLegacy: {
    aardType: 'auto',

    polling: {
      runInBackgroundTabs: AardPollingOptions.Reduced,
      runOnSmallVideos: AardPollingOptions.Reduced
    },

    letterboxOrientationScan: {
      letterboxLimit: 8,
      pillarboxLimit: 8
    },

    subtitles: {
      subtitleCropMode: AardSubtitleCropMode.ResetAR,
      resumeAfter: 5000,
      scanSpacing: 5,
      scanMargin: 0.25,
      maxValidLetter: 24,
      subtitleSubpixelThresholdOff: 8,
      subtitleSubpixelThresholdOn: 192,
      minDetections: 8,
      minImageLineDetections: 8,

      refiningScanSpacing: 8,
      refiningScanInitialIterations: 12,

      maxPotentialSubtitleMisalignment: 32,
    },

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
      onFirstChange: false,       // disable once we have a stable aspect ratio
      ifNotChanged: false,        // disable if Ar hasn't changed for this long
      ifNotChangedTimeout: 20000, // if user enables ifNotChangedTimeout, we default to 20s
      ifSubtitles: false,         // disable if subtitles are detected
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

      gradientThreshold: 0.5,           // if more than this percentage (0-1) is detected as gradient, we mark edge as gradient
      gradientTestMinDeltaAfter: 2,   // if difference between test row and after row is LESS than this -> not gradient
      gradientTestMaxDeltaAfter: 12,   // if difference between test row and after row is MORE than this -> not gradient

      minValidImage: 0.7,                 // if more than this % (0-1) of row is image, we confirm image regardless of other criteria except gradient
      maxEdgeSegments: 8,                // if edge has more than this many segments, we consider it unreliable
      minEdgeSegmentSize: 2,
      averageEdgeThreshold: 16,           // average(ish) edge must be this many px
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

  aard: {
    aardType: 'auto',
    useLegacy: false,

    polling: {
      runInBackgroundTabs: AardPollingOptions.Reduced,
      runOnSmallVideos: AardPollingOptions.Reduced
    },

    letterboxOrientationScan: {
      letterboxLimit: 8,
      pillarboxLimit: 8
    },

    subtitles: {
      subtitleCropMode: AardSubtitleCropMode.ResetAR,
      resumeAfter: 5000,
      scanSpacing: 5,
      scanMargin: 0.25,
      maxValidLetter: 24,
      subtitleSubpixelThresholdOff: 8,
      subtitleSubpixelThresholdOn: 192,
      minDetections: 8,
      minImageLineDetections: 8,

      refiningScanSpacing: 8,
      refiningScanInitialIterations: 12,

      maxPotentialSubtitleMisalignment: 32,
    },

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
      onFirstChange: false,       // disable once we have a stable aspect ratio
      ifNotChanged: false,        // disable if Ar hasn't changed for this long
      ifNotChangedTimeout: 20000, // if user enables ifNotChangedTimeout, we default to 20s
      ifSubtitles: false,         // disable if subtitles are detected
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
      maxLetterboxOffset: 0.05,

      gradientThreshold: 0.5,           // if more than this percentage (0-1) is detected as gradient, we mark edge as gradient
      gradientTestMinDelta: 8,        // if difference between test row and before row is MORE than this -> not gradient
      gradientTestMinDeltaAfter: 2,   // if difference between test row and after row is LESS than this -> not gradient
      gradientTestMaxDeltaAfter: 12,   // if difference between test row and after row is MORE than this -> not gradient

      minValidImage: 0.7,                 // if more than this % (0-1) of row is image, we confirm image regardless of other criteria except gradient
      maxEdgeSegments: 8,                // if edge has more than this many segments, we consider it unreliable
      minEdgeSegmentSize: 2,
      averageEdgeThreshold: 16,           // average(ish) edge must be this many px
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
      minEnabledWidth: 0.75,
      minEnabledHeight: 0.75,
      activation: 'player',
      activationDistance: 100,
      activationDistanceUnits: '%',
      activatorAlignment: MenuPosition.Left,
      activatorPadding: {x: 16, y: 16},
      activatorPaddingUnit: {x: 'px', y: 'px'},
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
      enable: ExtensionMode.Disabled,
      enableAard: ExtensionMode.Theater,
      enableKeyboard: InputHandlingMode.Enabled,
      enableUI: ExtensionMode.FullScreen,

      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.UseAsDefault,
      overrideWhenEmbedded: EmbeddedContentSettingsOverridePolicy.Never,          // Usually, less-than-legitimate websites embed content from different domains.
                                                                                  // Setting this to 'always' would ensure embedded content always uses extension's
                                                                                  // default settings. It is presumed most people are too dumb to visit "for embedded sizes"
                                                                                  // part of the popup, and those who aren't will prolly find that annoying.

      defaultType: SiteSupportLevel.Unknown,
      persistCSA: CropModePersistence.Disabled,

      defaults: {
        crop: {type: AspectRatioType.Automatic},
        stretch: {type: StretchType.NoStretch},
        alignment: {x: VideoAlignmentType.Center, y: VideoAlignmentType.Center},
      },

      activeDOMConfig: '@auto',
      DOMConfig: {
        '@auto': {
          type: SiteSupportLevel.Unknown,
          elements: {
            player: {
              detectionMode: PlayerDetectionMode.Auto,
              allowAutoFallback: true,
              // ancestorIndex: 1,      // we leave those on undefined,
              // querySelectors: '',
            }
          }
        }
      }
    },
    "@empty": {                                 // New site configs start with this object as template.
      defaultType: SiteSupportLevel.Unknown,

      enable: ExtensionMode.Default,
      enableAard: ExtensionMode.Default,
      enableKeyboard: InputHandlingMode.Enabled,
      enableUI: ExtensionMode.Default,
      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.Default,
      overrideWhenEmbedded: EmbeddedContentSettingsOverridePolicy.Default,

      defaults: {
        crop: {type: AspectRatioType.Default},
        stretch: {type: StretchType.Default},
        alignment: {x: VideoAlignmentType.Default, y: VideoAlignmentType.Default}
      },

      persistCSA: CropModePersistence.Default,

      activeDOMConfig: '@empty',
      DOMConfig: {
        '@empty': {
          type: SiteSupportLevel.UserDefined,
          elements: {
            player: {
              detectionMode: PlayerDetectionMode.Auto,
              allowAutoFallback: true,
              // ancestorIndex: 1,
              // querySelectors: '',
            },
            video: {
              detectionMode: PlayerDetectionMode.Auto,
              allowAutoFallback: true,
              // ancestorIndex: 1,
              // querySelectors: '',
            }
          },
        }
      }
    },
    "www.youtube.com": {
      enable: ExtensionMode.All,
      enableAard: ExtensionMode.All,
      enableKeyboard: InputHandlingMode.Default,
      enableUI:  ExtensionMode.Default,

      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.UseAsDefault,
      overrideWhenEmbedded: EmbeddedContentSettingsOverridePolicy.Always,
      override: false,                  // ignore value localStorage in favour of this
      type: SiteSupportLevel.OfficialSupport,                 // is officially supported? (Alternatives are 'community' and 'user-defined')
      defaultType: SiteSupportLevel.OfficialSupport,          // if user mucks around with settings, type changes to 'user-defined'.
                                        // We still want to know what the original type was, hence defaultType

      activeDOMConfig: '@official',
      DOMConfig: {
        '@official': {
          type: SiteSupportLevel.OfficialSupport,
          elements: {
            player: {
              detectionMode: PlayerDetectionMode.QuerySelectors,
              allowAutoFallback: true,
              querySelectors: "#movie_player, #player, #c4-player",
            }
          }
        }
      }
    },
    "www.youtube-nocookie.com": {
      enable: ExtensionMode.All,
      enableAard: ExtensionMode.All,
      enableKeyboard: InputHandlingMode.Default,
      enableUI: ExtensionMode.FullScreen,

      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.UseAsDefault,
      overrideWhenEmbedded: EmbeddedContentSettingsOverridePolicy.Always,

      override: false,                  // ignore value localStorage in favour of this
      type: SiteSupportLevel.OfficialSupport,                 // is officially supported? (Alternatives are 'community' and 'user-defined')
      defaultType: SiteSupportLevel.OfficialSupport,          // if user mucks around with settings, type changes to 'user-defined'.
                                        // We still want to know what the original type was, hence defaultType

      activeDOMConfig: '@official',
      DOMConfig: {
        '@official': {
          type: SiteSupportLevel.OfficialSupport,
          elements: {
            player: {
              detectionMode: PlayerDetectionMode.QuerySelectors,
              allowAutoFallback: true,
              querySelectors: "#movie_player, #player, #c4-player",
            }
          }
        }
      }
    },
    "www.netflix.com" : {
      enable: ExtensionMode.Theater,
      enableAard: ExtensionMode.Disabled,
      enableKeyboard: InputHandlingMode.Default,
      enableUI:  ExtensionMode.All,
      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.UseAsDefault,
      override: false,
      type: SiteSupportLevel.CommunitySupport,
      defaultType: SiteSupportLevel.CommunitySupport,

      DOMConfig: {
        '@community': {
          type: SiteSupportLevel.CommunitySupport,
          elements: {
            player: {
              detectionMode: PlayerDetectionMode.Auto,
              allowAutoFallback: true,
              // ancestorIndex: 1,
              // querySelectors: '',
              // customCSS: ''
            }
          }
        }
      }
    },
    "www.disneyplus.com" : {
      enable: ExtensionMode.Theater,
      enableAard: ExtensionMode.Theater,
      enableKeyboard: InputHandlingMode.Default,
      enableUI: ExtensionMode.FullScreen,

      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.UseAsDefault,
      type: SiteSupportLevel.CommunitySupport,
      defaultType: SiteSupportLevel.CommunitySupport,
      activeDOMConfig: '@community-mstefan99',
      DOMConfig: {
        '@community-mstefan99': {
          type: SiteSupportLevel.OfficialSupport,
          elements: {
            player: {
              detectionMode: PlayerDetectionMode.QuerySelectors,
              allowAutoFallback: true,
              querySelectors: ".btm-media-player",
            },
            video: {
              detectionMode: PlayerDetectionMode.QuerySelectors,
              allowAutoFallback: true,
              querySelectors: ".btm-media-client-element"
            }
          },
          // customCss: ".hudson-container { height: 100%; }"
        }
      }
    },
    "www.amazon.com": {
      enable: ExtensionMode.Default,
      enableAard: ExtensionMode.Default,
      enableKeyboard: InputHandlingMode.Enabled,
      enableUI: ExtensionMode.Default,
      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.Default,
      overrideWhenEmbedded: EmbeddedContentSettingsOverridePolicy.Default,
      type: SiteSupportLevel.CommunitySupport,
      defaultType: SiteSupportLevel.CommunitySupport,
      persistCSA: CropModePersistence.Default,
      activeDOMConfig: "@community",
      DOMConfig: {
        "@community": {
          type: SiteSupportLevel.CommunitySupport,
          elements: {
            player: {
              detectionMode: PlayerDetectionMode.Auto,
              allowAutoFallback: true
            }
          }
        },
      },
    },
    "www.twitch.tv": {
      enable: ExtensionMode.All,
      enableAard: ExtensionMode.All,
      enableKeyboard: InputHandlingMode.Default,
      enableUI: ExtensionMode.FullScreen,

      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.UseAsDefault,
      type: SiteSupportLevel.OfficialSupport,
      defaultType: SiteSupportLevel.OfficialSupport,

      activeDOMConfig: '@official',
      DOMConfig: {
        '@official': {
          type: SiteSupportLevel.OfficialSupport,
          elements: {
            player: {
              detectionMode: PlayerDetectionMode.QuerySelectors,
              allowAutoFallback: true,
              querySelectors: "#movie_player, #player, #c4-player",
            }
          }
        }
      }
    },
    "old.reddit.com" : {
      enable: ExtensionMode.Disabled,
      enableAard: ExtensionMode.Disabled,
      enableKeyboard: InputHandlingMode.Disabled,
      enableUI: ExtensionMode.Disabled,

      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.Never,
      type: SiteSupportLevel.OfficialBlacklist,
      defaultType: SiteSupportLevel.OfficialBlacklist,
    },
    "www.reddit.com" : {
      enable: ExtensionMode.Disabled,
      enableAard: ExtensionMode.Disabled,
      enableKeyboard: InputHandlingMode.Disabled,
      enableUI: ExtensionMode.Disabled,

      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.Never,
      type: SiteSupportLevel.OfficialBlacklist,
      defaultType: SiteSupportLevel.OfficialBlacklist,
    },
    "imgur.com": {
      enable: ExtensionMode.Disabled,
      enableAard: ExtensionMode.Disabled,
      enableKeyboard: InputHandlingMode.Disabled,
      enableUI: ExtensionMode.Disabled,

      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.Never,
      type: SiteSupportLevel.OfficialBlacklist,
      defaultType: SiteSupportLevel.OfficialBlacklist,
    },
    "www.wakanim.tv": {
      enable: ExtensionMode.All,
      enableAard: ExtensionMode.All,
      enableKeyboard: InputHandlingMode.Default,
      enableUI: ExtensionMode.FullScreen,

      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.UseAsDefault,
      type: SiteSupportLevel.CommunitySupport,
      defaultType: SiteSupportLevel.CommunitySupport,
      activeDOMConfig: '@community',
      DOMConfig: {
        '@community': {
          type: SiteSupportLevel.CommunitySupport,
          elements: {
            player: {
              detectionMode: PlayerDetectionMode.QuerySelectors,
              allowAutoFallback: true,
              querySelectors: "#jwplayer-container"
            }
          }
        }
      },
    },
    "app.plex.tv": {
      enable: ExtensionMode.Theater,
      enableAard: ExtensionMode.Theater,
      enableKeyboard: InputHandlingMode.Default,
      enableUI: ExtensionMode.FullScreen,

      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.UseAsDefault,
      type: SiteSupportLevel.CommunitySupport,
      defaultType: SiteSupportLevel.CommunitySupport,
    },
    "metaivi.com": {
      enable: ExtensionMode.Theater,
      enableAard: ExtensionMode.Theater,
      enableKeyboard: InputHandlingMode.Default,
      enableUI: ExtensionMode.FullScreen,
      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.UseAsDefault,
      type: SiteSupportLevel.CommunitySupport,
      defaultType: SiteSupportLevel.CommunitySupport,
    },
    "piped.kavin.rocks": {
      enable: ExtensionMode.Theater,
      enableAard: ExtensionMode.Theater,
      enableKeyboard: InputHandlingMode.Default,
      enableUI: ExtensionMode.FullScreen,

      applyToEmbeddedContent: EmbeddedContentSettingsOverridePolicy.UseAsDefault,
      type: SiteSupportLevel.CommunitySupport,
      defaultType: SiteSupportLevel.CommunitySupport,
    },
  }
}

export default ExtensionConf;
