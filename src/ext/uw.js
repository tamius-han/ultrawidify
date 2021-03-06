/**
 * NOTE: we cannot get rid of this js file. I tried for 30 seconds and I couldn't get 
 * extension to work unless I kept this part of extension out of the ts file.
 */

import UWContent from './UWContent';
import BrowserDetect from './conf/BrowserDetect';

if(process.env.CHANNEL !== 'stable'){
  console.warn("\n\n\n\n\n\n           ———    Sᴛλʀᴛɪɴɢ  Uʟᴛʀᴀᴡɪᴅɪꜰʏ    ———\n               <<   ʟᴏᴀᴅɪɴɢ ᴍᴀɪɴ ꜰɪʟᴇ   >>\n\n\n\n");
  try {
    if(window.self !== window.top){
      console.info("%cWe aren't in an iframe.", "color: #afc, background: #174");
    }
    else{
      console.info("%cWe are in an iframe!", "color: #fea, background: #d31", window.self, window.top);
    }
  } catch (e) {
    console.info("%cWe are in an iframe!", "color: #fea, background: #d31");
  }
}

if (BrowserDetect.edge) {
  HTMLCollection.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
}

const main = new UWContent();
main.init();
