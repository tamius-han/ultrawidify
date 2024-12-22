<template>
  <div class="flex flex-col" style="position: relative; width: 100%;">
    <!-- The rest of the tab is under 'edit ratios and shortcuts' row -->
    <div class="flex flex-col" style="width: 100%">

      <h2>Player UI options</h2>

      <div class="field">
        <div class="label">Enable in-player UI</div>
        <input type="checkbox" v-model="settings.active.ui.inPlayer.enabled" />
      </div>
<!--
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

        <div v-if="settings.active.ui.inPlayer.activation === 'trigger-zone'">
          Trigger zone size:
        </div>

        <div class="field">
          <div class="label">
            Do not show in-player UI when video player is narrower than (% of screen width)
          </div>
          <div>TODO: slider</div>
        </div>
      </div> -->

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
</style>
