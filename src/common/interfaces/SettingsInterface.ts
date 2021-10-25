import { Action } from '../../../node_modules/vuex/types/index'
import AntiGradientMode from '../enums/AntiGradientMode.enum'
import AspectRatioType from '../enums/AspectRatioType.enum'
import CropModePersistence from '../enums/CropModePersistence.enum'
import ExtensionMode from '../enums/ExtensionMode.enum'
import StretchType from '../enums/StretchType.enum'
import VideoAlignmentType from '../enums/VideoAlignmentType.enum'

interface ActionScopeInterface {
  show: boolean,
  label?: string,   // example override, takes precedence over default label
  shortcut?: {
    key?: string,
    code?: string,
    ctrlKey?: boolean,
    metaKey?: boolean,
    altKey?: boolean,
    shiftKey?: boolean,
    onKeyUp?: boolean,
    onKeyDown?: boolean,
    onMouseMove?: boolean,
  }[],
}

interface RestrictionsSettings {
  disableOnSmallPlayers?: boolean;    // Whether ultrawidify should disable itself when the player is small
  minAllowedWidth?: number;           // if player is less than this many px wide, ultrawidify will disable itself
  minAllowedHeight?: number;          // if player is less than this many px tall, ultrawidify will disable itself
  onlyAllowInFullscreen?: boolean;    // if enabled, ultrawidify will be disabled when not in full screen regardless of what previous two options say
}

interface SettingsInterface {
  arDetect: {
    disabledReason: string,     // if automatic aspect ratio has been disabled, show reason
    allowedMisaligned: number,  // top and bottom letterbox thickness can differ by this much.
                                // Any more and we don't adjust ar.
    allowedArVariance: number,  // amount by which old ar can differ from the new (1 = 100%)
    timers: {                   // autodetection frequency
      playing: number,            // while playing
      paused: number,             // while paused
      error: number,              // after error
      minimumTimeout: number,
      tickrate: number,          // 1 tick every this many milliseconds
    },
    autoDisable: {            // settings for automatically disabling the extension
      maxExecutionTime: number, // if execution time of main autodetect loop exceeds this many milliseconds,
                              // we disable it.
      consecutiveTimeoutCount: number,  // we only do it if it happens this many consecutive times

      // FOR FUTURE USE
      consecutiveArResets: number       // if aspect ratio reverts immediately after AR change is applied, we disable everything
    },
    canvasDimensions: {
      blackframeCanvas: {   // smaller than sample canvas, blackframe canvas is used to recon for black frames
                            // it's not used to detect aspect ratio by itself, so it can be tiny af
        width: number,
        height: number,
      },
      sampleCanvas: {   // size of image sample for detecting aspect ratio. Bigger size means more accurate results,
                            // at the expense of performance
        width: number,
        height: number,
      },
    },

    // samplingInterval: 10,     // we sample at columns at (width/this) * [ 1 .. this - 1]
    blackframe: {
      sufficientColorVariance: number,  // calculate difference between average intensity and pixel, for every pixel for every color
                                      // component. Average intensity is normalized to where 0 is black and 1 is biggest value for
                                      // that component. If sum of differences between normalized average intensity and normalized
                                      // component varies more than this % between color components, we can afford to use less strict
                                      // cumulative threshold.
      cumulativeThresholdLax: number,
      cumulativeThresholdStrict: number,// if we add values of all pixels together and get more than this, the frame is bright enough.
                                 // (note: blackframe is 16x9 px -> 144px total. cumulative threshold can be reached fast)
      blackPixelsCondition: number, // How much pixels must be black (1 all, 0 none) before we consider frame as black. Takes
                                 // precedence over cumulative threshold: if blackPixelsCondition is met, the frame is dark
                                 // regardless of whether cumulative threshold has been reached.
    },
    blackbar: {
      blackLevel: number,         // everything darker than 10/255 across all RGB components is considered black by
                              // default. blackLevel can decrease if we detect darker black.
      threshold: number,          // if pixel is darker than the sum of black level and this value, we count it as black
                              // on 0-255. Needs to be fairly high (8 might not cut it) due to compression
                              // artifacts in the video itself
      frameThreshold: number,      // threshold, but when doing blackframe test
      imageThreshold: number,     // in order to detect pixel as "not black", the pixel must be brighter than
                              // the sum of black level, threshold and this value.
      gradientThreshold: number,   // When trying to determine thickness of the black bars, we take 2 values: position of
                              // the last pixel that's darker than our threshold, and position of the first pixel that's
                              // brighter than our image threshold. If positions are more than this many pixels apart,
                              // we assume we aren't looking at letterbox and thus don't correct the aspect ratio.
      gradientSampleSize: number, // How far do we look to find the gradient
      maxGradient: number,         // if two neighboring pixels in gradientSampleSize differ by more than this, then we aren't
                              // looking at a gradient
      gradientNegativeTreshold: number,
      gradientMaxSD: number,    // reserved for future use
      antiGradientMode: AntiGradientMode
    },
    variableBlackbarThresholdOptions: {    // In case of poor bitrate videos, jpeg artifacts may cause us issues
      // FOR FUTURE USE
      enabled: boolean,                      // allow increasing blackbar threshold
      disableArDetectOnMax: boolean,         // disable autodetection when threshold goes over max blackbar threshold
      maxBlackbarThreshold: number,            // max threshold (don't increase past this)
      thresholdStep: number,                   // when failing to set aspect ratio, increase threshold by this much
      increaseAfterConsecutiveResets: number   // increase if AR resets this many times in a row
    },
    sampling: {
      staticCols: number,      // we take a column at [0-n]/n-th parts along the width and sample it
      randomCols: number,      // we add this many randomly selected columns to the static columns
      staticRows: number,      // forms grid with staticSampleCols. Determined in the same way. For black frame checks
    },
    guardLine: {              // all pixels on the guardline need to be black, or else we trigger AR recalculation
                              // (if AR fails to be recalculated, we reset AR)
      enabled: boolean,
      ignoreEdgeMargin: number, // we ignore anything that pokes over the black line this close to the edge
                              // (relative to width of the sample)
      imageTestThreshold: number, // when testing for image, this much pixels must be over blackbarThreshold
      edgeTolerancePx: number,         // black edge violation is performed this far from reported 'last black pixel'
      edgeTolerancePercent: null  // unused. same as above, except use % of canvas height instead of pixels
    },
    fallbackMode: {
      enabled: boolean,
      safetyBorderPx: number,        // determines the thickness of safety border in fallback mode
      noTriggerZonePx: number        // if we detect edge less than this many pixels thick, we don't correct.
    },
    arSwitchLimiter: {          // to be implemented
      switches: number,              // we can switch this many times
        period: number             // per this period
    },
    edgeDetection: {
      sampleWidth: number,        // we take a sample this wide for edge detection
      detectionThreshold: number,  // sample needs to have this many non-black pixels to be a valid edge
      confirmationThreshold: number,  //
      singleSideConfirmationThreshold: number,    // we need this much edges (out of all samples, not just edges) in order
                                             // to confirm an edge in case there's no edges on top or bottom (other
                                            // than logo, of course)
      logoThreshold: number,     // if edge candidate sits with count greater than this*all_samples, it can't be logo
                              // or watermark.
      edgeTolerancePx?: number,          // we check for black edge violation this far from detection point
      edgeTolerancePercent?: number,  // we check for black edge detection this % of height from detection point. unused
      middleIgnoredArea: number,      // we ignore this % of canvas height towards edges while detecting aspect ratios
      minColsForSearch: number,       // if we hit the edge of blackbars for all but this many columns (%-wise), we don't
                                   // continue with search. It's pointless, because black edge is higher/lower than we
                                   // are now. (NOTE: keep this less than 1 in case we implement logo detection)
    },
    pillarTest: {
      ignoreThinPillarsPx: number, // ignore pillars that are less than this many pixels thick.
      allowMisaligned: number   // left and right edge can vary this much (%)
    },
    textLineTest: {
      nonTextPulse: number,     // if a single continuous pulse has this many non-black pixels, we aren't dealing
                              // with text. This value is relative to canvas width (%)
      pulsesToConfirm: number,    // this is a threshold to confirm we're seeing text.
      pulsesToConfirmIfHalfBlack: number, // this is the threshold to confirm we're seeing text if longest black pulse
                                     // is over 50% of the canvas width
      testRowOffset: number     // we test this % of height from detected edge
    }
  },

  restrictions?: RestrictionsSettings;

  zoom: {
    minLogZoom: number,
    maxLogZoom: number,
    announceDebounce: number     // we wait this long before announcing new zoom
  },

  miscSettings: {
    mousePan: {
      enabled: boolean
    },
    mousePanReverseMouse: boolean,
    defaultAr?: any
  },
  stretch: {
    conditionalDifferencePercent: number  // black bars less than this wide will trigger stretch
                                        // if mode is set to '1'. 1.0=100%
  },
  resizer: {
    setStyleString: {
      maxRetries: number,
      retryTimeout: number
    }
  },
  pageInfo: {
    timeouts: {
      urlCheck: number,
      rescan: number
    }
  },
  pan?: any,
  version?: string,
  preventReload?: boolean,

  // -----------------------------------------
  //           ::: MITIGATIONS :::
  // -----------------------------------------
  // Settings for browser bug workarounds.
  mitigations?: {
    zoomLimit?: {
      enabled?: boolean,
      fullscreenOnly?: boolean,
      limit?: number,
    }
  }
  // -----------------------------------------
  //             ::: ACTIONS :::
  // -----------------------------------------
  // Nastavitve za ukaze. Zamenja stare nastavitve za bližnične tipke.
  //
  // Polje 'shortcut' je tabela, če se slučajno lotimo kdaj delati choordov.
  actions: {
    name?: string,    // name displayed in settings
    label?: string,                     // name displayed in ui (can be overridden in scope/playerUi)
    cmd?: {
      action: string,
      arg: any,
      customArg?: any,
      persistent?: boolean, // optional, false by default. If true, change doesn't take effect immediately.
                         // Instead, this action saves stuff to settings
    }[],
    scopes?: {
      global?: ActionScopeInterface,
      site?: ActionScopeInterface,
      page?: ActionScopeInterface
    },
    playerUi?: {
      show: boolean,
      path?: string,
    },
    userAdded?: boolean,
  }[],
  whatsNewChecked: boolean,
  // -----------------------------------------
  //       ::: SITE CONFIGURATION :::
  // -----------------------------------------
  // Nastavitve za posamezno stran
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
  //    type: <official|community|user>  // 'official' — blessed by Tam.
  //                                     // 'community' — blessed by reddit.
  //                                     // 'user' — user-defined (not here)
  //    override: <true|false>           // override user settings for this site on update
  // }
  //
  // Veljavne vrednosti za možnosti
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
    [x: string]: {
      mode?: ExtensionMode,
      autoar?: ExtensionMode,
      autoarFallback?: ExtensionMode,
      stretch?: StretchType,
      videoAlignment?: VideoAlignmentType,
      keyboardShortcutsEnabled?: ExtensionMode,
      type?: string,
      override?: boolean,
      arPersistence?: boolean,
      actions?: any;

      cropModePersistence?: CropModePersistence;

      DOM?: {
        player?: {
          manual?: boolean,
          querySelectors?: string,
          additionalCss?: string,
          useRelativeAncestor?: boolean,
          videoAncestor?: any,
          playerNodeCss?: string,
          periodicallyRefreshPlayerElement?: boolean
        },
        video?: {
          manual?: boolean,
          querySelectors?: string,
          additionalCss?: string,
          useRelativeAncestor?: boolean,
          playerNodeCss?: string
        }
      },
      css?: string;
      usePlayerArInFullscreen?: boolean;

      restrictions?: RestrictionsSettings;
    }
  }
}

export default SettingsInterface;
