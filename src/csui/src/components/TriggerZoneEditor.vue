<template>

  <!-- Preview + editor -->
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

  <!-- Sliders -->
  <div
    class="trigger-zone-editor-sliders-container"
  >
    <div class="panel uw-clickable">
      <div class="trigger-zone-editor-window">
        <div class="heading">
          <h2>Trigger zone editor</h2>
        </div>
        <div>
          <p>
            Trigger zone is represented by this very obvious gold grid. Ultrawidify menu button will only show when mouse enters the area marked by the grid.
          </p>
          <p>
            Note that interacting with the grid area is slightly broken. The distance dragged doesn't correspond with the amount of resizing. I don't plan on
            fixing that because the amount of effort required to get it working perfectly doesn't correspond with the amount of utility this part of the UI will
            see. Like, it works well enough and I want to enjoy some of my end-of-year PTO.
          </p>
          <p>
            Sliders work as they should.
          </p>
        </div>
        <div class="field">
          <div class="label">Trigger zone width:</div>
          <div class="input range-input">
            <input
              :value="settings.active.ui.inPlayer.triggerZoneDimensions.width"
              class="slider"
              type="range"
              min="0.1"
              max="1"
              step="0.01"
              @input="(event) => setValue('width', event.target.value)"
              @change="(event) => updateSettings(true)"
            >
            <input
              :value="ghettoComputed.width"
              @input="(event) => setValue('width', event.target.value, true)"
              @change="(event) => updateSettings(true)"
            >
          </div>
          <div class="hint">
            Width of the trigger zone (% of player area).
          </div>
        </div>
        <div class="field">
          <div class="label">Trigger zone height:</div>
          <div class="input range-input">
            <input
              :value="settings.active.ui.inPlayer.triggerZoneDimensions.height"
              type="range"
              min="0.1"
              max="1"
              step="0.01"
              @input="(event) => setValue('height', event.target.value)"
              @change="(event) => updateSettings(true)"
            >
            <input
              :value="ghettoComputed.height"
              @input="(event) => setValue('height', event.target.value, true)"
              @change="(event) => updateSettings(true)"
            >
          </div>
          <div class="hint">
            Height of the trigger zone (% of player area).
          </div>
        </div>
        <div class="field">
          <div class="label">Trigger zone horizontal offset:</div>
          <div class="input range-input">
            <input
              v-model="settings.active.ui.inPlayer.triggerZoneDimensions.offsetX"
              type="range"
              min="-100"
              max="100"
              @input="(event) => setValue('offsetX', event.target.value)"
              @change="(event) => updateSettings(true)"
            >
            <input
              :value="settings.active.ui.inPlayer.triggerZoneDimensions.offsetX"
              @input="(event) => setValue('offsetX', event.target.value)"
              @change="(event) => updateSettings(true)"
            >
          </div>
          <div class="hint">
            By default, trigger zone is centered around the button. This option moves trigger zone left and right.
          </div>
        </div>
        <div class="field">
          <div class="label">Trigger zone vertical offset:</div>
          <div class="input range-input">
            <input
              v-model="settings.active.ui.inPlayer.triggerZoneDimensions.offsetY"
              type="range"
              min="-100"
              max="100"
              @input="(event) => setValue('offsetY', event.target.value)"
              @change="(event) => updateSettings(true)"
            >
            <input
              :value="settings.active.ui.inPlayer.triggerZoneDimensions.offsetY"
              @input="(event) => setValue('offsetY', event.target.value)"
              @change="(event) => updateSettings(true)"
            >
          </div>
          <div class="hint">
            By default, trigger zone is centered around the button. This option moves trigger zone up and down.
          </div>
        </div>

        <div class="action-row">
          <button @click="finishTriggerZoneEdit">Finish editing</button>
        </div>
      </div>
    </div>
  </div>
</template>
<script>

export default {
  props: [
    'settings',
    'eventBus',
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
      ghettoComputed: { }
    }
  },
  created() {
    document.addEventListener("mouseup", this.handleMouseUp);
    document.addEventListener("mousemove", this.handleMouseMove);
    this.ghettoComputed = {
      width: this.optionalToFixed(this.settings.active.ui.inPlayer.triggerZoneDimensions.width * 100, 0),
      height: this.optionalToFixed(this.settings.active.ui.inPlayer.triggerZoneDimensions.height * 100, 0)
    };
    this.updateTriggerZones(false);
  },
  methods: {
    optionalToFixed(v, n) {
      try {
        if ((`${v}`.split('.')[1]?.length ?? 0) > n) {
          return v.toFixed(n);
        }
      } catch (e) {

      }
      return v;
    },
    updateTriggerZones(forceRefresh = true) {
      if (this.playerDimensions && this.settings?.active?.ui?.inPlayer?.triggerZoneDimensions) {
        this.triggerZoneStyles = {
          width: `${Math.round(this.playerDimensions.width * this.settings.active.ui.inPlayer.triggerZoneDimensions.width)}px`,
          height: `${Math.round(this.playerDimensions.height * this.settings.active.ui.inPlayer.triggerZoneDimensions.height)}px`,
          transform: `translate(${(this.settings.active.ui.inPlayer.triggerZoneDimensions.offsetX)}%, ${this.settings.active.ui.inPlayer.triggerZoneDimensions.offsetY}%)`,
        };
      }
      // if (forceRefresh) {
      //   this.$forceUpdate();
      // }
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
      const cw = Math.min(1, Math.max(0.125, nw));
      const ch = Math.min(1, Math.max(0.125, nh));

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
    },

    //#region slider window
    forceNumber(value) {
      //       Change EU format to US if needed
      //                  |       remove everything after second period if necessary
      //                  |               |            |   remove non-numeric characters
      //                  |               |            |           |
      return value.replaceAll(',', '.').split('.', 2).join('.').replace(/[^0-9.\-]/g, '');
    },
    setValue(key, originalValue, isTextInput) {
      let value = originalValue;
      if (isTextInput) {
        value = (+this.forceNumber(value) / 100);
      } else {
        value = +this.forceNumber(value);
      }

      if (isNaN(+value)) {
        value = 0.5;
      }

      this.settings.active.ui.inPlayer.triggerZoneDimensions[key] = value;
      if (isTextInput) {
        this.ghettoComputed[key] = this.optionalToFixed(originalValue, 0);
      } else {
        this.ghettoComputed[key] = this.optionalToFixed(originalValue * 100, 0);
      }
      this.updateSettings();
    },

    updateSettings(forceRefresh) {
      this.settings.saveWithoutReload();
      this.updateTriggerZones();

      if (forceRefresh) {
        this.$nextTick( () => this.$forceUpdate() );
      }
    },

    //#endregion
    finishTriggerZoneEdit() {
      this.eventBus.send('finish-trigger-zone-edit');
    },

  }
}

</script>

<style lang="scss" src="@csui/src/res-common/panels.scss" scoped module></style>
<style lang="scss" src="@csui/src/res-common/common.scss" scoped module></style>
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

.trigger-zone-editor-window {
  max-width: 69rem;
}

.trigger-zone-editor-sliders-container {
  position: fixed;
  width: 100dvw;
  height: 100dvh;
  top: 0;
  left: 0;
  z-index: 2000;

  pointer-events: none;

  display: flex;
  align-items: center;
  justify-content: center;

  .panel {
    backdrop-filter: blur(0.5rem) brightness(0.5);
    color: #ccc;
    pointer-events: all;

    padding: 1rem;
  }

  .range-input {
    display: flex;
    flex-direction: row;

    * {
      margin-left: 0.5rem;
      margin-right: 0.5rem;
    }


    input {
      max-width: 5rem;
    }

    input[type=range] {
      max-width: none;
    }
  }
  .trigger-zone-editor {
    padding-bottom: 2rem;

    .field {
      margin-bottom: -1em;
    }
  }
}

.range-input {
  display: flex;
  flex-direction: row;

  * {
    margin-left: 0.5rem;
    margin-right: 0.5rem;
  }

  input {
    max-width: 5rem;
  }

  input[type=range] {
    max-width: none;
  }
}

.action-row {
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
}
</style>
