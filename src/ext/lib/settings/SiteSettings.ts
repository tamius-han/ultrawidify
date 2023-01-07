import CropModePersistence from '../../../common/enums/CropModePersistence.enum';
import ExtensionMode from '../../../common/enums/ExtensionMode.enum';
import { SiteSettingsInterface } from '../../../common/interfaces/SettingsInterface';
import { _cp } from '../../../common/js/utils';
import Settings from '../Settings';
import { browser } from 'webextension-polyfill-ts';

export class SiteSettings {
  private settings: Settings;
  private site: string;;

  data: SiteSettingsInterface;
  temporaryData: SiteSettingsInterface;
  sessionData: SiteSettingsInterface;
  private defaultSettings: SiteSettingsInterface;

  //#region lifecycle
  constructor(settings: Settings, site: string) {
    this.settings = settings;
    this.data = settings.active.sites[site];
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
    if (!this.data) {
      this.data = _cp(this.defaultSettings);
      return;
    }

    this.data.defaultCrop = this.data.defaultCrop ?? _cp(this.defaultSettings.defaultCrop);
    this.data.defaultStretch = this.data.defaultStretch ?? _cp(this.defaultSettings.defaultStretch);


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

    // ensure data.persistOption exists:
    if (!this.data.persistOption) {
      this.data.persistOption = {} as any;  // this will get populated correctly soon
    }
    for (const persistOption of ['crop', 'stretch', 'alignment']) {
      if ( (this.data.persistOption[persistOption] ?? CropModePersistence.Default) === CropModePersistence.Default ) {
        this.data.persistOption[persistOption] = this.defaultSettings.persistOption[persistOption];
      }
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
    this.data = parsedSettings.active.sites[this.site];
    this.defaultSettings = parsedSettings.active.sites['@global'];

    this.compileSettingsObject();
  }
  //#endregion

  /**
   * Gets custom query selector for player or video, if element exists, is manually defined, and has querySelectors property.
   * @param element player or video
   * @returns querySelector if possible, undefined otherwise
   */
  getCustomDOMQuerySelector(element: 'video' | 'player'): string | undefined {
    return this.data.currentDOMConfig?.elements?.[element]?.manual && this.data.currentDOMConfig?.elements?.[element]?.querySelectors || undefined;
  }

  /**
   * Sets option value.
   * @param optionPath path to value in object notation (dot separated)
   * @param optionValue new value of option
   * @param reload whether we should trigger a reload in components that require it
   */
  async set(optionPath: string, optionValue: any, reload: boolean = false) {
    // if no settings exist for this site, create an empty object
    if (!this.settings.active.sites[this.site]) {
      this.settings.active.sites[this.site] = _cp(this.settings.active.sites['@empty']);
    }

    const pathParts = optionPath.split('.');

    let iterator = this.settings.active.sites[this.site];
    let i;
    for (i = 0; i < pathParts.length - 1; i++) {
      iterator = iterator[pathParts[i]];
    }
    iterator[pathParts[i]] = optionValue;

    if (reload) {
      this.settings.save();
    } else {
      this.settings.saveWithoutReload();
    }
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
   * Gets default crop mode for extension, while taking persistence settings into account
   */
  getDefaultOption(option: 'crop' | 'stretch' | 'alignment') {
    const persistenceLevel = this.data.persistOption[option];

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

  /**
   * Updates options while accounting for persistence settings
   * @param option
   * @param value
   * @returns
   */
  async updatePersistentOption(option: 'crop' | 'stretch' | 'alignment', value) {
    const persistenceLevel = this.data.persistOption[option];
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

}
