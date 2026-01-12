import { EventBusMessage } from '@src/common/interfaces/EventBusMessage.interface';

export interface IframeTunnelPayload {
  action: string,
  payload: EventBusMessage,
}
