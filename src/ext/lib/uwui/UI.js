import ExtensionMode from '@src/common/enums/ExtensionMode.enum';

if (process.env.CHANNEL !== 'stable'){
  console.info("Loading: UI");
}

const csuiVersions = {
  'normal': 'csui',         // csui-overlay-normal.html, maps to csui.html
  'light': 'csui-light',    // csui-overlay-light.html,  maps to csui-light.html
  'dark': 'csui-dark'       // csui-overlay-dark.html,   maps to csui-dark.html
};

const MAX_IFRAME_ERROR_COUNT = 5;

class UI {
  constructor(
    interfaceId,
    uiConfig, // {parentElement?, eventBus?, isGlobal?, playerData}
  ) {
    this.interfaceId = interfaceId;
    this.uiConfig = uiConfig;
    this.lastProbeResponseTs = null;

    this.isGlobal = uiConfig.isGlobal ?? false;
    this.isIframe = window.self !== window.top;

    this.eventBus = uiConfig.eventBus;
    this.disablePointerEvents = false;

    this.saveState = undefined;
    this.playerData = uiConfig.playerData;
    this.uiSettings = uiConfig.uiSettings;
    this.siteSettings = uiConfig.siteSettings;

    this.iframeErrorCount = 0;
    this.iframeConfirmed = false;
    this.iframeRejected = false;

    this.delayedDestroyTimer = null;

    // TODO: at some point, UI should be different for global popup and in-player UI
    this.csuiScheme = this.getCsuiScheme();
    const csuiVersion = this.getCsuiVersion(this.csuiScheme.contentScheme);
    this.uiURI = chrome.runtime.getURL(`/csui/${csuiVersion}.html`);
    this.extensionBase = chrome.runtime.getURL('').replace(/\/$/, "");

    // UI will be initialized when setUiVisibility is called
    this.init();
  }

  canRun() {
    if (this.isGlobal) {
      return true;
    }

    return this.siteSettings?.data.enableUI.fullscreen === ExtensionMode.Enabled
      || this.siteSettings?.data.enableUI.theater === ExtensionMode.Enabled
      || this.siteSettings?.data.enableUI.normal === ExtensionMode.Enabled;
  }

  async init() {
    if (!this.canRun()) {
      // console.log('ui config: canRun returned false', this.siteSettings?.data.enableUI.fullscreen === ExtensionMode.Enabled, this.siteSettings?.data.enableUI.theater === ExtensionMode.Enabled, this.siteSettings?.data.enableUI.normal === ExtensionMode.Enabled)
      return;
    }
    // console.log('ui config: canRun returned truie', this.siteSettings?.data.enableUI.fullscreen === ExtensionMode.Enabled, this.siteSettings?.data.enableUI.theater === ExtensionMode.Enabled, this.siteSettings?.data.enableUI.normal === ExtensionMode.Enabled)


    this.initUIContainer();
    this.loadIframe();
    this.initMessaging();
  }

  /**
   * Returns color scheme we need to use.
   *
   * contentScheme is used to select the correct HTML template.
   * iframeScheme gets applied to the iframe as style
   * @returns {contentScheme: string, iframeScheme: string}
   */
  getCsuiScheme() {
    return {
      contentScheme: window.getComputedStyle( document.body ,null).getPropertyValue('color-scheme'),
      iframeScheme: document.documentElement.style.colorScheme || document.body.style.colorScheme || undefined
    };
  }

  /**
   * Returns correct template for given preferredScheme parameter
   * @param {*} preferredScheme
   * @returns
   */
  getCsuiVersion(preferredScheme) {
    return csuiVersions[preferredScheme] ?? csuiVersions.normal;
  }

  initUIContainer() {
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
    rootDiv.style.position = this.isGlobal ? "fixed" : "absolute";
    rootDiv.style.zIndex = this.isGlobal ? '90009' : '90000';
    rootDiv.style.border = 0;
    rootDiv.style.top = 0;
    rootDiv.style.pointerEvents = 'none';

    if (this.uiConfig?.parentElement) {
      this.uiConfig.parentElement.appendChild(rootDiv);
    } else {
      document.body.appendChild(rootDiv);
    }

    this.rootDiv = rootDiv;
  }

  loadIframe() {
    // in onMouseMove, we currently can't access this because we didn't
    // do things the most properly
    const uiURI = this.uiURI;

    const iframe = document.createElement('iframe');
    iframe.setAttribute('src', uiURI);
    iframe.setAttribute("allowTransparency", 'true');
    // iframe.style.width = "100%";
    // iframe.style.height = "100%";
    iframe.style.position = "absolute";
    iframe.style.zIndex =  this.isGlobal ? '90009' : '90000';
    iframe.style.border = 0;
    iframe.style.pointerEvents = 'none';
    iframe.style.opacity = 0;
    iframe.style.backgroundColor = 'transparent !important';

    // If colorScheme is defined via CSS on the HTML or BODY elements, then we need to also
    // put a matching style to the iframe itself. Using the correct UI template is not enough.
    if (this.csuiScheme.iframeScheme) {
      iframe.style.colorScheme = this.csuiScheme.iframeScheme;
    }

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

    // set not visible by default
    // this.setUiVisibility(false);

    const fn = (event) => {
      // remove self on fucky wuckies
      if (!iframe?.contentWindow ) {
        document.removeEventListener('mousemove', fn, true);
        return;
      }

      const rect = this.uiIframe.getBoundingClientRect();

      const offsets = {
        top: window.scrollY + rect.top,
        left: window.scrollX + rect.left
      };

      const coords = {
        x: event.pageX - offsets.left,
        y: event.pageY - offsets.top,
        frameOffset: offsets,
      };

      const playerData = this.canShowUI(coords);

      // ask the iframe to check whether there's a clickable element
      this.uiIframe.contentWindow.postMessage(
        {
          action: 'uwui-probe',
          coords,
          playerDimensions: playerData.playerDimensions,
          canShowUI: playerData.canShowUI,
          isIframe: this.isIframe,
          ts: +new Date()   // this should be accurate enough for our purposes,
        },
        uiURI
      );
    }

    // NOTE: you cannot communicate with UI iframe inside onload function.
    // onload triggers after iframe is initialized, but BEFORE vue finishes
    // setting up all the components.
    // If we need to have any data inside the vue component, we need to
    // request that data from vue components.
    iframe.onload = function() {
      document.addEventListener('mousemove', fn, true);
    }

    this.eventBus.forwardToIframe(
        this.uiIframe,
        (action, payload) => {
          this.sendToIframe(action, payload, {})
        }
      );

    this.rootDiv.appendChild(iframe);
  }

  unloadIframe() {
    this.eventBus.cancelIframeForwarding(this.uiIframe);
    window.removeEventListener('message', this.messageHandlerFn);
    this.uiIframe?.remove();
    delete this.uiIframe;
  }


  initMessaging() {
    // subscribe to events coming back to us. Unsubscribe if iframe vanishes.
    window.addEventListener('message', this.messageHandlerFn);

    /* set up event bus tunnel from content script to UI — necessary if we want to receive
     * like current zoom levels & current aspect ratio & stuff. Some of these things are
     * necessary for UI display in the popup.
     */

    this.eventBus.subscribeMulti(
      {
        'uw-config-broadcast': {
          function: (config, routingData) => {
            this.sendToIframe('uw-config-broadcast', config, routingData);
          }
        },
        'uw-set-ui-state': {
          function: (config, routingData)  => {
            if (config.globalUiVisible !== undefined && !this.isIframe) {
              if (this.isGlobal) {
                this.setUiVisibility(config.globalUiVisible);
              } else {
                this.setUiVisibility(!config.globalUiVisible);
              }
            }
            this.sendToIframe('uw-set-ui-state', {...config, isGlobal: this.isGlobal}, routingData);
          }
        },
        'uw-get-page-stats': {
          function: (config, routingData) => {
            this.eventBus.send(
              'uw-page-stats',
              {
                pcsDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
                pcsLight: window.matchMedia('(prefers-color-scheme: light)').matches,
                colorScheme: window.getComputedStyle( document.body ,null).getPropertyValue('color-scheme')
              },
              {
                comms: {
                  forwardTo: 'popup'
                }
              }
            );
          }
        },
        'uw-restore-ui-state': {
          function: (config, routingData) => {
            if (!this.isGlobal) {
              this.setUiVisibility(true);
              this.sendToIframe('uw-restore-ui-state', config, routingData);
            }
          }
        }
      },
      this
    );
  }

  messageHandlerFn = (message) => {
    if (!this.uiIframe?.contentWindow) {
      window.removeEventListener('message', this.messageHandlerFn);
      return;
    }
    this.handleMessage(message);
  }

  setUiVisibility(visible) {
    // console.log('uwui - setting ui visibility!', visible, this.isGlobal ? 'global' : 'page', this.uiIframe, this.rootDiv);
    // if (!this.uiIframe || !this.rootDiv) {
    //   this.init();
    // }

    if (visible) {
      this.rootDiv.style.width = '100%';
      this.rootDiv.style.height = '100%';
      this.uiIframe.style.width = '100%';
      this.uiIframe.style.height = '100%';

      // if (this.delayedDestroyTimer) {
      //   clearTimeout(this.delayedDestroyTimer);
      // }
    } else {
      this.rootDiv.style.width = '0px';
      this.rootDiv.style.height = '0px';
      this.uiIframe.style.width = '0px';
      this.uiIframe.style.height = '0px';

      // destroy after 30 seconds of UI being hidden
      // this.delayedDestroyTimer = setTimeout( () => this.unloadIframe(), 30000);
    }
  }

  async enable() {
    // if root element is not present, we need to init the UI.
    if (!this.rootDiv) {
      await this.init();
    }
    // otherwise, we don't have to do anything
  }
  disable() {
    if (this.rootDiv) {
      this.destroy();
    }
  }

  /**
   * Checks whether mouse is moving over either:
   *   * <video> element
   *   * player element ()
   *   * uwui-clickable element
   */
  canShowUI() {
    const playerCssClass = 'uw-ultrawidify-player-css';

    const result = {
      playerDimensions: undefined,
      canShowUI: false,
    }

    if (this.playerData?.environment && this.siteSettings.data.enableUI[this.playerData?.environment] !== ExtensionMode.Enabled) {
      return result;
    }

    if (this.playerData?.dimensions) {
      result.playerDimensions = this.playerData.dimensions;
    }

    // if player is not wide enough, we do nothing
    if (
      !this.isGlobal &&                 // this.isGlobal is basically 'yes, do as I say'
      !document.fullscreenElement &&    // if we are in full screen, we allow it in every case as player detection is not 100% reliable,
      result.playerDimensions?.width && // which makes playerDimensions.width unreliable as well (we assume nobody uses browser in
                                        // fullscreen mode unless watching videos)
      result.playerDimensions.width < window.screen.width * (this.uiSettings.inPlayer.minEnabledWidth ?? 0)
    ) {
      return result;
    }

    result.canShowUI = true;

    return result;
  }

  /**
   * Handles events received from the iframe.
   * @param {*} event
   */
  handleMessage(event) {
    if (event.origin === this.extensionBase) {
      switch(event.data.action) {
        case 'uwui-clickable':
          if (event.data.ts < this.lastProbeResponseTs) {
            return;
          }
          if (this.disablePointerEvents) {
            return;
          }
          this.lastProbeResponseTs = event.data.ts;

          // If iframe returns 'yes, we are clickable' and iframe is currently set to pointerEvents=auto,
          // but hasMouse is false, then UI is attached to the wrong element. This probably means our
          // detected player element is wrong. We need to perform this check if we aren't in global UI
          /**
           * action: 'uwui-clickable',
           * clickable: isClickable,
           * hoverStats: {
           *   isOverTriggerZone,
           *   isOverMenuTrigger,
           *   isOverUIArea,
           *   hasMouse: !!document.querySelector(':hover'),
           * },
           * ts: +new Date()
           */

          if (!this.global) {
            if (
              this.uiIframe.style.pointerEvents === 'auto'
            ) {
              if (
                event.data.hoverStats.isOverMenuTrigger
                && !event.data.hoverStats.hasMouse
              ) {
                if (!this.iframeConfirmed) {
                  if (this.iframeErrorCount++ > MAX_IFRAME_ERROR_COUNT && !this.iframeRejected) {
                    this.iframeRejected = true;
                    this.eventBus.send('change-player-element');
                    return;
                  }
                }
              } else if (event.data.hoverStats.isOverMenuTrigger && event.data.hoverStats.hasMouse) {
                this.iframeConfirmed = true;
              }
            }
          }

          this.uiIframe.style.pointerEvents = event.data.clickable ? 'auto' : 'none';
          this.uiIframe.style.opacity = event.data.opacity || this.isGlobal ? '100' : '0';
          break;
        case 'uw-bus-tunnel':
          const busCommand = event.data.payload;
          this.eventBus.send(
            busCommand.action,
            busCommand.config,
            {
              ...busCommand?.context,
              borderCrossings: {
                ...busCommand?.context?.borderCrossings,
                iframe: true,
              }
            }
          );
          break;
        case 'uwui-get-role':
          this.sendToIframeLowLevel('uwui-set-role', {role: this.isGlobal ? 'global' : 'player'});
          break;
        case 'uwui-interface-ready':
          this.setUiVisibility(!this.isGlobal);
          break;
        case 'uwui-hidden':
          this.uiIframe.style.opacity = event.data.opacity || this.isGlobal ? '100' : '0';
          break;
        case 'uwui-global-window-hidden':
          if (!this.isGlobal) {
            return; // This shouldn't even happen in non-global windows
          }
          this.setUiVisibility(false);
          this.eventBus.send('uw-restore-ui-state', {});
      }
    }
  }

  /**
   * Sends messages to iframe. Messages sent with this function _generally_
   * bypass eventBus on the receiving end.
   * @param {*} action
   * @param {*} payload
   * @param {*} uiURI
   */
  sendToIframeLowLevel(action, payload, uiURI = this.uiURI) {
    // because existence of UI is not guaranteed — UI is not shown when extension is inactive.
    // If extension is inactive due to "player element isn't big enough to justify it", however,
    // we can still receive eventBus messages.
    if (this.rootDiv && this.uiIframe) {
      this.uiIframe.contentWindow?.postMessage(
        {
          action,
          payload
        },
        uiURI
      )
    };
  }

  /**
   * Sends message to iframe. Messages sent with this function will be routed to eventbus.
   */
  sendToIframe(action, actionConfig, routingData, uiURI = this.uiURI) {
    // if (routingData) {
    //   if (routingData.crossedConnections?.includes(EventBusConnector.IframeBoundaryIn)) {
    //     console.warn('Denied message propagation. It has already crossed INTO an iframe once.');
    //     return;
    //   }
    // }
    // if (!routingData) {
    //   routingData = { };
    // }
    // if (!routingData.crossedConnections) {
    //   routingData.crossedConnections = [];
    // }
    // routingData.crossedConnections.push(EventBusConnector.IframeBoundaryIn);

    this.sendToIframeLowLevel(
      'uw-bus-tunnel',
      {
        action,
        config: actionConfig,
        routingData
      },
      uiURI
    );
  }

  /**
   * Replaces ui config and re-inits the UI
   * @param {*} newUiConfig
   */
  replace(newUiConfig) {
    this.uiConfig = newUiConfig;

    if (this.rootDiv) {
      this.destroy();
      this.init();
    }
  }

  destroy() {
    this.unloadIframe();

    this.eventBus.unsubscribeAll(this);
    // this.comms?.destroy();
    this.rootDiv?.remove();

    delete this.uiIframe;
    delete this.rootDiv;
  }
}

if (process.env.CHANNEL !== 'stable'){
  console.info("UI.js loaded");
}


export default UI;
