<template>
  <div v-if="settingsInitialized">

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
      <ConfirmPopup v-if="confirmationDialogText"
                    :dialogText="confirmationDialogText"
                    @close="closePopups()"
                    @confirm="confirm()"
      />
    </div>

    <!-- ACTUAL PAGE -->
    <div class="flex flex-row"
         :class="{'blur': anyOpenedPopups}"
    >
    
      <div class="header flex flex-column">
        <div class="flex extension-name text-sink-anchor">
          <div class="text-sink title-sink-pad w100 text-center">
            Ultrawidify
          </div>
        </div>

        <!-- MENU ITEMS HERE -->
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
          <div class="menu-item experimental"
              :class="{'selected-tab': selectedTab === 'controls'}"
              @click="setSelectedTab('controls')"
              >
              Actions &amp; shortcuts
          </div>
          <div class="menu-item"
              :class="{'selected-tab': selectedTab === 'txtconf'}"
              @click="setSelectedTab('txtconf')"
              >
              Super advanced settings
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

        <!-- MAIN PAGE HERE -->
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
                            @remove-event="showRemoveActionPopup($event)"
          >
          </ControlsSettings>
          <SuperAdvancedSettings v-if="selectedTab === 'txtconf'"
                                 :settings="settings"
          ></SuperAdvancedSettings>
          <About v-if="selectedTab === 'about'">
          </About>
          <Donate v-if="selectedTab === 'donate'" />
          <!-- Vice City/beggathon reference: https://youtu.be/Mn3YEJTSYs8?t=770 -->
        </div>
      </div>
    </div>
    
  </div>
</template>

<script>
import Donate from '../common/misc/Donate.vue';
import SuperAdvancedSettings from './SuperAdvancedSettings.vue';
import Debug from '../ext/conf/Debug';
import BrowserDetect from '../ext/conf/BrowserDetect';
import ExtensionConf from '../ext/conf/ExtensionConf';
import ObjectCopy from '../ext/lib/ObjectCopy';
import Settings from '../ext/lib/Settings';
import GeneralSettings from './GeneralSettings';
import ControlsSettings from './controls-settings/ControlsSettings';
import AddEditActionPopup from './controls-settings/AddEditActionPopup';
import ConfirmPopup from './common/ConfirmationPopup';
import About from './about'
import AutodetectionSettings  from './AutodetectionSettings';
// import SuperAdvancedSettings from './'
import Logger from '../ext/lib/Logger';

export default {
  name: "Ultrawidify",
  data () {
    return {
      selectedTab: "general",
      selectedTabTitle: "General settings",
      settings: {},
      logger: {},
      settingsInitialized: false,
      editActionPopupVisible: false,
      editActionIndex: -1,
      anyOpenedPopups: false,
      removeConfirmationDialog: '',
      confirmationDialogText: '',
      messages: {
        removeAction: "Are you sure you want to remove this action?"
      },
    }
  },
  async created () {
    this.logger = new Logger();
    await this.logger.init({
        allowLogging: true,
    });

    this.settings = new Settings({updateCallback: this.updateSettings, logger: this.logger});
    await this.settings.init();
    
    this.settingsInitialized = true;
  },
  components: {
    GeneralSettings,
    ControlsSettings,
    AddEditActionPopup,
    About,
    AutodetectionSettings,
    ConfirmPopup,
    SuperAdvancedSettings,
    Donate,
  },
  methods: {
    setSelectedTab(newTab) {
      this.selectedTab = newTab;
      if (newTab === 'general') {
        this.selectedTabTitle = 'General settings';
      } else if (newTab === 'autoar') {
        this.selectedTabTitle = 'Advanced autodetection settings';
      } else if (newTab === 'controls') {
        this.selectedTabTitle = 'Actions';
      } else if (newTab === 'txtconf') {
        this.selectedTabTitle = 'Super advanced settings';
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
      this.editActionPopupVisible = true;
      this.editActionIndex = event;
      this.anyOpenedPopups = true;
    },
    showRemoveActionPopup(indexToRemove) {
      this.editActionIndex = indexToRemove;
      this.anyOpenedPopups = true;
      this.confirmationDialogText = this.messages.removeAction;
    },
    closePopups(){
      this.anyOpenedPopups = false;
      this.editActionPopupVisible = false;
      this.confirmationDialogText = '';
    },
    confirm(){
      if (this.confirmationDialogText === this.messages.removeAction) {
        this.settings.active.actions.splice(this.editActionIndex, 1);
        this.settings.save();
      }


      this.closePopups();
    }
  }
};
</script>

<style src="../res/css/font/overpass.css"></style>
<style src="../res/css/font/overpass-mono.css"></style>
<style src="../res/css/flex.scss"></style>
<style src="../res/css/common.scss"></style>
<style src="./options.scss"></style>

<style lang="scss" scoped>
.popup-container {
  position: fixed;
  width: 100%;
  height: 100%;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-content: center;
}

.blur {
  filter: blur(2px);
}
</style>
