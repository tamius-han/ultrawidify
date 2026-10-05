import { AardTestResult_SubtitleRegion, AardTestResultFlags } from '@src/ext/module/aard/interfaces/aard-test-results.interface';
import { AardSubtitleScanOptions } from '@src/common/interfaces/SettingsInterface';
import template from './debug-results.component.html?raw';

export class AardDebugResults {

  private _element: HTMLElement = document.createElement('div');
  private set element(value: HTMLElement) {
    this._element = value;
  }
  public get element(): HTMLElement {
    return this._element;
  }

  private elements: any;

  constructor() {
    this.element = document.createElement('div');
    this.element.innerHTML = template;

    this.elements = {
      status: {
        noLetterbox: this.element.querySelector('#uw-aard-debug_aard-status_no-letterbox') as HTMLElement,
        doubleLetterbox: this.element.querySelector('#uw-aard-debug_aard-status_double-letterbox') as HTMLElement,
        arStable: this.element.querySelector('#uw-aard-debug_aard-status_ar-stable') as HTMLElement,
        arDeltaStable: this.element.querySelector('#uw-aard-debug_aard-status_ar-delta-stable') as HTMLElement,
        arUnstable: this.element.querySelector('#uw-aard-debug_aard-status_ar-unstable') as HTMLElement,
        cropInvalidated: this.element.querySelector('#uw-aard-debug_aard-status_crop-invalidated') as HTMLElement,
        cropMaintaining: this.element.querySelector('#uw-aard-debug_aard-status_crop-maintaining') as HTMLElement,
        subtitlesNone: this.element.querySelector('#uw-aard-debug_aard-status_subtitles_none') as HTMLElement,
        subtitlesUncertain: this.element.querySelector('#uw-aard-debug_aard-status_subtitles_uncertain') as HTMLElement,
        subtitlesConfirmed: this.element.querySelector('#uw-aard-debug_aard-status_subtitles_confirmed') as HTMLElement,
      },
      chartCanvas: this.element.querySelector('#uw-aard-debug_aard-status_chart canvas') as HTMLCanvasElement,
      subtitleVerification: {
        topTable: this.element.querySelector('#uw-aard-subtitle-verification-top-table') as HTMLElement,
        bottomTable: this.element.querySelector('#uw-aard-subtitle-verification-bottom-table') as HTMLElement,
        topStatus: this.element.querySelector('#uw-aard-subtitle-verification-top-status') as HTMLElement,
        bottomStatus: this.element.querySelector('#uw-aard-subtitle-verification-bottom-status') as HTMLElement,
      }
    };
  }

  private chartX = 0;
  private readonly CHART_RESET_COLUMNS = 5;

  private updateChart() {
    const canvas: HTMLCanvasElement = this.elements.chartCanvas;
    const column = this.elements.status.noLetterbox.parentElement as HTMLElement;
    const width = Math.floor(canvas.clientWidth);
    const height = Math.floor(column.getBoundingClientRect().height);
    if (!width || !height) {
      return; // not attached/visible yet
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
      this.chartX = 0;
    }

    const columnTop = column.getBoundingClientRect().top;
    ctx.fillStyle = '#000';
    ctx.fillRect(this.chartX, 0, 1, height);

    for (const key in this.elements.status) {
      const el = this.elements.status[key] as HTMLElement;
      if (!el.classList.contains('on')) {
        continue;
      }
      const rect = el.getBoundingClientRect();
      ctx.fillStyle = getComputedStyle(el).getPropertyValue('--on-color').trim() || '#fff';
      ctx.fillRect(this.chartX, rect.top - columnTop, 1, rect.height);
    }

    // Blank out the columns that will be drawn next.
    ctx.fillStyle = '#000';
    for (let i = 1; i <= this.CHART_RESET_COLUMNS; i++) {
      ctx.fillRect((this.chartX + i) % width, 0, 1, height);
    }

    this.chartX = (this.chartX + 1) % width;
  }

  updateStatus(flags: AardTestResultFlags) {
    this.elements.status.noLetterbox.classList.toggle('on', flags.noLetterbox);
    this.elements.status.noLetterbox.classList.toggle('off', !flags.noLetterbox);
    this.elements.status.doubleLetterbox.classList.toggle('on', flags.doubleLetterbox);
    this.elements.status.doubleLetterbox.classList.toggle('off', !flags.doubleLetterbox);
    this.elements.status.arStable.classList.toggle('on', flags.arStable);
    this.elements.status.arStable.classList.toggle('off', !flags.arStable);
    this.elements.status.arDeltaStable.classList.toggle('on', flags.arDeltaStable);
    this.elements.status.arDeltaStable.classList.toggle('off', !flags.arDeltaStable);
    this.elements.status.arUnstable.classList.toggle('on', flags.arUnstable);
    this.elements.status.arUnstable.classList.toggle('off', !flags.arUnstable);
    this.elements.status.cropInvalidated.classList.toggle('on', flags.cropInvalidated);
    this.elements.status.cropInvalidated.classList.toggle('off', !flags.cropInvalidated);
    this.elements.status.cropMaintaining.classList.toggle('on', flags.cropMaintaining);
    this.elements.status.cropMaintaining.classList.toggle('off', !flags.cropMaintaining);
    this.elements.status.subtitlesNone.classList.toggle('on', flags.noSubtitles);
    this.elements.status.subtitlesNone.classList.toggle('off', !flags.noSubtitles);
    this.elements.status.subtitlesUncertain.classList.toggle('on', flags.subtitlesUncertain);
    this.elements.status.subtitlesUncertain.classList.toggle('off', !flags.subtitlesUncertain);
    this.elements.status.subtitlesConfirmed.classList.toggle('on', flags.subtitlesConfirmed);
    this.elements.status.subtitlesConfirmed.classList.toggle('off', !flags.subtitlesConfirmed);

    this.updateChart();
  }

  buildSSRStabilityTable(
    ssr: {top: AardTestResult_SubtitleRegion, bottom: AardTestResult_SubtitleRegion},
    sss: AardSubtitleScanOptions['stability'],
  ) {
    let htmlTop = '', htmlBottom = '';
    let lineHtml: string, phaseChangeCount: number;
    let sstart: number, lstart: number, lend: number;

    for (let line = 0; line < sss.scanLines; line++) {
      htmlTop += `<div>Line ${line}</div>`;
      htmlBottom += `<div>Line ${line}</div>`;

      for (let slot = 0; slot < sss.confirmationScans; slot++) {

        sstart = slot * ssr.bottom.stability.slotSize;
        lstart = line * ssr.bottom.stability.lineSize + sstart;
        lend = lstart + ssr.bottom.stability.lineSize - 1;

        phaseChangeCount = ssr.top.stability.buffer[lend];
        lineHtml = ``;

        for (let i = 0; i < phaseChangeCount; i++) {
          lineHtml += `<div class="d">${ssr.top.stability.buffer[lstart + i]}</div>`
        }

        htmlTop += `
          <div class="row">
            <div class="slot">s::${slot}</div><div class="cap">${phaseChangeCount}</div>${lineHtml}
          </div>
        `;

        phaseChangeCount = ssr.bottom.stability.buffer[lend];
        lineHtml = ``;
        for (let i = 0; i < phaseChangeCount; i++) {
          lineHtml += `<div class="d">${ssr.bottom.stability.buffer[lstart + i]}</div>`
        }
        htmlBottom += `
          <div class="row">
            <div class="slot">s::${slot}</div><div class="cap">${phaseChangeCount}</div>${lineHtml}
          </div>
        `;
      }
    }
    this.elements.subtitleVerification.topTable.innerHTML = htmlTop;
    this.elements.subtitleVerification.bottomTable.innerHTML = htmlBottom;

    this.elements.subtitleVerification.topStatus.innerHTML = `<span>${ssr.top.hasSubtitle ? 'subs' : 'no subs'} &middot; ${ssr.top.subtitlesUnstable ? 'unstable' : 'stable'}</span>`
    this.elements.subtitleVerification.bottomStatus.innerHTML = `<span>${ssr.bottom.hasSubtitle ? 'subs' : 'no subs'} &middot; ${ssr.bottom.subtitlesUnstable ? 'unstable' : 'stable'}</span>`
  }

}
