<template>
  <div>

    <div>
      <h1>{{loggerPanel.title}}<small><br/>{{loggerPanel.subtitle}}</small></h1>

      <div>Logger configuration:</div>

      <JsonEditor
        v-model="lastSettings"
      ></JsonEditor>

      <div class="flex flex-row flex-end">
        <div class="button" @click="getLoggerSettings()">
          Revert
        </div>
        <div class="button button-primary" @click="saveLoggerSettings()">
          Save
        </div>
        <div class="button button-primary" @click="startLogging()">
          Save and start logging
        </div>
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
      currentSettings: undefined
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
  }
});
</script>
