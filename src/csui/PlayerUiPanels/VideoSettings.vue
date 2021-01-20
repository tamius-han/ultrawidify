<template>
  <div class="" style="padding-bottom: 20px">
    sample text<br/><br/>
    <br/>
    <h1>Crop video:</h1>

  </div>
</template>

<script>
import KeyboardShortcutParser from '../../common/js/KeyboardShortcutParser';
import ShortcutButton from '../../common/components/ShortcutButton';
import ComputeActionsMixin from '../../common/mixins/ComputeActionsMixin';
import CropModePersistence from '../../common/enums/crop-mode-persistence.enum';
import ExecAction from '../ui-libs/ExecAction';
import BrowserDetect from '../../ext/conf/BrowserDetect';

export default {
  data() {
    return {
      scope: 'page',
      CropModePersistence: CropModePersistence,
    }
  },
  mixins: [
    // ComputeActionsMixin
  ],
  props: [
    'settings',
    'frame',
    'zoom',
    'cropModePersistence',
  ],
  created() {
    // this.exec = new ExecAction(this.settings);
  },
  components: {
    // ShortcutButton,
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
      // this.exec.exec(action, 'page', this.frame);
    },
    parseShortcut(action) {
      // if (! action.scopes.page.shortcut) {
      //   return '';
      // }
      // return KeyboardShortcutParser.parseShortcut(action.scopes.page.shortcut[0]);
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
