<template>
  <div class="w-full flex flex-row" style="margin-top: 1rem;">

    <!-- PLAYER ELEMENT SELECTOR FOR DUMMIES -->
    <div style="width: 48%">
      <div class="sub-panel-content">

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
  </div>
</template>

<script lang="ts">
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
});
</script>
