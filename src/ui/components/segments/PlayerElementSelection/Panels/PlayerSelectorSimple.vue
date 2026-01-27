<template>
  <div class="w-full flex flex-col" style="margin-top: 1rem;">

    <h2 class="text-[1.75em]">Simple video player picker</h2>

    <template v-if="tutorialStep">
      <div v-if="tutorialStep == 1" class="flex flex-col w-full justify-center items-center tutorial-step">
        <h3 class="mb-4">1. Start hovering over elements on this list</h3>
        <div class="flex flex-row w-full flex-wrap justify-center">
          <div class="bg-black/50 rounded flex flex-col justify-center items-center p-4">
            <div class="">
              <p>This list contains all the elements on the webpage that could be a video player.</p>
              <p>Icons to the left of the list indicate which element is currently selected as the player element, which element the extension thinks to be the player element, and which element should be the player according to manual settings.</p>
              <p>Move your mouse over the first element on the list, but do not click it.</p>
              <p>Hovering over elements on the list will highlight parts of the page.</p>
            </div>
            <img src="/res/img/player-select-demo/uw_player___element-list-hover.webp" class="w-1/2 min-w-[420px]" />
          </div>
        </div>
        <div class="p-4 flex flex-row w-full gap-2 item-center justify-center">
          <button @click="tutorialStep = 2">Next</button>
        </div>
      </div>

      <div v-if="tutorialStep == 2" class="flex flex-col w-full justify-center items-center tutorial-step">
        <h3 class="mb-4">2. Observe highlight</h3>

        <div class="grid grid-cols-2 gap-2 tutorial-list">
          <div class="bg-black/50 rounded flex flex-col justify-end items-center p-4">
            <div class="card-text">
              <p>Hovering over the elements will highlight part of the page. Highlighted area should cover the player area.</p>
              <p>If the highlighted area covers the player, click the item on the list to select it and reload the page.</p>
              <p>If more than one element covers the player area, select the first (topmost) one on the list.</p>
            </div>
            <img src="/res/img/player-select-demo/uw_player_select___just-right.webp" />

            <div class="icon text-teal-500">
              <mdicon name="check-circle" size="64"></mdicon>
            </div>
          </div>
          <div class="bg-black/50 rounded flex flex-col justify-end items-center p-4">
            <div class="card-text">
              <p>If highlight covers more than just the player area, that usually means the correct element is further down the list.</p>
              <p>Move the mouse cursor down the list of elements, until you encounter the first element that covers the player area.</p>
            </div>
            <img src="/res/img/player-select-demo/uw_player_select___too_much.webp" />
            <div class="icon text-red-700">
              <mdicon name="close-circle" size="64"></mdicon>
            </div>
          </div>
          <div class="bg-black/50 rounded flex flex-col justify-end items-center p-4">
            <div class="card-text">
              <p>If highlight doesn't cover the whole player area, that usually means the correct element is further down the list.</p>
              <p>Move your cursor up the list of elements, until you encounter something that highlights the entire player area.</p>
              <p>If more than one element covers the player area, select the first (topmost) one on the list.</p>
            </div>
            <img src="/res/img/player-select-demo/uw_player_select___too_little.webp" />
            <div class="icon text-red-700">
              <mdicon name="close-circle" size="64"></mdicon>
            </div>
          </div>
        </div>

        <div class="p-4 flex flex-row w-full gap-2 item-center justify-center">
          <button @click="tutorialStep = 1">Previous</button>
          <button @click="tutorialStep = 0">Done</button>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="text text-sm text-stone-500">
        <p>If your video is not aligned correctly, video player was not detected correctly.</p>
        <p>You need to help by selecting the video player. Hover over boxes below. This will highlight part of the screen.</p>
        <p>Select the first box that highlights the video player on the page.</p>

        <div class="flex flex-row justify-between">
          <a @click="tutorialStep = 1">Click here for more details.</a>
          <a @click="resetSettings()">Reset settings</a>
        </div>
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
          class="py-2 px-4 border border-stone-500 flex flex-col gap-2 text-sm cursor-pointer hover:bg-stone-800/50"
          :class="{
            '!border-blue-500 !hover:bg-blue-500/50': element.heuristics?.autoMatch,
            '!border-teal-800 !hover:bg-teal-800/50': element.heuristics?.manualElementByParentIndex,
            '!border-emerald-500 !hover:bg-emerald-500/50': element.heuristics?.qsMatch,
            '!border-red-700 !bg-red-950/50': element.heuristics?.invalidSize,
            '!border-primary-300 !hover:bg-primary-800/50': element.heuristics?.activePlayer,
            '!pointer-events-none opacity-50': ['html', 'body', 'video'].includes(element.tagName.toLowerCase()),
          }"

          @mouseover="markElement(element.index, true)"
          @mouseleave="markElement(element.index, false)"
          @click="setPlayer(element, element.index)"
        >
          <div
            v-if="element.heuristics?.activePlayer"
            class="text-primary-300 flex flex-row gap-2"
          >
            <mdicon name="check-circle" /> This element is currently treated as player element.
          </div>

          <div>
            <div class="tag">
              <span class="text-monospace w-16">[{{element.index}}]</span> <b>&lt;{{element.tagName}}&gt;</b> <i class="text-red-800">{{element.id ? `#`:''}}{{element.id}}</i>  @ <span class="text-blue-500">{{element.width}}</span>x<span class="text-blue-500">{{element.height}}</span>
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
            class="text-teal-600 flex flex-row gap-2"
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
    </template>
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
      elementStacks: {
        requestId: undefined,
        stacks: []
      },
      cssStack: [],
      showLegend: false,
      showAdvancedOptions: false,
      tutorialVisible: false,
      tutorialStep: 0,
      lastTreeId: undefined,
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
      this.lastTreeId = crypto.randomUUID()
      this.eventBus.send('get-player-tree', {requestId: this.lastTreeId});
    },
    handleElementStack(configBroadcast) {
      if (configBroadcast.type === 'player-tree') {
        // reset tree if lastTreeId has changed
        if (this.elementStacks.requestId !== this.lastTreeId) {
          this.elementStacks = {
            requestId: this.lastTreeId,
            stacks: []
          };
        }

        if (configBroadcast.requestId === this.lastTreeId) {
          const stack = configBroadcast.elementStack.sort((a, b) => a.index - b.index);
          this.elementStacks.stacks.push({
            elementStack: stack
          });
          this.elementStack = stack;

          this.$nextTick( () => this.$forceUpdate() );
        }
      }
    },
    markElement(parentIndex, enable) {
      this.eventBus.send('set-mark-element', {parentIndex, enable});
    },
    async resetSettings() {
      if (!this.siteSettings.raw?.activeDOMConfig) {
        console.warn('')
        return;
      }

      await this.siteSettings.setUpdateFlags(['PlayerData']);
      await this.siteSettings.set(`DOMConfig.${this.siteSettings.data.activeDOMConfig}.player.detectionMode`, PlayerDetectionMode.Auto, {noSave: true});
      await this.siteSettings.set(`DOMConfig.${this.siteSettings.data.activeDOMConfig}.player.ancestorIndex`, undefined);

      this.getPlayerTree();
      setTimeout( () => this.getPlayerTree(), 500);
      setTimeout( () => this.getPlayerTree(), 1000);
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
      setTimeout(() => this.getPlayerTree(), 500);
      setTimeout(() => this.getPlayerTree(), 1000);
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
