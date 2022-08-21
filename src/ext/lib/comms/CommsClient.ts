import Debug from '../../conf/Debug';
import BrowserDetect from '../../conf/BrowserDetect';
import Logger from '../Logger';
import { browser } from 'webextension-polyfill-ts';
import Settings from '../Settings';
import EventBus from '../EventBus';

if (process.env.CHANNEL !== 'stable'){
  console.info("Loading CommsClient");
}

/**
 * Ultrawidify communication spans a few different "domains" that require a few different
 * means of communication. The four isolated domains are:
 *
 *     > content script event bus (CS)
 *     > player UI event bus (UI)
 *     > UWServer event bus (BG)
 *     > popup event bus
 *
 * It is our goal to route messages between various domains. It is our goal that eventBus
 * instances in different parts of our script are at least somewhat interoperable between
 * each other. As such, scripts sending commands should be unaware that Comms object even
 * exists.
 *
 * EventBus is started first. Other components (including commsClient) follow later.
 *
 * Messages that pass through CommsServer need to define context object with
 * context.comms.forwardTo field defined, with one of the following values:
 *
 *     -              all :  all content scripts of ALL TABS
 *     -           active :  all content scripts in CURRENT TAB
 *     -    contentScript :  specific content script (requires other EventBusContext fields!)
 *     - backgroundScript :  background script (considered default behaviour)
 *     -       sameOrigin :  ???
 *     -            popup :  extension popup
 *
 *
 *
 *
 *                    fig 0. ULTRAWIDIFY COMMUNICATION MAP
 *
 *       CS EVENT BUS
 *   (accessible within tab scripts)
 *            |                                      BG EVENT BUS
 *  PageInfo  x                                (accessible within background page)
 *            x                                           |
 *      :     :                                           x UWServer
 *            x CommsClient <---------------x CommsServer x
 *            | (Connect to popup)                 X                POPUP EVENT BUS
 *            |                                    A           (accessible within popup)  /todo
 *            x eventBus.sendToTunnel()            |                      |
 *                <iframe tunnel>                  \----------------> ??? X
 *                     A                                                  |
 *                     |                                                  X App.vue
 *                     V
 *              x <iframe tunnel>
 *              |
 * PlayerUIBase x
 *      :       :
 *              |
 *       UI EVENT BUS
 * (accessible within player UI)
 */


class CommsClient {
  commsId: string;

  logger: Logger;
  settings: any;   // sus?

  eventBus: EventBus;

  _listener: (m: any) => void;
  port: any;

  //#region lifecycle
  constructor(name: string, logger: Logger, eventBus: EventBus) {
    try {
      this.logger = logger;
      this.eventBus = eventBus;

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

    } catch (e) {
      console.error("CONSTRUCOTR FAILED:", e)
    }
  }

  destroy() {
    if (!BrowserDetect.edge) { // edge is a very special browser made by outright morons.
      this.port.onMessage.removeListener(this._listener);
    }
  }
  //#endregion

  async sendMessage(message, context?){
    message = JSON.parse(JSON.stringify(message)); // vue quirk. We should really use vue store instead
    return browser.runtime.sendMessage(null, message, null);
  }

  processReceivedMessage(message){
    this.eventBus.send(message.command, message.config, {fromComms: true});
  }
}

if (process.env.CHANNEL !== 'stable'){
  console.info("CommsClient loaded");
}

export default CommsClient;
