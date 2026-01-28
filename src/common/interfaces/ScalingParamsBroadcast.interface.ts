import { Ar } from '@src/common/interfaces/ArInterface';
import { Stretch } from '@src/common/interfaces/StretchInterface';

export interface ScalingParamsBroadcast {
  effectiveZoom: {
    x: number,
    y: number
  },
  lastAr: Ar,
  manualZoom: boolean,
  stretch: Stretch,
}
