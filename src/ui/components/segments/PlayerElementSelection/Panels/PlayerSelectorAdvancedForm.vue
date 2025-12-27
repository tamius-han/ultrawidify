<template>
  <!-- ADVANCED OPTIONS -->
  <div class="flex flex-col gap-2">
    <div class="flex flex-row gap-2 justify-end">
      <button @click="openSelectSnapshotDialog()">Switch preset</button>
      <!-- <UploadJsonFileButton
        @importedJson="handleImportedSettings"
        @error="handleSettingsImportError"
      >
        Import settings
      </UploadJsonFileButton>
      <button @click="exportDialog.visible = true">Export config</button> -->
      <button class="flex flex-rows items-center" @click="openCopyPasteDialog()"><mdicon class="font-normal mr-2" name="content-copy" :size="16" /> Copy/paste config</button>
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
    <button @click="openSaveAsDialog()">Save as</button>
    <button :disabled="!siteSettings.raw.DOMConfig?.[DOMConfigName] || DOMConfigName?.startsWith('@')">Save</button>
    <button v-if="role === 'popup'" @click="closeForm()">Close</button>
  </div>

  <!-- PRESET SELECT DIALOG -->
  <Popup
    v-if="selectSnapshotDialog.visible"
    title="Select configuration"
    @onCancel="selectSnapshotDialog.visible = false"
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

  <!-- COPY/PASTE CONFIG DIALOG -->
  <Popup
    v-if="copyPasteDialog.visible"
    confirmButtonText="Apply"
    cancelButtonText="Cancel"
    title="Copy or paste configuration"
    @onCancel="copyPasteDialog.onClose()"
    @onConfirm="copyPasteDialog.onSave()"
  >
    <div class="field">
      <div class="label !min-w-16">Raw config:</div>
      <div class="input !w-[560px] min-h-[320px]">
        <textarea class="h-[320px] w-full resize-none" v-model="copyPasteDialog.data.jsonTxt"></textarea>
      </div>
    </div>
     <div v-if="settings.active.ui.devMode" class="field">
        <div class="label">Change support level:</div>
        <div class="select">
          <select @change="_cpDialog_setSupportLevel">
            <option :value="undefined">(select option to override)</option>
            <option :value="SiteSupportLevel.OfficialSupport">Official support</option>
            <option :value="SiteSupportLevel.CommunitySupport">Community-supported</option>
            <option :value="SiteSupportLevel.BetaSupport">Texsting/experimental</option>
            <option :value="SiteSupportLevel.UserDefined">User-defined</option>
            <option :value="SiteSupportLevel.UserModified">User-modified</option>
            <option :value="SiteSupportLevel.OfficialBlacklist">Officially blacklisted</option>
            <option :value="SiteSupportLevel.Unknown">Unknown</option>
          </select>
        </div>
      </div>
  </Popup>

  <!-- FINISH IMPORT DIALOG (half-finished, currently unused)-->
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

  <!-- EXPORT CONFIG DIALOG (half finished, currently unused) -->
  <Popup
    v-if="exportDialog.visible"
    title="Export configuration"
    :clientSideButtons="true"
  >
    <div class="w-[24rem] max-w-full">
      <div class="field radio">
        <input type="radio"  v-model="exportDialog.data.exportType" value="current">
        <div class="label-r">Export current configuration</div>
      </div>
      <div>

      </div>

      <div class="field radio ">
        <input type="radio"  v-model="exportDialog.data.exportType" value="multiple">
        <div class="label-r">Export the following configurations</div>
      </div>
    </div>
  </Popup>

  <!-- SAVE AS DIALOG -->
  <Popup
    v-if="saveAsDialog.visible"
    title="Save preset as ..."
    :clientSideButtons="true"
  >
    <div class="field">
      <div class="label">Configuration name</div>
      <div class="input">
        <input v-model="saveAsDialog.data.name" />
      </div>
    </div>
    <div class="hint">
      Configuration name may include letters, numbers, underscores (_) and dashes (-).
    </div>
    <div class="flex flex-row justify-end gap-2">
        <ConfirmButton v-if="siteSettings.raw.DOMConfig?.[saveAsDialog.data.name]"
          :disabled="!/^[a-zA-Z0-9-_]*$/.test(saveAsDialog.data.name)"
          dialogType="danger"
          dialogTitle="Settings preset exists"
          dialogText="Settings preset with this name already exists. Do you want to overwrite it?"
          confirmText="Overwrite"
          @onConfirmed="finishSaveAs"
        >
          Save
        </ConfirmButton>
      <button v-else @click="finishSaveAs" :disabled="!/^[a-zA-Z0-9-_]*$/.test(saveAsDialog.data.name)">Save</button>
      <button @click="saveAsDialog.visible = false">Cancel</button>
    </div>
  </Popup>
</template>

<script lang="ts">
import { SiteSettings } from '@src/ext/lib/settings/SiteSettings';
import { PlayerDetectionMode } from '@src/common/enums/PlayerDetectionMode.enum';
import UploadJsonFileButton from '@components/common/UploadJsonFileButton.vue';
import SupportLevelIndicator from '@components/common/SupportLevelIndicator.vue';
import ConfirmButton from '@components/common/ConfirmButton.vue';

import Popup from '@components/common/Popup.vue';
import { _cp } from '@src/common/js/utils';
import { SiteDOMSettingsInterface } from '@src/common/interfaces/SettingsInterface';
import { SiteSupportLevel } from '../../../../../common/enums/SiteSupportLevel.enum';

export default({
  components: {
    UploadJsonFileButton,
    SupportLevelIndicator,
    Popup,
    ConfirmButton,
  },
  props: [
    'role',
    'settings',
    'siteSettings'
  ],
  data() {
    return {
      PlayerDetectionMode,
      SiteSupportLevel,
      loaded: false,
      DOMConfigData: undefined as any,
      DOMConfigName: undefined as any,
      selectSnapshotDialog: {visible: false},
      copyPasteDialog: {visible: false},
      finishImportDialog: {visible: false},
      exportDialog: {visible: false, data: {exportType: 'current'}},
      saveAsDialog: {visible: false}
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
          DOMConfigData.elements =  _cp(siteSettings.blankSettings.DOMConfig['@empty']);
        }
        if (!DOMConfigData.elements.player) {
          DOMConfigData.elements.player = _cp(siteSettings.blankSettings.DOMConfig['@empty'].elements.player);
        }
        if (!DOMConfigData.elements.video) {
          DOMConfigData.elements.video = _cp(siteSettings.blankSettings.DOMConfig['@empty'].elements.video);
        }
      } else {
        DOMConfigData = _cp(siteSettings.blankSettings.DOMConfig['@empty'])
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

    openCopyPasteDialog() {
      this.copyPasteDialog = {
        visible: true,
        data: {
          jsonTxt: JSON.stringify(this.DOMConfigData, null, 2)
        },
        onClose: () => {
          this.copyPasteDialog = {visible: false};
        },
        onSave: () => {
          if (JSON.stringify(JSON.parse(this.copyPasteDialog.data.jsonTxt)) !== JSON.stringify(this.DOMConfigData) ) {
            this.DOMConfigData = JSON.parse(this.copyPasteDialog.data.jsonTxt);
            if (!this.DOMConfigData.type) {
              this.DOMConfigData.type = SiteSupportLevel.UserDefined;
            }

            let pastedCount = 0;
            for (const key in this.siteSettings.data.DOMConfig) {
              if (key.startsWith('pasted-settings')) {
                pastedCount++;
              }
            }

            if (!this.DOMConfigName || this.DOMConfigName.startsWith('@')) {
              this.DOMConfigName = `pasted-settings${pastedCount ? `-${pastedCount}` : ''}`;
            }

            this.copyPasteDialog = {visible: false}
          }
        }
      }
    },

    /** Used when dev mode settings are visible in order to easily override config type */
    _cpDialog_setSupportLevel(event) {
      const value = event.target.value;

      const obj = JSON.parse(this.copyPasteDialog.data.jsonTxt);
      delete obj.type;

      this.copyPasteDialog.data.jsonTxt = JSON.stringify({
        type: value,
        ...obj,
      }, null, 2);
    },

    handleImportedSettings(json: {activeDOMConfig?: string, DOMConfig: { [x: string]: SiteDOMSettingsInterface & {overwrite?: boolean}}} | SiteDOMSettingsInterface) {
      let afterImportDialogData;

      if ((json as any).DOMConfig) {
        afterImportDialogData = json;
      } else if ((json as SiteDOMSettingsInterface).type) {
        let importedCount = 0;
        for (const key in this.siteSettings.data.DOMConfig) {
          if (key.startsWith('imported-settings')) {
            importedCount++;
          }
        }

        const key = `imported-settings${importedCount ? `-${importedCount}` : ''}`;
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

    openSaveAsDialog() {
      this.saveAsDialog = {
        visible: true,
        data: {
          name: this.DOMConfigName.replaceAll('@', '').trim(),
        }
      }
    },
    async finishSaveAs() {
      this.DOMConfigName = this.saveAsDialog.data.name;
      this.siteSettings.raw.DOMConfig[this.DOMConfigName] = this.DOMConfigData;
      this.siteSettings.raw.activeDOMConfig = this.DOMConfigName;
      this.saveAsDialog = {visible: false};
      await this.settings.save();
    },

    closeForm() {
      this.$emit('close');
    }
  }
});
</script>
