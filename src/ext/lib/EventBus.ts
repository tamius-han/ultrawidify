
export interface EventBusCommand {
  isGlobal?: boolean,
  function: (commandConfig: any) => void | Promise<void>
}

export default class EventBus {

  private commands: { [x: string]: EventBusCommand[]} = {};
  private downstreamBuses: { [x: string]: EventBus } = {};
  private upstreamBus?: EventBus;


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
    if (!this.commands ||!this.commands[command]) {
      // ensure send is not being called for commands that we have no subscriptions for
      return;
    }

    for (const eventBusCommand of this.commands[command]) {
      this.sendUpstream(command, config);
      this.sendDownstream(command, config);
    }
  }

  sendDownstream(command: string, config: any) {

  }
  sendUpstream(command: string, config: any) {

  }
}
