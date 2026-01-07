import { AardLegacySettings, AardSettings } from '../../../../common/interfaces/SettingsInterface'
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

export interface AardLegacyTestResults {
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
    cornerPixelsViolated: [0,0,0,0],
    front?: number,
    back?: number,
  },
  imageLine: {
    top: number,            // is cumulative
    bottom: number,         // is cumulative
    invalidated: boolean
  }
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

    frontCandidate: number,
    backCandidate: number,
  },
  aspectRatioUncertain: boolean,
  topRowUncertain: boolean,
  bottomRowUncertain: boolean,
  aspectRatioUpdated: boolean,
  activeAspectRatio: number,  // is cumulative
  letterboxSize: number,
  letterboxOffset: number,
  logoDetected: [boolean, boolean, boolean, boolean],
  aspectRatioInvalid: boolean,
  subtitleScan: {
    top: number,
    bottom: number,

    regions: {
      top: AardTestResult_SubtitleRegion,
      bottom: AardTestResult_SubtitleRegion
    }
  },
  notLetterbox: boolean,
  aspectRatioUncertainEdges: number,
  aspectRatioUncertainReason?: AardUncertainReason,
  aspectRatioInvalidReason?: string,
}

export function initAardTestResults(settings: AardLegacySettings): AardLegacyTestResults {
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
      cornerPixelsViolated: [0,0,0,0],

      front: -1,
      back: -1,
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

      frontCandidate: 0,
      backCandidate: 0,
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
    logoDetected: [false, false, false, false],
    aspectRatioInvalid: false,
    notLetterbox: false,
  }
}

export function resetGuardLine(results: AardLegacyTestResults) {
  results.guardLine.front = -1;
  results.guardLine.back = -1;
}

export function resetAardTestResults(results: AardLegacyTestResults): void {
  results.isFinished = false;
  results.lastStage = 0;
  results.aspectRatioUpdated = false;
  results.aspectRatioUncertainReason = null;
  results.aspectRatioInvalid = false;
  results.letterboxOrientation = LetterboxOrientation.NotKnown;
}

export function resetSubtitleScanResults(results: AardLegacyTestResults): void {
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

