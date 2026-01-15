<template>
  <div class="flex flex-col w-full">
    <div class="flex flex-row">
      <h1>Video player options</h1>
    </div>
    <div class="w-full">
      <div v-if="tutorialVisible" class="w-full">
        <button
          class="info-button"
          @click="tutorialVisible = false"
        >
          <mdicon name="arrow-left"></mdicon>
          Back
        </button>

        <div v-if="tutorialStep == 0" class="flex flex-col w-full justify-center items-center tutorial-step">
          <h3>1. Start hovering over elements on this list</h3>
          <div class="flex flex-row w-full flex-wrap tutorial-list">
            <div class="card">
              <div class="card-text">
                <p>This list contains all the elements on the webpage that could be a video player.</p>
                <p>Icons to the left of the list indicate which element is currently selected as the player element, which element the extension thinks to be the player element, and which element should be the player according to manual settings.</p>
              </div>
              <img src="/res/img/player-select-demo/uw_player___element-list-1.webp" />
            </div>
            <div class="card">
              <div class="card-text">
                <p>Move your mouse over the first element on the list, but do not click it.</p>
                <p>Hovering over elements on the list will highlight parts of the page.</p>
              </div>
              <img src="/res/img/player-select-demo/uw_player___element-list-hover.webp" />
            </div>
          </div>
          <button @click="tutorialStep = 1">Next</button>
        </div>

        <div v-if="tutorialStep == 1" class="flex flex-col w-full justify-center items-center tutorial-step">
          <h3>2. Observe highlight</h3>

          <div class="flex flex-row w-full flex-wrap tutorial-list">
            <div class="card">
              <div class="card-text">
                <p>Hovering over the elements will highlight part of the page. Highlighted area should cover the player area.</p>
                <p>If the highlighted area covers the player, click the item on the list to select it and reload the page.</p>
                <p>If more than one element covers the player area, select the first (topmost) one on the list.</p>
              </div>
              <img src="/res/img/player-select-demo/uw_player_select___just-right.webp" />

              <div class="icon correct">
                <mdicon name="check-circle" size="96"></mdicon>
              </div>
            </div>
            <div class="card">
              <div class="card-text">
                <p>If highlight covers more than just the player area, that usually means the correct element is further down the list.</p>
                <p>Move the mouse cursor down the list of elements, until you encounter the first element that covers the player area.</p>
              </div>
              <img src="/res/img/player-select-demo/uw_player_select___too_much.webp" />
              <div class="icon wrong">
                <mdicon name="close-circle" size="96"></mdicon>
              </div>
            </div>
            <div class="card">
              <div class="card-text">
                <p>If highlight doesn't cover the whole player area, that usually means the correct element is further down the list.</p>
                <p>Move your cursor up the list of elements, until you encounter something that highlights the entire player area.</p>
                <p>If more than one element covers the player area, select the first (topmost) one on the list.</p>
              </div>
              <img src="/res/img/player-select-demo/uw_player_select___too_little.webp" />
              <div class="icon wrong">
                <mdicon name="close-circle" size="96"></mdicon>
              </div>
            </div>
          </div>

          <div>
            <button @click="tutorialStep = 0">Previous</button>
            <button @click="tutorialVisible = false">Done</button>
          </div>
        </div>

      </div>
      <div v-else class="w-full">
        <button
          class="info-button"
          @click="showTutorial()"
        >
          <mdicon name="help"></mdicon>
          How do I use this?
        </button>
      </div>
    </div>
  </div>
</template>
<script lang="ts">

export default({
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
    'siteSettings',
    'frame',
    'eventBus',
    'site',
    'isPopup'
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
    async setPlayer(index) {
      // yup.
      // this.siteSettings.getDOMConfig('modified', 'original');
      // await this.siteSettings.setUpdateFlags(['PlayerData']);
      // await this.siteSettings.set('DOMConfig.modified.type', 'modified', {noSave: true});
      // await this.siteSettings.set('activeDOMConfig', 'modified', {noSave: true});

      // // if user agrees with ultrawidify on what element player should be,
      // // we just unset our settings for this site
      // if (this.elementStack[index].heuristics?.autoMatch) {
      //   await this.siteSettings.set('DOMConfig.modified.elements.player.manual', false);
      //   this.getPlayerTree();
      // } else {
      //   // ensure settings exist:
      //   await this.siteSettings.set('DOMConfig.modified.elements.player.manual', true, {noSave: true});
      //   await this.siteSettings.set('DOMConfig.modified.elements.player.mode', 'index', {noSave: true});
      //   await this.siteSettings.set('DOMConfig.modified.elements.player.index', index, true);
      //   this.getPlayerTree();
      // }
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
})
</script>
<style lang="scss" scoped>

</style>
