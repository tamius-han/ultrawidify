import EventBus from '../../../ext/lib/EventBus';
import { ComponentLogger } from '../../../ext/lib/logging/ComponentLogger';
import { LogAggregator } from '../../../ext/lib/logging/LogAggregator';
import Settings from '../../../ext/lib/settings/Settings';

const loadedTabs = [
  'videoSettings',
  'extensionSettings',
  'changelog',
  'about',
];

async function load() {
  const _uw_data = {
    eventBus: new EventBus(),
    settings: {},
    settingsInitialized: false,
    logAggregator: undefined,
    logger: undefined,
    site: undefined,
    siteSettings: undefined,
    comms: undefined,
  };

  _uw_data.logAggregator = new LogAggregator('🔵ext-popup🔵');
  _uw_data.logger = new ComponentLogger(_uw_data.logAggregator, 'Popup');
  _uw_data.settings = new Settings({logAggregator: _uw_data.logAggregator});

  _uw_data.
}
