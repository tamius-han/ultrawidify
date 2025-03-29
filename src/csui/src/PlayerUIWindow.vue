<template>
  <div
    class="popup-panel flex flex-col uw-clickable h-full main-window relative"
  >
    <div class="popup-window-header">
      <div class="header-title">
        <div class="popup-title">Ultrawidify <small>{{settings?.active?.version}} - {{BrowserDetect.processEnvChannel}}</small></div>
        <div class="site-support-info flex flex-row">
          <div class="site-support-site">{{site}}</div>
          <SupportLevelIndicator
            v-if="inPlayer"
            :siteSupportLevel="siteSupportLevel"
          >
          </SupportLevelIndicator>
        </div>
      </div>
      <div class="header-buttons">
        <div
          class="header-button close-button"
          @click="$emit('close')"
        >
          <mdicon name="close" :size="36"></mdicon>
        </div>
        <!-- <a >{{preventClose ? 'allow auto-close' : 'prevent auto-close'}}</a> -->
      </div>
    </div>

    <div class="tab-main flex flex-row">
      <div class="tab-row flex flex-col grow-0 shrink-0">
        <div
          v-for="tab of tabs"
          :key="tab.id"
        >
          <div
            v-if="!tab.hidden"
            class="tab"
            :class="{
              'active': tab.id === selectedTab,
              'highlight-tab': tab.highlight,
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
          <!-- <VideoSettings
            v-if="selectedTab === 'videoSettings'"
            :settings="settings"
            :siteSettings="siteSettings"
            :eventBus="eventBus"
            :site="site"
          ></VideoSettings> -->
          <PlayerDetectionPanel
            v-if="selectedTab === 'playerDetection'"
            :siteSettings="siteSettings"
            :eventBus="eventBus"
            :site="site"
          >
          </PlayerDetectionPanel>
          <PlayerUiSettings
            v-if="selectedTab === 'playerUiSettings'"
            :settings="settings"
            :siteSettings="siteSettings"
            :eventBus="eventBus"
          >
          </PlayerUiSettings>
          <BaseExtensionSettings
            v-if="selectedTab === 'extensionSettings'"
            :settings="settings"
            :siteSettings="siteSettings"
            :site="site"
            :enableSettingsEditor="true"
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
          <ChangelogPanel
            v-if="selectedTab === 'changelog'"
            :settings="settings"
          ></ChangelogPanel>
          <AboutPanel
            v-if="selectedTab === 'about'"
          >
          </AboutPanel>
          <!-- <ResetBackupPanel
            v-if="selectedTab === 'resetBackup'"
            :settings="settings"
          >
          </ResetBackupPanel> -->
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
import ChangelogPanel from './PlayerUiPanels/ChangelogPanel.vue'
import AboutPanel from '@csui/src/PlayerUiPanels/AboutPanel.vue'
import PlayerUiSettings from './PlayerUiPanels/PlayerUiSettings.vue'
import ResetBackupPanel from './PlayerUiPanels/ResetBackupPanel.vue'
import SupportLevelIndicator from '@csui/src/components/SupportLevelIndicator.vue'

export default {
  components: {
    VideoSettings,
    PlayerDetectionPanel,
    BaseExtensionSettings,
    AutodetectionSettingsPanel,
    DebugPanel,
    PlayerUiSettings,
    ChangelogPanel,
    AboutPanel,
    SupportLevelIndicator,
    ResetBackupPanel,
  },
  mixins: [],
  data() {
    return {
      statusFlags: {
        hasDrm: undefined,
      },

      tabs: [
        // {id: 'videoSettings', label: 'Video settings', icon: 'crop'},
        {id: 'extensionSettings', label: 'Site and Extension options', icon: 'cogs' },
        {id: 'playerUiSettings', label: 'UI and keyboard', icon: 'movie-cog-outline' },
        {id: 'playerDetection', label: 'Player detection', icon: 'television-play'},
        {id: 'autodetectionSettings', label: 'Autodetection options', icon: 'auto-fix'},
        // {id: 'advancedOptions', label: 'Advanced options', icon: 'cogs' },
        {id: 'changelog', label: 'What\'s new', icon: 'alert-decagram' },
        {id: 'about', label: 'About', icon: 'information-outline'},
        {id: 'debugging', label: 'Debugging', icon: 'bug-outline', hidden: true},
      ],
      selectedTab: 'extensionSettings',
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
    'site',
    'defaultTab'
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
    this.settings.listenAfterChange(this.setDebugTabVisibility);

    if (this.defaultTab) {
      this.selectedTab = this.defaultTab;
    }
    this.siteSettings = this.settings.getSiteSettings(this.site);
    this.tabs.find(x => x.id === 'changelog').highlight = !this.settings.active.whatsNewChecked;

    this.eventBus.subscribe(
      'uw-show-ui',
      {
        source: this,
        function: () => {
          if (this.inPlayer) {
            return; // show-ui is only intended for global overlay
          }
        },
      }
    )
    this.setDebugTabVisibility();
  },
  destroyed() {
    this.settings.removeListenerAfterChange(this.setDebugTabVisibility);
    this.eventBus.unsubscribeAll(this);
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
    },
    setDebugTabVisibility() {
      const debugTab = this.tabs.find( x => x.id === 'debugging');
      if (debugTab) {
        debugTab.hidden = !this.settings.active.ui.devMode;
      }
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


.site-support-info {
  display: flex;
  flex-direction: row;
  align-items: bottom;

  .site-support-site {
    font-size: 1.5em;
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
        opacity: 0.9;
        color: #eee;

        // .label {
        //   color: rgb(239, 192, 152);
        // }
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
