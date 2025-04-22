import { AardSettings } from '../../../../common/interfaces/SettingsInterface'

export interface AardTestResults {
  isFinished: boolean,
  lastStage: number,
  notLetterbox: boolean,
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
  letterboxWidth: number,
  letterboxOffset: number,
  logoDetected: [boolean, boolean, boolean, boolean]
  aspectRatioInvalid: boolean
  aspectRatioUncertainReason?: string
  aspectRatioInvalidReason?: string
}

export function initAardTestResults(settings: AardSettings): AardTestResults {
  return {
    isFinished: true,
    lastStage: 0,
    notLetterbox: false,
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
    topRowUncertain: false,
    bottomRowUncertain: false,
    aspectRatioUpdated: false,
    activeAspectRatio: 0,
    letterboxWidth: 0,
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
  results.notLetterbox = false;
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
}
