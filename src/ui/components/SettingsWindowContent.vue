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
                  :class="{'active': suboption.id === selectedTab, 'disabled': suboption.disabled, 'hidden': suboption.visible === false }"
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
                  <div v-if="suboption.badgeCount" class="badge">
                    {{suboption.badgeCount >= 10 ? '...' : suboption.badgeCount}}
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
              <!-- <a>Learn more ...</a> -->
            </div>
          </div>

          <div
            v-if="settings.active.preventReload"
            class="info-box"
          >
            <div class="icon-container">
              <mdicon name="information" :size="24" />
            </div>
            <div>
              Some settings will only reply after page reload.
            </div>
          </div>
        </div>

        <div class="flex flex-col panel-content">
          <!-- Panel section -->
          <VideoSettings v-if="selectedTab === 'video-settings'"
            :settings="settings"
            :siteSettings="siteSettings"
            :eventBus="eventBus"
            :site="site"
          ></VideoSettings>

          <template v-if="[
            'site-extension-settings',
            'window.site-extension-settings',
            'embedded-extension-settings',
          ].includes(selectedTab)">
            <template v-if="!settings || !siteSettings">
              Loading settings ...

              <pre>         site: {{site}}</pre>
              <pre>     settings: {{!!settings}}</pre>
              <pre>site settings: {{!!siteSettings}}</pre>
            </template>
            <template v-else>
              <template v-if="settings && selectedTab === 'site-extension-settings'" >
                <h3>Settings for {{site?.host}}</h3>
                <SiteExtensionSettings
                  :settings="settings"
                  :siteSettings="siteSettings"
                  :isDefaultConfiguration="false"
                ></SiteExtensionSettings>
              </template>

              <template v-if="settings && selectedTab === 'window.site-extension-settings'" >
                <h3>Settings for {{site?.host}}</h3>
                <SiteExtensionSettings
                  :settings="settings"
                  :siteSettings="siteSettings"
                  :isDefaultConfiguration="false"
                ></SiteExtensionSettings>
              </template>

              <template v-if="settings && selectedTab === 'embedded-extension-settings'" >
                <h3>Settings for embedded sites</h3>
                <FrameSiteSettings
                  :parentHost="site?.host"
                  :hosts="site?.hostnames"
                  :settings="settings"
                ></FrameSiteSettings>
              </template>
            </template>
          </template>

          <template v-if="selectedTab === 'default-extension-settings'" >
            <template v-if="!settings">
              Loading settings ...
            </template>
            <template v-else>
              <h3>Default settings</h3>
              <SiteExtensionSettings
                :settings="settings"
                :siteSettings="globalSettings"
                :isDefaultConfiguration="true"
              ></SiteExtensionSettings>
            </template>
          </template>

          <OtherSiteSettings
            v-if="selectedTab === 'website-extension-settings'"
            :role="role"
            :settings="settings"
          ></OtherSiteSettings>

<!--
          <PlayerElementSettings
            v-if="selectedTab === 'settings.player-element-settings'"
            :settings="settings"
            :eventBus="eventBus"
          >
          </PlayerElementSettings>

          <PlayerElementWindow
            v-if="selectedTab === 'window.player-element-settings'"
            :settings="settings"
            :eventBus="eventBus"
          ></PlayerElementWindow> -->

          <template v-if="selectedTab === 'window.player-element-advanced-settings'">
            <PlayerSelectorAdvancedForm
              v-if="settings && siteSettings"
              :settings="settings"
              :siteSettings="siteSettings"
            ></PlayerSelectorAdvancedForm>
            <template v-else>Loading site settings, please wait ...</template>
          </template>

          <template v-if="selectedTab === 'window.player-element-settings'">
            <PlayerSelectorSimple
              v-if="settings && siteSettings"
              :site="site"
              :eventBus="eventBus"
              :settings="settings"
              :siteSettings="siteSettings"
            ></PlayerSelectorSimple>
            <template v-else>Loading site settings, please wait ...</template>
          </template>


          <AutodetectionSettings
            v-if="selectedTab === 'autodetectionSettings'"
            :settings="settings"
            :siteSettings="siteSettings"
            :eventBus="eventBus"
            :site="site"
          >
          </AutodetectionSettings>
          <UISettings
            v-if="selectedTab === 'ui-settings'"
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

          <AfterUpdate
            v-if="selectedTab === 'updated'"
            :settings="settings"
          >
          </AfterUpdate>

          <WhatsNew
            v-if="selectedTab === 'changelog'"
            :settings="settings"
          ></WhatsNew>
          <About
            v-if="selectedTab === 'about'"
            :settings="settings"
          >
          </About>


          <ImportExportSettings v-if="selectedTab === 'import-export-settings'"
            :settings="settings"
          >
          </ImportExportSettings>

          <Debugging
            v-if="selectedTab === 'debugging'"
            :settings="settings"
            :eventBus="eventBus"
            :site="site"
          ></Debugging>

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
import VideoSettings from '@components/segments/VideoSettings/VideoSettings.vue';
import OtherSiteSettings from '@components/segments/ExtensionSettings/Panels/OtherSiteSettings.vue';
import PlayerElementSettings from '@components/segments/PlayerElementSelection/PlayerElementSettings.vue';
import PlayerElementWindow from '@components/segments/PlayerElementSelection/PlayerElementWindow.vue';
import AutodetectionSettings from '@components/segments/AutodetectionSettings/AutodetectionSettings.vue';
import UISettings from '@components/segments/UISettings/UISettings.vue';
import KeyboardShortcutSettings from '@components/segments/KeyboardShortcuts/KeyboardShortcutSettings.vue';
import SiteExtensionSettings from '@components/segments/ExtensionSettings/Panels/SiteExtensionSettings.vue';
import FrameSiteSettings from '@components/segments/ExtensionSettings/Panels/FrameSiteSettings.vue';
import Debugging from '@components/segments/Debugging/Debugging.vue';
import ImportExportSettings from '@components/segments/ImportExportSettings/ImportExportSettings.vue';
import PlayerSelectorAdvancedForm from '@components/segments/PlayerElementSelection/Panels/PlayerSelectorAdvancedForm.vue';
import PlayerSelectorSimple from '@components/segments/PlayerElementSelection/Panels/PlayerSelectorSimple.vue';

import AfterUpdate from '@components/segments/AfterUpdate/AfterUpdate.vue';

import WhatsNew from '@components/segments/ExtensionInfo/WhatsNew.vue';
import About from '@components/segments/ExtensionInfo/About.vue';

// not component:
import BrowserDetect from '@src/ext/conf/BrowserDetect'
import WarningsMixin from '../utils/mixins/WarningsMixin.vue';


const AVAILABLE_TABS = {
  'video-settings': {
    id: 'video-settings', label: 'Video settings', icon: 'crop',
  },
  'site-extension-settings': {
    id: 'site-extension-settings', label: 'Site and Extension options', icon: 'cogs',
    children: [
      { id: 'site-extension-settings', label: 'For this site', },
      { id: 'embedded-extension-settings', label: 'For embedded sites', disabled: true, badgeCount: 0, },
      { id: 'default-extension-settings', label: 'Default settings' }
    ]
  },
  'window.site-extension-settings': {
    id: 'window.site-extension-settings', label: 'Site and Extension options', icon: 'cogs',
    children: [
      { id: 'window.site-extension-settings', label: 'For this site', },
      { id: 'window.parent-site-extension-settings', label: 'For parent page', visible: false,},
      { id: 'embedded-extension-settings', label: 'For embedded sites', disabled: true, visible: true, badgeCount: 0, },
      { id: 'default-extension-settings', label: 'Default settings' },
      { id: 'website-extension-settings', label: 'Website exceptions' },
    ]
  },
  'default-extension-settings': {
      id: 'default-extension-settings', label: 'Site and Extension options', icon: 'cogs',
      children: [
        { id: 'default-extension-settings', label: 'Default settings' },
        { id: 'website-extension-settings', label: 'Website exceptions', },
      ]
   },
  'window.player-element-settings': {
    id: 'window.player-element-settings', label: 'Video player options', icon: 'play-box-edit-outline',
    children: [
      {id: 'window.player-element-settings', label: 'Video player picker'},
      {id: 'window.player-element-advanced-settings', label: 'Advanced options'},
    ],
  },
  'autodetectionSettings': {id: 'autodetectionSettings', label: 'Autodetection options', icon: 'auto-fix'},
  'ui-settings': {id: 'ui-settings', label: 'UI settings', icon: 'movie-cog-outline' },
  'keyboardShortcuts': {id: 'keyboardShortcuts', label: 'Keyboard shortcuts', icon: 'keyboard-outline' },
  'settings.player-element-settings': {id: 'settings.player-element-settings', label: 'Player detection', icon: 'television-play'},

  'installed': { id: 'installed', label: 'Update completed', icon: 'monitor-arrow-down-variant'},
  'updated': { id: 'updated', label: 'Update completed', icon: 'update'},

  'changelog': {id: 'changelog', label: 'What\'s new', icon: 'alert-decagram' },
  'about': {id: 'about', label: 'About', icon: 'information-outline'},
  'import-export-settings': { id: 'import-export-settings', label: 'Import & export settings', icon: 'file-export-outline'},
  'debugging': {id: 'debugging', label: 'Debugging', icon: 'bug-outline'}
};

const TAB_LOADOUT = {
  'settings': [
    'default-extension-settings',
    // 'settings.player-element-settings',
    'autodetectionSettings',
    'ui-settings',
    'keyboardShortcuts',
    'changelog',
    'about',
    'import-export-settings',
    'debugging',
  ],
  'ui-window': [
    'window.site-extension-settings',
    'window.player-element-settings',
    'autodetectionSettings',
    'ui-settings',
    'keyboardShortcuts',
    'changelog',
    'about',
    'import-export-settings',
    'debugging',
  ],
  'updated': [
    'updated',
    'changelog',
    'about',
  ],
  'popup': [
    'video-settings',
    'site-extension-settings',
    'changelog',
    'about'
  ],
}

const DEFAULT_TABS = {
  settings: 'default-extension-settings',
  updated: 'updated',
  popup: 'video-settings',
}

export default defineComponent({
  components: {
    VideoSettings,
    OtherSiteSettings,
    PlayerElementSettings,
    PlayerElementWindow,
    PlayerSelectorAdvancedForm,
    PlayerSelectorSimple,
    AutodetectionSettings,
    KeyboardShortcutSettings,
    UISettings,
    SiteExtensionSettings,
    FrameSiteSettings,
    ImportExportSettings,
    Debugging,

    AfterUpdate,

    WhatsNew,
    About,
  },
  mixins: [
    WarningsMixin
  ],
  data() {
    return {
      statusFlags: {
        hasDrm: undefined,
      },

      tabs: [

      ],
      selectedTab: undefined,
      BrowserDetect: BrowserDetect,
      preventClose: false,
      globalSettings: null,
    }
  },
  props: [
    'role',
    'initialPath',
    'settings',
    'siteSettings',
    'eventBus',
    'logger',
    'inPlayer',
    'site',
  ],
  watch: {
    'initialPath': function (newVal) {
      this.setInitialPath(newVal);
    },
    'site': function (newVal) {
      this.updateSite(newVal);
    }
  },
  computed: {
    // LPT: NO ARROW FUNCTIONS IN COMPUTED,
    // IS SUPER HARAM
    // THINGS WILL NOT WORK IF YOU USE ARROWS
    siteSupportLevel() {
      return (this.site && this.siteSettings) ? this.siteSettings.data.type || 'no-support' : 'waiting';
    },
  },
  created() {
    try {
      this.generateTabs();
      this.settings.listenAfterChange(this.setDebugTabVisibility);

      this.setInitialPath();
      const changelogTab  = this.tabs.find(x => x.id === 'changelog');
      if (changelogTab) {
        changelogTab.highlight = !this.settings.active?.whatsNewChecked;
      }

      this.globalSettings = this.settings.getSiteSettings({site: '@global'});
      this.setDebugTabVisibility();
    } catch (e) {
      console.error(`[ultrawidify|SettingsWindowContent.vue] created() crashed. Error:`, e);
    }

  },
  destroyed() {
    this.settings.removeListenerAfterChange(this.setDebugTabVisibility);
    this.eventBus?.unsubscribeAll(this);
  },
  methods: {
    /**
     * Regenerates relevant tabs
     */
    updateSite(newSite: {host: string, hostnames: string[],}) {
      this.generateTabs(newSite);

      this.$nextTick( () => this.$forceUpdate());
    },
    /**
     * Gets URL of the browser settings page (i think?)
     */
    getUrl(url) {
      return BrowserDetect.getURL(url);
    },
    generateTabs(site = this.site) {
      const tabs = [];
      for (const tab of TAB_LOADOUT[this.role]) {
        if (!AVAILABLE_TABS[tab]) {
          continue;
        } else {
          if (tab === 'site-extension-settings') {
            const frames = AVAILABLE_TABS[tab].children?.find(x => x.id === 'embedded-extension-settings');
            if (frames) {
              let frameCount = site?.hostnames?.length;

              if (site?.hostnames?.includes(site.host)) {
                frameCount--;
              }

              frames.badgeCount = frameCount;
              frames.disabled = !frameCount;
            }
          }
          tabs.push(AVAILABLE_TABS[tab]);
        }
      }
      this.tabs = tabs;
      this.selectedTab = this.selectedTab ?? DEFAULT_TABS[this.role];
    },
    setInitialPath(path: string[] = this.initialPath) {
      console.log('setting initial path:', this.initialPath)
      if (path && path.length) {
        this.selectedTab = path[0];
        this.$emit('debugStatusChanged', this.selectedTab === 'debugging');
      }
    },
    selectTab(tab) {
      console.log("Selecting tab", tab);
      this.selectedTab = tab;
      this.$emit('debugStatusChanged', tab === 'debugging');
      window.location.hash = `#${this.role}/${this.selectedTab}`;
    },
    setPreventClose(bool) {
      this.preventClose = bool;
      this.$emit('preventClose', bool);
    },
    setDebugTabVisibility() {
      const debugTab = this.tabs.find( x => x.id === 'debugging');
      if (debugTab) {
        // debugTab.hidden = !this.settings.active.ui.devMode;
      }
    },


  }
});
</script>
<style lang="postcss" scoped>
@import '@src/main.css'; /** postcss processor doesn't support aliases */

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
      &.disabled {
        @apply pointer-events-none;
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
        uppercase text-stone-400/75 font-mono
        relative
        hover:bg-stone-800
        hover:text-primary-200
        hover:border-r-stone-600;

      &.active {
        @apply !bg-transparent !text-primary-300 bg-gradient-to-r from-transparent to-black hover:!text-primary-200;
      }
      &.disabled {
        @apply pointer-events-none text-stone-600/75;
      }
      .badge {
        @apply absolute right-[0.25rem] bottom-0 w-4 h-4 text-stone-950 bg-primary-300 rounded flex justify-center items-center font-bold text-[0.8rem];
      }

      &:last-child {
        @apply
         mb-2;
      }
    }
  }
}



pre {
  white-space: pre-wrap;
}
</style>
