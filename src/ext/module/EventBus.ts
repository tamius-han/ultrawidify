import { IframeData } from './video-data/IframeManager';
import CommsClient, { CommsOrigin } from './comms/CommsClient';
import CommsServer from './comms/CommsServer';
import { EventBusCommand, EventBusContext } from '@src/common/interfaces/EventBusMessage.interface';



// export interface EventBusContext {
//   stopPropagation?: boolean,

//   // Context stuff added by Comms
//   origin?: CommsOrigin,
//   comms?: {
//     sender?: chrome.runtime.MessageSender,
//     port?: chrome.runtime.Port,
//     frame?: any,
//     sourceFrame?: IframeData
//     forwardTo?: 'all' | 'active' | 'contentScript' | 'server' | 'sameOrigin' | 'popup' | 'all-frames',
//   };
//   borderCrossings?: {
//     commsServer?: boolean,
//     iframe?: boolean,
//   }
// }

export default class EventBus {

  private name: string;

  private commands: { [x: string]: EventBusCommand[]} = {};
  private comms?: CommsClient | CommsServer;

  private disableTunnel: boolean = false;
  private popupContext: any = {};

  private iframeForwardingList: {iframe: any, fn: (action, payload, context?) => void}[] = [];

  // private uiUri = window.location.href;

  constructor(options?: {isUWServer?: boolean, name?: string}) {
    if (!options?.isUWServer) {
      this.setupIframeTunnelling();
    }
    this.name = options?.name;
  }

  setupPopupTunnelWorkaround(context: EventBusContext): void {
    this.disableTunnel = true;
    this.popupContext = context;
  }

  //#region lifecycle
  destroy() {
    this.commands = null;
    this.destroyIframeTunnelling();
  }
  //#endregion

  setComms(comms: CommsClient | CommsServer) {
    this.comms = comms;
  }

  subscribe(commandString: string, command: EventBusCommand) {
    if (!this.commands[commandString]) {
      this.commands[commandString] = [command];
    } else {
      this.commands[commandString].push(command);
    }
  }

  subscribeMulti(commands: {[commandString: string]: EventBusCommand}, source?: any) {
    for (const key in commands) {
      this.subscribe(
        key,
        {
          ...commands[key],
          source: source ?? commands[key].source
        }
      );
    }
  }

  /**
   * Removes all commands from a given source
   * @param source
   */
  unsubscribeAll(source: any) {
    for (const commandString in this.commands) {
      this.commands[commandString] = this.commands[commandString].filter(x => x.source !== source);
    }
  }

  forwardToIframe(iframe: any, fn: (action: string, payload: any, context?: EventBusContext) => void) {
    this.cancelIframeForwarding(iframe);
    this.iframeForwardingList.push({iframe, fn});
  }

  cancelIframeForwarding(iframe: any) {
    const existingForwarding = this.iframeForwardingList.findIndex((x: any) => x.iframe === iframe);
    if (existingForwarding !== -1) {
      this.iframeForwardingList.splice(existingForwarding, 1);
    }
  }

  send(command: string, commandData: any, context?: EventBusContext) {
    console.info('sending eventBus command:', this.name, 'command:', {command, commandData, context});
    // execute commands we have subscriptions for

    if (this.commands?.[command]) {
      for (const eventBusCommand of this.commands[command]) {
        eventBusCommand.function(commandData, context);
      }
    }

    // preventing messages from flowing back to their original senders is
    // CommsServer's job. EventBus does not have enough data for this decision.
    // We do, however, have enough data to prevent backflow of messages that
    // crossed CommsServer once already.
    if (
      this.comms
      && context?.origin !== CommsOrigin.Server
      && !context?.borderCrossings?.commsServer
    ) {
      try {
        this.comms.sendMessage({command, config: commandData, context}, context);
      } catch (e) {
        if (command !== 'reload-required') {
          // We shouldn't let reload-required command to trigger new reload-required commands.
          this.send('reload-required', {});
        }
      }
    };

    // call forwarding functions if they exist
    if (!context?.borderCrossings?.iframe) {
      for (const forwarding of this.iframeForwardingList) {
        forwarding.fn(
          command,
          commandData,
          {
            ...context,
            borderCrossings: {
              ...context?.borderCrossings,
              iframe: true
            }
          }
        );
      }
      this.sendToTunnel(command, commandData);
    }

    if (context?.stopPropagation) {
      return;
    }
  }
  //#endregion

  /**
   * Send, but intended for sending commands from iframe to content scripts
   * @param command
   * @param config
   */
  sendToTunnel(command: string, config: any) {
    if (!this.disableTunnel) {
      window.parent.postMessage(
        {
          action: 'uw-bus-tunnel',
          payload: {action: command, config}
        },
        '*'
      );
    } else {
      // because iframe UI components get reused in the popup, we
      // also need to set up a detour because the tunnel is closed
      // in the popup
      if (this.comms) {
        try {
          this.comms.sendMessage({command, config, context: this.popupContext}, this.popupContext);
        } catch (e) {
          if (command !== 'reload-required') {
            this.send('reload-required', {});
          }
        }
      }
    }
  }

  //#region iframe tunnelling
  private setupIframeTunnelling() {
    // forward messages coming from iframe tunnels
    window.addEventListener('message', this.handleIframeMessage);
  }
  private destroyIframeTunnelling() {
    window.removeEventListener('message', this.handleIframeMessage);
  }
  private handleIframeMessage(event: any) {
    if (event.data?.action !== 'uw-bus-tunnel') {
      return;
    }
    console.info(this.name, 'received message from iframe. command:', event.data.payload);
    this.send(event.data.payload.command, event.data.payload.config);
  }

  //#endregion

}
