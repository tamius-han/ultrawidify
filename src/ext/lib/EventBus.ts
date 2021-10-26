
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
    for (const eventBusCommand of this.commands[command]) {
      eventBusCommand.function(config);

      if (eventBusCommand.isGlobal && !stopPropagation) {
        this.sendUpstream(command, config);
        this.sendDownstream(command, config);
      }
    }
  }

  sendGlobal(command: string, config: any) {
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
