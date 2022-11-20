<template>
  <div class="flex flex-column">
    <!-- 'Change UI' options is a tiny bit in upper right corner. -->
    <div
      class="options-bar flex flex-row"
      :class="{isEditing: editMode}"
    >
      <template v-if="editMode">
        <div class="flex-grow">
          You are currently editing options and shortcuts.
        </div>
        <div
          class="flex-nogrow flex-noshrink"
          @click="editMode = !editMode"
        >
          Exit edit mode
        </div>
      </template>
      <template v-else>
        <div class="flex-grow"></div>
        <div
          class=""
          @click="editMode = !editMode"
        >
          Edit ratios and shortcuts
        </div>
      </template>
    </div>

    <!-- The rest of the tab is under 'edit ratios and shortcuts' row -->
    <div class="flex flex-row flex-wrap" style="padding-bottom: 20px">

      <!-- CROP OPTIONS -->
      <div v-if="settings" class="sub-panel">
        <div class="flex flex-row">
          <mdicon name="crop" :size="32" />
          <h1>Crop video:</h1>
        </div>

        <CropOptionsPanel
          :settings="settings"
          :frame="frame"
          :exec="exec"
          :eventBus="eventBus"
          :site="site"
          :isEditing="editMode"
        >
        </CropOptionsPanel>
      </div>

      <!-- STRETCH OPTIONS -->
      <div v-if="settings" class="sub-panel">
        <div class="flex flex-row">
          <mdicon name="stretch-to-page-outline" :size="32" />
          <h1>Stretch video:</h1>
        </div>

        <StretchOptionsPanel
          :settings="settings"
          :frame="frame"
          :exec="exec"
          :eventBus="eventBus"
          :site="site"
          :isEditing="editMode"
        ></StretchOptionsPanel>
      </div>


      <!-- ZOOM OPTIONS -->
      <div class="sub-panel">
        <div class="flex flex-row">
          <mdicon name="magnify-plus-outline" :size="32" />
          <h1>Manual zoom:</h1>
        </div>

        <ZoomOptionsPanel
          :settings="settings"
          :frame="frame"
          :exec="exec"
          :eventBus="eventBus"
          :site="site"
        ></ZoomOptionsPanel>
      </div>

      <!-- VIDEO ALIGNMENT -->
      <div class="sub-panel">
        <div class="flex flex-row">
          <mdicon name="align-horizontal-center" :size="32" />
          <h1>Video alignment:</h1>
        </div>

        <div class="flex flex-row">
          <alignment-options-control-component
            :eventBus="eventBus"
          >
          </alignment-options-control-component>
        </div>

        <div class="flex flex-row flex-wrap">
          <div class="m-t-0-33em display-block">
            <input id="_input_zoom_site_allow_pan"
                    type="checkbox"
                    />
            Pan with mouse
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import CropOptionsPanel from './PanelComponents/VideoSettings/CropOptionsPanel'
import StretchOptionsPanel from './PanelComponents/VideoSettings/StretchOptionsPanel'
import Button from '../../../common/components/Button.vue'
import ShortcutButton from '../../../common/components/ShortcutButton';
import EditShortcutButton from '../../../common/components/EditShortcutButton';
import ComputeActionsMixin from '../../../common/mixins/ComputeActionsMixin';
import ExecAction from '../ui-libs/ExecAction';
import BrowserDetect from '../../../ext/conf/BrowserDetect';
import AlignmentOptionsControlComponent from './AlignmentOptionsControlComponent.vue';
import CommsMixin from '../utils/CommsMixin';

export default {
  data() {
    return {
      exec: null,
      scope: 'page',

      editMode: false,

      resizerConfig: {
        crop: null,
        stretch: null,
        zoom: null,
        pan: null
      }
    }
  },
  mixins: [
    ComputeActionsMixin,
    CommsMixin,
  ],
  props: [
    'settings',
    'frame',
    'eventBus',
    'site'
  ],
  created() {
    this.exec = new ExecAction(this.settings, window.location.hostname);
    this.eventBus.subscribe('uw-config-broadcast', {function: (config) => this.handleConfigBroadcast(config)});
  },
  mounted() {
    this.eventBus.sendToTunnel('get-ar');
  },
  components: {
    ShortcutButton,
    EditShortcutButton,
    Button,
    AlignmentOptionsControlComponent,
    StretchOptionsPanel,
    CropOptionsPanel
  },
  methods: {

    async openOptionsPage() {
      BrowserDetect.runtime.openOptionsPage();
    },

  }
}
</script>

<style lang="scss" src="../../../res/css/flex.scss" scoped module></style>
<style lang="scss" src="../res-common/panels.scss" scoped module></style>
<style lang="scss" src="../res-common/common.scss" scoped module></style>
