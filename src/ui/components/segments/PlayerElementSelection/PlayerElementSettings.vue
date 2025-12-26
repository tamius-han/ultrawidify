<template>
  <div class="flex flex-col w-full">
    <div class="flex flex-col">
      <h2 class="text-[1.75em]">Video player options</h2>
      <p class="text-stone-500">This page allows you to edit query selectors and custom CSS for video player on known websites.</p>
      <p>List of sites:</p>
    </div>
    <div class="w-full max-w-[520px]">
      <template v-for="(siteConf, domain) in settings.active.sites" :key="domain">
        <div
          v-if="domain !== '@global' && domain !== '@empty'"
          class="
            my-2 px-4 py-2
            border border-stone-800
          "
        >
          <div class="flex gap-2">
            <div>{{domain}}</div>
            <button @click="edit"></button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
<script lang="ts">

export default({
  components: {

  },
  data() {
    return {
      tutorialVisible: false,
      tutorialStep: 0
    };
  },
  computed: {
  },
  mixins: [],
  props: [
    'settings',
    'eventBus',
  ],
  created() {
  },
  mounted() {
  },
  destroyed() {
    this.eventBus.unsubscribeAll(this);
  },
  methods: {
    showTutorial() {
      this.tutorialVisible = true;
      this.tutorialStep = 0;
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
    edit() {

    }
  }
})
</script>
<style lang="postcss" scoped>

</style>
