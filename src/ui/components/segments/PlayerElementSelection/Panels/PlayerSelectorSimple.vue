<template>
  <div class="w-full flex flex-col" style="margin-top: 1rem;">
    <h2 class="text-[1.75em]">Simple video player picker</h2>
    <div class="text text-sm text-stone-500">
      <p>If your video is not aligned correctly, video player was not detected correctly.</p>
      <p>You need to help by selecting the video player. Hover over boxes below. This will highlight part of the screen.</p>
      <p>Select the first box that highlights the video player on the page.</p>
    </div>

    <!-- <div class="">
      <div class="flex flex-row gap-4">
        <button>How to use</button>
      </div>
    </div> -->

    <!-- PLAYER ELEMENT SELECTOR FOR DUMMIES -->
    <div class="flex flex-col-reverse gap-2">
      <div
        v-for="(element, index) of elementStack"
        :key="index"
        class="py-2 px-4 border border-stone-500 flex flex-col gap-2 text-sm cursor-pointer"
        :class="{
          '!border-blue-500': element.heuristics?.autoMatch,
          '!border-teal-800': element.heuristics?.manualElementByParentIndex,
          '!border-emerald-500': element.heuristics?.qsMatch,
          '!border-red-700 bg-red-950/50': element.heuristics?.invalidSize,
          '!border-primary-300': element.heuristics?.activePlayer,
          '!pointer-events-none opacity-50': element.tagName == 'video',
        }"

        @mouseover="markElement(elementStack.length - index - 1, true)"
        @mouseleave="markElement(elementStack.length - index - 1, false)"
        @click="setPlayer(element, elementStack.length - index - 1)"
      >
        <div
          v-if="element.heuristics?.autoMatch"
          class="text-primary-300 flex flex-row gap-2"
        >
          <mdicon name="check-circle" /> This element is currently treated as player element.
        </div>

        <div>
          <div class="tag">
            <b>&lt;{{element.tagName}}&gt;</b> <i class="text-red-800">{{element.id ? `#`:''}}{{element.id}}</i>  @ <span class="text-blue-500">{{element.width}}</span>x<span class="text-blue-500">{{element.height}}</span>
          </div>
          <div v-if="element.classList" class="text-nowrap overflow-hidden text-ellipsis text-stone-500/50">
            <span v-for="cls of element.classList" :key="cls">.{{cls}}&nbsp;</span>
          </div>
        </div>


        <div
          v-if="element.heuristics?.qsMatch"
          class="text-emerald-600 flex flex-row gap-2"
        >
          <mdicon name="crosshairs" /> This element matches query string (advanced settings)
        </div>
        <div
          v-if="element.heuristics?.manualElementByParentIndex"
          class="text-teal-800 flex flex-row gap-2"
        >
          <mdicon name="bookmark" /> This element has been manually selected as player element.
        </div>
        <div
          v-if="element.heuristics?.autoMatch"
          class="text-blue-500 flex flex-row gap-2"
        >
          <mdicon name="refresh-auto" /> Automatic detections thinks this is the player.
        </div>
        <div
          v-if="element.heuristics?.invalidSize"
          class="text-red-700 flex flex-row gap-2"
        >
          <mdicon name="alert-remove" /> This element has invalid dimensions
        </div>
      </div>

    </div>

  </div>
</template>

<script lang="ts">
import { PlayerDetectionMode } from '@src/common/enums/PlayerDetectionMode.enum';
import { SiteSupportLevel } from '@src/common/enums/SiteSupportLevel.enum';
import { SiteDOMSettingsInterface } from '@src/common/interfaces/SettingsInterface';
import { _cp } from '@src/common/utils/_cp';
import { defineComponent } from 'vue';

export default defineComponent({
  components: {

  },
  data() {
    return {
      elementStack: [],
      cssStack: [],
      showLegend: false,
      showAdvancedOptions: false,
      tutorialVisible: false,
      tutorialStep: 0
    };
  },
  computed: {
  },
  mixins: [],
  props: [
    'settings', // not used?
    'siteSettings',
    'eventBus',
  ],
  created() {
    this.eventBus.subscribe(
      'uw-config-broadcast',
      {
        source: this,
        function: (config) => this.handleElementStack(config)
      }
    );
  },
  mounted() {
    this.getPlayerTree();
  },
  destroyed() {
    this.eventBus.unsubscribeAll(this);
  },
  methods: {
    showTutorial() {
      this.tutorialVisible = true;
      this.tutorialStep = 0;
    },
    getPlayerTree() {
      this.eventBus.send('get-player-tree');
    },
    handleElementStack(configBroadcast) {
      if (configBroadcast.type === 'player-tree') {
        this.elementStack = configBroadcast.config.reverse();
        this.$nextTick( () => this.$forceUpdate() );
      }
    },
    markElement(parentIndex, enable) {
      this.eventBus.send('set-mark-element', {parentIndex, enable});
    },
    /**
     * Designates new element as player element. Currently, we only need
     * 'index', however at some point we might also set mode according
     * to element flags.
     */
    async setPlayer(element, index) {
      await this.siteSettings.ensureSettings();

      let domConfig: SiteDOMSettingsInterface = this.siteSettings.data.currentDOMConfig;
      let domConfigName = this.siteSettings.data.activeDOMConfig.startsWith('@') ? 'custom' : this.siteSettings.data.activeDOMConfig;

      switch (domConfig?.type) {
        case SiteSupportLevel.UserModified:
        case SiteSupportLevel.UserDefined:
          break;
        default:
          domConfig = _cp(domConfig ?? this.settings.sites['@empty'].DOMConfig['@empty']);
          domConfig.type = SiteSupportLevel.UserModified;
          break;
      }

      domConfig.elements.player.detectionMode = index !== undefined ? PlayerDetectionMode.AncestorIndex : PlayerDetectionMode.Auto;
      domConfig.elements.player.ancestorIndex = index;

      await this.siteSettings.setUpdateFlags(['PlayerData']);
      await this.siteSettings.set(`DOMConfig.${domConfigName}`, domConfig, {noSave: true});
      await this.siteSettings.set('activeDOMConfig', domConfigName);

      this.getPlayerTree();
    },
    /**
     * Toggles active CSS for element of certain parent index.
     * cssValue is optional and can be included in cssRule argument
     */
    toggleCssForElement(index, cssRule, cssValue) {
      // we will handle elements that put cssValue as a separate argument elsewhere
      if (cssValue) {
        return this.toggleCssForElement_3arg(index,cssRule, cssValue);
      }

      // this rule applies to current element — remove it!
      if (this.cssStack[index]?.includes(cssRule)) {
        this.cssStack[index] = this.cssStack[index].filter(x => ! x.includes(cssRule));
      } else {
        if (!this.cssStack[index]) {
          this.cssStack[index] = [];
        }
        this.cssStack[index].push(cssRule)
      }

      //TODO: update settings!
    },
    toggleCssForElement_3arg(index, cssRule, cssValue) {
      const matching = this.cssStack[index]?.find(x => x.includes(cssRule))
      if (matching) {
        this.cssStack[index] = this.cssStack[index].filter(x => ! x.includes(cssRule));
        if (!matching.includes(cssValue)) {
          this.cssStack[index].push(`${cssRule}: ${cssValue};`);
        }
      } else {
        if (!this.cssStack[index]) {
          this.cssStack[index] = [];
        }
        this.cssStack[index].push(`${cssRule}: ${cssValue};`);
      }

      //TODO: update settings!
    }
  }
});
</script>
