<template>
  <div class="flex flex-col w-100">

    <!-- TAB ROW -->
    <div class="flex flex-row">
      <div
        class="tab"
        :class="{'active': tab === 'siteSettings'}"
        @click="setTab('siteSettings')"
      >
        Settings for current site<br/>
        <small>{{ site }}</small>
      </div>
      <div
        class="tab"
        :class="{'active': tab === 'extensionSettings'}"
        @click="setTab(tab = 'extensionSettings')"
      >
        Default settings for extension
      </div>
      <div
        class="tab"
        :class="{'active': tab === 'otherSites'}"
        @click="setTab(tab = 'otherSites')"
      >
        Settings for other sites
      </div>
    </div>

    <template v-if="tab === 'siteSettings' && siteSettings">
      <!-- <div class="button">
        Reset settings for site
      </div> -->
      <SiteExtensionSettings
        v-if="settings"
        :settings="settings"
        :siteSettings="siteSettings"
        :isDefaultConfiguration="false"
      ></SiteExtensionSettings>
    </template>

    <template v-if="tab === 'extensionSettings' && globalSettings">
      <SiteExtensionSettings
        v-if="settings"
        :settings="settings"
        :siteSettings="globalSettings"
        :isDefaultConfiguration="true"
      ></SiteExtensionSettings>
    </template>

    <template v-if="tab === 'otherSites'">
      <OtherSiteSettings
        v-if="settings"
        :settings="settings"
      >
      </OtherSiteSettings>
    </template>

  </div>
</template>

<script>
import SiteExtensionSettings from './PanelComponents/ExtensionSettings/SiteExtensionSettings.vue';
import OtherSiteSettings from './PanelComponents/ExtensionSettings/OtherSiteSettings.vue';

export default {
  data() {
    return {
      tab: 'siteSettings'
    }
  },
  mixins: [

  ],
  props: [
    'settings',
    'site',
  ],
  components: {
    SiteExtensionSettings,
    OtherSiteSettings
},
  computed: {
    globalSettings() {
      return this.settings?.getSiteSettings('@global') ?? null;
    },
    siteSettings() {
      if (this.site) {
        return  this.settings?.getSiteSettings(this.site) ?? null;
      }
      return null;
    }
  },
  methods: {
    setTab(tab) {
      this.tab = tab;
    }
  }

}
</script>

<style lang="scss" src="../../res/css/flex.scss" scoped module></style>
<style lang="scss" src="../res-common/panels.scss" scoped module></style>
<style lang="scss" src="../res-common/common.scss" scoped module></style>
