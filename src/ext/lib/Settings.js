import Debug from '../conf/Debug';
import currentBrowser from '../conf/BrowserDetect';
import ExtensionConf from '../conf/ExtensionConf';
import ExtensionMode from '../../common/enums/extension-mode.enum';
import ObjectCopy from '../lib/ObjectCopy';
import Stretch from '../../common/enums/stretch.enum';
import VideoAlignment from '../../common/enums/video-alignment.enum';
import ExtensionConfPatch from '../conf/ExtConfPatches';



class Settings {

  constructor(activeSettings, updateCallback) {
    this.active = activeSettings ? activeSettings : undefined;
    this.default = ExtensionConf;
    this.useSync = false;
    this.version = undefined;
    this.updateCallback = updateCallback;

    const ths = this;

    if(currentBrowser.firefox) {
      browser.storage.onChanged.addListener( (changes, area) => {
        if (Debug.debug && Debug.debugStorage) {
          console.log("[Settings::<storage/on change>] Settings have been changed outside of here. Updating active settings. Changes:", changes, "storage area:", area);
          if (changes['uwSettings'] && changes['uwSettings'].newValue) {
            console.log("[Settings::<storage/on change>] new settings object:", JSON.parse(changes.uwSettings.newValue));
          }
        }
        if(changes['uwSettings'] && changes['uwSettings'].newValue) {
          ths.setActive(JSON.parse(changes.uwSettings.newValue));
        }

        if(this.updateCallback) {
          try {
            updateCallback(ths);
          } catch (e) {
            console.log("[Settings] CALLING UPDATE CALLBACK FAILED.")
          }
        }
      });
    } else if (currentBrowser.chrome) {
      chrome.storage.onChanged.addListener( (changes, area) => {
        if (Debug.debug && Debug.debugStorage) {
          console.log("[Settings::<storage/on change>] Settings have been changed outside of here. Updating active settings. Changes:", changes, "storage area:", area);
          if (changes['uwSettings'] && changes['uwSettings'].newValue) {
            console.log("[Settings::<storage/on change>] new settings object:", JSON.parse(changes.uwSettings.newValue));
          }
        }
        if(changes['uwSettings'] && changes['uwSettings'].newValue) {
          ths.setActive(JSON.parse(changes.uwSettings.newValue));
        }

        if(this.updateCallback) {
          try {
            updateCallback(ths);
          } catch (e) {
            console.log("[Settings] CALLING UPDATE CALLBACK FAILED.")
          }
        }
      });
    }
  }

  async init() {
    const settings = await this.get();

    if(Debug.debug) {
      console.log("[Settings::init] Configuration fetched from storage:", settings);

      if (Debug.flushStoredSettings) {
        console.log("%c[Settings::init] Debug.flushStoredSettings is true. Using default settings", "background: #d00; color: #ffd");
        Debug.flushStoredSettings = false; // don't do it again this session
        this.setDefaultSettings();
        this.active = this.getDefaultSettings();
        return this.active;
      }
    }

    // if there's no settings saved, return default settings.
    if(! settings || (Object.keys(settings).length === 0 && settings.constructor === Object)) {
      this.setDefaultSettings();
      this.active = this.getDefaultSettings();
      return this.active;
    }

    // if last saved settings was for version prior to 4.x, we reset settings to default
    // it's not like people will notice cos that version didn't preserve settings at all
    if (settings.version && !settings.version.startsWith('4')) {
      this.setDefaultSettings();
      this.active = this.getDefaultSettings();
      return this.active;
    }

    // if there's settings, set saved object as active settings
    this.active = settings;

    // check if extension has been updated. If not, return settings as they were retreived
    if (currentBrowser.firefox) {
      this.version = browser.runtime.getManifest().version;
    } else if (currentBrowser.chrome) {
      this.version = chrome.runtime.getManifest().version;
    } else if (currentBrowser.edge) {
      this.version = browser.runtime.getManifest().version;
    }

    if(settings.version === this.version) {
      if(Debug.debug) {
        console.log("[Settings::init] extension was saved with current version of ultrawidify (", this.version, "). Returning object as-is.");
      }

      return this.active;
    }

    // if extension has been updated, update existing settings with any options added in the
    // new version. In addition to that, we remove old keys that are no longer used.
    const patched = ObjectCopy.addNew(settings, this.default);
    if(Debug.debug) {
      console.log("[Settings.init] Results from ObjectCopy.addNew()?", patched, "\n\nSettings from storage", settings, "\ndefault?", this.default,);
    }

    if(patched){
      this.active = patched;
    } else {
      this.active = JSON.parse(JSON.stringify(this.default));
    }

    // in case settings in previous version contained a fucky wucky, we overwrite existing settings with a patch
    ObjectCopy.overwrite(this.active, ExtensionConfPatch['4.2.0']);

    // set 'whatsNewChecked' flag to false when updating
    this.active.whatsNewChecked = false;

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

    if (Debug.debug && Debug.debugStorage) {
      try {
        console.log("[Settings::get] Got settings:", JSON.parse(ret.uwSettings));
      } catch (e) {
        console.log("[Settings::get] No settings.")
      }
    }

    try {
      return JSON.parse(ret.uwSettings);
    } catch(e) {
      return undefined;
    }
  }

  async set(extensionConf) {
    if (Debug.debug && Debug.debugStorage) {
      console.log("[Settings::set] setting new settings:", extensionConf)
    }

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
        if (Debug.debug) {
          console.log("[Settings::canStartExtension] window.location.hostname is null or undefined:", window.location.hostname)
          console.log("active settings:", this.active)
        }
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
      if(Debug.debug){
        console.log("[Settings.js::canStartExtension] Something went wrong — are settings defined/has init() been called?\n\nerror:", e, "\n\nSettings object:", this)
      }
      return ExtensionMode.Disabled;
    }
  }

  canStartExtension(site) {
    // returns 'true' if extension can be started on a given site. Returns false if we shouldn't run.
    if (!site) {
      site = window.location.hostname;

      if (!site) {
        console.log("[Settings::canStartExtension] window.location.hostname is null or undefined:", window.location.hostname)
        console.log("active settings:", this.active)
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
    } catch(e){
      if(Debug.debug){
        console.log("[Settings.js::canStartExtension] Something went wrong — are settings defined/has init() been called?\nSettings object:", this)
      }
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
      if (Debug.debug) {
        console.error("[Settings.js::keyboardDisabled] something went wrong:", e);
      }
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

      console.log("[Settings::canStartAutoAr] ----------------\nCAN WE START AUTOAR ON SITE", site,
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
      console.log("canStartAutoAr — can(not) start csar because extension is in whitelist mode, and this site is (not) equal to", ExtensionMode.Enabled)
      return this.active.sites[site].autoar === ExtensionMode.Enabled;
    } else {
      console.log("canStartAutoAr — cannot start csar because extension is globally disabled")
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
