import { createApp } from 'vue';
import { createStore } from 'vuex';

class UI {
  constructor(
    interfaceId,
    storeConfig,
    uiConfig, // {component, parentElement?}
    commsConfig,
  ) {
    this.interfaceId = interfaceId;
    this.commsConfig = commsConfig;
  }

  async init() {
    // If comms exist, we need to destroy it
    if (this.comms) {
      this.comms.destroy();
    }
    if (!this.settings) {
      this.settings = new Settings({
        onSettingsChanged: () => this.reloadSettings(),
        logger: this.logger
      });
      await this.settings.init();
    }

    this.comms = new CommsClient('content-ui-port', null, this.commsConfig.handlers);
  
    // initialize vuejs, but only once (check handled in initVue())
    // we need to initialize this _after_ initializing comms.
    this.initVue();
  }

  async initVue() {
    this.vuexStore = createStore(this.storeConfig);
  }

  async initUi() {
    const random = Math.round(Math.random() * 69420);
    const uwid = `uw-${this.interfaceId}-root-${random}`

    const rootDiv = document.createElement('div');
    rootDiv.setAttribute('style', `position: ${uiConfig.style?.position ?? 'relative'}; width: ${uiConfig.style?.width ?? '100%'}; height: ${uiConfig.style?.height ?? '100%'}; ${uiConfig.additionalStyle}`);
    rootDiv.setAttribute('id', uwid);

    if (this.uiConfig.parentElement) {
      this.uiConfig.parentElement.appendChild(rootDiv);
    } else {
      document.body.appendChild(rootDiv);
    }

    this.element = rootDiv;

    createApp(this.uiConfig.component)
      .use(this.vuexStore)
      .mount(`${uwid}`);
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
    this.comms?.destroy();
    this.element?.remove();
  }
}

export default UI;