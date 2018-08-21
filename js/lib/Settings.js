class Settings {

  constructor(activeSettings) {
    this.active = activeSettings ? activeSettings : {};
    this.default = ExtensionConf;
    this.useSync = false;
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
    var uwVersion;
    
    if (BrowserDetect.firefox) {
      uwVersion = browser.runtime.getManifest().version;
    } else if (BrowserDetect.chrome) {
      uwVersion = chrome.runtime.getManifest().version;
    } else if (BrowserDetect.edge) {
      uwVersion = browser.runtime.getManifest().version;
    }

    if(settings.version === uwVersion) {
      if(Debug.debug) {
        console.log("[Settings::init] extension was saved with current version of ultrawidify (", uwVersion, "). Returning object as-is.");
      }
      return this.active;
    }

    // if extension has been updated, update existing settings with any options added in the
    // new version. In addition to that, we remove old keys that are no longer used.
    this.active = ObjectCopy.addNew(settings, this.default);
    this.set(this.active);
    return this.active;
  }

  async get() {
    if (BrowserDetect.firefox || BrowserDetect.edge) {
      const ret = this.useSync ? await browser.storage.sync.get('uw-settings') : await browser.storage.local.get('uw-settings');
      try {
        return JSON.parse(ret['uw-settings']);
      } catch(e) {
        return undefined;
      }
    } else if (BrowserDetect.chrome) {
      const ret = chrome.storage.sync.get('uw-settings');
      return ret['uw-settings'];
    }
  }

  async set(extensionConf) {
    if (BrowserDetect.firefox || BrowserDetect.edge) {
      return this.useSync ? browser.storage.sync.set( {'uw-settings': JSON.stringify(extensionConf)}): browser.storage.local.set( {'uw-settings': JSON.stringify(extensionConf)});
    } else if (BrowserDetect.chrome) {
      return chrome.storage.sync.set( {'uw-settings': extensionConf});
    }
  }

  async setActive(activeSettings) {
    this.active = activeSettings;
  }

  async setProp(prop, value) {
    this.active[prop] = value;
  }

  async save() {
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

      // console.log("[Settings::canStartExtension] ----------------\nCAN WE START THIS EXTENSION ON SITE", site,
      //             "?\n\nsettings.active.sites[site]=", this.active.sites[site],
      //             "\nExtension mode?", this.active.extensionMode,
      //             "\nCan extension be started?", cse
      //            );
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
    console.log("THIS?", this)
  }
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
}
