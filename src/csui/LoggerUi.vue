<template>
  <div v-if="showLoggerUi" class="root-window flex flex-column overflow-hidden">
    <div class="header">
      <h1>{{header.header}}</h1>
      <div>{{header.subheader}}</div>
    </div>
    <div class="content flex flex-row flex-grow overflow-hidden">

      <!-- LOGGER SETTINGS PANEL -->
      <div class="settings-panel flex flex-noshrink flex-column">
        <div class="panel-top">
          <h2>Logger configuration</h2>
          <p>Paste logger configuration in this box</p>
        </div>

        <div class="panel-middle">
          <div ref="settingsEditArea"
            style="white-space: pre-wrap; border: 1px solid orange; padding: 10px;"
            class="monospace"
            :class="{'jsonbg': !hasError, 'jsonbg-error': hasError}"
            contenteditable="true"
            @input="updateSettings"
          >{{parsedSettings}}</div>
        </div>
      </div>

      <!-- LOGGER OUTPUT/START LOGGING -->
      <div class="results-panel flex flex-shrink flex-column overflow-hidden">
        <div class="panel-top">
          <h2>Logger results</h2>
        </div>
        <div class="panel-middle scrollable flex-grow">
          <pre>
            {{logStringified}}
          </pre>
        </div>
      </div>
    </div>
    <div>
      button row is here
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import Logger from '../ext/lib/Logger';

export default {
  data() {
    return {
      showLoggerUi: true,
      header: {
        header: 'whoopsie daisy',
        subheader: 'you broke the header choosing script'
      },
      parsedSettings: '',
      lastSettings: {},
      hasError: false,
      logStringified: '',
    }
  },
  async created() {
    const headerRotation = [{
      header: "DEFORESTATOR 5000",
      subheader: "Iron Legion's finest logging tool"
    }, {
      header: "Astinus",
      subheader: "Ultrawidify logging tool"
    }, {
      header: "Tracer",
      subheader: "I'm already printing stack traces"
    }];

    this.header = headerRotation[Math.floor(+Date.now() / (3600000*24)) % headerRotation.length] || this.header;

    this.lastSettings = await Logger.getConfig() || {};
    this.parsedSettings = JSON.stringify(this.lastSettings, null, 2) || '';

    // this.$store.watch(
    //   (state, getters) => {},
    //   (newValue, oldValue) => {
    //     console.log("$store.watch — updating from", oldValue, "to", newValue);
    //   }
    // )
  },
  computed: {
    ...mapState([
      'uwLog',
    ]),
  },
  watch: {
    uwLog(newValue, oldValue)  {
      console.log("updating status from", oldValue, "to", newValue);
      if (oldValue !== newValue) {
        this.logStringified = JSON.stringify(newValue, null, 2);
      }
    }
  },
  methods: {
    updateSettings(val) {
      try {
        // this.settings.active = JSON.parse(val.target.textContent);
        this.hasError = false;
      } catch (e) {
        this.hasError = true;
      }
    },
  }
}
</script>

<style lang="scss" scoped>
@import url('/res/css/colors.scss');
@import url('/res/css/font/overpass.css');
@import url('/res/css/font/overpass-mono.css');
@import url('/res/css/common.scss');
@import url('/res/css/flex.css');

.root-window {
  position: fixed !important;
  top: 5vh !important;
  left: 5vw !important;
  width: 90vw !important;
  height: 90vh !important;
  z-index: 999999 !important;
  background-color: rgba(18,17,15,0.9) !important;
  color: #f1f1f1 !important;
  font-size: 14px !important;

  box-sizing: border-box !important;
}

h1, h2 {
  font-family: 'Overpass Thin';
}
h1 {
  font-size: 4em;
}
h2 {
  font-size: 2em;
}

.header {

  * {
    padding-left: 32px;
  }
}
.content {
  box-sizing: border-box;
  padding: 8px 32px;
  width: 100%;
}
.settings-panel {
  box-sizing: border-box;
  padding-right: 8px;
  flex-grow: 2 !important;
  min-width: 30% !important;
  flex-shrink: 0 !important;
  height: inherit !important;
}
.results-panel {
  box-sizing: border-box;
  padding-left: 8px;
  max-width: 70% !important;
  flex-grow: 5 !important;
  flex-shrink: 0 !important;
  height: inherit !important;
}

.scrollable {
  overflow: auto;
}

.overflow-hidden {
  overflow: hidden;
}


.flex {
  display: flex !important;
}
.flex-column {
  flex-flow: column !important;
}
.flex-row {
  flex-flow: row !important;
}
.flex-noshrink {
  flex-shrink: 0 !important;
} 

</style>
