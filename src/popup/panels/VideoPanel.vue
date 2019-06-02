<template>
  <div class="w100" style="padding-bottom: 20px">
    <div v-if="aspectRatioActions.length"
         class="w100"
    >
      <div class="label">Cropping mode:</div>
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
    </div>

    <div v-if="true"
         class="w100">
      <div class="label experimental">Zooming and panning</div>
      <div class="row w100"
      >
        <!--
          min, max and value need to be implemented in js as this slider 
          should use logarithmic scale
        -->
        <input id="_input_zoom_slider" 
                class="w100"
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

        <div class="m-t-0-33em w100 display-block">
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

export default {
  data() {
    return {
      scope: 'page',
    }
  },
  mixins: [
    ComputeActionsMixin
  ],
  props: [
    'settings',
    'frame',
    'zoom'
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
</style>
