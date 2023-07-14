<template>
  <div class="">
    <template v-if="!selectedSite">
      <div style="margin-top: 1rem; margin-bottom: 1rem;">
        <b>NOTE:</b> Sites not on this list use default extension settings.
      </div>
      <div v-for="site of sites" :key="site.key" @click="selectedSite = site.key" class="flex flex-column container pointer" style="margin-top: 4px; padding: 0.5rem 1rem;">
        <div class="flex flex-row">
          <div class="flex-grow pointer">
            <b>{{ site.key }}</b>
            <span :style="getSiteTypeColor(site.type)">
              (config: {{site.type ?? 'unknown'}})
            </span></div>
          <div>Edit</div>
        </div>
        <div class="flex flex-row">
          <small>
            Enabled: <span :style="getSiteEnabledColor(site.key, 'enable')"><small>{{ getSiteEnabledModes(site.key, 'enable') }}</small></span>;&nbsp;
            Aard <span :style="getSiteEnabledColor(site.key, 'enableAard')"><small>{{ getSiteEnabledModes(site.key, 'enableAard') }}</small></span>;&nbsp;
            kbd: <span :style="getSiteEnabledColor(site.key, 'enableKeyboard')"><small>{{ getSiteEnabledModes(site.key, 'enableKeyboard') }}</small></span>
          </small>
        </div>
      </div>
    </template>
    <template v-if="selectedSite">
      <div class="flex flex-row container" style="align-items: center; color: #dedede; margin-top: 1rem;">
        <div @click="selectedSite = null" class="pointer button-hover" style=" font-size: 2em; padding: 0.5rem; margin-right: 1em;">
          ←
        </div>
        <div>
          Editing {{ selectedSite }}
        </div>
      </div>
      <div>
        <SiteExtensionSettings
          v-if="selectedSiteSettings"
          :settings="settings"
          :siteSettings="selectedSiteSettings"
          :isDefaultConfiguration="false"
        ></SiteExtensionSettings>
      </div>
    </template>
  </div>
</template>

<script>
import ExtensionMode from '../../../../../common/enums/ExtensionMode.enum';
import SiteExtensionSettings from './SiteExtensionSettings.vue';

export default {
  data() {
    return {
      selectedSite: null,
    }
  },
  props: [
    'settings',
  ],
  components: {
    SiteExtensionSettings,
  },
  computed: {
    sites() {
      if (!this.settings?.active?.sites) {
        return [];
      } else {
        const sites = [];
        for (const siteKey in this.settings.active.sites) {
          if (!siteKey.startsWith('@')) {
            sites.push({
              key: siteKey,
              ...this.settings.active.sites[siteKey]
            })
          }
        };
        sites.sort((a, b) => {
          const cmpa = a.key.replace('www.', '');
          const cmpb = b.key.replace('www.', '');

          return cmpa < cmpb ? -1 : 1;
        });
        return sites;
      }
    },
    selectedSiteSettings() {
      return this.settings?.getSiteSettings(this.selectedSite) ?? null;
    }
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
      if (this.settings?.getSiteSettings(site).data[component]?.normal === ExtensionMode.Enabled) {
        return 'always';
      }
      if (this.settings?.getSiteSettings(site).data[component]?.theater === ExtensionMode.Enabled) {
        return 'T + FS';
      }
      if (this.settings?.getSiteSettings(site).data[component]?.fullscreen === ExtensionMode.Enabled) {
        return 'fullscreen';
      }
      return 'disabled';
    }
  }
}
</script>

<style lang="scss" src="../../../../../res/css/flex.scss" scoped></style>
<style lang="scss" src="../../../res-common/panels.scss" scoped></style>
<style lang="scss" src="../../../res-common/common.scss" scoped></style>
