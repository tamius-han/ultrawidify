<template>
  <div>

    <!-- POPUPS -->
    <div v-if="anyOpenedPopups"
         class="popup-container"
    >
      <AddEditActionPopup v-if="editActionPopupVisible"
                          :settings="settings"
                          :actionIndex="editActionIndex"
                          @close="closePopups()"
      >
      </AddEditActionPopup>
    </div>

    <!-- ACTUAL PAGE -->
    <div class="flex flex-row"
         :class="{'blur': anyOpenedPopups}"
    >
    
      <div class="header flex flex-column">
        <div class="flex extension-name text-sink-anchor">
          <div class="text-sink title-sink-pad w100 text-center">
            Ultrawidify Vue
          </div>
        </div>
        <div class="flex flex-column menu">
          <div class="menu-item"
              :class="{'selected-tab': selectedTab === 'general'}"
              @click="setSelectedTab('general')"
              >
              General settings
          </div>
          <div class="menu-item"
              :class="{'selected-tab': selectedTab === 'autoar'}"
              @click="setSelectedTab('autoar')"
              >
              Autodetection
          </div>
          <div class="menu-item"
              :class="{'selected-tab': selectedTab === 'controls'}"
              @click="setSelectedTab('controls')"
              >
              Controls
          </div>
          <div class="menu-item"
              :class="{'selected-tab': selectedTab === 'about'}"
              @click="setSelectedTab('about')"
              >
              About
          </div>
          <div class="menu-item"
              :class="{'selected-tab': selectedTab === 'donate'}"
              @click="setSelectedTab('donate')"
              >
              Donate
          </div>
        </div>
      </div>

      <div class="flex content-area flex-column">
        <div class="flex content-title text-sink-anchor">
          <div class="text-sink title-sink-pad">
            {{selectedTabTitle}}
          </div>
        </div>
        <div class="content-content">
          <GeneralSettings v-if="settingsInitialized && selectedTab === 'general'"
                           :settings="settings"
          >
          </GeneralSettings>
          <AutodetectionSettings v-if="settingsInitialized && selectedTab === 'autoar'"
                                 :settings="settings"
          >
          </AutodetectionSettings>
          <ControlsSettings v-if="selectedTab === 'controls'"
                            :settings="settings"
                            @edit-event="showEditActionPopup($event)"
          >
          </ControlsSettings>

          <!-- Vice City/beggathon reference: https://youtu.be/Mn3YEJTSYs8?t=770 -->
        </div>
      </div>
    </div>
    
  </div>
</template>

<script>
import Debug from '../ext/conf/Debug.js';
import BrowserDetect from '../ext/conf/BrowserDetect.js';

import ExtensionConf from '../ext/conf/ExtensionConf.js';

import ObjectCopy from '../ext/lib/ObjectCopy.js';

import Settings from '../ext/lib/Settings.js';

import GeneralSettings from './general-settings';
import ControlsSettings from './controls-settings/controls-settings';
import AddEditActionPopup from './controls-settings/add-edit-action-popup';


export default {
  name: "Ultrawidify",
  data () {
    return {
      selectedTab: "general",
      selectedTabTitle: "General settings",
      settings: {},
      settingsInitialized: false,
      editActionPopupVisible: false,
      editActionIndex: -1,
      anyOpenedPopups: false,
    }
  },
  created () {
    this.settings = new Settings(undefined, this.updateSettings);
    this.settings.init();
  },
  components: {
    GeneralSettings,
    ControlsSettings,
    AddEditActionPopup,
  },
  methods: {
    setSelectedTab(newTab) {
      this.selectedTab = newTab;
      if (newTab === 'general') {
        this.selectedTabTitle = 'General settings';
      } else if (newTab === 'autoar') {
        this.selectedTabTitle = 'Advanced autodetection settings';
      } else if (newTab === 'controls') {
        this.selectedTabTitle = 'Controls';
      } else if (newTab === 'about') {
        this.selectedTabTitle = 'About';
      } else if (newTab === 'donate') {
        this.selectedTabTitle = 'Beggathon';
      }
    },
    updateSettings(newSettings) {
      this.settings = newSettings;
      this.settingsInitialized = true;
    },
    showEditActionPopup(event) {
      console.log("SHOW EDIT ACTION/APP:", event)
      this.editActionPopupVisible = true;
      this.anyOpenedPopups = true;
    },
    closePopups(){
      this.anyOpenedPopups = false;
      this.editActionPopupVisible = false;
    }
  }
};
</script>

<style src="../res/css/font/overpass.css"></style>
<style src="../res/css/font/overpass-mono.css"></style>
<style src="../res/css/flex.css"></style>
<style src="../res/css/common.scss"></style>
<style src="./options.scss"></style>

<style lang="scss" scoped>
.popup-container {
  position: fixed;
  width: 100%;
  height: 100%;
  z-index: 1000;
}

.blur {
  filter: blur(2px);
}
</style>
