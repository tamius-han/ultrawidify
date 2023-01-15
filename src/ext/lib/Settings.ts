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
import { browser } from 'webextension-polyfill-ts';
import AspectRatioType from '../../common/enums/AspectRatioType.enum';
import { SiteSettings } from './settings/SiteSettings';

if(process.env.CHANNEL !== 'stable'){
  console.info("Loading Settings");
}


class Settings {
  //#region flags
  useSync: boolean = false;
  version: string;
  //#endregion

  //#region helper classes
  logger: Logger;
  //#endregion

  //#region data
  default: SettingsInterface;  // default settings
  active: SettingsInterface;   // currently active settings
  //#endregion

  //#region callbacks
  onSettingsChanged: any;
  afterSettingsSaved: any;
  //#endregion

  constructor(options) {
    // Options: activeSettings, updateCallback, logger
    this.logger = options?.logger;
    this.onSettingsChanged = options?.onSettingsChanged;
    this.afterSettingsSaved = options?.afterSettingsSaved;
    this.active = options?.activeSettings ?? undefined;
    this.default = ExtensionConf;
    this.default['version'] = this.getExtensionVersion();

    browser.storage.onChanged.addListener((changes, area) => {this.storageChangeListener(changes, area)});
  }

  private storageChangeListener(changes, area) {
    if (!changes.uwSettings) {
      return;
    }
    this.logger?.log('info', 'settings', "[Settings::<storage/on change>] Settings have been changed outside of here. Updating active settings. Changes:", changes, "storage area:", area);
    // if (changes['uwSettings'] && changes['uwSettings'].newValue) {
    //   this.logger?.log('info', 'settings',"[Settings::<storage/on change>] new settings object:", JSON.parse(changes.uwSettings.newValue));
    // }
    const parsedSettings = JSON.parse(changes.uwSettings.newValue);
    this.setActive(parsedSettings);

    this.logger?.log('info', 'debug', 'Does parsedSettings.preventReload exist?', parsedSettings.preventReload, "Does callback exist?", !!this.onSettingsChanged);

    if (!parsedSettings.preventReload && this.onSettingsChanged) {
      try {
        this.onSettingsChanged();

        this.logger?.log('info', 'settings', '[Settings] Update callback finished.')
      } catch (e) {
        this.logger?.log('error', 'settings', "[Settings] CALLING UPDATE CALLBACK FAILED. Reason:", e)
      }
    }
    if (this.afterSettingsSaved) {
      this.afterSettingsSaved();
    }
  }

  static getExtensionVersion(): string {
    return browser.runtime.getManifest().version;
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

  private findFirstNecessaryPatch(version, extconfPatches) {
    const sorted = this.sortConfPatches(extconfPatches);
    return sorted.findIndex(x => this.compareExtensionVersions(x.forVersion, version) > 0);
  }
  private applySettingsPatches(oldVersion, patches) {
    let index = this.findFirstNecessaryPatch(oldVersion, patches);
    if (index === -1) {
      this.logger?.log('info','settings','[Settings::applySettingsPatches] There are no pending conf patches.');
      return;
    }

    // apply all remaining patches
    this.logger?.log('info', 'settings', `[Settings::applySettingsPatches] There are ${patches.length - index} settings patches to apply`);
    while (index < patches.length) {
      const updateFn = patches[index].updateFn;
      delete patches[index].forVersion;
      delete patches[index].updateFn;

      if (Object.keys(patches[index]).length > 0) {
        ObjectCopy.overwrite(this.active, patches[index]);
      }
      if (updateFn) {

        try {
          updateFn(this.active, this.getDefaultSettings());
        } catch (e) {
          this.logger?.log('error', 'settings', '[Settings::applySettingsPatches] Failed to execute update function. Keeping settings object as-is. Error:', e);
        }
      }

      index++;
    }
  }

  async init() {
    const settings = await this.get();
    this.version = this.getExtensionVersion();

    //                 |—> on first setup, settings is undefined & settings.version is haram
    //                 |   since new installs ship with updates by default, no patching is
    //                 |   needed. In this case, we assume we're on the current version
    const oldVersion = (settings && settings.version) || this.version;

    if (settings) {
      this.logger?.log('info', 'settings', "[Settings::init] Configuration fetched from storage:", settings,
                                          "\nlast saved with:", settings.version,
                                          "\ncurrent version:", this.version
      );
    }

    // if (Debug.flushStoredSettings) {
    //   this.logger?.log('info', 'settings', "%c[Settings::init] Debug.flushStoredSettings is true. Using default settings", "background: #d00; color: #ffd");
    //   Debug.flushStoredSettings = false; // don't do it again this session
    //   this.active = this.getDefaultSettings();
    //   this.active.version = this.version;
    //   this.set(this.active);
    //   return this.active;
    // }

    // if there's no settings saved, return default settings.
    if(! settings || (Object.keys(settings).length === 0 && settings.constructor === Object)) {
      this.logger?.log(
        'info',
        'settings',
        '[Settings::init] settings don\'t exist. Using defaults.\n#keys:',
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
      this.logger?.log('info', 'settings', "[Settings::init] extension was saved with current version of ultrawidify. Returning object as-is.");
      return this.active;
    }

    // This means extension update happened.
    // btw fun fact — we can do version rollbacks, which might come in handy while testing
    this.active.version = this.version;

    // if extension has been updated, update existing settings with any options added in the
    // new version. In addition to that, we remove old keys that are no longer used.
    const patched = ObjectCopy.addNew(settings, this.default);
    this.logger?.log('info', 'settings',"[Settings.init] Results from ObjectCopy.addNew()?", patched, "\n\nSettings from storage", settings, "\ndefault?", this.default);

    if (patched) {
      this.active = patched;
    }

    // in case settings in previous version contained a fucky wucky, we overwrite existing settings with a patch
    this.applySettingsPatches(oldVersion, ExtensionConfPatch);

    // set 'whatsNewChecked' flag to false when updating, always
    this.active.whatsNewChecked = false;
    // update settings version to current
    this.active.version = this.version;

    await this.save();
    return this.active;
  }

  async get() {
    let ret;

    ret = await browser.storage.local.get('uwSettings');

    this.logger?.log('info', 'settings', 'Got settings:', ret && ret.uwSettings && JSON.parse(ret.uwSettings));

    try {
      return JSON.parse(ret.uwSettings);
    } catch(e) {
      return undefined;
    }
  }

  async set(extensionConf, options?) {
    if (!options || !options.forcePreserveVersion) {
      extensionConf.version = this.version;
    }

    this.logger?.log('info', 'settings', "[Settings::set] setting new settings:", extensionConf)

    return browser.storage.local.set( {'uwSettings': JSON.stringify(extensionConf)});
  }

  async setActive(activeSettings) {
    this.active = activeSettings;
  }

  async setProp(prop, value) {
    this.active[prop] = value;
  }

  async save(options?) {
    if (Debug.debug && Debug.storage) {
      console.log("[Settings::save] Saving active settings:", this.active);
    }
    this.active.preventReload = undefined;
    await this.set(this.active, options);
  }


  async saveWithoutReload() {
    this.active.preventReload = true;
    await this.set(this.active);
  }

  async rollback() {
    this.active = await this.get();
  }

  getDefaultSettings() {
    return JSON.parse(JSON.stringify(this.default));
  }

  getDefaultOption(option?) {
    const allDefault = {
      mode: ExtensionMode.Default,
      autoar: ExtensionMode.Default,
      autoarFallback: ExtensionMode.Default,
      stretch: StretchType.Default,
      videoAlignment: VideoAlignmentType.Default,
    };

    if (!option || allDefault[option] === undefined) {
      return allDefault;
    }

    return allDefault[option];
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
}

export default Settings;

if(process.env.CHANNEL !== 'stable'){
  console.info("Settings loaded");
}
