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
  }
}

export function initAardTestResults(): AardTestResults {
  return {
    isFinished: true,
    lastStage: 0,
    notLetterbox: false,
    blackLevel: 0,
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
    }
  }
}
