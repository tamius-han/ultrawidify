<template>
  <div>
    <h1>In-player UI</h1>

    <div
      class="button b3"
      style="margin: 16px; padding: 4px;"
      @click="showInPlayerUi()"
    >
      Show settings window
    </div>

    <div>
      <b>Is your screen entirely white or entirely black?</b>

      <p>This appears to be a rare issue that happens to some people. If you're experiencing this issue, please consider contacting me and sharing the following data:</p>

      <ul>
        <li>Which sites this problem appears on and whether it happens on youtube. If you use youtube premium, please try signing out of youtube (or use a new profile in Google Chrome) in order to see whether youtube premium is required.</li>
        <li>your browser. if using browsers other than Chrome, please try to reproduce this issue in Chrome</li>
        <li>your operating system</li>
        <li>your graphics card</li>
        <li>the following line:<br/>
          <pre>prefers-color-scheme dark: {{pageData.pcsDark}}; prefers-color-scheme light: {{pageData.pcsLight}}; color-scheme: {{pageData.colorScheme}}</pre>
        </li>
      </ul>

      <p>Please post this info to <a href="https://github.com/tamius-han/ultrawidify/issues/262" target="_blank">this thread</a>, or message me via e-mail.</p>

      <p>Then, disable the in-player UI.</p>
    </div>

    <!-- <p></p>
    <p></p>
    <p>In-player UI should show and hide automatically as you start or stop moving your mouse inside the player window.</p>
    <p>Note that by default, in-player UI may not show if player window is not big enough.</p> -->
  </div>
</template>

<script>
import UIProbeMixin from '../utils/UIProbeMixin';

export default {
  mixins: [
    UIProbeMixin
  ],
  props: [
    'eventBus',
  ],
  data() {
    return {
      pageData: {
        pcsDark: 'x',
        pcsLight: 'x',
        colorScheme: 'x'
      },
    }
  },
  created() {
    this.eventBus.subscribeMulti(
      {
        'uw-page-stats': {
          function: (data) => {
            console.log('got page statss:', data);
            this.pageData = data;
          }
        }
      },
      this
    );
    this.eventBus.send('uw-get-page-stats', {}, {comms: {forwardTo: 'active'}});
  },
  methods: {
    showInPlayerUi() {
      this.eventBus.send('uw-set-ui-state', {globalUiVisible: true}, {comms: {forwardTo: 'active'}});
    }
  }
}
</script>
