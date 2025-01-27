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
