<template>
  <div v-if="siteSupportLevel === 'official'" class="site-support official">
    <mdicon name="check-decagram" />
    <div v-if="!small">Verified</div>
    <div class="tooltip">
      <template v-if="small">Verified&nbsp;—&nbsp;</template>
      The extension is being tested and should work on this site.
    </div>
  </div>
  <div v-if="siteSupportLevel === 'community'" class="site-support community">
    <mdicon name="account-group" />
    <div v-if="!small">Community</div>
    <div class="tooltip">
      <template v-if="small">Community&nbsp;—&nbsp;</template>
      People say extension works on this site (or have provided help getting the extension to work if it didn't).<br/><br/>
      Tamius (the dev) does not test the extension on this site, probably because it requires a subscription or
      is geoblocked.
    </div>
  </div>
  <div v-if="siteSupportLevel === 'no-support'" class="site-support no-support">
    <mdicon name="help-circle-outline" />
    <div v-if="!small">Unknown</div>
    <div class="tooltip">
      <template v-if="small">Unknown&nbsp;—&nbsp;</template>
      Not officially supported. Extension will try to fix things, but no promises.<br/><br/>
      Tamius (the dev) does not test the extension on this site for various reasons
      (unaware, not using the site, language barrier, geoblocking, paid services Tam doesn't use).
    </div>
  </div>
  <div v-if="siteSupportLevel === 'user-added' || siteSupportLevel === 'user-defined'" class="site-support user-added">
    <mdicon name="account" />
    <div v-if="!small">Modified by you</div>
    <div class="tooltip">
      <template v-if="small">Modified by you&nbsp;—&nbsp;</template>
      You have manually changed settings for this site. The extension is doing what you told it to do.
    </div>
  </div>
  <div v-if="siteSupportLevel === 'officially-disabled'" class="site-support officially-disabled">
    <mdicon  class="site-support no-support" name="checkbox-marked-circle" />
    <div v-if="!small">Not supported</div>
    <div class="tooltip">
      <template v-if="small">Not supported&nbsp;—&nbsp;</template>
      Extension is known to not work with this site.
    </div>
  </div>
</template>

<script>
export default {
  props: {
    siteSupportLevel: String,
    small: Boolean,
  }
}
</script>

<style lang="scss" scoped>


  .site-support {
    display: inline-flex;
    flex-direction: row;
    align-items: center;

    margin-left: 1rem;
    border-radius: 8px;
    padding: 0rem 1.5rem 0rem 1rem;

    position: relative;

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

    .mdi {
      margin-right: 1rem;
    }

    &.official {
      background-color: #fa6;
      color: #000;

      .mdi {
        fill: #000 !important;
      }
    }

    &.community {
      background-color: rgb(85, 85, 179);
      color: #fff;

      .mdi {
        fill: #fff !important;
      }
    }

    &.officially-disabled {
      background-color: rgb(132, 24, 40);
      color: #eee;

      .mdi {
        fill: #eee !important;
      }
    }

    &.no-support {
      background-color: rgb(83, 76, 77);
      color: #eee;

      .mdi {
        fill: #eee !important;
      }
    }

    &.user-added {
      border: 1px solid #ff0;

      color: #ff0;

      .mdi {
        fill: #ff0 !important;
      }
    }
  }


</style>
