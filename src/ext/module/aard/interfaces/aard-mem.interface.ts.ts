import { AardSettings } from '../../../../common/interfaces/SettingsInterface'
import { AardUncertainReason } from '../enums/aard-letterbox-uncertain-reason.enum'
import { LetterboxOrientation } from '../enums/letterbox-orientation.enum'

export interface AardMem_SubtitleScan {
  linePhaseLengths: number[],
  darkPhases: number[],       // phases where pixel is 'dark'
  nonDarkPhases: number[],    // phases where pixel is not 'dark'
  imagePhases: number[],      // phases where pixel is not 'dark' and not 'subtitle'
  subtitleHalfPhases: number[],   // phases where pixel is 'subtitle' but not full
  subtitleFullPhases: number[],   // phases where pixel is 'subtitle'
  phaseLengthFrequency: number[]
}

export interface AardMem {
  subtitleScan: AardMem_SubtitleScan,
}

let totalPhaseArraySize: number;
let perTypePhaseArraySize: number;
export function initAardMem(settings: AardSettings): AardMem {
  totalPhaseArraySize = settings.subtitles.maxPhasesTotal + 1;
  perTypePhaseArraySize = settings.subtitles.maxPhasesPerType + 1;

  const createPhaseBuffer = () => {
    const buffer = new Array<number>(perTypePhaseArraySize).fill(0);
    buffer[perTypePhaseArraySize - 1] = -1;
    return buffer;
  };

  return {
    subtitleScan: {
      linePhaseLengths: new Array<number>(totalPhaseArraySize).fill(0),
      darkPhases: createPhaseBuffer(),
      nonDarkPhases: createPhaseBuffer(),
      imagePhases: createPhaseBuffer(),
      subtitleHalfPhases: createPhaseBuffer(),
      subtitleFullPhases: createPhaseBuffer(),
      phaseLengthFrequency: new Array<number>(settings.subtitles.maxValidLetter + 1).fill(0),
    },
  }
}

export function clearSubtitleScanPhaseBuffers(mem: AardMem) {
  const last = mem.subtitleScan.darkPhases.length - 1;
  mem.subtitleScan.darkPhases[0] = 0;
  mem.subtitleScan.nonDarkPhases[0] = 0;
  mem.subtitleScan.imagePhases[0] = 0;
  mem.subtitleScan.subtitleHalfPhases[0] = 0;
  mem.subtitleScan.subtitleFullPhases[0] = 0;
  mem.subtitleScan.darkPhases[last] = -1;
  mem.subtitleScan.nonDarkPhases[last] = -1;
  mem.subtitleScan.imagePhases[last] = -1;
  mem.subtitleScan.subtitleHalfPhases[last] = -1;
  mem.subtitleScan.subtitleFullPhases[last] = -1;

  mem.subtitleScan.linePhaseLengths[0] = 0;
  mem.subtitleScan.linePhaseLengths[mem.subtitleScan.linePhaseLengths.length - 1] = 0;

  for (let i = 1; i < mem.subtitleScan.phaseLengthFrequency.length - 1; i++) {
    mem.subtitleScan.phaseLengthFrequency[i] = 0;
  }
}
