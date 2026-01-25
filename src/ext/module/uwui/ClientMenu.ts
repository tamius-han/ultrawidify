import { MenuPosition, MenuConfig, MenuItemConfig } from '@src/common/interfaces/ClientUiMenu.interface';
import extensionCss from '@src/main.css?inline';

export class ClientMenu {

  private host!: HTMLDivElement;
  private shadow!: ShadowRoot;
  private _root!: HTMLDivElement;
  private set root(value: HTMLDivElement) {
    this._root = value;
  }
  public get root(): HTMLDivElement {
    return this._root;
  }
  private trigger: HTMLDivElement;
  private visible = false;

  private hiddenClass = 'uw-hidden';

  private menuPositionClasses: string[] = [];


  private isHovered = false;
  private forceShow = false;
  private isWithinActivation = false;
  private lastMouseMove = performance.now();
  private idleTimer?: number;



  private onDocumentMouseMove?: (e: MouseEvent) => void;
  private onDocumentMouseLeave?: () => void;
  private idleIntervalId?: number;

  constructor(private config: MenuConfig) {
    if (config.options?.forceShow !== undefined) {
      this.forceShow = config.options.forceShow;
    }
  }

  mount(anchorElement: HTMLElement) {
    this.buildMenuPositionClassList();
    this.createHost();
    this.createShadow();
    this.createMenu();
    this.position(anchorElement);
    this.bindGlobalMouse(anchorElement);

    // document.documentElement.appendChild(this.host);
    anchorElement.appendChild(this.host);
  }

  public destroy() {
    // 1. Stop timers
    if (this.idleIntervalId != null) {
      clearInterval(this.idleIntervalId);
      this.idleIntervalId = undefined;
    }

    // 2. Remove global listeners
    if (this.onDocumentMouseMove) {
      document.removeEventListener('mousemove', this.onDocumentMouseMove);
      this.onDocumentMouseMove = undefined;
    }

    if (this.onDocumentMouseLeave) {
      document.removeEventListener('mouseleave', this.onDocumentMouseLeave);
      this.onDocumentMouseLeave = undefined;
    }

    // 3. Remove DOM
    if (this.host && this.host.parentNode) {
      this.host.parentNode.removeChild(this.host);
    }

    // 4. Clear references
    this.shadow = undefined as any;
    this.root = undefined as any;
    this.host = undefined as any;

    // 5. Reset state
    this.visible = false;
    this.isHovered = false;
    this.isWithinActivation = false;
  }

  private getActivationRadius(anchorEl: HTMLElement): number | null {
    if (this.config.ui.activation !== 'distance') {
      return undefined;
    }

    if (this.config.ui.activationDistanceUnits === 'px') {
      return +this.config.ui.activationDistance;
    }

    // percentage string
    const rect = anchorEl.getBoundingClientRect();
    const percent = +this.config.ui.activationDistance;

    return Math.max(rect.width, rect.height) * (percent / 100);
  }

  private injectStyles() {
    const style = document.createElement('style');
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

    css = css
      .replace('__FONT_HEEBO__', chrome.runtime.getURL('/ui/res/fonts/Heebo.ttf'))
      .replace('__FONT_SCP__', chrome.runtime.getURL('/ui/res/fonts/SourceCodePro.ttf'))
      .replace('__FONT_SCPI__', chrome.runtime.getURL('/ui/res/fonts/SourceCodePro-Italic.ttf'))
      .replaceAll('html,', '')
    ;

    style.textContent = css;
    this.shadow.appendChild(style);
  }

  private createHost() {
    this.host = document.createElement('div');
    this.host.classList.add('uw-ultrawidify-container-root');

    Object.assign(this.host.style, {
      position: this.config.isGlobal ? 'fixed' : 'absolute',
      left: 0,
      top: 0,
      border: 0,
      width: '100%',
      height: '100%',
      zIndex: this.config.isGlobal ? '2147483647' : '2147483640',
      pointerEvents: 'none',
      background: 'transparent',
    });
  }

  private createShadow() {
    this.shadow = this.host.attachShadow({ mode: 'open' });
    this.injectStyles();
  }

  /**
   *
   * @returns
   */
  private buildMenuPositionClassList() {
    let classList;
    console.log('BUILDING MENU POS:', MenuPosition[this.config.ui.activatorAlignment]);
    switch (this.config.ui.activatorAlignment) {
      case MenuPosition.TopLeft:
        classList = ['uw-menu-left','uw-menu-top'];
        break;
      case MenuPosition.Left:
        classList = ['uw-menu-left','uw-menu-ycenter'];
        break;
      case MenuPosition.BottomLeft:
        classList = ['uw-menu-left','uw-menu-bottom'];
        break;
      case MenuPosition.Top:
        classList = ['uw-menu-center','uw-menu-top'];
        break;
      case MenuPosition.Bottom:
        classList = ['uw-menu-center', 'uw-menu-bottom'];
        break;
      case MenuPosition.TopRight:
        classList = ['uw-menu-right', 'uw-menu-top'];
        break;
      case MenuPosition.Right:
        classList = ['uw-menu-right', 'uw-menu-ycenter'];
        break;
      case MenuPosition.BottomRight:
        classList = ['uw-menu-right', 'uw-menu-bottom'];
        break;
      default: // left-center is our default position
        classList = ['uw-menu-left', 'uw-menu-ycenter'];
        break;
    }

    this.menuPositionClasses = classList;
  }

  private createMenu() {
    this.root = document.createElement('div');
    this.root.className = 'uw-menu-root uw-hidden';
    this.root.setAttribute(
      'style',
      `padding: ${this.config.ui.activatorPadding.y ?? 16}${this.config.ui.activatorPaddingUnit.y ?? 'px'} ${this.config.ui.activatorPadding.x ?? 16}${this.config.ui.activatorPaddingUnit.x ?? 'px'}`
    );


    const trigger = document.createElement('div');
    trigger.classList = 'uw-menu-trigger uw-trigger';
    trigger.textContent = 'Ultrawidify';
    this.trigger = trigger;

    const submenu = this.buildSubmenu(this.config.items);

    trigger.addEventListener('mouseenter', () => this.show());
    this.root.addEventListener('mouseleave', () => {
      this.isHovered = false;
      this.hide();
    });

    this.root.classList.add(...this.menuPositionClasses);

    trigger.appendChild(submenu);
    this.root.append(trigger);
    this.shadow.appendChild(this.root);

    this.root.addEventListener('mouseenter', () => {
      this.isHovered = true;
      this.show();
    });

    this.root.addEventListener('mouseleave', () => {
      this.isHovered = false;
      this.updateVisibility();
    });
  }

  private buildSubmenu(items: MenuItemConfig[]): HTMLDivElement {
    const menu = document.createElement('div');
    menu.classList = 'uw-submenu';
    menu.classList.add(...this.menuPositionClasses);

    for (const item of items) {
      const el = document.createElement('div');
      if (item.customId) {
        el.id = item.customId;
      }
      el.className = `uw-menu-item uw-trigger ${item.customClassList ?? ''}`;

      if (item.customHTML) {
        if (item.customHTML instanceof HTMLElement) {
          el.appendChild(item.customHTML);
        } else {
          el.innerHTML = item.customHTML;
        }
      } else {
        el.textContent = item.label;
      }

      if (item.action) {
        el.addEventListener('click', e => {
          e.stopPropagation();
          item.action?.();
          // this.hide(); //  maybe dont
        });
      }

      if (item.subitems) {
        el.appendChild(this.buildSubmenu(item.subitems));
      }

      menu.appendChild(el);
    }

    return menu;
  }

  private position(anchorEl: HTMLElement) {
    let appendClassList: string[] = [];
    anchorEl.classList.add(...appendClassList);
  }

  private bindGlobalMouse(anchorEl: HTMLElement) {
    const playerRect = anchorEl.getBoundingClientRect();

    let menuActivatorRect, cx, cy;

    const activationRadius = this.getActivationRadius(anchorEl);

    const recalculateActivator = () => {
      menuActivatorRect = this.trigger.getBoundingClientRect();
      cx = menuActivatorRect.left + menuActivatorRect.width / 2;
      cy = menuActivatorRect.top + menuActivatorRect.height / 2;
    }

    recalculateActivator();

    this.onDocumentMouseMove = (e: MouseEvent) => {
      this.lastMouseMove = performance.now();

      if (activationRadius) {
        if (! menuActivatorRect.width) {
          recalculateActivator();
        }
        const d = Math.hypot(e.clientX - cx, e.clientY - cy);

        console.log('activator radius:', activationRadius, 'mouse distance:', d);
        this.isWithinActivation = d <= activationRadius;

      } else {
        this.isWithinActivation =
          e.clientX >= playerRect.left &&
          e.clientX <= playerRect.right &&
          e.clientY >= playerRect.top &&
          e.clientY <= playerRect.bottom &&
          (this.config.ui.activation !== 'player-ctrl' || e.ctrlKey);
      }

      this.updateVisibility();
    };

    this.onDocumentMouseLeave = () => {
      this.isHovered = false;
      this.isWithinActivation = false;
      this.hide();
    };

    document.addEventListener('mousemove', this.onDocumentMouseMove);
    document.addEventListener('mouseleave', this.onDocumentMouseLeave);

    this.startIdleWatcher();
  }

  private startIdleWatcher() {
    this.idleIntervalId = window.setInterval(() => {
      const idle = performance.now() - this.lastMouseMove > 1000;
      if (idle && !this.isHovered) {
        this.hide();
      }
    }, 200);
  }


  private updateVisibility() {
    const idle = performance.now() - this.lastMouseMove > 1000;

    if (this.isHovered) {
      this.show();
      return;
    }

    if (this.isWithinActivation && !idle) {
      this.show();
      return;
    }

    if (this.visible) {
      this.hide();
    }
  }

  show(options?: {forceShow?: boolean}) {
    this.lastMouseMove = performance.now();

    if (!this.visible) {
      this.visible = true;
      this.root.classList.add('uw-visible');
      this.root.classList.remove('uw-hidden');
    }

    if (options?.forceShow !== undefined) {
      if (!this.forceShow && options.forceShow) {
        this.root.classList.add('uw-force-visible');
      }
      if (this.forceShow && !options.forceShow) {
        this.root.classList.remove('uw-force-visible');
      }
      this.forceShow = options.forceShow;

    }
  }

  hide(options?: {forceShow?: boolean}) {
    if (options?.forceShow !== undefined) {
      if (this.forceShow !== options.forceShow) {
        this.root.classList.remove('uw-force-visible');
        this.forceShow = options.forceShow;
      }
    }

    if (this.visible) {
      this.visible = false;
      this.root.classList.remove('uw-visible');
      this.root.classList.add('uw-hidden');
    }
  }
}
