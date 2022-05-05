
export interface EventBusCommand {
  isGlobal?: boolean,
  function: (commandConfig: any) => void | Promise<void>
}

export default class EventBus {

  private commands: { [x: string]: EventBusCommand[]} = {};
  private downstreamBuses: EventBus[] = [];
  private upstreamBus?: EventBus;

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

  send(command: string, config: any, stopPropagation?: boolean) {
    if (!this.commands ||!this.commands[command]) {
      // ensure send is not being called for commands that we have no subscriptions for
      return;
    }

    for (const eventBusCommand of this.commands[command]) {
      eventBusCommand.function(config);

      if (eventBusCommand.isGlobal && !stopPropagation) {
        this.sendUpstream(command, config);
        this.sendDownstream(command, config);
      }
    }
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


  sendGlobal(command: string, config: any) {
    this.send(command, config);
    this.sendUpstream(command, config);
    this.sendDownstream(command, config);
  }


  sendDownstream(command: string, config: any, sourceEventBus?: EventBus) {
    for (const eventBus of this.downstreamBuses) {
      if (eventBus !== sourceEventBus) {
        eventBus.send(command, config);
        eventBus.sendDownstream(command, config);
      }
    }
  }

  sendUpstream(command: string, config: any) {
    if (this.upstreamBus) {
      this.upstreamBus.send(command, config);
      this.upstreamBus.sendUpstream(command, config);
      this.upstreamBus.sendDownstream(command, config, this);
    }
  }
}
