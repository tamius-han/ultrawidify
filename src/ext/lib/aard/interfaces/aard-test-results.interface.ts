import { AardSettings } from '../../../../common/interfaces/SettingsInterface'
import { AardUncertainReason } from '../enums/aard-letterbox-uncertain-reason.enum'
import { LetterboxOrientation } from '../enums/letterbox-orientation.enum'

export interface AardTestResult_SubtitleRegion {
  firstBlank: number,
  lastBlank: number,
  firstSubtitle: number,
  lastSubtitle: number,
  firstImage: number,
  lastImage: number
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
    top: number,            // is cumulative
    bottom: number,         // is cumulative
    invalidated: boolean,
    cornerViolated: [boolean, boolean, boolean, boolean],
    cornerPixelsViolated: [0,0,0,0]
  },
  imageLine: {
    top: number,            // is cumulative
    bottom: number,         // is cumulative
    invalidated: boolean
  },
  aspectRatioCheck: {
    topRows: [number, number, number],
    topQuality: [number, number, number],
    bottomRows: [number, number, number],
    bottomQuality: [number, number, number],
    topCandidate: number,
    topCandidateQuality: number,
    bottomCandidate: number,
    bottomCandidateDistance: number,
    bottomCandidateQuality: number,
    topRowsDifferenceMatrix: [number, number, number],
    bottomRowsDifferenceMatrix: [number, number, number],
  },
  aspectRatioUncertain: boolean,
  topRowUncertain: boolean,
  bottomRowUncertain: boolean,
  aspectRatioUpdated: boolean,
  activeAspectRatio: number,  // is cumulative
  letterboxSize: number,
  letterboxOffset: number,
  logoDetected: [boolean, boolean, boolean, boolean]
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
  aspectRatioUncertainEdges: number,
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
      top: -1,
      bottom: -1,
      invalidated: false,
      cornerViolated: [false, false, false, false],
      cornerPixelsViolated: [0,0,0,0]
    },
    imageLine: {
      top: -1,
      bottom: -1,
      invalidated: false,
    },
    aspectRatioCheck: {
      topRows: [-1, -1, -1],
      topQuality: [0, 0, 0],
      bottomRows: [-1, -1, -1],
      bottomQuality: [0, 0, 0],
      topCandidate: 0,
      topCandidateQuality: 0,
      bottomCandidate: 0,
      bottomCandidateDistance: 0,
      bottomCandidateQuality: 0,
      topRowsDifferenceMatrix: [0, 0, 0],
      bottomRowsDifferenceMatrix: [0, 0, 0],
    },
    aspectRatioUncertain: false,
    aspectRatioUncertainEdges: 0,
    topRowUncertain: false,
    bottomRowUncertain: false,
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
          lastImage: -1
        },
        bottom: {
          firstBlank: -1,
          lastBlank: -1,
          firstSubtitle: -1,
          lastSubtitle: -1,
          firstImage: -1,
          lastImage: -1
        }
      }
    },
    aspectRatioUpdated: false,
    activeAspectRatio: 0,
    letterboxSize: 0,
    letterboxOffset: 0,
    logoDetected: [false, false, false, false],
    aspectRatioInvalid: false,
  }
}

export function resetGuardLine(results: AardTestResults) {
  results.guardLine.top = -1;
  results.guardLine.bottom = -1;
  results.imageLine.invalidated = false;
  results.guardLine.invalidated = false;
  results.guardLine.cornerViolated[0] = false;
  results.guardLine.cornerViolated[1] = false;
  results.guardLine.cornerViolated[2] = false;
  results.guardLine.cornerViolated[3] = false;
  results.guardLine.cornerPixelsViolated[0] = 0;
  results.guardLine.cornerPixelsViolated[1] = 0;
  results.guardLine.cornerPixelsViolated[2] = 0;
  results.guardLine.cornerPixelsViolated[3] = 0;
}

export function resetAardTestResults(results: AardTestResults): void {
  results.isFinished = false;
  results.lastStage = 0;
  results.imageLine.invalidated = false;
  results.guardLine.invalidated = false;
  results.guardLine.cornerViolated[0] = false;
  results.guardLine.cornerViolated[1] = false;
  results.guardLine.cornerViolated[2] = false;
  results.guardLine.cornerViolated[3] = false;
  results.guardLine.cornerPixelsViolated[0] = 0;
  results.guardLine.cornerPixelsViolated[1] = 0;
  results.guardLine.cornerPixelsViolated[2] = 0;
  results.guardLine.cornerPixelsViolated[3] = 0;
  // results.letterboxWidth = 0;
  // results.letterboxOffset = 0;
  results.aspectRatioUpdated = false;
  results.aspectRatioUncertainReason = null;
  results.topRowUncertain = false;
  results.bottomRowUncertain = false;
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

