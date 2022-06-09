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

          <div class="element-tree">
            <div class="html-element-boxes">
              <div
                v-for="(element, index) of elementStack"
                :key="index"
                class="element-row"
              >
                <div class="status">
                </div>
                <div class="element-data">
                  <div class="tag">
                    {{element.tagName}}
                  </div>
                  <div v-if="element.id" class="id">
                    {{element.id}}
                  </div>
                  <div v-if="element.classList" id="class-list">
                    {{element.classList}}
                  </div>
                  <div class="dimensions">
                    {{element.width}} x {{element.height}}
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
    this.eventBus.subscribe('uw-player-tree', {function: (elementStack) => this.handleElementStack(elementStack)});
  },
  mounted() {
    this.eventBus.sendToTunnel('get-player-tree');  // TODO: implement this in PlayerData
  },
  computed: {},
  methods: {
    handleElementStack(elementStack) {
      this.elementStack = elementStack;
      this.$nextTick( () => this.$forceUpdate() );
    }
  }
})
</script>
