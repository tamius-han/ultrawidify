<template>
  <div class="flex flex-row" style="width: 250px;">
    <div class="flex-grow">
      Custom zoom
    </div>
    <div class="flex flex-row">
      <Button
        v-if="zoomAspectRatioLocked"
        icon="lock"
        :iconSize="16"
        :fixedWidth="true"
        :noPad="true"
        @click="toggleZoomAr()"
      >
      </Button>
      <Button
        v-else
        icon="lock-open-variant"
        :iconSize="16"
        :fixedWidth="true"
        :noPad="true"
        @click="toggleZoomAr()"
      >
      </Button>
      <Button
        icon="restore"
        :iconSize="16"
        :noPad="true"
        @click="resetZoom()"
      ></Button>
    </div>
  </div>

  <template v-if="zoomAspectRatioLocked">
    <div class="input range-input no-bg">
      <input
        type="range"
        class="slider"
        min="-1"
        max="3"
        step="0.01"
        :value="zoom.x"
        @input="changeZoom($event.target.value)"
      />
      <input
        class="disabled"
        style="width: 2rem;"
        :value="getZoomForDisplay('x')"
      />
    </div>

  </template>
  <template v-else>
    <div class="top-label">Horizontal zoom:</div>
    <div class="input range-input no-bg">
      <input
        type="range"
        class="slider"
        min="-1"
        max="3"
        step="0.01"
        :value="zoom.x"
        @input="changeZoom($event.target.value, 'x')"
      />
      <input
        class="disabled"
        style="width: 2rem;"
        :value="getZoomForDisplay('x')"
      />
    </div>
    <div class="top-label">Vertical zoom:</div>
    <div class="input range-input no-bg">
      <input
        type="range"
        class="slider"
        min="-1"
        max="3"
        step="0.01"
        :value="zoom.y"
        @input="changeZoom($event.target.value, 'y')"
      />
      <input
        class="disabled"
        style="width: 2rem;"
        :value="getZoomForDisplay('y')"
      />
    </div>
  </template>
</template>

<script>
import Button from '@csui/src/components/Button.vue';
import * as _ from 'lodash';

export default {
  components: {
    Button,

  },
  mixins: [

  ],
  props: [
    'settings',      // required for buttons and actions, which are global
    'eventBus'
  ],
  data() {
    return {
      zoomAspectRatioLocked: true,
      zoom: {
        x: 0,
        y: 0
      },

      // TODO: this should be mixin?
      resizerConfig: {
        crop: null,
        stretch: null,
        zoom: null,
        pan: null
      },
      pollingInterval: undefined,
      debouncedGetEffectiveZoom: undefined,
    }
  },
  created() {
    this.eventBus?.subscribeMulti(
      {
        'announce-zoom': {
          function: (data) => {
            this.zoom = {
              x: Math.log2(data.x),
              y: Math.log2(data.y)
            };
          }
        }
      },
      this
    );
    this.debouncedGetEffectiveZoom = _.debounce(
      () => {
        this.getEffectiveZoom();
      },
      250
    ),
    this.getEffectiveZoom();
    this.pollingInterval = setInterval(this.debouncedGetEffectiveZoom, 2000);
  },
  destroyed() {
    this.eventBus.unsubscribe(this);
    clearInterval(this.pollingInterval);
  },
  methods: {
    getEffectiveZoom() {
      this.eventBus?.sendToTunnel('get-effective-zoom', {});
    },
    getZoomForDisplay(axis) {
      // zoom is internally handled logarithmically, because we want to have x0.5, x1, x2, x4 ... magnifications
      // spaced out at regular intervals. When displaying, we need to convert that to non-logarithmic values.

      return `${(Math.pow(2, this.zoom[axis]) * 100).toFixed()}%`
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

      this.eventBus?.sendToTunnel('set-zoom', {zoom: 1});
    },
    changeZoom(newZoom, axis, isLinear) {
      if (isNaN(+newZoom)) {
        return;
      }

      let logZoom, linZoom;
      if (isLinear) {
        newZoom /= 100;
        logZoom = Math.log2(newZoom);
        linZoom = newZoom;
      } else {
        logZoom = newZoom;
        linZoom = Math.pow(2, newZoom);
      }

      // we store zoom logarithmically on this component
      if (!axis) {
        this.zoom.x = logZoom;
      } else {
        this.zoom[axis] = logZoom;
      }

      // we do not use logarithmic zoom elsewhere, therefore we need to convert

      if (this.zoomAspectRatioLocked) {
        this.eventBus?.sendToTunnel('set-zoom', {zoom: linZoom});
      } else {
        this.eventBus?.sendToTunnel('set-zoom', {zoom: {[axis ?? 'x']: linZoom}});
      }
    },
  }
}

</script>

<style lang="scss" src="@csui/res/css/flex.scss" scoped></style>
<style lang="scss" src="@csui/src/res-common/panels.scss" scoped module></style>
<style lang="scss" src="@csui/src/res-common/common.scss" scoped module></style>
