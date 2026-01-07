export interface AardPerformanceData {
  start: number;
  draw: number;
  getImage: number;

  fastBlackLevel: number;

  // optional ones are only available in legacy aard
  guardLine?: number; // actually times both guard line and image line checks
  edgeScan?: number; // includes validation step
  gradient?: number;
  scanResults?: number;
  subtitleScan: number;
}


export class AardTimer {
  private currentIndex: number = -1;

  private aardPerformanceDataBuffer: AardPerformanceData[];

  current: AardPerformanceData;
  previous: AardPerformanceData;
  average: AardPerformanceData;
  lastChange: AardPerformanceData;


  constructor() {
    // we need to deep clone, otherwise all buffer objects will point to the same object
    // (this makes calculating averages impossible)
    this.aardPerformanceDataBuffer = JSON.parse(JSON.stringify(new Array<AardPerformanceData>(64).fill(this.getEmptyMeasurement())));
    this.current = this.aardPerformanceDataBuffer[0];
    this.previous = undefined;
    this.lastChange = this.getEmptyMeasurement();
    this.average = this.getEmptyMeasurement();
  }

  private getEmptyMeasurement(): AardPerformanceData {
    return {
      start: -1,
      draw: -1,
      getImage: -1,
      fastBlackLevel: -1,
      guardLine: -1,
      edgeScan: -1,
      gradient: -1,
      scanResults: -1,
      subtitleScan: -1,
    }
  };

  private clearMeasurement(index: number) {
    this.aardPerformanceDataBuffer[index].draw = -1;
    this.aardPerformanceDataBuffer[index].getImage = -1;
    this.aardPerformanceDataBuffer[index].fastBlackLevel = -1;
    this.aardPerformanceDataBuffer[index].guardLine = -1;
    this.aardPerformanceDataBuffer[index].edgeScan = -1;
    this.aardPerformanceDataBuffer[index].gradient = -1;
    this.aardPerformanceDataBuffer[index].scanResults = -1;
    this.aardPerformanceDataBuffer[index].subtitleScan = -1;
  }

  next() {
    // go to next buffer position;
    this.currentIndex = (this.currentIndex + 1) % this.aardPerformanceDataBuffer.length;
    this.previous = this.current;
    this.clearMeasurement(this.currentIndex);

    // TODO: reset values
    this.current = this.aardPerformanceDataBuffer[this.currentIndex];
  }

  arChanged() { // copy numbers over
    this.lastChange.draw = this.current.draw;
    this.lastChange.getImage = this.current.getImage;
    this.lastChange.fastBlackLevel = this.current.fastBlackLevel;
    this.lastChange.guardLine = this.current.guardLine;
    this.lastChange.edgeScan = this.current.edgeScan;
    this.lastChange.gradient = this.current.gradient;
    this.lastChange.scanResults = this.current.scanResults;
    this.lastChange.subtitleScan = this.current.scanResults;
  }

  getAverage() {
    for (let i = 0; i < this.aardPerformanceDataBuffer.length; i++) {
      const sample = this.aardPerformanceDataBuffer[i];

      if (sample.draw !== -1) {
        this.average.draw += sample.draw;
      }
      if (sample.getImage !== -1) {
        this.average.getImage += sample.getImage;
      }
      if (sample.fastBlackLevel !== -1 && this.average.fastBlackLevel !== null) {
        this.average.fastBlackLevel += sample.fastBlackLevel;
      } else {
        this.average.fastBlackLevel = null;
      }
      if (sample.guardLine !== -1 && this.average.guardLine !== null) {
        this.average.guardLine += sample.guardLine;
      } else {
        this.average.guardLine = null;
      }
      if (sample.edgeScan !== -1 && this.average.edgeScan !== null) {
        this.average.edgeScan += sample.edgeScan;
      } else {
        this.average.edgeScan = null;
      }
      if (sample.gradient !== -1 && this.average.gradient !== null) {
        this.average.gradient += sample.gradient;
      } else {
        this.average.edgeScan = null;
      }
      if (sample.scanResults !== -1 && this.average.scanResults !== null) {
        this.average.scanResults += sample.scanResults;
      } else {
        this.average.scanResults = null;
      }
      if (sample.subtitleScan !== -1 && this.average.subtitleScan !== null) {
        this.average.subtitleScan += sample.subtitleScan;
      } else {
        this.average.subtitleScan = null;
      }
    }

    this.average.draw /= this.aardPerformanceDataBuffer.length;
    this.average.getImage /= this.aardPerformanceDataBuffer.length;
    this.average.fastBlackLevel /= this.aardPerformanceDataBuffer.length;
    this.average.guardLine = this.average.guardLine === null ? -1 : (this.average.guardLine / this.aardPerformanceDataBuffer.length);
    this.average.edgeScan = this.average.edgeScan === null ? -1 : (this.average.guardLine / this.aardPerformanceDataBuffer.length);
    this.average.gradient = this.average.gradient === null ? -1 : (this.average.guardLine / this.aardPerformanceDataBuffer.length);
    this.average.scanResults = this.average.scanResults === null ? -1 : (this.average.guardLine / this.aardPerformanceDataBuffer.length);
    this.average.subtitleScan = this.average.subtitleScan === null ? -1 : (this.average.subtitleScan /this.aardPerformanceDataBuffer.length);
  }
}
