<template>
  <div>
    Custom zoom
  </div>

  <div class="top-label">Zoom:</div>
  <div class="input range-input">
    <input
      type="range"
      class="slider"
      min="0"
      max="3"
      step="0.01"
    />
    <input
    />
  </div>

  <template v-if="true">
    <div class="top-label">Vertical zoom:</div>
    <div class="input range-input">
      <input
        type="range"
        class="slider"
        min="0"
        max="3"
        step="0.01"
      />
      <input
      />
    </div>
  </template>

  <div><input type="checkbox"/> Control vertical and horizontal zoom independently.</div>
</template>

<script>

export default {
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
      }
    }
  },
  mixins: [

  ],
  props: [
    'settings',      // required for buttons and actions, which are global
    'eventBus'
  ],
  methods: {
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

      this.eventBus?.sendToTunnel('set-zoom', {zoom: 1, axis: 'y'});
      this.eventBus?.sendToTunnel('set-zoom', {zoom: 1, axis: 'x'});
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

      if (this.zoomAspectRatioLocked) {
        this.eventBus?.sendToTunnel('set-zoom', {zoom: newZoom, axis: 'y'});
        this.eventBus?.sendToTunnel('set-zoom', {zoom: newZoom, axis: 'x'});
      } else {
        this.eventBus?.sendToTunnel('set-zoom', {zoom: newZoom, axis: axis ?? 'x'});
      }
    },
  }
}

</script>

<style lang="scss" src="@csui/res/css/flex.scss" scoped></style>
<style lang="scss" src="@csui/src/res-common/panels.scss" scoped module></style>
<style lang="scss" src="@csui/src/res-common/common.scss" scoped module></style>
