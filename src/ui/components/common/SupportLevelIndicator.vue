<template>
  <div
    v-if="computedSiteSupportLevel === 'official'"
    class="site-support site-support-level official"
    :style="supportLevelStyle"
  >
    <mdicon name="check-decagram" />
    <div v-if="!small">Verified</div>
    <div class="tooltip" :style="tooltipStyle">
      <template v-if="small">Verified&nbsp;—&nbsp;</template>
      The extension is being tested and should work on this site.
    </div>
  </div>
  <div v-if="computedSiteSupportLevel === 'community'" class="site-support site-support-level community" :style="supportLevelStyle">
    <mdicon name="account-group" />
    <div v-if="!small">Community</div>
    <div class="tooltip" :style="tooltipStyle">
      <template v-if="small">Community&nbsp;—&nbsp;</template>
      People say extension works on this site (or have provided help getting the extension to work if it didn't).<br/><br/>
      Tamius (the dev) does not test the extension on this site, probably because it requires a subscription or
      is geoblocked.
    </div>
  </div>
  <div v-if="computedSiteSupportLevel === 'no-support' || computedSiteSupportLevel === 'unknown'" class="site-support site-support-level no-support" :style="supportLevelStyle">
    <mdicon name="help-circle-outline" />
    <div v-if="!small">Untested</div>
    <div class="tooltip" :style="tooltipStyle">
      <template v-if="small">Untested&nbsp;—&nbsp;</template>
      Extension will try to fix things, but no promises; for you are exploring the uncharted lands.<br/><br/>
      Tamius (the dev) does not test the extension on this site for various reasons
      (unaware, not using the site, language barrier, geoblocking, paid services Tam doesn't use).
    </div>
  </div>
  <div v-if="computedSiteSupportLevel === 'user-added' || computedSiteSupportLevel === 'user-defined'" class="site-support site-support-level user-added" :style="supportLevelStyle">
    <mdicon name="account" />
    <div v-if="!small">Modified by you</div>
    <div class="tooltip" :style="tooltipStyle">
      <template v-if="small">Modified by you&nbsp;—&nbsp;</template>
      You are on your own. You have manually changed settings for this site. The extension is doing what you told it to do.
    </div>
  </div>
  <div v-if="computedSiteSupportLevel === 'officially-disabled'" class="site-support site-support-level officially-disabled" :style="supportLevelStyle">
    <mdicon name="close-circle" />
    <div v-if="!small">Blacklisted</div>
    <div class="tooltip" :style="tooltipStyle">
      <template v-if="small">Blacklisted&nbsp;—&nbsp;</template>
      Extension is known to not work with this site.
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  props: {
    siteSupportLevel: String,
    siteSettings: Object,
    small: Boolean,
    supportLevelStyle: String,
    tooltipStyle: String,
  },
  computed: {
    computedSiteSupportLevel() {
      return this.siteSupportLevel ?? (this.siteSettings ? this.siteSettings.data.type ?? 'no-support' : 'waiting');
    }
  }

});
</script>

<style lang="postcss" scoped>
@import '@src/main.css'; /** postcss processor doesn't support aliases */

.site-support {
  @apply inline-flex flex-row items-center gap-1 rounded-[0.5rem] relative;

  .tooltip {
    padding: 1rem;
    display: none;
    position: absolute;
    bottom: 0;
    transform: translateY(110%);
    width: 42em;

    background-color: rgba(0,0,0,0.90);
    color: #ccc;
    z-index: 99999 !important;

    white-space: normal;
    overflow-wrap: break-word;
    word-wrap: break-word;
    word-break: break-word;
  }
  &:hover {
    .tooltip {
      display: block;
    }
  }
}


</style>
