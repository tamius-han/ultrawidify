import { EventBusContext, EventBusMessage } from '@/common/interfaces/EventBusMessage.interface';
import EventBus from '../EventBus';
import { ComponentLogger } from '../logging/ComponentLogger';
import { LogAggregator } from '../logging/LogAggregator';
import Settings from '../settings/Settings';
import { CommsOrigin } from '@src/ext/module/comms/comms-origin.enum';
import { CommsMessage } from '@src/ext/module/comms/comms-message.interface';

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



class CommsClient {
  commsId!: string;
  name: string;
  origin!: CommsOrigin;

  logger!: ComponentLogger;
  settings?: Settings;

  eventBus!: EventBus;

  _listener!: (m: CommsMessage) => void;
  port!: chrome.runtime.Port;
  private destroyed = false;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private disconnectListener?: () => void;

  //#region lifecycle
  constructor(name: string, logAggregator: LogAggregator, eventBus: EventBus) {
    this.name = name;
    try {
      this.logger = new ComponentLogger(logAggregator, 'CommsClient', {});
      this.eventBus = eventBus;

      if (name === 'popup-port') {
        this.origin = CommsOrigin.Popup;
      } else {
        this.origin = CommsOrigin.ContentScript;
      }

      this._listener = m => this.processReceivedMessage(m);
      this.commsId = (Math.random() * 20).toFixed(0);
      this.connectPort();

    } catch (e) {
      console.error("CONSTRUCTOR FAILED:", e)
    }
  }

  private connectPort() {
    if (this.destroyed) {
      return;
    }
    if (this.reconnectTimer !== undefined) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    try {
      const port = chrome.runtime.connect(undefined, {name: this.name});
      this.port = port;
      const disconnectListener = () => {
        port.onMessage.removeListener(this._listener);
        port.onDisconnect.removeListener(disconnectListener);
        if (this.port === port) {
          this.disconnectListener = undefined;
          if (!this.destroyed) {
            this.scheduleReconnect();
          }
        }
      };
      this.disconnectListener = disconnectListener;
      port.onMessage.addListener(this._listener);
      port.onDisconnect.addListener(disconnectListener);
    } catch (error) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.destroyed || this.reconnectTimer !== undefined) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connectPort();
    }, 1000);
  }

  destroy() {
    this.destroyed = true;
    if (this.reconnectTimer !== undefined) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.port?.onMessage.removeListener(this._listener);
    if (this.disconnectListener) {
      this.port?.onDisconnect.removeListener(this.disconnectListener);
    }
    this.port?.disconnect();
  }
  //#endregion

  async sendMessage(message: EventBusMessage, context?: EventBusContext, borderCrossings?: EventBusContext['borderCrossings']){
    if (! ['noVideo', 'has-video'].includes(message.command)) {
      this.logger.info('sendMessage', '         <<< Sending message to background script:', message);
    }

    message = JSON.parse(JSON.stringify(message)); // vue quirk. We should really use vue store instead

    // content script client and popup client differ in this one thing
    if (this.origin === CommsOrigin.Popup) {
      try {
        return this.port.postMessage(message);
      } catch (e) {
        // console.log('chrome is shit, lets try to bruteforce ...', e);
        console.warn('failed to send message from popup to background server. Will try again. Error:\n', e);
        try {
          this.connectPort();
          const res = this.port.postMessage(message);
          console.warn('Retry successful');
          return res;
        } catch (e) {
          console.warn('failed to send message from popup to background server again. Giving up. Error:', e);
        }
      }
    }

    // send to server
    if (!context?.borderCrossings?.commsServer) {
      try {
        return await chrome.runtime.sendMessage(undefined, message);
      } catch (e) {
        console.warn(`Failed to send message to background script. Error:`, e, 'data:', {message, context});
      }
    } else {
      console.warn('not sending message to background server because it already crossed the comms server');
    }
  }

  /**
   * Processes message we received from CommsServer, and forwards it to eventBus.
   * @param receivedMessage
   */
  private processReceivedMessage(receivedMessage: CommsMessage){
    // console.log('message popped out of the comms', receivedMessage, 'event bus:', this.eventBus);
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
        origin: CommsOrigin.Server,
        borderCrossings: {
          commsServer: true
        }
      }
    );
  }
}

if (process.env.CHANNEL !== 'stable'){
  console.info("CommsClient loaded");
}

export default CommsClient;
