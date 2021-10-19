<template>
  <div class="flex flex-row flex-wrap" style="padding-bottom: 20px">
    <div class="sub-panel">
      <h1>Crop video:</h1>
      <div class="sub-panel-content flex flex-row flex-wrap">
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
    <div class="sub-panel">
      <h1>Stretch video:</h1>
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
    <div class="sub-panel">
      <h1>Manual zoom:</h1>
      <div class="flex flex-row flex-wrap">

      </div>
    </div>
    <div class="sub-panel">
      <h1>Video alignment:</h1>
      <div class="flex flex-row flex-wrap">

      </div>
    </div>
  </div>
</template>

<script>
import KeyboardShortcutParser from '../../common/js/KeyboardShortcutParser';
import ShortcutButton from '../../common/components/ShortcutButton';
import ComputeActionsMixin from '../../common/mixins/ComputeActionsMixin';
import ExecAction from '../ui-libs/ExecAction';
import BrowserDetect from '../../ext/conf/BrowserDetect';
import AspectRatioType from '../../common/enums/AspectRatioType.enum';
import CropModePersistence from '../../common/enums/CropModePersistence.enum';

export default {
  data() {
    return {
      exec: null,
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
    'cropModePersistence',
  ],
  created() {
    this.exec = new ExecAction(this.settings, window.location.hostname, window.ultrawidify);
  },
  components: {
    ShortcutButton,
  },
  computed: {
    // logarithmicZoom: function(){
    //   return Math.log2(this.zoom);
    // }
  },
  methods: {
    async openOptionsPage() {
      BrowserDetect.runtime.openOptionsPage();
    },
    execAction(action) {
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
    resetZoom() {
      this.zoom = 1;
    },
    changeZoom(nz) {
      nz = Math.pow(2, nz);
      this.$emit('zoom-change', nz);
      // this.exec.exec(
      //   {cmd: [{action: 'set-zoom', arg: nz}]},
      //   'page',
      //   this.frame
      // );
    },
  }
}
</script>

<style lang="scss" src="../../res/css/flex.scss" scoped></style>
<style lang="scss" src="../res-common/panels.scss"></style>
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
