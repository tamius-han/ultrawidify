<template>
  <div class="flex flex-column" style="padding-bottom: 20px">
    <div class="flex flex-row">
      <mdicon name="crop" :size="32" />
      <h3>Crop video:</h3>
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
      <mdicon name="crop" :size="32" />
      <h3>Stretch video:</h3>
    </div>

    <StretchOptionsPanel
      style="margin-top: -2rem"
      :settings="settings"
      :eventBus="eventBus"
      :siteSettings="siteSettings"
      :isEditing="false"
    ></StretchOptionsPanel>

    <div class="flex flex-row">
      <mdicon name="crop" :size="32" />
      <h3>Zoom:</h3>
    </div>

    <ZoomOptionsPanel
      style="margin-top: -2rem"
      :settings="settings"
      :eventBus="eventBus"
      :siteSettings="siteSettings"
      :isEditing="false"
    >
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
    this.eventBus.subscribe('uw-config-broadcast', {function: (config) => this.handleConfigBroadcast(config)});
  },
  mounted() {
    this.eventBus.sendToTunnel('get-ar');
  },
  methods: {

  }
}
</script>

