import CommsClient, { CommsOrigin } from './comms/CommsClient';
import CommsServer from './comms/CommsServer';

export interface EventBusCommand {
  isGlobal?: boolean,
  function: (commandConfig: any, context?: any) => void | Promise<void>
}

export interface EventBusContext {
  stopPropagation?: boolean,

  // Context stuff added by Comms
  origin?: CommsOrigin,
  comms?: {
    sender?: any,
    port?: any,
    frame?: any,
    forwardTo?: 'all' | 'active' | 'contentScript' | 'server' | 'sameOrigin' | 'popup',
  }
}

export default class EventBus {

  private commands: { [x: string]: EventBusCommand[]} = {};
  private downstreamBuses: EventBus[] = [];
  private upstreamBus?: EventBus;
  private comms?: CommsClient | CommsServer;

  private disableTunnel: boolean = false;
  private popupContext: any = {};

  setupPopupTunnelWorkaround(context: EventBusContext): void {
    this.disableTunnel = true;
    this.popupContext = context;
  }

  //#region lifecycle
  destroy() {
    this.commands = null;
    for (const bus of this.downstreamBuses) {
      bus.destroy();
    }
  }
  //#endregion

  setComms(comms: CommsClient | CommsServer) {
    this.comms = comms;
  }

  setUpstreamBus(eventBus: EventBus, stopRecursing: boolean = false) {
    this.upstreamBus = eventBus;
    if (!stopRecursing) {
      this.upstreamBus.addDownstreamBus(this, true);
    }
  }

  unsetUpstreamBus(stopRecursing: boolean = false) {
    if (!stopRecursing) {
      this.upstreamBus.removeDownstreamBus(this, false);
    }
    this.upstreamBus = undefined;
  }

  addDownstreamBus(eventBus: EventBus, stopRecursing: boolean = false) {
    if (!this.downstreamBuses.includes(eventBus)) {
      this.downstreamBuses.push(eventBus);

      if (!stopRecursing) {
        eventBus.setUpstreamBus(this, true);
      }
    }
  }

  removeDownstreamBus(eventBus: EventBus, stopRecursing: boolean = false) {
    this.downstreamBuses = this.downstreamBuses.filter(x => x !== eventBus);
    if (!stopRecursing) {
      eventBus.unsetUpstreamBus(true);
    }
  }

  subscribe(commandString: string, command: EventBusCommand) {
    if (!this.commands[commandString]) {
      this.commands[commandString] = [command];
    } else {
      this.commands[commandString].push(command);
    }
  }

  send(command: string, config: any, context?: EventBusContext) {
    // execute commands we have subscriptions for
    if (this.commands?.[command]) {
      for (const eventBusCommand of this.commands[command]) {
        eventBusCommand.function(config, context);
      }
    }

    // preventing messages from flowing back to their original senders is
    // CommsServer's job. EventBus does not have enough data for this decision.
    if (this.comms) {
      this.comms.sendMessage({command, config, context}, context);
    }

    if (context?.stopPropagation) {
      return;
    }

    // propagate commands across the bus
    this.sendUpstream(command, config, context);
    this.sendDownstream(command, config, context);
  }

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


  private sendDownstream(command: string, config: any, context?: EventBusContext, sourceEventBus?: EventBus) {
    for (const eventBus of this.downstreamBuses) {
      if (eventBus !== sourceEventBus) {
        // prevent eventBus.send from auto-propagating the command
        eventBus.send(command, config, {...context, stopPropagation: true});
        eventBus.sendDownstream(command, config);
      }
    }
  }

  private sendUpstream(command: string, config: any, context?: EventBusContext) {
    if (this.upstreamBus) {
      // prevent eventBus.send from auto-propagating the command
      this.upstreamBus.send(command, config, {...context, stopPropagation: true});
      this.upstreamBus.sendUpstream(command, config, context);
      this.upstreamBus.sendDownstream(command, config, context, this);
    }
  }
}
