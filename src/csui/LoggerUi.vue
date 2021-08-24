<template>
  <div v-if="showLoggerUi" class="root-window flex flex-column overflow-hidden"
       @keyup.stop
       @keydown.stop
       @keypress.stop
  >
    <div class="header">
      <div class="header-top flex flex-row">
        <div class="flex-grow">
          <h1>{{header.header}}</h1>
        </div>
        <div class="button flex-noshrink button-header"
            @click="hidePopup()"
        >
          <template v-if="logStringified">Finish logging</template>
          <template v-else>Hide popup</template>
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
        <div class="panel-top flex-nogrow">
          <h2>Logger configuration</h2>
        </div>
        <div class="flex flex-row flex-end w100">
          <div v-if="!showTextMode" class="button" @click="showTextMode = true">
            <Icon icon="clipboard-plus" style="font-size: 2em"></Icon>&nbsp; Paste config ...
          </div>
          <div v-else class="button" @click="showTextMode = false">
            Back
          </div>
        </div>

        <div class="panel-middle scrollable flex-grow log-config-margin">
          <template v-if="showTextMode">
            <div ref="settingsEditArea"
              style="white-space: pre-wrap; border: 1px solid orange; padding: 10px;"
              class="monospace h100"
              :class="{'jsonbg': !confHasError, 'jsonbg-error': confHasError}"
              contenteditable="true"
              @input="updateSettings"
            >
              {{parsedSettings}}
            </div>
          </template>
          <template v-else>
            <JsonObject label="logger-settings" 
                        :value="currentSettings" 
                        :ignoreKeys="{'allowLogging': true}"
                        @change="updateSettingsUi"
            ></JsonObject>
          </template>
        </div>


        <div class="flex flex-row flex-end">
          <div class="button" @click="restoreLoggerSettings()">
            Revert
          </div>
          <div class="button button-primary" @click="saveLoggerSettings()">
            Save
          </div>
        </div>
      </div>

      <!-- LOGGER OUTPUT/START LOGGING -->
      <div class="results-panel flex flex-shrink flex-column overflow-hidden">
        <div class="panel-top flex-nogrow">
          <h2>Logger results</h2>
        </div>
        <template v-if="logStringified">
          <div v-if="confHasError" class="warn">
            Logger configuration contains an error. You can export current log, but you will be unable to record a new log.
          </div>
          <div class="panel-middle scrollable flex-grow p-t-025em">
            <pre>
              {{logStringified}}
            </pre>
          </div>
          <div class="flex-noshrink flex flex-row flex-end p-t-025em">
            <div class="button button-bar"
                 @click="startLogging()"
            >
              New log
            </div>
            <div class="button button-bar"
                 @click="exportLog()"
            >
              Export log
            </div>
            <div class="button button-bar button-primary"
                 @click="exportAndQuit()"
            >
              Export & finish
            </div>
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
            <div v-else-if="lastSettings && lastSettings.allowLogging && lastSettings.consoleOptions && lastSettings.consoleOptions.enabled"
                 class="flex flex-column flex-center flex-cross-center w100 h100"
            >
              <p class="m-025em">
                Logging in progress ...
              </p>
              <div class="button button-big button-primary"
                   @click="stopLogging()"
              >
                Stop logging
              </div>
              <template v-if="lastSettings && lastSettings.timeout"
                        class="m-025em"
              >
                <p>
                  ... or wait until logging ends.
                </p>
                <p>
                  You can <a @click="hidePopup()">hide popup</a> — it will automatically re-appear when logging finishes.
                </p>
              </template>
              <template v-else-if="lastSettings">
                <p>
                  You can <a @click="hidePopup()">hide popup</a> — the logging will continue until you re-open the popup and stop it.
                </p>
              </template>
            </div>
            <div v-else class="flex flex-column flex-center flex-cross-center w100 h100">
              <div class="button button-big button-primary"
                   @click="startLogging()"
              >
                Start logging
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
    <!-- <div>
      button row is heres
    </div> -->
  </div>
</template>

<script>
import { mapState } from 'vuex';
import Logger from '../ext/lib/Logger';
import Comms from '../ext/lib/comms/Comms';
import IO from '../common/js/IO';
import JsonObject from '../common/components/JsonEditor/JsonObject';
import Icon from '../common/components/Icon';

export default {
  components: {
    JsonObject,
    Icon,
  },
  data() {
    return {
      showLoggerUi: false,
      header: {
        header: 'whoopsie daisy',
        subheader: 'you broke the header choosing script'
      },
      parsedSettings: '',
      lastSettings: {},
      currentSettings: {},
      confHasError: false,
      logStringified: '',
      showTextMode: false,
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

    this.getLoggerSettings();
  },
  computed: {
    ...mapState([
      'uwLog',
      'showLogger',
      'loggingEnded',
    ]),
  },
  watch: {
    uwLog(newValue, oldValue)  {
      if (oldValue !== newValue) {
        this.$store.dispatch('uw-show-logger');
        this.logStringified = JSON.stringify(newValue, null, 2);
      }
    },
    async showLogger(newValue) {
      this.showLoggerUi = newValue;

      // update logger settings (they could have changed while the popup was closed)
      if (newValue) {
        this.getLoggerSettings();
      }
    },
    loggingEnded(newValue) {
      // note — the value of loggingEnded never actually matters. Even if this value is 'true'
      // internally, vuexStore.dspatch() will still do its job and give us the signal we want
      if (newValue) {
        this.stopLogging();
      }
    }
  },
  methods: {
    async getLoggerSettings() {
      this.lastSettings = await Logger.getConfig() || {};
      this.parsedSettings = JSON.stringify(this.lastSettings, null, 2) || '';
      this.currentSettings = JSON.parse(JSON.stringify(this.lastSettings));
    },
    updateSettings(val) {
      try {
        this.parsedSettings = JSON.stringify(JSON.parse(val.target.textContent.trim()), null, 2);
        this.lastSettings = JSON.parse(val.target.textContent.trim());
        this.currentSettings = JSON.parse(JSON.stringify(this.lastSettings));
        this.confHasError = false;
      } catch (e) {
        this.confHasError = true;
      }
    },
    updateSettingsUi(val) {
      try {
        this.parsedSettings = JSON.stringify(val, null, 2);
        this.lastSettings = val;
        this.currentSettings = JSON.parse(JSON.stringify(this.lastSettings));
      } catch (e) {
        
      }
    },
    saveLoggerSettings() {
      Logger.saveConfig({...this.lastSettings});
    },
    restoreLoggerSettings() {
      this.getLoggerSettings();
      this.confHasError = false;
    },
    async startLogging(){
      this.logStringified = undefined;
      await Logger.saveConfig({...this.lastSettings, allowLogging: true});
      window.location.reload();
    },
    hidePopup() {
      // this function only works as 'close' if logging has finished
      if (this.logStringified) {
        Logger.saveConfig({...this.lastSettings, allowLogging: false});
        this.logStringified = undefined;
      }
      this.$store.dispatch('uw-hide-logger');

      this.showLoggerUi = false;
    },
    closePopupAndStopLogging() {
      Logger.saveConfig({...this.lastSettings, allowLogging: false});
      this.logStringified = undefined;
      this.$store.dispatch('uw-hide-logger');
    },
    stopLogging() {
      Logger.saveConfig({...this.lastSettings, allowLogging: false});
      this.lastSettings.allowLogging = false;
    },
    exportLog() {
      IO.csStringToFile(this.logStringified);
    },
    exportAndQuit() {
      this.exportLog();
      this.logStringified = undefined;
      this.closePopupAndStopLogging();
    }
  }
}
</script>

<style lang="scss" src="../res/css/flex.scss" scoped></style> 

<style lang="scss" scoped>
@import '../res/css/colors.scss';
@import '../res/css/font/overpass.css';
@import '../res/css/font/overpass-mono.css';
@import '../res/css/common.scss';

.uw-ultrawidify-container-root {
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
    pointer-events: auto !important;
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

  .m-025em {
    margin: 0.25em;
  }

  .p-t-025em {
    padding-top: 0.25em;
  }

  .button {
    display: inline-flex;
    align-items: center;
    justify-items: center;
    padding-left: 2em;
    padding-right: 2em;
  }

  .button-primary {
    background-color: $primary;
    color: #fff;
  }

  .button-big {
    font-size: 1.5em;
    padding: 1.75em 3.25em;
  }

  .button-bar {
    font-size: 1.25em;
    padding: 0.25em 1.25em;
    margin-left: 0.25em;
  }

  .button-header {
    font-size: 2em;
    padding-top: 0.1em;
    padding-left: 1em;
    padding-right: 1em;
  }

  .jsonbg {
    background-color: #131313;
  }
  .jsonbg-error {
    background-color: #884420;
  }

  .log-config-margin {
    margin-top: 3em;
    margin-bottom: 3em;
  }
}
</style>
