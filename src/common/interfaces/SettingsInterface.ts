import { Action } from '../../../node_modules/vuex/types/index'
import AntiGradientMode from '../enums/AntiGradientMode.enum'
import AspectRatioType from '../enums/AspectRatioType.enum'
import CropModePersistence from '../enums/CropModePersistence.enum'
import ExtensionMode from '../enums/ExtensionMode.enum'
import StretchType from '../enums/StretchType.enum'
import VideoAlignmentType from '../enums/VideoAlignmentType.enum'

export interface KeyboardShortcutInterface {
  key?: string,
  code?: string,
  ctrlKey?: boolean,
  metaKey?: boolean,
  altKey?: boolean,
  shiftKey?: boolean,
  onKeyUp?: boolean,
  onKeyDown?: boolean,
  onMouseMove?: boolean,
}

interface ActionScopeInterface {
  show: boolean,
  label?: string,   // example override, takes precedence over default label
  shortcut?: KeyboardShortcutInterface[],
}

interface RestrictionsSettings {
  disableOnSmallPlayers?: boolean;    // Whether ultrawidify should disable itself when the player is small
  minAllowedWidth?: number;           // if player is less than this many px wide, ultrawidify will disable itself
  minAllowedHeight?: number;          // if player is less than this many px tall, ultrawidify will disable itself
  onlyAllowInFullscreen?: boolean;    // if enabled, ultrawidify will be disabled when not in full screen regardless of what previous two options say
  onlyAllowAutodetectionInFullScreen?: boolean;  // if enabled, autodetection will only start once in full screen
}

interface ExtensionEnvironmentSettingsInterface {
  normal: ExtensionMode,
  theater: ExtensionMode,
  fullscreen: ExtensionMode,
}

export interface CommandInterface {
  action: string,
  label: string,
  comment?: string,
  arguments?: any,
  shortcut?: KeyboardShortcutInterface,
  internalOnly?: boolean,
  actionId?: string,
}

export type SettingsReloadComponent = 'PlayerData' | 'VideoData';
export type SettingsReloadFlags = true | SettingsReloadComponent;

export interface AardSettings {
  aardType: 'webgl' | 'legacy' | 'auto';

  earlyStopOptions: {
    stopAfterFirstDetection: boolean;
    stopAfterTimeout: boolean;
    stopTimeout: number;
  },


  disabledReason: string,     // if automatic aspect ratio has been disabled, show reason
  allowedMisaligned: number,  // top and bottom letterbox thickness can differ by this much.
                              // Any more and we don't adjust ar.
  allowedArVariance: number,  // amount by which old ar can differ from the new (1 = 100%)
  timers: {                   // autodetection frequency
    playing: number,            // while playing
    playingReduced: number,     // while video/player element has insufficient size
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

  blackLevels: {
    defaultBlack: number,    // By default, pixels darker than this are considered black.
                             // (If detection algorithm detects darker blacks, black is considered darkest detected pixel)
    blackTolerance: number,  // If pixel is more than this much brighter than blackLevel, it's considered not black
                             // It is not considered a valid image detection if gradient detection is enabled
    imageDelta: number,      // When gradient detection is enabled, pixels this much brighter than black skip gradient detection
  }
  sampling: {
    edgePosition: number;    // % of width (max 0.33). Pixels up to this far away from either edge may contain logo.
    staticCols: number,      // we take a column at [0-n]/n-th parts along the width and sample it
    randomCols: number,      // we add this many randomly selected columns to the static columns
    staticRows: number,      // forms grid with staticSampleCols. Determined in the same way. For black frame checks,
  },

  // pls deprecate and move things used
  edgeDetection: {
    slopeTestWidth: number,
    gradientTestSamples: number,         // we check this many pixels below (or above) the suspected edge to check for gradient
    gradientTestBlackThreshold: number,  // if pixel in test sample is brighter than that, we aren't looking at gradient
    gradientTestDeltaThreshold: number,  // if delta between two adjacent pixels in gradient test exceeds this, it's not gradient
    gradientTestMinDelta: number,        // if last pixels of the test sample is less than this brighter than the first -> not gradient

    thresholds: {
      edgeDetectionLimit: number,             // during scanning of the edge, quit after edge gets detected at this many points
      minQualitySingleEdge: number,           // At least one of the detected must reach this quality
      minQualitySecondEdge: number,           // The other edge must reach this quality (must be smaller or equal to single edge quality)
    }

    maxLetterboxOffset: number,             // Upper and lower letterbox can be different by this many (% of height)

    // Previous iteration variables VVVV
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
    edgeMismatchTolerancePx: number,// corners and center are considered equal if they differ by at most this many px
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
}

interface SettingsInterface {
  _updateFlags?: {
    requireReload?: SettingsReloadFlags,
    forSite?: string
  }

  arDetect: AardSettings,

  ui: {
    inPlayer: {
      enabled: boolean,
      enabledFullscreenOnly: boolean,
      popupAlignment: 'left' | 'right',
      minEnabledWidth: number,                 // don't show UI if player is narrower than % of screen width
      minEnabledHeight: number,                // don't show UI if player is narrower than % of screen height
      activation: 'trigger-zone' | 'player',   // what needs to be hovered in order for UI to be visible
      triggerZoneDimensions: {                 // how large the trigger zone is (relative to player size)
        width: number
        height: number,
        offsetX: number,                       // fed to translateX(offsetX + '%'). Valid range [-100,   0]
        offsetY: number                        // fed to translateY(offsetY + '%'). Valid range [-100, 100]
      },
    }
  }

  restrictions?: RestrictionsSettings;

  crop: {
    default: any;
  },
  stretch: {
    default: any;
    conditionalDifferencePercent: number  // black bars less than this wide will trigger stretch
                                        // if mode is set to '1'. 1.0=100%
  },
  kbm: {
    enabled: boolean,          // if keyboard/mouse handler service will run
    keyboardEnabled: boolean,  // if keyboard shortcuts are processed
    mouseEnabled: boolean,     // if mouse movement is processed
  }

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
  // This object fulfills the same purpose as 'actions', but is written in less retarded and overly
  // complicated way. Hopefully it'll be easier to maintain it that way.
  commands?: {
    crop?: CommandInterface[],
    stretch?: CommandInterface[],
    zoom?: CommandInterface[],
    pan?: CommandInterface[],
    internal?: CommandInterface[],
  },
  whatsNewChecked: boolean,
  newFeatureTracker: any,
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
  //    type: <official|community|user>  // 'official' — blessed by Tam.
  //                                     // 'community' — blessed by reddit.
  //                                     // 'user' — user-defined (not here)
  //    override: <true|false>           // override user settings for this site on update
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
    [x: string]: SiteSettingsInterface,
  }
}

export interface SiteSettingsInterface {
  enable: ExtensionEnvironmentSettingsInterface;
  enableAard: ExtensionEnvironmentSettingsInterface;
  enableKeyboard: ExtensionEnvironmentSettingsInterface;

  type?: 'official' | 'community' | 'user-defined' | 'testing' | 'officially-disabled' | 'unknown' | 'modified';
  defaultType: 'official' | 'community' | 'user-defined' | 'testing' | 'officially-disabled' | 'unknown' | 'modified';

  // must be defined in @global and @empty
  persistCSA?: CropModePersistence,  // CSA - crop, stretch, alignment

  defaults?: {       // must be defined in @global and @empty
    crop?: {type: AspectRatioType, [x: string]: any},
    stretch?: {type: StretchType, ratio?: number},
    alignment?: {x: VideoAlignmentType, y: VideoAlignmentType},
  }

  cropModePersistence?: CropModePersistence;
  stretchModePersistence?: CropModePersistence;
  alignmentPersistence?: CropModePersistence;

  playerAutoConfig?: PlayerAutoConfigInterface;

  activeDOMConfig?: string;
  DOMConfig?: { [x: string]: SiteDOMSettingsInterface };

  // the following script are for extension caching and shouldn't be saved.
  // if they _are_ saved, they will be overwritten
  currentDOMConfig?: SiteDOMSettingsInterface;

  // the following fields are for use with extension update script
  override?: boolean;   // whether settings for this site will be overwritten by extension upgrade script
}

export interface PlayerAutoConfigInterface {
  modified: boolean;
  initialIndex: number;
  currentIndex: number;
}

export interface SiteDOMSettingsInterface {
  type: 'official' | 'community' | 'user-defined' | 'modified' | undefined;
  elements?: {
    player?: SiteDOMElementSettingsInterface,
    video?: SiteDOMElementSettingsInterface,
    other?: { [x: number]: SiteDOMElementSettingsInterface }
  };
  customCss?: string;
  periodicallyRefreshPlayerElement?: boolean;

  // the following script are for extension caching and shouldn't be saved.
  // if they _are_ saved, they will be overwritten
  anchorElementIndex?: number;
  anchorElement?: HTMLElement;
}

export interface SiteDOMElementSettingsInterface {
  manual?: boolean;
  querySelectors?: string;
  index?: number; // previously: useRelativeAncestor + videoAncestor
  mode?: 'index' | 'qs';
  nodeCss?: {[x: string]: string};
}

export default SettingsInterface;
