<template>
  <div class="flex flex-row gap-8">
    <div v-if="!selectedSite || !isCompact">
      <div style="margin-top: 1rem; margin-bottom: 1rem;">
        <div  class="border border-blue-500 text-blue-500 bg-slate-950 px-4 py-2" style="float: none">
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
      <div  class="flex flex-col gap-2">
        <div v-for="site of sites" :key="site.key" :class="{'opacity-50 hover:opacity-100': selectedSite && selectedSite !== site.key }">
          <SiteListItem
            :host="site.key"
            :settings="settings"
            :isActive="selectedSite === site.key"
            @edit="selectedSite = site.key"
          ></SiteListItem>
        </div>
      </div>
    </div>
    <div v-if="selectedSite">
      <div class="flex flex-row text-[1.5em] items-center gap-2">
        <div @click="selectedSite = null" class="cursor-pointer bg-black rounded-full px-2">
          ←
        </div>
        <div>
          Editing {{ selectedSite === '@global' ? 'default settings' : selectedSite }}
        </div>
      </div>
      <div class="border-t-1 border-t-stone-800 mt-4 pt-2">
        <SiteExtensionSettings
          v-if="selectedSiteSettings"
          :settings="settings"
          :siteSettings="selectedSiteSettings"
          :isDefaultConfiguration="selectedSite === '@global'"
        ></SiteExtensionSettings>
      </div>
    </div>
  </div>
</template>

<script>
import ExtensionMode from '@src/common/enums/ExtensionMode.enum';
import SiteExtensionSettings from './SiteExtensionSettings.vue';
import SiteListItem from './SiteListItem.vue';

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
    'isCompact',
  ],
  components: {
    SiteExtensionSettings,
    SiteListItem,
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
      return this.settings?.getSiteSettings({site: this.selectedSite}) ?? null;
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
      if (this.settings?.getSiteSettings({site: site}).data[component]?.normal === ExtensionMode.Enabled) {
        return 'always';
      }
      if (this.settings?.getSiteSettings({site: site}).data[component]?.theater === ExtensionMode.Enabled) {
        return 'T + FS';
      }
      if (this.settings?.getSiteSettings({site: site}).data[component]?.fullscreen === ExtensionMode.Enabled) {
        return 'fullscreen';
      }
      return 'disabled';
    }
  }
}
</script>

<style lang="postcss" scoped>
.container {
  @apply: bg-[#000] px-4 py-2 border border-primary-500;
}
</style>
