import { MenuPosition, MenuConfig, MenuItemConfig } from '@src/common/interfaces/ClientUiMenu.interface';
import extensionCss from '@src/main.css?inline';

export class ClientMenu {

  private host!: HTMLDivElement;
  private shadow!: ShadowRoot;
  private root!: HTMLDivElement;
  private visible = false;

  private menuPositionClasses: string[] = [];

  constructor(private config: MenuConfig) {}

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

  private injectStyles() {
    const style = document.createElement("style");
    console.warn('imported styles: imported CSS (raw):', typeof extensionCss, extensionCss);
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
        font-family: "Heebo";
        src: url(__FONT_HEEBO__) format("truetype-variations");
        font-weight: 100 900;
        font-stretch: 75% 125%;
        font-style: normal;
        font-display: swap;
      }

      @font-face {
        font-family: "Source Code Pro";
        src: url(__FONT_SCP__) format("truetype-variations");
        font-weight: 200 900;
        font-style: normal;
        font-display: swap;
      }

      @font-face {
        font-family: "Source Code Pro";
        src: url(__FONT_SCPI__) format("truetype-variations");
        font-weight: 200 900;
        font-style: italic;
        font-display: swap;
      }
      ${cssRemainder};
    `;

    console.log('+————————————————————————————————————', cssRemainder)

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
    this.host = document.createElement("div");
    this.host.classList.add('uw-ultrawidify-container-root');

    Object.assign(this.host.style, {
      position: this.config.isGlobal ? "fixed" : "absolute",
      left: 0,
      top: 0,
      border: 0,
      width: "100%",
      height: "100%",
      zIndex: this.config.isGlobal ? "2147483647" : "2147483640",
      // pointerEvents: "none",
    });

    console.log('UI host created:', this.host);
  }

  private createShadow() {
    this.shadow = this.host.attachShadow({ mode: "open" });
    this.injectStyles();
  }

  /**
   *
   * @returns
   */
  private buildMenuPositionClassList() {
    let classList;
    switch (this.config.menuPosition) {
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
    this.root = document.createElement("div");
    this.root.className = "uw-menu-root font-mono";

    const trigger = document.createElement("div");
    trigger.classList = "uw-menu-trigger uw-trigger";
    trigger.textContent = "Ultrawidify";

    const submenu = this.buildSubmenu(this.config.items);

    trigger.addEventListener("mouseenter", () => this.show());
    this.root.addEventListener("mouseleave", () => this.hide());

    console.log('menu position classes:', this.menuPositionClasses)
    this.root.classList.add(...this.menuPositionClasses);

    trigger.appendChild(submenu);
    this.root.append(trigger);
    this.shadow.appendChild(this.root);
  }

  private buildSubmenu(items: MenuItemConfig[]): HTMLDivElement {
    const menu = document.createElement("div");
    menu.classList = "uw-submenu";
    menu.classList.add(...this.menuPositionClasses);

    for (const item of items) {
      const el = document.createElement("div");
      el.className = `uw-menu-item uw-trigger`;

      if (item.customHTML) {
        el.appendChild(item.customHTML);
      } else {
        el.textContent = item.label;
      }

      if (item.action) {
        el.addEventListener("click", e => {
          e.stopPropagation();
          item.action?.();
          this.hide();
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

    // switch (this.config.anchor) {
    //   case "LeftCenter":
    //     r.left = "0";
    //     r.top = "50%";
    //     r.transform = "translateY(-50%)";
    //     break;

    //   case "TopLeft":
    //     r.left = "0";
    //     r.top = "0";
    //     break;

    //   // others are trivial extensions
    // }
  }

  private bindGlobalMouse(anchorEl: HTMLElement) {
    const rect = anchorEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    document.addEventListener("mousemove", e => {
      const d = Math.hypot(e.clientX - cx, e.clientY - cy);
      if (d < this.config.activationRadius) {
        this.show();
      } else if (!this.root.matches(":hover")) {
        this.hide();
      }
    });
  }

  private show() {
    if (!this.visible) {
      this.visible = true;
      this.root.classList.add("uw-visible");
      this.root.classList.remove("uw-hidden");
    }
  }

  private hide() {
    if (this.visible) {
      this.visible = false;
      this.root.classList.remove("uw-visible");
    }
  }
}
