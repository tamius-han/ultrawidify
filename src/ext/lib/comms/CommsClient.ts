import Debug from '../../conf/Debug';
import BrowserDetect from '../../conf/BrowserDetect';
import Logger from '../Logger';
import Settings from '../Settings';
import EventBus, { EventBusContext } from '../EventBus';

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
 *                <iframe tunnel>                  \--------> CommsClient X
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

export enum CommsOrigin {
  ContentScript = 1,
  Popup = 2,
  Server = 3
}

class CommsClient {
  commsId: string;
  name: string;
  origin: CommsOrigin;

  logger: Logger;
  settings: any;   // sus?

  eventBus: EventBus;

  _listener: (m: any) => void;
  port: chrome.runtime.Port;

  //#region lifecycle
  constructor(name: string, logger: Logger, eventBus: EventBus) {
    this.name = name;
    try {
      this.logger = logger;
      this.eventBus = eventBus;

      if (name === 'popup-port') {
        this.origin = CommsOrigin.Popup;
      } else {
        this.origin = CommsOrigin.ContentScript;
      }

      // if (BrowserDetect.firefox) {
      //   this.port = chrome.runtime.connect(null, {name: name});
      // } else {
      // this connects to the background page
      this.port = chrome.runtime.connect(null, {name: name});
      // }

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

  async sendMessage(message, context?: EventBusContext){
    message = JSON.parse(JSON.stringify(message)); // vue quirk. We should really use vue store instead

    // content script client and popup client differ in this one thing
    if (this.origin === CommsOrigin.Popup) {
      try {
        return this.port.postMessage(message);
      } catch (e) {
        console.log('chrome is shit, lets try to bruteforce ...', e);
        const port = chrome.runtime.connect(null, {name: this.name});
        port.onMessage.addListener(this._listener);
        return port.postMessage(message);
      }
    }
    // send to server
    return chrome.runtime.sendMessage(null, message, null);
  }

  /**
   * Processes message we received from CommsServer, and forwards it to eventBus.
   * @param receivedMessage
   */
  private processReceivedMessage(receivedMessage){
    console.log('message popped out of the comms', receivedMessage, 'event bus:', this.eventBus);
    // when sending between frames, message will be enriched with two new properties
    const {_sourceFrame, _sourcePort, ...message} = receivedMessage;

    let comms;
    if (_sourceFrame || _sourcePort) {
      comms = {
        port: _sourcePort,
        sourceFrame: _sourceFrame
      }
    }

    this.eventBus.send(
      message.command,
      message.config,
      {
        comms,
        origin: CommsOrigin.Server
      }
    );
  }
}

if (process.env.CHANNEL !== 'stable'){
  console.info("CommsClient loaded");
}

export default CommsClient;
