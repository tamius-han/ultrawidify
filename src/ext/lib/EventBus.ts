import CommsClient from './comms/CommsClient';
import CommsServer from './comms/CommsServer';

export interface EventBusCommand {
  isGlobal?: boolean,
  function: (commandConfig: any, context?: any) => void | Promise<void>
}

export interface EventBusContext {
  stopPropagation?: boolean,

  // Context stuff added by Comms
  fromComms?: boolean,
  comms?: {
    sender?: any,
    port?: any,
    forwardTo?: 'all' | 'active' | 'contentScript' | 'sameOrigin',
  }
}

export default class EventBus {

  private commands: { [x: string]: EventBusCommand[]} = {};
  private downstreamBuses: EventBus[] = [];
  private upstreamBus?: EventBus;
  private comms?: CommsClient;

  //#region lifecycle
  destroy() {
    this.commands = null;
    for (const bus of this.downstreamBuses) {
      bus.destroy();
    }
  }
  //#endregion

  setComms(comms: CommsClient) {
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

    if (this.comms && !context?.fromComms) {
      this.comms.sendMessage({command, config});
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
    window.parent.postMessage(
      {
        action: 'uw-bus-tunnel',
        payload: {action: command, config}
      },
      '*'
    );
  }


  sendDownstream(command: string, config: any, context?: EventBusContext, sourceEventBus?: EventBus) {
    for (const eventBus of this.downstreamBuses) {
      if (eventBus !== sourceEventBus) {
        // prevent eventBus.send from auto-propagating the command
        eventBus.send(command, config, {...context, stopPropagation: true});
        eventBus.sendDownstream(command, config);
      }
    }
  }

  sendUpstream(command: string, config: any, context?: EventBusContext) {
    if (this.upstreamBus) {
      // prevent eventBus.send from auto-propagating the command
      this.upstreamBus.send(command, config, {...context, stopPropagation: true});
      this.upstreamBus.sendUpstream(command, config, context);
      this.upstreamBus.sendDownstream(command, config, context, this);
    }
  }
}
