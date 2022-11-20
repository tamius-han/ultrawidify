<template>
  <div class="flex flex-column" style="padding-bottom: 20px">
    <div class="flex flex-row">
      <mdicon name="crop" :size="32" />
      <h1>Crop video:</h1>
    </div>

    <CropOptionsPanel
      :settings="settings"
      :frame="frame"
      :exec="exec"
      :eventBus="eventBus"
      :site="site"
      :isEditing="false"
    >
    </CropOptionsPanel>
  </div>

</template>

<script>
import ExecAction from '../../csui/src/ui-libs/ExecAction';

export default {
  data() {
    return {
      exec: null,
    };
  },
  mixins: [

  ],
  props: [
    'settings',
    'frame',
    'eventBus',
    'site'
  ],
  created() {
    this.exec = new ExecAction(this.settings, window.location.hostname);
    this.eventBus.subscribe('uw-config-broadcast', {function: (config) => this.handleConfigBroadcast(config)});
  },
  mounted() {
    this.eventBus.sendToTunnel('get-ar');
  },
  methods: {

  }
}
</script>
