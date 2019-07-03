import Debug from './conf/Debug';
import BrowserDetect from './conf/BrowserDetect';
import ExtensionMode from '../common/enums/extension-mode.enum'
import Settings from './lib/Settings';
import ActionHandler from './lib/ActionHandler';
import CommsClient from './lib/comms/CommsClient';
import PageInfo from './lib/video-data/PageInfo';

if(Debug.debug){
  console.log("\n\n\n\n\n\n           ———    Sᴛλʀᴛɪɴɢ  Uʟᴛʀᴀᴡɪᴅɪꜰʏ    ———\n               <<   ʟᴏᴀᴅɪɴɢ ᴍᴀɪɴ ꜰɪʟᴇ   >>\n\n\n\n");
  try {
    if(window.self !== window.top){
      console.log("%cWe aren't in an iframe.", "color: #afc, background: #174");
    }
    else{
      console.log("%cWe are in an iframe!", "color: #fea, background: #d31", window.self, window.top);
    }
  } catch (e) {
    console.log("%cWe are in an iframe!", "color: #fea, background: #d31");
  }
}

if (BrowserDetect.edge) {
  HTMLCollection.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
}

class UW {
  constructor(){
    this.pageInfo = undefined;
    this.comms = undefined;
    this.settings = undefined;
    this.actionHandler = undefined;
  }

  async init(){
    if (Debug.debug) {
      console.log("[uw::main] loading configuration ...");
    }
  
    // init() is re-run any time settings change
    if (this.pageInfo) {
      if(Debug.debug){
        console.log("[uw::init] Destroying existing pageInfo", this.pageInfo);
      }
      this.pageInfo.destroy();
    }
    if (this.comms) {
      this.comms.destroy();
    }
  
    if (!this.settings) {
      var ths = this;
      this.settings = new Settings(undefined, () => ths.init());
      await this.settings.init();
    }
  
    this.comms = new CommsClient('content-client-port', this.settings);
  
    // če smo razširitev onemogočili v nastavitvah, ne naredimo ničesar
    // If extension is soft-disabled, don't do shit

    var extensionMode = this.settings.getExtensionMode();

    if(Debug.debug) {
      console.log("[uw::init] Extension mode:" + (extensionMode < 0 ? "disabled" : extensionMode == '1' ? 'basic' : 'full'));
    }

    const isSiteDisabled = extensionMode === ExtensionMode.Disabled

    if (isSiteDisabled) {
      if (this.settings.getExtensionMode('@global') === ExtensionMode.Disabled) {
        if (Debug.debug) {
          console.log("[uw::init] EXTENSION DISABLED, THEREFORE WONT BE STARTED")
        }
        console.log("[uw::init] EXTENSION DISABLED, THEREFORE WONT BE STARTED")
        return;
      }
    }
  
    try {
      if (isSiteDisabled) {
        console.log("STARTING EXTENSION IN READ ONLY MODE")
      }
      this.pageInfo = new PageInfo(this.comms, this.settings, extensionMode, isSiteDisabled);
      if(Debug.debug){
        console.log("[uw.js::setup] pageInfo initialized. Here's the object:", this.pageInfo);
      }
      this.comms.setPageInfo(this.pageInfo);
  
      if(Debug.debug) {
        console.log("[uw.js::setup] will try to initate ActionHandler. Settings are:", this.settings, this.settings.active)
      }

      // start action handler only if extension is enabled for this site
      if (!isSiteDisabled) {
        this.actionHandler = new ActionHandler(this.pageInfo);
        this.actionHandler.init();
        
        if(Debug.debug) {
          console.log("[uw.js::setup] ActionHandler initiated:", this.actionHandler);
        }
      }

    } catch (e) {
      console.log("[uw::init] FAILED TO START EXTENSION. Error:", e);
    }
  
    
  }
}

var main = new UW();
main.init();
