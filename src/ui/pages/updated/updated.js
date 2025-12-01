import { createApp } from 'vue';
import App from './App';
import mdiVue from 'mdi-vue/v3';
import * as mdijs from '@mdi/js';

// import '@src/res-common/common.scss';

// NOTE — this is in-player interface for ultrawidify
// it is injected into the page in UI.init()

createApp(App)
  .use(mdiVue, {icons: mdijs})
  .mount('#app');
