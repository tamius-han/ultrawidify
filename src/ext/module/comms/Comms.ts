import Debug from '../../conf/Debug';
import BrowserDetect from '../../conf/BrowserDetect';

if (process.env.CHANNEL !== 'stable'){
  console.info("Loading Comms");
}

class Comms {
  static async sendMessage(message){
    chrome.runtime.sendMessage(message);
  }
}

if (process.env.CHANNEL !== 'stable'){
  console.info("Comms loaded");
}

export default Comms;
