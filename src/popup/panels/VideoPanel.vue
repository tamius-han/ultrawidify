<template>
  <div class="" style="padding-bottom: 20px">
    <div v-if="someSitesDisabledWarning" class="warning-lite">
      Some sites embedded on this page are disabled. Extension will not work on videos embedded from disabled sites.
    </div>
    <div v-if="aspectRatioActions.length">
      <div class="label">Cropping mode:</div>
      <div v-if="cropModePersistence && cropModePersistence > CropModePersistence.Disabled" class="info">
        Cropping mode will persist
         <template v-if="cropModePersistence === CropModePersistence.UntilPageReload">until page reload (this includes page navigation!).</template>
         <template v-if="cropModePersistence === CropModePersistence.CurrentSession">for current session.</template>
         <template v-if="cropModePersistence === CropModePersistence.Forever">forever (or at least until you change aspect ratio manually).</template>
        This can be changed in the 'site settings' or 'extension settings' tab.
      </div>
      <div class="flex flex-row flex-wrap">
        <ShortcutButton v-for="(action, index) of aspectRatioActions"
                        class="flex b3 flex-grow button"
                        :key="index"
                        :label="(action.scopes.page && action.scopes.page.label) ? action.scopes.page.label : action.label"
                        :shortcut="parseShortcut(action)"
                        @click.native="execAction(action)"
        >
        </ShortcutButton>
      </div>
      <div><small>You can change or add additional aspect ratios on <a href="#" @click="openOptionsPage()">the settings page</a> (in 'actions&shortcuts' menu).</small></div>
    </div>

    <div v-if="false"
         class="">
      <div class="label experimental">Zooming and panning</div>
      <div class="row"
      >
        <!--
          min, max and value need to be implemented in js as this slider
          should use logarithmic scale
        -->
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

        <div class="m-t-0-33em display-block">
          <input id="_input_zoom_site_allow_pan"
                  type="checkbox"
                  />
          Pan with mouse
        </div>
      </div>
    </div>

    <div v-if="stretchActions.length">
      <div class="label">Stretching mode:</div>
      <div class="flex flex-row flex-wrap">
        <ShortcutButton v-for="(action, index) of stretchActions"
                        class="flex b3 flex-grow button"
                        :key="index"
                        :label="(action.scopes.page && action.scopes.page.label) ? action.scopes.page.label : action.label"
                        :shortcut="parseShortcut(action)"
                        @click.native="execAction(action)"
                        >
        </ShortcutButton>
      </div>
    </div>
    
    <!-- <div v-if="keyboardActions.length">
      <div class="label">Keyboard shortcuts:</div>
      <div class="flex flex-row flex-wrap">
        <ShortcutButton v-for="(action, index) of keyboardActions"
                        class="flex b3 button"
                        :key="index"
                        :label="(action.scopes.page && action.scopes.page.label) ? action.scopes.page.label : action.label"
                        :shortcut="parseShortcut(action)"
                        @click.native="execAction(action)"
                        >
        </ShortcutButton>
      </div>
    </div> -->

    <div v-if="alignmentActions.length">
      <div class="label">Video alignment:</div>
      <div class="flex flex-row flex-wrap">
        <ShortcutButton v-for="(action, index) of alignmentActions"
                        class="flex b3 button"
                        :key="index"
                        :label="(action.scopes.page && action.scopes.page.label) ? action.scopes.page.label : action.label"
                        :shortcut="parseShortcut(action)"
                        @click.native="execAction(action)"
                        >
        </ShortcutButton>
      </div>
    </div>

    <div v-if="otherActions.length">
      <div class="label">Other actions:</div>
      <div class="flex flex-row flex-wrap">
        <ShortcutButton v-for="(action, index) of otherActions"
                        class="flex b3 button"
                        :key="index"
                        :label="(action.scopes.page && action.scopes.page.label) ? action.scopes.page.label : action.label"
                        :shortcut="parseShortcut(action)"
                        @click.native="execAction(action)"
                        >
        </ShortcutButton>
      </div>
    </div>

  </div>
</template>

<script>
import ExecAction from '../js/ExecAction';
import KeyboardShortcutParser from '../../common/js/KeyboardShortcutParser';
import ShortcutButton from '../../common/components/ShortcutButton';
import ComputeActionsMixin from '../../common/mixins/ComputeActionsMixin';
import CropModePersistence from '../../common/enums/CropModePersistence.enum';
import BrowserDetect from '../../ext/conf/BrowserDetect';

export default {
  data() {
    return {
      scope: 'page',
      CropModePersistence: CropModePersistence,
    }
  },
  mixins: [
    ComputeActionsMixin
  ],
  props: [
    'settings',
    'frame',
    'zoom',
    'someSitesDisabledWarning',
    'cropModePersistence',
  ],
  created() {
    this.exec = new ExecAction(this.settings);
  },
  components: {
    ShortcutButton,
  },
  computed: {
    logarithmicZoom: function(){
      return Math.log2(this.zoom);
    }
  },
  methods: {
    async openOptionsPage() {
      if (BrowserDetect.firefox) {
        browser.runtime.openOptionsPage();
      } else {
        chrome.runtime.openOptionsPage();
      }
    },
    execAction(action) {
      this.exec.exec(action, 'page', this.frame);
    },
    parseShortcut(action) {
      if (! action.scopes.page.shortcut) {
        return '';
      }
      return KeyboardShortcutParser.parseShortcut(action.scopes.page.shortcut[0]);
    },
    resetZoom() {
      this.zoom = 1;
    },
    changeZoom(nz) {
      nz = Math.pow(2, nz);
      this.$emit('zoom-change', nz);
      this.exec.exec(
        {cmd: [{action: 'set-zoom', arg: nz}]},
        'page',
        this.frame
      );
    }
  }
}
</script>

<style>
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
