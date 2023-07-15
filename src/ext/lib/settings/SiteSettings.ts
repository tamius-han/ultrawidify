import CropModePersistence from '../../../common/enums/CropModePersistence.enum';
import ExtensionMode from '../../../common/enums/ExtensionMode.enum';
import { SettingsReloadComponent, SettingsReloadFlags, SiteSettingsInterface } from '../../../common/interfaces/SettingsInterface';
import { _cp } from '../../../common/js/utils';
import Settings from '../Settings';
import { browser } from 'webextension-polyfill-ts';
import StretchType from '../../../common/enums/StretchType.enum';
import VideoAlignmentType from '../../../common/enums/VideoAlignmentType.enum';

/**
 * Contains settings that are currently in effect for a given site. If a certain option
 * doesn't have a value — or if it has 'default' option, SiteSettings.data will contain
 * the value that "default" should stand for.
 *
 * SiteSettings.raw also contains settings object as it actually exist in the config.
 */
export class SiteSettings {
  private settings: Settings;
  private site: string;

  raw: SiteSettingsInterface;       // actual settings
  data: SiteSettingsInterface;      // effective settings
  temporaryData: SiteSettingsInterface;
  sessionData: SiteSettingsInterface;
  readonly defaultSettings: SiteSettingsInterface;

  storageChangeSubscriptions: {[x: string]: ((newSiteConf, changes, area) => void)[]} = {};

  //#region lifecycle
  constructor(settings: Settings, site: string) {
    this.settings = settings;
    this.data = settings.active.sites[site];
    this.site = site;
    this.defaultSettings = settings.default.sites['@global'];

    this.compileSettingsObject();

    // temporary data starts as a copy of real data. This ensures defaults are correct if nothing
    // modifies temporary settings. (Purpose: providing until-reload persistence option)
    this.temporaryData = _cp(this.data);

    this.sessionData = JSON.parse(sessionStorage.getItem('uw-session-defaults'));
    if (!this.sessionData) {
      this.sessionData = _cp(this.data);
      sessionStorage.setItem('uw-session-defaults', JSON.stringify(this.sessionData));
    }

    browser.storage.onChanged.addListener((changes, area) => {this.storageChangeListener(changes, area)})
  }

  /**
   * Merges defaultSettings into site settings where appropriate.
   * Alan pls ensure default settings object follows the correct structure
   */
  private compileSettingsObject() {
    this.raw = _cp(this.settings.active.sites[this.site] ?? {})

    if (!this.data) {
      this.data = _cp(this.defaultSettings);
      return;
    }

    if (!this.data.defaults) {
      this.data.defaults = _cp(this.defaultSettings.defaults);
    } else {
      // 'undefined' default here means use default
      this.data.defaults.crop = this.data.defaults.crop ?? _cp(this.defaultSettings.defaults.crop);

      // these can contain default options, but can also be undefined
      if (this.data.defaults?.stretch === StretchType.Default || this.data.defaults?.stretch === undefined) {
        this.data.defaults.stretch = _cp(this.defaultSettings.defaults.stretch ?? StretchType.NoStretch);
      }
      if (this.data.defaults?.alignment === undefined) {  // distinguish between undefined and 0!
        this.data.defaults.alignment = _cp(this.defaultSettings.defaults.alignment ?? {x: VideoAlignmentType.Center, y: VideoAlignmentType.Center});
      } else {
        if (this.data.defaults?.alignment.x === VideoAlignmentType.Default) {
          this.data.defaults.alignment.x = _cp(this.defaultSettings.defaults.alignment.x ?? VideoAlignmentType.Center);
        }
        if (this.data.defaults.alignment.y === VideoAlignmentType.Default) {
          this.data.defaults.alignment.y = _cp(this.defaultSettings.defaults.alignment.y ?? VideoAlignmentType.Center);
        }
      }
    }

    for (const enableSegment of ['enable', 'enableAard', 'enableKeyboard']) {
      if (!this.data[enableSegment]) {
        this.data[enableSegment] = {};
      }
      for (const environment of ['normal', 'theater', 'fullscreen']) {
        if (!this.data[enableSegment][environment] || this.data[enableSegment][environment] === ExtensionMode.Default) {
          this.data[enableSegment][environment] = _cp(this.defaultSettings[enableSegment][environment]);
        }
      }
    }

    if (!this.data.persistCSA || this.data.persistCSA === CropModePersistence.Default) {
      this.data.persistCSA = this.defaultSettings.persistCSA ?? CropModePersistence.Disabled;
    }

    if (this.data.activeDOMConfig && this.data.DOMConfig) {
      this.data.currentDOMConfig = this.data.DOMConfig[this.data.activeDOMConfig];
    }
  }
  //#endregion

  //#region events
  /**
   * Updates setting values for current and default site
   * @param changes
   * @param area
   * @returns
   */
  private storageChangeListener(changes, area) {
    if (!changes.uwSettings) {
      return;
    }

    const parsedSettings = JSON.parse(changes.uwSettings.newValue);
    this.data = parsedSettings.sites[this.site];

    // we ignore 'readonly' property this once
    (this as any).defaultSettings = parsedSettings.sites['@global'];

    this.compileSettingsObject();

    console.log('changes:', parsedSettings);

    // trigger any subscriptions on change
    if (parsedSettings._updateFlags) {
      console.log('update flags yay!')
      if (parsedSettings._updateFlags?.forSite === this.site) {
        if (parsedSettings._updateFlags?.requireReload === true) {
          for (const key in this.storageChangeSubscriptions) {
            if (!this.storageChangeSubscriptions[key]) {
              continue;
            }
            for (const fn of this.storageChangeSubscriptions[key]) {
              fn(this, changes, area);
            }
          }
        }
        else if (parsedSettings._updateFlags?.requireReload) {
          for (const key of parsedSettings._updateFlags?.requireReload) {
            console.log('reload required for:', key, this.storageChangeSubscriptions);

            if (! this.storageChangeSubscriptions[key]) continue;

            for (const fn of this.storageChangeSubscriptions[key]) {
              fn(this, changes, area);
            }
          }
        }
      }

      // we aren't stepping on any other toes by doing this, since everyone
      // gets the first change
      this.settings.active._updateFlags = undefined;
      this.settings.saveWithoutReload();
    }
  }

  subscribeToStorageChange(component: SettingsReloadComponent, fn: (newSiteConf, changes, area) => void) {
    if (!this.storageChangeSubscriptions[component]) {
      this.storageChangeSubscriptions[component] = [];
    }
    this.storageChangeSubscriptions[component].push(fn);
  }
  unsubscribeToStorageChange(component: SettingsReloadComponent, fn: (newSiteConf, changes, area) => void) {
    if (this.storageChangeSubscriptions[component]) {
      this.storageChangeSubscriptions[component] = this.storageChangeSubscriptions[component].filter(x => x != fn);
    }
  }
  //#endregion

  //#region get shit
  /**
   * Gets custom query selector for player or video, if configuration for it exists, is manually defined, and has querySelectors property.
   * @param element player or video
   * @returns querySelector if possible, undefined otherwise
   */
  getCustomDOMQuerySelector(element: 'video' | 'player'): string | undefined {
    return this.data.currentDOMConfig?.elements?.[element]?.manual && this.data.currentDOMConfig?.elements?.[element]?.querySelectors || undefined;
  }

  /**
   * Gets custom element index for player, if configuration for player exists, is manually defined, and has index property defined.
   * NOTE: while querySelector should take priority over index, this function does NOT take that into account.
   * @returns parent element index if possible, undefined otherwise
   */
  getPlayerIndex(): number | undefined {
    return this.data.currentDOMConfig?.elements?.player?.manual && this.data.currentDOMConfig?.elements?.player?.index || undefined;
  }

  /**
   * Gets default crop mode for extension, while taking persistence settings into account
   */
  getDefaultOption(option: 'crop' | 'stretch' | 'alignment') {
    const persistenceLevel = this.data.persistCSA;

    switch (persistenceLevel) {
      case CropModePersistence.UntilPageReload:
        return this.temporaryData.defaults[option];
      case CropModePersistence.CurrentSession:
        return this.sessionData.defaults[option];
      case CropModePersistence.Disabled:
      case CropModePersistence.Default:
      case CropModePersistence.Forever:
      default:
        return this.data.defaults[option];
    }
  }

  private _getEnvironment(isTheater: boolean, isFullscreen: boolean): 'fullscreen' | 'theater' | 'normal' {
    if (isFullscreen) {
      return 'fullscreen';
    }
    if (isTheater) {
      return 'theater';
    }
    return 'normal';
  }

  /**
   * Is extension allowed to run in current environment
   * @param isTheater
   * @param isFullscreen
   * @returns ExtensionMode
   */
  isEnabledForEnvironment(isTheater: boolean, isFullscreen: boolean) {
    const env = this._getEnvironment(isTheater, isFullscreen);
    return this.data.enable[env];
  }

  /**
   * Is autodetection allowed to run, given current environment
   * @param isTheater
   * @param isFullscreen
   * @returns
   */
  isAardEnabledForEnvironment(isTheater: boolean, isFullscreen: boolean) {
    const env = this._getEnvironment(isTheater, isFullscreen);
    return this.data.enableAard[env];
  }

  /**
   * Returns whether keyboard interactions are enabled in current environment
   * @param isTheater
   * @param isFullscreen
   * @returns
   */
  isKeyboardEnabledForEnvironment(isTheater: boolean, isFullscreen: boolean) {
    const env = this._getEnvironment(isTheater, isFullscreen);
    return this.data.enableKeyboard[env];
  }

  //#endregion

  //#region get
  /**
   * Gets DOMConfig. If DOMConfig with given name doesn't exist, we create a new one.
   * @param configName We want to fetch this DOM config
   * @param copyFrom If DOMConfig data doesn't exist, we copy things from DOMConfig with
   *                 this name. If DOMConfig with this name doesn't exist, we copy last
   *                 active DOMConfig. If that fails, we copy original DOMConfig.
   * @returns Current DOMConfig object for this site
   */
  getDOMConfig(configName: string, copyFrom?: string) {
    if (! this.data.DOMConfig[configName]) {
      this.data.DOMConfig[configName] = _cp(this.data.DOMConfig[copyFrom ?? this.data.activeDOMConfig ?? 'original']);
    }
    return this.data.currentDOMConfig[configName];
  }
  //#endregion

  //#region set shit
  /**
   * Sets option value.
   * @param optionPath path to value in object notation (dot separated)
   * @param optionValue new value of option
   * @param reload whether we should trigger a reload in components that require it
   */
  async set(optionPath: string, optionValue: any, options: {reload?: boolean, noSave?: boolean} = {reload: false}) {
    // if no settings exist for this site, create an empty object
    if (!this.settings.active.sites[this.site]) {
      this.settings.active.sites[this.site] = _cp(this.settings.active.sites['@empty']);
    }

    const pathParts = optionPath.split('.');

    if (pathParts.length === 1) {
      this.settings.active.sites[this.site][optionPath] = optionValue;
    } else {
      let iterator = this.settings.active.sites[this.site];
      let i;
      let iterated = '';

      for (i = 0; i < pathParts.length - 1; i++) {
        iterated = `${iterated}.${pathParts[i]}`

        if (!iterator[pathParts[i]]) { // some optional paths may still be undefined, even after cloning empty object
          iterator[pathParts[i]] = {};
        }
        iterator = iterator[pathParts[i]];
      }
      iterated = `${iterated}.${pathParts[i]}`

      iterator[pathParts[i]] = optionValue;
    }

    if (! options.noSave) {
      if (options.reload) {
        await this.settings.save();
      } else {
        await this.settings.saveWithoutReload();
      }
    }
  }

  async setUpdateFlags(flags: SettingsReloadFlags) {
    this.settings.active._updateFlags = {
      requireReload: flags,
      forSite: this.site
    };
  }


  /**
   * Sets temporary option value (for Persistence.UntilReload)
   * @param optionPath path to value in object notation (dot separated)
   * @param optionValue new value of option
   */
  setTemporary(optionPath: string, optionValue: any) {
    const pathParts = optionPath.split('.');

    let iterator = this.temporaryData;
    let i;
    for (i = 0; i < pathParts.length - 1; i++) {
      iterator = iterator[pathParts[i]];
    }
    iterator[pathParts[i]] = optionValue;
  }

  /**
   * Sets option value to sessionStorage (for Persistence.CurrentSession)
   * @param optionPath path to value in object notation (dot separated)
   * @param optionValue new value of option
   */
  setSession(optionPath: string, optionValue: any) {
    const pathParts = optionPath.split('.');

    let iterator = this.sessionData;
    let i;
    for (i = 0; i < pathParts.length - 1; i++) {
      iterator = iterator[pathParts[i]];
    }
    iterator[pathParts[i]] = optionValue;

    sessionStorage.setItem('uw-session-defaults', JSON.stringify(this.sessionData));
  }

  /**
   * Updates options while accounting for persistence settings
   * @param option
   * @param value
   * @returns
   */
  async updatePersistentOption(option: 'crop' | 'stretch' | 'alignment', value) {
    const persistenceLevel = this.data.persistCSA;
    switch (persistenceLevel) {
      case CropModePersistence.Disabled:
        return;
      case CropModePersistence.UntilPageReload:
        return this.temporaryData.defaults[option] = value;
      case CropModePersistence.CurrentSession:
        this.sessionData.defaults[option] = value;
        return sessionStorage.setItem('uw-session-defaults', JSON.stringify(this.sessionData));
      case CropModePersistence.Forever:
        return this.set(`defaults.${option}`, value);  // async, but we don't care in this case IIRC
      default:
        return;
    }
  }
  //#endregion

}
