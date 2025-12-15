<template>
  <div class="flex flex-col w-full max-w-[960px]">
    <h2 text="text-[1.75rem]">Import &amp; export settings</h2>

    <!-- Reset options -->
    <h3>Import &amp; export</h3>
    <p>
      Note that settings may contain the sites you visited and used this extension on. If you are being asked to share settings for debugging a bug report
      and are concerned with your privacy <small>(which you should)</small>, select partial export and only select the websites relevant to your issue.
    </p>
    <div class="flex flex-row w-full gap-2">
      <UploadJsonFileButton
        @importedJson="handleImportedSettings"
        @error="handleSettingsImportError"
      >
        Import settings
      </UploadJsonFileButton>
      <button @click="exportSettings()">Export settings</button>
      <button @click="startPartialExport()">Partial export </button>
    </div>

    <h3>Reset settings</h3>
    <p>Reset settings to this version's default settings. Your custom settings will be lost.</p>

    <ConfirmButton
      dialogType="danger"
      @onConfirmed="resetSettings"
    >
      Reset settings
    </ConfirmButton>
<!--
    <div v-if="enableSettingsEditor" class="field">
      <div class="label">Show developer options</div>
      <input
        type="checkbox"
        v-model="settings.active.ui.devMode"
        @change="settings.saveWithoutReload"
      >
    </div> -->
  </div>



  <Popup
    v-if="importSettingDialogConfig.visible"
    title="Overwrite existing settings?"
    message="Importing settings from a file will overwrite existing settings. Continue?"
    confirmButtonText="Import settings"
    cancelButtonText="Cancel"
    @onConfirm="importSettingDialogConfig.confirm"
    @onCancel="importSettingDialogConfig.reject"
  >
  </Popup>
  <Popup
    v-if="partialExportDialogConfig.visible"
    title="Custom settings export"
    confirmButtonText="Export"
    cancelButtonText="Cancel"
    @onConfirm="partialExportDialogConfig.confirm"
    @onCancel="partialExportDialogConfig.reject"
  >
    <p>Export settings for the following websites:</p>

    <div class="flex flex-col my-4">
      <div v-for="site in userSites" :key="site"
        class="border border-stone-700 px-4 py-2 flex row gap-4"
      >
        <input type="checkbox" v-model="site.selectedForExport" :disabled="site.key === '@global'"> {{site.key}} <SupportLevelIndicator :siteSupportLevel="site.type ?? site.defaultType ?? 'problemo'"></SupportLevelIndicator>
      </div>
    </div>

  </Popup>
</template>

<script lang="ts">
import Popup from '@components/common/Popup.vue';
import ConfirmButton from '@components/common/ConfirmButton.vue';
import UploadJsonFileButton from '@components/common/UploadJsonFileButton.vue';
import { SiteSettingsInterface } from '@src/common/interfaces/SettingsInterface';
import SupportLevelIndicator from '@components/common/SupportLevelIndicator.vue';
import { SiteSupportLevel } from '../../../../common/enums/SiteSupportLevel.enum';

interface ExportSiteData extends SiteSettingsInterface {
  key: string,
  selectedForExport: boolean;
};

export default {
  components: {
    Popup,
    ConfirmButton,
    UploadJsonFileButton,
    SupportLevelIndicator,
  },
  mixins: [],
  props: [
    'settings',
  ],
  data() {
    return {
      tab: 'siteSettings',
      importSettingDialogConfig: {visible: false},
      partialExportDialogConfig: {visible: false},
      allowSettingsEditing: false,
      editorSaveFinished: false,
      settingsJson: {},
      settingsSnapshots: []
    }
  },
  computed: {
    userSites() {
      return this.partialExportDialogConfig.filter(
        (x: ExportSiteData) => (x.type ?? x.defaultType) === SiteSupportLevel.UserDefined || (x.type ?? x.defaultType) === SiteSupportLevel.UserModified);
    },
  },
  methods: {
    setTab(tab) {
      this.tab = tab;
    },

    //#region settings management
    /**
     * Exports extension settings into a json file.
     */
    exportSettings() {
      const settingBlob = new Blob(
        [ JSON.stringify(this.settings.active, null, 2) ],
        { type: "application/json"}
      );
      const url = window.URL.createObjectURL(settingBlob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "ultrawidify-settings.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    startPartialExport() {
      console.log('starting partial export ...');
      const sites: ExportSiteData[] = [];

      for (const site in this.settings.active.sites) {
        sites.push({
          ...JSON.parse(JSON.stringify(this.settings.active.sites[site])),
          key: site,
          selectedForExport: true
        });
      }

      this.partialExportDialogConfig = {
        visible: true,
        sites,
        confirm: () => {
          console.log('selected sites:', this.partialExportDialogConfig.sites.filter(x => x.selectedForExport));
        },
        reject: () => {
          this.partialExportDialogConfig = {visible: false};
        }
      }
    },

    handleImportedSettings(newSettings) {
      this.importSettingDialogConfig = {
        visible: true,
        confirm: () => {
          this.settings.active = newSettings;
          this.settings.saveWithoutReload();
          this.importSettingDialogConfig = {visible: false};
        },
        reject: () => {
          this.importSettingDialogConfig = {visible: false};
        }
      }
    },

    handleSettingsImportError(error) {
      console.error('Error importing settings:', error);
    },

    resetSettings() {
      this.settings.active = JSON.parse(JSON.stringify(this.settings.default));
      this.settings.saveWithoutReload();
    },

  }
}
</script>
