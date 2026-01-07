import { CommsOrigin } from '@/ext/module/comms/CommsClient';
import type { Runtime } from 'chrome';

export interface EventBusCommand {
  isGlobal?: boolean,
  source?: any,
  function: (commandData: any, context?: EventBusContext) => void | Promise<void>
}

export interface EventBusMessage<T = unknown> {
  command: string;
  config?: T;
  context?: EventBusContext;
}

export interface EventBusContext {
  stopPropagation?: boolean;

  origin?: CommsOrigin;

  // tab?: number;
  // frame?: number;
  // port?: string;

  comms?: {
    forwardTo?: 'all' | 'active' | 'popup' | 'contentScript' | 'all-frames';
    sender?: Runtime.MessageSender;
    port?: Runtime.Port;
    // frame?: any;
    sourceFrame?: {
      tabId: number;
      frameId: number;
    };
  };
  borderCrossings?: {
    commsServer?: boolean,
    iframe?: boolean,
  };
}
