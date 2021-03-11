import { createApp } from 'vue'
import App from './ExtensionActionButtonApp.vue';

class Popup {
  static createApp() {
    createApp(App).mount('#app');
  }
}

export default Popup;