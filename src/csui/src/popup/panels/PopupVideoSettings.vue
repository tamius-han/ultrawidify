<template>
  <div class="flex flex-col" style="padding-bottom: 20px">

    <!--
      Extension is disabled for a given site when it's disabled in full screen, since
      current settings do not allow the extension to only be disabled while in full screen
     -->
    <template v-if="siteSettings.isEnabledForEnvironment(false, true) === ExtensionMode.Disabled">
      <div class="info">
        Extension is not enabled for this site.
      </div>
    </template>

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
import ExtensionMode from '@src/common/enums/ExtensionMode.enum.ts';

export default {
  data() {
    return {
      exec: null,
      ExtensionMode: ExtensionMode,
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

