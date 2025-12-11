<template>
  <h2 class="text-[1.75em]">Debugging</h2>

  <div class="w-full grid grid-cols-1 min-[1200px]:grid-cols-2 min-[1920px]:grid-cols-3 max-w-[2300px] gap-8">

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
      <h3 class="mb-4">Snapshots</h3>

      <div class="flex flex-col gap-2">
        <div
          v-for="(snapshot, index) of settingsSnapshots" :key="snapshot.createdAt"
          class="border border-stone-800 p-2"
        >
          <small>Created at: {{new Date(snapshot.createdAt).toISOString()}}</small>
          <div class="flex flex-row">
            <div class="grow font-bold">
              {{snapshot.label ?? '<no label>'}}
            </div>
            <div class="mr-8">v. {{snapshot.settings.version ?? '<unknown ver.>'}}</div>
            <div v-if="settings.isAutomatic">(auto)</div>
            <div v-if="settings.isAutomatic && settings.isProtected">(protected)</div>
            <div v-if="settings.default">(default)</div>
          </div>
          <div class="flex flex-row w-full justify-end mt-2">
            <button class="flex flex-col" @click="() => testMigration(index)">Test migration</button>
            <button class="flex flex-col" @click="() => loadFromSnapshot(index)">Load snapshot and migrate<br/><small>normal migration</small></button>
            <button class="flex flex-col" @click="() => loadFromSnapshot(index, true)">Load &amp; migrate<br/><small>without creating snapshot</small></button>
            <button class="flex flex-col" @click="() => markDefaultSnapshot(index)"><template v-if="settings.isDefault">Revoke default</template><template v-else>Make default</template></button>
            <button class="flex flex-col" v-if="settings.isAutomatic" @click="() => toggleSnapshotProtection(index)">Toggle protection</button>
            <button class="flex flex-col" @click="() => deleteSnapshot(index)">Delete snapshot</button>
          </div>
        </div>
    </div>
    </div>

    <div class="grow shrink">
      <h3 class="mb-4">Logger configuration</h3>

      <JsonEditor
        v-model="lastSettings"
      ></JsonEditor>

      <div class="flex flex-row justify-end mt-4 w-full">
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

  </div>

</template>

<script lang="ts">
import { LogAggregator, BLANK_LOGGER_CONFIG } from '@src/ext/lib/logging/LogAggregator';
import JsonEditor from '@csui/src/components/JsonEditor';
import { defineComponent } from 'vue';

export default defineComponent({
  components: {
    JsonEditor
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

      allowSettingsEditing: false,
      editorSaveFinished: false,
      settingsJson: {},
      settingsSnapshots: []
    };
  },
  props: [
    'settings',
    'eventBus',
  ],
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
    loadDefaultConfig() {
      this.lastSettings = JSON.parse(JSON.stringify(BLANK_LOGGER_CONFIG));
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
      this.settings.init({snapshot: this.settingsSnapshots[snapshotIndex], skipSnapshot});
    },

    async testMigration(snapshotIndex) {
      this.settings.testMigration(this.settingsSnapshots[snapshotIndex]);
    },
  }
  //#endregion
});
</script>
