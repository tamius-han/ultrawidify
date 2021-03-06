import Debug from '../../conf/Debug';
import BrowserDetect from '../../conf/BrowserDetect';
import Logger from '../Logger';
import { browser } from 'webextension-polyfill-ts';
import Settings from '../Settings';

if (process.env.CHANNEL !== 'stable'){
  console.info("Loading CommsClient");
}

class CommsClient {
  commsId: string;

  logger: Logger;
  settings: any;   // sus?


  commands: {[x: string]: any[]};



  _listener: (m: any) => void;
  port: any;


  constructor(name, logger, commands) {
    try {
    this.logger = logger;

    this.port = browser.runtime.connect(null, {name: name});

    this.logger.onLogEnd(
      (history) => {
        this.logger.log('info', 'comms', 'Sending logging-stop-and-save to background script ...');
        try {
          this.port.postMessage({cmd: 'logging-stop-and-save', host: window.location.hostname, history})
        } catch (e) {
          this.logger.log('error', 'comms', 'Failed to send message to background script. Error:', e);
        }
      }
    );

    this._listener = m => this.processReceivedMessage(m);
    this.port.onMessage.addListener(this._listener);

    this.commsId = (Math.random() * 20).toFixed(0);

    this.commands = commands;
    } catch (e) {
      console.error("CONSTRUCOTR FAILED:", e)
    }
  }
  
  destroy() {
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

  processReceivedMessage(message){
    this.logger.log('info', 'comms', `[CommsClient.js::processMessage] <${this.commsId}> Received message from background script!`, message);

    if (this.commands[message.cmd]) {
      for (const c of this.commands[message.cmd]) {
        c(message);
      }
    }
  }

  async sendMessage_nonpersistent(message){
    message = JSON.parse(JSON.stringify(message)); // vue quirk. We should really use vue store instead
    return browser.runtime.sendMessage(null, message, null);
  }


  // TODO: sus function — does it get any use?
  async requestSettings(){
    this.logger.log('info', 'comms', "%c[CommsClient::requestSettings] sending request for congif!", "background: #11D; color: #aad");
   
    var response = await this.sendMessage_nonpersistent({cmd: 'get-config'});
   
    this.logger.log('info', 'comms', "%c[CommsClient::requestSettings] received settings response!", "background: #11D; color: #aad", response);

    if(! response || response.extensionConf){
      return Promise.resolve(false);
    }

    this.settings = {active: JSON.parse(response.extensionConf)};
    return Promise.resolve(true);
  }

  async sendMessage(message) {
    return this.sendMessage_nonpersistent(message);
  }

  registerVideo(){
    this.logger.log('info', 'comms', `[CommsClient::registerVideo] <${this.commsId}>`, "Registering video for current page.");
    this.port.postMessage({cmd: "has-video"});
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
    this.registerVideo();
  }


}

if (process.env.CHANNEL !== 'stable'){
  console.info("CommsClient loaded");
}

export default CommsClient;
