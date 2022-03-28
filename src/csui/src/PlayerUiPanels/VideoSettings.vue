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
          @click="editMode = false"
        >
          Exit edit mode
        </div>
      </template>
      <template v-else>
        <div class="flex-grow"></div>
        <div
          class=""
          @click="editMode = true"
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
        <div class="sub-panel-content flex flex-row flex-wrap">
          <ShortcutButton v-for="(command, index) of settings?.active.commands.crop"
                          class="flex b3 button"
                          :key="index"
                          :label="command.label"
                          :shortcut="parseShortcut(command)"
                          @click="execAction(command)"
          >
          </ShortcutButton>
        </div>

        <div class="flex flex-row">
          <div class="label">Default for this site</div>
          <div class="select">
            <select
              :value="siteDefaultCrop"
              @click="setDefaultCrop($event, 'site')"
            >
              <option
                v-for="(command, index) of settings?.active.commands.crop"
                :key="index"
                :value="JSON.stringify(command.arguments)"
              >
                {{command.label}}
              </option>
            </select>
          </div>
        </div>
        <div class="flex flex-row">
          <div class="label">Extension default</div>
          <div class="select">
            <select
              :value="extensionDefaultCrop"
              @click="setDefaultCrop($event, 'global')"
            >
              <option
                v-for="(command, index) of settings?.active.commands.crop"
                :key="index"
                :value="JSON.stringify(command.arguments)"
              >
                {{command.label}}
              </option>
            </select>
          </div>
        </div>
      </div>


      <!-- STRETCH OPTIONS -->
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

        <div class="flex flex-row">
          <div class="label">Default for this site</div>
          <div class="select">
            <select
              v-model="siteDefaultStretchMode"
              @click="setDefaultStretchingMode($event, 'site')"
            >
              <option
                v-for="(command, index) of settings?.active.commands.stretch"
                :key="index"
                :value="JSON.stringify(command.arguments)"
              >
                {{command.label}}
              </option>
            </select>
          </div>
        </div>
        <div class="flex flex-row">
          <div class="label">Extension default</div>
          <div class="select">
            <select
              v-model="extensionDefaultStretchMode"
              @click="setDefaultStretchingMode($event, 'global')"
            >
              <option
                v-for="(command, index) of settings?.active.commands.stretch"
                :key="index"
                :value="JSON.stringify(command.arguments)"
              >
                {{command.label}}
              </option>
            </select>
          </div>
        </div>
      </div>


      <!-- ZOOM OPTIONS -->
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
                    max="3"
                    :value="zoom.x"
                    @input="changeZoom($event.target.value)"
                    />
            <div style="overflow: auto" class="flex flex-row">
              <div class="flex flex-grow medium-small x-pad-1em">
                Zoom: {{getZoomForDisplay('x')}}
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
                    max="3"
                    :value="zoom.y"
                    @input="changeZoom($event.target.value, 'y')"
            />

            <div style="overflow: auto" class="flex flex-row">
              <div class="flex flex-grow medium-small x-pad-1em">
                Zoom: {{getZoomForDisplay('x')}} x {{getZoomForDisplay('y')}}
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
import Button from '../../../common/components/Button.vue'
import KeyboardShortcutParser from '../../../common/js/KeyboardShortcutParser';
import ShortcutButton from '../../../common/components/ShortcutButton';
import ComputeActionsMixin from '../../../common/mixins/ComputeActionsMixin';
import ExecAction from '../ui-libs/ExecAction';
import BrowserDetect from '../../../ext/conf/BrowserDetect';
import AspectRatioType from '../../../common/enums/AspectRatioType.enum';
import StretchType from '../../../common/enums/StretchType.enum';
import CropModePersistence from '../../../common/enums/CropModePersistence.enum';
import AlignmentOptionsControlComponent from './AlignmentOptionsControlComponent.vue';

export default {
  data() {
    return {
      exec: null,
      scope: 'page',
      CropModePersistence: CropModePersistence,
      StretchType: StretchType,
      AspectRatioType: AspectRatioType,
      zoomAspectRatioLocked: true,
      zoom: {
        x: 0,
        y: 0
      },
      editMode: true,
    }
  },
  mixins: [
    ComputeActionsMixin,
  ],
  props: [
    'settings',
    'frame',
    'cropModePersistence',
    'eventBus',
  ],
  created() {
    this.exec = new ExecAction(this.settings, window.location.hostname);
    // todo: replace event bus with postMessage
    // this.eventBus.subscribe('announce-zoom', {
    //   function: (config) => {
    //     this.zoom = {
    //       x: Math.log2(config.x),
    //       y: Math.log2(config.y)
    //     };
    //   }
    // });
    // this.eventBus.send('get-current-config');
  },
  components: {
    ShortcutButton,
    Button,
    AlignmentOptionsControlComponent
  },
  computed: {
    // because this is passed to a <select>, all the values must be
    // passed as strings.
    extensionDefaultCrop() {
      return JSON.stringify(
        this.settings?.active.crop?.default ?? {type: AspectRatioType.Automatic}
      );
    },
    siteDefaultCrop()  {
      // console.log('default crop for site:', JSON.parse(JSON.stringify(this.settings)), this.settings?.active.sites[window.location.hostname], this.settings?.active.sites[window.location.hostname].defaultCrop)
      return JSON.stringify(
        this.settings?.getDefaultCrop() ?? {type: AspectRatioType.Automatic}
      );
    },
    extensionDefaultStretchMode () {
      return JSON.stringify(
        this.settings?.active.stretch.default ?? {type: StretchType.NoStretch}
      );
    },
    siteDefaultStretchMode () {
      return JSON.stringify(
        this.settings?.getDefaultStretchMode() ?? {type: StretchType.NoStretch}
      );
    }
  },
  methods: {
    getZoomForDisplay(axis) {
      // zoom is internally handled logarithmically, because we want to
      // have x0.5, x1, x2, x4 ... magnifications spaced out at regular
      // intervals. When displaying, we need to conver that back to non-
      // logarithmic units.

      return `${ (Math.pow(2, this.zoom[axis]) * 100).toFixed()}%`;
    },
    async openOptionsPage() {
      BrowserDetect.runtime.openOptionsPage();
    },
    execAction(command) {
      const cmd = JSON.parse(JSON.stringify(command));
      window.parent.postMessage(cmd, '*');
      // this.eventBus?.send(command.action, command.arguments);
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
      // we store zoom logarithmically on this component
      this.zoom = {x: 0, y: 0};

      // we do not use logarithmic zoom elsewhere
      // todo: replace eventBus with postMessage to parent
      // this.eventBus.send('set-zoom', {zoom: 1, axis: 'y'});
      // this.eventBus.send('set-zoom', {zoom: 1, axis: 'x'});
    },
    changeZoom(newZoom, axis) {
      // we store zoom logarithmically on this compnent
      if (!axis) {
        this.zoom.x = newZoom;
      } else {
        this.zoom[axis] = newZoom;
      }

      // we do not use logarithmic zoom elsewhere, therefore we need to convert
      newZoom = Math.pow(2, newZoom);
    },

    /**
     * Sets default crop, for either site or global
     */
    setDefaultCrop($event, globalOrSite) {
      const commandArguments = JSON.parse($event.target.value);

      // todo: account for the fact that window.host doesnt work the way we want in an iframe
      // if (globalOrSite === 'site') {
      //   if (!this.settings.active.sites[window.location.hostname]) {
      //     this.settings.active.sites[window.location.hostname] = this.settings.getDefaultSiteConfiguration();
      //   }
      //   this.settings.active.sites[window.location.hostname].defaultCrop = commandArguments;
      // } else {
      //   // eventually, this 'if' will be safe to remove (and we'll be able to only
      //   // get away with the 'else' section) Maybe in 6 months or so.
      //   if (!this.settings.active.crop) {
      //     console.log('active settings crop not present. Well add');
      //     this.settings.active['crop'] = {
      //       default: commandArguments
      //     }
      //   } else {
      //     console.log('default crop settings are present:', JSON.parse(JSON.stringify(this.settings.active.crop)))
      //     this.settings.active.crop.default = commandArguments;
      //   }
      // }
      // this.settings.saveWithoutReload();
    },

    /**
     * Sets default stretching mode, for either site or global
     */
    setDefaultStretchingMode($event, globalOrSite) {
      const commandArguments = JSON.parse($event.target.value);

      if (globalOrSite === 'site') {
        if (!this.settings.active.sites[window.location.hostname]) {
          this.setting.active.sites[window.location.hostname] = this.settings.getDefaultSiteConfiguration();
        }
        this.setting.active.sites[window.location.hostname].defaultStretch = commandArguments;
      } else {
          this.settings.active.stretch.default = commandArguments;
      }
      this.settings.saveWithoutReload();
    }
  }
}
</script>

<style lang="scss" src="../../../res/css/flex.scss" scoped module></style>
<style lang="scss" src="../res-common/panels.scss" scoped module></style>
<style lang="scss" src="../res-common/common.scss" scoped module></style>

<style lang="scss" scoped module>
@import '../res-common/variables';

.options-bar {
  margin: 1rem;
  padding: 1rem;

  &.isEditing {
    background-color: $primary;
    color: #000;
  }
}
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
