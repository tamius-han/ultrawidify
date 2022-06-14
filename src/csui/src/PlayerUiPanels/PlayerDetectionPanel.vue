<template>
  <div class="flex flex-column tab-root">
    <!-- ADD ANY OPTION BARS HERE -->

    <!-- The rest of the tab -->
    <div class="flex flex-row flex-wrap">

      <!-- Player element picker -->
      <div class="sub-panel">
        <div class="flex flex-row">
          <h1><mdicon name="television-play" :size="32" /> Player element</h1>
        </div>
        <div class="sub-panel-content">
          <p>
            You're probably on this page because Ultrawidify doesn't crop the player correctly. If you want to know more about
            why this happens, explanation can be found on <a href="https://github.com/tamius-han/ultrawidify/wiki/2.-Player-detection-(and-related-problems)#why-does-ultrawidify-have-this-problem-when-this-other-extension-doesnt" target="_blank">the wiki page</a>.
          </p>
          <p>
            If you hover over the boxes below, the corresponding element will change (sepia filter + higher brightness + reduced contrast + it gets an outline). Player element
            should be the closest element to the video element, for which the sepia/brightness effect covers the area you expect the video will cover.
          </p>

          <div>
            <b>Symbols:</b><br />
            <mdicon name="alert-remove" class="invalid" /> Element of invalid dimensions<br />
            <mdicon name="refresh-auto" class="auto-match" /> Ultrawidify's player detection thinks this should be the player<br />
            <mdicon name="bookmark" class="parent-offset-match" /> Site settings say this should be the player (based on counting parents)<br />
            <mdicon name="crosshairs" class="qs-match" /> Site settings say this should be the player (based on query selectors)<br />
            <mdicon name="check-circle" class="activePlayer" /> Element that is actually the player
          </div>

          <div class="element-tree">
            <div class="html-element-boxes">
              <div
                v-for="(element, index) of elementStack"
                :key="index"
                class="element-row"
              >
                <div class="status">
                  <div
                    v-if="element.heuristics?.invalidSize"
                    class="invalid"
                  >
                    <mdicon name="alert-remove" />
                  </div>
                  <div
                    v-if="element.heuristics?.autoMatch"
                    class="auto-match"
                  >
                     <mdicon name="refresh-auto" />
                  </div>
                  <div
                    v-if="element.heuristics?.qsMatch"
                    class="qs-match"
                  >
                     <mdicon name="crosshairs" />
                  </div>
                  <div
                    v-if="element.heuristics?.manualElementByParentIndex"
                    class="parent-offset-match"
                  >
                     <mdicon name="bookmark" />
                  </div>
                  <div
                    v-if="element.heuristics?.activePlayer"
                    class="activePlayer"
                  >
                     <mdicon name="check-circle" />
                  </div>

                </div>
                <div
                  class="element-data"

                  @mouseover="markElement(index, true)"
                  @mouseleave="markElement(index, false)"

                  @click="setPlayer(index)"
                >
                  <div class="tag">
                    <b>{{element.tagName}}</b> <i class="id">{{element.id ? `#`:''}}{{element.id}}</i>  @ <span class="dimensions">{{element.width}}</span>x<span class="dimensions">{{element.height}}</span>

                  </div>
                  <div v-if="element.classList" class="class-list">
                    <div v-for="cls of element.classList" :key="cls">
                      {{cls}}
                    </div>
                  </div>
                </div>
                <div class="css-fixes">
                  <div><b>Quick fixes:</b></div>
                  <!-- todo: generate buttons with some of the common css lines I always end up adding -->
                  <div
                    class="ccs-line"
                    :class="{'active': cssStack[index]?.includes('width: 100%')}"
                    @click="toggleCssForElement(index, 'width: 100%;')"
                  >
                    Width: 100%
                  </div>
                  <div
                    class="css-line"
                    :class="{'active': cssStack[index]?.includes('height: 100%')}"
                    @click="toggleCssForElement(index, 'height: 100%')"
                  >
                    Height: 100%
                  </div>
                  <div
                    class="css-line"
                    :class="{'active': cssStack[index]?.includes('display: flex')}"
                    @click="toggleCssForElement(index, 'display: flex')"
                  >
                    Display: flex
                  </div>
                  <div class="css-line">
                    Flex direction:
                    <span
                      class="css-line-suboption"
                      :class="{'active': cssStack[index]?.includes('flex-direction: row')}"
                      @click="toggleCssForElement(index, 'flex-direction', 'row')"
                    >
                      row
                    </span> |
                    <span
                      class="css-line-suboption"
                      :class="{'active': cssStack[index]?.includes('flex-direction: column')}"
                      @click="toggleCssForElement(index, 'flex-direction', 'column')"
                    >
                      column
                    </span>
                  </div>
                  <div class="css-line">
                    Justify content:
                    <span
                      class="css-line-suboption"
                      :class="{'active': cssStack[index]?.includes('justify-content: start')}"
                      @click="toggleCssForElement(index, 'justify-content', 'start')"
                    >
                      start
                    </span> |
                    <span
                      class="css-line-suboption"
                      :class="{'active': cssStack[index]?.includes('justify-content: center')}"
                      @click="toggleCssForElement(index, 'justify-content', 'center')"
                    >
                      center
                    </span> |
                    <span
                      class="css-line-suboption"
                      :class="{'active': cssStack[index]?.includes('justify-content: end')}"
                      @click="toggleCssForElement(index, 'justify-content', 'end')"
                    >
                      end
                    </span>
                  </div>
                  <div class="css-line">
                    Align items:
                    <span
                      class="css-line-suboption"
                      :class="{'active': cssStack[index]?.includes('align-items: start')}"
                      @click="toggleCssForElement(index, 'align-items', 'start')"
                    >
                      start
                    </span> |
                    <span
                      class="css-line-suboption"
                      :class="{'active': cssStack[index]?.includes('align-items: center')}"
                      @click="toggleCssForElement(index, 'align-items', 'center')"
                    >
                      center
                    </span> |
                    <span
                      class="css-line-suboption"
                      :class="{'active': cssStack[index]?.includes('align-items: end')}"
                      @click="toggleCssForElement(index, 'align-items', 'end')"
                    >
                      end
                    </span>
                  </div>

                  <div class="css-line">
                    Justify self:
                    <span
                      class="css-line-suboption"
                      :class="{'active': cssStack[index]?.includes('justify-self: start')}"
                      @click="toggleCssForElement(index, 'justify-self', 'start')"
                    >
                      start
                    </span> |
                    <span
                      class="css-line-suboption"
                      :class="{'active': cssStack[index]?.includes('justify-self: center')}"
                      @click="toggleCssForElement(index, 'justify-self', 'center')"
                    >
                      center
                    </span> |
                    <span
                      class="css-line-suboption"
                      :class="{'active': cssStack[index]?.includes('justify-self: end')}"
                      @click="toggleCssForElement(index, 'justify-self', 'end')"
                    >
                      end
                    </span>
                  </div>
                  <div class="css-line">
                    Align self:
                    <span
                      class="css-line-suboption"
                      :class="{'active': cssStack[index]?.includes('align-self: start')}"
                      @click="toggleCssForElement(index, 'align-self', 'start')"
                    >
                      start
                    </span> |
                    <span
                      class="css-line-suboption"
                      :class="{'active': cssStack[index]?.includes('align-self: center')}"
                      @click="toggleCssForElement(index, 'align-self', 'center')"
                    >
                      center
                    </span> |
                    <span
                      class="css-line-suboption"
                      :class="{'active': cssStack[index]?.includes('align-self: end')}"
                      @click="toggleCssForElement(index, 'align-self', 'end')"
                    >
                      end
                    </span>
                  </div>
                  <div class="css-line">
                    Text-align:
                    <span
                      class="css-line-suboption"
                      :class="{'active': cssStack[index]?.includes('text-align: left')}"
                      @click="toggleCssForElement(index, 'align-self', 'start')"
                    >
                      left
                    </span> |
                    <span
                      class="css-line-suboption"
                      :class="{'active': cssStack[index]?.includes('text-align: center')}"
                      @click="toggleCssForElement(index, 'text-align', 'center')"
                    >
                      center
                    </span> |
                    <span
                      class="css-line-suboption"
                      :class="{'active': cssStack[index]?.includes('text-align: right')}"
                      @click="toggleCssForElement(index, 'text-align', 'right')"
                    >
                      right
                    </span>
                  </div>
                  <div class="css-line">
                    Position:
                    <span
                      class="css-line-suboption"
                      :class="{'active': cssStack[index]?.includes('position: relative')}"
                      @click="toggleCssForElement(index, 'position', 'relative')"
                    >
                      relative
                    </span> |
                    <span
                      class="css-line-suboption"
                      :class="{'active': cssStack[index]?.includes('position: absolute')}"
                      @click="toggleCssForElement(index, 'position', 'absolute')"
                    >
                      absolute
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div class="element-config">
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>


export default({
  components: {

  },
  data() {
    return {
      elementStack: [],
      cssStack: [],
    };
  },
  mixins: [],
  props: [
    'settings',
    'frame',
    'eventBus',
    'site'
  ],
  created() {
    this.eventBus.subscribe('uw-config-broadcast', {function: (config) => this.handleElementStack(config)});
  },
  mounted() {
    this.eventBus.sendToTunnel('get-player-tree');
  },
  computed: {},
  methods: {
    handleElementStack(configBroadcast) {
      if (configBroadcast.type === 'player-tree') {
        this.elementStack = configBroadcast.config;
        this.$nextTick( () => this.$forceUpdate() );
      }
    },
    markElement(parentIndex, enable) {
      this.eventBus.sendToTunnel('set-mark-element', {parentIndex, enable});
    },
    async setPlayer(index) {
      // if user agrees with ultrawidify on what element player should be,
      // we just unset our settings for this site
      if (this.elementStack[index].heuristics?.autoMatch) {
        this.settings.setSiteOption(['DOM', 'player', 'manual'], false, this.site);
        await this.settings.save();
        this.eventBus.sendToTunnel('get-player-tree');
      } else {
        // ensure settings exist:
        this.settings.setSiteOption(['DOM', 'player', 'manual'], true, this.site);
        this.settings.setSiteOption(['DOM', 'player', 'useRelativeAncestor'], true, this.site);
        this.settings.setSiteOption(['DOM', 'player', 'videoAncestor'], index, this.site);
        await this.settings.save();
        this.eventBus.sendToTunnel('get-player-tree');
      }
    },
    /**
     * Toggles active CSS for element of certain parent index.
     * cssValue is optional and can be included in cssRule argument
     */
    toggleCssForElement(index, cssRule, cssValue) {
      if (cssValue) {
        // this is "toggle off" case for calls that put cssRule and cssValue as separate arguments
        if (this.cssStack[index]?.includes(cssRule) && this.cssStack[index]?.includes(cssValue)) {
          this.cssStack[index] = this.cssStack[index].filter(x => ! x.includes(cssRule));

          //TODO: update settings!
          return;
        }
      }

      // this rule applies to current element — remove it!
      if (this.cssStack[index]?.includes(cssRule)) {
        this.cssStack[index] = this.cssStack[index].filter(x => ! x.includes(cssRule));

        // exception: if cssValue is given separately, we aren't removing it
        // in that case, we're overwriting it
        if (cssValue) {
          this.cssStack[index].push(`${cssRule}: ${cssValue};`);
        }
      } else {
        if (!this.cssStack[index]) {
          this.cssStack[index] = [];
        }
        if (cssValue) {
          this.cssStack[index].push(`${cssRule}: ${cssValue};`);
        } else {
          this.cssStack[index].push(cssRule)
        }
      }

      //TODO: update settings!
    }
  }
})
</script>

<style lang="scss" scoped>
.element-tree {
  .html-element-boxes {
    display: flex;
    flex-direction: column;

    .element-row {
      display: flex;
      flex-direction: row;
      margin: 0.5rem;

      .status {
        width: 6.9rem;
        margin-right: 1rem;
        display: flex;
        flex-direction: row;
        justify-content: flex-end;
        align-items: center;

        .invalid {
          color: #f00;
        }
      }
      .element-data {
        border: 1px solid rgba(255,255,255,0.5);
        padding: 0.5rem 1rem;

        max-width: 30rem;

        display: flex;
        flex-direction: column;

        .tag {
          text-transform: lowercase;
          font-weight: bold;
        }
        .id {
          font-style: italic;
        }
        .class-list {
          font-style: italic;
          opacity: 0.75;
          font-size: 0.75rem;

          display: flex;
          flex-direction: row;
          flex-wrap: wrap;

          > div {
            background-color: rgba(255,255,255,0.5);
            border-radius: 0.25rem;
            padding: 0.125rem 0.5rem;
            margin: 0.125rem 0.25rem;
          }
        }
        .dimensions {
          color: #473c85;
        }
      }
    }
  }
}

.tab-root {
  width: 100%;
}
</style>
