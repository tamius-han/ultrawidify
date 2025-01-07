import { createApp } from 'vue';
import Notification from './Notification';
import mdiVue from 'mdi-vue/v3';
import * as mdijs from '@mdi/js';

// NOTE — this is in-player interface for ultrawidify
// it is injected into the page in UI.init()

createApp(Notification)
  .use(mdiVue, {icons: mdijs})
  .mount('#app');
