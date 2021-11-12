import { createApp } from 'vue';
import { createStore } from 'vuex';
import mdiVue from 'mdi-vue/v3';
import * as mdijs from '@mdi/js';

if (process.env.CHANNEL !== 'stable'){
  console.info("Loading: UI");
}


class UI {
  constructor(
    interfaceId,
    storeConfig,
    uiConfig, // {component, parentElement?}
    commsConfig,
    ultrawidify, // or, at least, videoData instance + event bus
  ) {
    this.interfaceId = interfaceId;
    this.commsConfig = commsConfig;
    this.storeConfig = storeConfig;
    this.uiConfig = uiConfig;
    this.ultrawidify = ultrawidify;

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
    if (this.app) {
      this.app.unmount();
    }

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

    const app = createApp(this.uiConfig.component)
      .use(mdiVue, {icons: mdijs})
      .use({   // hand eventBus to the component
        install: (app, options) => {
          app.mixin({
            data() {
              return {
                ultrawidify: options.ultrawidify
              }
            }
          })
        }
      }, {ultrawidify: this.ultrawidify});

    if (this.vuexStore) {
      app.use(this.vuexStore);
    }

    this.app = app;
    app.mount(`#${uwid}`);
  }

  /**
   * Replaces ui config and re-inits the UI
   * @param {*} newUiConfig
   */
  replace(newUiConfig) {
    this.element?.remove();
    this.app.unmount();
    this.app = undefined;
    this.uiConfig = newUiConfig;
    this.initUi();
  }

  destroy() {
    // this.comms?.destroy();
    this.element?.remove();
    this.app.unmount();
    this.app = undefined;
  }
}

if (process.env.CHANNEL !== 'stable'){
  console.info("UI.js loaded");
}


export default UI;
