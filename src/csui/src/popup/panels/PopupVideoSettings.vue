<template>
  <div class="flex flex-col" style="padding-bottom: 20px">
    <div class="flex flex-row">
      <mdicon name="crop" :size="24" />&nbsp;&nbsp;
      <h1>Crop video:</h1>
    </div>

    <CropOptionsPanel
      style="margin-top: -2rem"
      :settings="settings"
      :eventBus="eventBus"
      :siteSettings="siteSettings"
      :isEditing="false"
    >
    </CropOptionsPanel>

    <div class="flex flex-row">
      <mdicon name="crop" :size="24" />&nbsp;&nbsp;
      <h1>Stretch video:</h1>
    </div>

    <StretchOptionsPanel
      style="margin-top: -2rem"
      :settings="settings"
      :eventBus="eventBus"
      :siteSettings="siteSettings"
      :isEditing="false"
    ></StretchOptionsPanel>

    <div class="flex flex-row">
      <mdicon name="crop" :size="24" />&nbsp;&nbsp;
      <h1>Zoom:</h1>
    </div>

  </div>

</template>

<script>
import CropOptionsPanel from '../../PlayerUiPanels/PanelComponents/VideoSettings/CropOptionsPanel';
import StretchOptionsPanel from '../../PlayerUiPanels/PanelComponents/VideoSettings/StretchOptionsPanel.vue';
import ZoomOptionsPanel from '../../PlayerUiPanels/PanelComponents/VideoSettings/ZoomOptionsPanel.vue';

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
    'siteSettings',
    'eventBus',
  ],
  components: {
    CropOptionsPanel, StretchOptionsPanel, ZoomOptionsPanel
  },
  created() {
    this.eventBus.subscribe(
      'uw-config-broadcast',
      {
        source: this,
        function: (config) => this.handleConfigBroadcast(config)
      }
    );
  },
  mounted() {
    this.eventBus.sendToTunnel('get-ar');
  },
  destroyed() {
    this.eventBus.unsubscribeAll(this);
  },
  methods: {

  }
}
</script>

