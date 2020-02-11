import Debug from '../../conf/Debug';
import BrowserDetect from '../../conf/BrowserDetect';

class CommsClient {
  constructor(name, settings, logger) {
    this.logger = logger;

    if (BrowserDetect.firefox) {
      this.port = browser.runtime.connect({name: name});
    } else if (BrowserDetect.chrome) {
      this.port = chrome.runtime.connect({name: name});
    } else if (BrowserDetect.edge) {
      this.port = browser.runtime.connect({name: name})
    }

    this.logger.onLogEnd(
      (history) => {
        this.logger.log('info', 'comms', 'Sending logging-stop-and-save to background script ...');
        try {
          this.port.postMessage({cmd: 'logging-stop-and-save', host: window.location.host, history})
        } catch (e) {
          this.logger.log('error', 'comms', 'Failed to send message to background script. Error:', e);
        }
      }
    );

    var ths = this;
    this._listener = m => ths.processReceivedMessage(m);
    this.port.onMessage.addListener(this._listener);

    this.settings = settings;
    this.pageInfo = undefined;
    this.commsId = (Math.random() * 20).toFixed(0);

    this.commands = {
      'get-current-zoom': [() => this.pageInfo.requestCurrentZoom()],
      'set-ar': [(message) => this.pageInfo.setAr({type: message.arg, ratio: message.customArg}, message.playing)],
      'set-alignment': [(message) => {
        this.pageInfo.setVideoAlignment(message.arg, message.playing);
        this.pageInfo.restoreAr();
      }],
      'set-stretch': [(message) => this.pageInfo.setStretchMode(message.arg, message.playing, message.customArg)],
      'set-keyboard': [(message) => this.pageInfo.setKeyboardShortcutsEnabled(message.arg)],
      'autoar-start': [(message) => {
        if (message.enabled !== false) {
          this.pageInfo.initArDetection(message.playing);
          this.pageInfo.startArDetection(message.playing);
        } else {
          this.pageInfo.stopArDetection(message.playing);
        }
      }],
      'pause-processing': [(message) => this.pageInfo.pauseProcessing(message.playing)],
      'resume-processing': [(message) => this.pageInfo.resumeProcessing(message.autoArStatus, message.playing)],
      'set-zoom': [(message) => this.pageInfo.setZoom(message.arg, true, message.playing)],
      'change-zoom': [(message) => this.pageInfo.zoomStep(message.arg, message.playing)],
      'mark-player': [(message) => this.pageInfo.markPlayer(message.name, message.color)],
      'unmark-player': [() => this.pageInfo.unmarkPlayer()],
      'autoar-set-manual-tick': [(message) => this.pageInfo.setManualTick(message.arg)],
      'autoar-tick': [() => this.pageInfo.tick()],
      'set-ar-persistence': [() => this.pageInfo.setArPersistence(message.arg)], 
    };
  }
  
  destroy() {
    this.pageInfo = null;
    this.settings = null;
    if (!BrowserDetect.edge) { // edge is a very special browser made by outright morons.
      this.port.onMessage.removeListener(this._listener);
    }
  }

  subscribe(command, callback) {
    if (!this.commands[command]) {
      this.commands[command] = [callback];
    } else {
      this.commands[command].push(callback);
    }
  }

  setPageInfo(pageInfo){

    this.pageInfo = pageInfo;

    this.logger.log('info', 'debug', `[CommsClient::setPageInfo] <${this.commsId}>`, "setting pageinfo");

    var ths = this;
    this._listener = m => ths.processReceivedMessage(m);
    if (!BrowserDetect.edge) {
      this.port.onMessage.removeListener(this._listener);
    }
    this.port.onMessage.addListener(this._listener);
    
  }

  processReceivedMessage(message){
    this.logger.log('info', 'comms', `[CommsClient.js::processMessage] <${this.commsId}> Received message from background script!`, message);

    if (!this.pageInfo || !this.settings.active) {
      this.logger.log('info', 'comms', `[CommsClient.js::processMessage] <${this.commsId}> this.pageInfo (or settings) not defined. Extension is probably disabled for this site.\npageInfo:`, this.pageInfo,
                      "\nsettings.active:", this.settings.active,
                      "\nnobj:", this
      );
      return;
    }

    if (this.commands[message.cmd]) {
      for (const c of this.commands[message.cmd]) {
        c(message);
      }
    }
  }

  async sleep(n){
    return new Promise( (resolve, reject) => setTimeout(resolve, n) );
  }

  async sendMessage_nonpersistent(message){
    message = JSON.parse(JSON.stringify(message)); // vue quirk. We should really use vue store instead
    
    if(BrowserDetect.firefox){
      return browser.runtime.sendMessage(message)
    } else {
      return new Promise((resolve, reject) => {
        try{
          if(BrowserDetect.edge){
            browser.runtime.sendMessage(message, function(response){
              var r = response; 
              resolve(r);
            });
          } else {
            chrome.runtime.sendMessage(message, function(response){
              // Chrome/js shittiness mitigation — remove this line and an empty array will be returned
              var r = response; 
              resolve(r);
              return true;
            });
          }
        }
        catch(e){
          reject(e);
        }
        return true;
      });
    }
  }

  async requestSettings(){
    this.logger.log('info', 'comms', "%c[CommsClient::requestSettings] sending request for congif!", "background: #11D; color: #aad");
   
    var response = await this.sendMessage_nonpersistent({cmd: 'get-config'});
   
    this.logger.log('info', 'comms', "%c[CommsClient::requestSettings] received settings response!", "background: #11D; color: #aad", response);

    if(! response || response.extensionConf){
      return Promise.resolve(false);
    }

    this.settings.active = JSON.parse(response.extensionConf);
    return Promise.resolve(true);
  }

  async sendMessage(message) {
    await this.sendMessage_nonpersistent(message);
  }

  registerVideo(){
    this.logger.log('info', 'comms', `[CommsClient::registerVideo] <${this.commsId}>`, "Registering video for current page.");
    if (this.pageInfo) {
      if (this.pageInfo.hasVideo()) { 
        this.port.postMessage({cmd: "has-video"});
      }
    } else {
      // this.port.postMessage({cmd: "has-video"});
    }
  }

  sendPerformanceUpdate(message){
    this.port.postMessage({cmd: 'performance-update', message: message});
  }

  unregisterVideo(){
    this.logger.log('info', 'comms', `[CommsClient::unregisterVideo] <${this.commsId}>`, "Unregistering video for current page.");
    this.port.postMessage({cmd: "noVideo"});  // ayymd
  }

  announceZoom(scale){
    this.port.postMessage({cmd: "announce-zoom", zoom: scale});
    this.registerVideo()
  }


}

export default CommsClient;
