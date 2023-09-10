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

          <p>
             <a @click="showAdvancedOptions = !showAdvancedOptions">
              <template v-if="showAdvancedOptions">Hide advanced options</template>
              <template v-else>Show advanced options</template>
             </a>
          </p>

          <div v-if="showAdvancedOptions" style="display: flex; flex-direction: row">
            <div style="display: flex; flex-direction: column">
              <div>
                <input :checked="playerManualQs"
                        @change="togglePlayerManualQs"
                        type="checkbox"
                />
                <div>
                  Use <a href="https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors" target="_blank">CSS selector</a> for player<br/>
                  <small>If defining multiple selectors, separate them with commas.</small>
                </div>
              </div>
              <div>Selector</div>
              <input type="text"
                v-model="playerQs"
                @change="updatePlayerQuerySelector"
                @blur="updatePlayerQuerySelector"
                :disabled="playerByNodeIndex || !playerManualQs"
              />
            </div>
            <div style="display: flex; flex-direction: column">
              <b>Custom CSS for site</b>
              <textarea></textarea>
            </div>
          </div>

          <div style="display: flex; flex-direction: row;">
            <div class="element-tree">
              <table>
                <thead>
                  <tr>
                    <th>
                      <div class="status-relative">
                        Status <mdicon name="help-circle" @click="showLegend = !showLegend" />

                        <div v-if="showLegend" class="element-symbol-legend">
                          <b>Symbols:</b><br />
                          <mdicon name="alert-remove" class="invalid" /> Element of invalid dimensions<br />
                          <mdicon name="refresh-auto" class="auto-match" /> Ultrawidify's player detection thinks this should be the player<br />
                          <mdicon name="bookmark" class="parent-offset-match" /> Site settings say this should be the player (based on counting parents)<br />
                          <mdicon name="crosshairs" class="qs-match" /> Site settings say this should be the player (based on query selectors)<br />
                          <mdicon name="check-circle" class="activePlayer" /> Element that is actually the player
                        </div>
                      </div>
                    </th>
                    <th>Element</th>
                    <th>Actions</th>
                    <!-- <th>Quick fixes</th> -->
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(element, index) of elementStack"
                    :key="index"
                    class="element-row"
                  >
                    <td>
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
                    </td>
                    <td>
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
                    </td>
                    <td>
                      <div class="flex flex-row">
                        <!-- <div @click="designatePlayer(index)">Set as player {{ index }}</div> -->
                      </div>
                    </td>
                    <!-- <td>
                      <div
                        class="css-fixes"
                      >
                        <div style="width: 100%"><b>Quick fixes:</b></div>
                        <div
                          class="css-line"
                          :class="{'active': cssStack[index]?.includes('width: 100%;')}"
                          @click="toggleCssForElement(index, 'width: 100%;')"
                        >
                          Width: 100%
                        </div>
                        <div
                          class="css-line"
                          :class="{'active': cssStack[index]?.includes('height: 100%;')}"
                          @click="toggleCssForElement(index, 'height: 100%;')"
                        >
                          Height: 100%
                        </div>
                        <div
                          class="css-line"
                          :class="{'active': cssStack[index]?.includes('display: flex;')}"
                          @click="toggleCssForElement(index, 'display: flex;')"
                        >
                          Display: flex
                        </div>
                        <div class="css-line">
                          Flex direction:
                          <span
                            class="css-line-suboption"
                            :class="{'active': cssStack[index]?.includes('flex-direction: row;')}"
                            @click="toggleCssForElement(index, 'flex-direction', 'row')"
                          >
                            row
                          </span> |
                          <span
                            class="css-line-suboption"
                            :class="{'active': cssStack[index]?.includes('flex-direction: column;')}"
                            @click="toggleCssForElement(index, 'flex-direction', 'column')"
                          >
                            column
                          </span>
                        </div>
                        <div class="css-line">
                          Justify content:
                          <span
                            class="css-line-suboption"
                            :class="{'active': cssStack[index]?.includes('justify-content: start;')}"
                            @click="toggleCssForElement(index, 'justify-content', 'start')"
                          >
                            start
                          </span> |
                          <span
                            class="css-line-suboption"
                            :class="{'active': cssStack[index]?.includes('justify-content: center;')}"
                            @click="toggleCssForElement(index, 'justify-content', 'center')"
                          >
                            center
                          </span> |
                          <span
                            class="css-line-suboption"
                            :class="{'active': cssStack[index]?.includes('justify-content: end;')}"
                            @click="toggleCssForElement(index, 'justify-content', 'end')"
                          >
                            end
                          </span>
                        </div>
                        <div class="css-line">
                          Align items:
                          <span
                            class="css-line-suboption"
                            :class="{'active': cssStack[index]?.includes('align-items: start;')}"
                            @click="toggleCssForElement(index, 'align-items', 'start')"
                          >
                            start
                          </span> |
                          <span
                            class="css-line-suboption"
                            :class="{'active': cssStack[index]?.includes('align-items: center;')}"
                            @click="toggleCssForElement(index, 'align-items', 'center')"
                          >
                            center
                          </span> |
                          <span
                            class="css-line-suboption"
                            :class="{'active': cssStack[index]?.includes('align-items: end;')}"
                            @click="toggleCssForElement(index, 'align-items', 'end')"
                          >
                            end
                          </span>
                        </div>

                        <div class="css-line">
                          Justify self:
                          <span
                            class="css-line-suboption"
                            :class="{'active': cssStack[index]?.includes('justify-self: start;')}"
                            @click="toggleCssForElement(index, 'justify-self', 'start')"
                          >
                            start
                          </span> |
                          <span
                            class="css-line-suboption"
                            :class="{'active': cssStack[index]?.includes('justify-self: center;')}"
                            @click="toggleCssForElement(index, 'justify-self', 'center')"
                          >
                            center
                          </span> |
                          <span
                            class="css-line-suboption"
                            :class="{'active': cssStack[index]?.includes('justify-self: end;')}"
                            @click="toggleCssForElement(index, 'justify-self', 'end')"
                          >
                            end
                          </span>
                        </div>
                        <div class="css-line">
                          Align self:
                          <span
                            class="css-line-suboption"
                            :class="{'active': cssStack[index]?.includes('align-self: start;')}"
                            @click="toggleCssForElement(index, 'align-self', 'start')"
                          >
                            start
                          </span> |
                          <span
                            class="css-line-suboption"
                            :class="{'active': cssStack[index]?.includes('align-self: center;')}"
                            @click="toggleCssForElement(index, 'align-self', 'center')"
                          >
                            center
                          </span> |
                          <span
                            class="css-line-suboption"
                            :class="{'active': cssStack[index]?.includes('align-self: end;')}"
                            @click="toggleCssForElement(index, 'align-self', 'end')"
                          >
                            end
                          </span>
                        </div>
                        <div class="css-line">
                          Text-align:
                          <span
                            class="css-line-suboption"
                            :class="{'active': cssStack[index]?.includes('text-align: left;')}"
                            @click="toggleCssForElement(index, 'text-align', 'left')"
                          >
                            left
                          </span> |
                          <span
                            class="css-line-suboption"
                            :class="{'active': cssStack[index]?.includes('text-align: center;')}"
                            @click="toggleCssForElement(index, 'text-align', 'center')"
                          >
                            center
                          </span> |
                          <span
                            class="css-line-suboption"
                            :class="{'active': cssStack[index]?.find(x => x.includes('text-align: right'))}"
                            @click="toggleCssForElement(index, 'text-align', 'right')"
                          >
                            right
                          </span>
                        </div>
                        <div class="css-line">
                          Position:
                          <span
                            class="css-line-suboption"
                            :class="{'active': cssStack[index]?.includes('position: relative;')}"
                            @click="toggleCssForElement(index, 'position', 'relative')"
                          >
                            relative
                          </span> |
                          <span
                            class="css-line-suboption"
                            :class="{'active': cssStack[index]?.includes('position: absolute;')}"
                            @click="toggleCssForElement(index, 'position', 'absolute')"
                          >
                            absolute
                          </span>
                        </div>
                      </div>
                    </td> -->
                  </tr>
                </tbody>
              </table>
              <div class="element-config">
              </div>
            </div>

            <!-- <div class="css-preview">
              {{cssStack}}
            </div> -->
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
      showLegend: false,
      showAdvancedOptions: false,
    };
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
    this.eventBus.subscribe('uw-config-broadcast', {function: (config) => this.handleElementStack(config)});
  },
  mounted() {
    this.getPlayerTree();
  },
  computed: {},
  methods: {
    getPlayerTree() {
      if (this.isPopup) {
        this.eventBus.send('get-player-tree');
      } else {
        this.eventBus.sendToTunnel('get-player-tree');
      }
    },
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
      // yup.
      this.siteSettings.getDOMConfig('modified', 'original');
      await this.siteSettings.setUpdateFlags(['PlayerData']);
      await this.siteSettings.set('DOMConfig.modified.type', 'modified', {noSave: true});
      await this.siteSettings.set('activeDOMConfig', 'modified', {noSave: true});

      // if user agrees with ultrawidify on what element player should be,
      // we just unset our settings for this site
      if (this.elementStack[index].heuristics?.autoMatch) {
        await this.siteSettings.set('DOMConfig.modified.elements.player.manual', false);
        this.getPlayerTree();
      } else {
        // ensure settings exist:
        await this.siteSettings.set('DOMConfig.modified.elements.player.manual', true, {noSave: true});
        await this.siteSettings.set('DOMConfig.modified.elements.player.mode', 'index', {noSave: true});
        await this.siteSettings.set('DOMConfig.modified.elements.player.index', index, true);
        this.getPlayerTree();
      }
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
.element-tree {
  .element-row {
    // display: flex;
    // flex-direction: row;
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

// .css-fixes {
//   // display: flex;
//   // flex-direction: row;
//   // flex-wrap: wrap;
//   // align-items: flex-start;
//   // justify-content:flex-start;
// }
.css-line {
  display: inline-block;
  flex-grow: 0;
  flex-shrink: 0;
  border: 1px solid rgba(255,255,255,0.5);
  background: #000;
  margin: 0.125rem 0.25rem;
  padding: 0.125rem 0.25rem;

  &.active, >span.active {
    background: rgb(255, 174, 107);
    color: #000;
  }
}

.status-relative {
  position: relative;

  .element-symbol-legend {
    position: absolute;
    top: 100%;
    left: 0;

    z-index: 20000;

    width: 32rem;

    text-align: left;

    background-color: #000;
    padding: 1rem;
    border: 1px solid rgba(255,255,255,0.5);
  }
}

.tab-root {
  width: 100%;
}
</style>
