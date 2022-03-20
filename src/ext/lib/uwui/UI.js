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

    console.log('init init');

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

    // so we have a problem: we want iframe to be clickthrough everywhere except
    // on our actual overlay. There's no nice way of doing that, so we need some
    // extra javascript to deal with this

    iframe.onload = function() {

      function onMouseMove(event) {
        let coords;
        if (event.currentTarget === document) {
          coords = {
            x: event.pageX - iframe.offsetLeft,
            y: event.pageY - iframe.offsetTop
          }
        } else {
          coords = {
            x: event.clientX,
            y: event.clientY
          }
        }

        console.warn('coords:', coords, 'uiURI:', uiURI);

        // ask the iframe to check whether there's a clickable element
        iframe.contentWindow.postMessage(
          {
            cmd: 'uwui-probe',
            coords,
            ts: +new Date()   // this should be accurate enough for our purposes
          },
          uiURI
        );

        // iframe.style.pointerEvents = isClickable ? 'auto' : 'none';
      }

      document.addEventListener('mousemove', onMouseMove, true);
    }

    rootDiv.appendChild(iframe);
    console.log('ui created')

    // subscribe to events coming back to us
    window.addEventListener('message', (event) => this.handleMessage(event));

    // set uiIframe for handleMessage
    this.uiIframe = iframe;
  }

  /**
   * Handles events received from the iframe.
   * @param {*} event
   */
  handleMessage(event) {
    console.log('[main] received event:', event.origin, this.uiURI, this.extensionBase, event)
    if (event.origin === this.extensionBase) {
      console.log('this is the event we want', this.uiIframe );
      if (event.data.cmd === 'uwui-clickable') {
        if (event.data.ts < this.lastProbeResponseTs) {
          console.log('event too early')
          return;
        }
        this.lastProbeResponseTs = event.data.ts;
        console.log('---- event is clickable?', event.data.clickable)
        this.uiIframe.style.pointerEvents = event.data.clickable ? 'auto' : 'none';
      }
    }
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
