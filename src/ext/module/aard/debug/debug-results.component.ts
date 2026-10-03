import { AardTestResultFlags } from '@src/ext/module/aard/interfaces/aard-test-results.interface';
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
        subtitlesUncertain: this.element.querySelector('#uw-aard-debug_aard-status_subtitles_uncertain') as HTMLElement,
        subtitlesConfirmed: this.element.querySelector('#uw-aard-debug_aard-status_subtitles_confirmed') as HTMLElement,
      }
    };
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
    this.elements.status.subtitlesUncertain.classList.toggle('on', flags.subtitlesUncertain);
    this.elements.status.subtitlesUncertain.classList.toggle('off', !flags.subtitlesUncertain);
    this.elements.status.subtitlesConfirmed.classList.toggle('on', flags.subtitlesConfirmed);
    this.elements.status.subtitlesConfirmed.classList.toggle('off', !flags.subtitlesConfirmed);
  }

}
