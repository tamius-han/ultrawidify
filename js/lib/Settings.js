class Settings {

  constructor(activeSettings, updateCallback) {
    this.active = activeSettings ? activeSettings : undefined;
    this.default = ExtensionConf;
    this.useSync = false;
    this.version = undefined;
    this.updateCallback = updateCallback;

    const ths = this;

    if(BrowserDetect.firefox) {
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
            updateCallback();
          } catch (e) {
            console.log("[Settings] CALLING UPDATE CALLBACK FAILED.")
          }
        }
      });
    } else if (BrowserDetect.chrome) {
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
            updateCallback();
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
    }

    // if there's no settings saved, return default settings.
    if(! settings || (Object.keys(settings).length === 0 && settings.constructor === Object)) {
      this.setDefaultSettings();
      this.active = this.getDefaultSettings();
      return this.active;
    }

    // if there's settings, set saved object as active settings
    this.active = settings;

    // check if extension has been updated. If not, return settings as they were retreived
    if (BrowserDetect.firefox) {
      this.version = browser.runtime.getManifest().version;
    } else if (BrowserDetect.chrome) {
      this.version = chrome.runtime.getManifest().version;
    } else if (BrowserDetect.edge) {
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

    this.set(this.active);
    return this.active;
  }

  async get() {
    if (BrowserDetect.firefox) {
      const ret = await browser.storage.local.get('uwSettings');
      try {
        return JSON.parse(ret.uwSettings);
      } catch(e) {
        return undefined;
      }
    } else if (BrowserDetect.chrome) {
      const ret = new Promise( (resolve, reject) => {
        chrome.storage.sync.get('uwSettings', (res) => resolve(res));
      });
      return ret['uwSettings'];
    } else if (BrowserDetect.edge) {
      const ret = new Promise( (resolve, reject) => {
        browser.storage.sync.get('uwSettings', (res) => resolve(res));
      });
      return ret['uwSettings'];
    }
  }

  async set(extensionConf) {
    if (Debug.debug) {
      console.log("[Settings::set] setting new settings:", extensionConf)
    }

    if (BrowserDetect.firefox || BrowserDetect.edge) {
      extensionConf.version = this.version;
      return this.useSync ? browser.storage.sync.set( {'uwSettings': JSON.stringify(extensionConf)}): browser.storage.local.set( {'uwSettings': JSON.stringify(extensionConf)});
    } else if (BrowserDetect.chrome) {
      return chrome.storage.sync.set( {'uwSettings': JSON.stringify(extensionConf)});
    }
  }

  async setActive(activeSettings) {
    this.active = activeSettings;
  }

  async setProp(prop, value) {
    this.active[prop] = value;
  }

  async save() {
    if (Debug.debug) {
      console.log("[Settings::save] Saving active settings:", this.active);
    }

    this.set(this.active);
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
  //    * default     — allow if default is to allow, block if default is to block
  //    * disabled    — never allow

  getSiteSettings(site) {
    if (!site) {
      site = window.location.hostname;
    }
    if (!site || !this.active.sites[site]) {
      return {};
    }
    return this.active.sites[site];
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

    if (Debug.debug) {
      // let's just temporarily disable debugging while recursively calling
      // this function to get extension status on current site without duplo
      // console logs (and without endless recursion)
      Debug.debug = false;
      const cse = this.canStartExtension(site);
      Debug.debug = true;
    }
    try{
    // if site is not defined, we use default mode:
    if (! this.active.sites[site]) {
      return this.active.extensionMode === "blacklist";
    }

    if(this.active.extensionMode === "blacklist") {
      return this.active.sites[site].status !== "disabled";
    } else if (this.active.extensionMode === "whitelist") {
      return this.active.sites[site].status === "enabled";
    } else {
      return false;
    }
    }catch(e){
      if(Debug.debug){
        console.log("[Settings.js::canStartExtension] Something went wrong — are settings defined/has init() been called?\nSettings object:", this)
      }
      return false;
    }
  }

  extensionEnabled(){
    return this.active.extensionMode !== 'disabled'
  }

  extensionEnabledForSite(site) {
    return this.canStartExtension(site);
  }

  canStartAutoAr(site) {
    if (!site) {
      site = window.location.hostname;

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

      console.log("[Settings::canStartAutoAr] ----------------\nCAN WE START THIS EXTENSION ON SITE", site,
                  "?\n\nsettings.active.sites[site]=", this.active.sites[site],
                  "\nExtension mode?", this.active.arDetect.mode,
                  "\nCan extension be started?", csar
                 );
    }

    // if site is not defined, we use default mode:    
    if (! this.active.sites[site]) {
      return this.active.arDetect.mode === "blacklist";
    }

    if (this.active.arDetect.mode === "blacklist") {
      return this.active.sites[site].arStatus !== "disabled";
    } else if (this.active.arDetect.mode === "whitelist") {
      return this.active.sites[site].arStatus === "enabled";
    } else {
      return false;
    }
  }

  getDefaultAr(site) {
    site = this.getSiteSettings(site);

    if (site.defaultAr) {
      return site.defaultAr;
    }
    return this.active.miscFullscreenSettings.defaultAr;
  }

  getDefaultStretchMode(site) {
    site = this.getSiteSettings(site);

    if (site.stretch) {
      return site.stretch;
    }
    return this.active.stretch.initialMode;
  }

  getDefaultVideoAlignment(site) {
    site = this.getSiteSettings(site);

    if (site.videoAlignment) {
      return site.videoAlignment;
    }
    return this.active.miscFullscreenSettings.videoFloat;
  }
}
