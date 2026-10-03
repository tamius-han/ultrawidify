import { EventBusMessage } from '@src/common/interfaces/EventBusMessage.interface';
import { CommsOrigin } from '@src/ext/module/comms/comms-origin.enum';

export interface CommsContext {
  port?: any;
  sourceFrame?: any;
}

export interface CommsMessage extends EventBusMessage {
  comms: CommsContext;
  origin?: CommsOrigin;

  _sourceFrame?: any;
  _sourcePort?: any;
}
