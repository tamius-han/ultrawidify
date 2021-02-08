import Debug from '../../conf/Debug';
import BrowserDetect from '../../conf/BrowserDetect';

if (process.env.CHANNEL !== 'stable'){
  console.info("Loading Comms");
}

class Comms {
  static async sendMessage(message){

    if(BrowserDetect.firefox){
      return browser.runtime.sendMessage(message);
    } else {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, function(response){
          // Chrome/js shittiness mitigation — remove this line and an empty array will be returned
          var r = response; 
          resolve(r);
          return true;
        });
      });
    }
  }

}

if (process.env.CHANNEL !== 'stable'){
  console.info("Comms loaded");
}

export default Comms;
