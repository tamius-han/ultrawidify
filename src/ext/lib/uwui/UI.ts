import ExtensionMode from '@src/common/enums/ExtensionMode.enum';
import { ClientMenu } from './ClientMenu';
import EventBus from '../EventBus';
import PlayerData from '../video-data/PlayerData';
import { SiteSettings } from '../settings/SiteSettings';
import Settings from '../settings/Settings';

import { MenuPosition as MenuPosition } from '@src/common/interfaces/ClientUiMenu.interface';
import { CommandInterface } from '@src/common/interfaces/SettingsInterface';

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


  isGlobal: boolean;
  isIframe: boolean;

  private eventBus: EventBus;
  private playerData: PlayerData;
  private uiSettings: any;
  private settings: Settings;
  private siteSettings: SiteSettings;

  private csuiScheme;

  // These can prolly be removed:
  lastProbeResponseTs: number;

  private extensionMenu: ClientMenu;

  constructor(
    public interfaceId,
    public uiConfig, // {parentElement?, eventBus?, isGlobal?, playerData}
  ) {
    this.lastProbeResponseTs = null;

    this.isGlobal = uiConfig.isGlobal ?? false;
    this.isIframe = window.self !== window.top;

    this.eventBus = uiConfig.eventBus;

    this.playerData = uiConfig.playerData;
    this.uiSettings = uiConfig.uiSettings;
    this.siteSettings = uiConfig.siteSettings;
    this.settings = uiConfig.settings;

    // TODO: at some point, UI should be different for global popup and in-player UI
    this.csuiScheme = this.getCsuiScheme();
    const csuiVersion = this.getCsuiVersion(this.csuiScheme.contentScheme);
    // this.uiURI = chrome.runtime.getURL(`/csui/${csuiVersion}.html`);
    // this.extensionBase = chrome.runtime.getURL('').replace(/\/$/, "");

    // UI will be initialized when setUiVisibility is called
    if (!this.isGlobal) {
      this.init();
    }
  }

  async init() {
    this.destroy()
    this.createExtensionMenu();

    // this.initUIContainer();
    // this.initMessaging();
  }

  executeCommand(x: CommandInterface) {
    this.eventBus.send(x.action, x.arguments);
  }

  createExtensionMenu() {
    console.log('—>—— creating ext menu:. is enabled?', this.siteSettings?.data.enableUI, ExtensionMode[this.siteSettings?.data.enableUI], this.siteSettings?.data.enableUI === ExtensionMode.Disabled, 'global?', this.isGlobal)
    if (+this.siteSettings?.data.enableUI === ExtensionMode.Disabled || this.isGlobal) {
      console.log('we said no to UI')
      return; // don't
    }
    if (this.extensionMenu) {
      this.extensionMenu.destroy();
    }
    if (this.uiConfig.parentElement) {
      const menuConfig = {
        isGlobal: this.isGlobal,
        menuPosition: MenuPosition.Left,
        items: [
          {
            label: "todo: site + site compatibility info"
          },
          {
            label: 'Crop',
            subitems: this.settings.active.commands.crop.map((x: CommandInterface) => {
              return {
                label: x.label,
                action: () => this.executeCommand(x)
              }
            })
          },
          {
            label: 'Zoom (presets)',
            subitems: [
              ... this.settings.active.commands.zoom.map((x: CommandInterface) => {
                return {
                  label: x.label,
                  action: () => this.executeCommand(x)
                }
              }),
            ]
          },
          {
            label: 'Stretch',
            subitems: this.settings.active.commands.stretch.map((x: CommandInterface) => {
              return {
                label: x.label,
                action: () => this.executeCommand(x)
              }
            })
          },
          {
            label: 'Zoom (free-form)',
            subitems: [
              {label: 'todo sliders'}
            ]
          },
          {
            label: 'Align',
            subitems: [{label: 'todo pls'}]
          },
          {
            label: 'todo: open settings'
          },
          {
            label: 'todo: first-time "customize/hide menu" option'
          }
        ]
      }
      this.extensionMenu = new ClientMenu(menuConfig);
      this.extensionMenu.mount(this.uiConfig.parentElement);
    }
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


    return;
  }

  // initMessaging() {
  //   // subscribe to events coming back to us. Unsubscribe if iframe vanishes.
  //   window.addEventListener('message', this.messageHandlerFn);

  //   /* set up event bus tunnel from content script to UI — necessary if we want to receive
  //    * like current zoom levels & current aspect ratio & stuff. Some of these things are
  //    * necessary for UI display in the popup.
  //    */

  //   this.eventBus.subscribeMulti(
  //     {
  //       'uw-config-broadcast': {
  //         function: (config, routingData) => {
  //           this.sendToIframe('uw-config-broadcast', config, routingData);
  //         }
  //       },
  //       'uw-set-ui-state': {
  //         function: (config, routingData)  => {
  //           if (config.globalUiVisible !== undefined && !this.isIframe) {
  //             if (this.isGlobal) {
  //               this.setUiVisibility(config.globalUiVisible);
  //             } else {
  //               this.setUiVisibility(!config.globalUiVisible);
  //             }
  //           }
  //           this.sendToIframe('uw-set-ui-state', {...config, isGlobal: this.isGlobal}, routingData);
  //         }
  //       },
  //       'uw-get-page-stats': {
  //         function: (config, routingData) => {
  //           this.eventBus.send(
  //             'uw-page-stats',
  //             {
  //               pcsDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
  //               pcsLight: window.matchMedia('(prefers-color-scheme: light)').matches,
  //               colorScheme: window.getComputedStyle( document.body ,null).getPropertyValue('color-scheme')
  //             },
  //             {
  //               comms: {
  //                 forwardTo: 'popup'
  //               }
  //             }
  //           );
  //         }
  //       },
  //       'uw-restore-ui-state': {
  //         function: (config, routingData) => {
  //           if (!this.isGlobal) {
  //             this.setUiVisibility(true);
  //             this.sendToIframe('uw-restore-ui-state', config, routingData);
  //           }
  //         }
  //       }
  //     },
  //     this
  //   );
  // }

  // messageHandlerFn = (message) => {
  //   if (!this.uiIframe?.contentWindow) {
  //     window.removeEventListener('message', this.messageHandlerFn);
  //     return;
  //   }
  //   this.handleMessage(message);
  // }

  setUiVisibility(visible) {
    return;
  }

  async enable() {
    // if root element is not present, we need to init the UI.
    // if (!this.rootDiv) {
    //   await this.init();
    // }
    // otherwise, we don't have to do anything
  }
  disable() {
    // if (this.rootDiv) {
    //   this.destroy();
    // }
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

    if (this.playerData?.environment && this.siteSettings.canRunUI(this.playerData?.environment)) {
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

  // /**
  //  * Handles events received from the iframe.
  //  * @param {*} event
  //  */
  // handleMessage(event) {
  //   if (event.origin === this.extensionBase) {
  //     switch(event.data.action) {
  //       case 'uwui-clickable':
  //         if (event.data.ts < this.lastProbeResponseTs) {
  //           return;
  //         }
  //         if (this.disablePointerEvents) {
  //           return;
  //         }
  //         this.lastProbeResponseTs = event.data.ts;

  //         // If iframe returns 'yes, we are clickable' and iframe is currently set to pointerEvents=auto,
  //         // but hasMouse is false, then UI is attached to the wrong element. This probably means our
  //         // detected player element is wrong. We need to perform this check if we aren't in global UI
  //         /**
  //          * action: 'uwui-clickable',
  //          * clickable: isClickable,
  //          * hoverStats: {
  //          *   isOverTriggerZone,
  //          *   isOverMenuTrigger,
  //          *   isOverUIArea,
  //          *   hasMouse: !!document.querySelector(':hover'),
  //          * },
  //          * ts: +new Date()
  //          */

  //         if (!this.global) {
  //           if (
  //             this.uiIframe.style.pointerEvents === 'auto'
  //           ) {
  //             if (
  //               event.data.hoverStats.isOverMenuTrigger
  //               && !event.data.hoverStats.hasMouse
  //             ) {
  //               if (!this.iframeConfirmed) {
  //                 if (this.iframeErrorCount++ > MAX_IFRAME_ERROR_COUNT && !this.iframeRejected) {
  //                   this.iframeRejected = true;
  //                   this.eventBus.send('change-player-element');
  //                   return;
  //                 }
  //               }
  //             } else if (event.data.hoverStats.isOverMenuTrigger && event.data.hoverStats.hasMouse) {
  //               this.iframeConfirmed = true;
  //             }
  //           }
  //         }

  //         this.uiIframe.style.pointerEvents = event.data.clickable ? 'auto' : 'none';
  //         this.uiIframe.style.opacity = event.data.opacity || this.isGlobal ? '100' : '0';
  //         break;
  //       case 'uw-bus-tunnel':
  //         const busCommand = event.data.payload;
  //         this.eventBus.send(
  //           busCommand.action,
  //           busCommand.config,
  //           {
  //             ...busCommand?.context,
  //             borderCrossings: {
  //               ...busCommand?.context?.borderCrossings,
  //               iframe: true,
  //             }
  //           }
  //         );
  //         break;
  //       case 'uwui-get-role':
  //         this.sendToIframeLowLevel('uwui-set-role', {role: this.isGlobal ? 'global' : 'player'});
  //         break;
  //       case 'uwui-interface-ready':
  //         this.setUiVisibility(!this.isGlobal);
  //         break;
  //       case 'uwui-hidden':
  //         this.uiIframe.style.opacity = event.data.opacity || this.isGlobal ? '100' : '0';
  //         break;
  //       case 'uwui-global-window-hidden':
  //         if (!this.isGlobal) {
  //           return; // This shouldn't even happen in non-global windows
  //         }
  //         this.setUiVisibility(false);
  //         this.eventBus.send('uw-restore-ui-state', {});
  //     }
  //   }
  // }

  // /**
  //  * Sends messages to iframe. Messages sent with this function _generally_
  //  * bypass eventBus on the receiving end.
  //  * @param {*} action
  //  * @param {*} payload
  //  * @param {*} uiURI
  //  */
  // sendToIframeLowLevel(action, payload, uiURI = this.uiURI) {
  //   // because existence of UI is not guaranteed — UI is not shown when extension is inactive.
  //   // If extension is inactive due to "player element isn't big enough to justify it", however,
  //   // we can still receive eventBus messages.
  //   if (this.rootDiv && this.uiIframe) {
  //     this.uiIframe.contentWindow?.postMessage(
  //       {
  //         action,
  //         payload
  //       },
  //       uiURI
  //     )
  //   };
  // }

  // /**
  //  * Sends message to iframe. Messages sent with this function will be routed to eventBus.
  //  */
  // sendToIframe(action, actionConfig, routingData, uiURI = this.uiURI) {
  //   // if (routingData) {
  //   //   if (routingData.crossedConnections?.includes(EventBusConnector.IframeBoundaryIn)) {
  //   //     console.warn('Denied message propagation. It has already crossed INTO an iframe once.');
  //   //     return;
  //   //   }
  //   // }
  //   // if (!routingData) {
  //   //   routingData = { };
  //   // }
  //   // if (!routingData.crossedConnections) {
  //   //   routingData.crossedConnections = [];
  //   // }
  //   // routingData.crossedConnections.push(EventBusConnector.IframeBoundaryIn);

  //   this.sendToIframeLowLevel(
  //     'uw-bus-tunnel',
  //     {
  //       action,
  //       config: actionConfig,
  //       routingData
  //     },
  //     uiURI
  //   );
  // }

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
    if (this.extensionMenu) {
      this.extensionMenu.destroy();
    }
    // this.unloadIframe();

    // this.eventBus.unsubscribeAll(this);
    // // this.comms?.destroy();
    // this.rootDiv?.remove();

    // delete this.uiIframe;
    // delete this.rootDiv;
  }
}

if (process.env.CHANNEL !== 'stable'){
  console.info("UI.js loaded");
}


export default UI;
