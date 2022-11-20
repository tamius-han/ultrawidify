<template>
  <div class="flex flex-column">
    <!--
      min, max and value need to be implemented in js as this slider
      should use logarithmic scale
    -->
    <div class="flex flex-row flex-end">
      <Button
        v-if="zoomAspectRatioLocked"
        label="Unlock aspect ratio"
        icon="lock-open"
        :fixedWidth="true"
        @click="toggleZoomAr()"
      >
      </Button>
      <Button
        v-else
        label="Lock aspect ratio"
        icon="lock"
        :fixedWidth="true"
        @click="toggleZoomAr()"
      >
      </Button>
    </div>
    <template v-if="zoomAspectRatioLocked">
      <input id="_input_zoom_slider"
              class="input-slider"
              type="range"
              step="any"
              min="-1"
              max="3"
              :value="zoom.x"
              @input="changeZoom($event.target.value)"
              />
      <div style="overflow: auto" class="flex flex-row">
        <div class="flex flex-grow medium-small x-pad-1em">
          Zoom: {{getZoomForDisplay('x')}}
        </div>
        <div class="flex flex-nogrow flex-noshrink medium-small">
          <a class="_zoom_reset x-pad-1em" @click="resetZoom()">reset</a>
        </div>
      </div>
    </template>
    <template v-else>
      <div>Horizontal zoom</div>
      <input id="_input_zoom_slider"
              class="input-slider"
              type="range"
              step="any"
              min="-1"
              max="4"
              :value="zoom.x"
              @input="changeZoom($event.target.value, 'x')"
      />

      <div>Vertical zoom</div>
      <input id="_input_zoom_slider"
              class="input-slider"
              type="range"
              step="any"
              min="-1"
              max="3"
              :value="zoom.y"
              @input="changeZoom($event.target.value, 'y')"
      />

      <div style="overflow: auto" class="flex flex-row">
        <div class="flex flex-grow medium-small x-pad-1em">
          Zoom: {{getZoomForDisplay('x')}} x {{getZoomForDisplay('y')}}
        </div>
        <div class="flex flex-nogrow flex-noshrink medium-small">
          <a class="_zoom_reset x-pad-1em" @click="resetZoom()">reset</a>
        </div>
      </div>
    </template>
  </div>
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
    'settings',
    'frame',
    'eventBus',
    'site',
    'exec',
    'isEditing'
  ],
  methods: {
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

<style lang="scss" src="../../../../../res/css/flex.scss" scoped></style>
<style lang="scss" src="../../../res-common/panels.scss" scoped></style>
<style lang="scss" src="../../../res-common/common.scss" scoped></style>
