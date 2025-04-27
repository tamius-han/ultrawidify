<template>
  <div>
    <div class="flex flex-row">
      <div class="flex-grow pointer">
        <b>{{ frame.host ?? frame.key }}</b>
        <span :style="getSiteTypeColor(frame.type)">
          (config: {{frame.type ?? 'unknown'}})
        </span>
      </div>
      <div>Edit</div>
    </div>
    <div v-if="this.siteSettings?.usesSettingsFor">
      <div v-if="this.siteSettings.usesSettingsFor === '@global'">Uses default settings</div>
      <div v-else>Uses settings for: {{this.siteSettings.usesSettingsFor}}</div>
    </div>
    <div class="flex flex-row">
      <small>
        Enabled: <span :style="getSiteEnabledColor(frame.host, 'enable')"><small>{{ getSiteEnabledModes(frame.host, 'enable') }}</small></span>;&nbsp;
        Aard <span :style="getSiteEnabledColor(frame.host, 'enableAard')"><small>{{ getSiteEnabledModes(frame.host, 'enableAard') }}</small></span>;&nbsp;
        kbd: <span :style="getSiteEnabledColor(frame.host, 'enableKeyboard')"><small>{{ getSiteEnabledModes(frame.host, 'enableKeyboard') }}</small></span>
        UI: <span :style="getSiteEnabledColor(frame.host, 'enableUI')"><small>{{ getSiteEnabledModes(frame.host, 'enableUI') }}</small></span>
      </small>
    </div>
  </div>
</template>
<script>
import ExtensionMode from '../../../../../common/enums/ExtensionMode.enum';

export default {
  data() {
    return {
      siteSettings: undefined
    }
  },
  props: [
    'settings',
    'frame',
  ],
  created() {
    this.siteSettings = this.settings.getSiteSettings(this.frame.host ?? this.frame.key);
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
