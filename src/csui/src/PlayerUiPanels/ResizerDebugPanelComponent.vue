<template>
  <div class="panel-root">
    <h1>Resizer debug data</h1>
    <div class="flex flex-row flex-wrap">
      <div class="panel">
        <h3 class="panel-title">
          Player info
        </h3>
        <div class="data-item">
          <div class="data-title">Window size:
            <small>(Inner size)</small>
          </div>
          <div class="data">{{windowWidth}} x {{windowHeight}}</div>
          <div class="button" @click="refreshWindowSize()">
            <!-- <Icon icon="arrow-clockwise"></Icon> -->
            Refresh</div>
        </div>
        <div class="data-item">
          <div class="data-title">Player dimensions:</div>
          <div class="data">{{debugData?.resizer?.playerData?.dimensions?.width ?? 'not detected'}} x {{debugData?.resizer?.playerData?.dimensions?.height ?? 'not detected'}}</div>
        </div>
        <div class="data-item">
          <div class="data-title">Is fullscreen?</div>
          <div class="data">{{debugData?.resizer?.playerData?.dimensions?.fullscreen ?? 'unknown'}}</div>
        </div>
        <div class="data-item">
          <div class="data-title">Player id | classlist</div>
          <div class="data">{{debugData?.resizer?.playerData?.elementId || '<no ID>'}} | {{debugData?.resizer?.playerData?.classList || '<no classes>'}}</div>
        </div>
      </div>

        <!-- Stream info -->
      <div class="panel">
        <h3 class="panel-title">
          Stream info
        </h3>
        <div class="data-item">
          <div class="data-title">
            Stream dimensions: <small>(Native size of the video)</small>
          </div>
          <div class="data">
            {{debugData?.resizer?.videoRawData?.streamDimensions.x}} x {{debugData?.resizer?.videoRawData?.streamDimensions?.y}}
          </div>
        </div>
        <div class="data-item">
          <div class="data-title">
            Stream displayed dimensions: <small>(Video file is being upscaled to this size)</small>
          </div>
          <div class="data">
            {{debugData?.resizer?.videoRawData?.displayedSize?.x.toFixed()}} x {{debugData?.resizer?.videoRawData?.displayedSize?.y.toFixed()}}
          </div>
        </div>
        <div class="data-item">
          <div class="data-title">Video element native size: <small>(Size of the html element. Should be same as above most of the time!)</small></div>
          <div class="data">{{debugData?.resizer?.videoRawData?.displayedSize?.x.toFixed(1)}} x {{debugData?.resizer?.videoRawData?.displayedSize?.y.toFixed(1)}}</div>
        </div>
        <div class="data-item">
          <div class="data-title">Size difference to player (raw): <small>(positive numbers: video element is bigger than player element)</small></div>
          <div class="data">x: {{debugData?.resizer?.sizeDifferenceToPlayer?.beforeZoom?.wdiff.toFixed(1)}}; &nbsp; &nbsp; y: {{debugData?.resizer?.sizeDifferenceToPlayer?.beforeZoom?.hdiff.toFixed(1)}}</div>
        </div>
        <div class="data-item">
          <div class="data-title">Video element size (post zoom): <small>(Size of the html element after transform:scale is applied. Or at least, that's what Resizer::computeOffsets() thinks the final size is.)</small></div>
          <div class="data">{{debugData?.resizer?.transformedSize?.x.toFixed(2)}} x {{debugData?.resizer?.transformedSize?.y.toFixed(2)}}</div>
        </div>
        <div class="data-item">
          <div class="data-title"><b>Size difference to player (post-zoom):</b> <small>(same as above, except after cropping, stretching, panning and zoom are applied)</small></div>
          <div class="data">x: {{debugData?.resizer?.sizeDifferenceToPlayer?.afterZoom?.wdiff.toFixed(2)}}; &nbsp; &nbsp; y: {{debugData?.resizer?.sizeDifferenceToPlayer?.afterZoom?.hdiff.toFixed(2)}}</div>
        </div>
      </div>

      <!-- Transform info -->
      <div class="panel">
        <h3 class="panel-title">
          Transformations
        </h3>
        <div class="data-item">
          <div class="data-title">Alignment: <small>(I agree that 'left' and 'right' are both evil, but that's not the kind of alignments we're thinking of)</small></div>
          <div class="data">{{debugData?.resizer?.videoTransform?.alignment || '<unknown>'}}</div>
        </div>
        <div class="data-item">
          <div class="data-title">Scale factor</div>
          <div class="data">x: {{debugData?.resizer?.videoTransform?.scale.x.toFixed(2)}}; &nbsp; &nbsp; y: {{debugData?.resizer?.videoTransform?.scale.y.toFixed(2)}}</div>
        </div>
        <div class="data-item">
          <div class="data-title">Translation</div>
          <div class="data">x: {{debugData?.resizer?.videoTransform?.translate.x.toFixed(2)}}; &nbsp; &nbsp; y: {{debugData?.resizer?.videoTransform?.translate.y.toFixed(2)}}</div>
        </div>
      </div>
    </div>
      <!-- <div class="uw-debug-info flex"> -->
        <!-- <pre> -->
          <!-- {{debugDataPrettified}} -->
        <!-- </pre> -->
      <!-- </div> -->
  </div>
</template>

<script>
// import Icon from '../../common/components/Icon';

export default {
  components: {
    // Icon,
  },
  props: {
    debugData: Object
  },
  data() {
    return {
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight
    };
  },
  methods: {
    refreshWindowSize() {
      this.windowWidth = window.innerWidth;
      this.windowHeight = window.innerHeight;
    },
  }
}
</script>

<style lang="scss" scoped>
@import '../../../res/css/uwui-base.scss';
@import '../../../res/css/colors.scss';
@import '../../../res/css/font/overpass.css';
@import '../../../res/css/font/overpass-mono.css';
@import '../../../res/css/common.scss';

.panel-root {
  display: block;
  padding: 16px;
}

.panel {
  display: inline-block;
  width: 420px;
  max-width: 100%;
  padding: 12px 6px;
}

.data-item {
  display: block;
  margin-bottom: 0.69rem;
}

.data-title {

  small {
    display: block;
    opacity: 0.69;
  }
}
.data {
  color: $primary-color;
  }
</style>
