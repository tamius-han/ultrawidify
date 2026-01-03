<template>
  <div class="flex flex-row w-full h-full">
    <div class="flex flex-col w-full">

      <!-- TAB ROW -->
      <div class="flex flex-row">
        <div
          class="tab"
          :class="{'active': tab === 'siteSettings'}"
          @click="setTab('siteSettings')"
        >
          Current site<br/>
          <small>{{ site }}</small>
        </div>
        <div
          v-if="hosts"
          class="tab"
          :class="{'active': tab === 'embeddedSites'}"
          @click="setTab(tab = 'embeddedSites')"
        >
          Embedded content ({{hosts?.length}} {{hosts?.length === 1 ? 'site' : 'sites'}})
        </div>
        <div
          class="tab"
          :class="{'active': tab === 'otherSites'}"
          @click="setTab(tab = 'otherSites')"
        >
          Defaults & other sites
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

      <template v-if="hosts && tab === 'embeddedSites' && globalSettings">
        <FrameSiteSettings
          v-if="settings"
          :parentHost="site"
          :hosts="hosts"
          :settings="settings"
        ></FrameSiteSettings>
      </template>

      <template v-if="tab === 'otherSites'">
        <OtherSiteSettings
          v-if="settings"
          :role="role"
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
        <div></div>
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
        <div class="flex flex-row items-center">
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
            @click="() => saveSettingsChanges()"
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

      <h2>Settings snapshots</h2>
      <div class="flex flex-col">
        <div v-for="(snapshot, index) of settingsSnapshots" :key="snapshot.createdAt">
          <small>{{new Date(snapshot.createdAt).toISOString()}}</small>
          <div class="flex flex-row">
            <div class="grow">
              {{snapshot.name}}
            </div>
            <div v-if="settings.isAutomatic">(auto)</div>
            <div v-if="settings.isAutomatic && settings.isProtected">(protected)</div>
            <div v-if="settings.default">(default)</div>
          </div>
          <div>
            <button @click="() => markDefaultSnapshot(index)"><template v-if="settings.isDefault">Revoke default</template><template v-else>Make default</template></button>
            <button v-if="settings.isAutomatic" @click="() => toggleSnapshotProtection(index)">Toggle protection</button>
            <button @click="() => deleteSnapshot(index)">Delete snapshot</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SiteExtensionSettings from '@components/segments/ExtensionSettings/Panels/SiteExtensionSettings.vue';
import FrameSiteSettings from '@components/segments/ExtensionSettings/Panels/FrameSiteSettings.vue';
import OtherSiteSettings from '@components/segments/ExtensionSettings/Panels/OtherSiteSettings.vue';
import Popup from '@components/common/Popup';
import ConfirmButton from '@components/common/ConfirmButton';
import UploadJsonFileButton from '@components/common/UploadJsonFileButton';
import JsonEditor from '@components/common/JsonEditor';

export default {

  components: {
    SiteExtensionSettings,
    OtherSiteSettings,
    Popup,
    ConfirmButton,
    UploadJsonFileButton,
    JsonEditor,
    FrameSiteSettings,
  },
  mixins: [],
  props: [
    'role',
    'settings',
    'site',
    'enableSettingsEditor',
    'hosts',
  ],
  data() {
    return {
      tab: 'siteSettings',
      importSettingDialogConfig: {visible: false},
      allowSettingsEditing: false,
      editorSaveFinished: false,
      settingsJson: {},
      settingsSnapshots: []
    }
  },
  computed: {
    globalSettings() {
      return this.settings?.getSiteSettings('@global') ?? null;
    },
    siteSettings() {
      if (this.site) {
        return  this.settings?.getSiteSettings({site: this.site}) ?? null;
      }
      return null;
    },
  },
  mounted() {
    this.resetSettingsEditor();
    this.loadSettingsSnapshots();
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

    async saveSettingsChanges() {
      if (this.allowSettingsEditing) {
        const currentVersion = this.settings.active?.version;
        this.settings.active = this.settingsJson;

        if (currentVersion !== this.settingsJson.version) {
          await this.settings.save({forcePreserveVersion: true});
          return;
        } else {
          await this.settings.saveWithoutReload();
        }

        this.resetSettingsEditor();
        this.editorSaveFinished = true;

        setTimeout(() => {
          this.editorSaveFinished = false;
        }, 3000);
      }
    },

    resetSettingsEditor() {
      this.settingsJson = JSON.parse(JSON.stringify(this.settings?.active ?? {}));
    },
    //#endregion

    //#region settings snapshot management
    async loadSettingsSnapshots() {
      this.settingsSnapshots = await this.settings.snapshotManager.listSnapshots();
    },

    async markDefaultSnapshot(index) {
      await this.settings.snapshotManager.setDefaultSnapshot(index, !this.settingsSnapshots[index].isDefault);
      await this.loadSettingsSnapshots();
      this.settings.active.dev.loadFromSnapshot = this.settingsSnapshots[index].isDefault;
      this.saveSettingsChanges();
    },

    async toggleSnapshotProtection(index) {
      await this.settings.snapshotManager.setSnapshotAsProtected(index, !this.settingsSnapshots[index].isProtected);
      await this.loadSettingsSnapshots();
    },

    async deleteSnapshot(index) {
      await this.settings.snapshotManager.deleteSnapshot(index);
      await this.loadSettingsSnapshots();
    },
  }
  //#endregion
}
</script>
