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

    console.log('init init');

    this.init();
  }

  async init() {
    try {
    console.log('—————————————— init');
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
      const uiURI = browser.runtime.getURL('/csui/csui.html');

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
        console.log('[iframe-onload]: we are doing the onload!')
        const iframeDocument = iframe.contentDocument;

        // console.log('[iframe-onload] iframe:', iframe, 'document:', iframeDocument);

        function onMouseMove(event) {
          const iframeDocument = iframe.contentDocument;

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

          console.log('[iframe-mm] mouse coords:', coords.x, coords.y, 'ui URI:', uiURI)

          // ask the iframe to check whether there's a clickable element
          iframe.contentWindow.postMessage(
            {
              cmd: 'uwui-probe',
              coords,
              ts: +new Date()   // this should be accurate enough for our purposes
            },
            uiURI
          );

          // gentleman's agreement: elements with uw-clickable inside the iframe will
          // toggle pointerEvents on the iframe from 'none' to 'auto'
          // Children of uw-clickable events should also do that.

          let isClickable = false;
          let element = iframeDocument.elementFromPoint(coords.x, coords.y);

          while (element) {
            if (element?.classList.includes('uw-clickable')) {
              // we could set 'pointerEvents' here and now & simply use return, but that
              // might cause us a problem if we ever try to add more shit to this function
              isClickable = true;
              break;
            }
          }

          iframe.style.pointerEvents = isClickable ? 'auto' : 'none';
        }

        document.addEventListener('mousemove', onMouseMove, true);
        // iframeDocument.addEventListener('mousemove', onMouseMove, true);
      }

      rootDiv.appendChild(iframe);
      console.log('ui created')
    } catch(e) {
      console.error('there was an oopsie while creating ui:', e)
    }

    console.log('——————————————————————————————————————— UI IS BEING CREATED ', rootDiv);
  } catch (e) {
    console.error('something went VERY wrong while creating ui:', e)
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
