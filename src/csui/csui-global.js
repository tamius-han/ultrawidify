import { createApp } from 'vue';
import GlobalFrame from './GlobalFrame';
import mdiVue from 'mdi-vue/v3';
import * as mdijs from '@mdi/js';

// NOTE — this is in-player interface for ultrawidify
// it is injected into the page in UI.init()

createApp(GlobalFrame)
  .use(mdiVue, {icons: mdijs})
  .mount('#app');
