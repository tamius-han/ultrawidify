<template>
  <h2 class="text-[1.75em]">Debugging</h2>

  <div v-if="!isTrusted" class="h-full w-full flex flex-col justify-center items-center">
    <p class="mt-[25vh] text-[1.75rem] text-primary-300 font-thin text-center">No vodka, no passage.</p>
    <p class="text-[1rem] font-thin uppercase text-stone-400 text-center">Give vodka, you passage</p>

    <p class="mt-8 text-center">
      Unless you were asked to visit this page on github or via e-mail, you probably shouldn't be here.
    </p>
    <p class="mt-0 text-center cursor-pointer">
      <a @click="showDebugging()">Proceed anyway</a>
    </p>


  </div>
  <div v-else class="w-full flex flex-col gap-4">
    <div class="flex gap-2">
      <div class="label text-stone-500">Show developer options</div>
      <input
        type="checkbox"
        v-model="settings.active.ui.devMode"
        @change="settings.saveWithoutReload"
      >
    </div>

    <div class="w-full grid grid-cols-1 min-[1200px]:grid-cols-2 min-[1920px]:grid-cols-3 max-w-[2300px] gap-8">
      <div class="grow shrink">
        <h3 class="mb-4">Logger configuration</h3>

        <JsonEditor
          v-model="lastSettings"
        ></JsonEditor>

        <div class="flex flex-row justify-end mt-4 w-full">
          <button class="bg-black button" @click="resetLoggerSettings()">
            Load default
          </button>
          <button class="bg-black button" @click="getLoggerSettings()">
            Revert
          </button>
          <button class="button button-primary" @click="saveLoggerSettings()">
            Save
          </button>
          <button class="button button-primary" @click="startLogging()">
            Save and start logging
          </button>
        </div>
      </div>

      <div class="grow shrink">
        <h3 class="mb-4">Settings editor</h3>
        <div class="flex flex-row w-full">
          <div class="flex flex-row items-center gap-2">
            <div>Enable save button:</div>
            <input v-model="allowSettingsEditing" type="checkbox">
          </div>
          <div class="grow">
          </div>
          <div>
            <div v-if="editorSaveFinished">Settings saved ...</div>
            <button v-else
              class="danger"
              :class="{'opacity-50 select-none hover:border-stone-500 hover:text-stone-300': !allowSettingsEditing}"
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
      </div>

      <div class="grow shrink">
        <h3 class="mb-4 w-full inline-flex row justify-between">Snapshots <button class="bg-transparent border-none text-stone-500 hover:text-primary-300"><mdicon name="cog" :size="24"></mdicon></button></h3>

        <div class="flex row gap-4 items-center mb-4">
            <UploadJsonFileButton
              @importedJson="handleImportedSnapshot"
              @error="handleImportedSnapshotError"
            >
              Import settings as snapshot
            </UploadJsonFileButton>
          <button @click="createSnapshot">Create snapshot</button>
        </div>

        <div class="flex flex-col gap-2">
          <div
            v-for="(snapshot, index) of settingsSnapshots" :key="snapshot.createdAt"
            class="border border-stone-800 p-2"
            :class="{'bg-primary-600': snapshot.isDefault, '!border-indigo-900/75': !snapshot.isAutomatic}"
          >
            <small>Created at: {{new Date(snapshot.createdAt).toISOString()}}</small>
            <div class="flex row items-center gap-2">
              <mdicon v-if="!snapshot.isAutomatic" class="text-indigo-300" name="account-arrow-down" :size="20"></mdicon>
              <div class="grow font-bold" :class="{'text-indigo-300': !snapshot.isAutomatic}">
                {{snapshot.label ?? '<no label>'}}
              </div>
              <div class="mr-8"><span class="text-stone-500 text-[0.75rem] uppercase mr-4">saved with:</span>v. {{snapshot.forVersion ?? '<unknown ver.>'}}</div>
              <div v-if="snapshot.isAutomatic && settings.isProtected">(protected)</div>
              <button title="Initialize settings with this snapshot" v-if=" snapshot.isDefault" class="bg-transparent border-none text-white     hover:text-primary-300" @click="() => markDefaultSnapshot(index)"><mdicon name="file-download"         size="20"></mdicon></button>
              <button title="Initialize settings with this snapshot" v-if="!snapshot.isDefault" class="bg-transparent border-none text-stone-500 hover:text-primary-300" @click="() => markDefaultSnapshot(index)"><mdicon name="file-download-outline" size="20"></mdicon></button>
              <button title="Edit this snapshot ..." class="bg-transparent border-none text-stone-500 hover:text-primary-300" @click="() => editSnapshot(index)"><mdicon name="pencil" size="20"></mdicon></button>
            </div>
            <div class="flex flex-row w-full justify-end mt-2">
              <button class="flex flex-col" @click="() => testMigration(index)">Test migration</button>
              <button class="flex flex-col" @click="() => loadFromSnapshot(index)">Load snapshot and migrate<br/><small>normal migration</small></button>
              <button class="flex flex-col" @click="() => loadFromSnapshot(index, true)">Load &amp; migrate<br/><small>without creating snapshot</small></button>
              <button class="flex flex-col" v-if="settings.isAutomatic" @click="() => toggleSnapshotProtection(index)">Toggle protection</button>
              <button class="flex flex-col" @click="() => deleteSnapshot(index)">Delete snapshot</button>
            </div>
          </div>
      </div>
      </div>


    </div>
  </div>

  <Popup v-if="snapshotManagerSettingsPopup.visible"
    title="Snapshot manager settings"
    confirmButtonText="Save"
    cancelButtonText="Cancel"
    @onConfirm="snapshotManagerSettingsPopup.confirm"
    @onCancel="snapshotManagerSettingsPopup.reject"
  >
    <p><b>NOTE: probably reload page if you change anything.</b></p>
    <div class="field">
      <div class="label">Max. automatic snapshots</div>
      <div class="input">
        <input v-model="settings.snapshotManager.config.maxAutomaticSnapshots" />
      </div>
    </div>
    <div class="field">
      <div class="label">Max. automatic snapshots</div>
      <div class="input">
        <input v-model="settings.snapshotManager.config.minVersions" />
      </div>
    </div>
  </Popup>

  <Popup v-if="editSnapshotPopup.visible"
    title="Edit snapshot"
    confirmButtonText="Save"
    cancelButtonText="Cancel"
    @onConfirm="editSnapshotPopup.confirm"
    @onCancel="editSnapshotPopup.reject"
  >
    <div class="h-full w-[690px] max-h-[90dvh]">
      <div class="field">
        <div class="label">Snapshot name</div>
        <div class="input">
          <input v-model="editSnapshotPopup.data.snapshot.label" />
        </div>
      </div>
      <div class="field">
        <div class="label">For version</div>
        <div class="input">
          <input v-model="editSnapshotPopup.data.snapshot.forVersion" />
        </div>
      </div>
      <div class="field">
        <div class="label">Was created automatically</div>
        <div class="checkbox">
          <input type="checkbox" v-model="editSnapshotPopup.data.snapshot.isAutomatic" />
        </div>
      </div>
      <div class="field">
        <div class="label">Is protected</div>
        <div class="checkbox">
          <input type="checkbox" v-model="editSnapshotPopup.data.snapshot.isProtected" />
        </div>
      </div>

      <div class="font-bold text-white mb-4">Snapshot settings:</div>

      <JsonEditor
        v-model="editSnapshotPopup.data.snapshot.settings"
      ></JsonEditor>
    </div>
  </Popup>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import Popup from '@components/common/Popup.vue';
import JsonEditor from '@components/common/JsonEditor.vue';
import UploadJsonFileButton from '@components/common/UploadJsonFileButton.vue';

import { LogAggregator, BLANK_LOGGER_CONFIG } from '@src/ext/module/logging/LogAggregator';
import { SettingsSnapshot } from '@src/ext/module/settings/SettingsSnapshotManager';
import SettingsInterface from '@src/common/interfaces/SettingsInterface';
import { _cp } from '@src/common/js/utils';

export default defineComponent({
  components: {
    UploadJsonFileButton,
    JsonEditor,
    Popup,
  },
  data() {
    return {
      loggerPanelRotation: [{
        title: 'DEFORESTATOR 5000',
        subtitle: 'Iron Legion\'s finest logging tool'
      },{
        title: 'Astinus',
        subtitle: 'Ultrawidify logging tool'
      }, {
        title: 'Tracer',
        subtitle: "Maybe I'll be Tracer — I'm already printing stack traces."
      }, {
        title: 'Grûmsh',
        subtitle: "He who watches (all the things printed to the console)."
      }, {
        title: 'Situation Room/The Council',
        subtitle: 'We will always be watching.'
      }, {
        title: 'Isengard Land Management Services',
        subtitle: "#log4saruman"
      }, {
        title: 'Saw Hero',
        subtitle: 'Ultrawidify logging tool'
      }],

      loggerPanel: {
        title: 'whoopsie daisy',
        subtitle:  'you broke the header choosing script',
        pasteConfMode: false,
      },
      lastSettings: undefined,
      parsedSettings: undefined,
      currentSettings: undefined,
      debugVisible: false,

      allowSettingsEditing: false,
      editorSaveFinished: false,
      settingsJson: {},
      settingsSnapshots: [],
      snapshotManagerSettingsPopup: {visible: false},
      editSnapshotPopup: {visible: false},
    };
  },
  props: [
    'settings',
    'eventBus',
  ],
  computed: {
    isTrusted() {
      return this.debugVisible || this.settings?.active.ui.devMode;
    }
  },
  created() {
    this.loggerPanel = {
      ...this.loggerPanelRotation[Math.floor(Math.random() * this.loggerPanelRotation.length)],
      pasteConfMode: false,
    };
    this.getLoggerSettings();
  },
  mounted() {
    this.loadSettingsSnapshots();
    this.resetSettingsEditor();
    this.loadSettingsSnapshots();
  },
  methods: {
    /**
     * Hides first-time warning screen and shows the real contents of debug page
     */
    showDebugging() {
      this.debugVisible = true;
    },
    /**
     *
     */
    loadDefaultConfig() {
      this.lastSettings = JSON.parse(JSON.stringify(BLANK_LOGGER_CONFIG));
    },
    async resetLoggerSettings() {
      await LogAggregator.resetConfig();
      await this.getLoggerSettings();
    },
    async getLoggerSettings() {
      this.lastSettings = await LogAggregator.getConfig() || BLANK_LOGGER_CONFIG;
    },
    async saveLoggerSettings() {
      console.log('Saving logger settings', this.lastSettings);
      await LogAggregator.saveConfig({...this.lastSettings});
      console.log('[ok] logger settings saved');
    },
    async startLogging(){
      this.logStringified = undefined;
      await LogAggregator.saveConfig({...this.lastSettings});
      window.location.reload();
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

    async loadFromSnapshot(snapshotIndex, skipSnapshot?: boolean) {
      this.settings.init({snapshot: _cp(this.settingsSnapshots[snapshotIndex]), skipSnapshot});
    },

    async testMigration(snapshotIndex) {
      this.settings.testMigration(this.settingsSnapshots[snapshotIndex]);
    },

    /**
     * Creates snapshot from currently active settings.
     */
    createSnapshot() {
      const snapshot = {
        settings: JSON.parse(JSON.stringify(this.settings.active)),
        label: 'New snapshot',
        forVersion: this.settings.active.version,
        createdAt: new Date()
      };
      this.editSnapshot(snapshot);
    },

    /**
     * Opens a snapshot and allows it to be edited.
     * This function prepares the snapshot edit dialog and sets up function that will save the snapshot
     * when 'save' button is pressed.
     * @param snapshotOrIndex: snapshot to be edited.
     *              - if number: we will be editing an existing snapshot
     *              - if SettingsSnapshot object: editing a new snapshot, which will be added to snapshot list
     */
    editSnapshot(snapshotOrIndex: SettingsSnapshot | number) {
      console.log('editing snapshot', snapshotOrIndex)
      let snapshot: SettingsSnapshot;
      let index;

      if (typeof snapshotOrIndex === 'number') {
        index = snapshotOrIndex as number;
        snapshot = this.settingsSnapshots[index];
      } else {
        snapshot = snapshotOrIndex as SettingsSnapshot;
      }

      this.editSnapshotPopup = {
        visible: true,
        data: {
          snapshot,
          index,
        },
        confirm: () => {
          console.log('confirmed snapshot. Data:', this.editSnapshotPopup.data);
          if (this.editSnapshotPopup.index) {
            this.settings.snapshotManager[index] = this.settings.snapshotManager.data.snapshot;
          } else {
            this.settings.snapshotManager.createSnapshot(snapshot);
          }

          this.editSnapshotPopup = {visible: false};
        },
        reject: () => {
          this.editSnapshotPopup = {visible: false};
        },
      };
    },

    /**
     * Takes settings snapshot, loads it into edit snapshot dialog, and shows the dialog.
     */
    handleImportedSnapshot(settings: SettingsInterface) {
      const snapshot: SettingsSnapshot = {
        settings,
        label: 'Imported settings',
        forVersion: settings.version,
        createdAt: new Date()
      }

      this.editSnapshot(snapshot);
    },
    handleImportedSnapshotError(error: any) {
      console.error(`[ultrawidify] Failed to upload snapshot. Error:`, error);
    }
  }
  //#endregion
});
</script>
