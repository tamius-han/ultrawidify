<template>
  <div class="uw-hover uv-hover-trigger-region">
    TEST CONTENT

    <div class="uw-debug-info flex flex-row">

      <!-- Player info -->
      <div class="">
        <h3>Player info</h3>
        <p>
          <b>Window size:</b><br/>
          {{windowWidth}} x {{windowHeight}}
        </p>
        <p>
          <b>Player dimensions</b><br/>
          {{debugData?.resizer?.playerData?.dimensions?.width ?? 'not detected'}} x {{debugData?.resizer?.playerData?.dimensions?.height ?? 'not detected'}}
        </p>
        <p>
          <b>Player id:</b> {{debugData?.resizer?.playerData?.elementId || '<no ID>'}}
        </p>
        <p>
          <b>Player classes:</b><br/>
          {{debugData?.resizer?.playerData?.classList || '<no classes>'}}
        </p>
        <p>
          <b>Is full screen?</b> {{debugData?.resizer?.playerData?.dimensions?.fullscreen ?? 'unknown'}}
        </p>
        
      </div>

      <!-- Stream info -->
      <div class="">
        <h3>Stream info</h3>
        <p>
          <b>Stream dimensions:</b> <small>(Native size of the video)</small><br/>
          {{debugData?.resizer?.videoRawData?.streamDimensions.x}} x {{debugData?.resizer?.videoRawData?.streamDimensions?.y}}
        </p>
        <p>
          <b>Stream displayed dimensions:</b> <small>(Video file is being upscaled to this size)</small><br/>
          {{debugData?.resizer?.videoRawData?.displayedSize?.x}} x {{debugData?.resizer?.videoRawData?.displayedSize?.y}}
        </p>
        <p>
          <b>Video element size:</b> <small>(Size of the html element)</small><br/>
          {{debugData?.resizer?.videoRawData?.displayedSize?.x}} x {{debugData?.resizer?.videoRawData?.displayedSize?.y}}
        </p>
        <p>
          <b>Size difference to player (raw):</b> <small>(positive numbers: video element is bigger than player element)</small><br/>
          x: {{debugData?.resizer?.sizeDifferenceToPlayer?.beforeZoom?.wdiff}}; &nbsp; &nbsp; y: {{debugData?.resizer?.sizeDifferenceToPlayer?.beforeZoom?.hdiff}}
        </p>
        <p>
          <b>Size difference to player (raw):</b> <small>(same as above, except after cropping, stretching, panning and zoom are applied)</small><br/>
          x: {{debugData?.resizer?.sizeDifferenceToPlayer?.afterZoom?.wdiff}}; &nbsp; &nbsp; y: {{debugData?.resizer?.sizeDifferenceToPlayer?.afterZoom?.hdiff}}
        </p>
      </div>

      <!-- Transform info -->
      <div class="">
        <h3>Transformations</h3>
        <p>
          <b>Alignment:</b> <small>(I agree that 'left' and 'right' are both evil, but that's not the kind of alignments we're thinking of)</small><br/>
          {{debugData?.resizer?.videoTranslation?.alignment || '<unknown>'}}
        </p>
        <p>
          <b>Translation</b><br/>
          x: {{debugData?.resizer?.videoTranslation?.x}}; &nbsp; &nbsp; y: {{debugData?.resizer?.videoTranslation?.y}}
        </p>
      </div>
    </div>
    <div class="uw-debug-info flex">
      <pre>
        {{debugDataPrettified}}
      </pre>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import Icon from '../common/components/Icon';

export default {
  components: {
    Icon,
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
  .uw-hover {
    position: absolute;
    top: 20%;
    left: 20%;
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
    width: 1200px;
    height: 600px;

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