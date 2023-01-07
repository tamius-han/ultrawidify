<template>
  <div class="flex flex-column w-100">

    <h2>Settings for {{site}}</h2>
    <SiteExtensionSettings
      :settings="settings"
      :site="site"
    ></SiteExtensionSettings>


    <h2>Default settings</h2>
    <div class="field">
      <div class="label">Default crop:</div>
      <div class="select">
        <select>
          <!-- todo: load crop options -->
        </select>
      </div>
      <div class="hint">'Auto' option will enable autodetection. 'Reset' will disable extension until manually activated.</div>
    </div>
    <div class="field">
      <div class="label">Default stretch:</div>
      <div class="select">
        <select>
          <!-- todo: load stretch options -->
        </select>
      </div>
    </div>
    <div class="field">
      <div class="label">Persist crop mode between videos</div>
      <div class="select">
        <select>
          <!-- todo: load crop mode persistence -->
        </select>
      </div>
    </div>

    <div class="field">
      <div class="label">Only enable extension in full screen</div>
      <div class="select">
        <select>

        </select>
      </div>
    </div>
    <div class="field">
      <div class="label">Only enable autodetection in full screen</div>
      <div class="select">
        <select>

        </select>
      </div>
    </div>

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

}
</script>

<style lang="scss" src="../../../res/css/flex.scss" scoped module></style>
<style lang="scss" src="../res-common/panels.scss" scoped module></style>
<style lang="scss" src="../res-common/common.scss" scoped module></style>
