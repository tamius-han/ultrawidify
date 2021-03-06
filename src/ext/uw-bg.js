/**
 * NOTE: we cannot get rid of this js file. I tried for 30 seconds and I couldn't get 
 * extension to work unless I kept this part of extension out of the ts file.
 */

import UWServer from './UWServer';

var BgVars = {
  arIsActive: true,
  hasVideos: false,
  currentSite: ""
}

const server = new UWServer();

window.sendUnmarkPlayer = (message) => {
  server.sendUnmarkPlayer(message)
}