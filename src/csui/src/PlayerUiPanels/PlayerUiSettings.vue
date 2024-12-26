<template>
  <div class="flex flex-col" style="position: relative; width: 100%;">
    <!-- The rest of the tab is under 'edit ratios and shortcuts' row -->
    <div class="flex flex-col" style="width: 100%">

      <h2>Player UI options</h2>

      <div class="field">
        <div class="label">Enable in-player UI</div>
        <input type="checkbox" v-model="settings.active.ui.inPlayer.enabled" />
      </div>

      <div
        class="flex flex-col"
        :class="{disabled: settings.active.ui.inPlayer.enabled}"
      >
        <div class="field">
          <div class="label">Enable only in full screen</div>
          <input type="checkbox" v-model="settings.active.ui.inPlayer.enabledFullscreenOnly" />
        </div>

        <div class="field">
          <div class="label">
            Popup activator position:
          </div>
          <div class="select">
            <select
              v-model="settings.active.ui.inPlayer.alignment"
              @click="setUiOption('alignment', $event)"
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>

        <div class="field">
          <div class="label">
            Activate in-player UI:
          </div>
          <div class="select">
            <select
              v-model="settings.active.ui.inPlayer.activation"
              @click="setUiOption('', $event)"
            >
              <option value="player">
                When mouse hovers over player
              </option>
              <option value="trigger-zone">
                When mouse hovers over trigger zone
              </option>
            </select>
          </div>
        </div>

        <div class="field">
          <div class="label">Edit trigger zone:</div>
          <button @click="startTriggerZoneEdit()">Edit</button>
        </div>

        <div v-if="settings.active.ui.inPlayer.activation === 'trigger-zone'">
          <div class="trigger-zone-editor">
            <div class="heading">
              <h3>Trigger zone editor</h3>
            </div>
            <div class="field">
              <div class="label">Trigger zone width:</div>
              <div class="input range-input">
                <input
                  v-model="settings.active.ui.inPlayer.triggerZoneDimensions.width"
                  class="slider"
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.01"
                >
                <input
                  :value="(settings.active.ui.inPlayer.triggerZoneDimensions.width * 100).toFixed(2)"
                  @input="(event) => setTriggerZoneSize('width', event.target.value)"
                >
              </div>
              <div class="hint">
                Width of the trigger zone (% of player area).
              </div>
            </div>
            <div class="field">
              <div class="label">Trigger zone height:</div>
              <div class="input range-input">
                <input
                  v-model="settings.active.ui.inPlayer.triggerZoneDimensions.height"
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.01"
                >
                <input
                  :value="(settings.active.ui.inPlayer.triggerZoneDimensions.height * 100).toFixed(2)"
                  @input="(event) => setTriggerZoneSize('width', event.target.value)"
                >
              </div>
              <div class="hint">
                Height of the trigger zone (% of player area).
              </div>
            </div>
            <div class="field">
              <div class="label">Trigger zone horizontal offset:</div>
              <div class="input range-input">
                <input
                  v-model="settings.active.ui.inPlayer.triggerZoneDimensions.offsetX"
                  type="range"
                  min="-100"
                  max="100"
                >
                <input
                  v-model="settings.active.ui.inPlayer.triggerZoneDimensions.offsetX"
                >
              </div>
              <div class="hint">
                By default, trigger zone is centered around the button. This option moves trigger zone left and right.
              </div>
            </div>
            <div class="field">
              <div class="label">Trigger zone vertical offset:</div>
              <div class="input range-input">
                <input
                  v-model="settings.active.ui.inPlayer.triggerZoneDimensions.offsetY"
                  type="range"
                  min="-100"
                  max="100"
                >
                <input
                  v-model="settings.active.ui.inPlayer.triggerZoneDimensions.offsetY"
                >
              </div>
              <div class="hint">
                By default, trigger zone is centered around the button. This option moves trigger zone up and down.
              </div>
            </div>
          </div>
        </div>

        <div class="field">
          <div class="label">
            Do not show in-player UI when video player is narrower than (% of screen width)
          </div>
          <div>TODO: slider</div>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
import Button from '../components/Button.vue'
import BrowserDetect from '../../../ext/conf/BrowserDetect';

export default {
  data() {
    return {

    }
  },
  mixins: [
  ],
  props: [
    'settings',      // required for buttons and actions, which are global
    'eventBus',
  ],
  created() {
  },
  mounted() {
  },
  components: {
    Button,
  },
  methods: {
    setUiPage(key, event) {

    },
    forceNumber(value) {
      //       Change EU format to US if needed
      //                  |       remove everything after second period if necessary
      //                  |               |            |   remove non-numeric characters
      //                  |               |            |           |
      return value.replaceAll(',', '.').split('.', 2).join('.').replace(/[^0-9.]/g, '');
    },
    setTriggerZoneSize(key, value) {
      let size = (+this.forceNumber(value) / 100);

      if (isNaN(+size)) {
        size = 0.5;
      }

      this.settings.active.ui.inPlayer.triggerZoneDimensions[key] = size;
      this.settings.saveWithoutReload();
    },
    startTriggerZoneEdit() {
      this.eventBus.send('start-trigger-zone-edit');
    },
    async openOptionsPage() {
      BrowserDetect.runtime.openOptionsPage();
    },

  }
}
</script>

<style lang="scss" src="../../res/css/flex.scss" scoped module></style>
<style lang="scss" src="../res-common/panels.scss" scoped module></style>
<style lang="scss" src="../res-common/common.scss" scoped module></style>
<style lang="scss" scoped>
.justify-center {
  justify-content: center;
}
.items-center {
  align-items: center;
}
.mt-4{
  margin-top: 1rem;
}

.input {
  max-width: 24rem;
}

.range-input {
  display: flex;
  flex-direction: row;

  * {
    margin-left: 0.5rem;
    margin-right: 0.5rem;
  }


  input {
    max-width: 5rem;
  }

  input[type=range] {
    max-width: none;
  }
}

.trigger-zone-editor {
  background-color: rgba(0,0,0,0.25);

  padding-bottom: 2rem;
  .field {
    margin-bottom: -1em;
  }

}
</style>
