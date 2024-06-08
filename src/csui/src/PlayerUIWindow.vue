<template>
  <div
    class="popup-panel flex flex-col uw-clickable h-full"
  >
    <div class="popup-window-header">
      <div class="header-title">
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
      </div>
      <div class="header-buttons">
        <div
          class="header-button"
          :class="{'button-active': preventClose}"
          @click="setPreventClose(!preventClose)"
        >
          <mdicon v-if="!preventClose" name="pin-outline" :size="32" />
          <mdicon v-else name="pin" :size="32" />
        </div>
        <dv
          class="header-button close-button"
          @click="$emit('close')"
        >
          <mdicon name="close" :size="36"></mdicon>
        </dv>
        <!-- <a >{{preventClose ? 'allow auto-close' : 'prevent auto-close'}}</a> -->
      </div>
    </div>

    <div class="tab-main flex flex-row">
      <div class="tab-row flex flex-col grow-0 shrink-0">
        <div
          v-for="tab of tabs"
          :key="tab.id"
          class="tab"
          :class="{
            'active': tab.id === selectedTab,
            'highlight-tab': tab.hasChanges,
          }"
          @click="selectTab(tab.id)"
        >
          <div class="icon-container">
            <mdicon
              v-if="tab.icon"
              :name="tab.icon"
              :size="32"
            />
          </div>
          <div class="label">
            {{tab.label}}
          </div>
        </div>
      </div>
      <div class="content flex flex-col">
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
          <AboutPanel
            v-if="selectedTab === 'about'"
          >
          </AboutPanel>
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
import AboutPanel from './PlayerUiPanels/AboutPanel.vue'

export default {
  components: {
    VideoSettings,
    PlayerDetectionPanel,
    BaseExtensionSettings,
    AutodetectionSettingsPanel,
    DebugPanel,
    AboutPanel
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
        // {id: 'autodetectionSettings', label: 'Autodetection options', icon: ''},
        // {id: 'advancedOptions', label: 'Advanced options', icon: 'cogs' },
        // {id: 'debugging', label: 'Debugging', icon: 'bug-outline' }
        {id: 'changelog', label: 'What\'s new', icon: 'information-box-outline' },
        {id: 'about', label: 'About', icon: 'star-four-points-circle'}
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

    this.eventBus.subscribe(
      'uw-show-ui',
      () => {
        if (this.inPlayer) {
          return; // show-ui is only intended for global overlay
        }
      }
    )
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

.tab-row {
  width: 22rem;
  flex-grow: 0;
  flex-shrink: 0;
}

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
      background-color: rgb(85, 85, 179);
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

    display: flex;
    flex-direction: row;

    .header-title {
      flex: 1 1;
    }
    .header-buttons {
      flex: 0 0;
      display: flex;
      flex-direction: row;

      .header-button {
        cursor: pointer;
        border-radius: 50%;
        width: 48px;
        height: 48px;
        display: flex;
        justify-content: center;
        align-items: center;

        &.button-active {
          background-color: #fa6;
          color: #000;

          &:hover {
            color: #ccc;
          }
        }

        &.close-button {
          color: #f00;
        }

        &:hover {
          color: #fa6;
        }
      }
    }
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

      &.highlight-tab {
        color: #eee;

        .label {
          color: rgb(255, 174, 107);
        }
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
