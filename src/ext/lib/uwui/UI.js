if (process.env.CHANNEL !== 'stable'){
  console.info("Loading: UI");
}

class UI {
  constructor(
    interfaceId,
    uiConfig, // {component, parentElement?}
  ) {
    this.interfaceId = interfaceId;
    this.uiConfig = uiConfig;

    this.init();
  }

  async init() {
    const random = Math.round(Math.random() * 69420);
    const uwid = `uw-ultrawidify-${this.interfaceId}-root-${random}`

    const rootDiv = document.createElement('div');

    if (this.uiConfig.additionalStyle) {
      rootDiv.setAttribute('style', this.uiConfig.additionalStyle);
    }
    rootDiv.setAttribute('id', uwid);
    rootDiv.classList.add('uw-ultrawidify-container-root');

    if (this.uiConfig?.parentElement) {
      this.uiConfig.parentElement.appendChild(rootDiv);
    } else {
      document.body.appendChild(rootDiv);
    }

    this.element = rootDiv;

    try {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('src', browser.runtime.getURL('/csui/csui.html'));
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.position = "absolute";
      iframe.style.zIndex = "1000";

      rootDiv.appendChild(iframe);
    } catch(e) {

    }

    console.log('——————————————————————————————————————— UI IS BEING CREATED ', rootDiv);
  }

  /**
   * Replaces ui config and re-inits the UI
   * @param {*} newUiConfig
   */
  replace(newUiConfig) {
    this.element?.remove();
    this.uiConfig = newUiConfig;
    this.init();
  }

  destroy() {
    // this.comms?.destroy();
    this.element?.remove();
  }
}

if (process.env.CHANNEL !== 'stable'){
  console.info("UI.js loaded");
}


export default UI;
