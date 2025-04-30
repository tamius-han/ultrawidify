import Debug from '../conf/Debug';
import currentBrowser from '../conf/BrowserDetect';
import ExtensionConf from '../conf/ExtensionConf';
import ExtensionMode from '../../common/enums/ExtensionMode.enum';
import ObjectCopy from './ObjectCopy';
import StretchType from '../../common/enums/StretchType.enum';
import VideoAlignmentType from '../../common/enums/VideoAlignmentType.enum';
import ExtensionConfPatch from '../conf/ExtConfPatches';
import CropModePersistence from '../../common/enums/CropModePersistence.enum';
import BrowserDetect from '../conf/BrowserDetect';
import Logger from './Logger';
import SettingsInterface from '../../common/interfaces/SettingsInterface';
import AspectRatioType from '../../common/enums/AspectRatioType.enum';
import { SiteSettings } from './settings/SiteSettings';
import { SettingsSnapshotManager } from './settings/SettingsSnapshotManager';
import { ComponentLogger } from './logging/ComponentLogger';
import { LogAggregator } from './logging/LogAggregator';

if(process.env.CHANNEL !== 'stable'){
  console.info("Loading Settings");
}

interface SettingsOptions {
  logAggregator: LogAggregator,
  onSettingsChanged?: () => void,
  afterSettingsSaved?: () => void,
  activeSettings?: SettingsInterface,
}

interface SetSettingsOptions {
  forcePreserveVersion?: boolean,
}

const SETTINGS_LOGGER_STYLES = {
  log: 'color: #81d288',
}

class Settings {
  //#region flags
  useSync: boolean = false;
  version: string;
  //#endregion

  //#region helper classes

  logAggregator: LogAggregator;
  logger: ComponentLogger;
  //#endregion

  //#region data
  default: SettingsInterface;  // default settings
  active: SettingsInterface;   // currently active settings
  //#endregion

  //#region callbacks
  onSettingsChanged: any;
  afterSettingsSaved: any;

  onChangedCallbacks: (() => void)[] = [];
  afterSettingsChangedCallbacks: (() => void)[] = [];


  public snapshotManager: SettingsSnapshotManager;

  //#endregion

  constructor(options: SettingsOptions) {
    // Options: activeSettings, updateCallback, logger
    this.logger = options.logAggregator && new ComponentLogger(options.logAggregator, 'Settings', {styles: SETTINGS_LOGGER_STYLES}) || undefined;;
    this.onSettingsChanged = options.onSettingsChanged;
    this.afterSettingsSaved = options.afterSettingsSaved;
    this.active = options.activeSettings ?? undefined;
    this.default = ExtensionConf;
    this.snapshotManager = new SettingsSnapshotManager();

    this.default['version'] = this.getExtensionVersion();

    chrome.storage.onChanged.addListener((changes, area) => {this.storageChangeListener(changes, area)});
  }

  private storageChangeListener(changes, area) {
    if (!changes.uwSettings) {
      return;
    }
    this.logger?.info('storageOnChange', "Settings have been changed outside of here. Updating active settings. Changes:", changes, "storage area:", area);
    // if (changes['uwSettings'] && changes['uwSettings'].newValue) {
    //   this.logger?.log('info', 'settings',"[Settings::<storage/on change>] new settings object:", JSON.parse(changes.uwSettings.newValue));
    // }
    const parsedSettings = JSON.parse(changes.uwSettings.newValue);
    this.setActive(parsedSettings);

    this.logger?.info('storageOnChange', 'Does parsedSettings.preventReload exist?', parsedSettings.preventReload, "Does callback exist?", !!this.onSettingsChanged);

    if (!parsedSettings.preventReload) {
      try {
        for (const fn of this.onChangedCallbacks) {
          try {
            fn();
          } catch (e) {
            this.logger?.warn('storageOnChange',  "afterSettingsChanged fallback failed. It's possible that a vue component got destroyed, and this function is nothing more than vestigal remains. It would be nice if we implemented something that allows us to remove callback functions from array, and remove vue callbacks from the callback array when their respective UI component gets destroyed. Or this could be an error with the function itself. IDK, here's the error.", e)
          }
        }
        if (this.onSettingsChanged) {
          this.onSettingsChanged();
        }

        this.logger?.info('storageOnChange', 'Update callback finished.')
      } catch (e) {
        this.logger?.error('storageOnChange', "CALLING UPDATE CALLBACK FAILED. Reason:", e)
      }
    }
    for (const fn of this.afterSettingsChangedCallbacks) {
      try {
        fn();
      } catch (e) {
        this.logger?.warn('storageOnChange',  "afterSettingsChanged fallback failed. It's possible that a vue component got destroyed, and this function is nothing more than vestigal remains. It would be nice if we implemented something that allows us to remove callback functions from array, and remove vue callbacks from the callback array when their respective UI component gets destroyed. Or this could be an error with the function itself. IDK, here's the error.", e)
      }
    }
    if (this.afterSettingsSaved) {
      this.afterSettingsSaved();
    }
  }

  static getExtensionVersion(): string {
    return chrome.runtime.getManifest().version;
  }
  getExtensionVersion(): string {
    return Settings.getExtensionVersion();
  }

  private compareExtensionVersions(a, b) {
    let aa = a.split('.');
    let bb = b.split('.');

    if (+aa[0] !== +bb[0]) {
      // difference on first digit
      return +aa[0] - +bb[0];
    } if (+aa[1] !== +bb[1]) {
      // first digit same, difference on second digit
      return  +aa[1] - +bb[1];
    } if (+aa[2] !== +bb[2]) {
      return  +aa[2] - +bb[2];
      // first two digits the same, let's check the third digit
    } else {
      // fourth digit is optional. When not specified, 0 is implied
      // btw, ++(aa[3] || 0) - ++(bb[3] || 0) doesn't work

      // Since some things are easier if we actually have a value for
      // the fourth digit, we turn a possible undefined into a zero
      aa[3] = aa[3] === undefined ? 0 : aa[3];
      bb[3] = bb[3] === undefined ? 0 : bb[3];

      // also, the fourth digit can start with a letter.
      // versions that start with a letter are ranked lower than
      // versions x.x.x.0
      if (
        (isNaN(+aa[3]) && !isNaN(+bb[3]))
        || (!isNaN(+aa[3]) && isNaN(+bb[3]))
      ) {
        return isNaN(+aa[3]) ? -1 : 1;
      }

      // at this point, either both version numbers are a NaN or
      // both versions are a number.
      if (!isNaN(+aa[3])) {
        return +aa[3] - +bb[3];
      }

      // letters have their own hierarchy:
      // dev < a < b < rc
      let av = this.getPrereleaseVersionHierarchy(aa[3]);
      let bv = this.getPrereleaseVersionHierarchy(bb[3]);

      if (av !== bv) {
        return av - bv;
      } else {
        return +(aa[3].replace(/\D/g,'')) - +(bb[3].replace(/\D/g, ''));
      }
    }
  }

  private getPrereleaseVersionHierarchy(version) {
    if (version.startsWith('dev')) {
      return 0;
    }
    if (version.startsWith('a')) {
      return 1;
    }
    if (version.startsWith('b')) {
      return 2;
    }
    return 3;
  }

  private sortConfPatches(patchesIn) {
    return patchesIn.sort( (a, b) => this.compareExtensionVersions(a.forVersion, b.forVersion));
  }

  private findFirstNecessaryPatch(version) {
    return ExtensionConfPatch.findIndex(x => this.compareExtensionVersions(x.forVersion, version) > 0);
  }
  private applySettingsPatches(oldVersion) {
    let index = this.findFirstNecessaryPatch(oldVersion);

    if (index === -1) {
      this.logger?.info('applySettingsPatches','There are no pending conf patches.');
      return;
    }

    // save current settings object
    const currentSettings = this.active;

    this.snapshotManager.createSnapshot(
      JSON.parse(JSON.stringify(currentSettings)),
      {
        label: 'Pre-migration snapshot',
        isAutomatic: true
      }
    );


    // apply all remaining patches
    this.logger?.info('applySettingsPatches', `There are ${ExtensionConfPatch.length - index} settings patches to apply`);
    while (index < ExtensionConfPatch.length) {
      const updateFn =  ExtensionConfPatch[index].updateFn;
      if (updateFn) {
        try {
          updateFn(this.active, this.getDefaultSettings());
        } catch (e) {
          this.logger?.error('applySettingsPatches', 'Failed to execute update function. Keeping settings object as-is. Error:', e);
        }
      }

      index++;
    }
  }

  async init() {
    let settings = await this.get();

    if (settings?.dev?.loadFromSnapshot) {
      this.logger?.info('init', 'Dev mode is enabled, Loading settings from snapshot:', settings.dev.loadFromSnapshot);
      const snapshot = await this.snapshotManager.getSnapshot();
      if (snapshot) {
        settings = snapshot.settings;
      }
    }

    this.version = this.getExtensionVersion();

    //                 |—> on first setup, settings is undefined & settings.version is haram
    //                 |   since new installs ship with updates by default, no patching is
    //                 |   needed. In this case, we assume we're on the current version
    const oldVersion = settings?.version ?? this.version;

    if (settings) {
      this.logger?.info('init', "Configuration fetched from storage:", settings,
                                          "\nlast saved with:", settings.version,
                                          "\ncurrent version:", this.version
      );
    }

    // if there's no settings saved, return default settings.
    if(! settings || (Object.keys(settings).length === 0 && settings.constructor === Object)) {
      this.logger?.info(
        'init',
        'settings don\'t exist. Using defaults.\n#keys:',
        settings ? Object.keys(settings).length : 0,
        '\nsettings:',
        settings
      );
      this.active = this.getDefaultSettings();
      this.active.version = this.version;
      await this.save();

      return this.active;
    }

    // if there's settings, set saved object as active settings
    this.active = settings;

    // if version number is undefined, we make it defined
    // this should only happen on first extension initialization
    if (!this.active.version) {
      this.active.version = this.version;
      await this.save();
      return this.active;
    }

    // check if extension has been updated. If not, return settings as they were retrieved
    if (this.active.version === this.version) {
      this.logger?.info('init', "extension was saved with current version of ultrawidify. Returning object as-is.");
      return this.active;
    }

    // This means extension update happened.
    // btw fun fact — we can do version rollbacks, which might come in handy while testing
    this.active.version = this.version;

    // if extension has been updated, update existing settings with any options added in the
    // new version. In addition to that, we remove old keys that are no longer used.
    const patched = ObjectCopy.addNew(settings, this.default);
    this.logger?.info('init',"Results from ObjectCopy.addNew()?", patched, "\n\nSettings from storage", settings, "\ndefault?", this.default);

    if (patched) {
      this.active = patched;
    }

    // in case settings in previous version contained a fucky wucky, we overwrite existing settings with a patch
    this.applySettingsPatches(oldVersion);

    // set 'whatsNewChecked' flag to false when updating, always
    this.active.whatsNewChecked = false;
    // update settings version to current
    this.active.version = this.version;

    await this.save();
    return this.active;
  }

  async get(): Promise<SettingsInterface | undefined> {
    let ret;

    ret = await chrome.storage.local.get('uwSettings');

    this.logger?.info('get', 'Got settings:', ret && ret.uwSettings && JSON.parse(ret.uwSettings));

    try {
      return JSON.parse(ret.uwSettings) as SettingsInterface;
    } catch(e) {
      return undefined;
    }
  }

  async set(extensionConf, options?: SetSettingsOptions) {
    if (!options || !options.forcePreserveVersion) {
      extensionConf.version = this.version;
    }
    this.logger?.info('set', "setting new settings:", extensionConf)

    return chrome.storage.local.set( {'uwSettings': JSON.stringify(extensionConf)});
  }

  async setActive(activeSettings) {
    this.active = activeSettings;
  }

  /**
   * Sets value of a prop at given path.
   * @param propPath path to property we want to set. If prop path does not exist,
   * this function will recursively create it. It is assumed that uninitialized properties
   * are objects.
   * @param value
   */
  async setProp(propPath: string | string[], value: any, options?: {forceReload?: boolean}, currentPath?: any) {
    if (!Array.isArray(propPath)) {
      propPath = propPath.split('.');
    }

    if (!currentPath) {
      currentPath = this.active;
    }

    const currentProp = propPath.shift();

    if (propPath.length) {
      if (!currentPath[currentProp]) {
        currentPath[currentProp] = {};
      }
      return this.setProp(propPath, value, options, currentPath[currentProp]);
    } else {
      currentPath[currentProp] = value;

      if (options?.forceReload) {
        return this.save();
      } else {
        return this.saveWithoutReload();
      }
    }
  }

  async save(options?: SetSettingsOptions) {
    if (Debug.debug && Debug.storage) {
      console.log("[Settings::save] Saving active settings — save options", options, "; settings:", this.active);
    }
    this.active.preventReload = undefined;
    this.active.lastModified = new Date();
    await this.set(this.active, options);
  }


  async saveWithoutReload(options?: SetSettingsOptions) {
    this.active.preventReload = true;
    this.active.lastModified = new Date();
    await this.set(this.active, options);
  }

  async rollback() {
    this.active = await this.get();
  }

  getDefaultSettings() {
    return JSON.parse(JSON.stringify(this.default));
  }

  /**
   * Gets default site configuration. Only returns essential settings.
   * @returns
   */
  getDefaultSiteConfiguration() {
    return {
      type: 'user-added',
      defaultCrop: {
        type: AspectRatioType.Automatic,    // AARD is enabled by default
      },
      defaultStretch: {
        type: StretchType.NoStretch,        // because we aren't uncultured savages
      },
    }
  }

  getSiteSettings(site: string = window.location.hostname): SiteSettings {
    return new SiteSettings(this, site);
  }

  listenOnChange(fn: () => void): void {
    this.onChangedCallbacks.push(fn);
  }
  removeOnChangeListener(fn: () => void): void {
    this.onChangedCallbacks = this.afterSettingsChangedCallbacks.filter(x => x !== fn);
  }
  listenAfterChange(fn: () => void): void {
    this.afterSettingsChangedCallbacks.push(fn);
  }
  removeAfterChangeListener(fn: () => void): void {
    this.afterSettingsChangedCallbacks = this.afterSettingsChangedCallbacks.filter(x => x !== fn);
  }
}

export default Settings;

if(process.env.CHANNEL !== 'stable'){
  console.info("Settings loaded");
}
