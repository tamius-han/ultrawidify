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

    };
  },
  mixins: [],
  props: [
    'settings',
    'frame',
    'eventBus',
    'site'
  ],
  mounted() {

  },
  computed: {},
  methods: {

  }
})
</script>
