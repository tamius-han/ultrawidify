<template>
  <div
    class="grow shrink w-full h-full flex flex-col uw-clickable main-window relative overflow-hidden"
  >
    <div class="flex flex-row w-full h-full overflow-hidden">
      <div class="settings-categories">
        <div class="tab-column">
          <div
            v-for="tab of tabs"
            :key="tab.id"
          >
            <div
              v-if="!tab.hidden"
              class="tab"
              :class="{
                'active': tab.id === selectedTab || tab.children?.find(x => x.id === selectedTab),
                'highlight-tab': tab.highlight,
              }"
            >
              <div
                class="main-tab"
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
              <div v-if="tab.children && (tab.id === selectedTab ||  tab.children?.find(x => x.id === selectedTab))" class="suboptions flex flex-col">
                <div
                  v-for="suboption of tab.children"
                  :key="suboption.id"
                  class="suboption"
                  :class="{'active': suboption.id === selectedTab}"
                  @click="selectTab(suboption.id)"
                >
                  <div class="label">
                    {{suboption.label}}
                  </div>
                  <div class="icon-container">
                    <mdicon
                      v-if="suboption.icon"
                      :name="suboption.icon"
                      :size="32"
                    />
                  </div>
                </div>
              </div>
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

        <div class="flex flex-col panel-content">
          <!-- Panel section -->
          <VideoSettings
            v-if="selectedTab === 'video-settings'"
            :settings="settings"
            :siteSettings="siteSettings"
            :eventBus="eventBus"
            :site="site"
          ></VideoSettings>

          <template
            v-if="settings && selectedTab === 'site-extension-settings'"
          >
            <h3>Settings for {{site?.host}}</h3>
            <SiteExtensionSettings
              :settings="settings"
              :siteSettings="siteSettings"
              :isDefaultConfiguration="false"
            ></SiteExtensionSettings>

            <pre>{{JSON.stringify(siteSettings.data, null, 2)}}</pre>
          </template>

          <template
            v-if="settings && selectedTab === 'embedded-extension-settings'"
          >
            <h3>Settings for embedded sites</h3>
            <FrameSiteSettings
              :parentHost="site?.host"
              :hosts="site?.hostnames"
              :settings="settings"
            ></FrameSiteSettings>
          </template>


          <template
            v-if="settings && selectedTab === 'default-extension-settings'"
          >
            <h3>Default settings</h3>
            <SiteExtensionSettings
              :settings="settings"
              :siteSettings="siteSettings"
              :isDefaultConfiguration="false"
            ></SiteExtensionSettings>
          </template>

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
import SiteExtensionSettings from '@components/ExtensionSettings/Panels/SiteExtensionSettings.vue';
import FrameSiteSettings from '@components/ExtensionSettings/Panels/FrameSiteSettings.vue';

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
  'video-settings': {
    id: 'video-settings', label: 'Video settings', icon: 'crop',
  },
  'site-extension-settings': {
    id: 'site-extension-settings', label: 'Site and Extension options', icon: 'cogs',
    children: [
      { id: 'site-extension-settings', label: 'For this site', },
      { id: 'embedded-extension-settings', label: 'For embedded sites' },
      { id: 'default-extension-settings', label: 'Default settings' }
    ]
  },
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
    SiteExtensionSettings,
    FrameSiteSettings,

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
  watch: {
    'initialPath': function (newVal) {
      this.setInitialPath(newVal);
    }
  },
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

    this.setInitialPath();
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
    setInitialPath(path: string[] = this.initialPath) {
      console.log('setting initial path:', this.initialPath)
      if (path && path.length) {
        this.selectedTab = path[0];
      }
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
  @apply
    relative
    w-[4.5em] popup:w-[18em] window:w-[24em]
    mr-[1em]
    grow-0 shrink-0 flex flex-col

    text-right;

  .tab-column {
    @apply absolute popup:relative top-0 right-0
      w-[18em] window:w-full h-full z-[1000]
      hover:bg-stone-950 popup:hover:bg-transparent
      border-r border-r-stone-800
      hover:translate-x-[calc(100%-4.5em)] popup:hover:translate-x-0
      transition-transform duration-200;

    .tab {
      @apply
        flex flex-col
        cursor-pointer
        border-r-2 border-r-transparent
        border-r-primary-400;

      &.active {
        .main-tab {
          @apply !bg-transparent !text-primary-300 bg-gradient-to-r from-transparent to-black hover:!text-primary-200 ;
        }
      }
    }

    .main-tab {
      @apply
        px-[1em] py-[0.5em]
        flex flex-row gap-4 justify-end items-center
        text-[1.125em] text-stone-300 text-right font-mono
        cursor-pointer
        hover:bg-stone-800
        hover:text-primary-200
        hover:border-r-stone-600;

        .label {
          @apply grow-0;
        }
    }

    .suboption {
      @apply
        px-6 py-2
        text-[1.125rem] text-stone-500 font-mono
        hover:bg-stone-800
        hover:text-primary-200
        hover:border-r-stone-600;

      &.active {
        @apply !bg-transparent !text-primary-300 bg-gradient-to-r from-transparent to-black hover:!text-primary-200;
      }
    }
  }
}



pre {
  white-space: pre-wrap;
}
</style>
