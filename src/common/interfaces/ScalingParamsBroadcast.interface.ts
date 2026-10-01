import VideoAlignmentType from '@src/common/enums/VideoAlignmentType.enum';
import { Ar } from '@src/common/interfaces/ArInterface';
import { Stretch } from '@src/common/interfaces/StretchInterface';

export interface VideoAlignmentParams {
  x: VideoAlignmentType,
  y: VideoAlignmentType,
  xPos?: number,
  yPos?: number,
}

export interface ScalingParamsBroadcast {
  effectiveZoom: {
    x: number,
    y: number
  },
  videoAlignment: VideoAlignmentParams,
  lastAr: Ar,
  manualZoom: boolean,
  stretch: Stretch,
}
