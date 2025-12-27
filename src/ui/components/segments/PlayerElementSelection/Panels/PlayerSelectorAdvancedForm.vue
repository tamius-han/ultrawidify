<template>
  <!-- ADVANCED OPTIONS -->
  <div class="flex flex-col gap-2">
    <div class="flex flex-row gap-2 justify-end">
      <button @click="openSelectSnapshotDialog()">Load existing config</button>
      <UploadJsonFileButton
        @importedJson="handleImportedSettings"
        @error="handleSettingsImportError"
      >
        Import settings
      </UploadJsonFileButton>
      <button>Export config</button>
    </div>

    <div v-if="loaded" class="w-[690px] max-w-full">

      <div v-if="DOMConfigName" class="field">
        <div class="label">Current preset name:</div>
        <div class="flex flex-row gap-2 items-center">
          {{DOMConfigName}}
          <SupportLevelIndicator
            :siteSupportLevel="DOMConfigData.type"
            :disableTooltip="true"
          ></SupportLevelIndicator>
        </div>

      </div>

      <!-- #region player element detection -->
      <div class="field">
        <div class="label">Player detection:</div>
        <div class="select">
          <select v-model="DOMConfigData.elements.player.detectionMode">
            <option :value="PlayerDetectionMode.Auto">Automatic</option>
            <option :value="PlayerDetectionMode.AncestorIndex">Fixed player container offset</option>
            <option :value="PlayerDetectionMode.QuerySelectors">Query selectors</option>
          </select>
        </div>
      </div>

      <!-- Player container offset ( ancestor index field -->
      <template v-if="DOMConfigData.elements.player.detectionMode === PlayerDetectionMode.AncestorIndex">
        <div class="field">
          <div class="label">Player container offset:</div>
          <div class="input">
            <input v-model="DOMConfigData.elements.player.ancestorIndex" />
          </div>
        </div>
        <div class="hint">
          Defines how far away from video the player container element is. If you don't know what you're doing, start
          with 1, save settings, and reload the page. If this doesn't fix your problem, increase the number by 1 and
          repeat the procedure. If no value between 1-16 works, the site may require additional CSS in order to work.
        </div>
      </template>

      <!-- Query selectors field -->
      <template v-if="DOMConfigData.elements.player.detectionMode === PlayerDetectionMode.QuerySelectors">
        <div class="field">
          <div class="label">Query selectors:</div>
          <div class="input">
            <input v-model="DOMConfigData.elements.player.querySelectors" />
          </div>
        </div>
        <div class="hint">
          You should be at least somewhat proficient with CSS in order to use this option. If you need to provide more
          than one query selector, use commas to separate them.
        </div>
      </template>

      <!-- Use auto-selection for fallback -->
      <template v-if="DOMConfigData.elements.player.detectionMode !== PlayerDetectionMode.Auto">
        <div class="field">
          <div class="label">Use automatic detection for fallback</div>
          <div class="checkbox">
            <input type="checkbox" v-model="DOMConfigData.elements.player.allowAutoFallback" />
          </div>
        </div>
        <div class="hint">
          If no valid player is found by following these settings, use automatic player detection as a fallback.
          You should probably keep this option on.
        </div>
      </template>
      <!-- #endregion -->

      <!-- #region video element detection -->
      <div class="field">
        <div class="label">Video detection:</div>
        <div class="select">
          <select v-model="DOMConfigData.elements.video.detectionMode">
            <option :value="PlayerDetectionMode.Auto">Automatic</option>
            <option :value="PlayerDetectionMode.QuerySelectors">Query selectors</option>
          </select>
        </div>
      </div>

      <!-- Player container offset / ancestor index field, not valid in video element selection -->
      <template v-if="DOMConfigData.elements.video.detectionMode === PlayerDetectionMode.AncestorIndex">
        <div class="field">
          <div class="label">Yo, that 'video detection' mode is straight up illegal. Change it to something else.</div>
        </div>
      </template>

      <!-- Query selectors field -->
      <template v-if="DOMConfigData.elements.video.detectionMode === PlayerDetectionMode.QuerySelectors">
        <div class="field">
          <div class="label">Query selectors:</div>
          <div class="input">
            <input v-model="DOMConfigData.elements.video.querySelectors" />
          </div>
        </div>
        <div class="hint">
          You should be at least somewhat proficient with CSS in order to use this option. If you need to provide more
          than one query selector, use commas to separate them.
        </div>
      </template>

      <!-- Use auto-selection for fallback -->
      <template v-if="DOMConfigData.elements.video.detectionMode !== PlayerDetectionMode.Auto">
        <div class="field">
          <div class="label">Use automatic detection for fallback</div>
          <div class="checkbox">
            <input type="checkbox" v-model="DOMConfigData.elements.video.allowAutoFallback" />
          </div>
        </div>
        <div class="hint">
          If no valid video is found by following these settings, use automatic player detection as a fallback.
          You should probably keep this option on.
        </div>
      </template>

      <div class="field">
        <div class="label">Additional CSS for the page:</div>
        <div class="input">
          <textarea v-model="DOMConfigData.customCss"/>
        </div>
      </div>
      <div class="hint">
        CSS that will be injected into the page. You should be at least somewhat proficient with CSS in order to use this option.
      </div>

    </div>
    <template v-else>
      No DOM config for this site.
    </template>
  </div>

  <div class="w-full flex flex-row gap-2 justify-end">
    <button>Save as</button>
    <button :disabled="DOMConfigName?.startsWith('@')">Save</button>
    <button>Close</button>
  </div>

  <!-- PRESET SELECT DIALOG -->
  <Popup
    v-if="selectSnapshotDialog.visible"
    title="Select configuration"
    @onClose="selectSnapshotDialog.visible = false"
  >
    <div>Select configuration:</div>
    <div class="flex flex-col gap-2 py-4">
      <div
        v-for="(value, key) of siteSettings.data.DOMConfig" :key="key"
        class="
          px-4 py-2 flex flex-row gap-2 w-full items-center
          border border-stone-800 hover:bg-stone-800
        "
        :class="{'!border-primary-300 text-primary-300': key === siteSettings.data.activeDOMConfig}"
        @click="selectConfig(key)"
      >
        <div>{{key}}</div>
        <SupportLevelIndicator :siteSupportLevel="value.type" :disableTooltip="true"></SupportLevelIndicator>
        <div class="grow"></div>
        <div v-if="key === siteSettings.data.activeDOMConfig" class="">
          <mdicon name="check-bold" :size="20"></mdicon>
        </div>
      </div>
    </div>
  </Popup>

  <!-- FINISH IMPORT DIALOG -->
  <Popup
    v-if="finishImportDialog.visible"
    :title="finishImportDialog.data.invalidJson ? 'Import failed' : 'Select configuration'"
    @onClose="finishImportDialog.visible = false"
    :clientSideButtons="true"
  >
    <template v-if="finishImportDialog.data.invalidJson">
      <div>The selected file appears to be corrupted, as it contains no valid configurations.</div>
      <div class="flex flex-row justify-end mt-4"><button @click="finishImportDialog.visible = false">OK</button></div>
    </template>
    <template v-else>
      <div>The following configurations were imported. Resolve any conflicts and select the config you wish to use.</div>
      <div class="flex flex-col gap-2 py-4">
        <div
          v-for="(value, key) of finishImportDialog.data.DOMConfig" :key="key"
          class="
            px-4 py-2 flex flex-row gap-2 w-full items-center
            border border-stone-800 hover:bg-stone-800
          "
          :class="{'!border-primary-300 text-primary-300': key === finishImportDialog.data.activeDOMConfig}"
        >
          <div>{{key}}</div>
          <SupportLevelIndicator :siteSupportLevel="value.type" :disableTooltip="true"></SupportLevelIndicator>
          <div class="grow"></div>
          <div v-if="key === finishImportDialog.data.activeDOMConfig" class="">
            <mdicon name="check-bold" :size="20"></mdicon>
          </div>
        </div>
      </div>
    </template>
  </Popup>

  <!-- EXPORT CONFIG DIALOG -->

  <!-- SAVE AS DIALOG -->
</template>

<script lang="ts">
import { SiteSettings } from '@src/ext/lib/settings/SiteSettings';
import { PlayerDetectionMode } from '@src/common/enums/PlayerDetectionMode.enum';
import UploadJsonFileButton from '@components/common/UploadJsonFileButton.vue';
import SupportLevelIndicator from '@components/common/SupportLevelIndicator.vue';

import Popup from '@components/common/Popup.vue';
import { _cp } from '@src/common/js/utils';
import { SiteDOMSettingsInterface } from '@src/common/interfaces/SettingsInterface';


export default({
  components: {
    PlayerDetectionMode,
    UploadJsonFileButton,
    SupportLevelIndicator,
    Popup,
  },
  props: [
    'settings',
    'siteSettings'
  ],
  data() {
    return {
      PlayerDetectionMode,
      loaded: false,
      DOMConfigData: undefined as any,
      DOMConfigName: undefined as any,
      selectSnapshotDialog: {visible: false},
      finishImportDialog: {visible: false}
    }
  },
  watch: {
    siteSettings: function (newVal: SiteSettings) {
      this.loadSiteSettings(newVal);
    }
  },
  created() {
    if (this.siteSettings?.data?.DOMConfig) {
      this.loadSiteSettings(this.siteSettings);
    }
  },
  methods: {
    loadSiteSettings(siteSettings: SiteSettings, configKey = siteSettings.data.activeDOMConfig) {
      let DOMConfigData;
      if (siteSettings.data.DOMConfig) {
        DOMConfigData = siteSettings.data.DOMConfig[configKey];
        this.DOMConfigName = configKey;

        if (!DOMConfigData.elements) {
          DOMConfigData.elements =  _cp(siteSettings.blankSettings.DOMConfig.empty);
        }
        if (!DOMConfigData.elements.player) {
          DOMConfigData.elements.player = _cp(siteSettings.blankSettings.DOMConfig.empty.elements.player);
        }
        if (!DOMConfigData.elements.video) {
          DOMConfigData.elements.video = _cp(siteSettings.blankSettings.DOMConfig.empty.elements.video);
        }
      } else {
        DOMConfigData = _cp(siteSettings.blankSettings.DOMConfig.empty)
      }
      this.DOMConfigData = DOMConfigData;

      this.loaded = true;
    },

    openSelectSnapshotDialog() {
      this.selectSnapshotDialog = {
        visible: true
      }
    },

    selectConfig(key: string) {
      this.loadSiteSettings(this.siteSettings, key);
      this.siteSettings.set('activeDOMConfig', key);
      this.selectSnapshotDialog = false;
    },

    handleImportedSettings(json: {activeDOMConfig?: string, DOMConfig: { [x: string]: SiteDOMSettingsInterface & {overwrite?: boolean}}} | SiteDOMSettingsInterface) {
      let afterImportDialogData;

      if ((json as any).DOMConfig) {
        afterImportDialogData = json;
      } else if ((json as SiteDOMSettingsInterface).type) {
        const key = `imported-${new Date().toISOString()}`;
        afterImportDialogData = {
          activeDOMConfig: key,
          DOMConfig: {
            [key]: json as SiteDOMSettingsInterface
          }
        }
      } else {
        afterImportDialogData = {
          invalidJson: true
        }
      }

      this.finishImportDialog = {
        data: afterImportDialogData,
        visible: true
      };
    },

    handleSettingsImportError(error) {
      console.error(`[ultrawidify] Failed to upload snapshot. Error:`, error);
    },
  }
});
</script>
