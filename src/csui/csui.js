import { createApp } from 'vue';
import PlayerOverlay from './PlayerOverlay';
import mdiVue from 'mdi-vue/v3';
import * as mdijs from '@mdi/js';

// NOTE — this is in-player interface for ultrawidify
// it is injected into the page in UI.init()

createApp(PlayerOverlay)
  .use(mdiVue, {icons: mdijs})
  .mount('#app');
