import { AardPerformanceMeasurement } from './aard-performance-measurements.enum';

export interface AardPerformanceData {
  total: AardPerformanceMeasurement,
  theoretical: AardPerformanceMeasurement,
  imageDraw: AardPerformanceMeasurement
  blackFrameDraw: AardPerformanceMeasurement,
  blackFrame: AardPerformanceMeasurement,
  fastLetterbox: AardPerformanceMeasurement,
  edgeDetect: AardPerformanceMeasurement,

  imageDrawCount: number,
  blackFrameDrawCount: number,
  blackFrameCount: number,
  fastLetterboxCount: number,
  edgeDetectCount: number,

  aardActive: boolean,    // whether autodetection is currently running or not
}
