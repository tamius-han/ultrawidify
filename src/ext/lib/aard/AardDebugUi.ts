import { AardPerformanceData } from './AardTimers';

export class AardDebugUi {

  aard: any;

  uiAnchorElement: HTMLDivElement;
  pauseOnArCheck: boolean = false;

  uiVisibility: any = {};

  constructor(aard: any) {
    this.aard = aard;

    this.uiVisibility = {
      detectionDetails: aard.settings.active.ui.dev.aardDebugOverlay.showDetectionDetails
    };

    (window as any).ultrawidify_uw_aard_debug_tools = {
      enableStopOnChange: () => this.changePauseOnCheck(true),
      disableStopOnChange: () => this.changePauseOnCheck(false),
      resumeVideo: () => this.resumeVideo(),
      step: () => this.aard.step()
    }
  }

  initContainer() {
    const div = document.createElement('div');
    div.id = 'uw-aard-debug-ui-container';
    div.innerHTML = `
     <div style="
        position: fixed; top: 0; left: 0; width: 100vw; height: 100dvh; display: flex; flex-direction: column; pointer-events: none; z-index: 9999; font-size: 16px; font-family: 'Overpass Mono', monospace;
      ">
        <div style="width: 100%; display: flex; flex-direction: row; justify-content: space-between; backdrop-filter: blur(0.5rem) brightness(0.5);">
          <div style="padding: 1rem; color: #fff">
            <h1>Aard debug overlay</h1>
          </div>
          <div style="pointer-events: all; display: flex; flex-direction: column; margin-right: 1rem;">
            <button id="uw-aard-debug_show-detection-details">Show det. details</button>
            <button id="uw-aard-debug_hide-detection-details">Hide det. details</button>
          </div>

          <style>
            #uw-aard-debug_performance-container #uw-aard-debug_performance-popup {
              display: none;
            }
            #uw-aard-debug_performance-container:hover #uw-aard-debug_performance-popup {
              display: block;
              position: fixed;
              left: 0;
              top: 3rem;
              width: 100vw;

              color: #aaa;
              background-color: #000;
              border: 2px solid #fa6;
              padding: 16px;
              padding-right: 32px;
              box-sizing: border-box;

              backdrop-filter: blur(1rem) brightness(0.5);

              pointer-events: none;
              font-size: 12px;
            }
          </style>

          <div id="uw-aard-debug_performance-container" style="flex-grow: 1; position: relative; pointer-events: auto;">
            <div id="uw-aard-debug_performance-mini" style="width: 100%; color: #aaa; display: flex; flex-direction: column; font-size: 12px;"></div>
            <div id="uw-aard-debug_performance-popup" style="position: fixed; top: 3rem; z-index: 3000;">
            </div>
          </div>
          <div style="pointer-events: all">
            <button id="uw-aard-debug-ui_close-overlay">Close overlay</button>
          </div>
        </div>


        <div id="uw-aard-debug-ui_body" style="display: flex; flex-direction: row; width: 100%">
          <div style="">
            <div id="uw-aard-debug_aard-sample-canvas" style="min-width: 640px"></div>
            <div style="background: black; color: #fff"; font-size: 24px;">AARD IN</div>

            <div style="background: black; color: #ccc; padding: 1rem">
              <div>
                <span style="color: rgb(0.1, 0.1, 0.35)">■</span>
                Black level sample
              </div>
              <div>
                <span style="color: rgb(0.3, 1.0, 0.6)">■</span>
                <span style="color: rgb(0.1, 0.5, 0.3)">■</span>
                Guard line (middle/corner) OK
              </div>
              <div>
                <span style="color: rgb(1.0, 0.1, 0.1)">■</span>
                <span style="color: rgb(0.5, 0.0, 0.0)">■</span>
                Guard line (middle/corner) violation
              </div>
              <div>
                Image line — <span style="color: rgb(0.7, 0.7, 0.7)">■</span> image, <span style="color: rgb(0.2, 0.2, 0.6)">■</span> no image
              </div>
              <div>
                Edge scan — <span style="color: rgb(0.1, 0.1, 0.4)">■</span> probe, <span style="color: rgb(0.4, 0.4, 1.0)">■</span> hit
              </div>
              <div>
                Slope test — <span style="color: rgb(0.4, 0.4, 1.0)">■</span> ok, <span style="color: rgb(1.0, 0.0, 0.0)">■</span> fail
              </div>
            </div>

            <div style="pointer-events: all">
              <button id="uw-aard-debug-ui_enable-stop-on-change"  style="">Pause video on aspect ratio change</button>
              <button id="uw-aard-debug-ui_disable-stop-on-change" style="display: none">Stop pausing video on aspect ratio change</button>
              <button id="uw-aard-debug-ui_resume-video"           >Resume video</button>
              <button id="uw-aard-debug-ui_enable-step"            >Run ARD once</button>
              <button id="uw-aard-debug-ui_enable-step-nocache"    >Run ARD (bypass cache)</button>
            </div>
          </div>

          <div style="flex-grow: 1"></div>
          <div>
            <div style="background: black; color: #ccc;">
              <div style="font-size: 24px; padding: 1rem;">
                Debug results:
              </div>
              <pre id="uw-aard-results"></pre>
            </div>
          </div>
          <div style="width: 1920px">
            <div id="uw-aard-debug_aard-output" style="zoom: 3; image-rendering: pixelated;"></div>
            <div style="background: black; color: #fff; font-size: 24px;">AARD RESULT</div>

          </div>
        </div>
      </div>
    `;

    document.body.appendChild(div);
    this.uiAnchorElement = div;

    document.getElementById('uw-aard-debug-ui_enable-stop-on-change').onclick = () => this.changePauseOnCheck(true);
    document.getElementById('uw-aard-debug-ui_disable-stop-on-change').onclick = () => this.changePauseOnCheck(false);
    document.getElementById('uw-aard-debug-ui_resume-video').onclick = () => this.resumeVideo();
    document.getElementById('uw-aard-debug-ui_enable-step').onclick = () => this.aard.step();
    document.getElementById('uw-aard-debug-ui_enable-step-nocache').onclick = () => this.aard.step({noCache: true});
    document.getElementById('uw-aard-debug-ui_close-overlay').onclick = () => (this.aard as any).hideDebugCanvas();
    document.getElementById('uw-aard-debug_show-detection-details').onclick = () => {this.uiVisibility.detectionDetails = true; this.setOverlayVisibility();};
    document.getElementById('uw-aard-debug_hide-detection-details').onclick = () => {this.uiVisibility.detectionDetails = false; this.setOverlayVisibility();};

    this.setOverlayVisibility();
  }

  changePauseOnCheck(pauseOnChange: boolean) {
    this.pauseOnArCheck = pauseOnChange;

    document.getElementById("uw-aard-debug-ui_enable-stop-on-change").style.display = pauseOnChange ? "none" : "";
    document.getElementById("uw-aard-debug-ui_disable-stop-on-change").style.display = pauseOnChange ? "" : "none";
  }

  destroyContainer() {
    this.uiAnchorElement.remove();
  }

  attachCanvases(sample: HTMLCanvasElement, debug: HTMLCanvasElement) {
    const sampleCanvasParent = document.getElementById('uw-aard-debug_aard-sample-canvas');
    sampleCanvasParent.appendChild(sample);
    const debugCanvasParent = document.getElementById('uw-aard-debug_aard-output');
    debugCanvasParent.appendChild(debug);
  }

  resumeVideo() {
    (this.aard as any).video.play();
    this.aard.start();
  }

  private updatePerformanceResults() {
    const previewDiv = document.getElementById('uw-aard-debug_performance-mini');
    const popupDiv = document.getElementById('uw-aard-debug_performance-popup');

    const previewContent = `
      <div style="display: flex; flex-direction: row">
        <div style="width: 120px">Current:</div>
        <div style="flex-grow: 1;">${this.generateMiniGraphBar(this.aard.timer.current)}</div>
      </div>
      <div style="display: flex; flex-direction: row">
        <div style="width: 120px">Average:</div>
        <div style="flex-grow: 1">${this.generateMiniGraphBar(this.aard.timer.average)}</div>
      </div>
      <div style="display: flex; flex-direction: row">
        <div style="width: 120px">Last chg.:</div>
        <div></div>
        <div style="flex-grow: 1">${this.generateMiniGraphBar(this.aard.timer.lastChange)}</div>
      </div>
    `;

    const popupContent = `
      <h2 style="color: #fa6; margin-bottom: 1rem">Detailed performance analysis:</h2>
      <div style="width: 100%; display: flex; flex-direction: column">
        <div style="margin-bottom: 1rem;">
          ${this.generateRawTimes(this.aard.timer.average)}
        </div>
        <div style="color: #fff">Stage times (not cumulative):</div>
        <div style="display: flex; flex-direction: row; width: 100%; height: 150px">
          <div style="width: 160px; text-align: right; padding-right: 4px;">Current:</div>
          <div style="flex-grow: 1;">${this.generateMiniGraphBar(this.aard.timer.current, true)}</div>
        </div>

        <div style="margin-bottom: 1rem;">
          ${this.generateRawTimes(this.aard.timer.average)}
        </div>
        <div style="color: #fff">Stage times (not cumulative):</div>
        <div style="display: flex; flex-direction: row; width: 100%; height: 150px">
          <div style="width: 160px; text-align: right; padding-right: 4px;">Average:</div>
          <div style="flex-grow: 1;">${this.generateMiniGraphBar(this.aard.timer.average, true)}</div>
        </div>

        <div style="margin-bottom: 1rem;">
          ${this.generateRawTimes(this.aard.timer.average)}
        </div>
        <div style="display: flex; flex-direction: row; width: 100%; height: 150px">
          <div style="width: 160px; text-align: right; padding-right: 4px;">Last change:</div>
          <div style="flex-grow: 1;">${this.generateMiniGraphBar(this.aard.timer.lastChange, true)}</div>
        </div>
      </div>
    `

    previewDiv.innerHTML = previewContent;
    popupDiv.innerHTML = popupContent;
  }

  private getBarLabel(width: number, leftOffset: number, topOffset: number, label: string, detailed: boolean, extraStyles?: string) {
    if (!detailed) {
      return '';
    }

    let offsets: string;
    let text: string = '';

    if (leftOffset + width < 80) {
      // at the end of the bar
      offsets = `left: ${leftOffset + width}%;`;
    } else {
      if (width < 15 && leftOffset < 100) {
        // before the bar
        offsets = `right: ${100 - leftOffset}%;`;
        text = 'color: #fff;';
      } else {
        // inside the bar, aligned to right
        offsets = `right: ${Math.max(100 - (leftOffset + width), 0)}%;`
      }
    }

    return `
      <div style="
        position: absolute;
        ${offsets} top: ${topOffset}px;
        padding-left: 0.5rem; padding-right: 0.5rem;đ
        ${text}
        text-shadow: 0 0 2px #000, 0 0 2px #000; 0 0 2px #000; 0 0 2px #000;
        ${extraStyles}
      ">
        ${label}
      </div>
    `;
  }

  private generateRawTimes(timer) {
    return `
      <span style="color: #fff">Raw times (cumulative; -1 = test was skipped):</span><br/>
      draw        <span style="color: #fa6; margin-right: 0.5rem;">${timer.draw.toFixed(2)}ms</span>
      get data    <span style="color: #fa6; margin-right: 0.5rem;">${timer.getImage.toFixed(2)}ms</span>
      black lv.   <span style="color: #fa6; margin-right: 0.5rem;">${timer.fastBlackLevel.toFixed(2)}ms</span>
      guard/image <span style="color: #fa6; margin-right: 0.5rem;">${timer.guardLine.toFixed(3)}ms</span>
      edge        <span style="color: #fa6; margin-right: 0.5rem;">${timer.edgeScan.toFixed(2)}ms</span>
      gradient    <span style="color: #fa6; margin-right: 0.5rem;">${timer.gradient.toFixed(3)}ms</span>
      post        <span style="color: #fa6; margin-right: 0.5rem;">${timer.scanResults.toFixed(2)}ms</span>
      subtitle    <span style="color: #fa6; margin-right: 0.5rem;">${timer.subtitleScan.toFixed(2)}ms</span>
    `;
  }

  private generateMiniGraphBar(perf: AardPerformanceData, detailed: boolean = false) {
    if (!perf) {
      return `
        n/a
      `;
    }

    let total = 0;

    const draw = Math.max(perf.draw, 0);
    total += draw;

    const getImageStart = draw;
    const getImage = Math.max(perf.getImage - total, 0);
    total += getImage;

    const fastBlackLevelStart = getImageStart + getImage;
    const fastBlackLevel = Math.max(perf.fastBlackLevel - total, 0);
    total += fastBlackLevel;

    const guardLineStart = fastBlackLevelStart + fastBlackLevel;
    const guardLine = Math.max(perf.guardLine - total, 0);
    total += guardLine;

    const edgeScanStart = guardLineStart + guardLine;
    const edgeScan = Math.max(perf.edgeScan - total, 0);
    total += edgeScan;

    const gradientStart = edgeScanStart + edgeScan;
    const gradient = Math.max(perf.gradient - total, 0);
    total += gradient;

    const scanResultsStart = gradientStart + gradient;
    const scanResults = Math.max(perf.scanResults - total, 0);
    total += scanResults;

    const subtitleScanStart = scanResultsStart + scanResults;
    const subtitleScan  = Math.max(perf.scanResults - total, 0);
    total += subtitleScan;

    return `
      <div style="width: calc(100% - 2rem); position: relative; text-align: right;">
        ${detailed ? '' : `${total.toFixed()} ms`}
        <div style="position: absolute; top: 0; left: 0; width: ${total}%; background: #fff; height: 2px;"></div>
        ${detailed ? `<div style="position: absolute; top: 0; left: ${total}%; height: 100px; width: 1px; border-left: 1px dotted rgba(255,255,255,0.5)"></div> ` : ''}

        <div style="position: absolute; top: ${detailed ? '2px'  : '2px'}; left: 0; min-width: 1px; width: ${draw}%; background: #007; height: 12px;"></div>
        ${this.getBarLabel(draw, 0, 2, `draw: ${draw.toFixed(2)} ms`, detailed)}

        <div style="position: absolute; top: ${detailed ? '14px' : '2px'}; left: ${getImageStart}%; min-width: 1px; width: ${getImage}%; background: #00a; height: 12px;"></div>
        ${this.getBarLabel(getImage, getImageStart, 14, `get data: ${getImage.toFixed(2)} ms`, detailed)}

        <div style="position: absolute; top: ${detailed ? '26px' : '2px'}; left: ${fastBlackLevelStart}%; min-width: 1px; width: ${fastBlackLevel}%; background: #03a; height: 12px;"></div>
        ${this.getBarLabel(fastBlackLevel, fastBlackLevelStart, 26, `black level: ${fastBlackLevel.toFixed(2)} ms`, detailed)};

        <div style="position: absolute; top: ${detailed ? '38px' : '2px'}; left: ${guardLineStart}%; min-width: 1px; width: ${guardLine}%; background: #0f3; height: 12px;"></div>
        ${this.getBarLabel(guardLine, guardLineStart, 38, `guard/image line: ${guardLine.toFixed(2)} ms`, detailed)}

        <div style="position: absolute; top: ${detailed ? '50px' : '2px'}; left: ${edgeScanStart}%; min-width: 1px; width: ${edgeScan}%; background: #f51; height: 12px;"></div>
        ${this.getBarLabel(edgeScan, edgeScanStart, 50, `edge scan (/w validation): ${edgeScan.toFixed(2)} ms`, detailed)}

        <div style="position: absolute; top: ${detailed ? '62px' : '2px'}; left: ${gradientStart}%; min-width: 1px; width: ${gradient}%; background: #fa6; height: 12px;"></div>
        ${this.getBarLabel(gradient, gradientStart, 62, `gradient: ${gradient.toFixed(2)} ms`, detailed)}

        <div style="position: absolute; top: ${detailed ? '74px' : '2px'}; left: ${scanResultsStart}%; min-width: 1px; width: ${scanResults}%; background: #80f; height: 12px;"></div>
        ${this.getBarLabel(scanResults, scanResultsStart, 74, `scan results processing: ${scanResults.toFixed(2)} ms`, detailed)}

        ${this.getBarLabel(0, scanResults + scanResultsStart, 88, `total: ${total.toFixed(2)} ms`, detailed, 'color: #fff;')}

        <div style="position: absolute; top: ${detailed ? '74px' : '2px'}; left: ${subtitleScanStart}%; min-width: 1px; width: ${subtitleScan}%; background: rgba(234, 204, 84, 1); height: 12px;"></div>
        ${this.getBarLabel(scanResults, scanResultsStart, 74, `scan results processing: ${subtitleScan.toFixed(2)} ms`, detailed)}

        ${this.getBarLabel(0, scanResults + scanResultsStart, 88, `total: ${total.toFixed(2)} ms`, detailed, 'color: #fff;')}

        <!-- 60/30 fps markers -->
        <div style="position: absolute; top: ${detailed ? '-12px' : '0'}; left: 16.666%; width: 1px; border-left: 1px dashed #4f9; height: ${detailed ? '112px' : '12px'}; padding-left: 2px; background-color: rgba(0,0,0,0.5); z-index: ${detailed ? '5' : '2'}000;">60fps</div>
        <div style="position: absolute; top: ${detailed ? '-12px' : '0'}; left: 33.333%; width: 1px; border-left: 1px dashed #ff0; height: ${detailed ? '112px' : '12px'}; padding-left: 2px; background-color: #000; z-index: ${detailed ? '5' : '2'}000;">30fps</div>
      </div>
    `;
  }

  _lastAr: undefined;
  updateTestResults(testResults) {
    this.updatePerformanceResults();

    if (testResults.aspectRatioUpdated && this.pauseOnArCheck) {
      (this.aard as any).video.pause();
      this.aard.stop();
    }

    const resultsDiv = document.getElementById('uw-aard-results');

    const ar = testResults.activeAspectRatio.toFixed(3);

    let out = `
      LAST STAGE: ${testResults.lastStage}         | black level: ${testResults.blackLevel}, threshold: ${testResults.blackThreshold}

      -- ASPECT RATIO
      Active: ${ar}, changed since last check? ${testResults.aspectRatioUpdated}               letterbox width: ${testResults.letterboxWidth} offset ${testResults.letterboxOffset}<br/>
      <sup>(last: ${this._lastAr})</sup>


      image in black level probe (aka "not letterbox"): ${testResults.notLetterbox}
    `;
    this._lastAr = ar;

    if (testResults.notLetterbox) {
      resultsDiv.innerHTML = out;
      return;
    }
    out = `${out}

      -- UNCERTAIN FLAGS
      AR: ${testResults.aspectRatioUncertain} (reason: ${testResults.aspectRatioUncertainReason ?? 'n/a'}); top row: ${testResults.topRowUncertain}; bottom row: ${testResults.bottomRowUncertain}${
        testResults.aspectRatioInvalid ? `\nINVALID_AR (reason: ${testResults.aspectRatioInvalidReason ?? 'n/a'})` : ''}

      -- GUARD & IMAGE LINE
      bottom guard: ${testResults.guardLine.bottom}       image: ${testResults.guardLine.invalidated ? 'n/a' : testResults.imageLine.bottom}
      top    guard: ${testResults.guardLine.top}      image: ${testResults.guardLine.invalidated ? 'n/a' : testResults.imageLine.top}

      guard line ${testResults.guardLine.invalidated ? 'INVALIDATED' : 'valid'}       image line ${testResults.guardLine.invalidated ? '<skipped test>' : testResults.imageLine.invalidated ? 'INVALIDATED' : 'valid'}

      corner invalidations (invalid pixels -> verdict)

                    LEFT         CENTER         RIGHT
      bottom:       ${testResults.guardLine.cornerPixelsViolated[0]} → ${testResults.guardLine.cornerViolated[0] ? '❌' : '◽'}                       ${testResults.guardLine.cornerPixelsViolated[1]} → ${testResults.guardLine.cornerViolated[1] ? '❌' : '◽'}
         top:       ${testResults.guardLine.cornerPixelsViolated[2]} → ${testResults.guardLine.cornerViolated[2] ? '❌' : '◽'}                       ${testResults.guardLine.cornerPixelsViolated[3]} → ${testResults.guardLine.cornerViolated[3] ? '❌' : '◽'}

      -- AR SCAN ${testResults.lastStage < 1 ? `
      DID NOT RUN THIS FRAME` : `

                     LEFT         CENTER         RIGHT        CANDIDATE
      BOTTOM
      distance:       ${testResults.aspectRatioCheck.bottomRows[0]}             ${testResults.aspectRatioCheck.bottomRows[1]}             ${testResults.aspectRatioCheck.bottomRows[2]}             ${testResults.aspectRatioCheck.bottomCandidate}
       quality:       ${testResults.aspectRatioCheck.bottomQuality[0]}              ${testResults.aspectRatioCheck.bottomQuality[1]}              ${testResults.aspectRatioCheck.bottomQuality[2]}              ${testResults.aspectRatioCheck.bottomCandidateQuality}

      TOP
      distance:       ${testResults.aspectRatioCheck.topRows[0]}             ${testResults.aspectRatioCheck.topRows[1]}             ${testResults.aspectRatioCheck.topRows[2]}             ${testResults.aspectRatioCheck.topCandidate}
       quality:       ${testResults.aspectRatioCheck.topQuality[0]}              ${testResults.aspectRatioCheck.topQuality[1]}              ${testResults.aspectRatioCheck.topQuality[2]}              ${testResults.aspectRatioCheck.topCandidateQuality}

      Diff matrix:
                  R-L      C-R      C-L
        bottom:    ${testResults.aspectRatioCheck.bottomRowsDifferenceMatrix[0]}       ${testResults.aspectRatioCheck.bottomRowsDifferenceMatrix[1]}       ${testResults.aspectRatioCheck.bottomRowsDifferenceMatrix[2]}
           top:    ${testResults.aspectRatioCheck.topRowsDifferenceMatrix[0]}       ${testResults.aspectRatioCheck.topRowsDifferenceMatrix[1]}       ${testResults.aspectRatioCheck.topRowsDifferenceMatrix[2]}
      `}
    `;

    resultsDiv.innerHTML = out;
  }

  private setOverlayVisibility() {
    document.getElementById('uw-aard-debug-ui_body').style.display = this.uiVisibility.detectionDetails ? 'flex' : 'none';
    document.getElementById('uw-aard-debug_hide-detection-details').style.display = this.uiVisibility.detectionDetails ? '' : 'none';
    document.getElementById('uw-aard-debug_show-detection-details').style.display = this.uiVisibility.detectionDetails ? 'none' : '';
  }
}

