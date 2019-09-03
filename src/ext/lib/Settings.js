import Debug from '../conf/Debug';
import currentBrowser from '../conf/BrowserDetect';
import ExtensionConf from '../conf/ExtensionConf';
import ExtensionMode from '../../common/enums/extension-mode.enum';
import ObjectCopy from '../lib/ObjectCopy';
import Stretch from '../../common/enums/stretch.enum';
import VideoAlignment from '../../common/enums/video-alignment.enum';
import ExtensionConfPatch from '../conf/ExtConfPatches';



class Settings {

  constructor(options) {
    // Options: activeSettings, updateCallback, logger
    this.logger = options.logger;
    const activeSettings = options.activeSettings;
    const updateCallback = options.updateCallback;

    this.active = activeSettings ? activeSettings : undefined;
    this.default = ExtensionConf;
    this.default['version'] = this.getExtensionVersion();
    this.useSync = false;
    this.version = undefined;
    this.updateCallback = updateCallback;

    const ths = this;

    if(currentBrowser.firefox) {
      browser.storage.onChanged.addListener( (changes, area) => {
        this.logger.log('info', 'Settings', "[Settings::<storage/on change>] Settings have been changed outside of here. Updating active settings. Changes:", changes, "storage area:", area);
        if (changes['uwSettings'] && changes['uwSettings'].newValue) {
          this.logger.log('info', 'Settings',"[Settings::<storage/on change>] new settings object:", JSON.parse(changes.uwSettings.newValue));
        }
        if(changes['uwSettings'] && changes['uwSettings'].newValue) {
          ths.setActive(JSON.parse(changes.uwSettings.newValue));
        }

        if(this.updateCallback) {
          try {
            updateCallback(ths);
          } catch (e) {
            this.logger.log('error', 'Settings', "[Settings] CALLING UPDATE CALLBACK FAILED.")
          }
        }
      });
    } else if (currentBrowser.chrome) {
      chrome.storage.onChanged.addListener( (changes, area) => {
        this.logger.log('info', 'Settings', "[Settings::<storage/on change>] Settings have been changed outside of here. Updating active settings. Changes:", changes, "storage area:", area);
        if (changes['uwSettings'] && changes['uwSettings'].newValue) {
          this.logger.log('info', 'Settings',"[Settings::<storage/on change>] new settings object:", JSON.parse(changes.uwSettings.newValue));
        }
        if(changes['uwSettings'] && changes['uwSettings'].newValue) {
          ths.setActive(JSON.parse(changes.uwSettings.newValue));
        }

        if(this.updateCallback) {
          try {
            updateCallback(ths);
          } catch (e) {
            this.logger.log('error', 'Settings',"[Settings] CALLING UPDATE CALLBACK FAILED.")
          }
        }
      });
    }
  }

  getExtensionVersion() {
    if (currentBrowser.firefox) {
      return browser.runtime.getManifest().version;
    } else if (currentBrowser.chrome) {
      return chrome.runtime.getManifest().version;
    } else if (currentBrowser.edge) {
      return browser.runtime.getManifest().version;
    }
  }

  compareExtensionVersions(a, b) {
    aa = a.forVersion.split['.'];
    bb = b.forVersion.split['.'];
    
    if (+aa[0] !== +bb[0]) {
      // difference on first digit
      return ++aa[0] - ++bb[0];
    } if (+aa[1] !== +bb[1]) {
      // first digit same, difference on second digit
      return  ++aa[1] - ++bb[1];
    } if (+aa[2] !== +bb[2]) {
      return  ++aa[2] - ++bb[2];
      // first two digits the same, let's check the third digit
    } else {
      // fourth digit is optional. When not specified, 0 is implied
      // btw, ++(aa[3] || 0) - ++(bb[3] || 0) doesn't work
      return (aa[3] ? ++aa[3] : 0) - (bb[3] ? ++bb[3] : 0);
    }
  }
  sortConfPatches(patchesIn) {
    return patchesIn.sort( (a, b) => this.compareExtensionVersions(a, b));
  }

  findFirstNecessaryPatch(version, extconfPatches) {
    const sorted = this.sortConfPatches(extconfPatches);
    return sorted.findIndexOf(x => this.compareExtensionVersions(x.forVersion, version) > 0);
  }


  applySettingsPatches(oldVersion, patches) {
    let index = this.findFirstNecessaryPatch(oldVersion, patches);
    if (index === -1) {
      // this.logger.log('info','settings','[Settings::applySettingsPatches] There are no pending conf patches.');
      return;
    }

    // apply all remaining patches
    // this.logger.log('info', 'settings', `[Settings::applySettingsPatches] There are ${patches.length - index} settings patches to apply`);
    while (index --< patches.length) {
      delete patches[index].forVersion;
      ObjectCopy.overwrite(this.active, patches[index]);
    } 
  }

  async init() {
    const settings = await this.get();

    //                 |—> on first setup, settings is undefined & settings.version is haram
    //                 |   since new installs ship with updates by default, no patching is
    //                 |   needed. In this case, we assume we're on the current version
    const oldVersion = (settings && settings.version) || this.getExtensionVersion();
    const currentVersion = this.getExtensionVersion();

    if(Debug.debug) {
      this.logger.log('info', 'Settings', "[Settings::init] Configuration fetched from storage:", settings,
                                          "\nlast saved with:", settings.version,
                                          "\ncurrent version:", currentVersion
      );

      if (Debug.flushStoredSettings) {
        this.logger.log('info', 'Settings', "%c[Settings::init] Debug.flushStoredSettings is true. Using default settings", "background: #d00; color: #ffd");
        Debug.flushStoredSettings = false; // don't do it again this session
        this.active = this.getDefaultSettings();
        this.active.version = currentVersion;
        this.set(this.active);
        return this.active;
      }
    }

    // if there's no settings saved, return default settings.
    if(! settings || (Object.keys(settings).length === 0 && settings.constructor === Object)) {
      this.active = this.getDefaultSettings();
      this.active.version = currentVersion;
      this.set(this.active);
      return this.active;
    }

    // if last saved settings was for version prior to 4.x, we reset settings to default
    // it's not like people will notice cos that version didn't preserve settings at all
    if (settings.version && !settings.version.startsWith('4')) {
      this.active = this.getDefaultSettings();
      this.active.version = currentVersion;
      this.set(this.active);
      return this.active;
    }

    // in every case, we'll update the version number:
    settings.version = currentVersion;

    // if there's settings, set saved object as active settings
    this.active = settings;

    // check if extension has been updated. If not, return settings as they were retreived
    

    if (oldVersion == currentVersion) {
      this.logger.log('info', 'Settings', "[Settings::init] extension was saved with current version of ultrawidify. Returning object as-is.");
      return this.active;
    }

    // if extension has been updated, update existing settings with any options added in the
    // new version. In addition to that, we remove old keys that are no longer used.
    const patched = ObjectCopy.addNew(settings, this.default);
    this.logger.log('info', 'Settings',"[Settings.init] Results from ObjectCopy.addNew()?", patched, "\n\nSettings from storage", settings, "\ndefault?", this.default);

    if(patched){
      this.active = patched;
    } else {
      this.active = JSON.parse(JSON.stringify(this.default));
    }

    // in case settings in previous version contained a fucky wucky, we overwrite existing settings with a patch
    this.applySettingsPatches(oldVersion, ExtensionConfPatch);

    // set 'whatsNewChecked' flag to false when updating, always
    this.active.whatsNewChecked = false;
    // update settings version to current
    this.active.version = currentVersion; 

    this.set(this.active);
    return this.active;
  }

  async get() {
    let ret;
    
    if (currentBrowser.firefox) {
      ret = await browser.storage.local.get('uwSettings');
    } else if (currentBrowser.chrome) {
      ret = await new Promise( (resolve, reject) => {
        chrome.storage.local.get('uwSettings', (res) => resolve(res));
      });
    } else if (currentBrowser.edge) {
      ret = await new Promise( (resolve, reject) => {
        browser.storage.local.get('uwSettings', (res) => resolve(res));
      });
    }

    this.logger.log('info', 'Settings', 'Got settings:', ret && ret.uwSettings && JSON.parse(ret.uwSettings));

    try {
      return JSON.parse(ret.uwSettings);
    } catch(e) {
      return undefined;
    }
  }

  async set(extensionConf) {
    this.logger.log('info', 'Settings', "[Settings::set] setting new settings:", extensionConf)

    if (currentBrowser.firefox || currentBrowser.edge) {
      extensionConf.version = this.version;
      return this.useSync ? browser.storage.local.set( {'uwSettings': JSON.stringify(extensionConf)}): browser.storage.local.set( {'uwSettings': JSON.stringify(extensionConf)});
    } else if (currentBrowser.chrome) {
      return chrome.storage.local.set( {'uwSettings': JSON.stringify(extensionConf)});
    }
  }

  async setActive(activeSettings) {
    this.active = activeSettings;
  }

  async setProp(prop, value) {
    this.active[prop] = value;
  }

  async save() {
    if (Debug.debug && Debug.storage) {
      console.log("[Settings::save] Saving active settings:", this.active);
    }

    this.set(this.active);
  }

  async rollback() {
    this.active = await this.get();
  }

  getDefaultSettings() {
    return JSON.parse(JSON.stringify(this.default));
  }

  setDefaultSettings() {
    this.default.version = this.getExtensionVersion();
    this.set(this.default);
  }


  // -----------------------------------------
  // Nastavitve za posamezno stran
  // Config for a given page:
  // 
  // <hostname> : {
  //    status: <option>              // should extension work on this site?
  //    arStatus: <option>            // should we do autodetection on this site?
  //    statusEmbedded: <option>      // reserved for future... maybe
  // } 
  //  
  // Veljavne vrednosti za možnosti 
  // Valid values for options:
  //
  //     status, arStatus, statusEmbedded:
  //    
  //    * enabled     — always allow
  //    * basic       — only allow fullscreen
  //    * default     — allow if default is to allow, block if default is to block
  //    * disabled    — never allow


  getActionsForSite(site) {
    if (!site) {
      return this.active.actions;
    }
    if (this.active.sites[site] && this.active.sites[site].actions && this.active.sites[site].actions.length > 0) {
      return this.active.sites[site].actions;
    }
    return this.active.actions;
  }

  getExtensionMode(site) {
    if (!site) {
      site = window.location.hostname;

      if (!site) {
        this.logger.log('info', 'Settings', `[Settings::canStartExtension] window.location.hostname is null or undefined: ${window.location.hostname} \nactive settings:`, this.active);
        return ExtensionMode.Disabled;
      }
    }

    try {
      // if site-specific settings don't exist for the site, we use default mode:
      if (! this.active.sites[site]) {
        return this.getExtensionMode('@global');
      }

      if (this.active.sites[site].mode === ExtensionMode.Enabled) {
        return ExtensionMode.Enabled;
      } else if (this.active.sites[site].mode === ExtensionMode.Basic) {
        return ExtensionMode.Basic;            
      } else if (this.active.sites[site].mode === ExtensionMode.Default && site !== '@global') {
        return this.getExtensionMode('@global');
      } else {
        return ExtensionMode.Disabled;
      }
  
    } catch(e){
      this.logger.log('error', 'Settings', "[Settings.js::canStartExtension] Something went wrong — are settings defined/has init() been called?\n\nerror:", e, "\n\nSettings object:", this)

      return ExtensionMode.Disabled;
    }
  }

  canStartExtension(site) {
    // returns 'true' if extension can be started on a given site. Returns false if we shouldn't run.
    if (!site) {
      site = window.location.hostname;

      if (!site) {
        this.logger.log('info', 'Settings', `[Settings::canStartExtension] window.location.hostname is null or undefined: ${window.location.hostname} \nactive settings:`, this.active);
        return false;
      }
    }

    // if (Debug.debug) {
    //   // let's just temporarily disable debugging while recursively calling
    //   // this function to get extension status on current site without duplo
    //   // console logs (and without endless recursion)
    //   Debug.debug = false;
    //   const cse = this.canStartExtension(site);
    //   Debug.debug = true;
    // }
    try{
    // if site is not defined, we use default mode:
      if (! this.active.sites[site] || this.active.sites[site].mode === ExtensionMode.Default) {
        return this.active.sites['@global'].mode === ExtensionMode.Enabled;
      }

      if (this.active.sites['@global'].mode === ExtensionMode.Enabled) {
        return this.active.sites[site].mode !== ExtensionMode.Disabled;
      } else if (this.active.sites['@global'].mode === ExtensionMode.Whitelist) {
        return this.active.sites[site].mode === ExtensionMode.Enabled;
      } else {
        return false;
      }
    } catch(e) {
      this.logger.log('error', 'Settings', "[Settings.js::canStartExtension] Something went wrong — are settings defined/has init() been called?\nSettings object:", this);
      return false;
    }
  }

  keyboardShortcutsEnabled(site) {
    if (!site) {
      site = window.location.hostname;
    }
    if (!site) {
      return false;
    }

    try {
      if (!this.active.sites[site] 
          || this.active.sites[site].keyboardShortcutsEnabled === undefined
          || this.active.sites[site].keyboardShortcutsEnabled === ExtensionMode.Default) {
        return this.keyboardShortcutsEnabled('@global');
      } else {
        return this.active.sites[site].keyboardShortcutsEnabled === ExtensionMode.Enabled;
      }
    } catch (e) {
      this.logger.log('info', 'Settings',"[Settings.js::keyboardDisabled] something went wrong:", e);
      return false;
    }
  }

  extensionEnabled(){
    return this.active.sites['@global'] !== ExtensionMode.Disabled
  }

  extensionEnabledForSite(site) {
    return this.canStartExtension(site);
  }

  canStartAutoAr(site) {
    // 'site' argument is only ever used when calling this function recursively for debugging
    if (!site) {
      site = window.location.host;

      if (!site) {
        return false;
      }
    }

    if (Debug.debug) {
      // let's just temporarily disable debugging while recursively calling
      // this function to get extension status on current site without duplo
      // console logs (and without endless recursion)
      Debug.debug = false;
      const csar = this.canStartAutoAr(site);
      Debug.debug = true;

      this.logger.log('info', 'Settings', "[Settings::canStartAutoAr] ----------------\nCAN WE START AUTOAR ON SITE", site,
                                          "?\n\nsettings.active.sites[site]=", this.active.sites[site], "settings.active.sites[@global]=", this.active.sites['@global'],
                                          "\nAutoar mode (global)?", this.active.sites['@global'].autoar,
                                          `\nAutoar mode (${site})`, this.active.sites[site] ? this.active.sites[site].autoar : '<not defined>',
                                          "\nCan autoar be started?", csar
      );
    }

    // if site is not defined, we use default mode:    
    if (! this.active.sites[site]) {
      return this.active.sites['@global'].autoar === ExtensionMode.Enabled;
    }

    if (this.active.sites['@global'].autoar === ExtensionMode.Enabled) {
      return this.active.sites[site].autoar !== ExtensionMode.Disabled;
    } else if (this.active.sites['@global'].autoar === ExtensionMode.Whitelist) {
      this.logger.log('info', 'Settings', "canStartAutoAr — can(not) start csar because extension is in whitelist mode, and this site is (not) equal to", ExtensionMode.Enabled)
      return this.active.sites[site].autoar === ExtensionMode.Enabled;
    } else {
      this.logger.log('info', 'Settings', "canStartAutoAr — cannot start csar because extension is globally disabled")
      return false;
    }
  }

  getDefaultOption(option) {
    const allDefault = {
      mode: ExtensionMode.Default,
      autoar: ExtensionMode.Default,
      autoarFallback: ExtensionMode.Default,
      stretch: Stretch.Default,
      videoAlignment: VideoAlignment.Default,
    };

    if (!option || allDefault[option] === undefined) {
      return allDefault;
    }
    
    return allDefault[option];
  }

  getDefaultAr(site) {
    // site = this.getSiteSettings(site);

    // if (site.defaultAr) {
    //   return site.defaultAr;
    // }
    return this.active.miscSettings.defaultAr;
  }

  getDefaultStretchMode(site) {
    if (site && this.active.sites[site] && this.active.sites[site].stretch !== Stretch.Default) {
      return this.active.sites[site].stretch;
    }

    return this.active.sites['@global'].stretch;
  }

  getDefaultVideoAlignment(site) {
    if (site && this.active.sites[site] && this.active.sites[site].videoAlignment !== VideoAlignment.Default) {
      return this.active.sites[site].videoAlignment;
    }

    return this.active.sites['@global'].videoAlignment;
  }
}

export default Settings;
