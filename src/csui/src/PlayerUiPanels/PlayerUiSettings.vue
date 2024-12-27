<template>
  <div class="flex flex-col" style="position: relative; width: 100%;">
    <!-- The rest of the tab is under 'edit ratios and shortcuts' row -->
    <div class="flex flex-col" style="width: 100%">
      <h2>Player UI options</h2>

      <div class="flex flex-col compact-form">
        <div class="field">
          <div class="label">Enable in-player UI</div>
          <input type="checkbox" v-model="settings.active.ui.inPlayer.enabled" />
        </div>
        <div
          class="flex flex-col field-group compact-form"
          :class="{disabled: !settings.active.ui.inPlayer.enabled}"
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

          <div class="field" :class="{disabled: settings.active.ui.inPlayer.activation !== 'trigger-zone'}">
            <div class="label">Edit trigger zone:</div>
            <button @click="startTriggerZoneEdit()">Edit</button>
          </div>

          <div class="field">
            <div class="label">
              Do not show in-player UI when video player is narrower than (% of screen width)
            </div>
            <div>TODO: slider</div>
          </div>
        </div>
      </div>

      <h2>Menu options and keyboard shortcuts</h2>
      <div class="flex flex-row">
        <!-- CROP OPTIONS -->
        <div>
          <div class="flex flex-row">
            <mdicon name="crop" :size="32" />
            <h3>Crop video:</h3>
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
            <mdicon name="stretch-to-page-outline" :size="32" />
            <h3>Stretch video:</h3>
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
  methods: {
    setUiPage(key, event) {

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

</style>
