import { EventBusCommand, EventBusContext, EventBusMessage } from '@src/common/interfaces/EventBusMessage.interface';
import { IframeTunnelPayload } from '@src/common/interfaces/IframeTunnelPayload.interface';
import Comms from '@src/ext/module/comms/Comms';
import CommsClient, { CommsOrigin } from '@src/ext/module/comms/CommsClient';
import CommsServer from '@src/ext/module/comms/CommsServer';


export default class EventBus {

  private name: string;
  private uuid = crypto.randomUUID();

  private commands: { [x: string]: EventBusCommand[]} = {};
  private comms?: CommsClient | CommsServer;
  private commsOrigin: CommsOrigin;


  private disableTunnel: boolean = false;
  private popupContext: any = {};

  private iframeForwardingList: {iframe: any, fn: (action, payload, context?) => void}[] = [];

  // private uiUri = window.location.href;

  constructor(options?: {isUWServer?: boolean, name?: string, commsOrigin?: CommsOrigin}) {
    if (!options?.isUWServer) {
      this.setupIframeTunnelling();
    }
    this.name = options?.name ?? '(unnamed EventBus)';
    this.commsOrigin = options?.commsOrigin;
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

  send(command: string, commandData: any, context: EventBusContext = {}) {
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
      this.sendToTunnel(command, commandData, context);
    } else {
      console.warn('message was already sent to iframe, doing nothing ...')
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
  sendToTunnel(command: string, config: any, context: EventBusContext = {}) {
    context.visitedBusses = [...context.visitedBusses ?? [], this.uuid];

    if (!this.disableTunnel && typeof window !== 'undefined') {
      window.parent.postMessage(
        {
          action: 'uw-bus-tunnel',
          payload: {command, config, context} as EventBusMessage
        },
        '*'
      );
    } else {
      // because iframe UI components get reused in the popup, we
      // also need to set up a detour because the tunnel is closed
      // in the popup
      if (this.comms) {
        try {
          this.comms.sendMessage(
            {
              command,
              config,
              context: {
                ...this.popupContext,
                ...context
              }
            },
            this.popupContext
          );
        } catch (e) {
          if (command !== 'reload-required') {
            this.send('reload-required', {}, context);
          }
        }
      }
    }
  }

  //#region iframe tunnelling
  private setupIframeTunnelling() {
    // forward messages coming from iframe tunnels
    window.addEventListener('message', this);
  }
  private destroyIframeTunnelling() {
    window.removeEventListener('message', this);
  }
  /**
   * Handles 'message' events (formerly handleIframeMessage)
   * @param event
   * @returns
   */
  handleEvent(event: any) {
    if (event.data?.action !== 'uw-bus-tunnel') {
      return;
    }

    const payload = event.data.payload as EventBusMessage;

    console.info(this.name, 'received message from iframe. command:', payload);
    if (!payload.context) {
      console.warn('Received iframe message without context. Doing nothing in order to avoid infinite loop. Event:', event);
      return;
    }

    if (payload.context?.visitedBusses?.includes(this.uuid)) {
      return;
    }

    this.send(payload.command, payload.config, payload.context);
  }

  //#endregion

}
