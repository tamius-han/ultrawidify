import Debug from '../../conf/Debug';
import BrowserDetect from '../../conf/BrowserDetect';
import { browser } from 'webextension-polyfill-ts';

if (process.env.CHANNEL !== 'stable'){
  console.info("Loading Comms");
}

class Comms {
  static async sendMessage(message){
    browser.runtime.sendMessage(message);
  }
}

if (process.env.CHANNEL !== 'stable'){
  console.info("Comms loaded");
}

export default Comms;
