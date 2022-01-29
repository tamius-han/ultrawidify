import { createApp } from 'vue';
import PlayerUiBase from './PlayerUiBase';
import mdiVue from 'mdi-vue/v3';
import * as mdijs from '@mdi/js';

createApp(PlayerUiBase)
  .use(mdiVue, {icons: mdijs})
  .mount('#app');
