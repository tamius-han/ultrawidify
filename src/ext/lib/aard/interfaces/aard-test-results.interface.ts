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
  uncertain: boolean,
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
  aspectRatioInvalid: boolean,
  subtitleScan: {
    top: number,
    bottom: number,

    regions: {
      top: AardTestResult_SubtitleRegion,
      bottom: AardTestResult_SubtitleRegion
    }
  },
  aspectRatioUncertainReason?: AardUncertainReason,
  aspectRatioInvalidReason?: string,
}

export function initAardTestResults(settings: AardSettings): AardTestResults {
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
          uncertain: false,
        },
        bottom: {
          firstBlank: -1,
          lastBlank: -1,
          firstSubtitle: -1,
          lastSubtitle: -1,
          firstImage: -1,
          lastImage: -1,
          uncertain: false,
        }
      }
    },
    aspectRatioUpdated: false,
    activeAspectRatio: 0,
    letterboxSize: 0,
    letterboxOffset: 0,
    aspectRatioInvalid: false,
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
  results.aspectRatioUncertainReason = null;
  results.aspectRatioInvalid = false;
  results.letterboxOrientation = LetterboxOrientation.NotKnown;
}

export function resetSubtitleScanResults(results: AardTestResults): void {
  results.subtitleScan.top = -1;
  results.subtitleScan.bottom = -1;

  results.subtitleScan.regions.top.firstBlank = -1;
  results.subtitleScan.regions.top.lastBlank = -1;
  results.subtitleScan.regions.top.firstSubtitle = -1;
  results.subtitleScan.regions.top.lastSubtitle = -1;
  results.subtitleScan.regions.top.firstImage = -1;
  results.subtitleScan.regions.top.lastImage = -1;

  results.subtitleScan.regions.bottom.firstBlank = -1;
  results.subtitleScan.regions.bottom.lastBlank = -1;
  results.subtitleScan.regions.bottom.firstSubtitle = -1;
  results.subtitleScan.regions.bottom.lastSubtitle = -1;
  results.subtitleScan.regions.bottom.firstImage = -1;
  results.subtitleScan.regions.bottom.lastImage = -1;
}

