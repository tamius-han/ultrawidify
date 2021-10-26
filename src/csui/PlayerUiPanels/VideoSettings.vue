<template>
  <div class="flex flex-row flex-wrap" style="padding-bottom: 20px">
    <div class="sub-panel">
      <div class="flex flex-row">
        <mdicon name="crop" :size="32" />
        <h1>Crop video:</h1>
      </div>
      <div class="sub-panel-content flex flex-row flex-wrap">
        <ShortcutButton v-for="(action, index) of aspectRatioActions"
                        class="flex b3 flex-grow button"
                        :key="index"
                        :label="(action.scopes.page && action.scopes.page.label) ? action.scopes.page.label : action.label"
                        :shortcut="parseShortcut(action)"
                        @click="execAction(action)"
        >
        </ShortcutButton>
      </div>
    </div>
    <div class="sub-panel">
      <div class="flex flex-row">
        <mdicon name="stretch-to-page-outline" :size="32" />
        <h1>Stretch video:</h1>
      </div>
      <div class="flex flex-row flex-wrap">
        <ShortcutButton v-for="(action, index) of stretchActions"
                        class="flex b3 flex-grow button"
                        :key="index"
                        :label="(action.scopes.page && action.scopes.page.label) ? action.scopes.page.label : action.label"
                        :shortcut="parseShortcut(action)"
                        @click="execAction(action)"
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
          <div class="flex flex-row">
            <ShortcutButton
              class="flex b3 flex-grow button"
              label="-5 %"
            >
            </ShortcutButton>
            <ShortcutButton
              class="flex b3 flex-grow button"
              label="-1 %"
            >
            </ShortcutButton>
            <div class="flex-grow"></div>
            <ShortcutButton
              class="flex b3 flex-grow button"
              label="+1 %"
            >
            </ShortcutButton>
            <ShortcutButton
              class="flex b3 flex-grow button"
              label="+5 %"
            >
            </ShortcutButton>
          </div>
          <input id="_input_zoom_slider"
                  class="input-slider"
                  type="range"
                  step="any"
                  min="-1"
                  max="4"
                  :value="logarithmicZoom"
                  @input="changeZoom($event.target.value)"
                  />
          <div style="overflow: auto" class="flex flex-row">
            <div class="flex flex-grow medium-small x-pad-1em">
              Zoom: {{(zoom * 100).toFixed()}}%
            </div>
            <div class="flex flex-nogrow flex-noshrink medium-small">
              <a class="_zoom_reset x-pad-1em" @click="resetZoom()">reset</a>
            </div>
          </div>
        </template>
        <template v-else>
          <div>Horizontal zoom</div>
          <div class="flex flex-row">
            <ShortcutButton
              class="flex b3 flex-grow button"
              label="-5 %"
            >
            </ShortcutButton>
            <ShortcutButton
              class="flex b3 flex-grow button"
              label="-1 %"
            >
            </ShortcutButton>
            <div class="flex-grow"></div>
            <ShortcutButton
              class="flex b3 flex-grow button"
              label="+1 %"
            >
            </ShortcutButton>
            <ShortcutButton
              class="flex b3 flex-grow button"
              label="+5 %"
            >
            </ShortcutButton>
          </div>
          <input id="_input_zoom_slider"
                  class="input-slider"
                  type="range"
                  step="any"
                  min="-1"
                  max="4"
                  :value="logarithmicZoom"
                  @input="changeZoom($event.target.value)"
          />

          <div>Vertical zoom</div>
          <div class="flex flex-row">
            <ShortcutButton
              class="flex b3 flex-grow button"
              label="-5 %"
            >
            </ShortcutButton>
            <ShortcutButton
              class="flex b3 flex-grow button"
              label="-1 %"
            >
            </ShortcutButton>
            <div class="flex-grow"></div>
            <ShortcutButton
              class="flex b3 flex-grow button"
              label="+1 %"
            >
            </ShortcutButton>
            <ShortcutButton
              class="flex b3 flex-grow button"
              label="+5 %"
            >
            </ShortcutButton>
          </div>
          <input id="_input_zoom_slider"
                  class="input-slider"
                  type="range"
                  step="any"
                  min="-1"
                  max="4"
                  :value="logarithmicZoom"
                  @input="changeZoom($event.target.value)"
          />

          <div style="overflow: auto" class="flex flex-row">
            <div class="flex flex-grow medium-small x-pad-1em">
              Zoom: {{(zoomX * 100).toFixed()}}% x {{(zoomY * 100).toFixed()}}%
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
      zoomAspectRatioLocked: true
    }
  },
  mixins: [
    ComputeActionsMixin
  ],
  props: [
    'settings',
    'frame',
    'zoom',
    'cropModePersistence',
    'eventBus'
  ],
  created() {
    this.exec = new ExecAction(this.settings, window.location.hostname);
  },
  components: {
    ShortcutButton,
    Button,
    AlignmentOptionsControlComponent
  },
  computed: {
    logarithmicZoom: function(){
      return Math.log2(this.zoom || 1);
    }
  },
  methods: {
    async openOptionsPage() {
      BrowserDetect.runtime.openOptionsPage();
    },
    execAction(action) {

      // TODO: migrate all actions to the new way of doing things
      if (action.cmd[0].action === 'set-ar') {
        this.eventBus?.send('set-ar', {
          type: action.cmd[0].arg,
          ratio: action.cmd[0].customArg
        });
        return;
      }


      console.log('execing action:', action, window.ultrawidify);

      try {
        this.exec.exec(action, 'page', this.frame, true);
      } catch (error) {
        console.error('[uw:VideoSettings.vue::execAction] failed to execute action. Error:', error);
      }
    },
    parseShortcut(action) {
      if (! action.scopes.page.shortcut) {
        return '';
      }
      return KeyboardShortcutParser.parseShortcut(action.scopes.page.shortcut[0]);
    },

    toggleZoomAr() {
      this.zoomAspectRatioLocked = !this.zoomAspectRatioLocked;
    },

    resetZoom() {
      this.zoom = 1;
    },
    changeZoom(newZoom, axis) {
      newZoom = Math.pow(2, newZoom);

      this.exec.exec(
        {
          cmd: [{action: 'set-zoom', arg: newZoom}]
        },
        'page',
        this.frame,
        true
      );
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
