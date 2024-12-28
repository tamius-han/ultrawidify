<template>
  <div class="flex flex-col" style="position: relative; width: 100%;">
    <!-- The rest of the tab is under 'edit ratios and shortcuts' row -->
    <div class="flex flex-col" style="width: 100%">
      <h2>Player UI options</h2>

      <div class="flex flex-col compact-form">
        <div class="field">
          <div class="label">Enable in-player UI</div>
          <input
            type="checkbox"
            v-model="settings.active.ui.inPlayer.enabled"
            @change="saveSettings()"
          />
        </div>
        <div
          class="flex flex-col field-group compact-form"
          :class="{disabled: !settings.active.ui.inPlayer.enabled}"
        >
          <div class="field">
            <div class="label">Enable only in full screen</div>
            <input type="checkbox" v-model="settings.active.ui.inPlayer.enabledFullscreenOnly" />
          </div>

          <div class="field disabled">
            <div class="label">
              Popup activator position:
            </div>
            <div class="select">
              <select
                v-model="settings.active.ui.inPlayer.popupAlignment"
                @change="saveSettings()"
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
                @change="saveSettings()"
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

          <div class="field" :class="{'disabled': settings.active.ui.inPlayer.activation !== 'trigger-zone'}">
            <div class="label">Edit trigger zone:</div>
            <button @click="startTriggerZoneEdit()">Edit</button>
          </div>

          <div class="field">
            <div class="label">
              Do not show in-player UI when video player is narrower than (% of screen width)
            </div>
            <div class="input range-input">
              <input
                :value="settings.active.ui.inPlayer.minEnabledWidth"
                class="slider"
                type="range"
                min="0"
                max="1"
                step="0.01"
                @input="(event) => setPlayerRestrictions('minEnabledWidth', event.target.value)"
                @change="(event) => saveSettings()"
              >
              <input
                :value="ghettoComputed.minEnabledWidth"
                @input="(event) => setPlayerRestrictions('minEnabledWidth', event.target.value, true)"
                @change="(event) => saveSettings(true)"
              >
            </div>
          </div>

          <div class="field">
            <div class="label">
              Do not show in-player UI when video player is shorter than (% of screen width)
            </div>
            <div class="input range-input">
              <input
                :value="settings.active.ui.inPlayer.minEnabledHeight"
                class="slider"
                type="range"
                min="0"
                max="1"
                step="0.01"
                @input="(event) => setPlayerRestrictions('minEnabledHeight', event.target.value)"
                @change="(event) => saveSettings()"
              >
              <input
                :value="ghettoComputed.minEnabledHeight"
                @input="(event) => setPlayerRestrictions('minEnabledHeight', event.target.value, true)"
                @change="(event) => saveSettings(true)"
              >
            </div>
          </div>
        </div>
      </div>

      <h2 class="mt2r">Menu options and keyboard shortcuts</h2>
      <div>
        Click 'add new' to add a new option. Click a button to edit or remove the keyboard shortcut.
      </div>
      <div class="keyboard-settings">
        <!-- CROP OPTIONS -->
        <div>
          <div class="flex flex-row">
            <h3 class="mth3">CROP OPTIONS</h3>
          </div>

          <CropOptionsPanel
            :settings="settings"
            :eventBus="eventBus"
            :isEditing="true"
          >
          </CropOptionsPanel>
        </div>

        <!-- STRETCH OPTIONS -->
        <div>
          <div class="flex flex-row">
            <h3 class="mth3">STRETCH OPTIONS</h3>
          </div>

          <StretchOptionsPanel
            :settings="settings"
            :eventBus="eventBus"
            :isEditing="true"
          ></StretchOptionsPanel>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
import Button from '../components/Button.vue'
import BrowserDetect from '../../../ext/conf/BrowserDetect';
import CropOptionsPanel from './PanelComponents/VideoSettings/CropOptionsPanel.vue'
import StretchOptionsPanel from './PanelComponents/VideoSettings/StretchOptionsPanel.vue'

export default {
  components: {
    Button,
    CropOptionsPanel,
    StretchOptionsPanel
  },
  data() {
    return {
      ghettoComputed: { }
    }
  },
  mixins: [
  ],
  props: [
    'settings',      // required for buttons and actions, which are global
    'eventBus',
  ],
  mounted() {
    this.ghettoComputed = {
      minEnabledWidth: this.optionalToFixed(this.settings.active.ui.inPlayer.minEnabledWidth * 100, 0),
      minEnabledHeight: this.optionalToFixed(this.settings.active.ui.inPlayer.minEnabledHeight * 100, 0),
    }
  },
  methods: {
    forcePositiveNumber(value) {
      //       Change EU format to US if needed
      //                  |       remove everything after second period if necessary
      //                  |               |            |   remove non-numeric characters
      //                  |               |            |           |
      return value.replaceAll(',', '.').split('.', 2).join('.').replace(/[^0-9.]/g, '');
    },
    optionalToFixed(v, n) {
      if ((`${v}`.split('.')[1]?.length ?? 0) > n) {
        return v.toFixed(n);
      }
      return v;
    },
    setPlayerRestrictions(key, value, isTextInput) {
      if (isTextInput) {
        value = (+this.forcePositiveNumber(value) / 100);
      }
      if (isNaN(+value)) {
        value = 0.5;
      }

      this.settings.active.ui.inPlayer[key] = value;

      if (isTextInput) {
        this.ghettoComputed[key] = this.optionalToFixed(value, 0);
      } else {
        this.ghettoComputed[key] = this.optionalToFixed(value * 100, 0);
      }
    },
    saveSettings(forceRefresh) {
      this.settings.saveWithoutReload();

      if (forceRefresh) {
        this.$nextTick( () => this.$forceRefresh() );
      }
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

.disabled {
  pointer-events: none;
  /* color: #666; */
  filter: contrast(50%) brightness(40%) grayscale(100%);
}

.compact-form {
  > .field, > .field-group {
    margin-top: 0;
    margin-bottom: 0;
  }
}

.keyboard-settings {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 1rem;

  > * {
    width: calc(50% - 0.5rem);
  }
}

.mt2r {
  margin-top: 2rem;
  margin-bottom: 0.5rem;
}
.mth3 {
  margin-top: 1.5rem;
}
</style>
