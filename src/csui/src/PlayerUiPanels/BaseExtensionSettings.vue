<template>
  <div class="flex flex-row w-full h-full">
    <div class="flex flex-col">

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

      <!-- Reset options -->
      <div class="flex flex-col" style="margin-top: 2rem">
        <h2>Reset and backup</h2>
        <p><small>Settings import must be done from in-player UI.</small></p>
        <div class="flex flex-row w-full">
          <UploadJsonFileButton
            class="flex-grow"
            @importedJson="handleImportedSettings"
            @error="handleSettingsImportError"
          >
            Import settings
          </UploadJsonFileButton>
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
          <button class="flex-grow" @click="exportSettings()">Export settings</button>
        </div>
        <div>

        </div>
        <ConfirmButton
          dialogType="danger"
          @onConfirmed="resetSettings"
        >
          Reset settings
        </ConfirmButton>

        <div v-if="enableSettingsEditor" class="field">
          <div class="label">Show developer options</div>
          <input
            type="checkbox"
            v-model="settings.active.ui.devMode"
            @change="settings.saveWithoutReload"
          >
        </div>
      </div>
    </div>
    <div v-if="enableSettingsEditor && settings.active.ui.devMode" class="h-full grow">
      <h2>Settings editor</h2>
      <div class="flex flex-row w-full">
        <div class="flex flex-row">
          <div>Enable save button:</div>
          <input v-model="allowSettingsEditing" type="checkbox">
        </div>
        <div class="grow">
        </div>
        <div>
          <div v-if="editorSaveFinished">Settings saved ...</div>
          <button v-else
            class="danger"
            :class="{'disabled': !allowSettingsEditing}"
            :disabled="!allowSettingsEditing"
            @click="saveSettingsChanges"
          >
            Save
          </button>
        </div>
        <button @click="resetSettingsEditor">
          Cancel
        </button>

      </div>
      <div>
        <JsonEditor
          v-model="settingsJson"
        >
        </JsonEditor>
      </div>
    </div>
  </div>
</template>

<script>
import SiteExtensionSettings from './PanelComponents/ExtensionSettings/SiteExtensionSettings.vue';
import OtherSiteSettings from './PanelComponents/ExtensionSettings/OtherSiteSettings.vue';
import Popup from '@csui/src/components/Popup';
import ConfirmButton from '@csui/src/components/ConfirmButton';
import UploadJsonFileButton from '@csui/src/components/UploadJsonFileButton';
import JsonEditor from '@csui/src/components/JsonEditor';



export default {
  data() {
    return {
      tab: 'siteSettings',
      importSettingDialogConfig: {visible: false},
      allowSettingsEditing: false,
      editorSaveFinished: false,
      settingsJson: {},
    }
  },
  mixins: [

  ],
  props: [
    'settings',
    'site',
    'enableSettingsEditor'
  ],
  components: {
    SiteExtensionSettings,
    OtherSiteSettings,
    Popup,
    ConfirmButton,
    UploadJsonFileButton,
    JsonEditor
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
    },
  },
  mounted() {
    this.resetSettingsEditor();
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

    handleImportedSettings(newSettings) {
      this.importSettingDialogConfig = {
        visible: true,
        confirm: () => {
          this.settings.active = newSettings;
          this.settings.saveWithoutReload();
          this.importSettingDialogConfig = {visible: false};
          this.resetSettingsEditor();
        },
        reject: () => {
          this.importSettingDialogConfig = {visible: false};
        }
      }
    },

    handleSettingsImportError(error) {
      console.error('Error importing settings:', error);
    },

    /**
     * Resets settings to default
     */
    resetSettings() {
      this.settings.active = JSON.parse(JSON.stringify(this.settings.default));
      this.settings.saveWithoutReload();
      this.resetSettingsEditor();
    },

    saveSettingsChanges() {
      if (this.allowSettingsEditing) {
        this.settings.active = this.settingsJson;
        this.settings.saveWithoutReload();
        this.resetSettingsEditor();
        this.editorSaveFinished = true;

        setTimeout(() => {
          this.editorSaveFinished = false;
        }, 3000);
      }
    },

    resetSettingsEditor() {
      this.settingsJson = JSON.parse(JSON.stringify(this.settings?.active ?? {}));
    }
    //#endregion
  }

}
</script>

<style lang="scss" src="../../res/css/flex.scss" scoped module></style>
<style lang="scss" src="@csui/src/res-common/panels.scss" scoped module></style>
<style lang="scss" src="@csui/src/res-common/common.scss" scoped module></style>
