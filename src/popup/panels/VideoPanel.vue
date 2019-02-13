<template>
  <div class="w100">
    <div v-if="true" class="w100">
      <div class="label">Cropping mode:</div>
      <div class="flex flex-row flex-wrap">
        <template v-for="action of settings.active.actions">
          <ShortcutButton v-if="action.scopes.page && action.scopes.page.show && action.cmd.length === 1 && action.cmd[0].action === 'set-ar'"
                          class="flex b3 flex-grow button"
                          :label="(action.scopes.page && action.scopes.page.label) ? action.scopes.page.label : action.label"
                          :shortcut="parseShortcut(action)"
                          @click.native="execAction(action)"
                          >
          </ShortcutButton>
        </template>
      </div>
    </div>

    <div v-if="true" class="w100">
      <div class="label">Zooming and panning</div>
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

    <div v-if="true">
      <div class="label">Stretching mode:</div>
      <div class="flex flex-row flex-wrap">
        <template v-for="action of settings.active.actions">
          <ShortcutButton v-if="action.scopes.page && action.scopes.page.show && action.cmd.length === 1 && action.cmd[0].action === 'set-stretch'"
                          class="flex b3 flex-grow button"
                          :label="(action.scopes.page && action.scopes.page.label) ? action.scopes.page.label : action.label"
                          :shortcut="parseShortcut(action)"
                          @click.native="execAction(action)"
                          >
          </ShortcutButton>
        </template>
      </div>
    </div>

    <div v-if="true">
      <div class="label">Video alignment:</div>
      <div class="flex flex-row flex-wrap">
        <template v-for="action of settings.active.actions">
          <ShortcutButton v-if="action.scopes.page && action.scopes.page.show && action.cmd.length === 1 && action.cmd[0].action === 'set-alignment'"
                          class="flex b3 button"
                          :label="(action.scopes.page && action.scopes.page.label) ? action.scopes.page.label : action.label"
                          :shortcut="parseShortcut(action)"
                          @click.native="execAction(action)"
                          >
          </ShortcutButton>
        </template>
      </div>
    </div>

    <div v-if="true">
      <div class="label">Multi-command actions:</div>
      <div class="flex flex-row flex-wrap">
        <template v-for="action of settings.active.actions">
          <ShortcutButton v-if="action.scopes.page && action.scopes.page.show && action.cmd.length > 1"
                          class="flex b3 button"
                          :label="(action.scopes.page && action.scopes.page.label) ? action.scopes.page.label : action.label"
                          :shortcut="parseShortcut(action)"
                          @click.native="execAction(action)"
                          >
          </ShortcutButton>
        </template>
      </div>
    </div>

  </div>
</template>

<script>
import ExecAction from '../js/ExecAction'
import KeyboardShortcutParser from '../../common/js/KeyboardShortcutParser'
import ShortcutButton from '../../common/components/shortcut-button'

export default {
  data() {
    return {
    }
  },
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
