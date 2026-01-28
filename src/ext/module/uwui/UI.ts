import ExtensionMode from '@src/common/enums/ExtensionMode.enum';
import { ClientMenu } from './ClientMenu';
import EventBus from '../EventBus';
import PlayerData from '../video-data/PlayerData';
import { SiteSettings } from '../settings/SiteSettings';
import Settings from '../settings/Settings';

import { MenuPosition as MenuPosition } from '@src/common/interfaces/ClientUiMenu.interface';
import { CommandInterface } from '@src/common/interfaces/SettingsInterface';
import { SiteSupportLevel } from '@src/common/enums/SiteSupportLevel.enum';
import { ComponentLogger } from '../logging/ComponentLogger';
import { setupVideoAlignmentIndicatorInteraction } from '@ui/utils/video-alignment-indicator-handling';

import alignmentIndicatorSvg from '!!raw-loader!@ui/res/img/alignment-indicators.svg';
import lockBarIndicatorSvg from  '!!raw-loader!@ui/res/img/lock-bar-indicators.svg';
import VideoAlignmentType from '../../../common/enums/VideoAlignmentType.enum';
import { setVideoAlignmentIndicatorState } from '../../../ui/utils/video-alignment-indicator-handling';
import { UwuiWindow } from './UwuiWindow';

import { createApp } from 'vue';
import SettingsWindowContent from '@components/SettingsWindowContent.vue';
import { Ar } from '@src/common/interfaces/ArInterface';
import { Stretch } from '@src/common/interfaces/StretchInterface';
import { ScalingParamsBroadcast } from '@src/common/interfaces/ScalingParamsBroadcast.interface';
// import jsonEditorCSS from 'vanilla-jsoneditor/themes/jse-theme-dark.css?inline'

if (process.env.CHANNEL !== 'stable'){
  console.info("Loading: UI");
}


class UI {
  isGlobal: boolean;
  isIframe: boolean;

  private eventBus: EventBus;
  private playerData: PlayerData;
  private uiSettings: any;
  private settings: Settings;
  private siteSettings: SiteSettings;

  private extensionMenu: ClientMenu;
  private logger: ComponentLogger;

  private forwardedCommandIds: string[] = new Array(64);
  private lastForwardedCommandIndex = 0;

  private currentScalingParams?: ScalingParamsBroadcast;

  private uiState = {
    lockXY: true,
    zoom: {     // log2 scale — 100% is 0
      x: 0,
      y: 0,
    },
    videoAlignment: {
      x: VideoAlignmentType.Default,
      y: VideoAlignmentType.Default
    }
  }

  constructor(
    public interfaceId,
    public uiConfig, // {parentElement?, eventBus?, isGlobal?, playerData}
  ) {
    this.isGlobal = uiConfig.isGlobal ?? false;
    this.isIframe = window.self !== window.top;

    this.eventBus = uiConfig.eventBus;

    this.playerData = uiConfig.playerData;
    this.uiSettings = uiConfig.uiSettings;
    this.siteSettings = uiConfig.siteSettings;
    this.settings = uiConfig.settings;

    // UI will be initialized when setUiVisibility is called
    if (!this.isGlobal) {
      this.init();

      this.eventBus.subscribeMulti({
        'reload-menu': {
          function: () => {
            this.createExtensionMenu({forceShow: true});
            this.extensionMenu.show({forceShow: true});
          }
        },
        'force-menu-activator-state': {
          function: (commandData) => {
            if (commandData.visibility) {
              this.extensionMenu.show({forceShow: true});
            } else {
              this.extensionMenu.show({forceShow: false});
            }
          }
        },

        'uw-show-settings-window': {
          function: (commandData, context) => {
            this.createSettingsWindow(commandData?.initialState);
          }
        },


        'broadcast-scaling-params': {
          function: (commandData: ScalingParamsBroadcast, context) => {
            this.currentScalingParams = commandData;
            this.updateMenuStatus(commandData);
          }
        }
      });
    }
  }

  async init() {
    this.destroy();
    if (!this.logger) {
      this.logger = new ComponentLogger(this.settings.logAggregator, 'UI');
    }
    this.createExtensionMenu();
    this.eventBus.subscribeMulti({
      'uw-config-broadcast': {
        function: (message) => {
          console.log('UI.ts: received uw-config-broadcast', message);
          if (message.type === 'aard-error') {
            console.log('received: warning element:', this.extensionMenu.root.querySelector('#uw-cors-warning'));
            this.updateMenuWarnings(message);
          } else if (message.type === 'drm-status') {
            this.updateMenuWarnings(message);
          }
        }
      }
    });
    this.initMessaging();
  }

  private messageListener?: (event?: MessageEvent) => void;

  private initMessaging() {
    if (this.messageListener) {
      this.destroyMessaging();
    } else {
      this.messageListener = (event: MessageEvent) => {
        const data = event.data;

        if (data?.action !== 'uw-bus-tunnel') {
          return;
        }


        const payload = data.payload;

        /**
         * it appears that forwarded commands can be multiplying to ridiculous degree,
         * but i didn't find anything that would obviously cause the message forwarding storm
         * this means we'll try to avoid that via brute force.
         *
         * How bad is it?
         *  — can get as bad as 100k messages a minute (!)
         */
        if (!payload.context?.commandId) {
          // user should never see this log
          console.warn('Command context does not contain commandId. This is illegal. Message will not be forwarded.', {payload});
          return;
        }
        if (this.forwardedCommandIds.includes(payload.context.commandId)) {
          console.warn('this command was already forwarded, doing nothing:', {payload});
          return;
        }
        const i = this.lastForwardedCommandIndex++ % this.forwardedCommandIds.length;
        this.forwardedCommandIds[i] = payload.id;


        // Forward to all iframes except the source
        (UwuiWindow as any).instances?.forEach(win => {
          const iframe = win.content as HTMLIFrameElement;
          if (iframe && event.source !== iframe.contentWindow) {
            iframe.contentWindow?.postMessage(
              {
                action: 'uw-bus-tunnel',
                payload,
              },
              '*'
            );
          }
        });
      };
    }

    window.addEventListener('message', this.messageListener);
  }

  private destroyMessaging() {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
    }
  }

  executeCommand(x: CommandInterface) {
    this.eventBus.send(x.action, x.arguments);
  }

  updateMenuWarnings(errors: {aardErrors?: any, hasDrm?: boolean}) {
    try {
      if (errors.aardErrors) {
        if (errors.aardErrors.cors) {
          this.extensionMenu.root.querySelector('#uw-cors-warning').classList.remove('uw-hidden');
        }
        if (errors.aardErrors.drm) {
          this.extensionMenu.root.querySelector('#uw-drm-warning').classList.remove('uw-hidden');
        }
        if (errors.aardErrors.webglError) {
          this.extensionMenu.root.querySelector('#uw-webgl-warning').classList.remove('uw-hidden');
        }
      }
      if (errors.hasDrm) {
        this.extensionMenu.root.querySelector('#uw-drm-warning').classList.remove('uw-hidden');
      }
    } catch (e) {
      this.logger.error("UI.ts: failed to update menu warnings:", e);
    }
  }

  private getSiteSupportLevelForDisplay() {
    const siteSupportLevel = (this.siteSettings ? this.siteSettings.data.type ?? SiteSupportLevel.Unknown : 'waiting')
    switch (siteSupportLevel) {
      case SiteSupportLevel.OfficialSupport:
        return {cssClass: 'uw-official', text: 'Verified', svg: 'check-decagram'};
      case SiteSupportLevel.CommunitySupport:
        return {cssClass: 'uw-community', text: 'Community', svg: 'account-group'};
      case SiteSupportLevel.Unknown:
        return {cssClass: 'uw-no-support', text: 'Untested', svg: 'help-circle-outline'};
      case SiteSupportLevel.UserDefined:
        return {cssClass: 'uw-user-added', text: 'Modified by you', svg: 'account'};
      case SiteSupportLevel.UserModified:
        return {cssClass: 'uw-user-added', text: 'Modified by you', svg: 'account'};
      default:
        return {cssClass: 'uw-unknown', text: 'Unknown', svg: 'help-circle-outline'};
    }
  }

  createExtensionMenu(options?: {forceShow?: boolean}) {
    if (+this.siteSettings?.data.enableUI === ExtensionMode.Disabled || this.isGlobal) {
      return; // don't
    }
    if (this.extensionMenu) {
      this.extensionMenu.destroy();
    }

    const svgMap = {
      'check-decagram': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>check-decagram</title><path d="M23,12L20.56,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.47L6.71,19.29L8.6,22.47L12,21L15.4,22.46L17.29,19.28L20.9,18.46L20.56,14.78L23,12M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z" /></svg>',
      'account-group': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>account-group</title><path d="M12,5.5A3.5,3.5 0 0,1 15.5,9A3.5,3.5 0 0,1 12,12.5A3.5,3.5 0 0,1 8.5,9A3.5,3.5 0 0,1 12,5.5M5,8C5.56,8 6.08,8.15 6.53,8.42C6.38,9.85 6.8,11.27 7.66,12.38C7.16,13.34 6.16,14 5,14A3,3 0 0,1 2,11A3,3 0 0,1 5,8M19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14C17.84,14 16.84,13.34 16.34,12.38C17.2,11.27 17.62,9.85 17.47,8.42C17.92,8.15 18.44,8 19,8M5.5,18.25C5.5,16.18 8.41,14.5 12,14.5C15.59,14.5 18.5,16.18 18.5,18.25V20H5.5V18.25M0,20V18.5C0,17.11 1.89,15.94 4.45,15.6C3.86,16.28 3.5,17.22 3.5,18.25V20H0M24,20H20.5V18.25C20.5,17.22 20.14,16.28 19.55,15.6C22.11,15.94 24,17.11 24,18.5V20Z" /></svg>',
      'help-circle-outline': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>help-circle-outline</title><path d="M11,18H13V16H11V18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,6A4,4 0 0,0 8,10H10A2,2 0 0,1 12,8A2,2 0 0,1 14,10C14,12 11,11.75 11,15H13C13,12.75 16,12.5 16,10A4,4 0 0,0 12,6Z" /></svg>',
      'account': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>account</title><path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" /></svg>'
    };

    const supportLevelInfo = this.getSiteSupportLevelForDisplay();

    if (this.uiConfig.parentElement) {
      const menuConfig = {
        isGlobal: this.isGlobal,
        ui: this.settings.active.ui.inPlayer,
        options,
        items: [
          {
            customClassList: 'uw-site-info',
            customHTML: `
              <div class="uw-menu-site">${this.siteSettings?.site ?? '<unknown site>'}</div>
              <div class="uw-site-support uw-site-support-level ${supportLevelInfo.cssClass} uw-menu-support-level">
                ${svgMap[supportLevelInfo.svg]}
                <span>${supportLevelInfo.text}</span>
              </div>
            `
          },
          {
            customId: 'uw-drm-warning',
            customClassList: `uw-menu-warning ${this.playerData?.videoData.hasDrm ? '' : 'uw-hidden'}`,
            customHTML: `
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>alert</title><path d="M13 14H11V9H13M13 18H11V16H13M1 21H23L12 2L1 21Z" /></svg>
              <div>Autodetection not available<br/> due to DRM</div>
            `
          },
          {
            customId: 'uw-cors-warning',
            customClassList: 'uw-menu-warning uw-hidden',
            customHTML: `
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>alert</title><path d="M13 14H11V9H13M13 18H11V16H13M1 21H23L12 2L1 21Z" /></svg>
              <div>Autodetection not available<br/> due to CORS error</div>
            `
          },
          {
            customId: 'uw-webgl-warning',
            customClassList: 'uw-menu-warning uw-hidden',
            customHTML: `
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>alert</title><path d="M13 14H11V9H13M13 18H11V16H13M1 21H23L12 2L1 21Z" /></svg>
              <div>Autodetection not available<br/> due to WEBGL error<br/>
              <small>Check if hardware acceleration is<br/>enabled and working.</small></div>
            `
          },
          {
            label: 'Crop',
            customId: 'uw-crop',
            subitems: this.settings.active.commands.crop.map((x: CommandInterface) => {
              return {
                label: x.label,
                command: x,
                customId: `uw-${x.action}-${x.arguments.type}-${x.arguments.ratio ?? 'x'}`.replaceAll('.', '_'),
                action: () => this.executeCommand(x)
              }
            })
          },
          {
            label: 'Stretch',
            customId: 'uw-stretch',
            subitems: this.settings.active.commands.stretch.map((x: CommandInterface) => {
              return {
                label: x.label,
                command: x,
                customId: `uw-${x.action}-${x.arguments.type}-${x.arguments.ratio ?? 'x'}`.replaceAll('.', '_'),
                action: () => this.executeCommand(x)
              }
            })
          },
          {
            label: 'Zoom (presets)',
            customId: 'uw-zoom',
            subitems: [
              ... this.settings.active.commands.zoom.map((x: CommandInterface) => {
                return {
                  label: x.label,
                  command: x,
                  customId: `uw-${x.action}-${x.arguments.type}-${x.arguments.ratio ?? 'x'}`.replaceAll('.', '_'),
                  action: () => this.executeCommand(x)
                }
              }),
            ]
          },
          {
            label: 'Zoom (free-form)',
            subitems: [
              {
                customHTML: `
                  <div class="uw-freeform-zoom-container">

                    <!-- SLIDERS BEFORE X/Y LOCK -->
                    <div class="uw-freeform-zoom-sliders">
                      <div class="uw-slider">
                        <div class="uw-slider-label">Width:</div>
                        <div id="zoomWidth" class="uw-slider-zoom">100%</div>
                        <div class="grow leading-none pt-[0.25em]">
                          <input id="_input_zoom_slider"
                              class="w-full"
                              type="range"
                              step="any"
                              min="-1"
                              max="4"
                          />
                        </div>
                      </div>
                      <div class="uw-slider">
                        <div class="uw-slider-label">Height:</div>
                        <div id="zoomHeight" class="uw-slider-zoom">100%</div>
                        <div class="uw-slider-input">
                          <input id="_input_zoom_slider_2"
                              class="w-full"
                              type="range"
                              step="any"
                              min="-1"
                              max="4"
                          />
                        </div>
                      </div>
                    </div>

                    <!-- X/Y LOCK, LINK BAR EDITION -->
                    <div id="slider-lock" class="uw-slider-lock-bar-container uw-linked">
                      ${lockBarIndicatorSvg}
                    </div>

                    <div class="uw-freeform-zoom-button-container">
                      <div
                        id="_button_toggle_aspect_lock"
                        class="uw-freeform-zoom-button uw-link-button uw-linked"
                      >
                        <svg id="_button_toggle_aspect_lock_locked"   class="svg-icon uw-linked"   xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>link-variant</title><path d="M10.59,13.41C11,13.8 11,14.44 10.59,14.83C10.2,15.22 9.56,15.22 9.17,14.83C7.22,12.88 7.22,9.71 9.17,7.76V7.76L12.71,4.22C14.66,2.27 17.83,2.27 19.78,4.22C21.73,6.17 21.73,9.34 19.78,11.29L18.29,12.78C18.3,11.96 18.17,11.14 17.89,10.36L18.36,9.88C19.54,8.71 19.54,6.81 18.36,5.64C17.19,4.46 15.29,4.46 14.12,5.64L10.59,9.17C9.41,10.34 9.41,12.24 10.59,13.41M13.41,9.17C13.8,8.78 14.44,8.78 14.83,9.17C16.78,11.12 16.78,14.29 14.83,16.24V16.24L11.29,19.78C9.34,21.73 6.17,21.73 4.22,19.78C2.27,17.83 2.27,14.66 4.22,12.71L5.71,11.22C5.7,12.04 5.83,12.86 6.11,13.65L5.64,14.12C4.46,15.29 4.46,17.19 5.64,18.36C6.81,19.54 8.71,19.54 9.88,18.36L13.41,14.83C14.59,13.66 14.59,11.76 13.41,10.59C13,10.2 13,9.56 13.41,9.17Z" /></svg>
                        <svg id="_button_toggle_aspect_lock_unlocked" class="svg-icon uw-unlinked" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>link-variant-off</title><path d="M2,5.27L3.28,4L20,20.72L18.73,22L13.9,17.17L11.29,19.78C9.34,21.73 6.17,21.73 4.22,19.78C2.27,17.83 2.27,14.66 4.22,12.71L5.71,11.22C5.7,12.04 5.83,12.86 6.11,13.65L5.64,14.12C4.46,15.29 4.46,17.19 5.64,18.36C6.81,19.54 8.71,19.54 9.88,18.36L12.5,15.76L10.88,14.15C10.87,14.39 10.77,14.64 10.59,14.83C10.2,15.22 9.56,15.22 9.17,14.83C8.12,13.77 7.63,12.37 7.72,11L2,5.27M12.71,4.22C14.66,2.27 17.83,2.27 19.78,4.22C21.73,6.17 21.73,9.34 19.78,11.29L18.29,12.78C18.3,11.96 18.17,11.14 17.89,10.36L18.36,9.88C19.54,8.71 19.54,6.81 18.36,5.64C17.19,4.46 15.29,4.46 14.12,5.64L10.79,8.97L9.38,7.55L12.71,4.22M13.41,9.17C13.8,8.78 14.44,8.78 14.83,9.17C16.2,10.54 16.61,12.5 16.06,14.23L14.28,12.46C14.23,11.78 13.94,11.11 13.41,10.59C13,10.2 13,9.56 13.41,9.17Z" /></svg>
                      </div>
                    </div>

                    <div class="uw-freeform-zoom-button-container">
                      <div
                        id="_button_reset_zoom"
                        class="uw-freeform-zoom-button"
                      >
                        <svg class="svg-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>restore</title><path d="M13,3A9,9 0 0,0 4,12H1L4.89,15.89L4.96,16.03L9,12H6A7,7 0 0,1 13,5A7,7 0 0,1 20,12A7,7 0 0,1 13,19C11.07,19 9.32,18.21 8.06,16.94L6.64,18.36C8.27,20 10.5,21 13,21A9,9 0 0,0 22,12A9,9 0 0,0 13,3Z" /></svg>
                      </div>
                    </div>
                  </div>
                </div>
                `,
              }
            ]
          },
          {
            label: 'Align video to ...',
            subitems: [{
              customId: 'videoAlignmentController',
              customClassList: '',
              customHTML: `<div class="svg-icon">
                ${alignmentIndicatorSvg}
              </div>`,
            }]
          },
          {
            label: 'Extension settings',
            action: () => this.createSettingsWindow(),
          },
          {
            label: 'Cropping issues?',
            action: () => this.createSettingsWindow('ui-settings'),
          },
          {
            label: 'Report a problem',
            action: () => this.createSettingsWindow('about'),
          }
        ]
      };
      this.extensionMenu = new ClientMenu(menuConfig);
      this.extensionMenu.mount(this.uiConfig.parentElement);
      if (this.currentScalingParams) {
        this.updateMenuStatus(this.currentScalingParams);
      }

      /**
       *  SETUP MENU INTERACTIONS
       * ———————————————————————————————————
       * Interactions are needed for the following things:
       *     0. [X]  both sliders. Needs to read the state of the sliders and update the labels
       *     1. [X]  lock X/Y button — needs to update icon state of the button and the linked bar
       *     2. [X]  reset button — just needs to reset, no icon changes necessary
       *     3. [X]  alignment indicator — also needs to update indicator state
       *         A
       *         |
       *    (yay done!)
       */
      const menuElement = this.extensionMenu.root;

      // 0. SLIDERS —————————————————————————————————————————————————————————————————————————————
      const zoomWidthSlider: HTMLInputElement = menuElement.querySelector('#_input_zoom_slider');
      const zoomHeightSlider: HTMLInputElement = menuElement.querySelector('#_input_zoom_slider_2');
      const zoomWidthLabel: HTMLDivElement = menuElement.querySelector('#zoomWidth');
      const zoomHeightLabel: HTMLDivElement = menuElement.querySelector('#zoomHeight');

      for (const slider of [zoomWidthSlider, zoomHeightSlider]) {
        slider.addEventListener('pointerdown', function() {
          (this as any).isInteracting = true;
        });

        slider.addEventListener('pointerup', function() {
          (this as any).isInteracting = false;
        });

        slider.addEventListener('pointercancel', function() {
          (this as any).isInteracting = false;
        });

        slider.addEventListener('pointerleave', function() {
          (this as any).isInteracting = false;
        });
      }

      const updateZoomDisplayValues = () => {
        zoomWidthLabel.textContent = `${Math.round((Math.exp(this.uiState.zoom.x) * 100))}%`;
        zoomHeightLabel.textContent = `${Math.round((Math.exp(this.uiState.zoom.y) * 100))}%`;
        zoomWidthSlider.value = this.uiState.zoom.x.toString();
        zoomHeightSlider.value = this.uiState.zoom.y.toString();
      }

      const updateZoom = (event: InputEvent, axis: 'x' | 'y') => {
        const parsedValue = parseFloat((event.currentTarget as HTMLInputElement).value);

        if (this.uiState.lockXY) {
          this.uiState.zoom = {x: parsedValue, y: parsedValue};
        } else {
          this.uiState.zoom[axis] = parsedValue;
        }

        updateZoomDisplayValues();

        this.eventBus?.send('set-zoom', {
          zoom: {
            x: Math.pow(2, this.uiState.zoom.x),
            y: Math.pow(2, this.uiState.zoom.y)
          }
        });
      }

      zoomWidthSlider.addEventListener('input', (event: InputEvent) => updateZoom(event, 'x'));
      zoomHeightSlider.addEventListener('input', (event: InputEvent) => updateZoom(event, 'y'));

      // 1. LOCK X/Y ————————————————————————————————————————————————————————————————————————————
      const lockXYButton = menuElement.querySelector('#_button_toggle_aspect_lock');
      const sliderLockBar = menuElement.querySelector('#slider-lock');
      lockXYButton.addEventListener('click', () => {
        this.uiState.lockXY = !this.uiState.lockXY;

        if (this.uiState.lockXY) {
          lockXYButton.classList.add('uw-linked');
          lockXYButton.classList.remove('uw-unlinked');
          sliderLockBar.classList.add('uw-linked');
          sliderLockBar.classList.remove('uw-unlinked');
        } else {
          lockXYButton.classList.add('uw-unlinked');
          lockXYButton.classList.remove('uw-linked');
          sliderLockBar.classList.add('uw-unlinked');
          sliderLockBar.classList.remove('uw-linked');
        }
      });

      // 2. ZOOM RESET BUTTON ———————————————————————————————————————————————————————————————————
      const zoomResetButton = menuElement.querySelector('#_button_reset_zoom');
      zoomResetButton.addEventListener('click', () => {
        this.eventBus?.send('set-zoom', { zoom: {x: 1, y: 1} });
        this.uiState.zoom = {x: 0, y: 0};
        updateZoomDisplayValues();
      });

      // 3. VIDEO ALIGNMENT INDICATOR ———————————————————————————————————————————————————————————
      const videoAlignmentIndicatorElement: SVGSVGElement = menuElement.querySelector('#_uw_ui_alignment_indicator');
      setupVideoAlignmentIndicatorInteraction(
        videoAlignmentIndicatorElement,
        (x: VideoAlignmentType, y: VideoAlignmentType) => {
          setVideoAlignmentIndicatorState(videoAlignmentIndicatorElement, x, y);
          if (this.eventBus) {
            this.eventBus?.send('set-alignment', {x,y});
            this.uiState.videoAlignment = {x,y};
          }
        }
      );


    }
  }

  updateMenuStatus(scalingParams: ScalingParamsBroadcast) {
    this.extensionMenu?.markActiveElements(scalingParams);

    // we also need to handle this here
    this.uiState.lockXY = scalingParams.effectiveZoom.x === scalingParams.effectiveZoom.y;
  }

  createSettingsWindow(path?: string) {
    const iframe = document.createElement('iframe');

    // we don't enforce minimum margin on small screens
    const margin = (window.innerWidth < 1024 || window.innerHeight < 720) ? 0 : 64;

    const params = {
      width: Math.min(1600, window.innerWidth - margin),
      height: Math.min(920, window.innerHeight - margin),
      x: 0,
      y: 0
    };
    params.x = Math.floor((window.innerWidth - params.width) / 2);
    params.y = Math.floor((window.innerHeight - params.height) / 2);

    iframe.src = chrome.runtime.getURL(`ui/pages/settings/index.html#ui${path ? `/${path}` : ''}`);
    iframe.setAttribute('allowtransparency', 'true');
    Object.assign(iframe.style, {
      width: '100%',
      height: '100%',
      border: 'none',
      background: 'transparent',   // important
    });

    new UwuiWindow({
      title: `Ultrawidify settings (${window.location.host})`,
      ...params,
      content: iframe,
      onClose: () => {
        this.eventBus.cancelIframeForwarding(iframe)
      }
    });

    this.eventBus.forwardToIframe(iframe, (command, config, context) => {
      iframe.contentWindow?.postMessage(
        { action: 'uw-bus-tunnel', payload: { command, config, context } },
        '*'
      );
    });
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
   * Replaces ui config and re-inits the UI
   * @param {*} newUiConfig
   */
  replace(newUiConfig) {
    this.destroy();
    this.uiConfig = newUiConfig;
    this.init();
  }

  destroy() {
    if (this.extensionMenu) {
      this.extensionMenu.destroy();
    }
    this.destroyMessaging();
  }


}

if (process.env.CHANNEL !== 'stable'){
  console.info("UI.js loaded");
}


export default UI;
