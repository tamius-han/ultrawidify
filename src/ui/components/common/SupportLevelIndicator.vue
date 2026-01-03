<template>
  <!--
    NOTE: extension popup doesn't use this component. Instead, it
    re-implements messages and tooltips on its own. Any changes
    to logic & wording here should be carried over there as well.
  -->
  <div v-if="computedSiteSupportLevel === SiteSupportLevel.OfficialSupport"
    class="uw-site-support uw-site-support-level uw-official"
    :class="{'no-tooltip': disableTooltip}"
    :style="supportLevelStyle"
  >
    <mdicon name="check-decagram" />
    <div v-if="!small">Verified</div>
    <div class="tooltip" :style="tooltipStyle">
      <template v-if="small">Verified&nbsp;—&nbsp;</template>
      The extension is being tested and should work on this site.
    </div>
  </div>
  <div v-if="computedSiteSupportLevel === SiteSupportLevel.CommunitySupport"
    class="uw-site-support uw-site-support-level uw-community"
    :class="{'no-tooltip': disableTooltip}"
    :style="supportLevelStyle"
  >
    <mdicon name="account-group" />
    <div v-if="!small">Community</div>
    <div class="tooltip" :style="tooltipStyle">
      <template v-if="small">Community&nbsp;—&nbsp;</template>
      People say extension works on this site (or have provided help getting the extension to work if it didn't).<br/><br/>
      Tamius (the dev) does not test the extension on this site, probably because it requires a subscription or
      is geoblocked.
    </div>
  </div>
  <div v-if="computedSiteSupportLevel === SiteSupportLevel.Unknown"
    class="uw-site-support uw-site-support-level uw-no-support"
    :class="{'no-tooltip': disableTooltip}"
    :style="supportLevelStyle"
  >
    <mdicon name="help-circle-outline" />
    <div v-if="!small">Untested</div>
    <div class="tooltip" :style="tooltipStyle">
      <template v-if="small">Untested&nbsp;—&nbsp;</template>
      Extension will try to fix things, but no promises; for you are exploring the uncharted lands.<br/><br/>
      Tamius (the dev) does not test the extension on this site for various reasons
      (unaware, not using the site, language barrier, geoblocking, paid services Tam doesn't use).
    </div>
  </div>
  <div v-if="computedSiteSupportLevel === SiteSupportLevel.UserDefined || computedSiteSupportLevel === SiteSupportLevel.UserModified"
    class="uw-site-support uw-site-support-level uw-user-added"
    :class="{'no-tooltip': disableTooltip}"
    :style="supportLevelStyle"
  >
    <mdicon name="account" />
    <div v-if="!small">Modified by you</div>
    <div class="tooltip" :style="tooltipStyle">
      <template v-if="small">Modified by you&nbsp;—&nbsp;</template>
      You are on your own. You have manually changed settings for this site. The extension is doing what you told it to do.
    </div>
  </div>
  <div v-if="computedSiteSupportLevel === SiteSupportLevel.BetaSupport">

  </div>
  <div v-if="computedSiteSupportLevel === 'officially-disabled'"
    class="uw-site-support uw-site-support-level uw-officially-disabled"
    :class="{'no-tooltip': disableTooltip}"
    :style="supportLevelStyle"
  >
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
import { SiteSupportLevel } from '@src/common/enums/SiteSupportLevel.enum';

export default defineComponent({
  data() {
    return {
      SiteSupportLevel
    };
  },
  props: {
    siteSupportLevel: String,
    siteSettings: Object,
    small: Boolean,
    disableTooltip: Boolean,
    supportLevelStyle: String,
    tooltipStyle: String,
  },
  computed: {
    computedSiteSupportLevel() {
      return this.siteSupportLevel ?? (this.siteSettings ? this.siteSettings.data.type ?? SiteSupportLevel.Unknown : 'waiting');
    }
  }

});
</script>

<style lang="postcss" scoped>
@import '@src/main.css'; /** postcss processor doesn't support aliases */



</style>
