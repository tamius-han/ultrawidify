export class AardDebugUi {

  aard: any;

  uiAnchorElement: HTMLDivElement;
  pauseOnArCheck: boolean = false;

  constructor(aard: any) {
    this.aard = aard;

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
          <div style="padding: 1rem; color: #fff"><h1>Aaard debug overlay</h1></div>
          <div style="pointer-events: all">
            <button id="uw-aard-debug-ui_close-overlay">Close overlay</button>
          </div>
        </div>
        <div style="display: flex; flex-direction: row; width: 100%">
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
              <button id="uw-aard-debug-ui_enable-step"            >Run aspect ratio detection</button>
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
    document.getElementById('uw-aard-debug-ui_close-overlay').onclick = () => (this.aard as any).hideDebugCanvas();
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

  updateTestResults(testResults) {
    if (testResults.aspectRatioUpdated && this.pauseOnArCheck) {
      (this.aard as any).video.pause();
      this.aard.stop();
    }

    const resultsDiv = document.getElementById('uw-aard-results');

    let out = `
      LAST STAGE: ${testResults.lastStage}         | black level: ${testResults.blackLevel}, threshold: ${testResults.blackThreshold}

      -- ASPECT RATIO
      Active: ${testResults.activeAspectRatio.toFixed(3)}, changed since last check? ${testResults.aspectRatioUpdated}               letterbox width: ${testResults.letterboxWidth} offset ${testResults.letterboxOffset}

      image in black level probe (aka "not letterbox"): ${testResults.notLetterbox}

    `;
    if (testResults.notLetterbox) {
      resultsDiv.textContent = out;
      return;
    }
    out = `${out}

      -- UNCERTAIN FLAGS
      AR: ${testResults.aspectRatioUncertain} (reason: ${testResults.aspectRatioUncertainReason ?? 'n/a'}); top row: ${testResults.topRowUncertain}; bottom row: ${testResults.bottomRowUncertain}

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

    resultsDiv.textContent = out;
  }

}

