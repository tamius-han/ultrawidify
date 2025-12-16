<template>
  <div class="flex flex-col w-full w-[960px]">
    <h2 text="text-[1.75rem]">Import &amp; export settings</h2>

    <!-- Reset options -->
    <h3>Import &amp; export</h3>
    <p>
      Note that settings may contain the sites you visited and used this extension on. If you are being asked to share settings for debugging a bug report
      and are concerned with your privacy <small>(which you should)</small>, select partial export and only select the websites relevant to your issue.
    </p>
    <p>
      If the site you're having issues with embeds videos from a different site, you need to include embedded sites as well.
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
    <p>Select websites to export.</p>

    <div class="flex row gap-4">
      <span class="mr-2">Select: </span>
      <a class="cursor-pointer" @click="selectExportSite('all')">all</a> ·
      <a class="cursor-pointer" @click="selectExportSite('none')">none</a> ·
      <a class="cursor-pointer" @click="selectExportSite('hide-mine')">deselect sites modified by me</a>
    </div>

    <div class="flex flex-col my-4 max-w-[80dvh] w-[1920px]">
      <div v-for="category in partialExportDialogConfig.categories" :key="category.priority"
        class="x-4 pt-4"
      >
        <div class="flex row w-full gap-4 items-center mb-2 mt-4">
          <div class="text-bold font-bold">Group</div> <SupportLevelIndicator :siteSupportLevel="category.supportLevel ?? 'problemo'"></SupportLevelIndicator>
        </div>
        <div class="flex flex-col pl-8">
          <div v-for="site in category.sites" :key="site"
            class="border border-stone-900 px-4 py-2 flex flex-row gap-4 hover:bg-stone-900"
          >
            <input type="checkbox"
              class="cursor-pointer"
              v-model="site.selectedForExport"
              :disabled="site.key === '@global' || site.key === '@empty'"
            > {{site.key}} <SupportLevelIndicator :siteSupportLevel="site.type ?? site.defaultType ?? 'problemo'"></SupportLevelIndicator>
          </div>
        </div>
      </div>
    </div>

  </Popup>
</template>

<script lang="ts">
import Popup from '@components/common/Popup.vue';
import ConfirmButton from '@components/common/ConfirmButton.vue';
import UploadJsonFileButton from '@components/common/UploadJsonFileButton.vue';
import SettingsInterface, { SiteSettingsInterface } from '@src/common/interfaces/SettingsInterface';
import SupportLevelIndicator from '@components/common/SupportLevelIndicator.vue';
import { SiteSupportLevel } from '../../../../common/enums/SiteSupportLevel.enum';

interface ExportSiteData extends SiteSettingsInterface {
  key: string,
  selectedForExport: boolean;
  visible: boolean;
};

interface ExportSiteDataCategory {
  priority: number,
  supportLevel: SiteSupportLevel,
  sites: ExportSiteData[],
}

const exportDialogPriorityMap = [
  SiteSupportLevel.UserModified,
  SiteSupportLevel.UserDefined,
  SiteSupportLevel.BetaSupport,
  SiteSupportLevel.Unknown,
  SiteSupportLevel.CommunitySupport,
  SiteSupportLevel.OfficialSupport,
  SiteSupportLevel.OfficialBlacklist
];

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
    exportSettings(settings?: SettingsInterface, filename = 'ultrawidify-settings.json') {
      const settingBlob = new Blob(
        [ JSON.stringify(settings ?? this.settings.active, null, 2) ],
        { type: "application/json"}
      );
      const url = window.URL.createObjectURL(settingBlob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    orderSitesForExport() {
      const categories: ExportSiteDataCategory[] = [];

      for (const site in this.settings.active.sites) {
        const siteData: SiteSettingsInterface = JSON.parse(JSON.stringify(this.settings.active.sites[site]));

        let category = categories.find(x => x.supportLevel === siteData.type ?? siteData.defaultType);
        if (!category) {
          const ssl = siteData.type ?? siteData.defaultType;
          category = {
            priority: exportDialogPriorityMap.indexOf(ssl),
            supportLevel: ssl,
            sites: []
          }
          categories.push(category);
        }

        category.sites.push({
          ...siteData,
          key: site,
          selectedForExport: true,
          visible: true,
        });
      }

      categories.sort( (a: ExportSiteDataCategory,b: ExportSiteDataCategory) => a.priority - b.priority);

      return categories;
    },

    getSelectedSites(categories: ExportSiteDataCategory[]) {
      const sites = [];

      for (const cat of categories) {
        sites.push(...cat.sites.filter(x => x.selectedForExport));
      }

      return sites;
    },

    selectExportSite(quickSelection: 'all' | 'none' | 'hide-mine') {
      if (quickSelection === 'hide-mine') {
        this.partialExportDialogConfig.categories
          .filter((x: ExportSiteDataCategory) => x.supportLevel === SiteSupportLevel.UserDefined || x.supportLevel === SiteSupportLevel.UserModified)
          .map((x: ExportSiteDataCategory) => x.sites)
          .filter((x: ExportSiteData) => !x.key.startsWith('@'))
          .map((x: ExportSiteData) => x.selectedForExport = false);
        return;
      }

      const setVisibility = quickSelection === 'all';
      for(const cat of this.partialExportDialogConfig.categories) {
        for (const site of cat.sites) {
          if (site.key.startsWith('@')) {
            site.selectedForExport = true;
          } else {
            site.selectedForExport = setVisibility;
          }
        }
      }
    },

    startPartialExport() {
      const categories = this.orderSitesForExport();

      this.partialExportDialogConfig = {
        visible: true,
        categories,
        exportSites: [] as ExportSiteData[],
        confirm: () => {
          const selectedSites = this.getSelectedSites(this.partialExportDialogConfig.categories);

          const settingsClone = JSON.parse(JSON.stringify(this.settings.active));
          settingsClone.sites = {};

          // ensure correct mapping and REMOVE GARBAGE PROPERTIES
          for (const site of selectedSites) {
            settingsClone[site.key] = {...site};
            delete settingsClone[site.key].key;
            delete settingsClone[site.key].selectedForExport;
            delete settingsClone[site.key].visible;
          }

          this.exportSettings(settingsClone, 'uw-settings_partial-export.json');

          // close the dialog
          this.partialExportDialogConfig = {visible: false};
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
