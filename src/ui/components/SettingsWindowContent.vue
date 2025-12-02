<template>
  <div
    class="flex flex-col uw-clickable w-full h-full main-window relative"
  >
    <div class="flex flex-row">
      <div class="settings-categories">
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
            <div class="label">
              {{tab.label}}
            </div>
            <div class="icon-container">
              <mdicon
                v-if="tab.icon"
                :name="tab.icon"
                :size="32"
              />
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
          <OtherSiteSettings
            v-if="selectedTab === 'extensionSettings'"
            :settings="settings"
            :enableSettingsEditor="true"
          ></OtherSiteSettings>
          <KeyboardShortcutSettings
            v-if="selectedTab === 'keyboardShortcuts'"
            :settings="settings"
            :eventBus="eventBus"
          ></KeyboardShortcutSettings>


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
<script lang="ts">
import { defineComponent } from 'vue';
import OtherSiteSettings from '@components/ExtensionSettings/Panels/OtherSiteSettings.vue';
import KeyboardShortcutSettings from '@components/KeyboardShortcuts/KeyboardShortcutSettings.vue';

import DebugPanel from '../../csui/src/PlayerUiPanels/DebugPanel.vue'
import AutodetectionSettingsPanel from '../../csui/src/PlayerUiPanels/AutodetectionSettingsPanel.vue'
import PlayerDetectionPanel from '../../csui/src/PlayerUiPanels/PlayerDetectionPanel.vue'
import VideoSettings from '../../csui/src/PlayerUiPanels/VideoSettings.vue'
import BrowserDetect from '../../ext/conf/BrowserDetect'
import ChangelogPanel from '../../csui/src/PlayerUiPanels/ChangelogPanel.vue'
import AboutPanel from '@csui/src/PlayerUiPanels/AboutPanel.vue'
import PlayerUiSettings from '../../csui/src/PlayerUiPanels/PlayerUiSettings.vue'
import ResetBackupPanel from '../../csui/src/PlayerUiPanels/ResetBackupPanel.vue'
import SupportLevelIndicator from '@csui/src/components/SupportLevelIndicator.vue'

export default defineComponent({
  components: {
    OtherSiteSettings,
    KeyboardShortcutSettings,

    VideoSettings,
    PlayerDetectionPanel,
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
        {id: 'autodetectionSettings', label: 'Autodetection options', icon: 'auto-fix'},
        {id: 'playerUiSettings', label: 'UI settings', icon: 'movie-cog-outline' },
        {id: 'keyboardShortcuts', label: 'Keyboard shortcuts', icon: 'keyboard-outline' },
        {id: 'playerDetection', label: 'Player detection', icon: 'television-play'},
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
    'inPlayer',
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
    this.siteSettings = this.settings.getSiteSettings({site: this.site});
    this.tabs.find(x => x.id === 'changelog').highlight = !this.settings.active?.whatsNewChecked;

    this.eventBus?.subscribe(
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
    this.eventBus?.unsubscribeAll(this);
  },
  methods: {
    /**
     * Gets URL of the browser settings page (i think?)
     */
    getUrl(url) {
      return BrowserDetect.getURL(url);
    },
    selectTab(tab) {
      console.log("Selecting tab", tab);
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
});
</script>
<style lang="postcss" scoped>
@import '../../main.css'; /** postcss processor doesn't support aliases */

.settings-categories {
  @apply w-[20em] max-w-[20em] flex flex-col grow-0 shrink-0 mr-4 border-r border-r-stone-800 text-right;

  .tab {
    @apply flex flex-row gap-4 px-4 py-2 justify-end items-center
      text-[1.125em] text-stone-300 text-right font-mono
      cursor-pointer
      hover:bg-stone-800
      hover:text-primary-200;

      .label {
        @apply grow-0;
      }

    &.active {
      @apply !bg-transparent !text-primary-300 bg-gradient-to-r from-transparent to-black border-none hover:!text-primary-200;
    }
  }
}



pre {
  white-space: pre-wrap;
}
</style>
