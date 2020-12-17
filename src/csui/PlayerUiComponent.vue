<template>
  <div class="uw-hover uv-hover-trigger-region">
    TEST CONTENT
  </div>
  <div class="uw-debug-info">
    <ResizerDebugPanel :debugData="debugData">
    </ResizerDebugPanel>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import Icon from '../common/components/Icon';
import ResizerDebugPanel from './PlayerUiPanels/ResizerDebugPanelComponent';

export default {
  components: {
    Icon,
    ResizerDebugPanel
  },
  data() {
    return {
      uiVisible: true,
      debugData: {
        resizer: {},
        player: {},
      },
      debugDataPrettified: ''
    };
  },
  computed: {
    ...mapState([
      'showUi',
      'resizerDebugData',
      'playerDebugData'
    ]),
    windowWidth: () => {
      return window.innerWidth;
    },
    windowHeight: () => {
      return window.innerHeight;
    },
  },
  watch: {
    showUi(visible) {
      if (visible !== undefined) {
        this.uiVisible = visible;
      }
    },
    resizerDebugData(newData) {
      this.debugData.resizer = newData;
      this.debugDataPrettified = JSON.stringify(this.debugData, null, 2);
    },
    playerDebugData(newData) {
      this.debugData.player = newData;
      this.debugDataPrettified = JSON.stringify(this.debugData, null, 2);
    }
  },
  created() {
    console.log("created!");
    console.log("store:", this.$store, this);
  },
  methods: {
  }
}
</script>

<style lang="scss" src="../res/css/uwui-base.scss" scoped></style>
<style lang="scss" scoped>
@import '../res/css/uwui-base.scss';
@import '../res/css/colors.scss';
@import '../res/css/font/overpass.css';
@import '../res/css/font/overpass-mono.css';
@import '../res/css/common.scss';

.uw-ultrawidify-container-root {
  // .relative-wrapper {
  //   position: relative;
  //   width: 100%;
  //   height: 100%;
  // }

  .uw-hover {
    position: absolute;
    top: 10%;
    left: 10%;
    width: 100px;
    height: 100px;
    color: #fff;
    background-color: #000;

    z-index: 999999999999999999;
  }
  .uw-hover:hover {
    background-color: #f00;
  }

  .uw-debug-info {
    position: absolute;

    top: 10%;
    left: 10%;
    
    z-index: 999999999999999999;

    width: 2500px;
    height: 1200px;
    max-width: 80%;
    max-height: 80%;

    pointer-events: all !important;

    background-color: rgba(0,0,0,0.69);
    color: #fff;

    overflow-y: scroll;
  }

  pre {
    white-space: pre-wrap;
  }
}


</style>