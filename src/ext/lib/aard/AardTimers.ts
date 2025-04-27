export interface AardPerformanceData {
  start: number;
  draw: number;
  getImage: number;

  fastBlackLevel: number;
  guardLine: number; // actually times both guard line and image line checks
  edgeScan: number; // includes validation step
  gradient: number;
  scanResults: number;
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
      scanResults: -1
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
      if (sample.fastBlackLevel !== -1) {
        this.average.fastBlackLevel += sample.fastBlackLevel;
      }
      if (sample.guardLine !== -1) {
        this.average.guardLine += sample.guardLine;
      }
      if (sample.edgeScan !== -1) {
        this.average.edgeScan += sample.edgeScan;
      }
      if (sample.gradient !== -1) {
        this.average.gradient += sample.gradient;
      }
      if (sample.scanResults !== -1) {
        this.average.scanResults += sample.scanResults;
      }
    }

    this.average.draw /= this.aardPerformanceDataBuffer.length;
    this.average.getImage /= this.aardPerformanceDataBuffer.length;
    this.average.fastBlackLevel /= this.aardPerformanceDataBuffer.length;
    this.average.guardLine /= this.aardPerformanceDataBuffer.length;
    this.average.edgeScan /= this.aardPerformanceDataBuffer.length;
    this.average.gradient /= this.aardPerformanceDataBuffer.length;
    this.average.scanResults /= this.aardPerformanceDataBuffer.length;
  }
}
