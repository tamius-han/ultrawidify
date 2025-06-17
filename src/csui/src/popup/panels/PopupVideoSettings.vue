<template>
  <div class="flex flex-col relative h-full" style="padding-bottom: 20px">
    <!--
      Extension is disabled for a given site when it's disabled in full screen, since
      current settings do not allow the extension to only be disabled while in full screen
     -->
    <template v-if="siteSettings.isEnabledForEnvironment(false, true) === ExtensionMode.Disabled && !enabledHosts?.length">
      <div class="h-full flex flex-col items-center justify-center">
        <div class="info">
          Extension is not enabled for this site.
        </div>
        <div>
          Please enable extension for this site.
        </div>
      </div>
    </template>
    <template v-else>
      <div
        v-if="siteSettings.isEnabledForEnvironment(false, true) === ExtensionMode.Disabled"
        class="warning-compact"
      >
        <b>Extension is disabled for this site.</b><br />
        <small>Controls will only work on content embedded from the following sites:</small><br/>
        <div class="w-full flex flex-row justify-center">
          <span v-for="frameSite of enabledHosts" :key="frameSite.host" class="website-name">{{frameSite.host}}</span>
        </div>
      </div>

      <div class="flex flex-row">
        <mdicon name="crop" :size="16" />&nbsp;&nbsp;
        <span>CROP</span>
      </div>
      <div
        style="margin-top: -0.69rem; margin-bottom: 0.88rem;"
      >
        <CropOptionsPanel
          :settings="settings"
          :eventBus="eventBus"
          :siteSettings="siteSettings"
          :isEditing="false"
          :compact="true"
        >
        </CropOptionsPanel>
      </div>

      <div class="flex flex-row">
        <mdicon name="crop" :size="16" />&nbsp;&nbsp;
        <span>STRETCH</span>
      </div>
      <div
        style="margin-top: -0.69rem; margin-bottom: 0.88rem;"
      >
        <StretchOptionsPanel
          :settings="settings"
          :eventBus="eventBus"
          :siteSettings="siteSettings"
          :isEditing="false"
          :compact="true"
        ></StretchOptionsPanel>
      </div>

      <div class="flex flex-row">
        <mdicon name="crop" :size="16" />&nbsp;&nbsp;
        <span>ZOOM</span>
      </div>
      <div
        style="margin-top: -0.69rem; margin-bottom: 0.88rem;"
      >
        <ZoomOptionsPanel
          :settings="settings"
          :eventBus="eventBus"
          :siteSettings="siteSettings"
          :isEditing="false"
          :compact="true"
        >
        </ZoomOptionsPanel>
      </div>

      <div class="flex flex-row">
        <mdicon name="crop" :size="16" />&nbsp;&nbsp;
        <span>ALIGN</span>
      </div>
      <div
        style="margin-bottom: 0.88rem;"
      >
        <AlignmentOptionsControlComponent
          :eventBus="eventBus"
          :large="true"
        > </AlignmentOptionsControlComponent>
      </div>
    </template>

  </div>

</template>

<script>
import CropOptionsPanel from '@csui/src/PlayerUiPanels/PanelComponents/VideoSettings/CropOptionsPanel';
import StretchOptionsPanel from '@csui/src/PlayerUiPanels/PanelComponents/VideoSettings/StretchOptionsPanel.vue';
import ZoomOptionsPanel from '@csui/src/PlayerUiPanels/PanelComponents/VideoSettings/ZoomOptionsPanel.vue';
import ExtensionMode from '@src/common/enums/ExtensionMode.enum.ts';
import AlignmentOptionsControlComponent from '@csui/src/PlayerUiPanels/AlignmentOptionsControlComponent.vue';
import { SiteSettings } from '../../../../ext/lib/settings/SiteSettings';

export default {
  components: {
    CropOptionsPanel,
    StretchOptionsPanel,
    ZoomOptionsPanel,
    AlignmentOptionsControlComponent
  },
  mixins: [

  ],
  props: [
    'site',
    'settings',
    'siteSettings',
    'eventBus',
    'hosts'
  ],
  data() {
    return {
      exec: null,
      ExtensionMode: ExtensionMode,
      enabledHosts: [],
    };
  },
  watch: {
    hosts(val) {
      this.filterActiveSites(val);
    }
  },
  created() {
    this.eventBus.subscribe(
      'uw-config-broadcast',
      {
        source: this,
        function: (config) => this.handleConfigBroadcast(config)
      }
    );
    this.filterActiveSites(this.hosts);
  },
  mounted() {
    this.eventBus.sendToTunnel('get-ar');
  },
  destroyed() {
    this.eventBus.unsubscribeAll(this);
  },
  methods: {
    filterActiveSites(val) {
      this.enabledHosts = [];

      for (const host of val) {
        const siteSettings = new SiteSettings(this.settings, host);

        if (siteSettings.isEnabledForEnvironment(false, true) === ExtensionMode.Enabled) {
          this.enabledHosts.push(host);
        }
      }
    }
  }
}
</script>
<style lang="scss" scoped>
.warning-compact {
  background-color: #d6ba4a;
  color: #000;
  padding: 0.5rem 1rem;
  margin-top: -0.5rem;
  margin-bottom: 0.5rem;

  .website-name {
    font-size: 0.85rem;

    &:not(:last-of-type)::after {
      content: ','
    }
  }
}
</style>
