<template>
  <div class="">
    <template v-if="!selectedSite">

      <div class="flex flex-col container pointer hoverable" style="margin-top: 1rem; padding: 0.5rem 1rem;" @click="selectedSite = '@global'" >
        <div class="flex flex-row">
          <div class="flex-grow pointer">
            <b style="color: #fa6">Default settings</b>
            <!-- <span :style="getSiteTypeColor('@global')"> -->
              <!-- (config: {{site.type ?? 'unknown'}}) -->
            <!-- </span> -->
          </div>
          <div>Edit</div>
        </div>
        <div class="flex flex-row">
          <small>
            <span style="text-transform: uppercase; font-size: 0.9rem">Enable extension: <span style="font-size: 0.9rem;" :style="getSiteEnabledColor('@global', 'enable')">{{ getSiteEnabledModes('@global', 'enable') }}</span></span>&nbsp;<br/>
            Autodetection: <span :style="getSiteEnabledColor('@global', 'enableAard')"><small>{{ getSiteEnabledModes('@global', 'enableAard') }}</small></span>;&nbsp;
            Keyboard shortcuts: <span :style="getSiteEnabledColor('@global', 'enableKeyboard')"><small>{{ getSiteEnabledModes('@global', 'enableKeyboard') }}</small></span>;
            In-player UI: <span :style="getSiteEnabledColor('@global', 'enableUI')"><small>{{ getSiteEnabledModes('@global', 'enableUI') }}</small></span>;
          </small>
        </div>
      </div>

      <div style="margin-top: 1rem; margin-bottom: 1rem;">
        <div  class="info" style="float: none">
          <b>NOTE:</b> Sites not on this list use default extension settings.
        </div>
      </div>
      <div class="w-full text-center" style="margin-bottom: -1.25rem">
        <b>Other sites</b>
      </div>
      <div style="margin: 1rem 0rem" class="w-full">
        <div class="flex flex-row items-baseline">
          <div style="margin-right: 1rem">Search for site:</div>
          <div class="input flex-grow">
            <input v-model="siteFilter" />
          </div>
        </div>
      </div>
      <div v-for="site of sites" :key="site.key" @click="selectedSite = site.key" class="flex flex-col container pointer hoverable" style="margin-top: 4px; padding: 0.5rem 1rem;">
        <div class="flex flex-row">
          <div class="flex-grow pointer">
            <b>{{ site.key }}</b>
            <span :style="getSiteTypeColor(site.type)">
              (config: {{site.type ?? 'unknown'}})
            </span>
          </div>
          <div>Edit</div>
        </div>
        <div class="flex flex-row">
          <small>
            Enabled: <span :style="getSiteEnabledColor(site.key, 'enable')"><small>{{ getSiteEnabledModes(site.key, 'enable') }}</small></span>;&nbsp;
            Aard <span :style="getSiteEnabledColor(site.key, 'enableAard')"><small>{{ getSiteEnabledModes(site.key, 'enableAard') }}</small></span>;&nbsp;
            kbd: <span :style="getSiteEnabledColor(site.key, 'enableKeyboard')"><small>{{ getSiteEnabledModes(site.key, 'enableKeyboard') }}</small></span>
            UI: <span :style="getSiteEnabledColor(site.key, 'enableUI')"><small>{{ getSiteEnabledModes(site.key, 'enableUI') }}</small></span>
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
          Editing {{ selectedSite === '@global' ? 'default settings' : selectedSite }}
        </div>
      </div>
      <div>
        <SiteExtensionSettings
          v-if="selectedSiteSettings"
          :settings="settings"
          :siteSettings="selectedSiteSettings"
          :isDefaultConfiguration="selectedSite === '@global'"
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
      siteFilter: '',
      filteredSites: []
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
          if (!siteKey.startsWith('@') && (!this.siteFilter.trim() || siteKey.includes(this.siteFilter))) {
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

<style lang="scss" src="../../../../res/css/flex.scss" scoped></style>
<style lang="scss" src="@csui/src/res-common/panels.scss" scoped></style>
<style lang="scss" src="@csui/src/res-common/common.scss" scoped></style>
<style lang="scss" scoped>
.hoverable {
  border: 1px solid #333;

  &:hover {
    border: 1px solid #fa6;
    color: rgb(255, 231, 212);
    background-color: rgba(#fa6, 0.125);
  }
}

</style>
