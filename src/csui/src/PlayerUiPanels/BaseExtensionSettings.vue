<template>
  <div class="flex flex-column w-100">

    <SiteExtensionSettings
      v-if="settings"
      :settings="settings"
      :siteSettings="globalSettings"
      :isDefaultConfiguration="true"
    ></SiteExtensionSettings>

    <!-- <SiteSettingsBasicTable
      :settings="settings"
    ></SiteSettingsBasicTable> -->

  </div>
</template>

<script>
import SiteSettingsBasicTable from './PanelComponents/ExtensionSettings/SiteSettingsBasicTable.vue'
import SiteExtensionSettings from './PanelComponents/ExtensionSettings/SiteExtensionSettings.vue'

export default {
  data() {
    return {
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
    SiteSettingsBasicTable
  },
  computed: {
    globalSettings() {
      return this.settings?.getSiteSettings('@global') ?? null;
    }
  }

}
</script>

<style lang="scss" src="../../../res/css/flex.scss" scoped module></style>
<style lang="scss" src="../res-common/panels.scss" scoped module></style>
<style lang="scss" src="../res-common/common.scss" scoped module></style>
