<template>
  <div>
    <h1>In-player UI</h1>
    <div
      class="button b3"
      style="margin: 16px; padding: 4px;"
      @click="showInPlayerUi()"
    >
      Show in-player UI
    </div>
    <p></p>
    <p></p>
    <p>In-player UI should show and hide automatically as you start or stop moving your mouse inside the player window.</p>
    <p>Note that by default, in-player UI may not show if player window is not big enough.</p>
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
  methods: {
    showInPlayerUi() {
      this.eventBus.send('uw-set-ui-state', {globalUiVisible: true}, {comms: {forwardTo: 'active'}});
    }
  }
}
</script>
