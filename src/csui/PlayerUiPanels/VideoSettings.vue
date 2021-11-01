<template>
  <div class="flex flex-row flex-wrap" style="padding-bottom: 20px">
    <div v-if="settings" class="sub-panel">
      <div class="flex flex-row">
        <mdicon name="crop" :size="32" />
        <h1>Crop video:</h1>
      </div>
      <div class="sub-panel-content flex flex-row flex-wrap">
        <ShortcutButton v-for="(command, index) of settings?.active.commands.crop"
                        class="flex b3 flex-grow button"
                        :key="index"
                        :label="command.label"
                        :shortcut="parseShortcut(command)"
                        @click="execAction(command)"
        >
        </ShortcutButton>
      </div>
    </div>
    <div v-if="settings" class="sub-panel">
      <div class="flex flex-row">
        <mdicon name="stretch-to-page-outline" :size="32" />
        <h1>Stretch video:</h1>
      </div>
      <div class="flex flex-row flex-wrap">
        <ShortcutButton v-for="(command, index) of settings?.active.commands.stretch"
                        class="flex b3 flex-grow button"
                        :key="index"
                        :label="command.label"
                        :shortcut="parseShortcut(command)"
                        @click="execAction(command)"
        >
        </ShortcutButton>
      </div>
    </div>
    <div class="sub-panel">
      <div class="flex flex-row">
        <mdicon name="magnify-plus-outline" :size="32" />
        <h1>Manual zoom:</h1>
      </div>
      <div class="flex flex-column">
        <!--
          min, max and value need to be implemented in js as this slider
          should use logarithmic scale
        -->
        <div class="flex flex-row flex-end">
          <Button
            v-if="zoomAspectRatioLocked"
            label="Unlock aspect ratio"
            icon="lock-open"
            :fixedWidth="true"
            @click="toggleZoomAr()"
          >
          </Button>
          <Button
            v-else
            label="Lock aspect ratio"
            icon="lock"
            :fixedWidth="true"
            @click="toggleZoomAr()"
          >
          </Button>
        </div>
        <template v-if="zoomAspectRatioLocked">
          <input id="_input_zoom_slider"
                  class="input-slider"
                  type="range"
                  step="any"
                  min="-1"
                  max="4"
                  :value="zoom.x"
                  @input="changeZoom($event.target.value)"
                  />
          <div style="overflow: auto" class="flex flex-row">
            <div class="flex flex-grow medium-small x-pad-1em">
              Zoom: {{(zoom.x * 100).toFixed()}}%
            </div>
            <div class="flex flex-nogrow flex-noshrink medium-small">
              <a class="_zoom_reset x-pad-1em" @click="resetZoom()">reset</a>
            </div>
          </div>
        </template>
        <template v-else>
          <div>Horizontal zoom</div>
          <input id="_input_zoom_slider"
                  class="input-slider"
                  type="range"
                  step="any"
                  min="-1"
                  max="4"
                  :value="zoom.x"
                  @input="changeZoom($event.target.value, 'x')"
          />

          <div>Vertical zoom</div>
          <input id="_input_zoom_slider"
                  class="input-slider"
                  type="range"
                  step="any"
                  min="-1"
                  max="4"
                  :value="zoom.y"
                  @input="changeZoom($event.target.value, 'y')"
          />

          <div style="overflow: auto" class="flex flex-row">
            <div class="flex flex-grow medium-small x-pad-1em">
              Zoom: {{(zoom.x * 100).toFixed()}}% x {{(zoom.y * 100).toFixed()}}%
            </div>
            <div class="flex flex-nogrow flex-noshrink medium-small">
              <a class="_zoom_reset x-pad-1em" @click="resetZoom()">reset</a>
            </div>
          </div>
        </template>
      </div>
    </div>
    <div class="sub-panel">
      <div class="flex flex-row">
        <mdicon name="align-horizontal-center" :size="32" />
        <h1>Video alignment:</h1>
      </div>

      <div class="flex flex-row">
        <alignment-options-control-component>
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
</template>

<script>
import Button from '../../common/components/Button.vue'
import KeyboardShortcutParser from '../../common/js/KeyboardShortcutParser';
import ShortcutButton from '../../common/components/ShortcutButton';
import ComputeActionsMixin from '../../common/mixins/ComputeActionsMixin';
import ExecAction from '../ui-libs/ExecAction';
import BrowserDetect from '../../ext/conf/BrowserDetect';
import AspectRatioType from '../../common/enums/AspectRatioType.enum';
import CropModePersistence from '../../common/enums/CropModePersistence.enum';
import AlignmentOptionsControlComponent from './AlignmentOptionsControlComponent.vue';

export default {
  data() {
    return {
      exec: null,
      scope: 'page',
      CropModePersistence: CropModePersistence,
      zoomAspectRatioLocked: true,
      zoom: {
        x: 1,
        y: 1
      }
    }
  },
  mixins: [
    ComputeActionsMixin
  ],
  props: [
    'settings',
    'frame',
    'cropModePersistence',
    'eventBus'
  ],
  created() {
    this.exec = new ExecAction(this.settings, window.location.hostname);
    this.eventBus.subscribe('announce-zoom', {
      function: (config) => {
        this.zoom = {
          x: Math.log2(config.x),
          y: Math.log2(config.y)
        };
      }
    });
    // this.eventBus.send('get-current-config');
  },
  components: {
    ShortcutButton,
    Button,
    AlignmentOptionsControlComponent
  },
  computed: {
  },
  methods: {
    async openOptionsPage() {
      BrowserDetect.runtime.openOptionsPage();
    },
    execAction(command) {
      this.eventBus?.send(command.action, command.arguments);
    },
    parseShortcut(command) {
      if (! command.shortcut) {
        return '';
      }
      return KeyboardShortcutParser.parseShortcut(command.shortcut);
    },

    toggleZoomAr() {
      this.zoomAspectRatioLocked = !this.zoomAspectRatioLocked;
    },

    resetZoom() {
      this.zoom = 1;
      this.eventBus.send('set-zoom', {zoom: 1});

      console.log('resetting zoom!');

    },
    changeZoom(newZoom, axis) {
      newZoom = Math.pow(2, newZoom);
      console.log('new zoom:', newZoom);

      this.eventBus.send('set-zoom', {zoom: newZoom, axis: axis, noAnnounce: true});

      // this.zoom = newZoom;
    },
  }
}
</script>

<style lang="scss" src="../../res/css/flex.scss" scoped></style>
<style lang="scss" src="../res-common/panels.scss" scoped></style>
<style lang="scss" src="../res-common/common.scss" scoped></style>

<style lang="scss" scoped>
.b3 {
  width: 9rem;
  padding-left: 0.33rem;
  padding-right: 0.33rem;
}
.input-slider {
  width: 480px;
}
.warning-lite {
  padding-right: 16px;
  padding-bottom: 16px;
  padding-top: 8px;
}


</style>
