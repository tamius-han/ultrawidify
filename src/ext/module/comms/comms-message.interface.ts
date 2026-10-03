import { EventBusMessage } from '@src/common/interfaces/EventBusMessage.interface';
import { CommsOrigin } from '@src/ext/module/comms/comms-origin.enum';

export interface CommsMessage extends EventBusMessage {
  origin?: CommsOrigin;

  _sourceFrame?: any;
  _sourcePort?: any;
}
