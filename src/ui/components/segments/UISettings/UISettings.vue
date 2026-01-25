<template>
  <div class="flex flex-col relative w-full">
    <h2 class="text-[1.75em]">Player UI options</h2>

    <!-- The rest of the tab is under 'edit ratios and shortcuts' row -->
    <div v-if="settings" class="flex flex-col" style="width: 100%">

      <div class="flex flex-col gap-2">
        <div
          class="flex flex-col field-group compact-form gap-2"
        >

          <div class="field">
            <div class="label">
              Activate in-player UI:
            </div>
            <div class="select">
              <select
                v-model="settings.active.ui.inPlayer.activation"
                @change="saveSettings()"
              >
                <option value="none">
                  Never activate UI with mouse movement alone
                </option>
                <option value="player">
                  When mouse moves over player, always
                </option>
                <option value="distance">
                  (experimental) When mouse is close to the menu activator
                </option>
                <!-- <option value="trigger-zone">
                  When mouse moves over trigger zone
                </option> -->
              </select>
            </div>
          </div>

          <div class="field">
            <div class="label">
              <input type="checkbox"
                v-model="settings.active.ui.inPlayer.activateWithCtrl"
                @change="saveSettings()"
              >
            </div>
            <div class="text-left">
              Also show on CTRL + mouse move
            </div>
          </div>

          <div v-show="settings.active.ui.inPlayer.activation === 'distance'" class="field">
            <div class="label">
              Show menu when mouse is closer than:
            </div>
            <div class="input range-input">
              <input
                v-model="settings.active.ui.inPlayer.activationDistance"
                class="slider"
                type="range"
                min="10"
                max="100"
                step="1"
                @change="(event) => saveSettings()"
              >
              <input
                style="margin-right: 0.6rem;"
                v-model="settings.active.ui.inPlayer.activationDistance"
                @change="(event) => saveSettings(true)"
              >
              <select
                class="unit-select !min-w-[72px]"
                v-model="settings.active.ui.inPlayer.activationDistanceUnits"
                @change="(event) => saveSettings(true)"
              >
                <option value="%">%</option>
                <option value="px">px</option>
              </select>
            </div>
          </div>

          <div class="field" :class="{'disabled': settings.active.ui.inPlayer.activation !== 'trigger-zone'}">
            <div class="label">Edit trigger zone:</div>
            <button @click="startTriggerZoneEdit()">Edit</button>
          </div>

          <div class="field">
            <div class="label">
              Menu activator position:
            </div>
            <div class="select">
              <select
                v-model="settings.active.ui.inPlayer.activatorAlignment"
                @change="saveSettings()"
              >
                <optgroup label="Edges">
                  <option :value="MenuPosition.Left">Left</option>
                  <option :value="MenuPosition.Right">Right</option>
                  <option :value="MenuPosition.Top">Top</option>
                  <option :value="MenuPosition.Bottom">Bottom</option>
                </optgroup>

                <optgroup label="corners">
                  <option :value="MenuPosition.TopLeft">Top left</option>
                  <option :value="MenuPosition.BottomLeft">Bottom left</option>
                  <option :value="MenuPosition.TopRight">Top right"</option>
                  <option :value="MenuPosition.BottomRight">Bottom right"</option>
                </optgroup>
              </select>
            </div>
          </div>

          <div class="field">
            <div class="label">
              Menu activator horizontal padding:
            </div>
            <div class="input range-input">
              <input
                v-model="settings.active.ui.inPlayer.activatorPadding.x"
                class="slider"
                type="range"
                min="0"
                max="100"
                step="1"
                @change="(event) => saveSettings()"
              >
              <input
                style="margin-right: 0.6rem;"
                v-model="settings.active.ui.inPlayer.activatorPadding.x"
                @change="(event) => saveSettings(true)"
              >
              <select
                class="unit-select !min-w-[72px]"
                v-model="settings.active.ui.inPlayer.activatorPaddingUnit.x"
                @change="(event) => saveSettings(true)"
              >
                <option value="%">%</option>
                <option value="px">px</option>
              </select>
            </div>
          </div>

          <div class="field">
            <div class="label">
              Menu activator vertical padding:
            </div>
            <div class="input range-input">
              <input
                v-model="settings.active.ui.inPlayer.activatorPadding.y"
                class="slider"
                type="range"
                min="0"
                max="100"
                step="1"
                @change="(event) => saveSettings()"
              >
              <input
                style="margin-right: 0.6rem;"
                v-model="settings.active.ui.inPlayer.activatorPadding.y"
                @change="(event) => saveSettings(true)"
              >
              <select
                class="unit-select !min-w-[72px]"
                v-model="settings.active.ui.inPlayer.activatorPaddingUnit.y"
                @change="(event) => saveSettings(true)"
              >
                <option value="%">%</option>
                <option value="px">px</option>
              </select>
            </div>
          </div>

          <div class="field">
            <div class="label">
              Do not show in-player UI when video player is narrower than
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
                style="margin-right: 0.6rem;"
                :value="ghettoComputed.minEnabledWidth"
                @input="(event) => setPlayerRestrictions('minEnabledWidth', event.target.value, true)"
                @change="(event) => saveSettings(true)"
              >
              <div class="unit">% of screen</div>
            </div>
          </div>

          <div class="field">
            <div class="label">
              Do not show in-player UI when video player is shorter than
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
                style="margin-right: 0.6rem;"
                :value="ghettoComputed.minEnabledHeight"
                @input="(event) => setPlayerRestrictions('minEnabledHeight', event.target.value, true)"
                @change="(event) => saveSettings(true)"
              >
              <div class="unit">% of screen</div>
            </div>
          </div>
        </div>
      </div>

    </div>
    <div v-else>
      Loading settings ...
    </div>
  </div>
</template>

<script lang="ts">
import { MenuPosition } from '@src/common/interfaces/ClientUiMenu.interface';
import BrowserDetect from '@src/ext/conf/BrowserDetect';
import { defineComponent } from 'vue';

export default defineComponent({
  components: {
  },
  data() {
    return {
      MenuPosition,
      ghettoComputed: { }
    }
  },
  mixins: [
  ],
  props: [
    'settings',      // required for buttons and actions, which are global
    'siteSettings',
    'eventBus',
  ],
  mounted() {
    this.ghettoComputed = {
      minEnabledWidth: this.optionalToFixed(this.settings.active.ui.inPlayer.minEnabledWidth * 100, 0),
      minEnabledHeight: this.optionalToFixed(this.settings.active.ui.inPlayer.minEnabledHeight * 100, 0),
    };

    this.eventBus?.send('force-menu-activator-state', {visibility: true});
  },
  unmounted() {
    this.eventBus?.send('force-menu-activator-state', {visibility: false});
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
    async saveSettings(forceRefresh) {
      await this.settings.saveWithoutReload();

      this.eventBus.send('reload-menu');

      if (forceRefresh) {
        this.$nextTick( () => this.$forceUpdate() );
      }
    },
    startTriggerZoneEdit() {
      this.eventBus.send('start-trigger-zone-edit');
    },
    async openOptionsPage() {
      BrowserDetect.runtime.openOptionsPage();
    },

  }
});
</script>
<style lang="postcss" scoped>

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
    width: calc(33% - 0.5rem);
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
