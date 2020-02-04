import Debug from '../../conf/Debug';
import BrowserDetect from '../../conf/BrowserDetect';

class Comms {
  static async sendMessage(message){

    if(BrowserDetect.firefox){
      return browser.runtime.sendMessage(message);
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
      });
    }
  }

}

export default Comms;
