<template>
  <div class="flex flex-column">
    <!-- ADD ANY OPTION BARS HERE -->

    <!-- The rest of the tab -->
    <div class="flex flex-row flex-wrap">

      <!-- Player element picker -->
      <div class="sub-panel">
        <div class="flex flex-row">
          <mdicon name="crop" :size="32" />
          <h1>Player element</h1>
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
                  <!-- todo: generate buttons with some of the common css lines I always end up adding -->
                  <div>Width: 100%</div>
                  <div>Height: 100%</div>
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
      elementStack: []
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
    this.eventBus.sendToTunnel('get-player-tree');  // TODO: implement this in PlayerData
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
      console.log('will mark element:', parentIndex, enable);
      this.eventBus.sendToTunnel('set-mark-element', {parentIndex, enable});
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
        }
        .dimensions {
          color: #473c85;
        }
      }
    }
  }
}
</style>
