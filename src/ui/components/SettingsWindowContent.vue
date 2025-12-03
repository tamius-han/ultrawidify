<template>
  <div
    class="grow shrink w-full h-full flex flex-col uw-clickable main-window relative overflow-hidden"
  >
    <div class="flex flex-row w-full h-full overflow-hidden">
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
      <div class="grow content flex flex-col overflow-auto pr-4 pb-12">
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
            v-if="selectedTab === 'video-settings'"
            :settings="settings"
            :siteSettings="siteSettings"
            :eventBus="eventBus"
            :site="site"
          ></VideoSettings>
          <OtherSiteSettings
            v-if="selectedTab === 'extensionSettings'"
            :settings="settings"
            :enableSettingsEditor="true"
          ></OtherSiteSettings>
          <AutodetectionSettings
            v-if="selectedTab === 'autodetectionSettings'"
            :settings="settings"
            :siteSettings="siteSettings"
            :eventBus="eventBus"
            :site="site"
          >
          </AutodetectionSettings>
          <UISettings
            v-if="selectedTab === 'uiSettings'"
            :settings="settings"
            :siteSettings="siteSettings"
            :eventBus="eventBus"
          >
          </UISettings>

          <KeyboardShortcutSettings
            v-if="selectedTab === 'keyboardShortcuts'"
            :settings="settings"
            :eventBus="eventBus"
          ></KeyboardShortcutSettings>


          <WhatsNew
            v-if="selectedTab === 'changelog'"
            :settings="settings"
          ></WhatsNew>
          <About
            v-if="selectedTab === 'about'"
            :settings="settings"
          >
          </About>



          <PlayerDetectionPanel
            v-if="selectedTab === 'playerDetection'"
            :siteSettings="siteSettings"
            :eventBus="eventBus"
            :site="site"
          >
          </PlayerDetectionPanel>

          <DebugPanel
            v-if="selectedTab === 'debugging'"
            :settings="settings"
            :eventBus="eventBus"
            :site="site"
          ></DebugPanel>

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
import VideoSettings from '@components/VideoSettings/VideoSettings.vue';
import OtherSiteSettings from '@components/ExtensionSettings/Panels/OtherSiteSettings.vue';
import AutodetectionSettings from '@components/AutodetectionSettings/AutodetectionSettings.vue';
import UISettings from '@components/UISettings/UISettings.vue';
import KeyboardShortcutSettings from '@components/KeyboardShortcuts/KeyboardShortcutSettings.vue';

import WhatsNew from '@components/ExtensionInfo/WhatsNew.vue';
import About from '@components/ExtensionInfo/About.vue';

import DebugPanel from '../../csui/src/PlayerUiPanels/DebugPanel.vue'
import PlayerDetectionPanel from '../../csui/src/PlayerUiPanels/PlayerDetectionPanel.vue'
import BrowserDetect from '../../ext/conf/BrowserDetect'
import ChangelogPanel from '../../csui/src/PlayerUiPanels/ChangelogPanel.vue'
import AboutPanel from '@csui/src/PlayerUiPanels/AboutPanel.vue'
import ResetBackupPanel from '../../csui/src/PlayerUiPanels/ResetBackupPanel.vue'
import SupportLevelIndicator from '@csui/src/components/SupportLevelIndicator.vue'


const AVAILABLE_TABS = {
  'video-settings': {id: 'video-settings', label: 'Video settings', icon: 'crop'},
  'site-extension-settings': {id: 'extensionSettings', label: 'Site and Extension options', icon: 'cogs' },
  'extensionSettings': {id: 'extensionSettings', label: 'Site and Extension options', icon: 'cogs' },
  'siteSettings': {id: 'extensionSettings', label: 'Site and Extension options', icon: 'cogs' },
  'autodetectionSettings': {id: 'autodetectionSettings', label: 'Autodetection options', icon: 'auto-fix'},
  'uiSettings': {id: 'uiSettings', label: 'UI settings', icon: 'movie-cog-outline' },
  'keyboardShortcuts': {id: 'keyboardShortcuts', label: 'Keyboard shortcuts', icon: 'keyboard-outline' },
  'playerDetection': {id: 'playerDetection', label: 'Player detection', icon: 'television-play'},
  'changelog': {id: 'changelog', label: 'What\'s new', icon: 'alert-decagram' },
  'about': {id: 'about', label: 'About', icon: 'information-outline'},
  'debugging': {id: 'debugging', label: 'Debugging', icon: 'bug-outline', hidden: true}
};

const TAB_LOADOUT = {
  'settings': [
    'extensionSettings',
    'autodetectionSettings',
    'uiSettings',
    'keyboardShortcuts',
    'changelog',
    'about',
    'debugging',
  ],
  'popup': [
    'video-settings',
    'site-extension-settings',
    'changelog',
    'about'
  ],
}

export default defineComponent({
  components: {
    VideoSettings,
    OtherSiteSettings,
    AutodetectionSettings,
    KeyboardShortcutSettings,
    UISettings,

    WhatsNew,
    About,

    PlayerDetectionPanel,
    DebugPanel,
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
        // // {id: 'videoSettings', label: 'Video settings', icon: 'crop'},
        // {id: 'extensionSettings', label: 'Site and Extension options', icon: 'cogs' },
        // {id: 'autodetectionSettings', label: 'Autodetection options', icon: 'auto-fix'},
        // {id: 'uiSettings', label: 'UI settings', icon: 'movie-cog-outline' },
        // {id: 'keyboardShortcuts', label: 'Keyboard shortcuts', icon: 'keyboard-outline' },
        // {id: 'playerDetection', label: 'Player detection', icon: 'television-play'},
        // // {id: 'advancedOptions', label: 'Advanced options', icon: 'cogs' },
        // {id: 'changelog', label: 'What\'s new', icon: 'alert-decagram' },
        // {id: 'about', label: 'About', icon: 'information-outline'},
        // {id: 'debugging', label: 'Debugging', icon: 'bug-outline', hidden: true},
      ],
      selectedTab: 'extensionSettings',
      BrowserDetect: BrowserDetect,
      preventClose: false,
      siteSettings: null,
    }
  },
  props: [
    'role',
    'initialPath',
    'settings',
    'eventBus',
    'logger',
    'inPlayer',
    'site',
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
    this.generateTabs();
    this.settings.listenAfterChange(this.setDebugTabVisibility);

    if (this.initialPath && this.initialPath.length) {
      this.selectedTab = this.initialPath[0];
    }
    const changelogTab  = this.tabs.find(x => x.id === 'changelog');
    if (changelogTab) {
      changelogTab.highlight = !this.settings.active?.whatsNewChecked;
    }

    this.siteSettings = this.settings.getSiteSettings({site: this.site});
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
    generateTabs() {
      const tabs = [];
      for (const tab of TAB_LOADOUT[this.role]) {
        if (!AVAILABLE_TABS[tab]) {
          console.warn('[uw:SettingsWindowContent] tab', tab, 'is not present in available tabs:', AVAILABLE_TABS, '— tabs for role', this.role, TAB_LOADOUT[this.role]);
          continue;
        } else {
          tabs.push(AVAILABLE_TABS[tab]);
        }
      }
      this.tabs = tabs;
    },
    selectTab(tab) {
      console.log("Selecting tab", tab);
      this.selectedTab = tab;
      window.location.hash = `#${this.role}/${this.selectedTab}`;
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
    },


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
      border-r-2 border-r-transparent
      hover:bg-stone-800
      hover:text-primary-200
      hover:border-r-stone-600;

      .label {
        @apply grow-0;
      }

    &.active {
      @apply !bg-transparent !text-primary-300 bg-gradient-to-r from-transparent to-black hover:!text-primary-200 border-r-primary-400;
    }
  }
}



pre {
  white-space: pre-wrap;
}
</style>
