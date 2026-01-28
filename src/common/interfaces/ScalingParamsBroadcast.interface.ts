import VideoAlignmentType from '@src/common/enums/VideoAlignmentType.enum';
import { Ar } from '@src/common/interfaces/ArInterface';
import { Stretch } from '@src/common/interfaces/StretchInterface';

export interface ScalingParamsBroadcast {
  effectiveZoom: {
    x: number,
    y: number
  },
  videoAlignment: {
    x: VideoAlignmentType,
    y: VideoAlignmentType,
    xPos?: number,
    yPos?: number,
  }
  lastAr: Ar,
  manualZoom: boolean,
  stretch: Stretch,
}
