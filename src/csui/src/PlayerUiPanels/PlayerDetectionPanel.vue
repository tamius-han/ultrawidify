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
        <div class="w-full flex flex-row" style="margin-top: 1rem;">

          <!-- PLAYER ELEMENT SELECTOR FOR DUMMIES -->
          <div style="width: 48%">
            <div class="sub-panel-content">
              <h2>Simple player selector</h2>


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
                        <!-- <th>Actions</th> -->
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

                            @mouseover="markElement(elementStack.length - index - 1, true)"
                            @mouseleave="markElement(elementStack.length - index - 1, false)"

                            @click="setPlayer(elementStack.length - index - 1)"
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
                          </div>
                        </td>
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

          <!-- ADVANCED OPTIONS -->
          <div style="width: 48%" v-if="false">
            <h2>Advanced options</h2>

            <pre>{{siteSettings.raw}}</pre>

            <div class="">
              <h3>Player element</h3>
              <div class="field">
                <div class="label">Manually specify player</div>
                <input type="checkbox" />
              </div>
              <div class="field">
                <div class="label">Select player by/as:</div>
                <div class="select">
                  <select>
                    <option>n-th parent of video</option>
                    <option>Query selectors</option>
                  </select>
                </div>
              </div>
              <div class="field">
                <div class="label">Player is n-th parent of video</div>
                <div class="range-input">
                  <input type="range" min="0" max="100" />
                  <input />
                </div>
              </div>
              <div class="field">
                <div class="label">Query selector for player element</div>
                <div class="input">
                  <input />
                </div>
              </div>
              <div class="field">
                <div class="label">In full screen, calculate crop based on monitor resolution</div>
                <input type="checkbox" />
              </div>

              <h3>Video element</h3>
              <div class="field">
                <div class="label">Select video element automatically</div>
                <input type="checkbox">
              </div>
              <div class="field">
                <div class="label">Query selectors</div>
                <div class="input">
                  <input>
                </div>
              </div>
              <div class="field">
                <div class="label">Additional styles for video element</div>
                <div class="input">
                  <textarea></textarea>
                </div>
              </div>

              <h3>Additional css for this page</h3>
              <div class="field">
                <div class="label">Additional CSS for this page</div>
                <textarea></textarea>
              </div>

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
  computed: {},
  methods: {
    showTutorial() {
      this.tutorialVisible = true;
      this.tutorialStep = 0;
    },
    getPlayerTree() {
      if (this.isPopup) {
        this.eventBus.send('get-player-tree');
      } else {
        this.eventBus.sendToTunnel('get-player-tree');
      }
    },
    handleElementStack(configBroadcast) {
      if (configBroadcast.type === 'player-tree') {
        this.elementStack = configBroadcast.config.reverse();
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
p {
  font-size: 1rem;
}

.info-button {
  color: $info-color;
  border: 1px solid $info-color;
  padding: 0.5rem 2rem;

  &:hover {
    background-color: rgba($info-color, 0.25);
    color: #eee;
    border: 1px solid $info-color !important;
  }
}

.tutorial-step {
  margin-top: 2rem;
  margin-bottom: 2rem;

  h3 {
    color: #fa6;
    text-transform: uppercase;
    font-weight: bold !important;
  }

  .tutorial-list {
    margin-top: 1rem;
    margin-bottom: 3rem;

    .card {
      position: relative;

      margin: 0.5rem;
      padding: 1rem;

      max-width: 32rem;

      border: 1px solid #333;
      border-radius: 0.5rem;
      background-color: #121110dd;

      display: flex;
      flex-direction: column;

      .card-text {
        color: #aaa;
        flex-grow: 1;
      }

      img {
        width: 100%;
      }

      .icon {
        position: absolute;
        bottom: 0;
        left: 50%;
        padding: 0rem;
        transform: translate(-50%, 50%);

        background-color: #000;
        border-radius: 50%;

        &.wrong {
          color: #dc3c14;
        }
        &.correct {
          color: rgb(102, 241, 218);
        }
      }
    }
  }

  button {
    color: #000 !important;
    background-color: #fa6 !important;
    border-radius: 0.5rem !important;

    &:hover {
      border: 1px solid #fa6 !important;
      color: #fff !important;
      background-color: transparent !important;
    }
  }
}

.element-tree {
  .element-row {
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

.demo-images {
  width: 100%;
  display: flex;
  flex-direction: column;

  padding-top: 2rem;

  .fig1, .fig2 {
    margin-top: -2rem;
    max-height: 18rem;
    width: 100%;

    display: flex;
    flex-direction: row;
    align-items: center;
  }
  .fig1 {
    align-self: start;
  }
  .fig2 {
    align-self: end;
  }

  img {
    max-width: 32rem;
  }
}
</style>
