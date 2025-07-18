<template>
  <div>
    <div class="flex flex-row">
      <div class="flex-grow pointer">
        <b>{{ host }}</b>
        <span :style="getSiteTypeColor(siteSettings?.data?.type)">
          (config: {{siteSettings?.data?.type ?? 'unknown'}})
        </span>
      </div>
      <div>Edit</div>
    </div>
    <div v-if="this.siteSettings?.usesSettingsFor">
      <div v-if="this.siteSettings.usesSettingsFor === '@global'">Uses default settings</div>
      <div v-else>Uses settings for: <span class="info-color">{{this.siteSettings.usesSettingsFor}}</span></div>
    </div>
    <div class="flex flex-row">
      <small>
        Enabled: <span :style="getSiteEnabledColor(host, 'enable')"><small>{{ getSiteEnabledModes(host, 'enable') }}</small></span>;&nbsp;
        Aard <span :style="getSiteEnabledColor(host, 'enableAard')"><small>{{ getSiteEnabledModes(host, 'enableAard') }}</small></span>;&nbsp;
        kbd: <span :style="getSiteEnabledColor(host, 'enableKeyboard')"><small>{{ getSiteEnabledModes(host, 'enableKeyboard') }}</small></span>
        UI: <span :style="getSiteEnabledColor(host, 'enableUI')"><small>{{ getSiteEnabledModes(host, 'enableUI') }}</small></span>
      </small>
    </div>
  </div>
</template>
<script>
import ExtensionMode from '../../../../../common/enums/ExtensionMode.enum';

export default {
  data() {
    return {
      siteSettings: undefined,
      supportType: undefined
    }
  },
  props: [
    'settings',
    'parentHost',
    'host',
  ],
  created() {
    this.siteSettings = this.settings.getSiteSettings({site: this.host, isIframe: this.parentHost && this.host !== this.parentHost, parentHostname: this.parentHost});
  },
  methods: {
    getSiteTypeColor(siteType) {
      switch (siteType) {
        case 'official': return 'color: #fa6';
        case 'community': return 'color: rgb(114, 114, 218)';
        case 'officially-disabled': return 'color: #f00';
        case 'testing': return 'color: #d81';
        default: return 'color: rgb(138, 65, 126)'
      };
    },
    getSiteEnabledColor(site, component) {
      const status = this.getSiteEnabledModes(site, component);
      return status === 'disabled' ? 'color: #f00' : 'color: #1f8';
    },
    getSiteEnabledModes(site, component) {
      if (this.siteSettings?.normal === ExtensionMode.Enabled) {
        return 'always';
      }
      if (this.siteSettings?.data[component]?.theater === ExtensionMode.Enabled) {
        return 'T + FS';
      }
      if (this.siteSettings?.data[component]?.fullscreen === ExtensionMode.Enabled) {
        return 'fullscreen';
      }
      return 'disabled';
    }
  }
}
</script>
