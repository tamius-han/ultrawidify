import { createApp } from 'vue';
import { createStore } from 'vuex';

if (process.env.CHANNEL !== 'stable'){
  console.info("Loading: UI");
}


class UI {
  constructor(
    interfaceId,
    storeConfig,
    uiConfig, // {component, parentElement?}
    commsConfig,
  ) {
    this.interfaceId = interfaceId;
    this.commsConfig = commsConfig;
    this.storeConfig = storeConfig;
    this.uiConfig = uiConfig;

    this.init();
  }

  async init() {
    // initialize vuejs, but only once (check handled in initVue())
    // we need to initialize this _after_ initializing comms.

    this.initVue();
  }

  async initVue() {
    if (this.storeConfig) {
      this.vuexStore = createStore(this.storeConfig);
    }

    this.initUi();
  }

  async initUi() {
    const random = Math.round(Math.random() * 69420);
    const uwid = `uw-${this.interfaceId}-root-${random}`

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

    const app = createApp(this.uiConfig.component);
    if (this.vuexStore) {
      app.use(this.vuexStore);
    }
    app.mount(`#${uwid}`);
  }

  /**
   * Replaces ui config and re-inits the UI
   * @param {*} newUiConfig 
   */
  replace(newUiConfig) {
    this.element?.remove();
    this.uiConfig = newUiConfig;
    this.initUi();
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
