<template>
  <div
    class="popup-panel flex flex-column uw-clickable"
  >
    <div class="popup-window-header">
      <div class="popup-title">Ultrawidify <small>{{settings?.active?.version}} - {{BrowserDetect.processEnvChannel}}</small></div>
      <div class="site-support-info">
        <div class="site-support-site">{{site}}</div>
        <template v-if="inPlayer">
          <div v-if="siteSupportLevel === 'official'" class="site-support official">
            <mdicon name="check-decagram" />
            <div>Verified</div>
            <div class="tooltip">The extension is being tested and should work on this site.</div>
          </div>
          <div v-if="siteSupportLevel === 'community'" class="site-support community">
            <mdicon name="handshake" />
            <div>Community</div>
            <div class="tooltip">
              People say extension works on this site (or have provided help getting the extension to work if it didn't).<br/><br/>
              Tamius (the dev) does not test the extension on this site, probably because it requires a subscription or
              is geoblocked.
            </div>
          </div>
          <div v-if="siteSupportLevel === 'no-support'" class="site-support no-support">
            <mdicon name="help-circle-outline" />
            <div>Unknown</div>
            <div class="tooltip">
              Not officially supported. Extension will try to fix things, but no promises.<br/><br/>
              Tamius (the dev) does not test the extension on this site for various reasons
              (unaware, not using the site, language barrier, geoblocking, paid services Tam doesn't use).
            </div>
          </div>
          <div v-if="siteSupportLevel === 'user-added'" class="site-support user-added">
            <mdicon name="account" />
            <div>Custom</div>
            <div class="tooltip">
              You have manually changed settings for this site. The extension is doing what you told it to do.
            </div>
          </div>
          <mdicon v-if="siteSupportLevel === 'community'" class="site-support supported" name="checkbox-marked-circle" />
        </template>
      </div>

      <div><a @click="setPreventClose(!preventClose)">{{preventClose ? 'allow auto-close' : 'prevent auto-close'}}</a></div>
    </div>

    <div class="tab-main flex flex-row">
      <div class="tab-row flex flex-column">
        <div
          v-for="tab of tabs"
          :key="tab.id"
          class="tab"
          :class="{'active': tab.id === selectedTab}"
          @click="selectTab(tab.id)"
        >
          <div class="icon-container">
            <mdicon
              :name="tab.icon"
              :size="32"
            />
          </div>
          <div class="label">
            {{tab.label}}
          </div>
        </div>
      </div>
      <div class="content flex flex-column">
        <!-- autodetection warning -->

        <div class="warning-area">
          <div
            v-if="statusFlags.hasDrm"
            class="warning-box"
          >
            <div class="icon-container">
              <mdicon name="alert" :size="32" />
            </div>
            <div>
              This site is blocking automatic aspect ratio detection. You will have to adjust aspect ratio manually.<br/>
              <a>Learn more ...</a>
            </div>
          </div>
        </div>

        <div class="flex flex-row panel-content">
          <!-- Panel section -->
          <VideoSettings
            v-if="selectedTab === 'videoSettings'"
            :settings="settings"
            :siteSettings="siteSettings"
            :eventBus="eventBus"
            :site="site"
          ></VideoSettings>
          <PlayerDetectionPanel
            v-if="selectedTab === 'playerDetection'"
            :settings="settings"
            :siteSettings="siteSettings"
            :eventBus="eventBus"
            :site="site"
          >
          </PlayerDetectionPanel>
          <BaseExtensionSettings
            v-if="selectedTab === 'extensionSettings'"
            :settings="settings"
            :siteSettings="siteSettings"
            :site="site"
          ></BaseExtensionSettings>
          <AutodetectionSettingsPanel
            v-if="selectedTab === 'autodetectionSettings'"
            :settings="settings"
            :siteSettings="siteSettings"
            :eventBus="eventBus"
            :site="site"
          >
          </AutodetectionSettingsPanel>
          <DebugPanel
            v-if="selectedTab === 'debugging'"
            :settings="settings"
            :eventBus="eventBus"
            :site="site"
          ></DebugPanel>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import DebugPanel from './PlayerUiPanels/DebugPanel.vue'
import AutodetectionSettingsPanel from './PlayerUiPanels/AutodetectionSettingsPanel.vue'
import BaseExtensionSettings from './PlayerUiPanels/BaseExtensionSettings.vue'
import PlayerDetectionPanel from './PlayerUiPanels/PlayerDetectionPanel.vue'
import VideoSettings from './PlayerUiPanels/VideoSettings.vue'
import BrowserDetect from '../../ext/conf/BrowserDetect'

export default {
  components: {
    VideoSettings,
    PlayerDetectionPanel,
    BaseExtensionSettings,
    AutodetectionSettingsPanel,
    DebugPanel
  },
  mixins: [],
  data() {
    return {
      statusFlags: {
        hasDrm: undefined,
      },

      tabs: [
        {id: 'videoSettings', label: 'Video settings', icon: 'crop'},
        {id: 'playerDetection', label: 'Player detection', icon: 'television-play'},
        {id: 'extensionSettings', label: 'Site and Extension options', icon: 'cogs' },
        {id: 'autodetectionSettings', label: 'Autodetection options', icon: ''},
        // {id: 'advancedOptions', label: 'Advanced options', icon: 'cogs' },
        {id: 'debugging', label: 'Debugging', icon: 'bug-outline' }
      ],
      selectedTab: 'videoSettings',
      BrowserDetect: BrowserDetect,
      preventClose: false,
      siteSettings: null,
    }
  },
  props: [
    'settings',
    'eventBus',
    'logger',
    'in-player',
    'site'
  ],
  computed: {
    // LPT: NO ARROW FUNCTIONS IN COMPUTED,
    // IS SUPER HARAM
    // THINGS WILL NOT WORK IF YOU USE ARROWS
    siteSupportLevel() {
      return (this.site && this.siteSettings) ? this.siteSettings.data.type || 'no-support' : 'waiting';
    }
  },
  created() {
    this.siteSettings = this.settings.getSiteSettings(this.site);
  },
  methods: {
    /**
     * Gets URL of the browser settings page (i think?)
     */
    getUrl(url) {
      return BrowserDetect.getURL(url);
    },
    selectTab(tab) {
      this.selectedTab = tab;
    },
    setPreventClose(bool) {
      this.preventClose = bool;
      this.$emit('preventClose', bool);
    }
  }
}
</script>
<style lang="scss" scoped>
@import '../res/css/uwui-base.scss';
@import '../res/css/colors.scss';
@import '../res/css/font/overpass.css';
@import '../res/css/font/overpass-mono.css';
@import '../res/css/common.scss';
@import '../src/res-common/_variables';

// .relative-wrapper {
//   position: relative;
//   width: 100%;
//   height: 100%;
// }

.tab-main {
  flex-grow: 1;
  flex-shrink: 1;
  overflow: hidden;
}

.site-support-info {
  display: flex;
  flex-direction: row;
  align-items: center;

  .site-support-site {
    font-size: 1.5em;
  }

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
      background-color: rgb(47, 47, 97);
      color: #fff;

      .mdi {
        fill: #fff !important;
      }
    }

    &.no-support {
      background-color: rgb(138, 65, 126);
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
}

.content {
  flex-grow: 1;

  .warning-area {
    flex-grow: 0;
    flex-shrink: 0;
  }

  .panel-content {
    flex-grow: 1;
    flex-shrink: 1;

    overflow-y: auto;
    padding: 1rem;
  }
}

.warning-box {
  background: rgb(255, 174, 107);
  color: #000;
  margin: 1rem;
  padding: 1rem;

  display: flex;
  flex-direction: row;
  align-items: center;

  .icon-container {
    margin-right: 1rem;
    flex-shrink: 0;
    flex-grow: 0;
  }

  a {
    color: rgba(0,0,0,0.7);
    cursor: pointer;
  }
}


.popup-panel {
  background-color: rgba(0,0,0,0.50);
  color: #fff;

  overflow-y: auto;

  .popup-window-header {
    padding: 1rem;
    background-color: rgba(5,5,5, 0.75);
  }
  .tab-row {
    background-color: rgba(11,11,11, 0.75);

    .tab {
      display: flex;
      flex-direction: row;
      align-items: center;

      padding: 2rem;
      font-size: 1.5rem;
      height: 4rem;

      border-bottom: 1px solid rgba(128, 128, 128, 0.5);
      border-top: 1px solid rgba(128, 128, 128, 0.5);
      opacity: 0.5;

      &:hover {
        opacity: 1;
      }
      &.active {
        opacity: 1.0;
        background-color: $primaryBg;
        color: rgb(255, 174, 107);
        border-bottom: 1px solid rgba(116, 78, 47, 0.5);
        border-top: 1px solid rgba(116, 78, 47, 0.5);
      }

      .icon-container {
        width: 64px;
        flex-grow: 0;
        flex-shrink: 0;
      }
      .label {
        flex-grow: 1;
        flex-shrink: 1;
        padding: 0 !important;
      }
    }
  }

  .popup-title, .popup-title h1 {
    font-size: 48px !important;
  }
}

pre {
  white-space: pre-wrap;
}


</style>
