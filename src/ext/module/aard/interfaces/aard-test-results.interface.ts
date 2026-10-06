import { AardSettings } from '../../../../common/interfaces/SettingsInterface'
import { AardUncertainReason } from '../enums/aard-letterbox-uncertain-reason.enum'
import { LetterboxOrientation } from '../enums/letterbox-orientation.enum'

export interface AardTestResult_SubtitleRegion {
  firstBlank: number,
  lastBlank: number,
  firstSubtitle: number,
  lastSubtitle: number,
  firstImage: number,
  lastImage: number,

  subtitleConfirmations: number,

  uncertain: boolean,
  hasSubtitle: boolean,
  subtitlesUnstable: boolean,

  // NOTE: nothing in stability resets between runs, as there should
  // be no meaningful difference between running on stale data and running
  // on reset data ... probably
  stability: {
    scanSlot: number,
    lineSlot: number,
    buffer: number[],
    lineSize: number,
    slotSize: number,
    intervalFrame: number,
  }
}

export interface AardTestResultFlags {
  noLetterbox: boolean,
  doubleLetterbox: boolean,
  arStable: boolean,
  arDeltaStable: boolean,
  arUnstable: boolean,
  cropInvalidated: boolean,
  cropMaintaining: boolean,
  noSubtitles: boolean,
  subtitlesUncertain: boolean,
  subtitlesConfirmed: boolean
}

export interface AardTestResults {
  isFinished: boolean,
  lastStage: number,
  letterboxOrientation: LetterboxOrientation,
  lastValidLetterboxOrientation: LetterboxOrientation,
  subtitleDetected: boolean,
  blackLevel: number,       // is cumulative
  blackThreshold: number,   // is cumulative
  guardLine: {
    front: number,
    back: number,
  },
  aspectRatioCheck: {
    frontCandidate: number,
    backCandidate: number,
  },
  aspectRatioUncertain: boolean,
  aspectRatioUpdated: boolean,
  activeAspectRatio: number,  // is cumulative
  letterboxSize: number,
  letterboxOffset: number,
  letterboxSizeWithSubtitles: number,
  aspectRatioInvalid: boolean,
  subtitleScan: {
    top: number,
    bottom: number,

    regions: {
      top: AardTestResult_SubtitleRegion,
      bottom: AardTestResult_SubtitleRegion
    },
  },
  activeLetterbox: {
    width: number,
    offset: number,
    orientation: LetterboxOrientation
  },
  stability: {
    deltas: number[],
    ratios: number[],
    deltaIndex: number,
    ratioIndex: number,
    timeDuration: NodeJS.Timeout,
  },
  aspectRatioUncertainReason?: AardUncertainReason,
  aspectRatioInvalidReason?: string,
  flags: AardTestResultFlags,
}

export function initAardTestResults(settings: AardSettings): AardTestResults {

  // add one extra slot for on/off status change count at the end. We keep this
  // info because the buffer doesn't reset between runs
  const stabilityLineSize = (settings.subtitles.stopAfterDetections + 1);

  // add one extra slot for current run cache, because we'll discard empty lines
  // from our subtitle stability calculations
  const stabilityScanSize = stabilityLineSize * settings.subtitles.stability.scanLines + 1;
  const stabilityBufferSize = 2    // ← letter ON index + letter OFF index
    * stabilityScanSize
    * settings.subtitles.stability.confirmationScans;

  return {
    isFinished: true,
    lastStage: 0,
    letterboxOrientation: LetterboxOrientation.NotKnown,
    lastValidLetterboxOrientation: LetterboxOrientation.NotKnown,
    blackLevel: settings.blackLevels.defaultBlack,
    blackThreshold: 16,
    guardLine: {
      front: -1,
      back: -1,
    },
    aspectRatioCheck: {
      frontCandidate: 0,
      backCandidate: 0,
    },
    aspectRatioUncertain: false,
    subtitleDetected: false,
    subtitleScan: {
      top: -1,
      bottom: -1,

      regions: {
        top: {
          firstBlank: -1,
          lastBlank: -1,
          firstSubtitle: -1,
          lastSubtitle: -1,
          firstImage: -1,
          lastImage: -1,

          subtitleConfirmations: 0,

          uncertain: false,
          hasSubtitle: false,
          subtitlesUnstable: false,

          stability: {
            scanSlot: 0,
            lineSlot: 0,
            intervalFrame: 0,
            lineSize: stabilityLineSize,
            slotSize: stabilityScanSize,
            buffer: new Array<number>(stabilityBufferSize).fill(0),
          },
        },
        bottom: {
          firstBlank: -1,
          lastBlank: -1,
          firstSubtitle: -1,
          lastSubtitle: -1,
          firstImage: -1,
          lastImage: -1,

          subtitleConfirmations: 0,

          uncertain: false,
          hasSubtitle: false,
          subtitlesUnstable: false,

          stability: {
            scanSlot: 0,
            lineSlot: 0,
            intervalFrame: 0, // must be same, otherwise debug results display is broken
            lineSize: stabilityLineSize,
            slotSize: stabilityScanSize,
            buffer: new Array<number>(stabilityBufferSize).fill(0),
          },
        }
      },

    },
    activeLetterbox: {
      width: 0,
      offset: 0,
      orientation: LetterboxOrientation.NotLetterbox
    },
    aspectRatioUpdated: false,
    activeAspectRatio: 0,
    letterboxSize: 0,
    letterboxOffset: 0,
    letterboxSizeWithSubtitles: 0,
    aspectRatioInvalid: false,

    stability: {
      deltaIndex: 0,
      ratioIndex: 0,
      deltas: new Array<number>(settings.stability.deltaSampleCount).fill(0),
      ratios: new Array<number>(settings.stability.arSampleCount).fill(0),
      timeDuration: undefined,
    },

    flags: {
      noLetterbox: false,
      doubleLetterbox: false,
      arStable: false,
      arDeltaStable: false,
      arUnstable: false,
      cropInvalidated: false,
      cropMaintaining: false,
      noSubtitles: false,
      subtitlesUncertain: false,
      subtitlesConfirmed: false
    }
  }
}

export function resetGuardLine(results: AardTestResults) {
  results.guardLine.front = -1;
  results.guardLine.back = -1;
}

export function resetAardTestResults(results: AardTestResults): void {
  results.isFinished = false;
  results.lastStage = 0;
  results.aspectRatioUpdated = false;
  results.aspectRatioUncertainReason = undefined;
  results.aspectRatioInvalid = false;
  results.letterboxOrientation = LetterboxOrientation.NotKnown;

  // subtitle scan only runs on letterbox frames. If this flag isn't cleared every frame, a stale
  // detection from an earlier frame is acted upon in frames where the scan didn't run.
  results.subtitleDetected = false;

  // reset flags for debug
  results.flags.noLetterbox = false;
  results.flags.doubleLetterbox = false;
  results.flags.arStable = false;
  results.flags.arDeltaStable = false;
  results.flags.arUnstable = false;
  results.flags.cropInvalidated = false;
  results.flags.cropMaintaining = false;
  results.flags.subtitlesUncertain = false;
  results.flags.subtitlesConfirmed = false;
}



export function resetSubtitleScanRegion(region: AardTestResult_SubtitleRegion) {
  region.firstBlank = -1;
  region.lastBlank = -1;
  region.firstSubtitle = -1;
  region.lastSubtitle = -1;
  region.firstImage = -1;
  region.lastImage = -1;
  region.subtitleConfirmations = 0;

  region.uncertain = false;
  region.hasSubtitle = false;
  region.subtitlesUnstable = false;
}

export function resetSubtitleScanResults(results: AardTestResults): void {
  results.subtitleScan.top = -1;
  results.subtitleScan.bottom = -1;

  resetSubtitleScanRegion(results.subtitleScan.regions.top);
  resetSubtitleScanRegion(results.subtitleScan.regions.bottom);
}
