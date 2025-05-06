import { IframeData } from './video-data/IframeManager';
import CommsClient, { CommsOrigin } from './comms/CommsClient';
import CommsServer from './comms/CommsServer';

export interface EventBusCommand {
  isGlobal?: boolean,
  source?: any,
  function: (commandData: any, context?: any) => void | Promise<void>
}

export interface EventBusContext {
  stopPropagation?: boolean,

  // Context stuff added by Comms
  origin?: CommsOrigin,
  comms?: {
    sender?: any,
    port?: any,
    frame?: any,
    sourceFrame?: IframeData
    forwardTo?: 'all' | 'active' | 'contentScript' | 'server' | 'sameOrigin' | 'popup' | 'all-frames',
  }
}

export default class EventBus {

  private commands: { [x: string]: EventBusCommand[]} = {};
  private comms?: CommsClient | CommsServer;

  private disableTunnel: boolean = false;
  private popupContext: any = {};
  // private uiUri = window.location.href;

  constructor(options?: {isUWServer?: boolean}) {
    if (!options?.isUWServer) {
      this.setupIframeTunnelling();
    }
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

  send(command: string, commandData: any, context?: EventBusContext) {
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
    if (this.comms && context?.origin !== CommsOrigin.Server) {
      this.comms.sendMessage({command, config: commandData, context}, context);
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
        this.comms.sendMessage({command, config, context: this.popupContext}, this.popupContext);
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
    // console.log('GOT IFRAME MESSAGE!', event)
  }

  //#endregion

}
