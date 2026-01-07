import extensionCss from '@src/main.css?inline';


type WindowContent = string | HTMLElement;
type WindowBackgroundMode = 'transparent' | 'blur' | 'solid';

interface WindowOptions {
  title?: string;
  content: WindowContent;
  background?: WindowBackgroundMode;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  extraStyles?: string[];
  onFocus?: () => void;
  onClose?: () => void;
}

export class UwuiWindow {
  private static baseZ = 1000000;
  private static instances: UwuiWindow[] = [];

  private host: HTMLDivElement;
  private shadow: ShadowRoot;
  private windowEl: HTMLDivElement;
  private titleBar: HTMLDivElement;

  private dragging = false;
  private resizing = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  private background: WindowBackgroundMode = 'blur';
  private extraStyles?: string[];

  private onFocus?: () => void;
  private onClose?: () => void;


  constructor(options: WindowOptions) {
    this.onFocus = options.onFocus;
    this.onClose = options.onClose;

    this.host = document.createElement('div');
    this.host.style.position = 'fixed';
    this.host.style.inset = '0';
    this.host.style.pointerEvents = 'none';

    this.background = options.background ?? 'blur';
    this.extraStyles = options.extraStyles;

    document.body.appendChild(this.host);

    this.shadow = this.host.attachShadow({ mode: 'closed' });
    this.shadow.innerHTML = this.template(options);


    this.windowEl = this.shadow.querySelector('.uw-window')!;
    this.titleBar = this.shadow.querySelector('.uw-titlebar')!;

    this.setGeometry(
      options.x ?? 100,
      options.y ?? 100,
      options.width ?? 320,
      options.height ?? 220
    );

    this.injectContent(options.content);
    this.bindEvents();

    UwuiWindow.instances.unshift(this);
    UwuiWindow.recomputeZIndices();

    this.applyBackground();

    this.bindBackgroundMenu();
  }


  /**
   * Sets window stacking order
   * @param order stacking order (0 = topmost)
   */
  setOrder(order: number) {
    const list = UwuiWindow.instances;

    // Remove this window from current position
    const currentIndex = list.indexOf(this);
    if (currentIndex !== -1) {
      list.splice(currentIndex, 1);
    }

    // Clamp target index
    const clamped = Math.max(0, Math.min(order, list.length));

    // Insert at new position
    list.splice(clamped, 0, this);

    // Re-assign z-indexes
    UwuiWindow.recomputeZIndices();
  }

  destroy() {
    this.onClose?.();

    const list = UwuiWindow.instances;
    const index = list.indexOf(this);
    if (index !== -1) {
      list.splice(index, 1);
      UwuiWindow.recomputeZIndices();
    }

    this.host.remove();
  }


  private static recomputeZIndices() {
    const base = UwuiWindow.baseZ;

    UwuiWindow.instances.forEach((win, index) => {
      // index 0 = topmost → highest z-index
      win.host.style.zIndex = String(base + (UwuiWindow.instances.length - index));
    });
  }

  private bringToFront = () => {
    this.setOrder(0);
    this.onFocus?.();
  };

  //#region setup
  private template(options: WindowOptions): string {

    return `
      <style>
        ${this.generateStyles()}

        ${this.extraStyles?.join('\n')}
      </style>

      <div class="uw-window">
        <div class="uw-titlebar">
          <span class="uw-title">${options.title ?? ''}</span>

          <div class="uw-actions">
            <div class="uw-bg-toggle">
              <!-- YOUR SVG ICON GOES HERE -->
              <button type="button" class="uw-bg-button">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>layers-outline</title><path d="M12,18.54L19.37,12.8L21,14.07L12,21.07L3,14.07L4.62,12.81L12,18.54M12,16L3,9L12,2L21,9L12,16M12,4.53L6.26,9L12,13.47L17.74,9L12,4.53Z" /></svg>
              </button>

              <div class="uw-bg-menu">
                <button data-bg="transparent">Transparent</button>
                <button data-bg="blur">Blur</button>
                <button data-bg="solid">Solid</button>
              </div>
            </div>

            <button type="button" class="uw-close">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>close</title><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg>
            </button>
          </div>
        </div>

        <div class="uw-content"></div>
        <div class="uw-resize-handle"></div>
      </div>
    `;
  }

  private generateStyles() {
    let css =  extensionCss
      .trim()
      .replace(/'html, body \{/g, ':host {')
      .replace(/'body \{/g, ':host {')
    ;

    // this is bad but I can't be bothered to do it the proper way
    const cssArr: string[] = css.split('@font-face');
    const cssRemainder = cssArr[cssArr.length - 1].split('}').slice(1).join('}');

    css = `
      ${cssArr[0]}
      @font-face {
        font-family: 'Heebo';
        src: url(__FONT_HEEBO__) format('truetype-variations');
        font-weight: 100 900;
        font-stretch: 75% 125%;
        font-style: normal;
        font-display: swap;
      }

      @font-face {
        font-family: 'Source Code Pro';
        src: url(__FONT_SCP__) format('truetype-variations');
        font-weight: 200 900;
        font-style: normal;
        font-display: swap;
      }

      @font-face {
        font-family: 'Source Code Pro';
        src: url(__FONT_SCPI__) format('truetype-variations');
        font-weight: 200 900;
        font-style: italic;
        font-display: swap;
      }
      ${cssRemainder};
    `;

    return css
      .replace('__FONT_HEEBO__', chrome.runtime.getURL('/ui/res/fonts/Heebo.ttf'))
      .replace('__FONT_SCP__', chrome.runtime.getURL('/ui/res/fonts/SourceCodePro.ttf'))
      .replace('__FONT_SCPI__', chrome.runtime.getURL('/ui/res/fonts/SourceCodePro-Italic.ttf'))
      .replaceAll('html,', '')
    ;
  }

  private injectContent(content: WindowContent) {
    const container = this.shadow.querySelector('.uw-content')!;
    if (typeof content === 'string') {
      container.innerHTML = content;
    } else {
      container.appendChild(content);
    }
  }
  //#endregion

  //#region interactivity
  private bindEvents() {
    this.windowEl.addEventListener('mousedown', this.bringToFront);

    this.titleBar.addEventListener('mousedown', this.startDrag);

    this.shadow.querySelector('.uw-close')!
      .addEventListener('click', () => this.destroy());

    this.shadow.querySelector('.uw-resize-handle')!
      .addEventListener('mousedown', this.startResize);

    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.stopActions);
  }

  private startDrag = (e: MouseEvent) => {
    const rect = this.windowEl.getBoundingClientRect();
    this.dragging = true;
    this.dragOffsetX = e.clientX - rect.left;
    this.dragOffsetY = e.clientY - rect.top;
    e.preventDefault();
  };

  private startResize = (e: MouseEvent) => {
    this.resizing = true;
    e.preventDefault();
  };

  private onMouseMove = (e: MouseEvent) => {
    const rect = this.windowEl.getBoundingClientRect();

    if (this.dragging) {
      const x = Math.min(
        window.innerWidth - rect.width,
        Math.max(0, e.clientX - this.dragOffsetX)
      );
      const y = Math.min(
        window.innerHeight - rect.height,
        Math.max(0, e.clientY - this.dragOffsetY)
      );

      this.windowEl.style.left = `${x}px`;
      this.windowEl.style.top = `${y}px`;
    }

    if (this.resizing) {
      const width = Math.max(160, e.clientX - rect.left);
      const height = Math.max(120, e.clientY - rect.top);

      this.windowEl.style.width = `${width}px`;
      this.windowEl.style.height = `${height}px`;
    }
  };

  private stopActions = () => {
    this.dragging = false;
    this.resizing = false;
  };

  private setGeometry(x: number, y: number, w: number, h: number) {
    Object.assign(this.windowEl.style, {
      left: `${x}px`,
      top: `${y}px`,
      width: `${w}px`,
      height: `${h}px`,
    });
  }
  //#endregion interactivity

  //#region bakcground handling
  setBackground(mode: WindowBackgroundMode) {
    this.background = mode;
    this.applyBackground();
  }

  private applyBackground() {
    this.windowEl.classList.remove(
      'uw-window-bg-transparent',
      'uw-window-bg-blurred',
      'uw-window-bg-solid'
    );

    switch (this.background) {
      case 'transparent':
        this.windowEl.classList.add('uw-window-bg-transparent');
        break;
      case 'blur':
        this.windowEl.classList.add('uw-window-bg-blurred');
        break;
      case 'solid':
        this.windowEl.classList.add('uw-window-bg-solid');
        break;
    }
  }

  private bindBackgroundMenu() {
    this.shadow.querySelectorAll('[data-bg]')
      .forEach(el => {
        el.addEventListener('click', () => {
          const mode = el.getAttribute('data-bg') as WindowBackgroundMode;
          this.setBackground(mode);
        });
      });
  }
  //#endregion
}
