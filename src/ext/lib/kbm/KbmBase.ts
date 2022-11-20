import EventBus, { EventBusCommand } from '../EventBus';
import Logger from '../Logger';
import Settings from '../Settings';

export class KbmBase {
  logger: Logger;
  settings: Settings;
  eventBus: EventBus;

  // eventBusCommands: { [x: string]: EventBusCommand } = {
  //   'kbm-enable': {
  //     function: () => this.enable()
  //   },
  //   'kbm-disable': {
  //     function: () => this.disable()
  //   },
  //   'kbm-set-config': {
  //     function: (data: {config: any, temporary?: boolean}) => this.setConfig(data.config, data.temporary),
  //   },
  //   'uw-enable': {
  //     function: () => this.load()
  //   },
  //   'uw-disable': {
  //     function: () => this.disable()
  //   },
  // }

  constructor(eventBus: EventBus, settings: Settings, logger: Logger) {
    this.logger = logger;
    this.settings = settings;
    this.eventBus = eventBus;
  }
}

export default KbmBase;
