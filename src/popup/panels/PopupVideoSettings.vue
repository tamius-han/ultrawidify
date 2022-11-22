<template>
  <div class="flex flex-column" style="padding-bottom: 20px">
    <div class="flex flex-row">
      <mdicon name="crop" :size="32" />
      <h3>Crop video:</h3>
    </div>

    <CropOptionsPanel
      style="margin-top: -2rem"
      :settings="settings"
      :frame="frame"
      :exec="exec"
      :eventBus="eventBus"
      :site="site"
      :isEditing="false"
    >
    </CropOptionsPanel>

    <div class="flex flex-row">
      <mdicon name="crop" :size="32" />
      <h3>Stretch video:</h3>
    </div>

    <StretchOptionsPanel
      style="margin-top: -2rem"
      :settings="settings"
      :frame="frame"
      :exec="exec"
      :eventBus="eventBus"
      :site="site"
      :isEditing="false"
    ></StretchOptionsPanel>

    <div class="flex flex-row">
      <mdicon name="crop" :size="32" />
      <h3>Zoom:</h3>
    </div>

    <ZoomOptionsPanel
      style="margin-top: -2rem"
      :settings="settings"
      :frame="frame"
      :exec="exec"
      :eventBus="eventBus"
      :site="site"
      :isEditing="false">
    </ZoomOptionsPanel>

    <div class="flex flex-row">
      <mdicon name="crop" :size="32" />
      <h3>Video alignment:</h3>
    </div>

    <div class="flex flex-row">
      <alignment-options-control-component
        :eventBus="eventBus"
      >
      </alignment-options-control-component>
    </div>


  </div>

</template>

<script>
import ZoomOptionsPanel from '../../csui/src/PlayerUiPanels/PanelComponents/VideoSettings/ZoomOptionsPanel.vue'
import StretchOptionsPanel from '../../csui/src/PlayerUiPanels/PanelComponents/VideoSettings/StretchOptionsPanel.vue'
import CropOptionsPanel from '../../csui/src/PlayerUiPanels/PanelComponents/VideoSettings/CropOptionsPanel.vue'
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
  components: {
    CropOptionsPanel, StretchOptionsPanel, ZoomOptionsPanel
  },
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
