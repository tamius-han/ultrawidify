<template>
  <div
    v-if="settings?.active?.ui"
    class="active-trigger-area uw-clickable"
    :style="triggerZoneStyles"
  >
    <div class="trigger-zone-editor"
      @mousedown="(event) => handleMouseDown('offset', event)"
    >
      <div
        class="uw-clickable corner tl"
        @mousedown.stop="(event) => handleMouseDown('tl', event)"
      >
      </div>
      <div
        class="uw-clickable corner tr"
        @mousedown.stop="(event) => handleMouseDown('tr', event)"
      >
      </div>
      <div
        class="uw-clickable corner bl"
        @mousedown.stop="(event) => handleMouseDown('bl', event)"
      >
      </div>
      <div
        class="uw-clickable corner br"
        @mousedown.stop="(event) => handleMouseDown('br', event)"
      >
      </div>
    </div>
  </div>
</template>
<script>

export default {
  props: [
    'settings',
    'playerDimensions',
  ],
  watch: {
    playerDimensions(newVal, oldVal) {
      this.updateTriggerZones();
    }
  },
  data() {
    return {
      triggerZoneStyles: {},
      activeCornerDrag: undefined,
      dragStartPosition: undefined,
      dragStartConfiguration: undefined,
    }
  },
  created() {
    document.addEventListener("mouseup", this.handleMouseUp);
    document.addEventListener("mousemove", this.handleMouseMove);
    this.updateTriggerZones();
  },
  methods: {
    updateTriggerZones() {
      if (this.playerDimensions && this.settings?.active?.ui?.inPlayer?.triggerZoneDimensions) {
        this.triggerZoneStyles = {
          width: `${Math.round(this.playerDimensions.width * this.settings.active.ui.inPlayer.triggerZoneDimensions.width)}px`,
          height: `${Math.round(this.playerDimensions.height * this.settings.active.ui.inPlayer.triggerZoneDimensions.height)}px`,
          transform: `translate(${(this.settings.active.ui.inPlayer.triggerZoneDimensions.offsetX)}%, ${this.settings.active.ui.inPlayer.triggerZoneDimensions.offsetY}%)`,
        };
      }
    },
    handleMouseDown(corner, event) {
      this.activeCornerDrag = corner;

      // we need to save this because we don't know the location of the player element,
      // just its dimensions ... that means we need to
      this.dragStartPosition = {
        x: event.clientX,
        y: event.clientY
      };
      this.dragStartConfiguration = JSON.parse(JSON.stringify(this.settings.active.ui.inPlayer.triggerZoneDimensions));

      console.log(`Mousedown on ${corner}`);
    },
    handleMouseUp(event) {
      if (!this.activeCornerDrag) {
        return;
      }
      this.activeCornerDrag = undefined;
      this.settings.saveWithoutReload();
    },
    handleMouseMove(event) {
      if (!this.activeCornerDrag) {
        return;
      }

      if (this.activeCornerDrag === 'offset') {
        this.handleMove(event);
      } else {
        this.handleResize(event);
      }


      this.updateTriggerZones();
    },
    handleResize(event) {
       // drag distance in px
      const dx = event.clientX - this.dragStartPosition.x;
      const dy = event.clientY - this.dragStartPosition.y;

      // convert drag distance to % of current width:
      const dxr = dx / this.playerDimensions.width * 2;
      const dyr = dy / this.playerDimensions.height * 2;

      // // update settings:
      let nw, nh;
      switch (this.activeCornerDrag) {
        case 'tl':
          nw = this.dragStartConfiguration.width - dxr;
          nh = this.dragStartConfiguration.height - dyr;
          break;
        case 'tr':
          nw = this.dragStartConfiguration.width + dxr;
          nh = this.dragStartConfiguration.height - dyr;
          break;
        case 'bl':
          nw = this.dragStartConfiguration.width - dxr;
          nh = this.dragStartConfiguration.height + dyr;
          break;
        case 'br':
          nw = this.dragStartConfiguration.width + dxr;
          nh = this.dragStartConfiguration.height + dyr;
          break;
      }

      // ensure everything is properly limited
      const cw = Math.min(0.95, Math.max(0.125, nw));
      const ch = Math.min(0.95, Math.max(0.125, nh));

      // // update properties
      this.settings.active.ui.inPlayer.triggerZoneDimensions.width = cw;
      this.settings.active.ui.inPlayer.triggerZoneDimensions.height = ch;
    },
    handleMove(event) {
      const dx = event.clientX - this.dragStartPosition.x;
      const dy = event.clientY - this.dragStartPosition.y;

      // convert drag distance to % of current width:
      const dxr = dx / this.playerDimensions.width;
      const dyr = dy / this.playerDimensions.height;

      // const [min, max] = this.settings.active.ui.inPlayer.popupAlignment === 'right' ? [5, 90] : [-90, -5];
      // const [minCrossAxis, maxCrossAxis] = [-90, 90];
      const min = -90;
      const max = -5;
      const minCrossAxis = -90;
      const maxCrossAxis = 90;

      const cx = Math.min(max, Math.max(min, this.settings.active.ui.inPlayer.triggerZoneDimensions.offsetX + dxr));
      const cy = Math.min(maxCrossAxis, Math.max(minCrossAxis, this.settings.active.ui.inPlayer.triggerZoneDimensions.offsetY + dyr));

      this.settings.active.ui.inPlayer.triggerZoneDimensions.offsetX = cx;
      this.settings.active.ui.inPlayer.triggerZoneDimensions.offsetY = cy;
    }
  }
}

</script>
<style lang="scss" scoped>
.active-trigger-area {
  background-image: url('/res/img/grid_512.webp');
  background-position: center;
  background-attachment: fixed;
}

.trigger-zone-editor {
  width: 100%;
  height: 100%;
  position: relative;

  > .corner {
    position: absolute;
    width: 32px;
    height: 32px;
    background-color: #000;
    background-image: url('/res/img/corner-marker_64.webp');
    background-size: cover;

  }
  .tr, .tl {
    top: 0;
  }
  .br, .bl {
    bottom: 0;
  }
  .tl, .bl {
    left: 0;
  }
  .tr, .br {
    right: 0;
  }
  .br {
    transform: rotate(90deg);
  }
  .bl {
    transform: rotate(180deg);
  }
  .tl {
    transform: rotate(-90deg);
  }
}

</style>
