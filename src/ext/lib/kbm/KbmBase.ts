import EventBus, { EventBusCommand } from '../EventBus';
import Logger from '../Logger';
import Settings from '../Settings';
import { SiteSettings } from '../settings/SiteSettings';

export class KbmBase {
  listenFor: string[] = [];
  logger: Logger;
  settings: Settings;
  siteSettings: SiteSettings;
  eventBus: EventBus;

  eventBusCommands: { [x: string]: EventBusCommand } = {
    'kbm-enable': {
      function: () => this.enable()
    },
    'kbm-disable': {
      function: () => this.disable()
    },
    'kbm-set-config': {
      function: (data: {config: any, temporary?: boolean}) => this.setConfig(data.config, data.temporary),
    },
    'uw-enable': {
      function: () => this.load()
    },
    'uw-disable': {
      function: () => this.disable()
    },
  }

  constructor(eventBus: EventBus, siteSettings: SiteSettings, settings: Settings, logger: Logger) {
    this.logger = logger;
    this.settings = settings;
    this.eventBus = eventBus;
  }

  /**
   * Enables KeyboardHandler
   */
  enable() {
    this.load();
  }

  /**
   * Disables KeyboardHandler
   */
  disable() {
    this.removeListener();
  }

  /**
   * Sets configuration parameter for KeyboardHandler
   * @param config
   */
  setConfig(config, temporary = false) {
    if (temporary) {
      for (const confKey in config) {
        switch (confKey) {
          case 'enabled':
            config[confKey] ? this.enable() : this.disable();
            break;
        }
      }
      return;
    }

    for (const confKey in config) {
      this.settings.active.kbm[confKey] = config[confKey];
    }

    this.settings.save();
    this.load();
  }

  // convenience methods
  addListener() {
    // events should be handled in handleEvent function. We need to do things this
    // way, otherwise we can't remove event listener
    // https://stackoverflow.com/a/19507086

    for (const ev of this.listenFor) {
      if (ev.startsWith('key') ? this.settings.active.kbm.keyboardEnabled : this.settings.active.kbm.mouseEnabled) {
        document.addEventListener(ev, this);
      }
    }
  }

  removeListener() {
    for (const ev of this.listenFor) {
      document.removeEventListener(ev, this);
    }
  }

  load() {
    // if (! (this.settings.isEnabledForSite() && this.settings.active.kbm.enabled)) {
    //   return;
    // }
    // todo: detect if this is enabled or not
    this.addListener();
  }

  handleEvent(event) {
    console.error('[KbmBase::handleEvent] — IF YOU SEE THIS, THEN YOU KINDA FORGOT TO DEFINE A FUNCTION. Classes that extend KbmBase should also override this function.');
    throw "KBM_BASE::HANDLE_EVENT - OVERRIDE_ME_PLS";
  }
}

export default KbmBase;
