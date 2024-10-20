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
    cornerViolations: [boolean, boolean, boolean, boolean],
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
    bottomCandidateQuality: number,
  },
  aspectRatioUncertain: boolean,
  letterboxWidth: number,
  letterboxOffset: number,
  logoDetected: [boolean, boolean, boolean, boolean]
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
      cornerViolations: [false, false, false, false],
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
      bottomCandidateQuality: 0,
    },
    letterboxWidth: 0,
    letterboxOffset: 0,
    logoDetected: [false, false, false, false]

  }
}

export function resetAardTestResults(results: AardTestResults): void {
  results.isFinished = false;
  results.lastStage = 0;
  results.notLetterbox = false;
  results.guardLine.invalidated = false
  results.guardLine.cornerViolations[0] = false;
  results.guardLine.cornerViolations[1] = false;
  results.guardLine.cornerViolations[2] = false;
  results.guardLine.cornerViolations[3] = false;
}
