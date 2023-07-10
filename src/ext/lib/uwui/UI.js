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
    this.lastProbeResponseTs = null;
    this.uiURI = browser.runtime.getURL('/csui/csui.html');
    this.extensionBase = browser.runtime.getURL('').replace(/\/$/, "");

    this.eventBus = uiConfig.eventBus;
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
    rootDiv.style.width = "100%";
    rootDiv.style.height = "100%";
    rootDiv.style.position = "absolute";
    rootDiv.style.zIndex = "1000";
    rootDiv.style.border = 0;
    rootDiv.style.top = 0;
    rootDiv.style.pointerEvents = 'none';

    if (this.uiConfig?.parentElement) {
      this.uiConfig.parentElement.appendChild(rootDiv);
    } else {
      document.body.appendChild(rootDiv);
    }

    this.element = rootDiv;

    // in onMouseMove, we currently can't access this because we didn't
    // do things the most properly
    const uiURI = this.uiURI;

    const iframe = document.createElement('iframe');
    iframe.setAttribute('src', uiURI);
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.position = "absolute";
    iframe.style.zIndex = "1000";
    iframe.style.border = 0;
    iframe.style.pointerEvents = 'none';

    /* so we have a problem: we want iframe to be clickthrough everywhere except
     * on our actual overlay. There's no nice way of doing that, so we need some
     * extra javascript to deal with this.
     *
     * There's a second problem: while iframe is in clickable mode, onMouseMove
     * will not work (as all events will be hijacked by the iframe). This means
     * that iframe also needs to run its own instance of onMouseMove.
     */


    // set uiIframe for handleMessage
    this.uiIframe = iframe;

    const fn = (event) => {
      // remove self on fucky wuckies
      if (!iframe?.contentWindow ) {
        document.removeEventListener('mousemove', fn, true);
        return;
      }

      const coords = {
        x: event.pageX - this.uiIframe.offsetLeft,
        y: event.pageY - this.uiIframe.offsetTop
      };

      // ask the iframe to check whether there's a clickable element
      this.uiIframe.contentWindow.postMessage(
        {
          action: 'uwui-probe',
          coords,
          ts: +new Date()   // this should be accurate enough for our purposes
        },
        uiURI
      );
    }

    iframe.onload = function() {
      document.addEventListener('mousemove', fn, true);
    }

    rootDiv.appendChild(iframe);

    // subscribe to events coming back to us. Unsubscribe if iframe vanishes.
    const messageHandlerFn = (message) => {
      if (!iframe?.contentWindow) {
        window.removeEventListener('message', messageHandlerFn);
        return;
      }
      this.handleMessage(message);
    }
    window.addEventListener('message', messageHandlerFn);


    /* set up event bus tunnel from content script to UI — necessary if we want to receive
     * like current zoom levels & current aspect ratio & stuff. Some of these things are
     * necessary for UI display in the popup.
     */

    this.eventBus.subscribe(
      'uw-config-broadcast',
      {
        function: (config) => {
          // because existence of UI is not guaranteed — UI is not shown when extension is inactive.
          // If extension is inactive due to "player element isn't big enough to justify it", however,
          // we can still receive eventBus messages.
          if (this.element && this.uiIframe) {
            this.uiIframe.contentWindow.postMessage(
              {
                action: 'uw-bus-tunnel',
                payload: {action: 'uw-config-broadcast', config}
              },
              uiURI
            )
          }
        }
      }
    );
  }

  async enable() {
    // if root element is not present, we need to init the UI.
    if (!this.element) {
      await this.init();
    }
    // otherwise, we don't have to do anything
  }
  disable() {
    if (this.element) {
      this.destroy();
    }
  }

  /**
   * Handles events received from the iframe.
   * @param {*} event
   */
  handleMessage(event) {
    if (event.origin === this.extensionBase) {
      if (event.data.action === 'uwui-clickable') {
        if (event.data.ts < this.lastProbeResponseTs) {
          return;
        }
        this.lastProbeResponseTs = event.data.ts;
        this.uiIframe.style.pointerEvents = event.data.clickable ? 'auto' : 'none';
      } else if (event.data.action === 'uw-bus-tunnel') {
        const busCommand = event.data.payload;
        this.eventBus.send(busCommand.action, busCommand.config);
      }
    }
  }

  /**
   * Replaces ui config and re-inits the UI
   * @param {*} newUiConfig
   */
  replace(newUiConfig) {
    this.uiConfig = newUiConfig;

    if (this.element) {
      this.element?.remove();
      this.init();
    }
  }

  destroy() {
    // this.comms?.destroy();
    this.uiIframe?.remove();
    this.element?.remove();

    this.uiIframe = undefined;
    this.element = undefined;
  }
}

if (process.env.CHANNEL !== 'stable'){
  console.info("UI.js loaded");
}


export default UI;
