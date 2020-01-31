import Debug from './conf/Debug';
import BrowserDetect from './conf/BrowserDetect';
import ExtensionMode from '../common/enums/extension-mode.enum'
import Settings from './lib/Settings';
import ActionHandler from './lib/ActionHandler';
import CommsClient from './lib/comms/CommsClient';
import PageInfo from './lib/video-data/PageInfo';
import Logger from './lib/Logger';

import Vue from 'vue';
import LoggerUi from '../csui/LoggerUi';

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
    this.logger = undefined;
  }

  async init(){
    this.createUi();
    if (Debug.debug) {
      console.log("[uw::main] loading configuration ...");
    }
  
    // logger init is the first thing that needs to run
    try {
      if (!this.logger) {
        const loggingOptions = {
          isContentScript: true,
          allowLogging: true,
          useConfFromStorage: true,
          fileOptions: {
            enabled: false
          },
          consoleOptions: {
            enabled: true,
            'debug': true,
            'init': true,
            'settings': true,
            'keyboard': true,
            'mousemove': false,
            'actionHandler': true,
            'comms': true,
            'playerDetect': true,
            'resizer': true,
            'scaler': true,
            'stretcher': true,
            // 'videoRescan': true,
            // 'playerRescan': true,
            'arDetect': true,
            'arDetect_verbose': true
          },
          allowBlacklistedOrigins: {
            'periodicPlayerCheck': false,
            'periodicVideoStyleChangeCheck': false,
            'handleMouseMove': false
          }
        };
        this.logger = new Logger();
        await this.logger.init(loggingOptions);
        // await this.logger.init();  // not needed if logging options are provided at creation
      }
    } catch (e) {
      console.error("logger init failed!", e)
    }

    // init() is re-run any time settings change
    if (this.pageInfo) {
      // if this executes, logger must have been initiated at some point before this point
      this.logger.log('info', 'debug', "[uw::init] Destroying existing pageInfo", this.pageInfo);
      this.pageInfo.destroy();
    }
    if (this.comms) {
      this.comms.destroy();
    }

    if (!this.settings) {
      var ths = this;
      this.settings = new Settings({updateCallback: (s) => {console.log("settings callback — ", s); ths.init()}, logger: this.logger});
      await this.settings.init();
    }
  
    this.comms = new CommsClient('content-client-port', this.settings, this.logger);
  
    // če smo razširitev onemogočili v nastavitvah, ne naredimo ničesar
    // If extension is soft-disabled, don't do shit

    var extensionMode = this.settings.getExtensionMode();

    this.logger.log('info', 'debug', "[uw::init] Extension mode:" + (extensionMode < 0 ? "disabled" : extensionMode == '1' ? 'basic' : 'full'));

    const isSiteDisabled = extensionMode === ExtensionMode.Disabled

    if (isSiteDisabled) {
      if (this.settings.getExtensionMode('@global') === ExtensionMode.Disabled) {
        this.logger.log('info', 'debug', "[uw::init] EXTENSION DISABLED, THEREFORE WONT BE STARTED")
        return;
      }
    }
  
    try {
      this.pageInfo = new PageInfo(this.comms, this.settings, this.logger, extensionMode, isSiteDisabled);
      this.logger.log('info', 'debug', "[uw.js::setup] pageInfo initialized. Here's the object:", this.pageInfo);
      this.comms.setPageInfo(this.pageInfo);
  
      this.logger.log('info', 'debug', "[uw.js::setup] will try to initate ActionHandler. Settings are:", this.settings, this.settings.active)

      // start action handler only if extension is enabled for this site
      if (!isSiteDisabled) {
        this.actionHandler = new ActionHandler(this.pageInfo);
        this.actionHandler.init();
        
        this.logger.log('info', 'debug', "[uw.js::setup] ActionHandler initiated:", this.actionHandler);
      }

    } catch (e) {
      this.logger.log('error', 'debug', "[uw::init] FAILED TO START EXTENSION. Error:", e);
    }
  
    
  }

  createUi() {
    console.log("CREATING UI");
    const random = Math.round(Math.random() * 69420);
    const uwid = `uw-ui-root-${random}`;

    const rootDiv = document.createElement('div');
    rootDiv.setAttribute("style", "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 999999; background-color: #ff0000;");
    rootDiv.setAttribute("id", uwid);

    document.body.appendChild(rootDiv);

    new Vue({
      el: `#${uwid}`,
      components: {
        LoggerUi
      },
      render(h) {
        return h('logger-ui');
      }
    })
  }
}

var main = new UW();
main.init();
