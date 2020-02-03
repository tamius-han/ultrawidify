<template>
  <div v-if="showLoggerUi" class="root-window flex flex-column overflow-hidden">
    <div class="header">
      <div class="header-top flex flex-row">
        <div class="flex-grow">
          <h1>{{header.header}}</h1>
        </div>
        <div class="button flex-noshrink button-header"
            @click="hidePopup()"
        >
          Close
        </div>
        <!-- <div class="button flex-noshrink button-header"
             @click="stopLogging()"
        >
          Stop logging
        </div> -->
      </div>
      <div class="header-bottom">
        <div>{{header.subheader}}</div>
      </div>
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
            :class="{'jsonbg': !confHasError, 'jsonbg-error': confHasError}"
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
        <template v-if="logStringified">
          <div class="panel-middle scrollable flex-grow">
            <pre>
              {{logStringified}}
            </pre>
          </div>
          <div class="flex-noshrink flex flex-row flex-end">
            <div class="button">New log</div>
            <div class="button">Export log</div>
            <div class="button">Export & quit</div>
          </div>
        </template>
        <template v-else>
          <div class="panel-middle scrollable flex-grow">
            <div v-if="!parsedSettings" class="text-center w100">
              Please paste logger config into the text box to the left.
              ←←←
            </div>
            <div v-else-if="confHasError" class="warn">
              Logger configuration contains an error. Cannot start logging.
            </div>
            <div v-else-if="lastSettings && lastSettings.allowLogging && lastSettings.consoleOptions && lastSettings.consoleOptions.enabled">
              Logging in progress ... 
            </div>
            <div v-else>
              <div class="button">
                Start logging
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
    <div>
      button row is heres
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import Logger from '../ext/lib/Logger';

export default {
  data() {
    return {
      showLoggerUi: false,
      header: {
        header: 'whoopsie daisy',
        subheader: 'you broke the header choosing script'
      },
      parsedSettings: '',
      lastSettings: {},
      confHasError: false,
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
  },
  computed: {
    ...mapState([
      'uwLog',
      'showLogger'
    ]),
  },
  watch: {
    uwLog(newValue, oldValue)  {
      if (oldValue !== newValue) {
        this.logStringified = JSON.stringify(newValue, null, 2);
      }
    },
    showLogger(newValue) {
      this.showLoggerUi = newValue;
    }
  },
  methods: {
    updateSettings(val) {
      try {
        // this.settings.active = JSON.parse(val.target.textContent);
        this.confHasError = false;
      } catch (e) {
        this.confHasError = true;
      }
    },
    hidePopup() {
      // this function only works as 'close' if logging has finished
      if (this.logStringified) {
        Logger.saveConfig({...this.lastSettings, allowLogging: false});
      }
      this.$store.dispatch('uw-hide-logger');
    },
    stopLogging() {
      Logger.saveConfig({...this.lastSettings, allowLogging: false});
      this.$store.dispatch('uw-hide-logger');
    }
  }
}
</script>

<style lang="scss" scoped>
@import '../res/css/colors.scss';
@import '../res/css/font/overpass.css';
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
  background-color: rgba( $page-background, 0.9) !important;
  color: #f1f1f1 !important;
  font-size: 14px !important;

  box-sizing: border-box !important;
}

div {
  font-family: 'Overpass';
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
  h1 {
    margin-bottom: -0.20em;
    margin-top: 0.0em;
  }
  .header-top, .header-bottom {
    padding-left: 16px;
    padding-right: 16px;
  }
  .header-top {
    background-color: $popup-header-background !important;
  }
  .header-bottom {
    font-size: 1.75em;
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

pre {
  font-family: 'Overpass Mono';
}

.button {
  display: inline-flex;
  align-items: center;
  justify-items: center;
  padding-left: 2em;
  padding-right: 2em;
}

.button-header {
  font-size: 2em;
  padding-top: 0.1em;
  padding-left: 1em;
  padding-right: 1em;
}

</style>
