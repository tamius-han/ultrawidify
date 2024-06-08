import { createApp } from 'vue'
import Popup from './Popup';
import mdiVue from 'mdi-vue/v3';
import * as mdijs from '@mdi/js';
import './index.css';

createApp(Popup)
  .use(mdiVue, {icons: mdijs})
  .mount('#app');
