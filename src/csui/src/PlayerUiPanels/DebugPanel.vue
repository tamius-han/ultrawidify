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

<script>
import Logger, { baseLoggingOptions } from '../../../ext/lib/Logger';
import JsonEditor from '@csui/src/components/JsonEditor';

export default {
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
    'site'
  ],
  created() {
    this.loggerPanel = {
      ...this.loggerPanelRotation[Math.floor(Math.random() * this.loggerPanelRotation.length)],
      pasteConfMode: false,
    };
    this.loadDefaultConfig();
  },
  methods: {
    loadDefaultConfig() {
      this.lastSettings = baseLoggingOptions;
    },
    async getLoggerSettings() {
      this.lastSettings = await Logger.getConfig() || baseLoggingOptions;
    },
    saveLoggerSettings() {
      Logger.saveConfig({...this.lastSettings});
    },
    async startLogging(){
      this.logStringified = undefined;
      await Logger.saveConfig({...this.lastSettings, allowLogging: true});
      window.location.reload();
    },
  }
}
</script>
