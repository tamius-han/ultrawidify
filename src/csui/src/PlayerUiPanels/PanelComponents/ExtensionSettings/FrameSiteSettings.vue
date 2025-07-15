<template>
  <div class="">
    <template v-if="!selectedSite">
      <div style="margin: 1rem 0rem" class="w-full">
        <div class="flex flex-row items-baseline">
          <div style="margin-right: 1rem">Search for site:</div>
          <div class="input flex-grow">
            <input v-model="siteFilter" />
          </div>
        </div>
      </div>
      <div v-for="host of hosts" :key="host" @click="selectedSite = host" class="flex flex-col container pointer hoverable" style="margin-top: 4px; padding: 0.5rem 1rem;">
        <SiteListItem
          :parentHost="parentHost"
          :host="host"
          :settings="settings"
        ></SiteListItem>
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
import SiteExtensionSettings from './SiteExtensionSettings.vue';
import SiteListItem from './SiteListItem.vue';

export default {
  components: {
    SiteExtensionSettings,
    SiteListItem,
  },
  props: [
    'settings',
    'parentHost',
    'hosts',
  ],
  data() {
    return {
      selectedSite: null,
      siteFilter: '',
      filteredSites: []
    }
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
