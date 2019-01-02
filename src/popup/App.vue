<template>
  <div>
    <div class="header">
      <span class="smallcaps">Ultrawidify</span>: <small>Quick settings</small>
    </div>

     <!-- TABS/SIDEBAR -->
    <div id="tablist" class="left-side">
    </div>

     <!-- PANELS/CONTENT -->
    <div id="tab-content" class="right-side">
      <VideoPanel v-if="settings && settings.active && true"
                  class=""
                  :settings="settings"
                  :frame="selectedFrame"
      >
      </VideoPanel>
    </div>
  </div>
</template>

<script>
import VideoPanel from './panels/VideoPanel';
import Settings from '../ext/lib/Settings';

export default {
  data () {
    return {
      selectedTab: 'video',
      selectedFrame: '__all',
      settings: {},
    }
  },
  async created() {
    const ns = new Settings();
    await ns.init();
    this.settings = ns;
  },
  components: {
    VideoPanel,
  }
}
</script>

<style lang="scss" scoped>
p {
  font-size: 20px;
}
</style>
