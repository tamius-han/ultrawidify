<template>
  <div class="flex flex-col w-full h-full">

    <!-- 'Change UI' options is a tiny bit in upper right corner. -->
    <h3>Crop</h3>
    <div class="button-container">
      <ShortcutButton
        v-for="(command, index) of settings?.active.commands.crop"
        :key="index"
        :classList="{
          'border !border-primary-700 text-primary-500 active-option': currentCropCommand === `${command.action}-${command.arguments.type}-${command.arguments.ratio ?? 'x'}`
        }"
        :label="command.label"
        :shortcut="getKeyboardShortcutLabel(command)"
        @click="execAction(command)"
      ></ShortcutButton>
    </div>

    <h3>Zoom</h3>
    <div class="button-container">
      <ShortcutButton
        v-for="(command, index) of settings?.active.commands.zoom"
        :key="index"
        :classList="{
          'border !border-primary-700 text-primary-500 active-option': currentCropCommand === `${command.action}-${command.arguments.type}-${command.arguments.ratio ?? 'x'}`
        }"
        :label="command.label"
        :shortcut="getKeyboardShortcutLabel(command)"
        @click="execAction(command)"
      ></ShortcutButton>
    </div>
    <div class="text-white font-mono text-semibold mt-4 mb-1">Free-form zoom</div>
    <div class="flex flex-row">

      <!-- SLIDERS BEFORE X/Y LOCK -->
      <div class="grow flex flex-col gap-[0.125em]">
        <div class="flex flex-row w-full items-center">
          <div class="w-[4em] opacity-75 text-right  leading-none">Width:</div>
          <div class="w-[4.5em] pr-4 text-right  leading-none">{{getZoomForDisplay('x')}}</div>
          <div class="grow leading-none pt-[0.25em]">
            <input id="_input_zoom_slider"
                class="w-full"
                type="range"
                step="any"
                min="-1"
                max="4"
                :value="zoom.x"
                @input="changeZoom($event.target.value, 'x')"
                @pointerdown="zoomUpdatesDisabled = true"
                @pointerup="zoomUpdatesDisabled = false"
                @pointercancel="zoomUpdatesDisabled = false"
                @pointerleave="zoomUpdatesDisabled = false"
            />
          </div>
        </div>
        <div class="flex flex-row w-full items-center">
          <div class="w-[4em] opacity-75  text-right  leading-none">Height:</div>
          <div class="w-[4.5em] pr-4 text-right  leading-none">{{getZoomForDisplay('y')}}</div>
          <div class="grow leading-none pt-[0.5em]">
            <input id="_input_zoom_slider_2"
                class="w-full"
                type="range"
                step="any"
                min="-1"
                max="4"
                :value="zoom.y"
                @input="changeZoom($event.target.value, 'y')"
                @pointerdown="zoomUpdatesDisabled = true"
                @pointerup="zoomUpdatesDisabled = false"
                @pointercancel="zoomUpdatesDisabled = false"
                @pointerleave="zoomUpdatesDisabled = false"
            />
          </div>
        </div>
      </div>

      <!-- X/Y LOCK -->
      <div class="h-full flex flex-col justify-center ml-2">
        <div
          class="h-[2.75em] mt-[0.125em] border-2 border-stone-500 border-l-transparent w-[0.5em]"
          :class="{'xy-lock-bar-break': !zoomOptions.lockAr}"
        ></div>
      </div>

      <div class="h-full flex flex-col justify-center p-2">
        <div
          class="cursor-pointer border-1 border-stone-800 p-2 hover:bg-stone-700 hover:text-white"
          @click="zoomOptions.lockAr = !zoomOptions.lockAr"
        >
          <mdicon v-if="zoomOptions.lockAr" name="link-variant" :size="16"></mdicon>
          <mdicon v-if="!zoomOptions.lockAr" name="link-variant-off" :size="16"></mdicon>
        </div>
      </div>

       <div class="h-full flex flex-col justify-center p-2">
        <div
          class="cursor-pointer border-1 border-stone-800 p-2 hover:bg-stone-700 hover:text-white"
          @click="resetZoom()"
        >
          <mdicon name="restore" :size="16"></mdicon>
        </div>
      </div>

    </div>

    <h3>Stretch</h3>
    <div class="button-container">
      <ShortcutButton
        v-for="(command, index) of settings?.active.commands.stretch"
        :key="index"
        :classList="{
          'border border-primary-700 text-primary-500 active-option': currentStretchCommand === `${command.action}-${command.arguments.type}-${command.arguments.ratio ?? 'x'}`
        }"
        :label="command.label"
        :shortcut="getKeyboardShortcutLabel(command)"
        @click="execAction(command)"
      ></ShortcutButton>
    </div>

    <h3>Align video</h3>
    <div
      id="videoAlignmentController"
      ref="alignmentSvgContainer"
      class="w-full h-[12em] flex flex-row justify-center"
    ></div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import BrowserDetect from '@src/ext/conf/BrowserDetect';

import ShortcutButton from './components/ShortcutButton.vue';
import CommsMixin from '@ui/utils/mixins/CommsMixin.vue';
import KeyboardShortcutParserMixin from '@ui/utils/mixins/KeyboardShortcutParserMixin.vue';

import alignmentIndicatorSvg from '!!raw-loader!@ui/res/img/alignment-indicators.svg';
import {setupVideoAlignmentIndicatorInteraction, setVideoAlignmentIndicatorState} from '@ui/utils/video-alignment-indicator-handling';
import VideoAlignmentType from '@src/common/enums/VideoAlignmentType.enum';
import { ScalingParamsBroadcast } from '@src/common/interfaces/ScalingParamsBroadcast.interface';
import { ArVariant } from '@src/common/interfaces/ArInterface';
import AspectRatioType from '@src/common/enums/AspectRatioType.enum';
import StretchType from '@src/common/enums/StretchType.enum';

export default defineComponent({
  components: {
    ShortcutButton
  },
  props: [
    'settings',      // required for buttons and actions, which are global
    'siteSettings',
    'frame',
    'eventBus',
    'site'
  ],
  mixins: [
    CommsMixin,
    KeyboardShortcutParserMixin,
  ],
  data() {
    return {
      zoom: {x: 0, y: 0}, // zoom is logarithmic, so "100%" is represented as 0 instead of 1.
      zoomOptions: {
        lockAr: true,
      },

      alignmentSvgContainer: undefined as HTMLElement | undefined,
      alignmentIndicatorSvg: undefined as SVGSVGElement | undefined,

      currentCropCommand: '',
      currentStretchCommand: '',
      zoomUpdatesDisabled: false,
    }
  },
  created() {
    this.eventBus.subscribeMulti({
      'broadcast-scaling-params': {
        function: (commandData: ScalingParamsBroadcast, context) => {
          this.markActiveElements(commandData);
        }
      }
    });

  },
  mounted() {
    this.alignmentSvgContainer = this.$refs.alignmentSvgContainer as HTMLElement;

    if (this.alignmentSvgContainer) {
      this.alignmentSvgContainer.innerHTML = alignmentIndicatorSvg;
      const svgElement = this.alignmentSvgContainer.querySelector('svg') as SVGSVGElement;
      this.alignmentIndicatorSvg = svgElement;

      if (svgElement) {
        setupVideoAlignmentIndicatorInteraction(svgElement, (x: VideoAlignmentType, y: VideoAlignmentType) => {
          // Update selection visually
          setVideoAlignmentIndicatorState(svgElement, x, y);

          this.align(x,y);
        });
      }
    }

    this.eventBus.send('get-ar');
    this.eventBus.send('request-scaling-params');
  },
  destroyed() {
    this.eventBus.unsubscribeAll(this);
  },
  methods: {
    async openOptionsPage() {
      BrowserDetect.runtime.openOptionsPage();
    },

    getZoomForDisplay(axis: 'x' | 'y') {
      // zoom is internally handled logarithmically, because we want to have x0.5, x1, x2, x4 ... magnifications
      // spaced out at regular intervals. When displaying, we need to convert that to non-logarithmic values.
      return `${(Math.pow(2, this.zoom[axis]) * 100).toFixed()}%`;
    },
    toggleZoomAr() {
      this.zoomOptions.lockAr = !this.zoomOptions.lockAr;
    },

    resetZoom() {
      // we store zoom logarithmically on this component
      this.zoom = {x: 0, y: 0};

      // we do not use logarithmic zoom elsewhere
      // todo: replace eventBus with postMessage to parent
      // this.eventBus.send('set-zoom', {zoom: 1, axis: 'y'});
      // this.eventBus.send('set-zoom', {zoom: 1, axis: 'x'});

      this.eventBus?.send('set-zoom', {zoom: 1});
    },
    changeZoom(logZoom: number, axis: 'x' | 'y') {
      // we do not use logarithmic zoom elsewhere, therefore we need to convert
      const linearZoom = Math.pow(2, logZoom);

      if (this.zoomOptions.lockAr) {
        this.zoom.x = logZoom;
        this.zoom.y = logZoom;
        this.eventBus?.send('set-zoom', {zoom: linearZoom});
      } else {
        this.zoom[axis] = logZoom;
        this.eventBus?.send('set-zoom', {zoom: {[axis]: linearZoom}});
      }
    },
    isActiveZoom(command) {
      return false;
    },
    align(alignmentX: VideoAlignmentType, alignmentY: VideoAlignmentType) {
      this.eventBus?.send('set-alignment', {x: alignmentX, y: alignmentY})
    },

    markActiveElements(scalingParams: ScalingParamsBroadcast) {
      if (this.zoomUpdatesDisabled) {
        return;
      }
      // we only set active options when manual zoom is NOT set
      if (!scalingParams.manualZoom) {
        const cropCommand = scalingParams.lastAr.variant === ArVariant.Zoom ? 'set-ar-zoom' : 'set-ar';

        let typeCrop;
        switch (scalingParams.lastAr.type) {
          case AspectRatioType.Automatic:
          case AspectRatioType.AutomaticUpdate:
            typeCrop = `${AspectRatioType.Automatic}-x`;
            break;
          case AspectRatioType.Cover:
          case AspectRatioType.FitWidth:
          case AspectRatioType.FitHeight:
            typeCrop = `${scalingParams.lastAr.type}-x`;
            break;
          case AspectRatioType.Cycle:
          case AspectRatioType.Initial:
            typeCrop = 'non-selectable';
            break;
          default:
            typeCrop = `${scalingParams.lastAr.type}-${scalingParams.lastAr.ratio ?? 'x'}`;
        }

        this.currentCropCommand = `${cropCommand}-${typeCrop}`;

        let typeStretch;
        switch (scalingParams.stretch.type) {
          case StretchType.FixedSource:
          case StretchType.Fixed:
            typeStretch = `${scalingParams.stretch.type}-${scalingParams.stretch.ratio ?? 'x'}`;
            break;
          case StretchType.Default:
          case StretchType.NoStretch:
            typeStretch = `non-selectable`;
            break;
          default:
            typeStretch = `${scalingParams.stretch.type}-x`;
        }

        this.currentStretchCommand = `set-stretch-${typeStretch}`;
      } else {
        this.currentCropCommand = '';
        this.currentStretchCommand = '';
      }

      if (!this.zoomUpdatesDisabled) {
        this.zoom = {
          x: Math.log2(scalingParams.effectiveZoom.x),
          y: Math.log2(scalingParams.effectiveZoom.y)
        };
      }

      this.zoomOptions.lockAr = scalingParams.effectiveZoom.x === scalingParams.effectiveZoom.y;

      if (this.alignmentIndicatorSvg) {
        setVideoAlignmentIndicatorState(this.alignmentIndicatorSvg, scalingParams.videoAlignment.x, scalingParams.videoAlignment.y);
      }
    }
  }
});
</script>
<style lang="postcss" scoped>
@import '@src/main.css';

.button-container {
  @apply w-full pt-2
    grid grid-cols-[repeat(auto-fill,minmax(9em,1fr))]
    gap-[0.5em];
}

.xy-lock-bar-break {
  @apply relative;

  &:before {
    @apply absolute box-content h-[1em] w-[3px] border-3  border-stone-950;

    content: '';
    top: 50%;
    left: 100%;
    transform: translate(-25%, -50%) rotate(45deg);
  }
}
</style>
