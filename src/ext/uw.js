/**
 * NOTE: we cannot get rid of this js file. I tried for 30 seconds and I couldn't get
 * extension to work unless I kept this part of extension out of the ts file.
 */
import UWContent from '@src/ext/UWContent';

if(process.env.CHANNEL !== 'stable'){

  let isIframe;
  try {
    isIframe = window.self !== window.top;
  } catch (e) {
    isIframe = true;
  }

  console.warn(
    "\n\n\n\n\n\n           ———    Sᴛλʀᴛɪɴɢ  Uʟᴛʀᴀᴡɪᴅɪꜰʏ    ———\n               <<   ʟᴏᴀᴅɪɴɢ ᴍᴀɪɴ ꜰɪʟᴇ   >>\n\n\n\n",
    "\n  - are we in iframe?", isIframe
  );
}

const main = new UWContent();
main.init();
