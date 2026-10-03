import { EventBusCommand, EventBusContext, EventBusMessage } from '@src/common/interfaces/EventBusMessage.interface';
import { IframeTunnelPayload } from '@src/common/interfaces/IframeTunnelPayload.interface';
import Comms from '@src/ext/module/comms/Comms';
import CommsClient from '@src/ext/module/comms/CommsClient';
import { CommsOrigin } from '@src/ext/module/comms/comms-origin.enum';
import CommsServer from '@src/ext/module/comms/CommsServer';


export default class EventBus {

  private name: string;
  private uuid = crypto.randomUUID();

  private commands: { [x: string]: EventBusCommand[]} = {};
  private comms?: CommsClient | CommsServer;
  private commsOrigin: CommsOrigin;

  private lastExecutedCommandIds: string[] = new Array(32);
  private lastExecutedCommandIndex: number = 0;

  private disableTunnel: boolean = false;
  private popupContext: any = {};

  private iframeForwardingList: {iframe: any, fn: (action, payload, context?) => void}[] = [];

  // private uiUri = window.location.href;

  constructor(options: {isUWServer?: boolean, name?: string, commsOrigin: CommsOrigin}) {
    if (!options?.isUWServer) {
      this.setupIframeTunnelling();
    }
    this.name = options?.name ?? '(unnamed EventBus)';
    this.commsOrigin = options.commsOrigin;
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

  private cloneContext(context: EventBusContext = {}): EventBusContext {
    return {
      stopPropagation: context.stopPropagation,
      origin: context.origin,
      frameUrl: context.frameUrl,
      visitedBusses: context.visitedBusses ? [...context.visitedBusses] : undefined,
      commandId: context.commandId,
      comms: context.comms ? {
        forwardTo: context.comms.forwardTo,
        sourceFrame: context.comms?.sourceFrame ? { ...context.comms?.sourceFrame } : undefined
      } : undefined,
      borderCrossings: context.borderCrossings ? { ...context.borderCrossings } : undefined
    };
  }


  /**
   * MESSAGE ROUTING MAP
   * Here's how messages should be routed through different parts of extension.
   *
   * uwui              ::             content script                      ::        background script
   *                   ::             (main page)          (dest. inside  ::
   * (Command with     ::                                   main page)    ::
   * origin in uwui)   ::  (command with origin in main      A         . .::.                                        ||
   *     |             ::  page content script) ———>——+      |       .     ::. . . . .
   *     V             ::                             +—> send()   .        ::         . . . . .
   *   send() ———+     :::::. window eventListener >——+    | . . .          ::.                   . . . . .
   *     |       |         ::::.  'message'           |    |.  CommsClient    ::    CommsServer             .
   *     |  window.parent     ::     A    +————————<—]|[<——+—> sendMessage() —)(—> processReceivedMessage() ———> send()
   *     |    .postMessage() —)(—————+    |           |     .                 ::.                           .      |
   *     |                    ::          |           A     .                  :::::::::::.                 .      |
   *     |             :::::::::          |           |     .                            ::                  .     |
   *     V             ::                 V           +—————— processReceivedMessage() <—)(—+                  .   |
   * eventBusCommand <—)(—— forwardToIframe()               .                           .:: |                    . |
   *  .function()      ::                                  .::::::::::::::::::::::::::::::  |                      | . . .
   *      |            ::                                .:::                               |                      V
   *      V            ::                              .::                                  |              sendMessage()
   * (dest. inside     ::::::::::::::::::::::::::::::::::                                   |                      |
   * uwui)             ::                                                                   +—< sendToActive() <———+
   * ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
   *            ||            content script
   *            ||            (embedded pages)
   *
   *
   * uwui
   *
   *
   * @param command
   * @param commandData
   * @param context
   * @returns
   */

  send(command: string, commandData: any, context: EventBusContext = {}) {
    // context = this.cloneContext(context);  // Firefox throws an error if we don't clone the context.

    if (context.visitedBusses?.includes(this.uuid)) {
      console.warn('this bus was already visited before. Doing nothing.');
      return;
    }
    if (context.commandId && this.lastExecutedCommandIds.includes(context.commandId)) {
      // console.warn('this command was already sent:', context, this.lastExecutedCommandIds);
      // return;
    }

    // Popup bus: make forwarding explicit. Commands sent from the popup (aspect ratio, zoom, alignment ...)
    // must reach content scripts of ALL frames in the active tab — that includes embedded sites —
    // not just the top frame. setupPopupTunnelWorkaround() stores the context we need for that.
    if (this.disableTunnel && this.popupContext?.comms && !context.comms) {
      context.comms = { ...this.popupContext.comms };
    }

    // we want to avoid re-assigning context.visitedBusses if possible
    // in order to reduce the amount of garbage that needs to be collected.
    context.visitedBusses ? context.visitedBusses.push(this.uuid) : context.visitedBusses = [this.uuid];

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
    if (!context.commandId) {
      context.commandId = crypto.randomUUID();
    }
    if (context.commandId) {
      const i = this.lastExecutedCommandIndex++ % this.lastExecutedCommandIds.length;
      this.lastExecutedCommandIds[i] = context.commandId;
    }
    if (!context.origin) {
      context.origin = this.commsOrigin;
    }

    if (
      this.comms
      && (  // ensure each message only enters commsServer once!
        this.commsOrigin === context.origin         // if these two differ, we already sent that message through Comms once,
        || this.commsOrigin === CommsOrigin.Server  // CommsServer needs to forward everything, otherwise messages stop on
      )
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

    // call forwarding functions if they exist.
    // note that server->iframe forwarding is handled later
    for (const forwarding of this.iframeForwardingList) {
      forwarding.fn(
        command,
        commandData,
        {
          ...context,
          borderCrossings: {
            ...context?.borderCrossings,
          }
        }
      );
    };

    //
    if (this.comms instanceof CommsServer) {
      // this.comms
    }

    // send to parent iframe
    if (!this.disableTunnel && typeof window !== 'undefined') {
      window.parent.postMessage(
        {
          action: 'uw-bus-tunnel',
          payload: {command, config: commandData, context} as EventBusMessage
        },
        '*'
      );
    }

    if (context?.stopPropagation) {
      return;
    }
  }
  //#endregion

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

    if (!payload.context?.visitedBusses) {
      // this should never be visible to a real user
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
